import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth/AuthService';
import { userRepository, UserProfile, UserProgress } from '../services/user/UserRepository';
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
  restoreSession: () => Promise<void>;
  loadProfile: (userId: string) => Promise<UserProfile | null>;
  loadProgress: (userId: string) => Promise<UserProgress | null>;
  hydrateStore: (profile: any, progress: any) => { onboardingCompleted: boolean; isBlocked: boolean; interests: string[]; currentStep: string | null } | null;
  completeOnboarding: (interests?: string[]) => Promise<void>;
  saveProgress: (currentStep: string | null, completedSteps: string[]) => Promise<void>;
  saveRecord: (type: string, payload: any) => Promise<void>;
  loadRecords: (type?: string) => Promise<any[]>;
  setBlockedState: (userId: string, blocked: boolean) => Promise<void>;
  setUserRole: (userId: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    return await userRepository.getProfile(userId);
  };

  const loadProgress = async (userId: string) => {
    return await userRepository.getProgress(userId);
  };

  const hydrateStore = (profile: any, progress: any) => {
    if (!profile) return null;
    return {
      onboardingCompleted: !!profile.onboarding_completed,
      isBlocked: !!profile.blocked,
      interests: progress?.completed_steps || [],
      currentStep: progress?.current_step || null
    };
  };

  const restoreSession = async () => {
    try {
      const u = await authService.getCurrentUser();
      if (u) {
        const profile = await loadProfile(u.id);
        const progress = await loadProgress(u.id);
        const hydrated = hydrateStore(profile, progress);

        const finalRole = profile?.role || u.role || 'user';
        const consolidatedUser = {
          ...u,
          role: finalRole,
          roles: [finalRole],
          ...(hydrated ? {
            onboardingCompleted: hydrated.onboardingCompleted,
            isBlocked: hydrated.isBlocked,
            interests: hydrated.interests
          } : {})
        };

        if (consolidatedUser.isBlocked) {
          console.warn("User is blocked. Rejecting loaded session.");
          setUser(null);
          setRoles([]);
          return;
        }

        setUser(consolidatedUser);
        setRoles([finalRole]);
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
    restoreSession();
  }, []);

  const signUp = async (login: string, password?: string, name?: string, status?: string) => {
    try {
      setLoading(true);
      const newUser = await authService.signUp(login, password, name, status);
      
      const profile = await loadProfile(newUser.id);
      const progress = await loadProgress(newUser.id);
      const hydrated = hydrateStore(profile, progress);

      const finalRole = profile?.role || newUser.role || 'user';
      const consolidatedUser = {
        ...newUser,
        role: finalRole,
        roles: [finalRole],
        ...(hydrated ? {
          onboardingCompleted: hydrated.onboardingCompleted,
          isBlocked: hydrated.isBlocked,
          interests: hydrated.interests
        } : {})
      };

      setUser(consolidatedUser);
      setRoles([finalRole]);
      return consolidatedUser;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (login: string, password?: string) => {
    try {
      setLoading(true);
      const loggedUser = await authService.signIn(login, password);
      
      const profile = await loadProfile(loggedUser.id);
      const progress = await loadProgress(loggedUser.id);
      const hydrated = hydrateStore(profile, progress);

      const finalRole = profile?.role || loggedUser.role || 'user';
      const consolidatedUser = {
        ...loggedUser,
        role: finalRole,
        roles: [finalRole],
        ...(hydrated ? {
          onboardingCompleted: hydrated.onboardingCompleted,
          isBlocked: hydrated.isBlocked,
          interests: hydrated.interests
        } : {})
      };

      if (consolidatedUser.isBlocked) {
        throw new Error('Доступ заблокирован модератором.');
      }

      setUser(consolidatedUser);
      setRoles([finalRole]);
      return consolidatedUser;
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
        const profile = await loadProfile(u.id);
        const progress = await loadProgress(u.id);
        const hydrated = hydrateStore(profile, progress);

        const finalRole = profile?.role || u.role || 'user';
        const consolidatedUser = {
          ...u,
          role: finalRole,
          roles: [finalRole],
          ...(hydrated ? {
            onboardingCompleted: hydrated.onboardingCompleted,
            isBlocked: hydrated.isBlocked,
            interests: hydrated.interests
          } : {})
        };

        setUser(consolidatedUser);
        setRoles([finalRole]);
      }
    } catch (err) {
      console.error('Error refreshing active user session:', err);
    }
  };

  const completeOnboarding = async (interests?: string[]) => {
    if (!user) return;
    try {
      await userRepository.completeOnboarding(user.id);
      await userRepository.saveProgress(user.id, { courseId: 'main_course', currentStep: 'completed', completedSteps: interests || [] });
      setUser(prev => prev ? { ...prev, onboardingCompleted: true, interests: interests || [] } : null);
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  };

  const saveProgress = async (currentStep: string | null, completedSteps: string[]) => {
    if (!user) return;
    try {
      await userRepository.saveProgress(user.id, { courseId: 'main_course', currentStep, completedSteps });
      setUser(prev => prev ? { ...prev, interests: completedSteps } : null);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  const saveRecord = async (type: string, payload: any) => {
    if (!user) return;
    try {
      await userRepository.saveRecord(user.id, type, payload);
    } catch (err) {
      console.error('Error saving record:', err);
    }
  };

  const loadRecords = async (type?: string) => {
    if (!user) return [];
    try {
      return await userRepository.loadRecords(user.id, type);
    } catch (err) {
      console.error('Error loading records:', err);
      return [];
    }
  };

  const setBlockedState = async (userId: string, blocked: boolean) => {
    try {
      await userRepository.setBlocked(userId, blocked);
      if (user && user.id === userId) {
        setUser(prev => prev ? { ...prev, isBlocked: blocked } : null);
      }
    } catch (err) {
      console.error('Error setting blocked state:', err);
    }
  };

  const setUserRole = async (userId: string, role: string) => {
    try {
      await userRepository.setRole(userId, role);
      if (user && user.id === userId) {
        setUser(prev => prev ? { ...prev, role } : null);
      }
    } catch (err) {
      console.error('Error setting user role:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      roles, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      hasRole, 
      refreshUser,
      restoreSession,
      loadProfile,
      loadProgress,
      hydrateStore,
      completeOnboarding,
      saveProgress,
      saveRecord,
      loadRecords,
      setBlockedState,
      setUserRole
    }}>
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
