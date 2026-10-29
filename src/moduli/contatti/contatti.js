/* Orari: settimana con oggi evidenziato e stato aperto/chiuso */
(function () {
  const NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const fmt = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;
  function render() {
    const now = new Date(), wd = now.getDay(), m = nowMin();
    $('week').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const bl = HOURS[d];
      return `<li class="${d === wd ? 'today' : ''}"><span class="d">${NAMES[d]}${d === wd ? '<em>Oggi</em>' : ''}</span><span class="h${bl ? '' : ' closed'}">${bl ? bl.map(([a, b]) => `<span class="b">${fmt(a)}–${fmt(b)}</span>`).join('') : 'Chiuso'}</span></li>`;
    }).join('');
    const cur = (HOURS[wd] || []).find(([a, b]) => m >= a && m < b);
    let txt;
    if (cur) txt = `Aperto · fino alle ${fmt(cur[1])}`;
    else {
      let found = null;
      for (let i = 0; i < 8 && !found; i++) {
        const d = (wd + i) % 7, bl = HOURS[d] || [];
        const nx = bl.find(([a]) => i > 0 || a > m);
        if (nx) found = { i, d, t: nx[0] };
      }
      txt = found ? `Chiuso · riapre ${found.i === 0 ? 'oggi' : found.i === 1 ? 'domani' : NAMES[found.d].toLowerCase()} alle ${fmt(found.t)}` : 'Chiuso';
    }
    $('openPill').className = 'open-pill' + (cur ? ' on' : '');
    $('openPill').querySelector('span').textContent = txt;
  }
  render(); setInterval(render, 60000);
})();
