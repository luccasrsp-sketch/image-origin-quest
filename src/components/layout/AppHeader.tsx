import { Bell, Menu, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { team } = useTeam();
  const { isAdmin, viewingAs, setViewingAs } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('closer')) return 'Closer';
    if (roles.includes('sdr')) return 'SDR';
    return 'Usuário';
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center justify-between border-b border-border bg-background/95 px-3 md:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <SidebarTrigger className="h-10 w-10 md:h-9 md:w-9 touch-manipulation">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
        <h1 className="text-base md:text-xl font-semibold text-foreground truncate">{title}</h1>
        
        {/* Viewing As indicator - hidden on mobile, shown in dropdown instead */}
        {viewingAs && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/30 rounded-full">
            <Eye className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Visualizando como: {viewingAs.full_name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-warning/20"
              onClick={() => setViewingAs(null)}
            >
              <X className="h-3 w-3 text-warning" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Mobile viewing as indicator */}
        {viewingAs && (
          <Badge variant="outline" className="md:hidden text-xs border-warning text-warning max-w-[100px] truncate">
            {viewingAs.full_name.split(' ')[0]}
          </Badge>
        )}
        
        {/* View As selector for admins */}
        {isAdmin() && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 md:h-9 md:w-auto md:px-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground touch-manipulation"
              >
                <Eye className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Visualizar como</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Selecione um membro</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setViewingAs(null)}
                className={`min-h-[44px] ${!viewingAs ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">EU</AvatarFallback>
                  </Avatar>
                  <span>Minha visão (Admin)</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {team
                .filter(m => !m.roles.includes('admin'))
                .map(member => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => setViewingAs(member)}
                    className={`min-h-[44px] ${viewingAs?.id === member.id ? 'bg-muted' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getRoleBadge(member.roles)}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 md:h-9 md:w-9 touch-manipulation">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                  variant="destructive"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} não lidas
                </Badge>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                      !notification.read ? 'bg-muted/50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-sm flex-1">{notification.title}</span>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}