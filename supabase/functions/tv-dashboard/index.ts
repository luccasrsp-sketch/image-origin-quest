import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TVDashboardResponse {
  vendas: {
    dia: { valor_realizado: number; meta: number; quantidade: number };
    semana: { valor_realizado: number; meta: number; quantidade: number };
    mes: { valor_realizado: number; meta: number; quantidade: number };
  };
  funil_diario: {
    recebidos: number;
    atendidos: number;
    reunioes_marcadas: number;
    reunioes_realizadas: number;
    negociacao_andamento: number;
    vendas: number;
  };
  metas_diarias: {
    leads_received: number;
    leads_attended: number;
    meetings_marked: number;
    meetings_done: number;
    negotiations: number;
    sales: number;
  };
  taxas_conversao: {
    atendidos_recebidos: number;
    reunioes_atendidos: number;
    realizadas_marcadas: number;
    negociacao_realizadas: number;
    vendas_negociacao: number;
  };
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get date boundaries
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch goals
    const { data: goalsData, error: goalsError } = await supabase
      .from('tv_dashboard_goals')
      .select('goal_key, goal_value');

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
    }

    const goals: Record<string, number> = {};
    (goalsData || []).forEach((g: { goal_key: string; goal_value: number }) => {
      goals[g.goal_key] = g.goal_value;
    });

    // Use service role for admin access to all leads
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all leads for calculations
    const { data: allLeads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, status, created_at, sale_entry_value, sale_remaining_value, sale_confirmed_at');

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw new Error('Failed to fetch leads');
    }

    // Fetch lead activities for today
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('lead_activities')
      .select('lead_id, action, old_status, new_status, created_at')
      .gte('created_at', startOfDay.toISOString());

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
    }

    // Calculate sales metrics
    const calculateSales = (leads: typeof allLeads, startDate: Date) => {
      const filtered = (leads || []).filter(l => 
        l.status === 'vendido' && 
        l.sale_confirmed_at && 
        new Date(l.sale_confirmed_at) >= startDate
      );
      const valor = filtered.reduce((sum, l) => 
        sum + (l.sale_entry_value || 0) + (l.sale_remaining_value || 0), 0
      );
      return { valor, quantidade: filtered.length };
    };

    const dailySales = calculateSales(allLeads, startOfDay);
    const weeklySales = calculateSales(allLeads, startOfWeek);
    const monthlySales = calculateSales(allLeads, startOfMonth);

    // Calculate funnel metrics
    // 1) Leads received today
    const leadsReceivedToday = (allLeads || []).filter(l => 
      new Date(l.created_at) >= startOfDay
    ).length;

    // 2) Leads attended today (transitioned to contact status)
    const attendedStatuses = ['em_contato', 'qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido', 'perdido', 'recuperacao_sdr'];
    const leadsAttendedToday = new Set(
      (activities || [])
        .filter(a => a.new_status && attendedStatuses.includes(a.new_status))
        .map(a => a.lead_id)
    ).size;

    // 3) Meetings marked today
    const meetingsMarkedToday = new Set(
      (activities || [])
        .filter(a => a.new_status === 'reuniao_marcada')
        .map(a => a.lead_id)
    ).size;

    // 4) Meetings done today (left reuniao_marcada to other status)
    const postMeetingStatuses = ['qualificado', 'envio_proposta', 'vendido', 'perdido', 'recuperacao_sdr'];
    const meetingsDoneToday = new Set(
      (activities || [])
        .filter(a => 
          a.old_status === 'reuniao_marcada' && 
          a.new_status && 
          postMeetingStatuses.includes(a.new_status)
        )
        .map(a => a.lead_id)
    ).size;

    // 5) Negotiations in progress (current snapshot)
    const negotiationStatuses = ['qualificado', 'envio_proposta', 'recuperacao_sdr'];
    const negotiationsInProgress = (allLeads || []).filter(l => 
      negotiationStatuses.includes(l.status)
    ).length;

    // 6) Sales today
    const salesToday = (allLeads || []).filter(l => 
      l.status === 'vendido' && 
      l.sale_confirmed_at && 
      new Date(l.sale_confirmed_at) >= startOfDay
    ).length;

    // Calculate conversion rates
    const safeDiv = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

    const response: TVDashboardResponse = {
      vendas: {
        dia: { 
          valor_realizado: dailySales.valor, 
          meta: goals.daily_sales_goal_value || 0,
          quantidade: dailySales.quantidade 
        },
        semana: { 
          valor_realizado: weeklySales.valor, 
          meta: goals.weekly_sales_goal_value || 0,
          quantidade: weeklySales.quantidade 
        },
        mes: { 
          valor_realizado: monthlySales.valor, 
          meta: goals.monthly_sales_goal_value || 0,
          quantidade: monthlySales.quantidade 
        },
      },
      funil_diario: {
        recebidos: leadsReceivedToday,
        atendidos: leadsAttendedToday,
        reunioes_marcadas: meetingsMarkedToday,
        reunioes_realizadas: meetingsDoneToday,
        negociacao_andamento: negotiationsInProgress,
        vendas: salesToday,
      },
      metas_diarias: {
        leads_received: goals.daily_goal_leads_received || 0,
        leads_attended: goals.daily_goal_leads_attended || 0,
        meetings_marked: goals.daily_goal_meetings_marked || 0,
        meetings_done: goals.daily_goal_meetings_done || 0,
        negotiations: goals.daily_goal_negotiations || 0,
        sales: goals.daily_goal_sales || 0,
      },
      taxas_conversao: {
        atendidos_recebidos: safeDiv(leadsAttendedToday, leadsReceivedToday),
        reunioes_atendidos: safeDiv(meetingsMarkedToday, leadsAttendedToday),
        realizadas_marcadas: safeDiv(meetingsDoneToday, meetingsMarkedToday),
        negociacao_realizadas: safeDiv(negotiationsInProgress, meetingsDoneToday),
        vendas_negociacao: safeDiv(salesToday, negotiationsInProgress),
      },
      timestamp: now.toISOString(),
    };

    console.log('TV Dashboard data calculated successfully');

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('TV Dashboard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
