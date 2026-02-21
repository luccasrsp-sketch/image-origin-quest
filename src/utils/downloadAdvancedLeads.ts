import { supabase } from '@/integrations/supabase/client';

export const downloadAdvancedLeadsCSV = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('status', ['qualificado', 'reuniao_marcada', 'envio_proposta'])
    .gte('created_at', startOfMonth)
    .lt('created_at', endOfMonth)
    .order('created_at', { ascending: false });

  if (error || !data) return false;

  const statusLabels: Record<string, string> = {
    envio_proposta: 'Em Negociação',
    reuniao_marcada: 'Reunião Marcada',
    qualificado: 'Qualificado',
  };

  const getAgencia = (lead: typeof data[0]) => {
    const src = lead.utm_source;
    const createdAt = new Date(lead.created_at);
    const alphaStart = new Date('2026-02-11');
    if ((src === 'metaads' || src === 'unknown' || !src) && createdAt >= alphaStart) {
      return 'Alpha Assessoria';
    }
    return 'Xfranchise';
  };

  const headers = [
    'Etapa', 'Nome', 'Empresa', 'Telefone', 'Email',
    'Data Entrada', 'UTM Source', 'UTM Medium', 'UTM Campaign',
    'UTM Content', 'UTM Term', 'Agência',
  ];

  const rows = data
    .sort((a, b) => {
      const order = { envio_proposta: 1, reuniao_marcada: 2, qualificado: 3 };
      return (order[a.status as keyof typeof order] || 9) - (order[b.status as keyof typeof order] || 9);
    })
    .map(lead => [
      statusLabels[lead.status] || lead.status,
      lead.full_name,
      lead.company_name,
      lead.phone,
      lead.email || '',
      new Date(lead.created_at).toLocaleDateString('pt-BR'),
      lead.utm_source || '',
      lead.utm_medium || '',
      lead.utm_campaign || '',
      lead.utm_content || '',
      lead.utm_term || '',
      getAgencia(lead),
    ]);

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-avancados-fev-${now.getFullYear()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};
