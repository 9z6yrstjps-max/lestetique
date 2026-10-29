/* ---------- Collegamento a Supabase ---------- */
async function refreshSlots() {
  if (!sb) return;
  try {
    if (area.ok) {
      const { data, error } = await sb.from('slots').select('id,day,start_min,end_min,kind,note').gte('day', todayIso()).order('day').order('start_min');
      if (error) throw error;
      state.slots = data.map(r => ({ id: r.id, date: r.day, start: r.start_min, end: r.end_min, kind: r.kind, note: r.note }));
    } else {
      const to = iso(new Date(Date.now() + (DAYS_AHEAD + 2) * 864e5));
      const { data, error } = await sb.rpc('busy_slots', { p_from: todayIso(), p_to: to });
      if (error) throw error;
      state.slots = data.map(r => ({ date: r.day, start: r.start_min, end: r.end_min }));
    }
    if (state.mode !== 'live') { setMode('live'); }
    setStatus('live', 'Disponibilità aggiornata');
  } catch {
    if (state.mode !== 'live') setStatus('warn', 'Orari indicativi: Paola conferma su WhatsApp');
  }
  renderDays(); renderTimes(); renderHeroNext();
  if (area.ok) {
    const n = state.slots.filter(s => s.date === todayIso() && s.kind === 'booking').length;
    $('areaBadge').hidden = !n; $('areaBadge').textContent = n; $('areaBadge').title = n + ' appuntamenti oggi';
    if (area.view === 'agenda' && !$('riservata').hidden) renderAgenda();
  }
}
async function loadAgendaDetails() {
  const cols = 'id,slot_id,day,start_min,name,phone,treatments,price,notes,status,incassato';
  let { data, error } = await sb.from('bookings').select(cols + ',cliente_id').gte('day', todayIso());
  if (error) ({ data, error } = await sb.from('bookings').select(cols).gte('day', todayIso()));   // database non ancora aggiornato
  if (error) return;
  area.bookings = {};
  data.forEach(b => { if (b.slot_id) area.bookings[b.slot_id] = { ...b, date: b.day, start: b.start_min, price: Number(b.price) }; });
  if (area.view === 'agenda' && !$('riservata').hidden) renderAgenda();
}
async function enterArea(session) {
  if (!session) { area.ok = false; showLogin(); return; }
  let { data: prof, error: profErr } = await sb.rpc('my_profile');
  if (profErr) { const r = await sb.rpc('my_role'); prof = r.data ? [{ role: r.data, name: null }] : []; }   // database non ancora aggiornato
  const role = prof && prof[0] && prof[0].role, myName = prof && prof[0] && prof[0].name;
  if (!role) { setLocked('Accesso non autorizzato', "Questo account non ha ancora un ruolo. Chiedi all'amministratore di assegnartelo."); $('loginForm').hidden = true; $('logoutBtn').hidden = false; return; }
  area.ok = true; area.role = role; area.uid = session.user.id; area.email = session.user.email || '';
  $('areaTitle').textContent = myName ? 'Ciao ' + myName : 'Bentornato';
  $('roleNote').textContent = (role === 'admin' ? 'Amministratore' : 'Editor') + ' · ' + area.email;
  $('areaLink').classList.add('is-admin'); $('logoutBtn').hidden = false; $('loginForm').hidden = true;
  await refreshSlots(); await loadAgendaDetails(); loadCassa();
  if (!$('riservata').hidden) renderArea();
}
function showLogin() {
  $('locked').hidden = false; $('areaTabs').hidden = true; VIEWS.forEach(v => { $('view-' + v).hidden = true; });
  $('roleNote').textContent = ''; $('areaTitle').textContent = 'Area riservata';
  $('lockedTitle').textContent = 'Accedi'; $('lockedText').textContent = "Riservata allo studio: agenda e registro di cassa.";
  $('loginForm').hidden = false; $('logoutBtn').hidden = true;
}
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('l-email').value.trim(), password = $('l-pass').value;
  if (!email || !password) { $('e-login').textContent = 'Scrivi email e password.'; return; }
  $('e-login').textContent = ''; $('loginBtn').disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  $('loginBtn').disabled = false;
  if (error) { $('e-login').textContent = 'Email o password non corrette.'; return; }
  $('l-pass').value = ''; enterArea(data.session);
});
$('forgotBtn').addEventListener('click', async () => {
  const email = $('l-email').value.trim();
  if (!email) { $('e-login').textContent = 'Scrivi prima la tua email, poi premi di nuovo.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '?reset=1#area-riservata' });
  $('e-login').textContent = error ? 'Non sono riuscita a inviare l\'email. Riprova tra poco.' : 'Ti ho mandato un\'email con il link per scegliere una nuova password.';
});
$('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); area.ok = false; area.role = null; area.view = 'agenda'; area.cassa = {}; area.bookings = {}; $('areaLink').classList.remove('is-admin'); $('areaBadge').hidden = true; showLogin(); refreshSlots(); });
$('newPassForm').addEventListener('submit', async e => {
  e.preventDefault();
  const p = $('n-pass').value;
  if (p.length < 8) { $('e-newpass').textContent = 'Usa almeno 8 caratteri.'; return; }
  const { error } = await sb.auth.updateUser({ password: p });
  if (error) { $('e-newpass').textContent = 'Non sono riuscita a salvare la password. Richiedi un nuovo link.'; return; }
  $('newPassForm').hidden = true; history.replaceState(null, '', location.pathname + '#area-riservata'); say('Password aggiornata');
  const { data } = await sb.auth.getSession(); enterArea(data.session);
});

(async () => {
  if (!sb) { setLocked('Area riservata', 'Il collegamento al database non è ancora configurato.'); return; }
  refreshSlots(); refreshMine();
  setInterval(refreshSlots, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshSlots(); if (area.ok) loadAgendaDetails(); } });
  const reset = new URLSearchParams(location.search).get('reset');
  const { data } = await sb.auth.getSession();
  if (reset && data.session) { location.hash = '#area-riservata'; $('locked').hidden = false; $('lockedTitle').textContent = 'Nuova password'; $('lockedText').textContent = 'Scegli la nuova password per entrare.'; $('loginForm').hidden = true; $('newPassForm').hidden = false; return; }
  enterArea(data.session);
})();
