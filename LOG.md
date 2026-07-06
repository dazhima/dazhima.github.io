# LOG — current state

parent: [CLAUDE.md](CLAUDE.md)

## Status (2026-07-06)

**Live and working.** Custom domain active, HTTPS enforced, content published across three sections.

- Homepage: hero (identity, satirical title), Research, Publications, Path, AI & Building (flagship: math-ai-framework), Others, Contact.
- Others → 查经 (bible/), Phaedrus palinode (philosophy/socrate/), Arendt Life of the Mind + Marxism tracker + reading framework (philosophy/).
- SEO: `robots.txt` + `sitemap.xml` added 2026-07-06, listing all live pages. Not submitted to Google Search Console — decided to let indexing happen naturally (see DECISIONS.md).

## Domain

- **yanhe-math.com** — registered fresh on Namecheap 2026-07-06 (after `yanhe.us` reactivation failed, see DECISIONS.md). DNS: 4× A records (185.199.108.153, .109.153, .110.153, .111.153) for apex `@`, CNAME `www` → `dazhima.github.io.`. `CNAME` file in repo root. HTTPS certificate: approved. HTTPS enforcement: on.
- **dazhima.github.io** — always works regardless of custom-domain state; fallback URL.

## Working commands

```bash
# local preview
cd website && python3 -m http.server 8848   # or use .claude/launch.json "site" config

# after editing, publish:
git add -A && git commit -m "..." && git push origin main

# check Pages build status
gh api repos/dazhima/dazhima.github.io/pages/builds/latest --jq '{status, commit: .commit[0:7]}'

# force a fresh build if stuck (happens often — see CLAUDE.md standing rules)
gh api -X POST repos/dazhima/dazhima.github.io/pages/builds

# verify a page is live
curl -s -o /dev/null -w '%{http_code}\n' https://yanhe-math.com/<path>

# check real DNS (bypass local Clash proxy which shows fake 198.18.x.x IPs)
curl -s "https://cloudflare-dns.com/dns-query?name=yanhe-math.com&type=A" -H "accept: application/dns-json"
```

## To resume

If picking this back up cold: read this file, then `DECISIONS.md` for why things are the way they are, then check `git log --oneline -10` in `website/` for what's changed since this was last updated.
