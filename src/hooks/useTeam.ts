import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/crm';

export function useTeam() {
  const [team, setTeam] = useState<(Profile & { roles: AppRole[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    setLoading(true);
    
    // Fetch all profiles using public view (doesn't expose email)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles_public')
      .select('*')
      .order('full_name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Fetch all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      setLoading(false);
      return;
    }

    // Combine profiles with roles
    const teamWithRoles = (profiles as Profile[]).map(profile => ({
      ...profile,
      roles: (roles as { user_id: string; role: AppRole }[])
        .filter(r => r.user_id === profile.user_id)
        .map(r => r.role),
    }));

    setTeam(teamWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const updateMemberRole = async (userId: string, newRole: AppRole): Promise<{ success: boolean; error?: string }> => {
    try {
      // First, delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing roles:', deleteError);
        return { success: false, error: 'Erro ao remover papéis existentes' };
      }

      // Then insert the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) {
        console.error('Error inserting new role:', insertError);
        return { success: false, error: 'Erro ao atribuir novo papel' };
      }

      // Refresh team data
      await fetchTeam();
      
      return { success: true };
    } catch (err) {
      console.error('Error updating role:', err);
      return { success: false, error: 'Erro inesperado ao atualizar papel' };
    }
  };

  const getSDRs = () => team.filter(t => t.roles.includes('sdr'));
  const getClosers = () => team.filter(t => t.roles.includes('closer'));
  const getAdmins = () => team.filter(t => t.roles.includes('admin'));

  return {
    team,
    loading,
    fetchTeam,
    updateMemberRole,
    getSDRs,
    getClosers,
    getAdmins,
  };
}