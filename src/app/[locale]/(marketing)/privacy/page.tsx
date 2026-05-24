import { Link } from '@/i18n/routing';
import Footer from '@/components/Footer';
import { brand } from '@/config/brand';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEs = locale === 'es';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-medium text-[#178BFF] hover:underline">
          {isEs ? 'Volver al inicio' : 'Back to home'}
        </Link>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {isEs ? 'Politica de Privacidad' : 'Privacy Policy'}
        </h1>

        <div className="mt-8 space-y-6 rounded-2xl bg-white p-8 text-gray-700 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800">
          <p>
            {isEs
              ? 'En Appnexu respetamos tu privacidad. Solo recopilamos los datos necesarios para crear, publicar y mantener tus apps.'
              : 'At Appnexu we respect your privacy. We only collect the data needed to create, publish, and maintain your apps.'}
          </p>
          <p>
            {isEs
              ? 'Usamos tu correo para autenticacion, seguridad de cuenta y comunicacion de soporte. No vendemos datos personales a terceros.'
              : 'We use your email for authentication, account security, and support communication. We do not sell personal data to third parties.'}
          </p>
          <p>
            {isEs
              ? `Puedes solicitar la eliminacion de tu cuenta y datos escribiendo a ${brand.supportEmail}.`
              : `You can request deletion of your account and data by contacting ${brand.supportEmail}.`}
          </p>
          <p>
            <a href={`mailto:${brand.supportEmail}`} className="font-medium text-[#178BFF] hover:underline">
              {brand.supportEmail}
            </a>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEs ? 'Ultima actualizacion: mayo 2026' : 'Last updated: May 2026'}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
