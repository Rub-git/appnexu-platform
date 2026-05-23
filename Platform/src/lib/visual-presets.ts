export type VisualPresetSlug =
  | 'moderno'
  | 'profesional'
  | 'minimalista'
  | 'vibrante'
  | 'oscuro'
  | 'corporativo';

export type VisualPreset = {
  slug: VisualPresetSlug;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
  splash: {
    style: 'solid' | 'gradient' | 'soft-glow';
    logoScale: 'sm' | 'md' | 'lg';
  };
  icons: {
    style: 'rounded' | 'duotone' | 'outlined' | 'monochrome';
    cornerRadius: number;
  };
  bottomNavigation: {
    style: 'classic' | 'floating' | 'pill';
    elevated: boolean;
  };
  animations: {
    level: 'none' | 'subtle' | 'soft';
    pageTransitionMs: number;
  };
  ui: {
    cardRadius: 'md' | 'lg' | 'xl';
    borderStyle: 'soft' | 'solid' | 'none';
  };
};

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    slug: 'moderno',
    nameEs: 'Moderno',
    nameEn: 'Modern',
    descriptionEs: 'Balance premium para marcas digitales con look actual.',
    descriptionEn: 'Premium balance for digital brands with a current look.',
    colors: {
      primary: '#178BFF',
      secondary: '#5B2CCF',
      background: '#F7FAFF',
      surface: '#FFFFFF',
      text: '#101828',
    },
    splash: { style: 'gradient', logoScale: 'md' },
    icons: { style: 'rounded', cornerRadius: 26 },
    bottomNavigation: { style: 'floating', elevated: true },
    animations: { level: 'soft', pageTransitionMs: 220 },
    ui: { cardRadius: 'xl', borderStyle: 'soft' },
  },
  {
    slug: 'profesional',
    nameEs: 'Profesional',
    nameEn: 'Professional',
    descriptionEs: 'Enfoque claro y confiable para servicios y expertos.',
    descriptionEn: 'Clear and trusted direction for services and experts.',
    colors: {
      primary: '#1F6FEB',
      secondary: '#0E3A8A',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
    },
    splash: { style: 'solid', logoScale: 'md' },
    icons: { style: 'outlined', cornerRadius: 18 },
    bottomNavigation: { style: 'classic', elevated: false },
    animations: { level: 'subtle', pageTransitionMs: 170 },
    ui: { cardRadius: 'lg', borderStyle: 'solid' },
  },
  {
    slug: 'minimalista',
    nameEs: 'Minimalista',
    nameEn: 'Minimal',
    descriptionEs: 'Interfaz limpia, silenciosa y orientada a contenido.',
    descriptionEn: 'Clean, quiet interface focused on content.',
    colors: {
      primary: '#111827',
      secondary: '#4B5563',
      background: '#FCFCFD',
      surface: '#FFFFFF',
      text: '#111827',
    },
    splash: { style: 'solid', logoScale: 'sm' },
    icons: { style: 'monochrome', cornerRadius: 12 },
    bottomNavigation: { style: 'pill', elevated: false },
    animations: { level: 'none', pageTransitionMs: 120 },
    ui: { cardRadius: 'md', borderStyle: 'none' },
  },
  {
    slug: 'vibrante',
    nameEs: 'Vibrante',
    nameEn: 'Vibrant',
    descriptionEs: 'Alta energia visual para marcas de consumo y eventos.',
    descriptionEn: 'High visual energy for consumer brands and events.',
    colors: {
      primary: '#FF6A00',
      secondary: '#E11D48',
      background: '#FFF8F4',
      surface: '#FFFFFF',
      text: '#1F2937',
    },
    splash: { style: 'gradient', logoScale: 'lg' },
    icons: { style: 'duotone', cornerRadius: 24 },
    bottomNavigation: { style: 'floating', elevated: true },
    animations: { level: 'soft', pageTransitionMs: 260 },
    ui: { cardRadius: 'xl', borderStyle: 'soft' },
  },
  {
    slug: 'oscuro',
    nameEs: 'Oscuro',
    nameEn: 'Dark',
    descriptionEs: 'Experiencia elegante para tecnologia, gaming y medios.',
    descriptionEn: 'Elegant experience for tech, gaming, and media.',
    colors: {
      primary: '#00B4D8',
      secondary: '#3A86FF',
      background: '#090D1F',
      surface: '#101828',
      text: '#F2F4F7',
    },
    splash: { style: 'soft-glow', logoScale: 'md' },
    icons: { style: 'outlined', cornerRadius: 20 },
    bottomNavigation: { style: 'floating', elevated: true },
    animations: { level: 'subtle', pageTransitionMs: 210 },
    ui: { cardRadius: 'lg', borderStyle: 'soft' },
  },
  {
    slug: 'corporativo',
    nameEs: 'Corporativo',
    nameEn: 'Corporate',
    descriptionEs: 'Identidad sobria y robusta para empresas y B2B.',
    descriptionEn: 'Serious and robust identity for enterprise and B2B.',
    colors: {
      primary: '#0B3B6E',
      secondary: '#115E59',
      background: '#F4F7FB',
      surface: '#FFFFFF',
      text: '#0F172A',
    },
    splash: { style: 'solid', logoScale: 'md' },
    icons: { style: 'rounded', cornerRadius: 16 },
    bottomNavigation: { style: 'classic', elevated: false },
    animations: { level: 'subtle', pageTransitionMs: 160 },
    ui: { cardRadius: 'lg', borderStyle: 'solid' },
  },
];

