/* ================= Prenotazioni ================= */
const HOURS = { 1: [[540, 780], [900, 1140]], 2: [[540, 780], [900, 1140]], 3: [[540, 780], [900, 1140]], 4: [[540, 780], [900, 1140]], 5: [[540, 780], [900, 1140]], 6: [[540, 780]] };
const STEP = 30;          // un orario di inizio ogni 30 minuti
const DAYS_AHEAD = 28;    // prenotabile fino a 4 settimane
const LEAD_MIN = 60;      // almeno 1 ora di preavviso

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const hm = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;
const dur = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const longDate = s => parseIso(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const todayIso = () => iso(new Date());
const intl = p => { let d = String(p).trim().startsWith('+') ? String(p).replace(/\D/g, '') : String(p).replace(/\D/g, '').replace(/^00/, ''); return d.length <= 10 ? '39' + d : d; };

/* Catalogo trattamenti */
const TREATS = [];
LISTINO.forEach(c => c.groups.forEach(g => g.items.forEach(x => TREATS.push({ key: c.id + ':' + x.name, cat: c.short, name: x.name, price: x.price, min: x.min, pop: x.pop, stars: x.stars }))));
const sel = $('f-treat');
const STAR = n => n ? ' ' + '★'.repeat(n) : '';
const byPop = (a, b) => (b.pop || 0) - (a.pop || 0);
sel.innerHTML = '<option value="">Scegli un trattamento…</option>' + LISTINO.map(c =>
  `<optgroup label="${esc(c.name)}">${c.groups.flatMap(g => g.items).slice().sort(byPop).map(x => `<option value="${esc(c.id + ':' + x.name)}">${esc(x.name)} · €${x.price}${STAR(x.stars)}</option>`).join('')}</optgroup>`).join('');
/* I più richiesti: un tocco e il trattamento è aggiunto */
$('topPicks').innerHTML = TREATS.slice().sort(byPop).filter(t => t.stars >= 2).slice(0, 6).map(t =>
  `<button type="button" data-key="${esc(t.key)}"><span class="st" aria-label="${t.stars} stelle su 3">${'★'.repeat(t.stars)}</span>${esc(t.name)} <small>€${t.price}</small></button>`).join('');
$('topPicks').addEventListener('click', e => { const b = e.target.closest('[data-key]'); if (!b) return; sel.value = b.dataset.key; addTreat(); });

const state = { picked: [], day: null, time: null, slots: [], mode: 'loading', uid: null, db: null, mine: {} };

function totalMin() { return state.picked.reduce((s, t) => s + t.min, 0); }
function renderPicked() {
  $('picked').innerHTML = state.picked.map((t, i) => `<li><span>${esc(t.name)} <small>${dur(t.min)}</small></span><button type="button" aria-label="Togli ${esc(t.name)}" data-i="${i}">×</button></li>`).join('');
  const m = totalMin(), eur = state.picked.reduce((s, t) => s + t.price, 0);
  $('total').innerHTML = m ? `Durata stimata <b>${dur(m)}</b> · Totale <b>€${eur}</b>` : '';
  state.time = null; renderDays(); renderTimes();
}
function addTreat() {
  const t = TREATS.find(x => x.key === sel.value);
  if (!t) return;
  if (state.picked.length >= 4) { $('e-treat').textContent = 'Massimo 4 trattamenti per appuntamento.'; return; }
  state.picked.push(t); sel.value = ''; $('e-treat').textContent = ''; renderPicked();
}
sel.addEventListener('change', () => { if (state.picked.length === 0) addTreat(); });
$('addTreat').addEventListener('click', addTreat);
$('picked').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { state.picked.splice(+b.dataset.i, 1); renderPicked(); } });

