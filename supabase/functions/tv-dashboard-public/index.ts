import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get token from environment variable - REQUIRED for security
const TV_ACCESS_TOKEN = Deno.env.get('TV_DASHBOARD_TOKEN');

// Fail fast if token is not configured
if (!TV_ACCESS_TOKEN) {
  console.error('CRITICAL: TV_DASHBOARD_TOKEN environment variable must be configured');
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientIP: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientIP);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

interface SellerRanking {
  name: string;
  sales_count: number;
  sales_value: number;
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
  ranking_vendedores: SellerRanking[];
  meta_faturamento: number;
  meta_caixa: number;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
          } 
        }
      );
    }

    // Check if token is configured
    if (!TV_ACCESS_TOKEN) {
      console.error('TV_DASHBOARD_TOKEN not configured - rejecting request');
      return new Response(
        JSON.stringify({ error: 'Serviço não configurado. Contate o administrador.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { token, company = 'escola_franchising', includeGoals = false } = body;

    // Validate token
    if (token !== TV_ACCESS_TOKEN) {
      console.log('Invalid token attempt from IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role for full data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Calculate meta goals (faturamento and caixa) for the month
    // Fetch faturamento (sales value from leads)
    let faturamentoQuery = supabase
      .from('leads')
      .select('sale_entry_value, sale_remaining_value, sale_confirmed_at, company')
      .eq('status', 'vendido')
      .gte('sale_confirmed_at', startOfMonth.toISOString());
    
    if (company && company !== 'all') {
      faturamentoQuery = faturamentoQuery.eq('company', company);
    }

    const { data: salesLeadsForMeta } = await faturamentoQuery;
    const metaFaturamento = (salesLeadsForMeta || []).reduce((sum, l) => 
      sum + (l.sale_entry_value || 0) + (l.sale_remaining_value || 0), 0
    );

    // Fetch caixa (cash entries for the month)
    let caixaQuery = supabase
      .from('financial_cash_entries')
      .select('amount, entry_date, company')
      .gte('entry_date', startOfMonth.toISOString().split('T')[0]);
    
    if (company && company !== 'all') {
      caixaQuery = caixaQuery.eq('company', company);
    }

    const { data: cashEntries } = await caixaQuery;
    const metaCaixa = (cashEntries || []).reduce((sum, e) => sum + (e.amount || 0), 0);

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

    // Fetch all leads for calculations (filtered by company if specified)
    let leadsQuery = supabase
      .from('leads')
      .select('id, status, created_at, sale_entry_value, sale_remaining_value, sale_confirmed_at, company, assigned_closer_id');
    
    if (company && company !== 'all') {
      leadsQuery = leadsQuery.eq('company', company);
    }

    const { data: allLeads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw new Error('Failed to fetch leads');
    }

    // Fetch lead activities for today
    const { data: activities, error: activitiesError } = await supabase
      .from('lead_activities')
      .select('lead_id, action, old_status, new_status, created_at')
      .gte('created_at', startOfDay.toISOString());

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
    }

    // Filter activities by company's leads
    const leadIds = new Set((allLeads || []).map(l => l.id));
    const filteredActivities = (activities || []).filter(a => leadIds.has(a.lead_id));

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
      filteredActivities
        .filter(a => a.new_status && attendedStatuses.includes(a.new_status))
        .map(a => a.lead_id)
    ).size;

    // 3) Meetings marked today
    const meetingsMarkedToday = new Set(
      filteredActivities
        .filter(a => a.new_status === 'reuniao_marcada')
        .map(a => a.lead_id)
    ).size;

    // 4) Meetings done today (left reuniao_marcada to other status)
    const postMeetingStatuses = ['qualificado', 'envio_proposta', 'vendido', 'perdido', 'recuperacao_sdr'];
    const meetingsDoneToday = new Set(
      filteredActivities
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

    // 7) Seller ranking for today - get sales by closer
    const todaySalesLeads = (allLeads || []).filter(l => 
      l.status === 'vendido' && 
      l.sale_confirmed_at && 
      new Date(l.sale_confirmed_at) >= startOfDay &&
      l.assigned_closer_id
    );

    // Group by closer
    const salesByCloser: Record<string, { count: number; value: number }> = {};
    todaySalesLeads.forEach(lead => {
      const closerId = lead.assigned_closer_id;
      if (!closerId) return;
      if (!salesByCloser[closerId]) {
        salesByCloser[closerId] = { count: 0, value: 0 };
      }
      salesByCloser[closerId].count += 1;
      salesByCloser[closerId].value += (lead.sale_entry_value || 0) + (lead.sale_remaining_value || 0);
    });

    // Fetch closer names from profiles
    const closerIds = Object.keys(salesByCloser);
    let rankingVendedores: SellerRanking[] = [];
    
    if (closerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', closerIds);

      rankingVendedores = closerIds.map(closerId => {
        const profile = (profiles || []).find(p => p.id === closerId);
        return {
          name: profile?.full_name || 'Vendedor',
          sales_count: salesByCloser[closerId].count,
          sales_value: salesByCloser[closerId].value,
        };
      }).sort((a, b) => b.sales_value - a.sales_value);
    }

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
      ranking_vendedores: rankingVendedores,
      meta_faturamento: metaFaturamento,
      meta_caixa: metaCaixa,
      timestamp: now.toISOString(),
    };

    console.log('TV Dashboard (public) data calculated successfully for company:', company);

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
