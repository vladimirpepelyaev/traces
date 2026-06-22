import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AppUser } from '../../types';

export interface AuthService {
  signUp(login: string, password?: string, name?: string, status?: string): Promise<AppUser>;
  signIn(login: string, password?: string): Promise<AppUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AppUser | null>;
  getRoles(userId: string): Promise<string[]>;
  hasRole(userId: string, role: string): Promise<boolean>;

  // Legacy backwards compatibility
  login(login: string, password?: string): Promise<AppUser>;
  register(name: string, login: string, password?: string, status?: string): Promise<AppUser>;
  logout(): Promise<void>;
}

function toEmail(login: string): string {
  if (login.includes('@')) {
    return login;
  }
  return `${login.toLowerCase()}@sledy-moderator.ru`;
}

function mapProfileAndRolesToAppUser(profile: any, roles: string[]): AppUser {
  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isModerator = roles.includes('moderator');
  const isSupport = roles.includes('support');
  const isEmployee = isAdmin || isModerator || isSupport;

  // Primary fallback role
  let primaryRole = 'user';
  if (isSuperAdmin) primaryRole = 'super_admin';
  else if (isAdmin) primaryRole = 'admin';
  else if (isModerator) primaryRole = 'moderator';
  else if (isSupport) primaryRole = 'support';

  return {
    id: profile.id,
    name: profile.display_name || profile.username,
    login: profile.username,
    avatar: profile.avatar_url || 'paw-prints-emoji-clipart-md.png',
    trustLevel: 1.0,
    isVerified: isAdmin || isModerator,
    isBlocked: false,
    regDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
    role: primaryRole,
    roleList: roles,
    isEmployee: isEmployee,
    roles: {
      support: isSupport || isAdmin || isSuperAdmin,
      moderation: isModerator || isAdmin || isSuperAdmin,
      spam: isModerator || isAdmin || isSuperAdmin,
      pro: isEmployee,
      verification: isAdmin || isSuperAdmin,
      recovery: isAdmin || isSuperAdmin,
      feed_moderator: isModerator || isAdmin || isSuperAdmin
    },
    friendsCount: 0,
    followersCount: 0,
    photosCount: 0,
    rightMenuAccess: {
      id: true,
      block: isEmployee,
      card: true,
      verify: isAdmin || isSuperAdmin,
      info: true,
      complaints: true,
      delete: isAdmin || isSuperAdmin,
      mark: isEmployee
    }
  };
}

class AuthServiceImpl implements AuthService {
  async signUp(login: string, password?: string, name?: string, status?: string): Promise<AppUser> {
    console.log(`AuthService: signUp for ${login}`);
    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured. Specify VITE_SUPABASE_URL and VITE_SUPABASE_KEY. Trying to call Supabase signUp anyway.");
    }

    const email = toEmail(login);
    const pass = password || 'default_pass_123';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Registration failed');
    }

    // Insert into profiles table
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: login,
      created_at: data.user.created_at
    });

    if (profileError) {
      console.error('Profiles DB Table insert failed:', profileError);
    }

    return mapProfileAndRolesToAppUser({
      id: data.user.id,
      username: login,
      created_at: data.user.created_at
    }, []);
  }

  async signIn(login: string, password?: string): Promise<AppUser> {
    console.log(`AuthService: signIn for ${login}`);
    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured. Specify VITE_SUPABASE_URL and VITE_SUPABASE_KEY. Trying to call Supabase signIn anyway.");
    }

    const email = toEmail(login);
    const pass = password || 'default_pass_123';
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Auth failed');
    }

    // Fetch profile
    let { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      const username = login;
      const display_name = data.user.user_metadata?.name || username;
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          display_name,
          avatar_url: 'paw-prints-emoji-clipart-md.png'
        })
        .select()
        .single();
      
      if (newProfile) {
        profile = newProfile;
      } else {
        profile = {
          id: data.user.id,
          username,
          display_name,
          avatar_url: 'paw-prints-emoji-clipart-md.png',
          created_at: data.user.created_at
        };
      }
    }

    // Fetch roles
    const roles = await this.getRoles(data.user.id);

    return mapProfileAndRolesToAppUser(profile, roles);
  }

  async signOut(): Promise<void> {
    console.log('AuthService: signOut');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  }

  async getCurrentUser(): Promise<AppUser | null> {
    if (!isSupabaseConfigured) return null;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }

    // Fetch profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const username = user.email ? user.email.split('@')[0] : 'user';
      const display_name = user.user_metadata?.name || username;
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username,
          display_name,
          avatar_url: 'paw-prints-emoji-clipart-md.png'
        })
        .select()
        .single();
      
      profile = newProfile || {
        id: user.id,
        username,
        display_name,
        avatar_url: 'paw-prints-emoji-clipart-md.png',
        created_at: user.created_at
      };
    }

    // Fetch roles
    const roles = await this.getRoles(user.id);

    return mapProfileAndRolesToAppUser(profile, roles);
  }

  async getRoles(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error || !data) {
      console.error('Error loading roles from user_roles table:', error);
      return [];
    }

    const roleStrings = data.map(r => r.role);
    return roleStrings;
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = await this.getRoles(userId);
    return roles.includes(role);
  }

  // --- Backwards Compatibility Wrappers ---
  async login(login: string, password?: string): Promise<AppUser> {
    return this.signIn(login, password);
  }

  async register(name: string, login: string, password?: string, status?: string): Promise<AppUser> {
    return this.signUp(login, password, name, status);
  }

  async logout(): Promise<void> {
    return this.signOut();
  }
}

export const authService: AuthService = new AuthServiceImpl();
