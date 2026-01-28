import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Parse webhook payload - RD Marketing sends data inside a "leads" array
    const rawPayload = await req.json()
    
    console.log('RD Marketing webhook received:', JSON.stringify(rawPayload, null, 2))

    // Handle RD Marketing format: { leads: [...] }
    const leadsArray = rawPayload.leads || [rawPayload]
    const results: { success: boolean; lead_id?: string; email?: string; error?: string }[] = []

    // Buscar SDRs disponíveis para distribuição randômica
    const { data: sdrs, error: sdrsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'sdr')

    if (sdrsError) {
      console.error('Error fetching SDRs:', sdrsError)
    }

    // Mapear user_id para profile_id
    let sdrProfileIds: string[] = []
    if (sdrs && sdrs.length > 0) {
      const userIds = sdrs.map(s => s.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id')
        .in('user_id', userIds)
      
      if (profiles) {
        sdrProfileIds = profiles.map(p => p.id)
      }
    }

    console.log('SDRs disponíveis para distribuição:', sdrProfileIds.length)

    for (const leadData of leadsArray) {
      // Extract email from various possible locations
      const email = leadData.email || leadData.first_conversion?.content?.email_lead
      
      if (!email) {
        console.error('Missing email in lead data:', leadData)
        results.push({ success: false, error: 'Email não encontrado' })
        continue
      }

      // Check if lead already exists
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingLead) {
        console.log('Lead already exists:', existingLead.id)
        results.push({ success: true, lead_id: existingLead.id, email })
        continue
      }

      // Extract data from RD Marketing structure
      const conversionContent = leadData.first_conversion?.content || {}
      const conversionOrigin = leadData.first_conversion?.conversion_origin || {}
      
      // Map fields - check multiple possible locations
      const fullName = leadData.name || conversionContent.Nome || email.split('@')[0]
      const phone = leadData.personal_phone || leadData.phone || conversionContent.Telefone || ''
      const companyName = leadData.company || conversionContent.Empresa || 'Não informado'
      
      // Parse monthly revenue if provided
      let monthlyRevenue: number | null = null
      const revenueStr = leadData.custom_fields?.['Faturamento Mensal'] || 
                        conversionContent.cf_faturamento_mensal
      if (revenueStr) {
        const numericValue = parseFloat(String(revenueStr).replace(/[^\d.,]/g, '').replace(',', '.'))
        if (!isNaN(numericValue)) {
          monthlyRevenue = numericValue
        }
      }

      // Determine funnel type based on conversion identifier
      const conversionIdentifier = conversionContent.conversion_identifier || ''
      const funnelType = conversionIdentifier.toLowerCase().includes('franquia') 
        ? 'franquia' 
        : 'padrao'
      
      // Extract UTM data from conversion origin
      const utmSource = conversionOrigin.source || null
      const utmMedium = conversionOrigin.medium || null
      const utmCampaign = conversionOrigin.campaign || null

      // Selecionar SDR aleatório para atribuição automática
      let assignedSdrId: string | null = null
      if (sdrProfileIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * sdrProfileIds.length)
        assignedSdrId = sdrProfileIds[randomIndex]
        console.log('Lead atribuído ao SDR:', assignedSdrId)
      }

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
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          assigned_sdr_id: assignedSdrId,
          notes: conversionIdentifier 
            ? `Origem: RD Marketing - ${conversionIdentifier}` 
            : 'Origem: RD Marketing',
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating lead:', error)
        results.push({ success: false, email, error: error.message })
        continue
      }

      console.log('Lead created successfully:', newLead.id, 'assigned to SDR:', assignedSdrId)
      results.push({ success: true, lead_id: newLead.id, email })
    }

    // Return summary of all processed leads
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({ 
        success: failCount === 0,
        message: `${successCount} lead(s) processado(s), ${failCount} erro(s)`,
        results
      }),
      { status: failCount === 0 ? 201 : 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