/* Disponibilità */
function busyFor(day) { return state.slots.filter(s => s.date === day).map(s => [s.start, s.end]); }
function freeStarts(day, m) {
  const d = parseIso(day), blocks = HOURS[d.getDay()];
  if (!blocks || !m) return [];
  const busy = busyFor(day), out = [];
  const minStart = day === todayIso() ? nowMin() + LEAD_MIN : 0;
  for (const [a, b] of blocks) for (let t = a; t + m <= b; t += STEP) {
    if (t < minStart) continue;
    if (busy.some(([s, e]) => t < e && t + m > s)) continue;
    out.push(t);
  }
  return out;
}
function upcomingDays() {
  const out = [], d = new Date();
  for (let i = 0; i <= DAYS_AHEAD; i++) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, 12); if (HOURS[x.getDay()]) out.push(iso(x)); }
  return out;
}
function renderDays() {
  const m = totalMin() || 30;
  $('days').innerHTML = upcomingDays().map(day => {
    const d = parseIso(day), n = freeStarts(day, m).length;
    const on = state.day === day;
    return `<button type="button" class="day" data-day="${day}" aria-pressed="${on}" ${n ? '' : 'disabled'} aria-label="${longDate(day)}${n ? '' : ', nessun orario libero'}">
      <span class="dw">${d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')}</span>
      <span class="dn">${d.getDate()}</span>
      <span class="dm">${n ? d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '') : 'pieno'}</span></button>`;
  }).join('');
}
function renderTimes() {
  const el = $('times');
  if (!state.picked.length) { el.innerHTML = '<p class="hint">Scegli prima un trattamento: gli orari dipendono dalla durata.</p>'; return; }
  if (!state.day) { el.innerHTML = '<p class="hint">Scegli un giorno per vedere gli orari liberi.</p>'; return; }
  const starts = freeStarts(state.day, totalMin());
  if (state.time != null && !starts.includes(state.time)) state.time = null;
  el.innerHTML = starts.length
    ? starts.map(t => `<button type="button" class="time" data-t="${t}" aria-pressed="${state.time === t}">${hm(t)}</button>`).join('')
    : '<p class="hint">Nessun orario libero in questo giorno per la durata scelta. Prova un altro giorno.</p>';
  renderSummary();
}
$('days').addEventListener('click', e => { const b = e.target.closest('.day'); if (!b || b.disabled) return; state.day = b.dataset.day; state.time = null; renderDays(); renderTimes(); });
$('times').addEventListener('click', e => { const b = e.target.closest('.time'); if (!b) return; state.time = +b.dataset.t; $('e-time').textContent = ''; renderTimes(); });

function renderSummary() {
  const s = $('summary');
  if (!state.picked.length || !state.day || state.time == null) { s.hidden = true; return; }
  s.hidden = false;
  s.innerHTML = `<span class="lbl">Riepilogo</span><b>${longDate(state.day)}, ore ${hm(state.time)} – ${hm(state.time + totalMin())}</b><span>${state.picked.map(t => esc(t.name)).join(' + ')}</span>`;
}
function setStatus(kind, text) { const s = $('status'); s.className = 'status ' + kind; s.querySelector('span').textContent = text; }
function setMode(mode) {
  state.mode = mode;
  $('submitBtn').textContent = mode === 'live' ? 'Conferma prenotazione' : 'Invia richiesta su WhatsApp';
  $('privacyNote').textContent = mode === 'live'
    ? 'I tuoi dati li vede solo Paola, per gestire i tuoi appuntamenti.'
    : 'Il messaggio con giorno e ora si apre su WhatsApp: Paola ti risponde con la conferma.';
}

/* Invio */
function waText(extra) {
  const lines = [`Ciao Paola, sono ${fullName()}.`, extra, '',
    `• Trattamento: ${state.picked.map(t => t.name).join(' + ')}`,
    `• Giorno: ${longDate(state.day)}`,
    `• Ora: ${hm(state.time)} (durata stimata ${dur(totalMin())})`,
    `• Cellulare: ${$('f-phone').value.trim()}`];
  const nb = $('f-nascita').value; if (nb) lines.push(`• Data di nascita: ${nb.split('-').reverse().join('/')}`);
  const n = $('f-notes').value.trim(); if (n) lines.push(`• Note: ${n}`);
  if ($('f-promo').checked) lines.push('• Sì alle promozioni e novità');
  if ($('f-sumisura').checked) lines.push('• Sì alle proposte su misura');
  lines.push('', 'Grazie!');
  return lines.join('\n');
}
function fullName() { return `${$('f-nome').value.trim()} ${$('f-cognome').value.trim()}`.trim(); }
function waLink(text) { return `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`; }
function validate() {
  let ok = true;
  const set = (id, msg) => { $(id).textContent = msg; if (msg) ok = false; };
  set('e-treat', state.picked.length ? '' : 'Scegli almeno un trattamento.');
  set('e-time', state.day && state.time != null ? '' : 'Scegli giorno e orario.');
  set('e-nome', $('f-nome').value.trim() ? '' : 'Scrivi il tuo nome.');
  set('e-cognome', $('f-cognome').value.trim() ? '' : 'Scrivi il tuo cognome.');
  const nb = $('f-nascita').value;
  set('e-nascita', !nb || (nb >= '1920-01-01' && nb <= todayIso()) ? '' : 'Controlla la data di nascita.');
  set('e-phone', $('f-phone').value.replace(/\D/g, '').length >= 8 ? '' : 'Serve un numero di cellulare valido.');
  return ok;
}
function showResult(html) { const r = $('result'); r.innerHTML = html; r.hidden = false; r.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }

