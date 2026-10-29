/* ---------- Avvio ---------- */
renderPicked();
$('b-date').value = todayIso(); $('b-date').min = todayIso();
$('f-nascita').max = todayIso();
$('m-date').value = todayIso(); $('m-date').max = todayIso();
setType('entrata');
setMode('whatsapp'); setStatus('warn', 'Orari indicativi: Paola conferma su WhatsApp');
renderHeroNext();
setLocked('Area riservata', 'Caricamento…');
route();
