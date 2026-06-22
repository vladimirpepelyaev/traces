import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AppUser } from '../../types';

export interface AuthService {
  login(login: string, password?: string): Promise<AppUser>;
  logout(): Promise<void>;
  register(name: string, login: string, password?: string, status?: string): Promise<AppUser>;
  getCurrentUser(): Promise<AppUser | null>;
}

function toEmail(login: string): string {
  if (login.includes('@')) {
    return login;
  }
  return `${login.toLowerCase()}@sledy-moderator.ru`;
}

function mapSupabaseUserToAppUser(sbUser: any): AppUser {
  const meta = sbUser.user_metadata || {};
  const email = sbUser.email || '';
  const login = email.split('@')[0];
  const isAdmin = login === 'admin' || meta.login === 'admin';
  return {
    id: sbUser.id,
    name: meta.name || login,
    login: login,
    role: isAdmin ? 'admin' : (meta.role || 'user'),
    status: meta.status || (isAdmin ? 'Администратор системы' : 'Участник сообщества'),
    avatar: isAdmin ? 'dog1.png' : 'paw-prints-emoji-clipart-md.png',
    trustLevel: 1.0,
    isVerified: isAdmin,
    isBlocked: false,
    regDate: sbUser.created_at ? new Date(sbUser.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
    friendsCount: isAdmin ? 999 : 0,
    followersCount: isAdmin ? 5000 : 0,
    photosCount: isAdmin ? 42 : 0,
    roles: isAdmin ? {
      support: true,
      moderation: true,
      spam: true,
      pro: true,
      verification: true,
      recovery: true,
      feed_moderator: true
    } : {
      support: false,
      moderation: false,
      spam: false,
      pro: false,
      verification: false,
      recovery: false,
      feed_moderator: false
    },
    boostsLeft: 3,
    boostsUsed: 0,
    boostsResetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString(),
    isEmployee: isAdmin,
    onboardingCompleted: true,
    interests: [],
    rightMenuAccess: {
      id: true,
      block: true,
      card: true,
      verify: true,
      info: true,
      complaints: true,
      delete: true,
      mark: true
    }
  };
}

class AuthServiceImpl implements AuthService {
  async login(login: string, password?: string): Promise<AppUser> {
    console.log(`AuthService: Logging in with ${login}`);
    
    // Check if Supabase keys are configured to support demo offline fallback
    const isPlaceholder = !isSupabaseConfigured;

    if (isPlaceholder) {
      console.warn('Supabase key is not initialized, using sandbox fallback');
      const isAdmin = login === 'admin';
      return {
        id: isAdmin ? '1' : 'mock_user_' + Math.floor(Math.random() * 1000),
        name: isAdmin ? 'admin' : login,
        login: login,
        role: isAdmin ? 'admin' : 'user',
        status: isAdmin ? 'Администратор системы' : 'Участник сообщества',
        avatar: isAdmin ? 'dog1.png' : 'paw-prints-emoji-clipart-md.png',
        trustLevel: 1.0,
        isVerified: isAdmin,
        isBlocked: false,
        regDate: new Date().toLocaleDateString(),
        friendsCount: isAdmin ? 999 : 0,
        followersCount: isAdmin ? 5000 : 0,
        photosCount: isAdmin ? 42 : 0,
        roles: isAdmin ? {
          support: true,
          moderation: true,
          spam: true,
          pro: true,
          verification: true,
          recovery: true,
          feed_moderator: true
        } : undefined,
        isEmployee: isAdmin,
        rightMenuAccess: {
          id: true,
          block: true,
          card: true,
          verify: true,
          info: true,
          complaints: true,
          delete: true,
          mark: true
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(login),
      password: password || 'default_pass_123',
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('User not found');
    }

    return mapSupabaseUserToAppUser(data.user);
  }

  async logout(): Promise<void> {
    console.log('AuthService: Logged out');
    const isPlaceholder = !isSupabaseConfigured;
    if (!isPlaceholder) {
      await supabase.auth.signOut();
    }
  }

  async register(name: string, login: string, password?: string, status?: string): Promise<AppUser> {
    console.log(`AuthService: Registering user ${name} (${login})`);
    
    const isPlaceholder = !isSupabaseConfigured;

    if (isPlaceholder) {
      console.warn('Supabase key is not initialized, using sandbox fallback');
      return {
        id: String(Math.floor(Math.random() * 100000) + 100),
        name: name,
        login: login,
        role: 'user',
        status: status || 'Новый пользователь',
        avatar: 'paw-prints-emoji-clipart-md.png',
        trustLevel: 1.0,
        isVerified: false,
        isBlocked: false,
        regDate: new Date().toLocaleDateString(),
        friendsCount: 0,
        followersCount: 0,
        photosCount: 0,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: toEmail(login),
      password: password || 'default_pass_123',
      options: {
        data: {
          name,
          login,
          status: status || 'Участник сообщества'
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Registration failed');
    }

    return mapSupabaseUserToAppUser(data.user);
  }

  async getCurrentUser(): Promise<AppUser | null> {
    const isPlaceholder = !isSupabaseConfigured;

    if (isPlaceholder) {
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }

    return mapSupabaseUserToAppUser(user);
  }
}

export const authService: AuthService = new AuthServiceImpl();
