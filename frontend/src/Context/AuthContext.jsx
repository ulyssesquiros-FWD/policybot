import React, { createContext, useState, useEffect } from 'react';
import api from '../Services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('policybot_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('policybot_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('policybot_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('policybot_token');
        localStorage.removeItem('policybot_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('policybot_token', res.data.token);
    localStorage.setItem('policybot_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('policybot_token');
    localStorage.removeItem('policybot_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
