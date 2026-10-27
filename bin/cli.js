#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { checkRobots, parseRobots, lintRobots, isAllowed } from '../src/index.js';

const HELP = `Usage: robots-checker <site> [options]
       robots-checker --file robots.txt --url /private/page

Downloads <site>/robots.txt, validates it, flags SEO mistakes and tests
whether URLs may be crawled by a given user agent (RFC 9309 matching).

Options:
  -u, --url <path>   URL or path to test (repeatable)
  -a, --ua <agent>   User agent to test as (default: Googlebot)
  --file <path>      Analyse a local robots.txt instead of downloading one
  --json             Print the full report as JSON
  --strict           Exit with code 1 on warnings too
  -h, --help         Show this help

Online version (no install): https://promopilot.link/en/tools/robots-checker.php?utm_source=github&utm_medium=cli&utm_campaign=tools&utm_content=robots-checker
`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
if (!args.length || flag('-h') || flag('--help')) { process.stdout.write(HELP); process.exit(args.length ? 0 : 2); }

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const ICON = { error: c(31, '✖'), warning: c(33, '!'), info: c(36, 'i') };

const urls = [];
let ua = 'Googlebot';
let file;
let site;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-u' || a === '--url') urls.push(args[++i]);
  else if (a === '-a' || a === '--ua') ua = args[++i];
  else if (a === '--file') file = args[++i];
  else if (!a.startsWith('-')) site = a;
}

try {
  let report;
  if (file) {
    const parsed = parseRobots(readFileSync(file, 'utf8'));
    const issues = lintRobots(parsed);
    report = { file, groups: parsed.groups, sitemaps: parsed.sitemaps, tests: urls.map((u) => ({ url: u, ...isAllowed(parsed, u, ua), userAgent: ua })), issues, ok: !issues.some((i) => i.level === 'error') };
  } else {
    report = await checkRobots(site, { urls, userAgent: ua });
  }
  if (flag('--json')) {
    const { text, ...rest } = report;
    console.log(JSON.stringify(rest, null, 2));
  } else {
    console.log(`${c(1, 'robots.txt:')} ${report.file || report.url}${report.status ? `  (HTTP ${report.status}, ${report.bytes} bytes)` : ''}`);
    console.log(`${c(1, 'Groups:')}     ${report.groups.map((g) => g.agents.join(', ')).join(' | ') || '(none)'}`);
    console.log(`${c(1, 'Sitemaps:')}   ${report.sitemaps.join(', ') || '(none)'}`);
    if (report.tests.length) {
      console.log('');
      for (const t of report.tests) {
        const verdict = t.allowed ? c(32, '✔ allowed') : c(31, '✖ blocked');
        const why = t.rule ? `${t.rule.type}: ${t.rule.path} (line ${t.rule.line})` : 'no matching rule';
        console.log(`  ${verdict}  ${t.url}  ${c(2, `[${t.userAgent} → ${t.agent ?? 'no group'}; ${why}]`)}`);
      }
    }
    console.log('');
    if (!report.issues.length) console.log(c(32, '✔ robots.txt looks good'));
    for (const i of report.issues) console.log(`  ${ICON[i.level]} ${i.message}`);
  }
  const failing = report.issues.filter((i) => i.level === 'error' || (flag('--strict') && i.level === 'warning'));
  process.exit(failing.length ? 1 : 0);
} catch (err) {
  console.error(c(31, `Error: ${err.message}`));
  process.exit(2);
}
