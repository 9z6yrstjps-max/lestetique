/* Durata leggibile: 45 min, 1 h, 1 h 30 */
const durata = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) : ''}`;

/* Categorie: card + tab */
const cats = document.getElementById('cats');
const tabs = document.getElementById('tabs');
const menu = document.getElementById('menu');
LISTINO.forEach((c, i) => {
  const all = c.groups.flatMap(g => g.items);
  const min = Math.min(...all.map(x => x.price));
  const a = document.createElement('a');
  a.className = 'cat'; a.href = '#listino';
  a.innerHTML = `<span class="cat-ico">${ICONS[c.icon]}</span><h3>${c.name}</h3><p>${c.desc}</p><div class="cat-meta"><span>${all.length} trattament${all.length===1?'o':'i'}</span><span>da <strong>€${min}</strong></span></div>`;
  a.addEventListener('click', () => select(i));
  cats.appendChild(a);

  const b = document.createElement('button');
  b.className = 'tab'; b.type = 'button'; b.role = 'tab'; b.id = 'tab-' + c.id;
  b.setAttribute('aria-controls', 'menu');
  b.textContent = c.short;
  b.addEventListener('click', () => select(i));
  tabs.appendChild(b);
});
function select(i){
  const c = LISTINO[i];
  [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', i === j ? 'true' : 'false'));
  menu.setAttribute('aria-labelledby', 'tab-' + c.id);
  menu.innerHTML = `<div class="groups">${c.groups.map(g => `
    <div class="group">${g.name ? `<h3>${g.name}${g.note ? `<small>${g.note}</small>` : ''}</h3>` : ''}
      <ul class="items">${g.items.map(x => `<li><span class="n">${x.name}${x.min ? `<small class="d">${durata(x.min)}</small>` : ''}</span><span class="dots"></span><span class="p">${eur(x.price)}</span></li>`).join('')}</ul>
    </div>`).join('')}</div>
    ${c.foot ? `<div class="menu-note">${c.foot}</div>` : ''}
    <p class="menu-dur">Le durate sono indicative e possono variare da persona a persona.</p>`;
}
tabs.addEventListener('keydown', e => {
  const btns = [...tabs.children]; const k = btns.indexOf(document.activeElement);
  if (k < 0) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const n = (k + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
    btns[n].focus(); select(n); e.preventDefault();
  }
});
select(0);
