import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, clearTokens, getAccessToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
    }

    window.addEventListener('daymark:session-expired', handleSessionExpired);
    return () => window.removeEventListener('daymark:session-expired', handleSessionExpired);
  }, []);

  async function login(email, password) {
    const currentUser = await authApi.login(email, password);
    setUser(currentUser);
  }

  async function register(email, password) {
    await authApi.register(email, password);
    await login(email, password);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
