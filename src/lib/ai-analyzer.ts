import 'server-only';

/**
 * AI Website Analyzer
 * Fetches and analyzes a website's HTML to generate intelligent suggestions
 * for app configuration using LLM analysis.
 *
 * Security:  URL is pre-validated by Zod (SSRF blocked in validations.ts).
 * Reliability: 30s overall timeout, 15s fetch timeout, graceful fallback.
 */

import * as cheerio from 'cheerio';
import { logger } from './logger';

// ─── Public types ────────────────────────────────────────────────────

export interface AISuggestions {
  name: string;
  navigation: Array<{ label: string; icon: string; path: string }>;
  colors: { primary: string; secondary: string };
  actions: Array<{ label: string; icon: string; action: string }>;
}

interface ExtractedData {
  title: string;
  description: string;
  headings: string[];
  navLinks: Array<{ text: string; href: string }>;
  themeColor: string | null;
  metaColors: string[];
  logoUrl: string | null;
  links: Array<{ text: string; href: string }>;
}

// ─── Constants ───────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 3_000;  // max time to fetch the website
const LLM_TIMEOUT_MS  = 6_000;  // max time for LLM API call
const MAX_HTML_SIZE    = 2_000_000; // 2 MB – refuse absurdly large pages

// ─── Main entry point ────────────────────────────────────────────────

/**
 * Analyze a website and return AI-powered suggestions.
 * Falls back to heuristic analysis if LLM is unavailable.
 */
