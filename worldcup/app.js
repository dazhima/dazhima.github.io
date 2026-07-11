/* World Cup Beijing-time tracker — LIVE.
 *
 * Data comes from TheSportsDB (free public key "3"), FIFA World Cup = league 4429.
 * We merge four endpoints every refresh so the window always covers "now":
 *   - eventspastleague  : last ~15 finished matches (with scores)
 *   - eventsnextleague  : next ~15 scheduled matches
 *   - eventsday (today + tomorrow, UTC) : catches in-progress / live status + scores
 * Everything is shown in Beijing time. User-added matches (the form) are merged in
 * and persist locally; the last good live pull is cached so the page still shows
 * something useful if the network/API is unreachable.
 */

const BEIJING_TIME_ZONE = "Asia/Shanghai";
const WC_LEAGUE_ID = "4429"; // FIFA World Cup on TheSportsDB
const API_KEY = "3"; // free public test key
const API = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const REFRESH_MS = 60000; // re-fetch live data once a minute

const CUSTOM_KEY = "world-cup-custom-matches-v1"; // matches added via the form
const CACHE_KEY = "world-cup-live-cache-v1"; // last good live pull (offline fallback)

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "MATCH FINISHED", "FINISHED", "AP"]);
const LIVE_STATUSES = new Set([
  "1H", "2H", "HT", "ET", "BT", "P", "INPLAY", "LIVE",
  "HALF TIME", "1ST HALF", "2ND HALF", "EXTRA TIME", "PENALTY", "BREAK TIME"
]);

let activeFilter = "upcoming";
let liveMatches = loadCache(); // from API
let customMatches = loadCustom(); // from the form
let lastUpdated = null;
let connection = liveMatches.length ? "stale" : "loading"; // loading | live | stale | offline

const nowEl = document.querySelector("#beijing-now");
const nextTitleEl = document.querySelector("#next-title");
const nextMetaEl = document.querySelector("#next-meta");
const nextCountdownEl = document.querySelector("#next-countdown");
const matchesEl = document.querySelector("#matches");
const bracketEl = document.querySelector("#bracket");
const searchEl = document.querySelector("#search");
const formEl = document.querySelector("#match-form");
const refreshEl = document.querySelector("#refresh");
const statusDotEl = document.querySelector("#conn-dot");
const statusTextEl = document.querySelector("#conn-text");
const downloadAllEl = document.querySelector("#download-all");

/* ----- controls ----- */

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    render();
  });
});

searchEl.addEventListener("input", render);

refreshEl.addEventListener("click", () => refresh(true));

downloadAllEl.addEventListener("click", () => {
  downloadCalendarFile(allMatches(), "world-cup-beijing-time.ics");
});

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = document.querySelector("#date").value;
  const time = document.querySelector("#time").value;
  const startsAt = `${date}T${time}:00+08:00`;

  customMatches.push({
    id: crypto.randomUUID(),
    teamA: document.querySelector("#team-a").value.trim(),
    teamB: document.querySelector("#team-b").value.trim(),
    round: document.querySelector("#round").value.trim() || "World Cup",
    venue: document.querySelector("#venue").value.trim() || "Venue TBA",
    startsAt,
    homeScore: null,
    awayScore: null,
    status: "",
    source: "custom"
  });

  saveCustom();
  formEl.reset();
  render();
});

/* ----- storage ----- */

function loadCustom() {
  return readArray(CUSTOM_KEY);
}

function saveCustom() {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customMatches));
}

function loadCache() {
  return readArray(CACHE_KEY);
}

function saveCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(liveMatches));
}

function readArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ----- live data ----- */

function utcDateString(offsetDays) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

