/* ===== SAMPLE DATA (shown, and labelled, until a Google Sheet link is set) ===== */
const SAMPLE = {
  performance: [
    {group:"events",label:"Total events",value:"18"},{group:"events",label:"Flagship events",value:"3"},
    {group:"events",label:"Completed",value:"15"},{group:"events",label:"Upcoming",value:"3"},
    {group:"kpi",label:"Overall attendance rate, minor events (%)",value:"78"},
    {group:"kpi",label:"Overall attendance rate, major events (%)",value:"85"},
    {group:"kpi",label:"Planned projects successfully completed (%)",value:"92"},
    {group:"kpi",label:"Events completed within approved budget (% variance)",value:"6"},
    {group:"kpi",label:"Member participation and engagement (%)",value:"82"},
    {group:"alignment",label:"Graduate Employability",value:"12"},{group:"alignment",label:"STEM and IR4.0",value:"6"},
    {group:"alignment",label:"SDG 4: Quality Education",value:"14"},{group:"alignment",label:"SDG 8: Decent Work",value:"9"},
    {group:"alignment",label:"SDG 17: Partnerships",value:"8"}
  ],
  demographics: [
    {group:"summary",label:"Committees",value:"6"},{group:"summary",label:"Committee members",value:"32"},
    {group:"summary",label:"General members",value:"88"},
    {group:"college",label:"Engineering",value:"48"},{group:"college",label:"Computing and Informatics",value:"36"},
    {group:"college",label:"Business and Accounting",value:"22"},{group:"college",label:"Energy Economics and Social Sciences",value:"14"},
    {group:"year",label:"Year 1",value:"30"},{group:"year",label:"Year 2",value:"42"},
    {group:"year",label:"Year 3",value:"34"},{group:"year",label:"Year 4",value:"14"}
  ],
  reports: [
    {event:"Flagship Summit",date:"Oct 2025",attendance:"250",rating:"4.7",summary:"Full-day programme with industry speakers and workshops.",link:"#"},
    {event:"Career Workshop",date:"Mar 2026",attendance:"90",rating:"4.5",summary:"Hands-on CV and interview sessions with partner companies.",link:"#"}
  ]
};

/* ===== HELPERS ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const COLORS = ["#dc2626","#3b82f6","#1d4ed8","#f87171","#60a5fa","#94a3b8"];

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.some(v => v.trim()))
    .map(r => Object.fromEntries(head.map((k, i) => [k.trim().toLowerCase(), (r[i] || "").trim()])));
}

async function load(name) {
  const url = CONFIG.sheets[name];
  let rows = null;
  if (url) {
    try { const res = await fetch(url); if (!res.ok) throw new Error(res.status); rows = parseCSV(await res.text()); }
    catch (e) { console.warn("Sheet failed, using sample:", name, e); }
  }
  const sample = !rows;
  const note = $(`[data-sample="${name}"]`); if (note) note.hidden = !sample;
  return sample ? SAMPLE[name] : rows;
}

/* ===== RENDERERS ===== */
const ICONS = {"total events":"fa-calendar","flagship events":"fa-star","completed":"fa-circle-check","upcoming":"fa-forward",
  "committees":"fa-sitemap","committee members":"fa-users-gear","general members":"fa-users"};
const statCard = r => `<div class="card stat"><i class="fa-solid ${ICONS[r.label.toLowerCase()] || "fa-chart-simple"}"></i>
  <div class="num" data-to="${esc(r.value)}">${esc(r.value)}</div><div class="lbl">${esc(r.label)}</div></div>`;

