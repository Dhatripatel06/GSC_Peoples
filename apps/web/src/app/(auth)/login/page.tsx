'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email')), password: String(form.get('password')) }),
      });
      const body = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(body?.error?.message ?? 'Login failed');
      router.push('/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F5F5F5] px-4 py-10 sm:grid sm:place-items-center">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm border border-[#E5E5E5] bg-white p-6" noValidate>
        <h1 className="text-xl font-semibold text-[#090909]">Sign in</h1>
        <p className="mt-1 text-sm text-[#737373]">GSC Peoples</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="mt-2 h-10 w-full border border-[#E5E5E5] px-3" />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required className="mt-2 h-10 w-full border border-[#E5E5E5] px-3" />
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="mt-6 h-10 w-full bg-[#090909] text-sm font-medium text-white disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in'}</button>
        <a href="/forgot-password" className="mt-4 block text-center text-sm underline">Forgot password</a>
      </form>
    </main>
  );
}
