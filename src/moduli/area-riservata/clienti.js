/* ---------- Clienti: schede, storico trattamenti e consensi ---------- */
const cl = { list: [], hist: [], sel: null, isNew: false, picked: [] };
const fmtD = d => d ? parseIso(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const daysAgo = d => Math.round((parseIso(todayIso()) - parseIso(d)) / 864e5);
const normTel = p => String(p || '').replace(/\D/g, '').replace(/^(00)?39(?=\d{9,10}$)/, '');
const plur = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
const LISTINO_NAMES = new Set(TREATS.map(t => t.name));
const priceOf = n => { const t = TREATS.find(x => x.name === n); return t ? t.price : 0; };
const treatOptions = (first, extra = []) => `<option value="">${first}</option>` + LISTINO.map(c =>
  `<optgroup label="${esc(c.name)}">${[...new Set(c.groups.flatMap(g => g.items).map(x => x.name))].map(n => `<option>${esc(n)}</option>`).join('')}</optgroup>`).join('')
  + (extra.length ? `<optgroup label="Altri">${extra.map(n => `<option>${esc(n)}</option>`).join('')}</optgroup>` : '');

function clStatus(text) { const s = $('cl-status'); s.hidden = !text; s.textContent = text || ''; }

async function loadClienti() {
  const [c, h] = await Promise.all([
    sb.from('clienti').select('*').order('cognome').order('nome'),
    sb.from('storico_clienti').select('id,cliente_id,day,treatments,price,origine,created_by').order('day', { ascending: false })
  ]);
  if (c.error || h.error) {
    cl.list = []; cl.hist = [];
    clStatus('Le schede clienti non sono ancora attive: va aggiornato il database (file 5-clienti.sql).');
    $('cl-list').innerHTML = ''; $('cl-count').textContent = ''; $('cl-new').disabled = true; renderCard(); return;
  }
  clStatus(''); $('cl-new').disabled = false;
  cl.list = c.data; cl.hist = h.data.map(r => ({ ...r, price: Number(r.price) }));
  buildStats(); fillTreatFilter(); renderClienti();
}
function buildStats() {
  const today = todayIso(), by = {};
  cl.hist.forEach(r => (by[r.cliente_id] ||= []).push(r));
  cl.list.forEach(c => {
    const h = by[c.id] || [], past = h.filter(r => r.day <= today), fut = h.filter(r => r.day > today);
    const count = {}; past.forEach(r => r.treatments.forEach(t => { count[t] = (count[t] || 0) + 1; }));
    Object.assign(c, {
      _hist: h, _n: past.length, _tot: past.reduce((s, r) => s + r.price, 0),
      _last: past.length ? past.map(r => r.day).sort().pop() : null,
      _next: fut.length ? fut.map(r => r.day).sort()[0] : null,
      _tr: new Set(h.flatMap(r => r.treatments)),
      _fav: Object.entries(count).sort((a, b) => b[1] - a[1])[0] || null
    });
  });
}
function fillTreatFilter() {
  const sel = $('cl-tr'), cur = sel.value;
  const extra = [...new Set(cl.hist.flatMap(r => r.treatments))].filter(n => !LISTINO_NAMES.has(n)).sort((a, b) => a.localeCompare(b, 'it'));
  sel.innerHTML = treatOptions('Tutti i trattamenti', extra);
  sel.value = cur;
}
const historyFilter = () => !!($('cl-tr').value || $('cl-last').value);
function clFiltered() {
  const q = $('cl-q').value.trim().toLowerCase(), qd = q.replace(/\D/g, '');
  const tr = $('cl-tr').value, last = +$('cl-last').value, cons = $('cl-cons').value;
  return cl.list.filter(c => {
    if (q) {
      const hay = `${c.nome} ${c.cognome} ${c.nome}`.toLowerCase();
      if (!hay.includes(q) && !(qd.length >= 3 && qd.length === q.replace(/\s/g, '').length && normTel(c.telefono).includes(qd))) return false;
    }
    if (tr && !c._tr.has(tr)) return false;
    if (last && (!c._last || c._next || daysAgo(c._last) <= last)) return false;
    if (cons === 'promo' && !c.consenso_promo) return false;
    if (cons === 'su_misura' && !c.consenso_su_misura) return false;
    if (cons === 'nessuno' && (c.consenso_promo || c.consenso_su_misura)) return false;
    return true;
  });
}
const reachable = c => historyFilter() ? c.consenso_su_misura : c.consenso_promo;
function renderClienti() {
  const rows = clFiltered(), ok = rows.filter(reachable).length;
  $('cl-count').textContent = cl.list.length ? `${plur(rows.length, 'cliente', 'clienti')} · ${ok} contattabili` : '';
  $('cl-csv').title = historyFilter()
    ? 'Filtri su trattamenti o visite: nella lista vanno solo le clienti con il consenso alle proposte su misura'
    : 'Nella lista vanno solo le clienti con il consenso alle promozioni';
  $('cl-list').innerHTML = rows.length ? rows.map(c => {
    const sub = c._next ? `Prossimo appuntamento ${fmtD(c._next)}` : c._last ? `Ultima visita ${fmtD(c._last)}` : 'Nessuna visita';
    return `<li><button type="button" data-id="${c.id}" aria-current="${cl.sel === c.id && !cl.isNew}">
      <span class="cl-name"><b>${esc(c.cognome)}</b> ${esc(c.nome)}</span>
      <span class="cl-sub">${sub} · ${plur(c._n, 'visita', 'visite')}</span>
      <span class="cl-tags">${c.consenso_promo ? '<i title="Consenso promozioni">Promo</i>' : ''}${c.consenso_su_misura ? '<i title="Consenso proposte su misura">Su misura</i>' : ''}</span></button></li>`;
  }).join('') : `<li class="cap-note">${cl.list.length ? 'Nessuna cliente con questi filtri.' : 'Ancora nessuna cliente. Le schede si creano da sole con le prenotazioni dal sito, oppure con «Nuova cliente».'}</li>`;
  renderCard();
}
function renderCard() {
  const el = $('cl-card');
  const c = cl.isNew ? { id: null, nome: '', cognome: '', telefono: '', nascita: null, consenso_promo: false, consenso_su_misura: false, note: '', _hist: [], _n: 0 }
    : cl.list.find(x => x.id === cl.sel);
  if (!c) { el.innerHTML = '<p class="hint">Scegli una cliente per vedere la sua scheda, oppure premi «Nuova cliente».</p>'; return; }
  const since = c.created_at ? `Cliente dal ${fmtD(c.created_at.slice(0, 10))} · ${c.origine === 'sito' ? 'prima prenotazione dal sito' : 'inserita in studio'}` : 'Compila i dati e salva: poi potrai aggiungere i trattamenti.';
  const consAt = at => at ? ` <small>· dal ${fmtD(at.slice(0, 10))}</small>` : '';
  const bday = c.nascita ? parseIso(c.nascita).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : '—';
  const hist = c._hist.slice().sort((a, b) => b.day.localeCompare(a.day));
  el.innerHTML = `
    <div class="cl-head">
      <div><p class="eyebrow">${cl.isNew ? 'Nuova cliente' : 'Scheda cliente'}</p><h3>${cl.isNew ? 'Nuova cliente' : esc(c.nome + ' ' + c.cognome)}</h3><p class="cap-note">${since}</p></div>
      ${cl.isNew ? '' : `<a class="btn btn-wa btn-sm" href="https://wa.me/${intl(c.telefono)}" target="_blank" rel="noopener">${WA_ICON}WhatsApp</a>`}
    </div>
    ${cl.isNew ? '' : `<div class="cl-stats">
      <div><b>${c._n}</b><span>${c._n === 1 ? 'visita' : 'visite'}</span></div>
      <div><b>€${c._tot.toLocaleString('it-IT')}</b><span>totale</span></div>
      <div><b>${c._fav ? esc(c._fav[0]) : '—'}</b><span>il più fatto</span></div>
      <div><b>${bday}</b><span>compleanno</span></div></div>`}
    <form class="cl-form" id="cl-form" novalidate>
      <div class="field"><label for="c-nome">Nome</label><input id="c-nome" value="${esc(c.nome)}" maxlength="40" autocomplete="off"></div>
      <div class="field"><label for="c-cognome">Cognome</label><input id="c-cognome" value="${esc(c.cognome === '-' ? '' : c.cognome)}" maxlength="60" autocomplete="off"></div>
      <div class="field"><label for="c-tel">Cellulare</label><input id="c-tel" type="tel" inputmode="tel" value="${esc(c.telefono)}" autocomplete="off"></div>
      <div class="field"><label for="c-nascita">Data di nascita</label><input id="c-nascita" type="date" value="${c.nascita || ''}" min="1920-01-01" max="${todayIso()}"></div>
      <fieldset class="consents field full">
        <legend class="lbl">Consensi</legend>
        <label class="check"><input type="checkbox" id="c-promo" ${c.consenso_promo ? 'checked' : ''}><span>Promozioni e novità${consAt(c.consenso_promo_at)}</span></label>
        <label class="check"><input type="checkbox" id="c-sumisura" ${c.consenso_su_misura ? 'checked' : ''}><span>Proposte su misura in base ai trattamenti${consAt(c.consenso_su_misura_at)}</span></label>
        <small class="consent-note">Spunta solo se è la cliente a chiederlo (meglio se per iscritto). Se ci ripensa, togli la spunta.</small>
      </fieldset>
      <div class="field full"><label for="c-note">Note <small>(solo per lo studio)</small></label><textarea id="c-note" maxlength="500" placeholder="Preferenze, colori, cose da ricordare. Niente dati sulla salute.">${esc(c.note || '')}</textarea></div>
      <span class="err" id="e-cl"></span>
      <div class="form-actions"><button class="btn btn-gold" type="submit" id="cl-save">${cl.isNew ? 'Crea scheda' : 'Salva modifiche'}</button>
        ${cl.isNew ? '<button type="button" class="link-btn" id="cl-cancel">Annulla</button>' : area.role === 'admin' ? '<button type="button" class="link-btn cl-del" id="cl-del">Elimina cliente</button>' : ''}</div>
    </form>
    ${cl.isNew ? '' : `<div class="cl-hist">
      <p class="lbl">Storico trattamenti</p>
      <form class="cl-visit" id="cl-visit" novalidate>
        <div class="field"><label for="v-date">Giorno</label><input id="v-date" type="date" value="${todayIso()}" max="${todayIso()}"></div>
        <div class="field"><label for="v-treat">Trattamento</label><select id="v-treat">${treatOptions('Aggiungi un trattamento…')}</select></div>
        <ul class="picked full" id="v-picked"></ul>
        <div class="field"><label for="v-price">Importo (€)</label><input id="v-price" inputmode="decimal" placeholder="0" autocomplete="off"></div>
        <div class="field v-go"><button class="btn btn-ghost btn-sm" type="submit">Aggiungi allo storico</button></div>
        <span class="err full" id="e-visit"></span>
      </form>
      <ul class="cl-visits">${hist.length ? hist.map(r => {
        const canDel = r.origine === 'studio' && (area.role === 'admin' || r.created_by === area.uid);
        const fut = r.day > todayIso();
        return `<li><span class="cv-day">${fmtD(r.day)}</span><span class="cv-what">${esc(r.treatments.join(' + '))}</span><span class="cv-p">€${r.price.toLocaleString('it-IT')}</span>
          <span class="cv-tag ${fut ? 'fut' : ''}">${fut ? 'in programma' : r.origine === 'sito' ? 'dal sito' : 'in studio'}</span>${canDel ? `<button type="button" class="link-btn" data-vdel="${r.id}">Togli</button>` : '<span></span>'}</li>`;
      }).join('') : '<li class="cap-note">Ancora nessun trattamento registrato.</li>'}</ul>
    </div>`}`;
  cl.picked = []; renderVisitPicked();
}
function renderVisitPicked() {
  const ul = $('v-picked'); if (!ul) return;
  ul.innerHTML = cl.picked.map((n, i) => `<li><span>${esc(n)}</span><button type="button" aria-label="Togli ${esc(n)}" data-i="${i}">×</button></li>`).join('');
  $('v-price').value = cl.picked.length ? String(cl.picked.reduce((s, n) => s + priceOf(n), 0)) : '';
}

/* filtri ed elenco */
['cl-q', 'cl-tr', 'cl-last', 'cl-cons'].forEach(id => $(id).addEventListener('input', renderClienti));
$('cl-new').addEventListener('click', () => { cl.isNew = true; cl.sel = null; renderClienti(); $('c-nome').focus(); });
$('cl-list').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  cl.sel = b.dataset.id; cl.isNew = false; renderClienti();
  if (matchMedia('(max-width: 900px)').matches) $('cl-card').scrollIntoView({ block: 'start' });
});

