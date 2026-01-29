import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { GoalProgressBar } from './GoalProgressBar';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

// Meta de janeiro: R$ 2.000.000 | Valor atual (75% para teste): R$ 1.500.000
const MONTHLY_GOAL = 2000000;
const CURRENT_VALUE = 1500000; // 75% para teste

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <GoalProgressBar 
            currentValue={CURRENT_VALUE} 
            goalValue={MONTHLY_GOAL} 
            label="Meta Janeiro"
          />
          <AppHeader title={title} />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}