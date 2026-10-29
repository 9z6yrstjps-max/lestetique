/* ================= Area riservata ================= */
const area = { ok: false, role: null, uid: null, email: '', view: 'agenda', cv: 'mese', bookings: {}, cassa: {}, month: todayIso().slice(0, 7), year: 'tutto', type: 'entrata', downloads: null };
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const CAT_IN = ['Mani e piedi', 'Viso', 'Corpo', 'Altro'];
const CAT_OUT = ['Prodotti', 'Affitto', 'Attrezzatura', 'Utenze', 'Formazione', 'Tasse e contributi', 'Altro'];
const money = c => (c / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
const monthName = k => { const [y, m] = k.split('-'); return `${MESI[+m - 1]} ${y}`; };
const shiftMonth = (k, n) => { let [y, m] = k.split('-').map(Number); m += n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${pad(m)}`; };
const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const parseAmt = v => { const s = String(v).trim().replace(/\s|€/g, ''); if (!s) return NaN; const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); return Math.round(n * 100); };

/* Routing: #area-riservata mostra l'area, qualsiasi altro hash il sito */
function route() {
  const priv = location.hash === '#area-riservata', legal = location.hash === '#privacy';
  document.body.classList.toggle('private', priv);
  document.body.classList.toggle('legal', legal);
  $('riservata').hidden = !priv;
  $('privacy').hidden = !legal;
  if (priv) { window.scrollTo(0, 0); renderArea(); }
  if (legal) window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

function setLocked(title, text) { $('locked').hidden = false; $('lockedTitle').textContent = title; $('lockedText').textContent = text; }
const VIEWS = ['agenda', 'cassa', 'utenti', 'attivita'];
function renderArea() {
  if (!area.ok) return;
  if (area.role !== 'admin' && (area.view === 'utenti' || area.view === 'attivita')) area.view = 'agenda';
  $('locked').hidden = true; $('areaTabs').hidden = false;
  document.querySelectorAll('#areaTabs .admin-only').forEach(b => { b.hidden = area.role !== 'admin'; });
  [...$('areaTabs').children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === area.view)));
  VIEWS.forEach(v => { $('view-' + v).hidden = area.view !== v; });
  if (area.view === 'agenda') renderAgenda();
  else if (area.view === 'cassa') renderCassa();
  else if (area.view === 'utenti') loadUsers();
  else loadActivity(true);
}
$('areaTabs').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) { area.view = b.dataset.view; renderArea(); } });

/* ---------- Agenda ---------- */
function cassaCat(name) {
  for (const c of LISTINO) for (const g of c.groups) if (g.items.some(x => x.name === name)) {
    if (c.id === 'mani') return 'Mani e piedi';
    if (c.id === 'viso' || c.id === 'makeup' || g.name === 'Viso') return 'Viso';
    return 'Corpo';
  }
  return 'Altro';
}
function renderAgenda() {
  const list = $('agendaList');
  const days = {};
  state.slots.forEach(s => { (days[s.date] ||= []).push(s); });
  const keys = Object.keys(days).sort();
  if (!keys.length) { list.innerHTML = '<p class="hint">Nessun appuntamento nei prossimi giorni. Le prenotazioni dal sito compariranno qui.</p>'; return; }
  list.innerHTML = keys.map(day => `<div class="ag-day"><h3>${day === todayIso() ? 'Oggi, ' : ''}${longDate(day)}</h3><ul>${days[day].sort((a, b) => a.start - b.start).map(s => {
    const det = s.kind === 'booking' ? area.bookings[s.id] : null;
    const who = s.kind === 'block' ? `<b>${esc(s.note || 'Orario bloccato')}</b><span class="tag">bloccato</span>`
      : det ? `<b>${esc(det.name)}</b><span>${esc((det.treatments || []).join(' + '))} · €${det.price}</span><span class="sel">${esc(det.phone)}</span>${det.notes ? `<span class="note">${esc(det.notes)}</span>` : ''}`
      : '<b>Prenotazione dal sito</b>';
    const time = s.start === 0 && s.end >= 1440 ? 'Tutto il giorno' : `${hm(s.start)} – ${hm(s.end)}`;
    const wa = det ? `<a class="link-btn" href="https://wa.me/${intl(det.phone)}" target="_blank" rel="noopener">WhatsApp</a>` : '';
    const cash = det ? (det.incassato ? '<span class="link-btn ag-cash" style="text-decoration:none">Incassato ✓</span>' : `<button type="button" class="link-btn" data-cash="${s.id}">Registra incasso</button>`) : '';
    return `<li><span class="ag-time">${time}</span><div class="ag-who">${who}</div><div class="ag-act">${cash}${wa}<button type="button" class="link-btn" data-del="${s.id}">${s.kind === 'block' ? 'Sblocca' : 'Annulla'}</button></div></li>`;
  }).join('')}</ul></div>`).join('');
}
$('agendaList').addEventListener('click', async e => {
  const c = e.target.closest('[data-cash]');
  if (c) {
    const det = area.bookings[c.dataset.cash]; if (!det) return;
    area.view = 'cassa'; area.cv = 'mese'; area.month = det.date.slice(0, 7); setType('entrata');
    $('m-date').value = det.date; $('m-cat').value = cassaCat((det.treatments || [])[0]);
    $('m-desc').value = (det.treatments || []).join(' + '); $('m-amt').value = String(det.price).replace('.', ',');
    $('movForm').dataset.booking = c.dataset.cash;
    renderArea(); $('m-amt').focus(); return;
  }
  const b = e.target.closest('[data-del]'); if (!b) return;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Confermi?'; return; }
  b.disabled = true;
  const s = state.slots.find(x => x.id === b.dataset.del);
  try {
    if (s && s.kind === 'booking') { const r = await sb.from('bookings').update({ status: 'annullata da Paola' }).eq('slot_id', s.id); if (r.error) throw r.error; }
    const r2 = await sb.from('slots').delete().eq('id', b.dataset.del); if (r2.error) throw r2.error;
    await refreshSlots();
    say(s && s.kind === 'block' ? 'Orario sbloccato' : 'Appuntamento annullato');
  } catch { b.disabled = false; say('Operazione non riuscita, riprova.'); }
});
$('b-day').addEventListener('change', e => { $('b-from').disabled = $('b-to').disabled = e.target.checked; });
$('blockForm').addEventListener('submit', async e => {
  e.preventDefault();
  const date = $('b-date').value, all = $('b-day').checked;
  const toM = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  const start = all ? 0 : toM($('b-from').value || '0:0'), end = all ? 1440 : toM($('b-to').value || '0:0');
  if (!date) { $('e-block').textContent = 'Scegli il giorno.'; return; }
  if (end <= start) { $('e-block').textContent = "L'ora di fine deve essere dopo l'inizio."; return; }
  $('e-block').textContent = '';
  try {
    const r = await sb.from('slots').insert({ day: date, start_min: start, end_min: end, kind: 'block', note: $('b-note').value.trim() || null });
    if (r.error) throw r.error;
    $('b-note').value = ''; await refreshSlots(); say('Orario bloccato');
  } catch { $('e-block').textContent = 'Non sono riuscita a salvare. Riprova.'; }
});

/* ---------- Registro di cassa ---------- */
function monthItems(k) { return Object.entries((area.cassa[k] && area.cassa[k].items) || {}).map(([id, x]) => ({ id, ...x })); }
function sums(items) {
  let e = 0, u = 0; items.forEach(x => { if (x.t === 'entrata') e += x.a; else u += x.a; });
  return { e, u, s: e - u, n: items.length };
}
function allMonths() {
  const ks = Object.keys(area.cassa).filter(k => monthItems(k).length);
  ks.push(todayIso().slice(0, 7));
  return [...new Set(ks)].sort();
}
function delta(cur, prev, label, inv) {
  if (!prev) return `<span class="d">${label}</span>`;
  const p = Math.round((cur - prev) / Math.abs(prev) * 100);
  return `<span class="d"><span class="${(p >= 0) !== !!inv ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</span> ${label}</span>`;
}
function setType(t) {
  area.type = t;
  [...$('movType').children].forEach(b => b.setAttribute('aria-checked', String(b.dataset.t === t)));
  const cur = $('m-cat').value;
  const cats = t === 'entrata' ? CAT_IN : CAT_OUT;
  $('m-cat').innerHTML = cats.map(c => `<option>${c}</option>`).join('');
  if (cats.includes(cur)) $('m-cat').value = cur;
  $('movSave').textContent = t === 'entrata' ? 'Registra entrata' : 'Registra uscita';
  renderQuick();
}
function freqDesc() {
  // voci più usate per tipo+categoria, con l'ultimo importo
  const map = {};
  Object.keys(area.cassa).sort().forEach(k => monthItems(k).sort((a, b) => a.d.localeCompare(b.d)).forEach(x => {
    if (!x.s) return;
    const key = x.t + '|' + x.c + '|' + x.s;
    (map[key] ||= { t: x.t, c: x.c, s: x.s, n: 0, a: 0 }); map[key].n++; map[key].a = x.a;
  }));
  return Object.values(map);
}
function renderQuick() {
  const f = freqDesc();
  const cat = $('m-cat').value;
  const top = f.filter(x => x.t === area.type && x.c === cat).sort((a, b) => b.n - a.n).slice(0, 8);
  $('quick').innerHTML = top.map(x => `<button type="button" data-s="${esc(x.s)}" data-a="${x.a}">${esc(x.s)} <small>${money(x.a)}</small></button>`).join('');
  $('descList').innerHTML = [...new Set(f.filter(x => x.t === area.type).sort((a, b) => b.n - a.n).map(x => x.s))].map(s => `<option value="${esc(s)}">`).join('');
}
$('movType').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setType(b.dataset.t); });
$('m-cat').addEventListener('change', renderQuick);
$('quick').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; $('m-desc').value = b.dataset.s; $('m-amt').value = (b.dataset.a / 100).toFixed(2).replace('.', ',').replace(',00', ''); $('m-amt').focus(); });