async function fetchEvents(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

// TheSportsDB cup-round codes → human labels (group matches use matchday 1-3 instead).
const KNOCKOUT_ROUNDS = {
  "125": { label: "Final", order: 5 },
  "126": { label: "Semi-final", order: 4 },
  "127": { label: "Quarter-final", order: 3 },
  "128": { label: "Round of 16", order: 2 },
  "129": { label: "Round of 32", order: 1 }
};

function roundInfo(ev) {
  if (ev.strGroup) return { label: `Group ${ev.strGroup}`, knockout: false, order: 0 };

  const code = String(ev.intRound || "");
  if (KNOCKOUT_ROUNDS[code]) return { ...KNOCKOUT_ROUNDS[code], knockout: true };

  // fall back to any round name spelled out in the event title
  const text = String(ev.strEvent || "");
  if (/third place|3rd place/i.test(text)) return { label: "Third place", knockout: true, order: 4.5 };
  const m = text.match(/round of \d+|final|semi[- ]?final|quarter[- ]?final/i);
  if (m) return { label: m[0].replace(/\b\w/g, (c) => c.toUpperCase()), knockout: true, order: 4 };
  return { label: "World Cup", knockout: false, order: 0 };
}

function normalize(ev) {
  const stamp = ev.strTimestamp
    ? `${ev.strTimestamp.replace(" ", "T")}Z` // API gives UTC without a zone marker
    : `${ev.dateEvent}T${ev.strTime || "00:00:00"}Z`;

  const info = roundInfo(ev);
  const venue = [ev.strVenue, ev.strCity].filter(Boolean).join(", ") || "Venue TBA";

  return {
    id: ev.idEvent,
    teamA: ev.strHomeTeam,
    teamB: ev.strAwayTeam,
    round: info.label,
    knockout: info.knockout,
    roundOrder: info.order,
    venue,
    startsAt: stamp,
    homeScore: ev.intHomeScore,
    awayScore: ev.intAwayScore,
    status: ev.strStatus || "",
    progress: ev.strProgress || "",
    source: "live"
  };
}

async function refresh(manual) {
  if (manual) {
    connection = "loading";
    renderStatus();
  }
  const urls = [
    `${API}/eventspastleague.php?id=${WC_LEAGUE_ID}`,
    `${API}/eventsnextleague.php?id=${WC_LEAGUE_ID}`,
    `${API}/eventsday.php?d=${utcDateString(0)}&l=${WC_LEAGUE_ID}`,
    `${API}/eventsday.php?d=${utcDateString(1)}&l=${WC_LEAGUE_ID}`
  ];

  try {
    const batches = await Promise.all(urls.map(fetchEvents));
    const byId = new Map();
    // eventsday is freshest for live status/score, so let it win by merging last.
    for (const batch of batches) {
      for (const ev of batch) {
        if (ev && ev.idEvent) byId.set(ev.idEvent, normalize(ev));
      }
    }
    liveMatches = [...byId.values()];
    lastUpdated = new Date();
    connection = "live";
    saveCache();
  } catch (err) {
    connection = liveMatches.length ? "stale" : "offline";
  }
  render();
}

/* ----- combine + filter ----- */

function allMatches() {
  return [...liveMatches, ...customMatches]
    .map((m) => ({ ...m, date: new Date(m.startsAt) }))
    .filter((m) => !Number.isNaN(m.date.getTime()))
    .sort((a, b) => a.date - b.date);
}

function statusInfo(match, now) {
  const raw = String(match.status || "").toUpperCase().trim();
  const hasScore = match.homeScore != null && match.awayScore != null;
  const diff = match.date - now;

  const finished = FINISHED_STATUSES.has(raw) || (raw === "" && hasScore && diff < -3 * 3600 * 1000);
  const live =
    !finished &&
    (LIVE_STATUSES.has(raw) ||
      /^\d/.test(raw) || // "45'", "90+2"
      (hasScore && diff <= 0) ||
      (diff <= 0 && diff > -3 * 3600 * 1000));

  if (finished) return { kind: "final", className: "done", text: "FT" };
  if (live) {
    const minute = /^\d/.test(raw) ? raw : (match.progress && /\d/.test(match.progress) ? `${match.progress}'` : "LIVE");
    return { kind: "live", className: "live", text: minute === "LIVE" ? "LIVE" : `LIVE ${minute}` };
  }
  return { kind: "upcoming", className: diff < 3600 * 1000 ? "soon" : "", text: formatDuration(diff) };
}

function getVisibleMatches(now) {
  const query = searchEl.value.trim().toLowerCase();
  return allMatches().filter((match) => {
    const diff = match.date - now;
    if (activeFilter === "upcoming" && diff < -3 * 3600 * 1000) return false;
    if (activeFilter === "today" && !isSameBeijingDay(match.date, now)) return false;
    if (!query) return true;
    return [match.teamA, match.teamB, match.round, match.venue]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

/* ----- render ----- */

function render() {
  const now = new Date();
  nowEl.textContent = formatClock(now);
  renderNext(now);
  renderMatches(now);
  renderBracket(now);
  renderStatus();
}

// Winner/loser of a knockout match, if decided. Returns null while unresolved.
function decideOutcome(match) {
  const raw = String(match.status || "").toUpperCase().trim();
  const finished = FINISHED_STATUSES.has(raw);
  if (!finished) return null;
  const a = Number(match.homeScore);
  const b = Number(match.awayScore);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (a === b) return { winner: null, note: "pens" }; // penalty result not exposed by API
  return { winner: a > b ? match.teamA : match.teamB, loser: a > b ? match.teamB : match.teamA };
}

function renderBracket(now) {
  if (!bracketEl) return;
  const ko = allMatches().filter((m) => m.knockout);

  if (ko.length === 0) {
    bracketEl.innerHTML = `
      <div class="bracket-empty">
        <strong>Group stage in progress.</strong>
        The knockout bracket fills in here automatically once the Round of 32 begins.
        Winners advance; eliminated teams are struck through, so you can see who's left at a glance.
      </div>`;
    return;
  }

  // group matches by round, ordered R32 → Final
  const rounds = new Map();
  for (const m of ko) {
    const key = m.roundOrder || 99;
    if (!rounds.has(key)) rounds.set(key, { label: m.round, order: key, matches: [] });
    rounds.get(key).matches.push(m);
  }
  const ordered = [...rounds.values()].sort((a, b) => a.order - b.order);

  // survivors vs eliminated
  const teams = new Set();
  const eliminated = new Set();
  for (const m of ko) {
    if (m.teamA) teams.add(m.teamA);
    if (m.teamB) teams.add(m.teamB);
    const out = decideOutcome(m);
    if (out && out.loser) eliminated.add(out.loser);
  }
  const stillIn = [...teams].filter((t) => !eliminated.has(t));

  const columns = ordered
    .map((round) => {
      const cards = round.matches
        .sort((a, b) => a.date - b.date)
        .map((m) => bracketCard(m, now))
        .join("");
      return `
        <div class="bracket-col">
          <div class="bracket-col-head">${escapeHtml(round.label)}<span>${round.matches.length}</span></div>
          ${cards}
        </div>`;
    })
    .join('<div class="bracket-flow">›</div>');

  bracketEl.innerHTML = `
    <div class="bracket-summary">
      <span class="pill in">${stillIn.length} still in</span>
      <span class="pill out">${eliminated.size} eliminated</span>
      ${eliminated.size ? `<span class="bracket-out-list">Out: ${[...eliminated].map(escapeHtml).join(", ")}</span>` : ""}
    </div>
    <div class="bracket-cols">${columns}</div>`;
}

function bracketCard(match, now) {
  const out = decideOutcome(match);
  const status = statusInfo(match, now);
  const hasScore = match.homeScore != null && match.awayScore != null;

  const row = (team, score, isHome) => {
    const won = out && out.winner === team;
    const lost = out && out.loser === team;
    const cls = won ? "won" : lost ? "lost" : "";
    return `<div class="bk-team ${cls}">
      <span class="bk-name">${won ? "▶ " : ""}${escapeHtml(team || "TBD")}</span>
      <span class="bk-score">${hasScore ? escapeHtml(String(isHome ? match.homeScore : match.awayScore)) : ""}</span>
    </div>`;
  };

  const tag = out && out.note === "pens" ? "PENS"
    : status.kind === "final" ? "FT"
    : status.kind === "live" ? status.text
    : `${formatDate(match.date)} ${formatTime(match.date)}`;

  return `<article class="bk-match${status.kind === "live" ? " is-live" : ""}">
    ${row(match.teamA, match.homeScore, true)}
    ${row(match.teamB, match.awayScore, false)}
    <div class="bk-tag ${status.className}">${escapeHtml(tag)}</div>
  </article>`;
}

function renderStatus() {
  const map = {
    loading: ["loading", "Updating…"],
    live: ["live", lastUpdated ? `Live · updated ${formatClock(lastUpdated)} BJT` : "Live"],
    stale: ["stale", lastUpdated ? `Stale · last update ${formatClock(lastUpdated)} BJT` : "Cached data"],
    offline: ["offline", "Offline — showing saved data"]
  };
  const [cls, text] = map[connection] || map.loading;
  if (statusDotEl) statusDotEl.className = `conn-dot ${cls}`;
  if (statusTextEl) statusTextEl.textContent = text;
}

function renderNext(now) {
  const candidates = allMatches().map((m) => ({ m, s: statusInfo(m, now) }));
  // Prefer a live match; otherwise the soonest upcoming.
  const featured =
    candidates.find((c) => c.s.kind === "live") ||
    candidates.find((c) => c.s.kind === "upcoming");

  if (!featured) {
    nextTitleEl.textContent = "No upcoming matches";
    nextMetaEl.textContent = "Add the next fixture below, or hit Refresh.";
    nextCountdownEl.textContent = "--";
    nextCountdownEl.className = "countdown";
    return;
  }

  const { m, s } = featured;
  nextTitleEl.textContent = scoreLine(m);
  nextMetaEl.textContent = `${formatDate(m.date)} at ${formatTime(m.date)} BJT · ${m.round} · ${m.venue}`;
  if (s.kind === "live") {
    nextCountdownEl.textContent = s.text;
    nextCountdownEl.className = "countdown live";
  } else {
    nextCountdownEl.textContent = formatDuration(m.date - now);
    nextCountdownEl.className = "countdown";
  }
}

function renderMatches(now) {
  const visible = getVisibleMatches(now);

  if (visible.length === 0) {
    matchesEl.innerHTML = `<div class="empty">${
      connection === "loading" ? "Loading live fixtures…" : "No matches for this view."
    }</div>`;
    return;
  }

  matchesEl.innerHTML = visible
    .map((match) => {
      const status = statusInfo(match, now);
      const delBtn =
        match.source === "custom"
          ? `<button class="delete" type="button" data-delete="${match.id}" aria-label="Delete ${escapeHtml(match.teamA)} vs ${escapeHtml(match.teamB)}">×</button>`
          : `<span class="delete-spacer"></span>`;
      return `
        <article class="match${status.kind === "live" ? " is-live" : ""}">
          <div class="date-block">
            ${formatTime(match.date)}
            <span>${formatDate(match.date)} BJT</span>
          </div>
          <div class="teams">
            <strong>${escapeHtml(scoreLine(match))}</strong>
            <small>${escapeHtml(match.round)} · ${escapeHtml(match.venue)}${match.source === "custom" ? " · added" : ""}</small>
          </div>
          <div class="status ${status.className}">${status.text}</div>
          <button class="calendar" type="button" data-calendar="${match.id}" aria-label="Download calendar reminder for ${escapeHtml(match.teamA)} vs ${escapeHtml(match.teamB)}">Cal</button>
          ${delBtn}
        </article>
      `;
    })
    .join("");

  matchesEl.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      customMatches = customMatches.filter((match) => match.id !== button.dataset.delete);
      saveCustom();
      render();
    });
  });

  matchesEl.querySelectorAll("[data-calendar]").forEach((button) => {
    button.addEventListener("click", () => {
      const match = allMatches().find((item) => item.id === button.dataset.calendar);
      if (match) downloadCalendarFile([match], `${slugify(`${match.teamA} vs ${match.teamB}`)}.ics`);
    });
  });
}

