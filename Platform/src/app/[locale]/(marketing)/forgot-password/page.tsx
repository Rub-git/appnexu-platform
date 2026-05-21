'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

type RequestState = {
  sent: boolean;
  message: string;
  resetUrl?: string;
};

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const isEs = locale === 'es';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<RequestState>({ sent: false, message: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || (isEs ? 'No se pudo procesar la solicitud.' : 'Could not process your request.'));
        return;
      }

      setState({
        sent: true,
        message:
          data?.data?.message ||
          (isEs
            ? 'Si el correo existe, te enviaremos instrucciones para restablecer tu contrasena.'
            : 'If the email exists, we will send instructions to reset your password.'),
        resetUrl: data?.data?.resetUrl,
      });
    } catch {
      setError(isEs ? 'Error de red. Intenta de nuevo.' : 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {isEs ? 'Restablecer contrasena' : 'Reset password'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isEs
            ? 'Ingresa tu correo y te guiaremos para crear una nueva contrasena.'
            : 'Enter your email and we will guide you to create a new password.'}
        </p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}

        {state.sent ? (
          <div className="mt-5 space-y-3">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {state.message}
            </p>
            {state.resetUrl && (
              <a href={state.resetUrl} className="inline-flex rounded-xl bg-[#178BFF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                {isEs ? 'Continuar con el enlace de restablecimiento' : 'Continue with reset link'}
              </a>
            )}
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {isEs ? 'Correo electronico' : 'Email address'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-[#178BFF] focus:outline-none focus:ring-2 focus:ring-[#178BFF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isLoading ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar enlace' : 'Send reset link')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-[#178BFF] hover:underline">
            {isEs ? 'Volver a iniciar sesion' : 'Back to login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
