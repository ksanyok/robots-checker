# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-26

### Added
- `robots-checker` CLI: test URLs with `--url` as any user agent (`--ua`), analyse local files with `--file`, `--json`, `--strict`
- RFC 9309 parser: grouped user agents, comments, BOM, Allow/Disallow, Sitemap, Crawl-delay, Yandex directives
- Google-compatible matching: most specific user-agent group, `*` and `$` wildcards, longest match, allow wins ties
- SEO lints: blocks everything, blocks Googlebot, blocked CSS/JS, missing sitemap, unknown directives, rules before User-agent
- HTTP checks: 4xx (allow all), 5xx (disallow all), HTML soft 404, content type, 500 KB limit, cross-origin redirect
- Library API (`checkRobots`, `parseRobots`, `isAllowed`, `lintRobots`) with injectable fetch, and GitHub Action

[1.0.0]: https://github.com/ksanyok/robots-checker/releases/tag/v1.0.0
