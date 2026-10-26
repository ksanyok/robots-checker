# FAQ

## Does Disallow remove a page from Google?

No. Disallow stops crawling, not indexing — a blocked URL can still appear in results (without a snippet) if other pages link to it. To keep a page out of the index, allow crawling and use `noindex` in a meta robots tag or the `X-Robots-Tag` header.

## Which group applies to Googlebot?

Only one group applies: the one with the most specific matching user agent. If there is a `User-agent: Googlebot` group, Googlebot ignores the `*` group completely — rules are not combined.

## Should I block CSS and JavaScript?

No. Google renders pages like a browser; blocking the files it needs to render leads to a broken view of your page and can hurt rankings.

## What happens if robots.txt returns 404 or 500?

A 4xx means "no restrictions" — everything may be crawled. A 5xx makes Google treat the site as fully disallowed until the file is reachable again, which is why a broken robots.txt can stop crawling of an entire site.

## Is Crawl-delay respected?

Bing and Yandex respect it; Googlebot ignores it and adjusts its crawl rate automatically.
