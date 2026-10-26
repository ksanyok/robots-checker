import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobots, isAllowed, lintRobots, checkRobots, patternToRegExp } from '../src/index.js';

const ROBOTS = `# example
User-agent: *
Disallow: /admin/
Allow: /admin/public/
Disallow: /*.pdf$
Disallow: /search
Crawl-delay: 5

User-agent: Googlebot
User-agent: Googlebot-Image
Disallow: /tmp/
Allow: /

Sitemap: https://example.com/sitemap.xml
`;
const codes = (list) => list.map((i) => i.code);
const site = (body, status = 200, type = 'text/plain') => async (url) => {
  const res = new Response(body, { status, headers: { 'content-type': type } });
  Object.defineProperty(res, 'url', { value: url });
  return res;
};

test('parses groups, merged user agents and sitemaps', () => {
  const p = parseRobots(ROBOTS);
  assert.equal(p.groups.length, 2);
  assert.deepEqual(p.groups[1].agents, ['googlebot', 'googlebot-image']);
  assert.deepEqual(p.sitemaps, ['https://example.com/sitemap.xml']);
  assert.equal(p.groups[0].crawlDelay, 5);
});

test('wildcards and end anchors', () => {
  assert.ok(patternToRegExp('/*.pdf$').test('/files/a.pdf'));
  assert.ok(!patternToRegExp('/*.pdf$').test('/files/a.pdf?x=1'));
  assert.ok(patternToRegExp('/search').test('/search?q=1'));
});

test('longest match wins, allow wins ties', () => {
  const p = parseRobots(ROBOTS);
  assert.equal(isAllowed(p, '/admin/settings', 'Mozilla').allowed, false);
  assert.equal(isAllowed(p, '/admin/public/page', 'Mozilla').allowed, true);
  assert.equal(isAllowed(p, '/docs/guide.pdf', 'Mozilla').allowed, false);
  assert.equal(isAllowed(p, 'https://example.com/search?q=x', 'Mozilla').allowed, false);
  const tie = parseRobots('User-agent: *\nDisallow: /page\nAllow: /page');
  assert.equal(isAllowed(tie, '/page', 'x').allowed, true);
});

test('specific user-agent groups replace the * group', () => {
  const p = parseRobots(ROBOTS);
  const g = isAllowed(p, '/admin/settings', 'Mozilla/5.0 (compatible; Googlebot/2.1)');
  assert.equal(g.agent, 'googlebot');
  assert.equal(g.allowed, true);
  assert.equal(isAllowed(p, '/tmp/x', 'Googlebot-Image/1.0').agent, 'googlebot-image');
  assert.equal(isAllowed(p, '/robots.txt', 'x').allowed, true);
});

test('reports syntax problems', () => {
  const p = parseRobots('Disallow: /early\nUser-agent: *\nNoindex: /x\nDisallow: private\nfoo bar\nSitemap: /sitemap.xml');
  const c = codes(p.issues);
  for (const code of ['rule-before-agent', 'unknown-directive', 'path-no-slash', 'malformed-line', 'sitemap-relative']) assert.ok(c.includes(code), code);
});

test('lints SEO mistakes', () => {
  assert.ok(codes(lintRobots(parseRobots('User-agent: *\nDisallow: /'))).includes('blocks-everything'));
  assert.ok(codes(lintRobots(parseRobots('User-agent: Googlebot\nDisallow: /'))).includes('blocks-googlebot'));
  const c = codes(lintRobots(parseRobots('User-agent: *\nDisallow: /assets/')));
  assert.ok(c.includes('blocks-resources'));
  assert.ok(c.includes('no-sitemap'));
});

test('downloads and checks a site', async () => {
  const r = await checkRobots('example.com', { urls: ['/admin/x', '/blog/'], userAgent: 'Bingbot', fetch: site(ROBOTS) });
  assert.equal(r.url, 'https://example.com/robots.txt');
  assert.equal(r.ok, true);
  assert.deepEqual(r.tests.map((t) => t.allowed), [false, true]);
});

test('handles missing, broken and HTML robots.txt', async () => {
  const missing = await checkRobots('https://example.com/page', { urls: ['/x'], fetch: site('nope', 404) });
  assert.ok(codes(missing.issues).includes('not-found'));
  assert.equal(missing.tests[0].allowed, true);
  const down = await checkRobots('example.com', { fetch: site('err', 503) });
  assert.ok(codes(down.issues).includes('server-error'));
  const html = await checkRobots('example.com', { fetch: site('<!doctype html><html></html>', 200, 'text/html') });
  assert.ok(codes(html.issues).includes('html-response'));
  const big = await checkRobots('example.com', { fetch: site(`User-agent: *\n${'Disallow: /x\n'.repeat(50000)}`) });
  assert.ok(codes(big.issues).includes('too-large'));
});
