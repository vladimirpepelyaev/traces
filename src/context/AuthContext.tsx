import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth/AuthService';
import { userRepository, UserProfile, UserProgress } from '../services/user/UserRepository';
import { AppUser } from '../types';
import { ensureProfileExists, supabase, isUuid } from '../lib/supabase';

interface AuthContextType {
  user: AppUser | null;
  roles: string[];
  loading: boolean;
  bootCompleted: boolean;
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
  const [bootCompleted, setBootCompleted] = useState(false);

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
        try {
          await ensureProfileExists();
        } catch (profileExistErr) {
          console.error('ensureProfileExists failed during restoreSession:', profileExistErr);
        }

        let profile: any = null;
        try {
          profile = await loadProfile(u.id);
        } catch (profileLoadErr) {
          console.error('loadProfile failed during restoreSession:', profileLoadErr);
        }

        let progress: any = null;
        try {
          progress = await loadProgress(u.id);
        } catch (progressLoadErr) {
          console.error('loadProgress failed during restoreSession:', progressLoadErr);
        }

        const hydrated = hydrateStore(profile, progress);

        const finalRole = profile?.role || u.role || 'user';
        const consolidatedUser = {
          ...u,
          role: finalRole,
          roles: [finalRole],
          onboardingCompleted: hydrated?.onboardingCompleted ?? false,
          isBlocked: hydrated ? hydrated.isBlocked : false,
          interests: hydrated ? hydrated.interests : [],
          currentStep: hydrated?.currentStep ?? 'step_1'
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
      setBootCompleted(true);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const signUp = async (login: string, password?: string, name?: string, status?: string) => {
    try {
      setLoading(true);
      const newUser = await authService.signUp(login, password, name, status);
      
      try {
        await ensureProfileExists();
      } catch (profileExistErr) {
        console.error('ensureProfileExists failed during signUp:', profileExistErr);
      }

      let profile: any = null;
      try {
        profile = await loadProfile(newUser.id);
      } catch (profileLoadErr) {
        console.error('loadProfile failed during signUp:', profileLoadErr);
      }

      let progress: any = null;
      try {
        progress = await loadProgress(newUser.id);
      } catch (progressLoadErr) {
        console.error('loadProgress failed during signUp:', progressLoadErr);
      }

      const hydrated = hydrateStore(profile, progress);

      const finalRole = profile?.role || newUser.role || 'user';
      const consolidatedUser = {
        ...newUser,
        role: finalRole,
        roles: [finalRole],
        onboardingCompleted: hydrated?.onboardingCompleted ?? false,
        isBlocked: hydrated ? hydrated.isBlocked : false,
        interests: hydrated ? hydrated.interests : [],
        currentStep: hydrated?.currentStep ?? 'step_1'
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
      
      try {
        await ensureProfileExists();
      } catch (profileExistErr) {
        console.error('ensureProfileExists failed during signIn:', profileExistErr);
      }

      let profile: any = null;
      try {
        profile = await loadProfile(loggedUser.id);
      } catch (profileLoadErr) {
        console.error('loadProfile failed during signIn:', profileLoadErr);
      }

      let progress: any = null;
      try {
        progress = await loadProgress(loggedUser.id);
      } catch (progressLoadErr) {
        console.error('loadProgress failed during signIn:', progressLoadErr);
      }

      const hydrated = hydrateStore(profile, progress);

      const finalRole = profile?.role || loggedUser.role || 'user';
      const consolidatedUser = {
        ...loggedUser,
        role: finalRole,
        roles: [finalRole],
        onboardingCompleted: hydrated?.onboardingCompleted ?? false,
        isBlocked: hydrated ? hydrated.isBlocked : false,
        interests: hydrated ? hydrated.interests : [],
        currentStep: hydrated?.currentStep ?? 'step_1'
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
        try {
          await ensureProfileExists();
        } catch (profileExistErr) {
          console.error('ensureProfileExists failed during refreshUser:', profileExistErr);
        }

        let profile: any = null;
        try {
          profile = await loadProfile(u.id);
        } catch (profileLoadErr) {
          console.error('loadProfile failed during refreshUser:', profileLoadErr);
        }

        let progress: any = null;
        try {
          progress = await loadProgress(u.id);
        } catch (progressLoadErr) {
          console.error('loadProgress failed during refreshUser:', progressLoadErr);
        }

        const hydrated = hydrateStore(profile, progress);

        const finalRole = profile?.role || u.role || 'user';
        const consolidatedUser = {
          ...u,
          role: finalRole,
          roles: [finalRole],
          onboardingCompleted: hydrated?.onboardingCompleted ?? false,
          isBlocked: hydrated ? hydrated.isBlocked : false,
          interests: hydrated ? hydrated.interests : [],
          currentStep: hydrated?.currentStep ?? 'step_1'
        };

        setUser(consolidatedUser);
        setRoles([finalRole]);
      }
    } catch (err) {
      console.error('Error refreshing active user session:', err);
    }
  };

  const lastSavedStepRef = React.useRef<string | null>(null);
  const lastSavedCompletedStepsRef = React.useRef<string[]>([]);
  const onboardingSavedRef = React.useRef<boolean>(false);

  const completeOnboarding = async (interests?: string[]) => {
    if (onboardingSavedRef.current) {
      console.log('[AuthContext] Onboarding already saved. Skipping duplicate.');
      return;
    }
    onboardingSavedRef.current = true;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && authUser.id) {
        await ensureProfileExists();

        lastSavedStepRef.current = 'completed';
        lastSavedCompletedStepsRef.current = [...(interests || [])];

        // 1. Save Progress
        await userRepository.saveProgress(authUser.id, { 
          courseId: 'main_course', 
          currentStep: 'completed', 
          completedSteps: interests || [] 
        });

        // 2. Update Profile onboarding_completed: true
        await userRepository.completeOnboarding(authUser.id);
        
        // 3. Refetch Profile / load latest
        const latestProfile = await loadProfile(authUser.id);
        
        // 4. Update local user state
        setUser(prev => prev ? { 
          ...prev, 
          onboardingCompleted: true, 
          interests: interests || prev.interests || [],
          ...latestProfile
        } : null);
        
        console.log('[AuthContext] Onboarding fully synced synchronously and completed.');
      } else {
        // user fallback
        setUser(prev => prev ? { 
          ...prev, 
          onboardingCompleted: true, 
          interests: interests || prev.interests || [] 
        } : null);
      }
    } catch (err) {
      console.error('[AuthContext] Sequential onboarding sync failed:', err);
      // fallback to local update if there is a network glitch
      setUser(prev => prev ? { 
        ...prev, 
        onboardingCompleted: true, 
        interests: interests || prev.interests || [] 
      } : null);
    }
  };

