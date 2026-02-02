// RD Marketing Webhook - Edge Function v2
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-rd-signature, x-webhook-secret',
}

// Verify webhook secret from URL, Authorization header, or custom header
function verifyWebhookSecret(req: Request): boolean {
  const webhookSecret = Deno.env.get('RD_MARKETING_WEBHOOK_SECRET')
  
  if (!webhookSecret) {
    console.error('RD_MARKETING_WEBHOOK_SECRET not configured')
    return false
  }
  
  // Check query parameter (for easy integration like BotConversa)
  const url = new URL(req.url)
  const urlSecret = url.searchParams.get('secret')
  if (urlSecret === webhookSecret) {
    console.log('Auth via URL query parameter')
    return true
  }
  
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    if (token === webhookSecret) {
      console.log('Auth via Authorization header')
      return true
    }
  }
  
  // Check custom header as fallback
  const customSecret = req.headers.get('X-Webhook-Secret')
  if (customSecret === webhookSecret) {
    console.log('Auth via X-Webhook-Secret header')
    return true
  }
  
  return false
}

// Input validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email) && email.length <= 255
}

function sanitizeText(input: string, maxLength: number): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength)
}

function validatePhone(phone: string): boolean {
  // Allow digits, spaces, parentheses, plus, and dash
  const phoneRegex = /^[\d\s()+-]+$/
  return phoneRegex.test(phone) && phone.length >= 8 && phone.length <= 30
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook authentication
    if (!verifyWebhookSecret(req)) {
      console.error('Webhook authentication failed - invalid or missing secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload - RD Marketing sends data inside a "leads" array
    const rawPayload = await req.json()
    
    console.log('RD Marketing webhook received (authenticated):', JSON.stringify(rawPayload, null, 2))

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
      const rawEmail = leadData.email || leadData.first_conversion?.content?.email_lead
      
      if (!rawEmail) {
        console.error('Missing email in lead data:', leadData)
        results.push({ success: false, error: 'Email não encontrado' })
        continue
      }

      // Validate email format
      const email = sanitizeText(rawEmail, 255).toLowerCase()
      if (!validateEmail(email)) {
        console.error('Invalid email format:', email)
        results.push({ success: false, error: 'Email inválido', email })
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
      
      // Map and validate fields
      const rawFullName = leadData.name || conversionContent.Nome || email.split('@')[0]
      const fullName = sanitizeText(rawFullName, 200)
      
      if (fullName.length < 2) {
        console.error('Name too short:', fullName)
        results.push({ success: false, error: 'Nome muito curto', email })
        continue
      }

      const rawPhone = leadData.personal_phone || leadData.phone || conversionContent.Telefone || ''
      const phone = sanitizeText(rawPhone, 30)
      
      // Phone is optional but if provided, must be valid
      if (phone && !validatePhone(phone)) {
        console.warn('Invalid phone format, using empty:', phone)
      }
      
      const rawCompanyName = leadData.company || conversionContent.Empresa || 'Não informado'
      const companyName = sanitizeText(rawCompanyName, 200)
      
      if (companyName.length < 2) {
        console.error('Company name too short:', companyName)
        results.push({ success: false, error: 'Nome da empresa muito curto', email })
        continue
      }
      
      // Parse monthly revenue if provided
      let monthlyRevenue: number | null = null
      const revenueStr = leadData.custom_fields?.['Faturamento Mensal'] || 
                        conversionContent.cf_faturamento_mensal
      if (revenueStr) {
        const numericValue = parseFloat(String(revenueStr).replace(/[^\d.,]/g, '').replace(',', '.'))
        if (!isNaN(numericValue) && numericValue > 0 && numericValue < 1000000000) {
          monthlyRevenue = numericValue
        }
      }

      // Determine funnel type based on conversion identifier
      const rawConversionIdentifier = conversionContent.conversion_identifier || ''
      const conversionIdentifier = sanitizeText(rawConversionIdentifier, 500)
      let funnelType = 'padrao'
      if (conversionIdentifier.toLowerCase().includes('franquia')) {
        funnelType = 'franquia'
      } else if (conversionIdentifier.toLowerCase().includes('formata')) {
        funnelType = 'formatacao'
      }
      
      // Extract and validate UTM data from conversion origin
      const utmSource = conversionOrigin.source ? sanitizeText(conversionOrigin.source, 100) : null
      const utmMedium = conversionOrigin.medium ? sanitizeText(conversionOrigin.medium, 100) : null
      const utmCampaign = conversionOrigin.campaign ? sanitizeText(conversionOrigin.campaign, 100) : null

      // Selecionar SDR aleatório para atribuição automática
      let assignedSdrId: string | null = null
      if (sdrProfileIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * sdrProfileIds.length)
        assignedSdrId = sdrProfileIds[randomIndex]
        console.log('Lead atribuído ao SDR:', assignedSdrId)
      }

      // Create lead in CRM with validated data
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          full_name: fullName,
          email: email,
          phone: phone || '',
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
