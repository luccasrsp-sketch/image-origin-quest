import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';

export function PushNotificationSettings() {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push. Tente usar o Chrome, Firefox ou Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5 text-primary" />
              Notificações Push
            </CardTitle>
            <CardDescription className="mt-1">
              Receba notificações quando novos leads forem atribuídos a você
            </CardDescription>
          </div>
          {isSubscribed && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
              Ativo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando...</span>
          </div>
        ) : permission === 'denied' ? (
          <div className="text-sm text-destructive">
            Notificações bloqueadas pelo navegador. Acesse as configurações do navegador para permitir.
          </div>
        ) : isSubscribed ? (
          <Button 
            variant="outline" 
            onClick={unsubscribe}
            className="gap-2"
          >
            <BellOff className="h-4 w-4" />
            Desativar Notificações
          </Button>
        ) : (
          <Button 
            onClick={subscribe}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            Ativar Notificações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
