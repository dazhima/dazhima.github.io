# LOG — current state

parent: [CLAUDE.md](CLAUDE.md)

## Status (2026-07-16)

**Live and working.** Custom domain active, HTTPS enforced, content published across three sections.

- Homepage: hero (identity, satirical title), Research, Publications, Path, AI & Building (flagship: math-ai-framework), Others, Contact.
- Others → Selected papers (arxiv-daily, external tracker), Phaedrus palinode (philosophy/socrate/), Arendt Life of the Mind + Marxism tracker + reading framework (philosophy/), World Cup Beijing-time tracker (worldcup/), Some small math (math-notes/), **Undergraduate reading seminar (reading-seminar/)**.
- **reading-seminar/** (added 2026-07-16) — landing page "Undergraduate reading seminar" for algebraic geometry notes from working with undergraduates. First entry: "Blow-up — the scheme-theoretic point of view", copied in from `claude/obsidian-ai/math/Relearn algebraic geometry/student-surfaces-thesis/Blow-up — scheme-theoretic point of view.html` (self-contained, KaTeX via CDN), with a `← Undergraduate reading seminar` link added to its header. Same add-a-note pattern as math-notes/.
- **bible/ is hidden** (since 2026-07-16, Yan's call): removed from the Others list and from `sitemap.xml`, and `robots.txt` now has `Disallow: /bible/`. Files are untouched and still live at `https://yanhe-math.com/bible/` — reachable by anyone with the direct link, just not advertised or crawled. To fully unpublish instead of just unlist, would need to actually delete the files from the repo.
- **math-notes/** (added 2026-07-16) — landing page "Some small math" for small self-contained derivations (not research). First entry: 欧拉–埃特尔维因方程 (Euler–Eytelwein capstan equation), copied in from `claude/obsidian-ai/math/euler-eytelwein/euler-eytelwein-summary.html` as-is (self-contained, KaTeX via CDN, no relative asset deps), with a `← 主页` link added to its sidebar TOC. New notes: drop the rendered HTML into `math-notes/`, add a `<li>` to `math-notes/index.html`'s notes list, no separate landing needed unless it grows large like bible/philosophy did.
- **worldcup/** (added 2026-07-11) — self-contained live 2026 World Cup tracker: fixtures + scores + knockout "who's left" flow board, Beijing time, auto-refresh from TheSportsDB. Source of truth is `ai/worldcup/`; the site copy adds a `主页` breadcrumb. Linked from Others + sitemap. Live: https://yanhe-math.com/worldcup/
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
