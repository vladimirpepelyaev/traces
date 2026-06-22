import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth/AuthService';
import { AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  roles: string[];
  loading: boolean;
  signUp: (login: string, password?: string, name?: string, status?: string) => Promise<AppUser>;
  signIn: (login: string, password?: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const u = await authService.getCurrentUser();
      if (u) {
        setUser(u);
        const userRoles = await authService.getRoles(u.id);
        setRoles(userRoles);
      } else {
        setUser(null);
        setRoles([]);
      }
    } catch (err) {
      console.error('Error recovering active Supabase session:', err);
      setUser(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signUp = async (login: string, password?: string, name?: string, status?: string) => {
    try {
      setLoading(true);
      const newUser = await authService.signUp(login, password, name, status);
      setUser(newUser);
      const userRoles = await authService.getRoles(newUser.id);
      setRoles(userRoles);
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (login: string, password?: string) => {
    try {
      setLoading(true);
      const loggedUser = await authService.signIn(login, password);
      setUser(loggedUser);
      const userRoles = await authService.getRoles(loggedUser.id);
      setRoles(userRoles);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      setUser(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string) => {
    if (roles.includes('super_admin')) return true;
    if (role === 'admin' && roles.includes('admin')) return true;
    if (role === 'moderator' && (roles.includes('admin') || roles.includes('moderator'))) return true;
    if (role === 'support' && (roles.includes('admin') || roles.includes('moderator') || roles.includes('support'))) return true;
    return roles.includes(role);
  };

  const refreshUser = async () => {
    try {
      const u = await authService.getCurrentUser();
      if (u) {
        setUser(u);
        const userRoles = await authService.getRoles(u.id);
        setRoles(userRoles);
      }
    } catch (err) {
      console.error('Error refreshing active user session:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, roles, loading, signUp, signIn, signOut, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
