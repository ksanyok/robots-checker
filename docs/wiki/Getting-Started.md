# Getting started

## Requirements

Node.js 18 or newer. No other dependencies.

## Install

```bash
# one-off run
npx github:ksanyok/robots-checker example.com

# global CLI
npm install -g github:ksanyok/robots-checker

# as a library in your project
npm install github:ksanyok/robots-checker
```

## First run

```bash
robots-checker example.com
```

The header shows the file URL, HTTP status and size, the user-agent groups found and the sitemaps listed. Each tested URL gets `✔ allowed` or `✖ blocked`, with the group that applied and the deciding rule and line number. Problems in the file follow.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | No errors (warnings allowed unless `--strict`) |
| 1 | Errors found (or warnings with `--strict`) |
| 2 | Bad arguments or the check could not run |

## More examples

**Test specific URLs as Googlebot**

```bash
robots-checker example.com --url /blog/ --url /cart --url "/search?q=shoes"
```

**Test as another crawler**

```bash
robots-checker example.com --ua Bingbot --url /private/
```

**Check a local file before deploying it**

```bash
robots-checker --file public/robots.txt --url / --url /assets/app.js
```

## Without installing anything

Use the [online Robots.txt Checker](https://promopilot.link/en/tools/robots-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=robots-checker).
