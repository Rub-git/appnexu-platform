/**
 * Bot detection utility for analytics tracking.
 * Checks user agent and headers for common bot patterns.
 * Privacy-conscious: no fingerprinting, just basic bot filtering.
 */

const BOT_PATTERNS = [
  // Search engine crawlers
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /slurp/i,           // Yahoo
  /sogou/i,
  /exabot/i,
  /facebot/i,         // Facebook
  /facebookexternalhit/i,
  /ia_archiver/i,     // Alexa

  // Social media bots
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,

  // Generic bot patterns
  /bot[\s/;_-]/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /headless/i,
  /puppet/i,
  /phantom/i,
  /selenium/i,
  /webdriver/i,
  /chrome-lighthouse/i,
  /pagespeed/i,

  // Monitoring / uptime
  /uptimerobot/i,
  /pingdom/i,
  /statuscake/i,
  /newrelic/i,
  /datadog/i,

  // CLI tools
  /curl/i,
  /wget/i,
  /httpie/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  /go-http-client/i,
];

/**
 * Detect if a request is from a bot.
 * Returns true if the request appears to be from a bot.
 */
export function isBot(request: Request): boolean {
  const userAgent = request.headers.get('user-agent') || '';

  // No user agent = suspicious
  if (!userAgent || userAgent.length < 10) {
    return true;
  }

  // Check against known bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }

  return false;
}

/**
 * Parse device type from user agent.
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

/**
 * Parse browser name from user agent.
 */
export function getBrowserType(userAgent: string): string {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/opr|opera/i.test(userAgent)) return 'Opera';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/chrome|chromium|crios/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/msie|trident/i.test(userAgent)) return 'IE';
  return 'Other';
}

/**
 * Create a privacy-conscious hash from IP + user agent.
 * Uses a simple hash to detect unique visitors without storing PII.
 */
export function createVisitorHash(ip: string, userAgent: string): string {
  const input = `${ip}|${userAgent}`;
  // Simple djb2 hash - fast and sufficient for uniqueness detection
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}
