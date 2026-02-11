import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build CRM context from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch leads summary
    const { data: leads } = await supabase.from("leads").select("id, status, utm_source, utm_medium, utm_campaign, created_at, assigned_sdr_id, assigned_closer_id, loss_reason, funnel_type, company");

    // Fetch profiles for name mapping
    const { data: profiles } = await supabase.from("profiles").select("id, full_name");

    // Fetch today's activities
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayActivities } = await supabase
      .from("lead_activities")
      .select("id, user_id, action, activity_type, created_at")
      .gte("created_at", todayStart.toISOString());

    // Fetch recent activities (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekActivities } = await supabase
      .from("lead_activities")
      .select("id, user_id, action, activity_type, created_at")
      .gte("created_at", weekAgo.toISOString());

    // Build profile name map
    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });

    // Calculate stats
    const allLeads = leads || [];
    const todayDate = new Date().toISOString().slice(0, 10);
    const leadsToday = allLeads.filter((l: any) => l.created_at?.slice(0, 10) === todayDate);

    const statusCounts: Record<string, number> = {};
    allLeads.forEach((l: any) => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

    const utmSourceCounts: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      const src = l.utm_source || "Direto/Sem UTM";
      utmSourceCounts[src] = (utmSourceCounts[src] || 0) + 1;
    });

    // Lost leads by source
    const lostBySource: Record<string, number> = {};
    allLeads.filter((l: any) => l.status === "perdido").forEach((l: any) => {
      const src = l.utm_source || "Direto/Sem UTM";
      lostBySource[src] = (lostBySource[src] || 0) + 1;
    });

    // Loss reasons
    const lossReasons: Record<string, number> = {};
    allLeads.filter((l: any) => l.status === "perdido" && l.loss_reason).forEach((l: any) => {
      lossReasons[l.loss_reason] = (lossReasons[l.loss_reason] || 0) + 1;
    });

    // Activities by user (today)
    const actByUser: Record<string, Record<string, number>> = {};
    (todayActivities || []).forEach((a: any) => {
      const name = profileMap[a.user_id] || "Desconhecido";
      if (!actByUser[name]) actByUser[name] = {};
      if (a.activity_type) {
        actByUser[name][a.activity_type] = (actByUser[name][a.activity_type] || 0) + 1;
      }
      actByUser[name]["total"] = (actByUser[name]["total"] || 0) + 1;
    });

    // Activities by user (week)
    const actByUserWeek: Record<string, Record<string, number>> = {};
    (weekActivities || []).forEach((a: any) => {
      const name = profileMap[a.user_id] || "Desconhecido";
      if (!actByUserWeek[name]) actByUserWeek[name] = {};
      if (a.activity_type) {
        actByUserWeek[name][a.activity_type] = (actByUserWeek[name][a.activity_type] || 0) + 1;
      }
      actByUserWeek[name]["total"] = (actByUserWeek[name]["total"] || 0) + 1;
    });

    // Leads by SDR
    const leadsBySdr: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      if (l.assigned_sdr_id) {
        const name = profileMap[l.assigned_sdr_id] || "Desconhecido";
        leadsBySdr[name] = (leadsBySdr[name] || 0) + 1;
      }
    });

    // Leads by Closer
    const leadsByCloser: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      if (l.assigned_closer_id) {
        const name = profileMap[l.assigned_closer_id] || "Desconhecido";
        leadsByCloser[name] = (leadsByCloser[name] || 0) + 1;
      }
    });

    // Qualified leads by source
    const qualifiedStatuses = ["qualificado", "follow_up", "reuniao_marcada", "envio_proposta", "vendido"];
    const qualifiedBySource: Record<string, number> = {};
    allLeads.filter((l: any) => qualifiedStatuses.includes(l.status)).forEach((l: any) => {
      const src = l.utm_source || "Direto/Sem UTM";
      qualifiedBySource[src] = (qualifiedBySource[src] || 0) + 1;
    });

    const contextSummary = `
DADOS DO CRM (atualizado agora):

📊 RESUMO GERAL:
- Total de leads no sistema: ${allLeads.length}
- Leads criados hoje: ${leadsToday.length}
- Data atual: ${new Date().toLocaleDateString("pt-BR")}

📈 DISTRIBUIÇÃO POR STATUS:
${Object.entries(statusCounts).map(([s, c]) => `- ${s}: ${c}`).join("\n")}

🌐 LEADS POR ORIGEM (utm_source):
${Object.entries(utmSourceCounts).sort((a, b) => b[1] - a[1]).map(([s, c]) => `- ${s}: ${c} leads`).join("\n")}

✅ LEADS QUALIFICADOS POR ORIGEM:
${Object.entries(qualifiedBySource).sort((a, b) => b[1] - a[1]).map(([s, c]) => `- ${s}: ${c} qualificados`).join("\n")}

❌ LEADS PERDIDOS POR ORIGEM:
${Object.entries(lostBySource).sort((a, b) => b[1] - a[1]).map(([s, c]) => `- ${s}: ${c} perdidos`).join("\n")}

💔 MOTIVOS DE PERDA:
${Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([r, c]) => `- "${r}": ${c}x`).join("\n")}

👤 LEADS POR SDR:
${Object.entries(leadsBySdr).sort((a, b) => b[1] - a[1]).map(([n, c]) => `- ${n}: ${c} leads`).join("\n")}

👤 LEADS POR CLOSER:
${Object.entries(leadsByCloser).sort((a, b) => b[1] - a[1]).map(([n, c]) => `- ${n}: ${c} leads`).join("\n")}

📞 ATIVIDADES HOJE POR VENDEDOR:
${Object.entries(actByUser).length > 0
  ? Object.entries(actByUser).map(([name, acts]) => `- ${name}: ${Object.entries(acts).map(([t, c]) => `${t}=${c}`).join(", ")}`).join("\n")
  : "Nenhuma atividade registrada hoje."}

📞 ATIVIDADES ÚLTIMOS 7 DIAS POR VENDEDOR:
${Object.entries(actByUserWeek).length > 0
  ? Object.entries(actByUserWeek).map(([name, acts]) => `- ${name}: ${Object.entries(acts).map(([t, c]) => `${t}=${c}`).join(", ")}`).join("\n")
  : "Nenhuma atividade registrada na semana."}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de CRM da Escola de Franchising. Responda SEMPRE em português brasileiro, de forma objetiva e analítica. Use emojis para tornar a resposta visual. Baseie-se EXCLUSIVAMENTE nos dados fornecidos abaixo. Nunca invente dados. Se não souber, diga que não há dados suficientes.

Os status do funil são: sem_atendimento, nao_atendeu, em_contato, qualificado, follow_up, reuniao_marcada, envio_proposta, vendido, recuperacao_sdr, perdido.

Tipos de atividade: call (ligação), whatsapp, meeting (reunião), email.

${contextSummary}`,
          },
          { role: "user", content: question },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("crm-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
