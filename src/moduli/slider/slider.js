/* ---------- Slider di apertura: hero e trattamenti ----------
   Scorre da solo ogni 8 secondi (la barretta sotto fa da timer: quando si riempie si passa alla slide dopo).
   Si ferma col mouse sopra o col tasto pausa; con "riduci movimento" attivo non scorre da solo. */
const V = { i: 0, slides: [...$('vTrack').children] };
function vGo(i) {
  V.i = (i + V.slides.length) % V.slides.length;
  $('vTrack').style.transform = `translateX(${-100 * V.i}%)`;
  V.slides.forEach((s, k) => { const on = k === V.i; s.inert = !on; s.setAttribute('aria-hidden', String(!on)); });
  [...$('vDots').children].forEach((b, k) => b.setAttribute('aria-current', String(k === V.i)));
}
$('vPrev').addEventListener('click', () => vGo(V.i - 1));
$('vNext').addEventListener('click', () => vGo(V.i + 1));
$('vDots').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) vGo(+b.dataset.s); });
$('vDots').addEventListener('animationend', () => { if (!$('vetrina').classList.contains('stopped')) vGo(V.i + 1); });
$('vPlay').addEventListener('click', () => {
  const stop = !$('vetrina').classList.toggle('stopped') ? false : true;
  $('vPlay').setAttribute('aria-label', stop ? 'Riprendi lo scorrimento automatico' : 'Ferma lo scorrimento automatico');
  if (!stop) vGo(V.i + 1);
});
['mouseenter', 'focusin'].forEach(ev => $('vetrina').addEventListener(ev, () => $('vetrina').classList.add('hold')));
$('vetrina').addEventListener('mouseleave', () => $('vetrina').classList.remove('hold'));
$('vetrina').addEventListener('focusout', e => { if (!$('vetrina').contains(e.relatedTarget)) $('vetrina').classList.remove('hold'); });
/* swipe col dito */
let vTouch = null;
$('vTrack').addEventListener('touchstart', e => { const t = e.touches[0]; vTouch = [t.clientX, t.clientY]; }, { passive: true });
$('vTrack').addEventListener('touchend', e => {
  if (!vTouch) return; const t = e.changedTouches[0], dx = t.clientX - vTouch[0], dy = t.clientY - vTouch[1]; vTouch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) vGo(V.i + (dx < 0 ? 1 : -1));
});
/* i link del menu portano alla slide giusta */
function vFromHash(h) { if (h === '#trattamenti') vGo(1); else if (h === '#home') vGo(0); }
addEventListener('hashchange', () => vFromHash(location.hash));
document.addEventListener('click', e => {
  const a = e.target.closest('a[href="#trattamenti"], a[href="#home"]');
  if (a && location.hash === a.getAttribute('href')) vFromHash(location.hash);
});
vGo(0); vFromHash(location.hash);