/* scheda: salva, elimina, storico */
$('cl-card').addEventListener('submit', async e => {
  e.preventDefault();
  if (e.target.id === 'cl-form') return saveCliente();
  if (e.target.id === 'cl-visit') return addVisit();
});
$('cl-card').addEventListener('change', e => {
  if (e.target.id === 'v-treat' && e.target.value) {
    if (cl.picked.length >= 8) { $('e-visit').textContent = 'Massimo 8 trattamenti per volta.'; return; }
    cl.picked.push(e.target.value); e.target.value = ''; $('e-visit').textContent = ''; renderVisitPicked();
  }
});
$('cl-card').addEventListener('click', async e => {
  const x = e.target.closest('#v-picked button[data-i]');
  if (x) { cl.picked.splice(+x.dataset.i, 1); renderVisitPicked(); return; }
  if (e.target.id === 'cl-cancel') { cl.isNew = false; renderClienti(); return; }
  const del = e.target.closest('#cl-del, [data-vdel]'); if (!del) return;
  if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Confermi?'; return; }
  del.disabled = true;
  if (del.id === 'cl-del') {
    const { error } = await sb.rpc('elimina_cliente', { p_id: cl.sel });
    if (error) { del.disabled = false; say('Non sono riuscita a eliminare la scheda'); return; }
    cl.sel = null; say('Scheda eliminata'); await loadClienti(); loadAgendaDetails();
  } else {
    const { error } = await sb.from('visite').delete().eq('id', del.dataset.vdel);
    if (error) { del.disabled = false; say('Operazione non riuscita, riprova.'); return; }
    say('Tolto dallo storico'); await loadClienti();
  }
});
async function saveCliente() {
  const val = id => $(id).value.trim();
  const f = { nome: val('c-nome'), cognome: val('c-cognome'), telefono: val('c-tel'), nascita: $('c-nascita').value || null,
    consenso_promo: $('c-promo').checked, consenso_su_misura: $('c-sumisura').checked, note: val('c-note') || null };
  const err = m => { $('e-cl').textContent = m; };
  if (!f.nome || !f.cognome) return err('Scrivi nome e cognome.');
  if (normTel(f.telefono).length < 8) return err('Serve un numero di cellulare valido.');
  if (f.nascita && (f.nascita < '1920-01-01' || f.nascita > todayIso())) return err('Controlla la data di nascita.');
  const dup = cl.list.find(c => c.id !== cl.sel && normTel(c.telefono) === normTel(f.telefono));
  if (dup) return err(`Questo numero è già nella scheda di ${dup.nome} ${dup.cognome}.`);
  err(''); $('cl-save').disabled = true;
  const r = cl.isNew
    ? await sb.from('clienti').insert({ ...f, origine: 'studio' }).select('id').single()
    : await sb.from('clienti').update(f).eq('id', cl.sel).select('id').single();
  $('cl-save').disabled = false;
  if (r.error) return err(r.error.code === '23505' ? 'Questo numero è già nella scheda di un\'altra cliente.' : 'Non sono riuscita a salvare. Riprova.');
  const wasNew = cl.isNew;
  cl.sel = r.data.id; cl.isNew = false;
  say(wasNew ? 'Scheda creata' : 'Scheda salvata');
  await loadClienti(); loadAgendaDetails();
}
async function addVisit() {
  const day = $('v-date').value, price = parseAmt($('v-price').value || '0') / 100;
  const err = m => { $('e-visit').textContent = m; };
  if (!day || day > todayIso()) return err('Scegli il giorno (non nel futuro).');
  if (!cl.picked.length) return err('Scegli almeno un trattamento.');
  if (!(price >= 0)) return err('Scrivi un importo valido, ad esempio 18 o 18,50.');
  err('');
  const { error } = await sb.from('visite').insert({ cliente_id: cl.sel, day, treatments: cl.picked, price });
  if (error) return err('Non sono riuscita a salvare. Riprova.');
  say('Aggiunto allo storico'); await loadClienti();
}

/* lista per campagna: solo chi ha dato il consenso giusto */
$('cl-csv').addEventListener('click', () => {
  const rows = clFiltered(), ok = rows.filter(reachable);
  if (!ok.length) { say(rows.length ? 'Nessuna cliente con il consenso necessario in questa lista' : 'Nessuna cliente in questa lista'); return; }
  const d = s => s ? s.split('-').reverse().join('/') : '';
  const cell = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = 'Nome;Cognome;Cellulare;Data di nascita;Ultima visita;Trattamenti fatti\n' + ok.map(c =>
    [c.nome, c.cognome, c.telefono, d(c.nascita), d(c._last), [...c._tr].join(', ')].map(cell).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `Campagna-${todayIso()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  const out = rows.length - ok.length;
  say(`Lista di ${plur(ok.length, 'cliente', 'clienti')}` + (out ? ` (${out} senza consenso escluse)` : ''));
});
