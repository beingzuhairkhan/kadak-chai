'use client';

import { FormEvent, useState } from 'react';

type Props = { loading: boolean; message: string; onLogin: (username: string, password: string) => void };

export function AdminLogin({ loading, message, onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogin(username, password);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f1e7] p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-[#d8b995] bg-white/80 p-8 shadow-[0_20px_70px_rgba(75,41,27,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[.25em] text-[#915e3a]">Admin access</p>
        <h1 className="mt-3 text-3xl font-black text-[#2b1a12]">Kadak Chai Co.</h1>
        <label className="mt-7 block text-sm font-semibold text-[#4b2d1d]">Username
          <input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3" />
        </label>
        <label className="mt-4 block text-sm font-semibold text-[#4b2d1d]">Password
          <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3" />
        </label>
        <button disabled={loading} className="mt-6 w-full rounded-full bg-[#7a3e2d] px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? 'Please wait…' : 'Login'}</button>
        {message && <p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
      </form>
    </main>
  );
}
