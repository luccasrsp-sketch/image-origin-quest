import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Company, COMPANY_LABELS } from '@/types/crm';

interface CompanyContextType {
  selectedCompany: Company;
  setSelectedCompany: (company: Company) => void;
  companyLabel: string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company>(() => {
    const saved = localStorage.getItem('selectedCompany');
    return (saved as Company) || 'escola_franchising';
  });

  useEffect(() => {
    localStorage.setItem('selectedCompany', selectedCompany);
  }, [selectedCompany]);

  const companyLabel = COMPANY_LABELS[selectedCompany];

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companyLabel }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