$('movForm').addEventListener('submit', async e => {
  e.preventDefault();
  const d = $('m-date').value, a = parseAmt($('m-amt').value);
  if (!d) { $('e-mov').textContent = 'Scegli la data.'; return; }
  if (!(a > 0)) { $('e-mov').textContent = 'Scrivi un importo valido, ad esempio 18 o 18,50.'; return; }
  $('e-mov').textContent = '';
  const k = d.slice(0, 7);
  const bk = $('movForm').dataset.booking, bkId = bk && area.bookings[bk] ? area.bookings[bk].id : null;
  const item = { d, t: area.type, c: $('m-cat').value, s: $('m-desc').value.trim(), a, booking_id: bkId };
  const btn = $('movSave'); btn.disabled = true;
  try {
    const r = await sb.from('cassa').insert(item); if (r.error) throw r.error;
    if (bkId) { await sb.from('bookings').update({ incassato: true }).eq('id', bkId); await loadAgendaDetails(); }
    delete $('movForm').dataset.booking;
    $('m-desc').value = ''; $('m-amt').value = '';
    area.month = k; await refreshMonth(k);
    say((item.t === 'entrata' ? 'Entrata' : 'Uscita') + ' di ' + money(a) + ' registrata');
  } catch { $('e-mov').textContent = 'Non sono riuscita a salvare. Riprova.'; }
  finally { btn.disabled = false; }
});

