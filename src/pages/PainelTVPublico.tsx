import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currency';

interface SellerRanking {
  name: string;
  sales_count: number;
  sales_value: number;
}

interface TVDashboardData {
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
  timestamp: string;
}

export default function PainelTVPublico() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const company = searchParams.get('company') || 'escola_franchising';
  
  const [data, setData] = useState<TVDashboardData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Token não fornecido');
      return;
    }

    try {
      const { data: responseData, error: funcError } = await supabase.functions.invoke('tv-dashboard-public', {
        body: { token, company },
      });

      if (funcError) {
        console.error('Error fetching TV dashboard:', funcError);
        setError('Erro ao carregar dados');
        return;
      }

      if (responseData.error) {
        setError(responseData.error);
        return;
      }

      setData(responseData);
      setLastUpdate(new Date());
      setAuthorized(true);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError('Erro de conexão');
    }
  }, [token, company]);

  // Fetch data on mount and every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-500 text-4xl">Token de acesso não fornecido</p>
      </div>
    );
  }

  if (error && !authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-500 text-4xl">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#c4ae6b] text-4xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  const funnelItems = [
    { label: 'Leads Recebidos', value: data.funil_diario.recebidos, goal: data.metas_diarias.leads_received, rate: null },
    { label: 'Leads Atendidos', value: data.funil_diario.atendidos, goal: data.metas_diarias.leads_attended, rate: data.taxas_conversao.atendidos_recebidos },
    { label: 'Reuniões Marcadas', value: data.funil_diario.reunioes_marcadas, goal: data.metas_diarias.meetings_marked, rate: data.taxas_conversao.reunioes_atendidos },
    { label: 'Reuniões Realizadas', value: data.funil_diario.reunioes_realizadas, goal: data.metas_diarias.meetings_done, rate: data.taxas_conversao.realizadas_marcadas },
    { label: 'Em Negociação', value: data.funil_diario.negociacao_andamento, goal: data.metas_diarias.negotiations, rate: data.taxas_conversao.negociacao_realizadas },
    { label: 'Vendas Realizadas', value: data.funil_diario.vendas, goal: data.metas_diarias.sales, rate: data.taxas_conversao.vendas_negociacao },
  ];

  const companyName = company === 'escola_franchising' ? 'Escola de Franchising' : 'Evidia';

  return (
    <div className="min-h-screen bg-black text-white p-8 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-[#c4ae6b]">{companyName}</h1>
          <p className="text-2xl text-zinc-400 mt-2 capitalize">{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-7xl font-bold tabular-nums text-[#c4ae6b]">{formatTime(currentTime)}</p>
          <p className="text-lg text-zinc-500 mt-1">
            Última atualização: {lastUpdate ? formatTime(lastUpdate) : '--:--'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Block 1: Sales Progress */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-[#c4ae6b]/30">
          <h2 className="text-2xl font-semibold mb-6 text-[#c4ae6b]">📈 Vendas</h2>
          
          <div className="space-y-6">
            <SalesProgressBar
              label="Meta Diária"
              value={data.vendas.dia.valor_realizado}
              goal={data.vendas.dia.meta}
              quantity={data.vendas.dia.quantidade}
            />

            <SalesProgressBar
              label="Meta Semanal"
              value={data.vendas.semana.valor_realizado}
              goal={data.vendas.semana.meta}
              quantity={data.vendas.semana.quantidade}
            />

            <SalesProgressBar
              label="Meta Mensal"
              value={data.vendas.mes.valor_realizado}
              goal={data.vendas.mes.meta}
              quantity={data.vendas.mes.quantidade}
            />
          </div>
        </div>

        {/* Block 2: Daily Funnel */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-[#c4ae6b]/30">
          <h2 className="text-2xl font-semibold mb-4 text-[#c4ae6b]">🎯 Funil (Hoje)</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {funnelItems.map((item, index) => (
              <FunnelCard
                key={item.label}
                label={item.label}
                value={item.value}
                goal={item.goal}
                rate={item.rate}
                isLast={index === funnelItems.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Block 3: Seller Ranking */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-[#c4ae6b]/30">
          <h2 className="text-2xl font-semibold mb-4 text-[#c4ae6b]">🏆 Ranking (Hoje)</h2>
          
          {data.ranking_vendedores && data.ranking_vendedores.length > 0 ? (
            <div className="space-y-3">
              {data.ranking_vendedores.map((seller, index) => (
                <RankingCard
                  key={seller.name}
                  position={index + 1}
                  name={seller.name}
                  salesCount={seller.sales_count}
                  salesValue={seller.sales_value}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100%-60px)]">
              <p className="text-2xl text-zinc-600">Nenhuma venda hoje</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalesProgressBar({ 
  label, 
  value, 
  goal, 
  quantity 
}: { 
  label: string; 
  value: number; 
  goal: number; 
  quantity: number;
}) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  
  const getBarColor = () => {
    if (percent >= 100) return 'bg-[#c4ae6b]';
    if (percent >= 70) return 'bg-[#c4ae6b]/80';
    if (percent >= 40) return 'bg-amber-600';
    return 'bg-red-600';
  };

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-2xl font-medium text-zinc-300">{label}</span>
        <div className="text-right">
          <span className="text-4xl font-bold text-[#c4ae6b]">{formatCurrency(value)}</span>
          {goal > 0 && (
            <span className="text-xl text-zinc-500 ml-3">
              / {formatCurrency(goal)}
            </span>
          )}
        </div>
      </div>
      
      <div className="relative h-10 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold drop-shadow-lg">
            {percent}%
          </span>
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-lg text-zinc-500">
        <span>{quantity} venda{quantity !== 1 ? 's' : ''}</span>
        {goal > 0 && (
          <span>Faltam {formatCurrency(Math.max(0, goal - value))}</span>
        )}
      </div>
    </div>
  );
}

function FunnelCard({ 
  label, 
  value, 
  goal, 
  rate,
  isLast 
}: { 
  label: string; 
  value: number; 
  goal: number;
  rate: number | null;
  isLast: boolean;
}) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const hasGoal = goal > 0;
  
  const getStatusColor = () => {
    if (!hasGoal) return 'border-zinc-700 bg-zinc-800/50';
    if (percent >= 100) return 'border-[#c4ae6b] bg-[#c4ae6b]/10';
    if (percent >= 70) return 'border-[#c4ae6b]/70 bg-[#c4ae6b]/5';
    if (percent >= 40) return 'border-amber-600 bg-amber-600/10';
    return 'border-red-600 bg-red-600/10';
  };

  return (
    <div className={`rounded-2xl p-5 border-2 ${getStatusColor()} ${isLast ? 'col-span-2' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-lg text-zinc-400">{label}</span>
        {rate !== null && (
          <span className="text-sm bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-lg text-[#c4ae6b]">
            {rate}% conv.
          </span>
        )}
      </div>
      
      <div className="flex items-baseline gap-3">
        <span className={`font-bold ${isLast ? 'text-6xl text-[#c4ae6b]' : 'text-5xl text-white'}`}>
          {value}
        </span>
        {hasGoal && (
          <span className="text-2xl text-zinc-600">/ {goal}</span>
        )}
      </div>
      
      {hasGoal && (
        <div className="mt-3">
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
            <div 
              className={`h-full transition-all duration-500 ${
                percent >= 100 ? 'bg-[#c4ae6b]' : 
                percent >= 70 ? 'bg-[#c4ae6b]/80' : 
                percent >= 40 ? 'bg-amber-600' : 'bg-red-600'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-zinc-500 mt-1">{percent}% da meta</p>
        </div>
      )}
    </div>
  );
}

function RankingCard({ 
  position, 
  name, 
  salesCount, 
  salesValue 
}: { 
  position: number; 
  name: string; 
  salesCount: number;
  salesValue: number;
}) {
  const getMedalEmoji = () => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}º`;
  };

  const getBorderColor = () => {
    if (position === 1) return 'border-[#c4ae6b] bg-[#c4ae6b]/10';
    if (position === 2) return 'border-zinc-400 bg-zinc-400/10';
    if (position === 3) return 'border-amber-700 bg-amber-700/10';
    return 'border-zinc-700 bg-zinc-800/50';
  };

  return (
    <div className={`rounded-2xl p-4 border-2 ${getBorderColor()} flex items-center gap-4`}>
      <span className="text-4xl">{getMedalEmoji()}</span>
      <div className="flex-1">
        <p className="text-xl font-semibold text-white truncate">{name}</p>
        <p className="text-sm text-zinc-400">
          {salesCount} venda{salesCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-[#c4ae6b]">{formatCurrency(salesValue)}</p>
      </div>
    </div>
  );
}
