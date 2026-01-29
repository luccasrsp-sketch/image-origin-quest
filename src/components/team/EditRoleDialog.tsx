import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppRole } from '@/types/crm';
import { Loader2 } from 'lucide-react';

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  currentRoles: AppRole[];
  onSave: (role: AppRole) => Promise<{ success: boolean; error?: string }>;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  memberName,
  currentRoles,
  onSave,
}: EditRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>(
    currentRoles.includes('admin') ? 'admin' : 
    currentRoles.includes('closer') ? 'closer' : 
    currentRoles.includes('sdr') ? 'sdr' : 'viewer'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    const result = await onSave(selectedRole);
    
    setLoading(false);
    
    if (result.success) {
      onOpenChange(false);
    } else {
      setError(result.error || 'Erro ao atualizar papel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Papel</DialogTitle>
          <DialogDescription>
            Altere o papel de <strong>{memberName}</strong> no sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role">Novo Papel</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sdr">SDR</SelectItem>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