$('mPrev').addEventListener('click', () => { area.month = shiftMonth(area.month, -1); renderCassa(); });
$('mNext').addEventListener('click', () => { area.month = shiftMonth(area.month, 1); renderCassa(); });
$('cassaTabs').addEventListener('click', e => { const b = e.target.closest('[data-cv]'); if (b) { area.cv = b.dataset.cv; renderCassa(); } });

function renderCassa() {
  [...$('cassaTabs').children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.cv === area.cv)));
  $('cv-mese').hidden = area.cv !== 'mese'; $('cv-storico').hidden = area.cv !== 'storico';
  $('monthNav').style.visibility = area.cv === 'mese' ? 'visible' : 'hidden';
  if (area.cv === 'mese') renderMese(); else renderStorico();
}
function renderMese() {
  const k = area.month, ms = allMonths();
  $('mLabel').textContent = monthName(k);
  $('mPrev').disabled = k <= ms[0]; $('mNext').disabled = k >= todayIso().slice(0, 7);
  const items = monthItems(k), s = sums(items), p = sums(monthItems(shiftMonth(k, -1)));
  const pl = 'su ' + MESI[+shiftMonth(k, -1).slice(5) - 1];
  $('kpis').innerHTML = `
    <div class="kpi main"><span class="k">Saldo del mese</span><span class="v">${money(s.s)}</span>${delta(s.s, p.s, pl)}</div>
    <div class="kpi"><span class="k">Entrate</span><span class="v up">${money(s.e)}</span>${delta(s.e, p.e, pl)}</div>
    <div class="kpi"><span class="k">Uscite</span><span class="v down">${money(s.u)}</span>${delta(s.u, p.u, pl, true)}</div>
    <div class="kpi"><span class="k">Movimenti</span><span class="v">${s.n}</span><span class="d">${s.n ? 'scontrino medio ' + money(Math.round(s.e / Math.max(1, items.filter(x => x.t === 'entrata').length))) : 'nessun movimento'}</span></div>`;
  // ripartizione per categoria
  const group = t => { const m = {}; items.filter(x => x.t === t).forEach(x => { m[x.c] = (m[x.c] || 0) + x.a; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const gi = group('entrata'), go = group('uscita');
  const bd = (title, rows, cls) => { const max = Math.max(1, ...rows.map(r => r[1])); return `<div class="bd ${cls}"><h4>${title}</h4>${rows.length ? rows.map(([c, v]) => `<div class="bd-row"><span>${esc(c)}</span><b>${money(v)}</b><div class="bd-bar"><i style="width:${Math.max(2, v / max * 100)}%"></i></div></div>`).join('') : '<p class="cap-note">Nessuna voce</p>'}</div>`; };
  $('breakdown').innerHTML = items.length ? bd('Entrate per categoria', gi, 'in') + bd('Uscite per categoria', go, 'out') : '';
  // lista movimenti
  const byDay = {}; items.forEach(x => (byDay[x.d] ||= []).push(x));
  const days = Object.keys(byDay).sort().reverse();
  $('csvBtn').hidden = !items.length;
  $('movList').innerHTML = days.length ? days.map(d => {
    const ds = sums(byDay[d]);
    return `<div class="mv-day"><h4><span>${longDate(d)}</span><span>${money(ds.s)}</span></h4>${byDay[d].sort((a, b) => (b.at || '').localeCompare(a.at || '')).map(x => `
      <div class="mv"><div class="w"><span>${esc(x.s || x.c)}</span><small>${esc(x.c)}</small></div>
      <span class="a ${x.t === 'entrata' ? 'in' : 'out'}">${x.t === 'entrata' ? '+' : '−'}${money(x.a)}</span>
      ${canDelete(x) ? `<button type="button" class="x" data-rm="${x.id}" aria-label="Elimina movimento">Elimina</button>` : '<span></span>'}</div>`).join('')}</div>`;
  }).join('') : `<p class="hint">Nessun movimento a ${monthName(k)}. Registra la prima entrata dal modulo.</p>`;
}
$('movList').addEventListener('click', async e => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Confermi?'; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Elimina'; } }, 4000); return; }
  const k = area.month;
  b.disabled = true;
  try { const r = await sb.from('cassa').delete({ count: 'exact' }).eq('id', b.dataset.rm); if (r.error) throw r.error; await refreshMonth(k); say(r.count ? 'Movimento eliminato' : 'Puoi eliminare solo i movimenti inseriti da te oggi'); }
  catch { b.disabled = false; say('Non sono riuscita a eliminare. Riprova.'); }
});
$('csvBtn').addEventListener('click', async () => {
  const k = area.month, rows = monthItems(k).sort((a, b) => a.d.localeCompare(b.d));
  const f = c => (c / 100).toFixed(2).replace('.', ',');
  const csv = 'Data;Tipo;Categoria;Sottocategoria;Importo\n' + rows.map(x => `${x.d.split('-').reverse().join('/')};${x.t === 'entrata' ? 'Entrata' : 'Uscita'};${x.c};${(x.s || '').replace(/;/g, ',')};${x.t === 'entrata' ? '' : '-'}${f(x.a)}`).join('\n');
  const [y, m] = k.split('-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${y}-${MESI[+m - 1][0].toUpperCase() + MESI[+m - 1].slice(1)}-RegistroCassa.csv`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});

function renderStorico() {
  const ms = allMonths().filter(k => k < todayIso().slice(0, 7) || monthItems(k).length);
  const years = [...new Set(ms.map(k => k.slice(0, 4)))];
  $('yearChips').innerHTML = ['tutto', ...years].map(y => `<button type="button" class="tab" aria-selected="${area.year === y}" data-y="${y}">${y === 'tutto' ? 'Tutto' : y}</button>`).join('');
  const sel = ms.filter(k => area.year === 'tutto' || k.startsWith(area.year));
  const rows = sel.map(k => ({ k, ...sums(monthItems(k)) }));
  const tot = rows.reduce((a, r) => ({ e: a.e + r.e, u: a.u + r.u, s: a.s + r.s, n: a.n + r.n }), { e: 0, u: 0, s: 0, n: 0 });
  const best = rows.reduce((a, r) => (!a || r.s > a.s ? r : a), null);
  const label = area.year === 'tutto' ? 'dal ' + (rows[0] ? monthName(rows[0].k) : '') : 'nel ' + area.year;
  $('yKpis').innerHTML = `
    <div class="kpi main"><span class="k">Saldo ${area.year === 'tutto' ? 'totale' : area.year}</span><span class="v">${money(tot.s)}</span><span class="d">${label}</span></div>
    <div class="kpi"><span class="k">Entrate</span><span class="v up">${money(tot.e)}</span><span class="d">${tot.n} movimenti</span></div>
    <div class="kpi"><span class="k">Uscite</span><span class="v down">${money(tot.u)}</span><span class="d">${tot.e ? Math.round(tot.u / tot.e * 100) + '% delle entrate' : ''}</span></div>
    <div class="kpi"><span class="k">Media mensile</span><span class="v">${money(Math.round(tot.s / Math.max(1, rows.length)))}</span><span class="d">${best ? 'mese migliore: ' + monthName(best.k) : ''}</span></div>`;
  $('histBody').innerHTML = rows.slice().reverse().map(r => `<tr data-k="${r.k}" tabindex="0"><td>${monthName(r.k)}</td><td class="up">${money(r.e)}</td><td class="down">${money(r.u)}</td><td><b>${money(r.s)}</b></td><td>${r.n}</td></tr>`).join('');
  $('histFoot').innerHTML = `<tr><td>Totale</td><td>${money(tot.e)}</td><td>${money(tot.u)}</td><td>${money(tot.s)}</td><td>${tot.n}</td></tr>`;
  drawChart(rows);
}
$('yearChips').addEventListener('click', e => { const b = e.target.closest('[data-y]'); if (b) { area.year = b.dataset.y; renderStorico(); } });
function openMonth(k) { area.month = k; area.cv = 'mese'; renderCassa(); }
$('histBody').addEventListener('click', e => { const r = e.target.closest('tr[data-k]'); if (r) openMonth(r.dataset.k); });
$('histBody').addEventListener('keydown', e => { const r = e.target.closest('tr[data-k]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openMonth(r.dataset.k); } });

function drawChart(rows) {
  const el = $('chart');
  if (!rows.length) { el.innerHTML = '<p class="hint">Ancora nessun dato.</p>'; return; }
  const W = Math.max(320, el.clientWidth || 800), H = 260, L = 56, R = 8, T = 12, B = 34;
  const max = Math.max(...rows.map(r => r.s), 0), min = Math.min(...rows.map(r => r.s), 0);
  const stepRaw = (max - min) / 4 / 100, mag = Math.pow(10, Math.floor(Math.log10(stepRaw || 1)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= stepRaw) * 100;
  const top = Math.ceil(max / step) * step || step, bot = Math.floor(min / step) * step;
  const y = v => T + (top - v) / (top - bot) * (H - T - B);
  const bw = (W - L - R) / rows.length, barW = Math.max(4, Math.min(40, bw - 6));
  const ticks = []; for (let v = bot; v <= top + 1; v += step) ticks.push(v);
  const every = Math.ceil(rows.length / Math.floor((W - L) / 46));
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Saldo mensile">`;
  ticks.forEach(v => { svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? '#CDBBA8' : '#F2E9DE'}" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#76665B" font-family="Montserrat, sans-serif">${(v / 100).toLocaleString('it-IT')} €</text>`; });
  rows.forEach((r, i) => {
    const cx = L + bw * i + bw / 2, y0 = y(0), y1 = y(r.s), h = Math.max(1, Math.abs(y0 - y1)), top_ = Math.min(y0, y1), rad = Math.min(4, barW / 2, h);
    const fill = r.s >= 0 ? '#CFA17A' : '#A3452F';
    // barra con estremità arrotondata lato dato, ancorata alla linea dello zero
    const x0 = cx - barW / 2, x1 = cx + barW / 2;
    const d = r.s >= 0
      ? `M${x0},${y0} V${top_ + rad} Q${x0},${top_} ${x0 + rad},${top_} H${x1 - rad} Q${x1},${top_} ${x1},${top_ + rad} V${y0} Z`
      : `M${x0},${y0} V${y1 - rad} Q${x0},${y1} ${x0 + rad},${y1} H${x1 - rad} Q${x1},${y1} ${x1},${y1 - rad} V${y0} Z`;
    svg += `<path d="${d}" fill="${fill}" class="bar" data-i="${i}"/>`;
    svg += `<rect x="${L + bw * i}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" data-i="${i}" class="hit"/>`;
    if (i % every === 0) { const [yy, mm] = r.k.split('-'); svg += `<text x="${cx}" y="${H - 14}" text-anchor="middle" font-size="11" fill="#76665B" font-family="Montserrat, sans-serif">${MESI[+mm - 1].slice(0, 3)}</text>${+mm === 1 || i === 0 ? `<text x="${cx}" y="${H - 1}" text-anchor="middle" font-size="10" fill="#A39282" font-family="Montserrat, sans-serif">${yy}</text>` : ''}`; }
  });
  svg += '</svg><div class="tip" id="tip"></div>';
  el.innerHTML = svg;
  const tip = $('tip'), bars = el.querySelectorAll('.bar');
  const show = i => {
    const r = rows[i], rect = el.getBoundingClientRect(), sx = rect.width / W;
    bars.forEach((b, j) => b.setAttribute('opacity', j === +i ? '1' : '.55'));
    tip.innerHTML = `<b>${monthName(r.k)}</b><br>Entrate ${money(r.e)}<br>Uscite ${money(r.u)}<br>Saldo <b>${money(r.s)}</b>`;
    let x = (L + bw * i + bw / 2) * sx; x = Math.min(Math.max(x, 90), rect.width - 90);
    tip.style.left = x + 'px'; tip.style.top = Math.min(y(r.s), y(0)) * (260 / H) + 'px'; tip.classList.add('show');
  };
  el.querySelectorAll('.hit').forEach(h => { h.addEventListener('mouseenter', () => show(h.dataset.i)); h.addEventListener('click', () => show(h.dataset.i)); });
  el.querySelector('svg').addEventListener('mouseleave', () => { tip.classList.remove('show'); bars.forEach(b => b.setAttribute('opacity', '1')); });
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (area.ok && area.view === 'cassa' && area.cv === 'storico') renderStorico(); }, 150); });

/* Caricamento registro: lettura diretta dei mesi, poi aggiornamenti live */
function cassaChanged() {
  const n = Object.values(area.cassa).reduce((s, d) => s + Object.keys((d && d.items) || {}).length, 0);
  const st = $('cassaStatus');
  if (area.cassaLoading && !n) { st.hidden = false; st.className = 'cassa-status'; st.textContent = 'Carico il registro…'; }
  else if (!n && area.cassaErr) { st.hidden = false; st.className = 'cassa-status err'; st.innerHTML = `Non riesco a leggere il registro (codice: ${esc(area.cassaErr)}). <button type="button" class="link-btn" id="cassaRetry">Riprova</button>`; }
  else st.hidden = true;
  renderQuick();
  if (area.view === 'cassa' && !$('riservata').hidden) renderCassa();
}
function cassaFromRows(rows) {
  const out = {};
  rows.forEach(x => { const k = x.d.slice(0, 7); ((out[k] ||= { items: {} }).items)[x.id] = { d: x.d, t: x.t, c: x.c, s: x.s || '', a: x.a, at: x.created_at, cb: x.created_by }; });
  return out;
}
async function fetchCassa(from, to) {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    let q = sb.from('cassa').select('id,d,t,c,s,a,created_at,created_by').order('d').order('id').range(off, off + 999);
    if (from) q = q.gte('d', from); if (to) q = q.lte('d', to);
    const { data, error } = await q; if (error) throw error;
    rows.push(...data); if (data.length < 1000) break;
  }
  return rows;
}
async function loadCassa() {
  area.cassaLoading = true; area.cassaErr = null; cassaChanged();
  try { area.cassa = cassaFromRows(await fetchCassa()); }
  catch (e) { area.cassaErr = (e && (e.code || e.message)) || 'errore'; }
  area.cassaLoading = false; cassaChanged();
}
async function refreshMonth(k) {
  try {
    const [y, m] = k.split('-').map(Number), last = new Date(y, m, 0).getDate();
    const rows = await fetchCassa(`${k}-01`, `${k}-${pad(last)}`);
    const c = cassaFromRows(rows); if (c[k]) area.cassa[k] = c[k]; else delete area.cassa[k];
    cassaChanged();
  } catch {}
}
document.addEventListener('click', e => { if (e.target.id === 'cassaRetry') loadCassa(); });
