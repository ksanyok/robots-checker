const KNOWN = new Set(['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host', 'clean-param']);

/**
 * Parse robots.txt following RFC 9309 (the Robots Exclusion Protocol as Google implements it).
 * @param {string} text
 * @returns {{groups: {agents: string[], rules: {type: 'allow'|'disallow', path: string, line: number}[], crawlDelay?: number}[], sitemaps: string[], issues: object[]}}
 */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  const issues = [];
  const add = (level, code, message, line) => issues.push({ level, code, message, line });
  let current = null;
  let lastWasAgent = false;
  String(text).replace(/^﻿/, '').split(/\r\n|\r|\n/).forEach((raw, i) => {
    const line = i + 1;
    const content = raw.replace(/#.*$/, '').trim();
    if (!content) return;
    const colon = content.indexOf(':');
    if (colon < 1) { add('warning', 'malformed-line', `Line ${line}: "${content}" is not a "field: value" pair and is ignored.`, line); return; }
    const field = content.slice(0, colon).trim().toLowerCase();
    const value = content.slice(colon + 1).trim();
    if (!KNOWN.has(field)) { add('warning', 'unknown-directive', `Line ${line}: unknown directive "${field}" is ignored by most crawlers.`, line); return; }
    if (field === 'sitemap') {
      if (!/^https?:\/\//i.test(value)) add('error', 'sitemap-relative', `Line ${line}: Sitemap must be an absolute URL, got "${value}".`, line);
      sitemaps.push(value);
      return;
    }
    if (field === 'user-agent') {
      if (!lastWasAgent || !current) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    if (!current) { add('error', 'rule-before-agent', `Line ${line}: "${field}" appears before any User-agent line and is ignored.`, line); return; }
    if (field === 'crawl-delay') {
      current.crawlDelay = Number(value);
      add('info', 'crawl-delay', `Line ${line}: Crawl-delay is ignored by Googlebot (Bing and Yandex respect it).`, line);
    } else if (field === 'host' || field === 'clean-param') {
      add('info', 'yandex-only', `Line ${line}: "${field}" is only understood by Yandex.`, line);
    } else {
      if (value && !value.startsWith('/') && !value.startsWith('*')) add('warning', 'path-no-slash', `Line ${line}: path "${value}" should start with "/".`, line);
      current.rules.push({ type: field, path: value, line });
    }
  });
  return { groups, sitemaps, issues };
}

/** Convert a robots.txt path pattern to a RegExp (supports * and a trailing $). */
export function patternToRegExp(path) {
  const anchored = path.endsWith('$');
  const body = (anchored ? path.slice(0, -1) : path).split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

function normalisePath(url) {
  try {
    const u = new URL(url, 'http://robots.invalid');
    return u.pathname + u.search;
  } catch { return url; }
}

/** Pick the rules that apply to a user agent: the longest matching product token, else "*". */
export function groupFor(parsed, userAgent) {
  const ua = userAgent.toLowerCase();
  const token = parsed.groups.flatMap((g) => g.agents).filter((a) => a !== '*' && ua.includes(a)).sort((a, b) => b.length - a.length)[0];
  const agent = token || (parsed.groups.some((g) => g.agents.includes('*')) ? '*' : null);
  return { agent, rules: parsed.groups.filter((g) => g.agents.includes(agent)).flatMap((g) => g.rules) };
}

/**
 * Decide whether a URL may be crawled: the longest matching rule wins, allow wins ties.
 * @returns {{allowed: boolean, rule: object|null, agent: string|null}}
 */
export function isAllowed(parsed, url, userAgent = '*') {
  const path = normalisePath(url);
  if (path === '/robots.txt') return { allowed: true, rule: null, agent: null };
  const { agent, rules } = groupFor(parsed, userAgent);
  let match = null;
  for (const r of rules) {
    if (r.path === '') continue;
    if (!patternToRegExp(r.path).test(path)) continue;
    const len = r.path.length;
    if (!match || len > match.path.length || (len === match.path.length && r.type === 'allow')) match = r;
  }
  return { allowed: !match || match.type === 'allow', rule: match, agent };
}
