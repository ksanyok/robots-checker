import { parseRobots, isAllowed, groupFor, patternToRegExp } from './parse.js';

export { parseRobots, isAllowed, groupFor, patternToRegExp } from './parse.js';

const MAX_BYTES = 500 * 1024;

function siteRoot(input) {
  const s = String(input || '').trim();
  if (!s) throw new TypeError('A site URL or domain is required');
  return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).origin;
}

/** Lint a parsed robots.txt for SEO mistakes. */
export function lintRobots(parsed) {
  const out = [...parsed.issues];
  const add = (level, code, message) => out.push({ level, code, message });
  const star = groupFor(parsed, '*');
  if (!parsed.groups.length) add('info', 'no-groups', 'No User-agent groups: everything may be crawled.');
  if (star.rules.some((r) => r.type === 'disallow' && r.path === '/') && !star.rules.some((r) => r.type === 'allow' && r.path.length > 1)) {
    add('error', 'blocks-everything', 'User-agent: * is disallowed from the whole site ("Disallow: /"). Nothing will be crawled.');
  }
  const google = isAllowed(parsed, '/', 'Googlebot');
  if (!google.allowed && google.agent !== '*') add('error', 'blocks-googlebot', `Googlebot is blocked from the home page by line ${google.rule.line}.`);
  for (const probe of ['/assets/app.js', '/static/style.css', '/wp-includes/js/jquery.js', '/_next/static/chunk.js']) {
    const r = isAllowed(parsed, probe, 'Googlebot');
    if (!r.allowed) { add('warning', 'blocks-resources', `CSS/JS under ${probe.split('/').slice(0, 2).join('/')}/ is blocked (line ${r.rule.line}); Google needs it to render pages.`); break; }
  }
  if (!parsed.sitemaps.length) add('info', 'no-sitemap', 'No Sitemap: line. Listing your sitemap helps every crawler find it.');
  return out;
}

/**
 * Download and analyse a site's robots.txt, optionally testing URLs.
 * @param {string} site domain or URL
 * @param {{urls?: string[], userAgent?: string, fetch?: typeof fetch}} [options]
 */
export async function checkRobots(site, options = {}) {
  const doFetch = options.fetch || globalThis.fetch;
  const origin = siteRoot(site);
  const url = `${origin}/robots.txt`;
  const userAgent = options.userAgent || 'Googlebot';
  const issues = [];
  const res = await doFetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; robots-checker; +https://github.com/ksanyok/robots-checker)' } });
  const report = { url, finalUrl: res.url || url, status: res.status, bytes: 0, groups: [], sitemaps: [], tests: [], issues };
  if (res.status >= 500) {
    issues.push({ level: 'error', code: 'server-error', message: `robots.txt returned HTTP ${res.status}. Google treats this as "disallow everything" until it recovers.` });
    return { ...report, ok: false };
  }
  if (res.status >= 400) {
    issues.push({ level: 'warning', code: 'not-found', message: `robots.txt returned HTTP ${res.status}: crawlers assume everything may be crawled.` });
    const parsed = parseRobots('');
    report.tests = (options.urls || []).map((u) => ({ url: u, ...isAllowed(parsed, u, userAgent), userAgent }));
    return { ...report, ok: true };
  }
  const text = await res.text();
  report.bytes = Buffer.byteLength(text);
  const type = res.headers.get('content-type') || '';
  if (/html/i.test(type) || /^\s*<(!doctype|html)/i.test(text)) issues.push({ level: 'error', code: 'html-response', message: 'robots.txt is served as an HTML page (a soft 404 or a redirect to the home page).' });
  else if (type && !/text\/plain/i.test(type)) issues.push({ level: 'warning', code: 'content-type', message: `robots.txt is served as "${type}", expected text/plain.` });
  if (report.bytes > MAX_BYTES) issues.push({ level: 'error', code: 'too-large', message: `robots.txt is ${Math.round(report.bytes / 1024)} KB; Google ignores everything after 500 KB.` });
  if (report.finalUrl !== url && new URL(report.finalUrl).origin !== origin) issues.push({ level: 'info', code: 'redirected', message: `robots.txt redirects to ${report.finalUrl}.` });
  const parsed = parseRobots(text);
  issues.push(...lintRobots(parsed));
  report.groups = parsed.groups;
  report.sitemaps = parsed.sitemaps;
  report.text = text;
  report.tests = (options.urls || []).map((u) => ({ url: u, ...isAllowed(parsed, u, userAgent), userAgent }));
  return { ...report, ok: !issues.some((i) => i.level === 'error') };
}