function scoreLine(match) {
  if (match.homeScore != null && match.awayScore != null) {
    return `${match.teamA} ${match.homeScore} – ${match.awayScore} ${match.teamB}`;
  }
  return `${match.teamA} vs ${match.teamB}`;
}

/* ----- formatting helpers ----- */

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BEIJING_TIME_ZONE, month: "short", day: "2-digit", weekday: "short"
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BEIJING_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
}

function formatClock(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BEIJING_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).format(date);
}

function isSameBeijingDay(left, right) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  });
  return f.format(left) === f.format(right);
}

function formatDuration(ms) {
  if (ms <= 0) return "Live / passed";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

/* ----- calendar export ----- */

function downloadCalendarFile(calendarMatches, filename) {
  if (calendarMatches.length === 0) return;
  const events = calendarMatches
    .slice()
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .map(toCalendarEvent)
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//World Cup Beijing Tracker//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:World Cup Beijing Time",
    "X-WR-TIMEZONE:Asia/Shanghai", events, "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCalendarEvent(match) {
  const start = new Date(match.startsAt);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const title = `${match.teamA} vs ${match.teamB}`;
  const description = `${match.round} | ${match.venue} | Beijing time: ${formatDate(start)} ${formatTime(start)}`;

  return [
    "BEGIN:VEVENT",
    `UID:${match.id}@world-cup-beijing-tracker`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(match.venue)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(title)} starts in 30 minutes`,
    "END:VALARM", "END:VEVENT"
  ].join("\r\n");
}

function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ----- boot ----- */

render();
refresh(false);
setInterval(render, 1000); // tick clock + countdowns
setInterval(() => refresh(false), REFRESH_MS); // pull fresh data each minute
