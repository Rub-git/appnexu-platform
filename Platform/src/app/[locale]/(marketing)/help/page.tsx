import { Link } from '@/i18n/routing';
import Footer from '@/components/Footer';
import { brand } from '@/config/brand';

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEs = locale === 'es';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-medium text-[#178BFF] hover:underline">
          {isEs ? 'Volver al inicio' : 'Back to home'}
        </Link>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {isEs ? 'Centro de Ayuda' : 'Help Center'}
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEs ? 'Como crear tu primera app' : 'How to create your first app'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isEs
                ? 'Ve al panel, pega la URL de tu sitio y deja que Appnexu genere la configuracion base automaticamente.'
                : 'Go to the dashboard, paste your website URL, and let Appnexu generate the base app configuration automatically.'}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEs ? 'Publicacion y dominio' : 'Publishing and domain'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isEs
                ? 'Publica tu app y configura dominio personalizado desde la pantalla de vista previa y configuracion.'
                : 'Publish your app and configure custom domains from the preview and settings screens.'}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800 sm:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEs ? 'No recuerdas tu contrasena' : "Can't remember your password"}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isEs
                ? 'Usa la opcion de restablecer contrasena en la pagina de inicio de sesion para recuperar el acceso.'
                : 'Use the password reset option on the login page to recover access.'}
            </p>
            <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-[#178BFF] hover:underline">
              {isEs ? 'Ir a restablecer contrasena' : 'Go to password reset'}
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800 sm:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEs ? 'Contacto' : 'Contact'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isEs
                ? 'Si necesitas ayuda adicional, escribenos directamente por correo:'
                : 'If you need additional help, contact us directly by email:'}
            </p>
            <a href={`mailto:${brand.supportEmail}`} className="mt-3 inline-block text-sm font-semibold text-[#178BFF] hover:underline">
              {brand.supportEmail}
            </a>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