  const saveProgress = async (currentStep: string | null, completedSteps: string[]) => {
    const isSameStep = lastSavedStepRef.current === currentStep;
    const isSameCompleted = lastSavedCompletedStepsRef.current.length === completedSteps.length &&
      completedSteps.every((v, i) => lastSavedCompletedStepsRef.current[i] === v);

    if (isSameStep && isSameCompleted) {
      console.log('[AuthContext] saveProgress - Suppressed duplicate progress update.');
      return;
    }

    // 1. Instantly patch UI locally
    setUser(prev => prev ? { ...prev, interests: completedSteps, currentStep: currentStep || undefined } : null);

    // 2. Save in background
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !authUser.id) return;
        if (!isUuid(authUser.id)) return;
        await ensureProfileExists();

        lastSavedStepRef.current = currentStep;
        lastSavedCompletedStepsRef.current = [...completedSteps];

        await userRepository.saveProgress(authUser.id, { courseId: 'main_course', currentStep, completedSteps });
        console.log('[AuthContext] Progress successfully saved in background:', currentStep);
      } catch (err) {
        console.error('[AuthContext] Error saving progress in background:', err);
      }
    })();
  };

  const saveRecord = async (type: string, payload: any) => {
    if (!user) return;
    try {
      await ensureProfileExists();
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
      bootCompleted,
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
