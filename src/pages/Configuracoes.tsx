import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/hooks/useTeam';
import { useInvites } from '@/hooks/useInvites';
import { InviteUserDialog } from '@/components/team/InviteUserDialog';
import { EditRoleDialog } from '@/components/team/EditRoleDialog';
import { PushNotificationSettings } from '@/components/notifications/PushNotificationSettings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Users, 
  Shield,
  Link,
  Copy,
  Check,
  UserPlus,
  Clock,
  Trash2,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AppRole, Profile } from '@/types/crm';

interface TeamMemberWithRoles extends Profile {
  roles: AppRole[];
}

export default function ConfiguracoesPage() {
  const { profile, roles, isAdmin } = useAuth();
  const { team, fetchTeam, updateMemberRole } = useTeam();
  const { pendingInvites, acceptedInvites, createInvite, deleteInvite } = useInvites();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberWithRoles | null>(null);

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

  const getRoleBadgeByRole = (role: AppRole) => {
    if (role === 'admin') return { label: 'Admin', variant: 'default' as const };
    if (role === 'closer') return { label: 'Closer', variant: 'secondary' as const };
    if (role === 'sdr') return { label: 'SDR', variant: 'outline' as const };
    return { label: 'Usuário', variant: 'outline' as const };
  };

  const handleInvite = async (email: string, role: AppRole) => {
    if (!profile) return { success: false, error: 'Usuário não autenticado' };
    return await createInvite(email, role, profile.id);
  };

  const handleDeleteInvite = async (id: string, email: string) => {
    const success = await deleteInvite(id);
    if (success) {
      toast({
        title: 'Convite removido',
        description: `O convite para ${email} foi cancelado.`,
      });
    }
  };

  const handleEditRole = async (newRole: AppRole) => {
    if (!editingMember) return { success: false, error: 'Nenhum membro selecionado' };
    
    const result = await updateMemberRole(editingMember.user_id, newRole);
    
    if (result.success) {
      toast({
        title: 'Papel atualizado',
        description: `O papel de ${editingMember.full_name} foi alterado para ${newRole.toUpperCase()}.`,
      });
    }
    
    return result;
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

        {/* Push Notifications section */}
        <PushNotificationSettings />

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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipe
              </CardTitle>
              <CardDescription>
                Membros do time com acesso ao CRM
              </CardDescription>
            </div>
            {isAdmin() && (
              <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Convidar
              </Button>
            )}
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {isAdmin() && member.user_id !== profile?.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingMember(member)}
                          title="Editar papel"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {team.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum membro cadastrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invites section */}
        {isAdmin() && pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Convites Pendentes
              </CardTitle>
              <CardDescription>
                Aguardando o usuário criar conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvites.map(invite => {
                  const badge = getRoleBadgeByRole(invite.role);
                  return (
                    <div 
                      key={invite.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-muted text-sm">
                            <Clock className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-muted-foreground">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Convidado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteInvite(invite.id, invite.email)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accepted Invites section */}
        {isAdmin() && acceptedInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Convites Aceitos
              </CardTitle>
              <CardDescription>
                Usuários que criaram conta após convite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {acceptedInvites.map(invite => {
                  const badge = getRoleBadgeByRole(invite.role);
                  return (
                    <div 
                      key={invite.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-success/5"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-success/20 text-success text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Aceito em {new Date(invite.accepted_at!).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin info */}
        {isAdmin() && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Você é Administrador</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Como admin, você pode convidar novos usuários e atribuir papéis (SDR, Closer, Admin).
                    Os usuários convidados receberão o papel automaticamente ao criar conta com o email cadastrado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
      />

      {/* Edit Role Dialog */}
      {editingMember && (
        <EditRoleDialog
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          memberName={editingMember.full_name}
          currentRoles={editingMember.roles}
          onSave={handleEditRole}
        />
      )}
    </AppLayout>
  );
}