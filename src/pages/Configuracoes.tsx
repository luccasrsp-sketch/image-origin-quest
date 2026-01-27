import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/hooks/useTeam';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Settings as SettingsIcon, 
  User, 
  Users, 
  Shield,
  Link,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ConfiguracoesPage() {
  const { profile, roles, isAdmin } = useAuth();
  const { team } = useTeam();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const formUrl = `${window.location.origin}/cadastro`;

  const copyFormUrl = async () => {
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast({
      title: 'Link copiado!',
      description: 'O link do formulário foi copiado para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (userRoles: string[]) => {
    if (userRoles.includes('admin')) return { label: 'Admin', variant: 'default' as const };
    if (userRoles.includes('closer')) return { label: 'Closer', variant: 'secondary' as const };
    if (userRoles.includes('sdr')) return { label: 'SDR', variant: 'outline' as const };
    return { label: 'Usuário', variant: 'outline' as const };
  };

  return (
    <AppLayout title="Configurações">
      <div className="space-y-6 max-w-4xl">
        {/* Profile section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu Perfil
            </CardTitle>
            <CardDescription>
              Informações da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile && (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{profile.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <div className="flex gap-2 mt-2">
                    {roles.map(role => (
                      <Badge key={role} variant="secondary">
                        {role.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form URL section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Formulário de Captação
            </CardTitle>
            <CardDescription>
              Link do formulário público para captação de leads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={formUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={copyFormUrl} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Compartilhe este link em suas campanhas para captar novos leads. 
              Os leads cadastrados aparecerão automaticamente no painel.
            </p>
            <div className="text-sm">
              <p className="font-medium mb-1">Parâmetros UTM suportados:</p>
              <code className="text-xs bg-muted p-2 rounded block">
                {formUrl}?utm_source=google&utm_medium=cpc&utm_campaign=vendas
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Team section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipe
            </CardTitle>
            <CardDescription>
              Membros do time com acesso ao CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {team.map(member => {
                const badge = getRoleBadge(member.roles);
                return (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-muted text-sm">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                );
              })}
              
              {team.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum membro cadastrado
                </p>
              )}
            </div>

            {isAdmin() && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Para adicionar novos membros ou alterar permissões, acesse o backend.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}