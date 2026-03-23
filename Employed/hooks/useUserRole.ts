import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error: roleError } = await supabase
        .from('utilisateur')
        .select('role')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (roleError || !data) {
        setRole(null);
      } else {
        setRole(data.role);
      }

      setLoading(false);
    };

    fetchRole();
  }, []);

  return { role, loading };
}
