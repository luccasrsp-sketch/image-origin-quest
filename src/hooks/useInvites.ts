import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/crm';

export interface UserInvite {
  id: string;
  email: string;
  role: AppRole;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

export function useInvites() {
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
    } else {
      setInvites(data as UserInvite[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const createInvite = async (email: string, role: AppRole, invitedBy: string) => {
    const { data, error } = await supabase
      .from('user_invites')
      .insert({
        email: email.toLowerCase().trim(),
        role,
        invited_by: invitedBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      return { success: false, error: error.message };
    }

    setInvites(prev => [data as UserInvite, ...prev]);
    return { success: true, data };
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase
      .from('user_invites')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invite:', error);
      return false;
    }

    setInvites(prev => prev.filter(i => i.id !== id));
    return true;
  };

  const pendingInvites = invites.filter(i => !i.accepted_at);
  const acceptedInvites = invites.filter(i => i.accepted_at);

  return {
    invites,
    pendingInvites,
    acceptedInvites,
    loading,
    fetchInvites,
    createInvite,
    deleteInvite,
  };
}