# Troubleshooting

## "robots.txt is served as an HTML page"

The server has no robots.txt and returns the home page or a styled 404 with status 200. Create a real `robots.txt` at the site root, or make sure the server returns 404 for it.

## A URL is blocked but I cannot see why

Run with `--url <path>`: the output names the exact rule and line. Remember that a specific user-agent group replaces `*` — rules from the `*` group do not apply to Googlebot if a Googlebot group exists.

## Results differ from another tester

Older testers use first-match or prefix-only matching. This tool follows RFC 9309 and Google's open-source parser: longest match wins and `allow` wins ties.

## Fetch errors or timeouts

The site may block non-browser clients or be behind a bot challenge. Download the file manually and use `--file`.

## Still stuck?

Open an [issue](https://github.com/ksanyok/robots-checker/issues/new/choose) with the command, the output (`--json` if possible) and your Node.js version — or compare with the [online version](https://promopilot.link/en/tools/robots-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=robots-checker).
