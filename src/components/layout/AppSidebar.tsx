import { 
  Users, 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Upload,
  DollarSign,
  TrendingUp,
  PlusCircle,
  FileCheck,
  CalendarDays,
  Target,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logoEscolaFranchising from '@/assets/logo-escola-franchising.svg';
import logoEvidia from '@/assets/logo-evidia.png';
import { CompanySelector } from './CompanySelector';
import { useCompany } from '@/contexts/CompanyContext';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Dashboard da Meta', url: '/meta', icon: Target },
  { title: 'Leads Novos', url: '/leads', icon: Users },
  { title: 'Kanban', url: '/kanban', icon: Kanban },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

const financeNavItems = [
  { title: 'Dashboard Receitas', url: '/financeiro', icon: DollarSign },
  { title: 'Projeções', url: '/financeiro/projecoes', icon: TrendingUp },
  { title: 'Nova Venda', url: '/financeiro/nova-venda', icon: PlusCircle },
  { title: 'Cheques', url: '/financeiro/cheques', icon: FileCheck },
  { title: 'Calendário', url: '/financeiro/calendario', icon: CalendarDays },
];

const settingsItems = [
  { title: 'Importar Leads', url: '/importar', icon: Upload },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { profile, signOut, roles, isViewerOnly, isAdmin } = useAuth();
  const { state } = useSidebar();
  const { selectedCompany } = useCompany();
  const collapsed = state === 'collapsed';

  const logo = selectedCompany === 'evidia' ? logoEvidia : logoEscolaFranchising;
  const altText = selectedCompany === 'evidia' ? 'Evidia' : 'Escola do Franchising';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('closer')) return 'Closer';
    if (roles.includes('sdr')) return 'SDR';
    if (roles.includes('viewer')) return 'Visualizador';
    return 'Usuário';
  };

  // Viewers não veem itens de sistema (importar, configurações)
  const visibleSettingsItems = isViewerOnly() ? [] : settingsItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <img 
            src={logo} 
            alt={altText} 
            className={collapsed ? "h-10 w-10 object-contain" : "h-12 w-auto max-w-[180px] object-contain"}
          />
        </div>
        {/* Company Selector no desktop - abaixo do logo */}
        {!collapsed && <CompanySelector variant="prominent" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Financial Module - XFranchise Finances (Admin Only) */}
        {isAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {financeNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleSettingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {profile && (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {profile.full_name}
                </span>
                <Badge variant="secondary" className="mt-0.5 w-fit text-xs">
                  {getRoleBadge()}
                </Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}