'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';

export default function UserProfileForm({
  initialName,
  locale,
}: {
  initialName: string;
  locale: string;
}) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const isEs = locale === 'es';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || (isEs ? 'No se pudo guardar tu perfil' : 'Failed to save profile'));
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEs ? 'Error inesperado' : 'Unexpected error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label htmlFor="profile-name" className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {isEs ? 'Nombre visible' : 'Display name'}
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-[#178BFF] focus:ring-2 focus:ring-[#178BFF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          maxLength={100}
          required
        />
      </div>

      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      {saved ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {isEs ? 'Perfil guardado correctamente.' : 'Profile saved successfully.'}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center rounded-lg bg-[#178BFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1379df] disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {isSaving ? (isEs ? 'Guardando...' : 'Saving...') : isEs ? 'Guardar perfil' : 'Save profile'}
      </button>
    </form>
  );
}
