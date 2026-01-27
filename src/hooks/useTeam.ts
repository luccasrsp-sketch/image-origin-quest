import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/crm';

export function useTeam() {
  const [team, setTeam] = useState<(Profile & { roles: AppRole[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    setLoading(true);
    
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
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

  const getSDRs = () => team.filter(t => t.roles.includes('sdr'));
  const getClosers = () => team.filter(t => t.roles.includes('closer'));
  const getAdmins = () => team.filter(t => t.roles.includes('admin'));

  return {
    team,
    loading,
    fetchTeam,
    getSDRs,
    getClosers,
    getAdmins,
  };
}