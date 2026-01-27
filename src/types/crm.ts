export type AppRole = 'sdr' | 'closer' | 'admin';

export type LeadStatus = 
  | 'sem_atendimento'
  | 'nao_atendeu'
  | 'em_contato'
  | 'qualificado'
  | 'reuniao_marcada'
  | 'envio_proposta'
  | 'vendido'
  | 'recuperacao_sdr';

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

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

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
export const KANBAN_COLUMNS: { id: LeadStatus; title: string; color: string; role: 'sdr' | 'closer' }[] = [
  { id: 'sem_atendimento', title: 'Sem Atendimento', color: 'bg-muted', role: 'sdr' },
  { id: 'nao_atendeu', title: 'Não Atendeu', color: 'bg-warning/20', role: 'sdr' },
  { id: 'em_contato', title: 'Em Contato', color: 'bg-info/20', role: 'sdr' },
  { id: 'qualificado', title: 'Qualificado', color: 'bg-success/20', role: 'closer' },
  { id: 'reuniao_marcada', title: 'Reunião Marcada', color: 'bg-primary/20', role: 'closer' },
  { id: 'envio_proposta', title: 'Envio de Proposta', color: 'bg-info/20', role: 'closer' },
  { id: 'vendido', title: 'Vendido', color: 'bg-success/30', role: 'closer' },
  { id: 'recuperacao_sdr', title: 'Recuperação SDR', color: 'bg-destructive/20', role: 'sdr' },
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  sem_atendimento: 'Sem Atendimento',
  nao_atendeu: 'Não Atendeu',
  em_contato: 'Em Contato',
  qualificado: 'Qualificado',
  reuniao_marcada: 'Reunião Marcada',
  envio_proposta: 'Envio de Proposta',
  vendido: 'Vendido',
  recuperacao_sdr: 'Recuperação SDR',
};