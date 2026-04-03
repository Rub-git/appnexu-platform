
'use client';
import {
  Download,
  Loader2, Crown, Globe, Church, Utensils, HeartPulse,
  ShoppingBag, GraduationCap, Calendar, ArrowRight, X, Eye,
  Filter, Sparkles, LayoutTemplate,
} from 'lucide-react'

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  previewImage: string | null;
  configJson: {
    navigation: Array<{ label: string; icon: string; path: string }>;
    quickActions: Array<{ label: string; icon: string; action: string }>;
    colorScheme: { primary: string; secondary: string };
    iconSuggestions: string[];
    pageShortcuts: string[];
  };
  isPremium: boolean;
  usageCount: number;
}

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'BUSINESS', label: 'Business' },
  { key: 'CHURCH', label: 'Church' },
  { key: 'FOOD', label: 'Food' },
  { key: 'HEALTH', label: 'Health' },
  { key: 'EDUCATION', label: 'Education' },
  { key: 'SERVICES', label: 'Services' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  BUSINESS: <Globe className="h-4 w-4" />,
  CHURCH: <Church className="h-4 w-4" />,
  FOOD: <Utensils className="h-4 w-4" />,
  HEALTH: <HeartPulse className="h-4 w-4" />,
  EDUCATION: <GraduationCap className="h-4 w-4" />,
  SERVICES: <Calendar className="h-4 w-4" />,
};

const categoryColors = {
  BUSINESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CHURCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  FOOD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HEALTH: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  EDUCATION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SERVICES: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
export default function TemplatesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  useEffect(() => {
    const params = activeCategory !== 'ALL' ? `?category=${activeCategory}` : '';
    fetch(`/api/templates${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.data) setTemplates(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, 
[activeCategory]);

 const handleUseTemplate = (template) => {
  if (template.isPremium) return;

  sessionStorage.setItem('selectedTemplate', JSON.stringify(template));
}, 

export default function TemplatesPage() {

  // hooks, estado, etc
  const [previewTemplate, setPreviewTemplate] = useState(null)

  const config =
    typeof previewTemplate?.configJson === 'string'
      ? JSON.parse(previewTemplate.configJson)
      : previewTemplate?.configJson || {}

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#178BFF] via-[#5B2CCF] to-[#F54291] px-6 py-16 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold">
            {t('templates.title')}
          </h1>
          <p className="mt-4 text-lg text-white/80">
            {t('templates.subtitle')}
          </p>
        </div>
      </div>
    </>
  )
}

    {/* Category Filters */}
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Filter className="mr-2 h-4 w-4 text-gray-400" />

        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key)
              setLoading(true)
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {t('templates.categories.' + cat.key)}
          </button>
        ))}
      </div>
    </div>
  </>
)
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#178BFF]" />
          </div>
        )}

        {/* Template Grid */}
        {!loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => {
  const config =
    typeof template?.configJson === "string"
      ? JSON.parse(template.configJson)
      : template?.configJson || {};

  return (
    <div key={template.id}>
      {/* usa config aqui */}
    </div>
  );
})}
                key={template.id}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-lg hover:ring-[#178BFF]/30 dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-[#178BFF]/40"
              >
                {/* Color Preview Header */}
                <div
                  className="relative h-32 w-full"
                  style={{
                    background: `linear-gradient(135deg, ${
  template.configJson?.colorScheme?.primary || '#178BFF'
}, ${
  template.configJson?.colorScheme?.secondary || '#5B2CCF'
})`
                  }}
                >
                  {template.isPremium && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-amber-900">
                      <Crown className="h-3 w-3" /> {t('templates.premiumBadge')}
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-1">
                 template?.configJson?.navigation?.slice(0, 4)
  <div key={i} className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-medium">
    {nav.label}
    <span className="ml-1.5 text-xs text-gray-400">{nav.path}</span>
  </div>
))}
                {/* Content */}
                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[template.category] || 'bg-gray-100 text-gray-600'}`}>
                      {categoryIcons[template.category]}
                      {template.category}
                    </span>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      {t('templates.preview')}
                    </button>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-3 py-2 text-sm font-medium text-white transition-all hover:shadow-md hover:shadow-[#178BFF]/25"
                    >
                      {t('templates.useTemplate')}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            
                 
        {!loading && templates.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            {t('templates.noTemplates')}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header with gradient */}
            <div
              className="mb-6 rounded-2xl p-6"
   style={{
  background: `linear-gradient(
    135deg,
    ${template?.configJson?.colorScheme?.primary || '#178BFF'},
    ${template?.configJson?.colorScheme?.secondary || '#5B2CCF'}
  )`
}}
            >
              <div className="flex items-center gap-2 mb-2">
                {previewTemplate.isPremium && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                    <Crown className="h-3 w-3" /> {t('templates.premiumBadge')}
                  </span>
                )}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                  {previewTemplate.category}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>{previewTemplate.name}</h2>
              <p className="mt-1 text-white/80">{previewTemplate.description}</p>
            </div>

            {/* Navigation Preview */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('templates.modal.navigation')}
              </h4>
              <div className="flex flex-wrap gap-2">
             {(previewTemplate?.configJson?.navigation || []).map((nav, i) => (
  <span
    key={i}
    className="inline-flex items-center rounded-xl bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  >
    {nav.label}
    <span className="ml-1.5 text-xs text-gray-400">
      {nav.path}
    </span>
  </span>
))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('templates.modal.quickActions')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(previewTemplate.configJson?.quickActions || []).map((action, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.action}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Scheme */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('templates.modal.colorScheme')}
              </h4>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl border" style={{
  backgroundColor:
    JSON.parse(previewTemplate?.configJson || '{}')?.colorScheme?.primary || "#178BFF"
}}
></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('templates.modal.primary')}: {previewTemplate?.configJson as any)?.colorScheme?.primary || '#178BFF'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl border" style={{
  backgroundColor:
    JSON.parse(previewTemplate?.configJson || '{}')?.colorScheme?.secondary || "#178BFF"
}}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('templates.modal.secondary')}: {previewTemplate?.configJson as any)?.colorScheme?.secondary || '#5B2CCF'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                handleUseTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}
              className="w-full rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:shadow-md hover:shadow-[#178BFF]/25"
            >
              <Sparkles className="mr-2 inline h-4 w-4" />
              {t('templates.useTemplate')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
