'use server';

import { createClient } from '@supabase/supabase-js';

const SURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We securely use the private key which is not accessible by the browser
const SERVICEROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SURL || !SERVICEROLE) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY variables.");
}

// Admin client capable of bypassing RLS and doing auth admin operations
const adminAuthClient = createClient(SURL, SERVICEROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function inviteUserServer(email: string, senha: string, nome: string, perfil: string) {
  try {
    const { data, error } = await adminAuthClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true
    });

    if (error) {
      return { error: error.message };
    }

    const uId = data.user?.id;
    if (uId) {
      const { error: dbError } = await adminAuthClient.from('perfis').upsert({ id: uId, nome, perfil });
      if (dbError) {
        return { error: dbError.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Unknown error' };
  }
}

export async function deleteUserServer(id: string) {
  try {
    const { error: authError } = await adminAuthClient.auth.admin.deleteUser(id);
    if (authError) {
      return { error: authError.message };
    }

    const { error: dbError } = await adminAuthClient.from('perfis').delete().eq('id', id);
    if (dbError) {
      return { error: dbError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Unknown error' };
  }
}

export async function fetchAllUsersServer() {
  try {
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.listUsers();
    if (authError) {
      return { error: authError.message };
    }

    const { data: perfis } = await adminAuthClient.from('perfis').select('*');

    const combined = authData.users.map(u => {
      const p = perfis?.find(x => x.id === u.id);
      return {
        id: u.id,
        email: u.email,
        nome: p?.nome || '-',
        perfil: p?.perfil || 'visualizador'
      };
    });

    return { users: combined };
  } catch (err: any) {
    return { error: err.message || 'Unknown error' };
  }
}