$('bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!validate()) return;
  if (state.mode !== 'live') {
    const text = waText('Vorrei prenotare questo appuntamento da L\'Estetique:');
    showResult(`<p class="lbl">Il tuo messaggio</p><pre>${esc(text)}</pre><div class="c-actions"><a class="btn btn-wa" href="${waLink(text)}" target="_blank" rel="noopener">${WA_ICON}Invia su WhatsApp</a></div>`);
    return;
  }
  const btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'Prenoto…';
  try {
    const booking = await book();
    const text = waText('Ho appena prenotato dal sito:');
    showResult(`<p class="ok-title">Prenotazione confermata</p>
      <p><b>${longDate(booking.date)}, ore ${hm(booking.start)}</b><br>${esc(booking.treatments.join(' + '))}</p>
      <p class="small">È già nell'agenda di Paola. Se vuoi, avvisala anche su WhatsApp.</p>
      <div class="c-actions"><a class="btn btn-wa" href="${waLink(text)}" target="_blank" rel="noopener">${WA_ICON}Avvisa Paola</a></div>`);
    state.picked = []; state.time = null; $('f-notes').value = ''; $('f-promo').checked = $('f-sumisura').checked = false; renderPicked();
  } catch (err) {
    if (err && err.code === 'taken') {
      $('e-time').textContent = 'Questo orario è appena stato preso. Scegline un altro.';
      state.time = null; refreshSlots();
    } else if (err && err.code === 'too_many') {
      $('e-time').textContent = 'Hai già 3 appuntamenti in programma con questo numero. Per altri, scrivimi su WhatsApp.';
    } else if (err && err.code === 'bad_time') {
      $('e-time').textContent = 'Questo orario non è più prenotabile. Scegline un altro.';
      state.time = null; refreshSlots();
    } else {
      $('e-time').textContent = 'Non sono riuscita a salvare la prenotazione. Riprova, oppure scrivimi su WhatsApp.';
    }
  } finally { btn.disabled = false; setMode(state.mode); }
});

async function book() {
  const date = state.day, start = state.time, dur = totalMin();
  const treatments = state.picked.map(t => t.name), price = state.picked.reduce((s, t) => s + t.price, 0);
  const base = { p_day: date, p_start: start, p_duration: dur, p_phone: $('f-phone').value.trim(), p_treatments: treatments, p_price: price, p_notes: $('f-notes').value.trim() };
  let { data, error } = await sb.rpc('prenota', { ...base, p_nome: $('f-nome').value.trim(), p_cognome: $('f-cognome').value.trim(), p_nascita: $('f-nascita').value || null, p_promo: $('f-promo').checked, p_su_misura: $('f-sumisura').checked });
  if (error && /PGRST202|Could not find the function/i.test((error.code || '') + ' ' + (error.message || ''))) {
    ({ data, error } = await sb.rpc('book', { ...base, p_name: fullName() }));   // database non ancora aggiornato
  }
  if (error) {
    const m = error.message || '';
    if (m.includes('orario_occupato')) throw { code: 'taken' };
    if (m.includes('troppe_prenotazioni')) throw { code: 'too_many' };
    if (/troppo_presto|fuori_orario|giorno_non_valido/.test(m)) throw { code: 'bad_time' };
    throw { code: 'other', message: m };
  }
  const mine = loadMine(); mine.push({ id: data.id, token: data.token, date, start, end: start + dur, treatments, status: 'confermata' }); saveMine(mine);
  refreshMine(); refreshSlots();
  return { date, start, treatments };
}

/* Le mie prenotazioni (cliente): ricordate in questo browser con un codice segreto */
const MINE_KEY = 'lestetique-prenotazioni';
function loadMine() { try { return JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); } catch { return []; } }
function saveMine(list) { try { localStorage.setItem(MINE_KEY, JSON.stringify(list)); } catch {} }
async function refreshMine() {
  let list = loadMine().filter(b => b.date >= todayIso());
  if (sb && list.length) {
    const { data, error } = await sb.rpc('my_bookings', { p_items: list.map(b => ({ id: b.id, token: b.token })) });
    if (!error && data) { const st = Object.fromEntries(data.map(r => [r.id, r.status])); list = list.filter(b => st[b.id]).map(b => ({ ...b, status: st[b.id] })); }
  }
  saveMine(list);
  state.mine = Object.fromEntries(list.map(b => [b.id, b]));
  renderMine();
}
function renderMine() {
  const items = Object.entries(state.mine).filter(([, b]) => b.status === 'confermata' && b.date >= todayIso()).sort((a, b) => (a[1].date + pad(a[1].start)).localeCompare(b[1].date + pad(b[1].start)));
  $('mine').hidden = !items.length;
  $('mineList').innerHTML = items.map(([id, b]) => `<li><div><b>${longDate(b.date)}, ${hm(b.start)}</b><span>${esc(b.treatments.join(' + '))}</span></div><button type="button" class="link-btn" data-cancel="${id}">Annulla</button></li>`).join('');
}
$('mineList').addEventListener('click', async e => {
  const b = e.target.closest('[data-cancel]'); if (!b) return;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Confermi?'; return; }
  b.disabled = true;
  const item = state.mine[b.dataset.cancel];
  try {
    const { data, error } = await sb.rpc('cancel_booking', { p_id: item.id, p_token: item.token });
    if (error) throw error;
    saveMine(loadMine().filter(x => x.id !== item.id));
    await refreshMine(); refreshSlots();
    say(data ? 'Prenotazione annullata' : 'La prenotazione era già stata annullata');
  } catch { b.disabled = false; say('Non sono riuscita ad annullare. Scrivimi su WhatsApp.'); }
});
