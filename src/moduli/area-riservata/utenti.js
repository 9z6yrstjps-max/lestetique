/* ---------- Permessi, utenti e attività ---------- */
const romeDay = ts => new Date(ts).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
function canDelete(x) { return area.role === 'admin' || (x.cb && x.cb === area.uid && x.at && romeDay(x.at) === romeDay(Date.now())); }
const ROLE_LABEL = { admin: 'Amministratore', editor: 'Editor' };
let usersCache = [];
async function loadUsers() {
  const { data, error } = await sb.rpc('staff_list');
  if (error) { $('usersBody').innerHTML = '<tr><td colspan="4" class="cap-note">Non riesco a leggere gli utenti.</td></tr>'; return; }
  usersCache = data;
  $('usersBody').innerHTML = data.map(u => {
    const me = u.user_id === area.uid;
    const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'mai';
    return `<tr><td><input class="name-in" data-name="${u.user_id}" value="${esc(u.name || '')}" placeholder="${u.role ? 'Nome' : '—'}" ${u.role ? '' : 'disabled'} maxlength="40" aria-label="Nome di ${esc(u.email)}"></td><td><b>${esc(u.email)}</b>${me ? ' <span class="tag">tu</span>' : ''}</td><td>${last}</td><td>
      <select data-user="${u.user_id}" ${me ? 'disabled title="Non puoi cambiare il tuo ruolo"' : ''} aria-label="Ruolo di ${esc(u.email)}">
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Amministratore</option>
        <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
        <option value="" ${!u.role ? 'selected' : ''}>Nessun accesso</option>
      </select></td></tr>`;
  }).join('');
}
$('usersBody').addEventListener('change', async e => {
  const n = e.target.closest('input[data-name]');
  if (n) {
    const { error } = await sb.rpc('set_name', { p_user: n.dataset.name, p_name: n.value });
    say(error ? 'Non sono riuscita a salvare il nome' : 'Nome salvato');
    if (!error && n.dataset.name === area.uid) $('areaTitle').textContent = n.value.trim() ? 'Ciao ' + n.value.trim() : 'Bentornato';
    return;
  }
  const s = e.target.closest('select[data-user]'); if (!s) return;
  s.disabled = true;
  const { error } = await sb.rpc('set_role', { p_user: s.dataset.user, p_role: s.value || null });
  say(error ? 'Non sono riuscita a cambiare il ruolo' : 'Ruolo aggiornato');
  loadUsers();
});
const act = { rows: [], off: 0 };
const shortD = d => d ? parseIso(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
function emailOf(id) { const u = usersCache.find(x => x.user_id === id); return u ? u.email : 'un utente'; }
function describe(a) {
  const d = a.data || {}, o = a.old_data || {}, x = a.data || a.old_data || {};
  if (a.entity === 'cassa') {
    const what = `${x.t === 'uscita' ? "un'uscita" : "un'entrata"} di ${money(x.a)}${x.s ? ` (${esc(x.s)})` : ''} del ${shortD(x.d)}`;
    return (a.action === 'insert' ? 'Ha registrato ' : a.action === 'delete' ? 'Ha eliminato ' : 'Ha modificato ') + what;
  }
  if (a.entity === 'slots') {
    const when = x.start_min === 0 && x.end_min >= 1440 ? `tutto il giorno ${shortD(x.day)}` : `${shortD(x.day)}, ${hm(x.start_min)}–${hm(x.end_min)}`;
    return (a.action === 'insert' ? 'Ha bloccato ' : 'Ha sbloccato ') + when + (x.note ? ` · ${esc(x.note)}` : '');
  }
  if (a.entity === 'bookings') {
    const b = `${esc(x.name)}, ${shortD(x.day)} alle ${hm(x.start_min)}`;
    if (a.action === 'insert') return `Nuova prenotazione: ${b} · ${esc((x.treatments || []).join(' + '))}`;
    if (d.status !== o.status) return d.status === 'annullata dalla cliente' ? `Prenotazione annullata dalla cliente: ${b}` : `Ha annullato la prenotazione di ${b}`;
    if (d.incassato && !o.incassato) return `Ha registrato l'incasso della prenotazione di ${b}`;
    return `Ha modificato la prenotazione di ${b}`;
  }
  if (a.entity === 'staff') {
    const who = esc(emailOf(x.user_id));
    if (a.action === 'delete') return `Ha tolto l'accesso a ${who}`;
    if (a.action === 'update' && d.role === o.role && d.name === o.name) return `Ha confermato ${who} come ${ROLE_LABEL[d.role] || d.role}`;
    if (a.action === 'update' && d.role === o.role) return `Ha impostato il nome di ${who}: ${esc(d.name || '—')}`;
    return `Ha impostato ${who} come ${ROLE_LABEL[d.role] || d.role}`;
  }
  return `${a.action} ${a.entity}`;
}
async function loadActivity(reset) {
  if (reset) { act.rows = []; act.off = 0; if (!usersCache.length) { const r = await sb.rpc('staff_list'); if (!r.error) usersCache = r.data; } }
  const { data, error } = await sb.from('audit').select('id,at,email,action,entity,data,old_data').order('id', { ascending: false }).range(act.off, act.off + 49);
  if (error) { $('actList').innerHTML = '<li class="cap-note">Non riesco a leggere il registro delle attività.</li>'; return; }
  act.rows.push(...data); act.off += data.length;
  $('actMore').hidden = data.length < 50;
  $('actList').innerHTML = act.rows.length ? act.rows.map(a => {
    const when = new Date(a.at).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const who = a.email || (a.entity === 'bookings' ? 'Cliente dal sito' : 'Sistema');
    return `<li class="act-${a.entity}"><span class="act-when">${when}</span><span class="act-who">${esc(who)}</span><span class="act-what">${describe(a)}</span></li>`;
  }).join('') : '<li class="cap-note">Ancora nessuna attività registrata.</li>';
}
$('actMore').addEventListener('click', () => loadActivity(false));
$('actReload').addEventListener('click', () => loadActivity(true));