function countUp() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".num[data-to]").forEach(el => {
    const to = parseFloat(el.dataset.to); if (isNaN(to)) return;
    const dec = String(el.dataset.to).includes(".") ? 1 : 0, t0 = performance.now();
    const step = t => { const p = Math.min((t - t0) / 900, 1); el.textContent = (to * p).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

function renderKPIs(rows) {
  const kp = rows.filter(r => r.group === "kpi");
  $("#kpiGrid").innerHTML = CONFIG.kpis.map(([label, target, rule, n]) => {
    const row = kp.find(r => r.label.toLowerCase() === label.toLowerCase());
    const v = parseFloat(row ? row.value : ""), has = !isNaN(v);
    let status = "";
    if (has && rule) {
      const met = rule === "min" ? v >= n : Math.abs(v) <= n;
      status = met ? '<span class="badge ok"><i class="fa-solid fa-circle-check"></i> On target</span>'
                   : '<span class="badge red"><i class="fa-solid fa-triangle-exclamation"></i> Below target</span>';
    }
    const shown = has ? (rule === "band" && v > 0 ? "+" : "") + v : "–";
    return `<div class="card stat kpi"><i class="fa-solid fa-bullseye"></i>
      <div class="num">${shown}${has ? "<small>%</small>" : ""}</div><div class="lbl">${esc(label)}</div>
      ${target || status ? `<div class="target">${status}<span>${esc(target)}</span></div>` : ""}</div>`;
  }).join("");
}

function renderPerformance(rows) {
  const g = k => rows.filter(r => r.group === k);
  renderKPIs(rows);
  $("#eventCounts").innerHTML = g("events").map(statCard).join("");


  const fallback = CONFIG.alignment.map(a => ({label: a[0], icon: a[1], tone: a[2], value: ""}));
  const al = g("alignment").length
    ? g("alignment").map((r, i) => ({label: r.label, value: r.value, icon: (CONFIG.alignment.find(a => a[0] === r.label) || [])[1] || "fa-solid fa-tag",
        tone: i % 2 ? "blue" : "red"}))
    : fallback;
  $("#alignment").innerHTML = al.map(a => `<span class="badge ${a.tone}"><i class="${esc(a.icon)}"></i> ${esc(a.label)}${a.value ? ` <b>${esc(a.value)}</b>` : ""}</span>`).join("");
}

function donut(id, legendId, rows) {
  const total = rows.reduce((s, r) => s + (+r.value || 0), 0) || 1;
  let acc = 0;
  const stops = rows.map((r, i) => {
    const from = acc / total * 100; acc += +r.value || 0;
    return `${COLORS[i % COLORS.length]} ${from}% ${acc / total * 100}%`;
  });
  $(id).style.background = `conic-gradient(${stops.join(",")})`;
  $(legendId).innerHTML = rows.map((r, i) =>
    `<li><i style="background:${COLORS[i % COLORS.length]}"></i>${esc(r.label)}<b>${esc(r.value || 0)}</b></li>`).join("");
}

function renderDemographics(rows) {
  const g = k => rows.filter(r => r.group === k);
  $("#summary").innerHTML = g("summary").map(statCard).join("");
  donut("#donutCollege", "#legendCollege", g("college"));
  donut("#donutDepartment", "#legendDepartment", g("department"));
}

let ALL_REPORTS = [];

function paintReports(rows) {
  const box = $("#reports");
  if (!rows.length) {
    box.innerHTML = `<div class="card" style="flex:1;text-align:center;color:var(--muted)">No matching event reports found.</div>`;
    return;
  }
  box.innerHTML = rows.map(r =>
    `<article class="card report"><h3>${esc(r.event)}</h3><small class="muted">${esc(r.date)}</small>
      <div class="meta">
        ${r.attendance ? `<span class="badge red"><i class="fa-solid fa-users"></i> ${esc(r.attendance)} attended</span>` : ""}
        ${r.rating ? `<span class="badge"><i class="fa-solid fa-star"></i> ${esc(r.rating)} / 5</span>` : ""}
      </div>
      <p>${esc(r.summary)}</p>${r.link ? `<p><a href="${esc(r.link)}" target="_blank" rel="noopener">Read full report</a></p>` : ""}</article>`).join("");
}

function renderReports(rows) {
  ALL_REPORTS = rows;
  paintReports(ALL_REPORTS);

  const form = $("#reportSearchForm");
  const input = $("#reportSearchInput");
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    const filtered = q
      ? ALL_REPORTS.filter(r =>
          (r.event || "").toLowerCase().includes(q) ||
          (r.date || "").toLowerCase().includes(q) ||
          (r.summary || "").toLowerCase().includes(q)
        )
      : ALL_REPORTS;
    paintReports(filtered);
  };

  if (form) form.onsubmit = e => { e.preventDefault(); filter(); };
  if (input) input.oninput = filter;

  const box = $("#reports");
  if ($("#repPrev")) $("#repPrev").onclick = () => box.scrollBy({left: -340, behavior: "smooth"});
  if ($("#repNext")) $("#repNext").onclick = () => box.scrollBy({left: 340, behavior: "smooth"});
}

/* ===== COUNTDOWN (Google Calendar API, then fallback in index.html, then demo) ===== */
async function getNextEvent() {
  const {id, key, tag} = CONFIG.calendar;
  if (id && key) {
    try {
      const u = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?key=${key}` +
        `&singleEvents=true&orderBy=startTime&maxResults=30&timeMin=${new Date().toISOString()}`;
      const items = (await (await fetch(u)).json()).items || [];
      const list = items.map(e => ({name: e.summary || "Untitled", start: new Date(e.start.dateTime || e.start.date), venue: e.location || ""}));
      const next = list.find(e => e.name.includes(tag)) || list[0];
      if (next) return {...next, name: next.name.replace(tag, "").trim()};
    } catch (e) { console.warn("Calendar API failed", e); }
  }
  const n = CONFIG.nextEvent;
  if (n.name && n.date) { const d = new Date(n.date.replace(" ", "T") + "+08:00"); if (!isNaN(d)) return {name: n.name, start: d, venue: n.venue}; }
  $("#cdDemo").hidden = false;
  return {name: "Flagship event (demo)", start: new Date(Date.now() + 30 * 864e5), venue: "Set your event in index.html"};
}

function startCountdown(ev) {
  $("#cdName").textContent = ev.name;
  $("#cdMeta").textContent = ev.start.toLocaleDateString("en-MY", {weekday:"long", day:"numeric", month:"long", year:"numeric"}) + (ev.venue ? " · " + ev.venue : "");
  const tick = () => {
    const s = Math.max(0, Math.floor((ev.start - Date.now()) / 1000));
    const p = [["Days", Math.floor(s / 86400)], ["Hours", Math.floor(s % 86400 / 3600)], ["Minutes", Math.floor(s % 3600 / 60)], ["Seconds", s % 60]];
    $("#cdTimer").innerHTML = p.map(([l, n]) => `<div><b>${String(n).padStart(2, "0")}</b><span>${l}</span></div>`).join("");
  };
  tick(); setInterval(tick, 1000);
}

/* ===== UI: theme, mobile menu, active link ===== */
function setupUI() {
  const root = document.documentElement, btn = $("#themeBtn");
  const paint = () => btn.innerHTML = `<i class="fa-solid ${root.dataset.theme === "dark" ? "fa-sun" : "fa-moon"}"></i>`;
  paint();
  btn.onclick = () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    paint();
  };
  const menu = $("#menu"), burger = $("#burger");
  burger.onclick = () => { const o = menu.classList.toggle("open"); burger.setAttribute("aria-expanded", o); };
  menu.onclick = e => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); } };
  const links = [...menu.querySelectorAll("a")];
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
  }), {rootMargin: "-45% 0px -50% 0px"});
  document.querySelectorAll("main section[id], footer[id]").forEach(s => io.observe(s));
}

/* ===== INIT ===== */
(async function init() {
  setupUI();
  const [perf, demo, reps, next] = await Promise.all([load("performance"), load("demographics"), load("reports"), getNextEvent()]);
  renderPerformance(perf); renderDemographics(demo); renderReports(reps); startCountdown(next); countUp();
  $("#updated").textContent = new Date().toLocaleString("en-MY", {dateStyle: "medium", timeStyle: "short"});
})();
