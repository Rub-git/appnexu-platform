import { Link } from '@/i18n/routing';
import Footer from '@/components/Footer';
import { brand } from '@/config/brand';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEs = locale === 'es';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-medium text-[#178BFF] hover:underline">
          {isEs ? 'Volver al inicio' : 'Back to home'}
        </Link>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {isEs ? 'Terminos de Servicio' : 'Terms of Service'}
        </h1>

        <div className="mt-8 space-y-6 rounded-2xl bg-white p-8 text-gray-700 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800">
          <p>
            {isEs
              ? 'Al usar Appnexu aceptas utilizar la plataforma de forma legal y responsable. Eres responsable del contenido y configuracion de las apps que publiques.'
              : 'By using Appnexu you agree to use the platform lawfully and responsibly. You are responsible for the content and configuration of apps you publish.'}
          </p>
          <p>
            {isEs
              ? 'Podemos actualizar funciones, limites y precios para mejorar el servicio. Cuando sea posible, notificaremos cambios relevantes con anticipacion.'
              : 'We may update features, limits, and pricing to improve the service. When possible, we will notify relevant changes in advance.'}
          </p>
          <p>
            {isEs
              ? 'Nos reservamos el derecho de suspender cuentas con uso abusivo, fraude o violacion de estos terminos.'
              : 'We reserve the right to suspend accounts for abuse, fraud, or violations of these terms.'}
          </p>
          <p>
            {isEs ? 'Contacto legal y soporte:' : 'Legal and support contact:'}{' '}
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
