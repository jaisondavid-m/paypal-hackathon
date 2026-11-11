import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, businessName?: string) => Promise<void>;
  logout: () => void;
  seedDemoLogin: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('proofrail_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCurrent = true;
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const u = await api.getMe();
        if (isCurrent) {
          setUser(u);
        }
      } catch (err) {
        console.warn('Failed to load user session, logging out', err);
        // Guard against race conditions: only purge if the token in storage still matches the failing request
        if (isCurrent && localStorage.getItem('proofrail_token') === token) {
          localStorage.removeItem('proofrail_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }
    loadUser();
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    localStorage.setItem('proofrail_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string, businessName?: string) => {
    const res = await api.register({ name, email, password: pass, business_name: businessName });
    localStorage.setItem('proofrail_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('proofrail_token');
    setToken(null);
    setUser(null);
  };

  const seedDemoLogin = async (): Promise<string> => {
    const res = await api.seedDemo();
    localStorage.setItem('proofrail_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.transaction_id;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, seedDemoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

