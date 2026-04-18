import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Zap, Code, Download, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-gray-800 dark:bg-black/80">
        <div className="mx-auto flex h-48 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo size={168} variant="icon" />
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              {t('nav.login')}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-lg hover:shadow-[#178BFF]/25 focus:outline-none focus:ring-2 focus:ring-[#178BFF] focus:ring-offset-2 dark:focus:ring-offset-black"
            >
              {t('nav.signUp')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#178BFF]/20 via-[#5B2CCF]/10 to-transparent blur-3xl" />
          <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-gradient-to-l from-[#F54291]/10 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#178BFF]/20 bg-[#178BFF]/5 px-4 py-1.5 text-sm font-medium text-[#178BFF]">
            <Sparkles size={14} />
            {t('common.tagline')}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
            {t('landing.hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-400">
            {t('landing.hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex items-center rounded-full bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#178BFF]/25 transition-all hover:shadow-xl hover:shadow-[#178BFF]/30 focus:outline-none focus:ring-2 focus:ring-[#178BFF] focus:ring-offset-2"
            >
              {t('landing.hero.cta')}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              {t('landing.hero.demo')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
          {t('landing.features.title')}
        </h2>
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#178BFF]/10 to-[#5B2CCF]/10 text-[#178BFF]">
              <Zap size={24} />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('landing.features.fast.title')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('landing.features.fast.description')}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B2CCF]/10 to-[#F54291]/10 text-[#5B2CCF]">
              <Code size={24} />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('landing.features.easy.title')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('landing.features.easy.description')}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F54291]/10 to-[#FF9F1C]/10 text-[#F54291]">
              <Download size={24} />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('landing.features.install.title')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('landing.features.install.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
