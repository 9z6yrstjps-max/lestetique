const PHONE = "393930076415";
const SUPA_URL = '{{SUPA_URL}}', SUPA_KEY = '{{SUPA_KEY}}';
const sb = (window.supabase && /^https:\/\//.test(SUPA_URL)) ? window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;
const LISTINO = {{DATA}};

const ICONS = {
  mani:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M17 44V22a4 4 0 0 1 8 0v4"/><path d="M25 26v-9a4 4 0 0 1 8 0v15c0 7-4 12-10 12"/><path d="M17 30c-3-2-7-1-7 3 0 3 4 7 7 11"/><path d="M27.5 10.5c0-2 1-3.5 1.5-3.5s1.5 1.5 1.5 3.5"/></svg>',
  cera:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M24 6c6 8 10 14 10 20a10 10 0 0 1-20 0c0-6 4-12 10-20z"/><path d="M19 28a5 5 0 0 0 5 5"/></svg>',
  corpo:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><ellipse cx="24" cy="36" rx="14" ry="5"/><ellipse cx="24" cy="27" rx="10" ry="4"/><ellipse cx="24" cy="19.5" rx="6.5" ry="3"/><path d="M24 6v6"/></svg>',
  viso:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M24 6c-8 0-13 6-13 15 0 10 6 20 13 20s13-10 13-20c0-9-5-15-13-15z"/><path d="M18 22c1.5 1 3 1 4 0M26 22c1.5 1 3 1 4 0M21 32c2 1.5 4 1.5 6 0"/></svg>',
  makeup:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M20 44V24h8v20z"/><path d="M21 24V14l6-6v16"/><path d="M18 34h12"/></svg>',
  uomo:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M24 4c6 8 10 14 10 20a10 10 0 0 1-20 0c0-6 4-12 10-20z"/><path d="M30 38l8 6M18 38l-8 6"/></svg>'
};

const eur = n => '<span>€</span>' + n;


/* Copia */
const toast = document.getElementById('toast');
let tt;
function say(t){ toast.textContent = t; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2200); }
function selectText(el){ const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
async function copy(text, el, okMsg){
  try { await navigator.clipboard.writeText(text); say(okMsg); }
  catch { if (el) selectText(el); say('Testo selezionato: copialo dal menu del telefono'); }
}
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy, document.getElementById('phoneTxt'), 'Numero copiato')));
document.getElementById('yr').textContent = new Date().getFullYear();
const WA_ICON = {{WA_ICON_JS}};
