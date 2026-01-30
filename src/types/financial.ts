// Payment method enum
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'check' | 'cash' | 'other';

// Installment status enum
export type InstallmentStatus = 'pending' | 'received' | 'overdue';

// Check status enum
export type CheckStatus = 'pending' | 'cleared' | 'bounced';

// Financial Sale interface
export interface FinancialSale {
  id: string;
  lead_id: string | null;
  description: string;
  total_amount: number;
  received_amount: number;
  payment_method: PaymentMethod;
  installments_count: number;
  company: 'escola_franchising' | 'evidia';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: {
    full_name: string;
    company_name: string;
  };
  installments?: FinancialInstallment[];
}

// Financial Installment interface
export interface FinancialInstallment {
  id: string;
  sale_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  received_date: string | null;
  status: InstallmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sale?: FinancialSale;
}

// Financial Check interface
export interface FinancialCheck {
  id: string;
  installment_id: string | null;
  sale_id: string | null;
  amount: number;
  bank: string;
  check_number: string;
  issuer: string;
  expected_clear_date: string;
  actual_clear_date: string | null;
  status: CheckStatus;
  notes: string | null;
  company: 'escola_franchising' | 'evidia';
  created_at: string;
  updated_at: string;
  // Joined data
  sale?: FinancialSale;
  installment?: FinancialInstallment;
}

// Cash Entry interface
export interface FinancialCashEntry {
  id: string;
  installment_id: string | null;
  sale_id: string | null;
  check_id: string | null;
  amount: number;
  entry_date: string;
  payment_method: PaymentMethod;
  description: string | null;
  company: 'escola_franchising' | 'evidia';
  created_by: string | null;
  created_at: string;
}

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  check: 'Cheque',
  cash: 'Dinheiro',
  other: 'Outro',
};

// Installment status labels
export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  received: 'Recebido',
  overdue: 'Atrasado',
};

// Check status labels
export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  pending: 'A Compensar',
  cleared: 'Compensado',
  bounced: 'Devolvido',
};

// Payment method colors for charts
export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  pix: '#22c55e',
  credit_card: '#3b82f6',
  debit_card: '#8b5cf6',
  check: '#f59e0b',
  cash: '#10b981',
  other: '#6b7280',
};
