'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function ResetPasswordClient({ token }: { token: string }) {
  const locale = useLocale();
  const isEs = locale === 'es';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(isEs ? 'La contrasena debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError(isEs ? 'Las contrasenas no coinciden.' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || (isEs ? 'No se pudo restablecer la contrasena.' : 'Could not reset password.'));
        return;
      }

      setDone(true);
    } catch {
      setError(isEs ? 'Error de red. Intenta de nuevo.' : 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-black">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
            {isEs ? 'Enlace no valido' : 'Invalid link'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isEs ? 'Este enlace de restablecimiento no es valido o esta incompleto.' : 'This reset link is invalid or incomplete.'}
          </p>
          <Link href="/forgot-password" className="mt-5 inline-block font-medium text-[#178BFF] hover:underline">
            {isEs ? 'Solicitar un nuevo enlace' : 'Request a new link'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {isEs ? 'Crear nueva contrasena' : 'Create new password'}
        </h1>

        {done ? (
          <div className="mt-5 space-y-3">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {isEs ? 'Tu contrasena fue actualizada correctamente.' : 'Your password was updated successfully.'}
            </p>
            <Link href="/login" className="inline-flex rounded-xl bg-[#178BFF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              {isEs ? 'Iniciar sesion' : 'Sign in'}
            </Link>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {isEs ? 'Nueva contrasena' : 'New password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-[#178BFF] focus:outline-none focus:ring-2 focus:ring-[#178BFF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {isEs ? 'Confirmar contrasena' : 'Confirm password'}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-[#178BFF] focus:outline-none focus:ring-2 focus:ring-[#178BFF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isLoading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar contrasena' : 'Update password')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}