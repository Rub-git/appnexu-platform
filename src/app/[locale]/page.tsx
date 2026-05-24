import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowRight, Bot, Smartphone, Sparkles, Wand2, Rocket, CheckCircle2 } from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEs = locale === 'es';

  const copy = {
    heroTitle: isEs ? 'Transforma tu website en una app instalable' : 'Turn your website into an installable app',
    heroSubtitle: isEs
      ? 'Crea PWAs modernas con IA, sin código y sin App Store.'
      : 'Build modern PWAs with AI, no code, and no App Store.',
    heroCta: isEs ? 'Crear mi app ahora' : 'Create my app now',
    heroSecondary: isEs ? 'Ver cómo funciona' : 'See how it works',
    howTitle: isEs ? 'Cómo funciona en 3 pasos' : 'How it works in 3 steps',
    wowTitle: isEs ? 'La forma más simple de convertir cualquier website en una app instalable' : 'The simplest way to convert any website into an installable app',
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#c8f2ff_0%,#fff8e5_35%,#ffffff_70%)] text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo size={96} variant="icon" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/login" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {isEs ? 'Entrar' : 'Login'}
            </Link>
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:shadow-xl">
              {isEs ? 'Empieza gratis' : 'Start free'}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="absolute left-[-100px] top-[40%] h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-semibold text-cyan-700">
                <Sparkles className="h-3.5 w-3.5" />
                {isEs ? 'AI-powered PWA Builder' : 'AI-powered PWA Builder'}
              </div>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                {copy.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">{copy.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:translate-y-[-1px]">
                  {copy.heroCta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a href="#how" className="rounded-full border border-slate-300 px-7 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
                  {copy.heroSecondary}
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-xs text-cyan-300">appnexu flow</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="rounded-lg bg-slate-800 p-3">1. URL</div>
                  <div className="rounded-lg bg-slate-800 p-3">2. IA analiza branding y PWA</div>
                  <div className="rounded-lg bg-slate-800 p-3">3. Publica y comparte en minutos</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-slate-600">
                <div className="rounded-xl bg-cyan-50 p-3"><p className="text-lg font-bold text-cyan-700">5m</p>setup</div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-lg font-bold text-emerald-700">No-code</p>builder</div>
                <div className="rounded-xl bg-amber-50 p-3"><p className="text-lg font-bold text-amber-700">Real</p>install</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>{copy.howTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <Wand2 className="h-6 w-6 text-cyan-600" />
            <h3 className="mt-4 text-lg font-semibold">{isEs ? 'Generator + Import inteligente' : 'Smart Generator + Import'}</h3>
            <p className="mt-2 text-sm text-slate-600">{isEs ? 'Detecta automáticamente el mejor modo para convertir tu sitio a PWA.' : 'Automatically chooses the best mode to convert your site into a PWA.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <Bot className="h-6 w-6 text-blue-600" />
            <h3 className="mt-4 text-lg font-semibold">{isEs ? 'IA automática' : 'Automatic AI setup'}</h3>
            <p className="mt-2 text-sm text-slate-600">{isEs ? 'Analiza contenido, colores y estructura para generar una app lista para publicar.' : 'Analyzes content, colors, and structure to generate an app ready to publish.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <Smartphone className="h-6 w-6 text-emerald-600" />
            <h3 className="mt-4 text-lg font-semibold">{isEs ? 'Instalación real en móvil' : 'Real mobile install'}</h3>
            <p className="mt-2 text-sm text-slate-600">{isEs ? 'Tu app queda instalable desde navegador con flujo guiado y QR.' : 'Your app becomes installable from browser with guided flow and QR.'}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white">
          <h3 className="text-2xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>{copy.wowTitle}</h3>
          <p className="mt-3 max-w-2xl text-slate-300">{isEs ? 'Desde la primera URL hasta la publicación, Appnexu está diseñada para vender y escalar como producto SaaS.' : 'From first URL to publish, Appnexu is designed to sell and scale like a real SaaS product.'}</p>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>{isEs ? 'Planes simples para crecer' : 'Simple plans to grow'}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-500">Starter</p>
            <p className="mt-1 text-3xl font-bold">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />1 app</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Branding básico</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-cyan-500 bg-white p-6 shadow-lg shadow-cyan-100">
            <p className="text-sm font-semibold text-cyan-600">Pro</p>
            <p className="mt-1 text-3xl font-bold">$19</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Múltiples apps</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Dominio personalizado</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Branding premium</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-500">Business</p>
            <p className="mt-1 text-3xl font-bold">$49</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Apps ilimitadas</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Analytics básico</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Export features futuras</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>FAQ</h2>
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-semibold">{isEs ? '¿Necesito saber programar?' : 'Do I need to code?'}</p>
            <p className="mt-2 text-sm text-slate-600">{isEs ? 'No. Appnexu está orientado a negocio y operación no-code.' : 'No. Appnexu is focused on business teams and no-code operation.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-semibold">{isEs ? '¿Se instala de verdad en móvil?' : 'Is it truly installable on mobile?'}</p>
            <p className="mt-2 text-sm text-slate-600">{isEs ? 'Sí, con flujo guiado para Android, iOS y desktop.' : 'Yes, with a guided flow for Android, iOS, and desktop.'}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-center text-white shadow-xl shadow-cyan-200">
          <Rocket className="mx-auto h-7 w-7" />
          <h3 className="mt-3 text-2xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>{isEs ? 'Tu próxima app puede estar lista hoy' : 'Your next app can be ready today'}</h3>
          <p className="mt-2 text-cyan-50">{isEs ? 'Crea, publica y comparte en minutos con Appnexu.' : 'Create, publish, and share in minutes with Appnexu.'}</p>
          <Link href="/signup" className="mt-6 inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
            {isEs ? 'Comenzar gratis' : 'Start for free'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