export function getVisualPresetBySlug(slug?: string | null): VisualPreset | null {
  if (!slug) return null;
  return VISUAL_PRESETS.find((preset) => preset.slug === slug) ?? null;
}

export function detectBusinessType(url: string, title?: string): 'services' | 'food' | 'health' | 'education' | 'church' | 'corporate' | 'general' {
  const haystack = `${url} ${title ?? ''}`.toLowerCase();

  if (/(restaurant|food|menu|pizza|cafe|bar|comida|restaurante)/.test(haystack)) return 'food';
  if (/(clinic|medical|salud|doctor|dental|hospital)/.test(haystack)) return 'health';
  if (/(school|academy|course|curso|educacion|college)/.test(haystack)) return 'education';
  if (/(church|iglesia|ministry|pastor)/.test(haystack)) return 'church';
  if (/(enterprise|corporate|b2b|legal|law|finance|finanzas|consulting)/.test(haystack)) return 'corporate';
  if (/(service|servicio|agency|agencia|studio)/.test(haystack)) return 'services';

  return 'general';
}

export function recommendVisualPreset(input: {
  url: string;
  title?: string;
  detectedThemeColor?: string | null;
}): {
  preset: VisualPreset;
  businessType: ReturnType<typeof detectBusinessType>;
  confidence: number;
  rationaleEs: string;
  rationaleEn: string;
} {
  const businessType = detectBusinessType(input.url, input.title);
  const theme = (input.detectedThemeColor || '').toLowerCase();

  let preset = getVisualPresetBySlug('moderno')!;
  let confidence = 0.68;

  if (businessType === 'corporate') {
    preset = getVisualPresetBySlug('corporativo')!;
    confidence = 0.88;
  } else if (businessType === 'services') {
    preset = getVisualPresetBySlug('profesional')!;
    confidence = 0.84;
  } else if (businessType === 'food') {
    preset = getVisualPresetBySlug('vibrante')!;
    confidence = 0.9;
  } else if (businessType === 'health' || businessType === 'education') {
    preset = getVisualPresetBySlug('profesional')!;
    confidence = 0.82;
  } else if (businessType === 'church') {
    preset = getVisualPresetBySlug('minimalista')!;
    confidence = 0.79;
  }

  if (theme.startsWith('#0') || theme.startsWith('#1')) {
    preset = getVisualPresetBySlug('oscuro')!;
    confidence = Math.max(confidence, 0.74);
  }

  return {
    preset,
    businessType,
    confidence,
    rationaleEs: `Detectamos perfil ${businessType} y recomendamos ${preset.nameEs} para mantener coherencia visual sin alterar contenido ni estructura.`,
    rationaleEn: `We detected a ${businessType} profile and recommend ${preset.nameEn} to keep visual coherence without modifying content or structure.`,
  };
}
