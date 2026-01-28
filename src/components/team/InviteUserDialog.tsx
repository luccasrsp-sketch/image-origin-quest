import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppRole } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, role: AppRole) => Promise<{ success: boolean; error?: string }>;
}

export function InviteUserDialog({ open, onOpenChange, onInvite }: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('sdr');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Digite o email do usuário a ser convidado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const result = await onInvite(email, role);
    setLoading(false);

    if (result.success) {
      toast({
        title: 'Convite enviado!',
        description: `O usuário ${email} foi convidado como ${role.toUpperCase()}.`,
      });
      setEmail('');
      setRole('sdr');
      onOpenChange(false);
    } else {
      toast({
        title: 'Erro ao convidar',
        description: result.error || 'Não foi possível enviar o convite.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Usuário
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sdr">SDR</SelectItem>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Convidar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}