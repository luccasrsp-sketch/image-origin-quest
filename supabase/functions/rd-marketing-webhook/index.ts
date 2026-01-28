import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RDMarketingLead {
  // Campos padrão do RD Marketing
  email?: string
  nome?: string
  name?: string
  telefone?: string
  phone?: string
  empresa?: string
  company?: string
  cf_faturamento_mensal?: string
  cf_monthly_revenue?: string
  // UTMs
  traffic_source?: string
  traffic_medium?: string
  traffic_campaign?: string
  traffic_value?: string
  // Metadados
  conversion_identifier?: string
  created_at?: string
  // Campos customizados podem vir como cf_*
  [key: string]: unknown
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const payload: RDMarketingLead = await req.json()
    
    console.log('RD Marketing webhook received:', JSON.stringify(payload, null, 2))

    // Validate required fields
    const email = payload.email
    if (!email) {
      console.error('Missing email in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingLead) {
      console.log('Lead already exists:', existingLead.id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead já existe no CRM',
          lead_id: existingLead.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map RD Marketing fields to CRM fields
    const fullName = payload.nome || payload.name || email.split('@')[0]
    const phone = payload.telefone || payload.phone || ''
    const companyName = payload.empresa || payload.company || 'Não informado'
    
    // Parse monthly revenue if provided
    let monthlyRevenue: number | null = null
    const revenueStr = payload.cf_faturamento_mensal || payload.cf_monthly_revenue
    if (revenueStr) {
      const numericValue = parseFloat(revenueStr.replace(/[^\d.,]/g, '').replace(',', '.'))
      if (!isNaN(numericValue)) {
        monthlyRevenue = numericValue
      }
    }

    // Determine funnel type based on conversion or custom field
    const funnelType = payload.conversion_identifier?.toLowerCase().includes('franquia') 
      ? 'franquia' 
      : 'padrao'

    // Create lead in CRM
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        full_name: fullName,
        email: email,
        phone: phone,
        company_name: companyName,
        monthly_revenue: monthlyRevenue,
        funnel_type: funnelType,
        status: 'sem_atendimento',
        utm_source: payload.traffic_source || null,
        utm_medium: payload.traffic_medium || null,
        utm_campaign: payload.traffic_campaign || null,
        utm_content: payload.traffic_value || null,
        notes: payload.conversion_identifier 
          ? `Origem: RD Marketing - ${payload.conversion_identifier}` 
          : 'Origem: RD Marketing',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar lead', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Lead created successfully:', newLead.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead criado com sucesso',
        lead_id: newLead.id 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
