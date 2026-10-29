/* ---------- Hero: prima disponibilità ---------- */
function nextFree(m) {
  for (const day of upcomingDays()) { const s = freeStarts(day, m); if (s.length) return { day, t: s[0] }; }
  return null;
}
function relDay(day) {
  const d = parseIso(day), t = parseIso(todayIso()), diff = Math.round((d - t) / 864e5);
  return diff === 0 ? 'oggi' : diff === 1 ? 'domani' : d.toLocaleDateString('it-IT', { weekday: 'long' });
}
const shortDate = day => parseIso(day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const HERO_TOP = TREATS.slice().sort(byPop).slice(0, 3);
function renderHeroNext() {
  const n = nextFree(30);
  if (n) {
    $('nmDay').textContent = relDay(n.day); $('nmTime').textContent = hm(n.t);
    $('nmDate').textContent = shortDate(n.day);
    $('nextMain').setAttribute('aria-label', `Prima disponibilità ${relDay(n.day)}, ${shortDate(n.day)}, ore ${hm(n.t)}`);
  } else { $('nmDay').textContent = 'Agenda piena'; $('nmTime').textContent = ''; $('nmDate').textContent = 'Scrivimi su WhatsApp: troviamo un momento.'; }
  $('nextList').innerHTML = HERO_TOP.map(t => {
    const f = nextFree(t.min);
    return `<li><button type="button" data-key="${esc(t.key)}"><span class="nl-name"><span class="st" aria-label="${t.stars} stelle su 3">${'★'.repeat(t.stars)}</span>${esc(t.name)}</span><span class="nl-when">${f ? `${relDay(f.day)} <b>${hm(f.t)}</b>` : 'da concordare'}</span></button></li>`;
  }).join('');
  const live = state.mode === 'live';
  $('nextNote').className = 'nc-note' + (live ? ' live' : '');
  $('nextNote').querySelector('span').textContent = live ? 'Agenda aggiornata in tempo reale' : 'Orari indicativi, Paola conferma su WhatsApp';
}
function goBook(t, m) {
  if (t) { state.picked = [t]; renderPicked(); }
  const f = nextFree(t ? t.min : (totalMin() || 30));
  if (f) { state.day = f.day; renderDays(); if (state.picked.length) { state.time = f.t; } renderTimes(); }
  document.getElementById('prenota').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
$('nextMain').addEventListener('click', () => goBook(null));
$('nextBook').addEventListener('click', e => { e.preventDefault(); goBook(null); });
$('nextList').addEventListener('click', e => { const b = e.target.closest('[data-key]'); if (!b) return; goBook(TREATS.find(x => x.key === b.dataset.key)); });
setInterval(renderHeroNext, 60000);
