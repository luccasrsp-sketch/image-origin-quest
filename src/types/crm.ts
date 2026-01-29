export type AppRole = 'sdr' | 'closer' | 'admin';

export type LeadStatus = 
  | 'sem_atendimento'
  | 'nao_atendeu'
  | 'em_contato'
  | 'qualificado'
  | 'reuniao_marcada'
  | 'envio_proposta'
  | 'vendido'
  | 'recuperacao_sdr'
  | 'perdido';

export type FunnelType = 'padrao' | 'franquia';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember extends Profile {
  roles: AppRole[];
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export type ProposalProduct = 'start' | 'sales' | 'scale' | 'business';

export const PROPOSAL_PRODUCTS: { id: ProposalProduct; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'sales', label: 'Sales' },
  { id: 'scale', label: 'Scale' },
  { id: 'business', label: 'Business' },
];

export interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  monthly_revenue?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  funnel_type: FunnelType;
  status: LeadStatus;
  assigned_sdr_id?: string;
  assigned_closer_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  last_contact_at?: string;
  needs_scheduling?: boolean;
  scheduling_pending_reason?: string;
  proposal_product?: ProposalProduct | string;
  proposal_value?: number;
  proposal_payment_method?: string;
  proposal_follow_up_at?: string;
  // Sale fields
  sale_company_cnpj?: string;
  sale_admin_email?: string;
  sale_payment_method?: string;
  sale_entry_value?: number;
  sale_remaining_value?: number;
  sale_installments?: number;
  sale_first_check_date?: string;
  sale_observations?: string;
  sale_confirmed_at?: string;
  sale_contract_sent?: boolean;
  sale_payment_received?: boolean;
  // Loss fields
  loss_reason?: string;
  lost_at?: string;
  // Joined fields
  assigned_sdr?: Profile;
  assigned_closer?: Profile;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  user_id: string;
  lead_id?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  meeting_completed?: boolean | null;
  meeting_not_completed_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  lead?: Lead;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  event_id?: string;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id?: string;
  action: string;
  old_status?: LeadStatus;
  new_status?: LeadStatus;
  notes?: string;
  created_at: string;
  user?: Profile;
}

// Kanban column configuration
export const KANBAN_COLUMNS: { id: LeadStatus; title: string; color: string; role: 'sdr' | 'closer'; adminOnly?: boolean }[] = [
  { id: 'sem_atendimento', title: 'Sem Atendimento', color: 'bg-white text-slate-900', role: 'sdr' },
  { id: 'nao_atendeu', title: 'Não Atendeu', color: 'bg-amber-100 text-amber-900', role: 'sdr' },
  { id: 'em_contato', title: 'Em Contato', color: 'bg-sky-100 text-sky-900', role: 'sdr' },
  { id: 'qualificado', title: 'Qualificado', color: 'bg-emerald-100 text-emerald-900', role: 'closer' },
  { id: 'reuniao_marcada', title: 'Reunião Marcada', color: 'bg-violet-100 text-violet-900', role: 'closer' },
  { id: 'envio_proposta', title: 'Envio de Proposta', color: 'bg-blue-100 text-blue-900', role: 'closer' },
  { id: 'vendido', title: 'Vendido', color: 'bg-green-100 text-green-900', role: 'closer' },
  { id: 'perdido', title: 'Perdido', color: 'bg-gray-200 text-gray-700', role: 'closer', adminOnly: true },
  { id: 'recuperacao_sdr', title: 'Recuperação SDR', color: 'bg-rose-100 text-rose-900', role: 'sdr' },
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  sem_atendimento: 'Sem Atendimento',
  nao_atendeu: 'Não Atendeu',
  em_contato: 'Em Contato',
  qualificado: 'Qualificado',
  reuniao_marcada: 'Reunião Marcada',
  envio_proposta: 'Envio de Proposta',
  vendido: 'Vendido',
  perdido: 'Perdido',
  recuperacao_sdr: 'Recuperação SDR',
};