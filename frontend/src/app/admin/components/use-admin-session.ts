'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

export function useAdminSession() {
  const [state, setState] = useState<SessionState>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.resolve()
      .then(() => apiFetch('/api/v1/auth/me'))
      .then(() => setState('signed-in'))
      .catch(() => setState('signed-out'));
  }, []);

  async function login(username: string, password: string) {
    setError('');
    try {
      await apiFetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setState('signed-in');
    } catch {
      setError('Invalid credentials');
    }
  }

  async function logout() {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setState('signed-out');
    }
  }

  return { state, error, login, logout };
}