export async function analyzeWebsiteWithAI(targetUrl: string): Promise<AISuggestions> {
  // 1. Fetch and parse the website
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Appnexu-AI-Analyzer/1.0 (compatible; bot)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Website returned HTTP ${response.status}`);
    }

    // Guard against huge pages
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_HTML_SIZE) {
      throw new Error('Website response too large');
    }

    html = await response.text();
    if (html.length > MAX_HTML_SIZE) {
      html = html.slice(0, MAX_HTML_SIZE); // truncate to stay safe
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('aborted') || msg.includes('AbortError')) {
      throw new Error('Website took too long to respond (timeout after 15s)');
    }
    throw new Error(`Failed to fetch website: ${msg}`);
  }

  let extracted: ExtractedData;
  try {
    extracted = extractWebsiteData(html, targetUrl);
  } catch (parseErr) {
    logger.warn('ai-analyzer', 'HTML parsing failed, using minimal extraction', {
      error: parseErr instanceof Error ? parseErr.message : 'Unknown',
    });
    // Minimal fallback
    extracted = {
      title: new URL(targetUrl).hostname,
      description: '',
      headings: [],
      navLinks: [],
      themeColor: null,
      metaColors: [],
      logoUrl: null,
      links: [],
    };
  }

  // 2. Try LLM analysis via Abacus.AI
  const abacusApiKey = process.env.ABACUS_API_KEY;
  if (abacusApiKey) {
    try {
      const llmResult = await analyzeWithLLM(extracted, targetUrl, abacusApiKey);
      if (llmResult) return llmResult;
    } catch (error) {
      logger.warn('ai-analyzer', 'LLM analysis failed, falling back to heuristic', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  // 3. Fallback: heuristic analysis
  return heuristicAnalysis(extracted, targetUrl);
}

// ─── HTML extraction ─────────────────────────────────────────────────

function extractWebsiteData(html: string, baseUrl: string): ExtractedData {
  const $ = cheerio.load(html);

  const title =
    $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    (() => { try { return new URL(baseUrl).hostname; } catch { return 'Unknown'; } })();

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100) headings.push(text);
  });

  const navLinks: Array<{ text: string; href: string }> = [];
  $('nav a, header a, [role="navigation"] a').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (text && href && text.length < 50) {
      navLinks.push({ text, href });
    }
  });

  const themeColor = $('meta[name="theme-color"]').attr('content') || null;

  const metaColors: string[] = [];
  if (themeColor) metaColors.push(themeColor);
  const msColor = $('meta[name="msapplication-TileColor"]').attr('content');
  if (msColor) metaColors.push(msColor);

  let logoUrl: string | null = null;
  const logoEl = $('img[class*="logo"], img[id*="logo"], img[alt*="logo"], .logo img, #logo img').first();
  if (logoEl.length) {
    const src = logoEl.attr('src');
    if (src) {
      try { logoUrl = new URL(src, baseUrl).href; } catch { /* ignore */ }
    }
  }

  const links: Array<{ text: string; href: string }> = [];
  $('a').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (text && href && text.length < 50 && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ text, href });
    }
  });

  return { title, description, headings, navLinks, themeColor, metaColors, logoUrl, links };
}

// ─── LLM analysis ────────────────────────────────────────────────────

async function analyzeWithLLM(
  data: ExtractedData,
  targetUrl: string,
  apiKey: string,
): Promise<AISuggestions | null> {
  const prompt = `Analyze this website data and suggest a mobile app configuration.

Website URL: ${targetUrl}
Title: ${data.title}
Description: ${data.description}
Headings: ${data.headings.slice(0, 10).join(', ')}
Navigation Links: ${data.navLinks.slice(0, 15).map(l => `${l.text} (${l.href})`).join(', ')}
Theme Colors: ${data.metaColors.join(', ') || 'none detected'}

Return a JSON object with exactly this structure:
{
  "name": "short app name (max 30 chars)",
  "navigation": [{"label": "...", "icon": "lucide-icon-name", "path": "/..."}],
  "colors": {"primary": "#hex", "secondary": "#hex"},
  "actions": [{"label": "...", "icon": "lucide-icon-name", "action": "..."}]
}

Keep navigation to 4-6 items. Keep actions to 3-4 items.
Use appropriate lucide-react icon names (e.g., home, phone, mail, map-pin, calendar, shopping-cart, etc).
Return ONLY the JSON object, no other text.`;

  try {
    const response = await fetch('https://api.abacus.ai/api/v0/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        deploymentToken: apiKey,
        deploymentId: process.env.ABACUS_DEPLOYMENT_ID || '',
        arguments: { query: prompt },
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn('ai-analyzer', 'Abacus API returned error', { status: response.status });
      return null;
    }

    const result = await response.json();
    const text = result?.result?.response || result?.result || '';

    const jsonMatch = typeof text === 'string' ? text.match(/\{[\s\S]*\}/) : null;
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return sanitizeLLMResult(parsed, data);
    }
    return null;
  } catch (error) {
    logger.warn('ai-analyzer', 'LLM call failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/** Sanitize and validate LLM JSON output */
function sanitizeLLMResult(parsed: Record<string, unknown>, data: ExtractedData): AISuggestions {
  const name =
    typeof parsed.name === 'string' && parsed.name.length <= 60
      ? parsed.name
      : data.title;

  const navigation = Array.isArray(parsed.navigation)
    ? (parsed.navigation as Array<Record<string, unknown>>)
        .filter(n => typeof n.label === 'string' && typeof n.path === 'string')
        .slice(0, 8)
        .map(n => ({
          label: String(n.label).slice(0, 30),
          icon: typeof n.icon === 'string' ? n.icon.slice(0, 30) : 'circle',
          path: String(n.path).slice(0, 200),
        }))
    : [];

  const rawColors = parsed.colors as Record<string, string> | undefined;
  const colors = {
    primary: isValidHex(rawColors?.primary) ? rawColors!.primary : '#178BFF',
    secondary: isValidHex(rawColors?.secondary) ? rawColors!.secondary : '#7C3AED',
  };

  const actions = Array.isArray(parsed.actions)
    ? (parsed.actions as Array<Record<string, unknown>>)
        .filter(a => typeof a.label === 'string')
        .slice(0, 6)
        .map(a => ({
          label: String(a.label).slice(0, 30),
          icon: typeof a.icon === 'string' ? a.icon.slice(0, 30) : 'circle',
          action: typeof a.action === 'string' ? a.action.slice(0, 200) : '',
        }))
    : [];

  return { name, navigation, colors, actions };
}

function isValidHex(val: unknown): val is string {
  return typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val);
}

// ─── Heuristic fallback ──────────────────────────────────────────────

function heuristicAnalysis(data: ExtractedData, targetUrl: string): AISuggestions {
  let hostname: string;
  try { hostname = new URL(targetUrl).hostname.replace('www.', ''); } catch { hostname = 'app'; }

  const name =
    data.title.length > 30 ? data.title.substring(0, 27) + '...' : data.title || hostname;

  const navigation: Array<{ label: string; icon: string; path: string }> = [
    { label: 'Home', icon: 'home', path: '/' },
  ];

  const iconMap: Record<string, string> = {
    about: 'info', contact: 'mail', services: 'briefcase', blog: 'file-text',
    shop: 'shopping-bag', products: 'package', pricing: 'tag', faq: 'help-circle',
    team: 'users', portfolio: 'image', gallery: 'image', news: 'newspaper',
    events: 'calendar', menu: 'utensils', booking: 'calendar', login: 'log-in',
  };

  const seen = new Set<string>(['home']);
  for (const link of data.navLinks.slice(0, 10)) {
    const label = link.text.replace(/\s+/g, ' ').trim();
    const key = label.toLowerCase();
    if (seen.has(key) || label.length > 20 || label.length < 2) continue;
    seen.add(key);

    const icon = iconMap[key] || 'circle';
    let path = link.href;
    try { const url = new URL(link.href, targetUrl); path = url.pathname; } catch { /* keep original */ }

    navigation.push({ label, icon, path });
    if (navigation.length >= 6) break;
  }

  const primary = data.metaColors[0] || '#178BFF';
  const secondary = data.metaColors[1] || adjustColor(primary);

  const actions: Array<{ label: string; icon: string; action: string }> = [];
  const hasPhone = data.links.some(l => l.href.startsWith('tel:'));
  const hasEmail = data.links.some(l => l.href.startsWith('mailto:'));

  if (hasPhone) actions.push({ label: 'Call', icon: 'phone', action: 'tel:' });
  if (hasEmail) actions.push({ label: 'Email', icon: 'mail', action: 'mailto:' });
  actions.push({ label: 'Directions', icon: 'map-pin', action: 'maps:' });
  actions.push({ label: 'Share', icon: 'share-2', action: 'share' });

  return { name, navigation, colors: { primary, secondary }, actions: actions.slice(0, 4) };
}

function adjustColor(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lighten = (c: number) => Math.min(255, c + 40);
    return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`;
  } catch {
    return '#7C3AED';
  }
}
