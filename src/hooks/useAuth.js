'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'polaria_user';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsReady(true);
  }, []);

  const login = (email, password) => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return { success: false, error: 'Completa todos los campos.' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { success: false, error: 'Ingresa un correo válido.' };
    }

    const userData = {
      email: trimmedEmail,
      name: trimmedEmail.split('@')[0].charAt(0).toUpperCase() + trimmedEmail.split('@')[0].slice(1),
      role: 'Administrador',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return {
    user,
    isReady,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
