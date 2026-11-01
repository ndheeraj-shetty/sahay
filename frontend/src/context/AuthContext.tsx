import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  HouseholdBasic,
  HouseholdDetail,
  TokenResponse,
  UserProfile,
} from '../types/auth';
import { authService } from '../services/authService';
import { householdService } from '../services/householdService';

interface AuthContextType {
  user: UserProfile | null;
  activeHousehold: HouseholdDetail | null;
  households: HouseholdBasic[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    household_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchHousehold: (householdId: string) => Promise<void>;
  refreshHousehold: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeHousehold, setActiveHousehold] = useState<HouseholdDetail | null>(null);
  const [households, setHouseholds] = useState<HouseholdBasic[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sahay_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const fetchCurrentUserAndHousehold = async () => {
    try {
      const me = await authService.getMe();
      setUser(me);

      try {
        const currentH = await householdService.getCurrentHousehold();
        setActiveHousehold(currentH);
        localStorage.setItem('sahay_active_household_id', currentH.id);
      } catch (hErr) {
        console.warn('Could not load current household:', hErr);
      }

      const allH = await householdService.listMyHouseholds();
      setHouseholds(
        allH.map((h) => ({
          id: h.id,
          name: h.name,
          role: h.my_role || 'adult',
          is_primary: h.id === activeHousehold?.id,
        }))
      );
    } catch (err) {
      console.warn('Authentication check failed:', err);
      setUser(null);
      setActiveHousehold(null);
      setToken(null);
      localStorage.removeItem('sahay_access_token');
      localStorage.removeItem('sahay_active_household_id');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUserAndHousehold();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const handleAuthSuccess = (data: TokenResponse) => {
    localStorage.setItem('sahay_access_token', data.access_token);
    localStorage.setItem('sahay_refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser(data.user);
    setHouseholds(data.households);
    if (data.primary_household) {
      localStorage.setItem('sahay_active_household_id', data.primary_household.id);
    }
    setIsAuthModalOpen(false);
    // Refresh household details
    householdService.getCurrentHousehold().then(setActiveHousehold).catch(console.error);
  };

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    handleAuthSuccess(data);
  };

  const register = async (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    household_name?: string;
  }) => {
    const data = await authService.register(payload);
    handleAuthSuccess(data);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setActiveHousehold(null);
    setHouseholds([]);
    setToken(null);
  };

  const switchHousehold = async (householdId: string) => {
    localStorage.setItem('sahay_active_household_id', householdId);
    try {
      const h = await householdService.getCurrentHousehold();
      setActiveHousehold(h);
    } catch (err) {
      console.error('Failed to switch household:', err);
    }
  };

  const refreshHousehold = async () => {
    if (!token) return;
    try {
      const h = await householdService.getCurrentHousehold();
      setActiveHousehold(h);
    } catch (err) {
      console.error('Failed to refresh household:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeHousehold,
        households,
        token,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        logout,
        switchHousehold,
        refreshHousehold,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
