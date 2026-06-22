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

export function profileToAppUser(profile: any): AppUser {
  if (!profile) {
    throw new Error('profile is required');
  }
  const role = profile.role || 'user';
  
  // Rule mapping
  const isSuperAdmin = role === 'super_admin';
  const isModerator = role === 'moderator' || role === 'moderation';
  const isSupport = role === 'support';
  
  // Rule: isEmployee = true for super_admin, moderator, support
  const isEmployee = isSuperAdmin || isModerator || isSupport;
  
  // Rule: roles list with specific booleans
  const rolesArray: any = [role];
  rolesArray.moderation = isSuperAdmin || isModerator;
  rolesArray.support = isSuperAdmin || isSupport;
  rolesArray.pro = isSuperAdmin;
  rolesArray.spam = isSuperAdmin || isModerator;
  rolesArray.verification = isSuperAdmin;
  rolesArray.recovery = isSuperAdmin;
  rolesArray.feed_moderator = isSuperAdmin || isModerator;

  const appUser: AppUser = {
    id: profile.id,
    name: profile.display_name || profile.username || 'user',
    login: profile.username || '',
    avatar: profile.avatar_url || 'paw-prints-emoji-clipart-md.png',
    trustLevel: 1.0,
    isVerified: isSuperAdmin || isModerator,
    isBlocked: !!profile.blocked,
    regDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
    role: role,
    roleList: [role],
    roles: rolesArray,
    isEmployee: isEmployee,
    onboardingCompleted: !!profile.onboarding_completed,
    status: profile.status || '',
    friendsCount: 0,
    followersCount: 0,
    photosCount: 0,
    rightMenuAccess: {
      id: true,
      block: isEmployee,
      card: true,
      verify: isSuperAdmin,
      info: true,
      complaints: true,
      delete: isSuperAdmin,
      mark: isEmployee
    }
  };

  // Log permissions and roles
  console.log('PROFILE_ROLE', role);
  console.log('APP_USER', appUser);

  return appUser;
}

function mapProfileAndRolesToAppUser(profile: any, roles: string[]): AppUser {
  // Integrate the roles fetched if any, but default to profile properties
  const user = profileToAppUser(profile);
  if (roles && roles.length > 0) {
    const role = roles[0];
    const isSuperAdmin = role === 'super_admin';
    const isModerator = role === 'moderator' || role === 'moderation';
    const isSupport = role === 'support';
    const isEmployee = isSuperAdmin || isModerator || isSupport;

    user.role = role;
    user.roleList = roles;
    
    const rolesArray: any = [...roles];
    rolesArray.moderation = isSuperAdmin || isModerator;
    rolesArray.support = isSuperAdmin || isSupport;
    rolesArray.pro = isSuperAdmin;
    rolesArray.spam = isSuperAdmin || isModerator;
    rolesArray.verification = isSuperAdmin;
    rolesArray.recovery = isSuperAdmin;
    rolesArray.feed_moderator = isSuperAdmin || isModerator;
    user.roles = rolesArray;
    user.isEmployee = isEmployee;
  }
  return user;
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
      display_name: name || login,
      role: 'user',
      onboarding_completed: false,
      blocked: false,
      created_at: data.user.created_at
    });

    if (profileError) {
      console.error('Profiles DB Table insert failed:', profileError);
    }

    return mapProfileAndRolesToAppUser({
      id: data.user.id,
      username: login,
      display_name: name || login,
      role: 'user',
      onboarding_completed: false,
      blocked: false,
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

    if (profileErr) {
      console.error('[AuthService] Error fetching profile on signIn:', profileErr);
      if (profileErr.code === 'PGRST116') {
        // Safe to create new profile as the row just doesn't exist
        const username = login;
        const display_name = data.user.user_metadata?.name || username;
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            display_name,
            avatar_url: 'paw-prints-emoji-clipart-md.png',
            role: 'user',
            onboarding_completed: false,
            blocked: false
          })
          .select()
          .single();

        if (insertErr) {
          console.error('[AuthService] Error inserting new profile:', insertErr);
        } else {
          profile = newProfile;
        }
      } else {
        // Enforce constraint: RLS or similar system database error, DO NOT insert or create a new profile!
        console.log('[AuthService] RLS or query failure. Skipping profile auto-creation on signIn.');
      }
    }

    if (!profile) {
      // Return fallback memory object and log it
      profile = {
        id: data.user.id,
        username: login,
        display_name: data.user.user_metadata?.name || login,
        avatar_url: 'paw-prints-emoji-clipart-md.png',
        role: 'user',
        onboarding_completed: false,
        blocked: false,
        created_at: data.user.created_at
      };
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
    let { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error('[AuthService] Error fetching profile on getCurrentUser:', profileErr);
      if (profileErr.code === 'PGRST116') {
        const username = user.email ? user.email.split('@')[0] : 'user';
        const display_name = user.user_metadata?.name || username;
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username,
            display_name,
            avatar_url: 'paw-prints-emoji-clipart-md.png',
            role: 'user',
            onboarding_completed: false,
            blocked: false
          })
          .select()
          .single();

        if (insertErr) {
          console.error('[AuthService] Error inserting profile on getCurrentUser:', insertErr);
        } else {
          profile = newProfile;
        }
      } else {
        // RLS error, DO NOT insert or create a new profile!
        console.log('[AuthService] RLS or query failure. Skipping profile auto-creation on getCurrentUser.');
      }
    }

    if (!profile) {
      profile = {
        id: user.id,
        username: user.email ? user.email.split('@')[0] : 'user',
        display_name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'user'),
        avatar_url: 'paw-prints-emoji-clipart-md.png',
        role: 'user',
        onboarding_completed: false,
        blocked: false,
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
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('[AuthService] Error loading roles from profiles table:', error);
      return [];
    }

    const role = data.role || 'user';
    return [role];
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
