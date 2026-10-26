# Robots.txt Checker

`robots-checker` downloads a site's `robots.txt`, parses it the way Google does (RFC 9309: user-agent groups, `*` and `$` wildcards, longest-match wins, `allow` wins ties) and answers the question that matters: *can this crawler fetch this URL, and which line decides it?* It also flags the mistakes that quietly cost traffic — `Disallow: /` left over from staging, blocked CSS and JS, HTML served instead of a text file, rules before any `User-agent`, relative sitemap URLs and files over Google's 500 KB limit.

- **[Getting started](Getting-Started)** — install, first run, reading the output
- **[FAQ](FAQ)** — common questions
- **[Troubleshooting](Troubleshooting)** — errors and how to fix them

Prefer a browser? The same check runs online at **[PromoPilot](https://promopilot.link/en/tools/robots-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=robots-checker)** — free, no sign-up.
