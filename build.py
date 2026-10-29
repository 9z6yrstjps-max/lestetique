"""
Costruisce il sito di L'Estetique a partire dai moduli in src/.

    python3 build.py        ->  scrive index.html (il file che GitHub Pages pubblica)

Struttura:
  src/pagina.html              scheletro della pagina: indica dove va ogni modulo
  src/moduli/<nome>/           un modulo per sezione: <nome>.html, <nome>.css e (se serve) <nome>.js
  src/dati/listino.json        trattamenti, prezzi e durate
  src/dati/popolarita.json     quante volte è stato fatto ogni trattamento (stelline "più richiesti")
  src/config.json              indirizzo e chiave pubblica di Supabase
  src/img/                     logo, monogramma, illustrazione del flyer, icona WhatsApp
"""
import base64, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
MOD = os.path.join(SRC, 'moduli')

# Ordine in cui si sommano gli stili (conta: quelli dopo possono ritoccare quelli prima)
CSS_ORDER = ['base', 'header', 'hero', 'passaparola', 'trattamenti', 'listino', 'prenota',
             'contatti', 'privacy', 'area-riservata', 'footer']
# Ordine degli script (conta: alcuni usano funzioni e dati definiti nei precedenti)
JS_ORDER = ['base/core', 'listino/listino', 'prenota/prenota', 'area-riservata/area-riservata',
            'area-riservata/utenti', 'hero/hero', 'base/avvio', 'base/supabase', 'contatti/contatti']

FONT_FACES = [('Cormorant Garamond', 'normal', 500, 'cormorant-garamond-latin-500-normal'),
              ('Cormorant Garamond', 'normal', 600, 'cormorant-garamond-latin-600-normal'),
              ('Cormorant Garamond', 'italic', 500, 'cormorant-garamond-latin-500-italic'),
              ('Montserrat', 'normal', 400, 'montserrat-latin-400-normal'),
              ('Montserrat', 'normal', 500, 'montserrat-latin-500-normal'),
              ('Montserrat', 'normal', 600, 'montserrat-latin-600-normal'),
              ('Pinyon Script', 'normal', 400, 'pinyon-script-latin-400-normal')]


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()


def img_uri(name):
    with open(os.path.join(SRC, 'img', name), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()


def listino():
    """Converte listino.json nel formato usato dagli script della pagina, con stelline di popolarità."""
    raw = json.loads(read(SRC, 'dati', 'listino.json'))
    pop = json.loads(read(SRC, 'dati', 'popolarita.json'))
    out = []
    for c in raw['categorie']:
        cat = {'id': c['id'], 'short': c['titolo_breve'], 'name': c['titolo'], 'icon': c['icona'],
               'desc': c['descrizione'], 'groups': []}
        if c.get('nota_in_fondo'):
            cat['foot'] = c['nota_in_fondo']
        for g in c['gruppi']:
            grp = {'name': g['gruppo'], 'items': []}
            if g.get('note'):
                grp['note'] = g['note']
            for t in g['trattamenti']:
                n = 0 if c['id'] == 'uomo' else pop.get(t['nome'], 0)   # il registro non distingue i clienti uomini
                stars = 3 if n >= 100 else 2 if n >= 40 else 1 if n >= 15 else 0
                grp['items'].append({'name': t['nome'], 'price': t['prezzo'], 'min': t['minuti'], 'pop': n, 'stars': stars})
            cat['groups'].append(grp)
        out.append(cat)
    return out


def fonts_css():
    return '<style>' + '\n'.join(
        f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};font-display:swap;src:url(fonts/{f}.woff2) format('woff2')}}"
        for fam, st, w, f in FONT_FACES) + '</style>'


def build():
    cfg = json.loads(read(SRC, 'config.json')) if os.path.exists(os.path.join(SRC, 'config.json')) else {}
    wa = read(SRC, 'img', 'whatsapp.svg').strip()
    page = read(SRC, 'pagina.html')

    css = '\n'.join(read(MOD, m, m + '.css') for m in CSS_ORDER)
    js = '\n'.join(f'/* ===== {name}.js ===== */\n' + read(MOD, name + '.js') for name in JS_ORDER)
    page = page.replace('{{CSS}}', css).replace('{{JS}}', js)
    page = re.sub(r'\{\{MODULO:([a-z-]+)\}\}', lambda m: read(MOD, m.group(1), m.group(1) + '.html').rstrip('\n'), page)

    page = (page.replace('{{FONTS}}', fonts_css())
                .replace('{{LOGO}}', img_uri('logo.png')).replace('{{MONO}}', img_uri('mono.png')).replace('{{ART}}', img_uri('art.png'))
                .replace('{{WA_ICON_JS}}', json.dumps(wa)).replace('{{WA_ICON}}', wa)
                .replace('{{DATA}}', json.dumps(listino(), ensure_ascii=False))
                .replace('{{SUPA_URL}}', cfg.get('supabase_url', '')).replace('{{SUPA_KEY}}', cfg.get('supabase_key', '')))
    left = sorted(set(re.findall(r'\{\{[A-Z_:a-z-]+\}\}', page)))
    if left:
        raise SystemExit('Segnaposto non sostituiti: ' + ', '.join(left))
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    print(f'index.html scritto ({len(page) // 1024} KB)')


if __name__ == '__main__':
    build()
