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
CSS_ORDER = ['base', 'header', 'hero', 'passaparola', 'trattamenti', 'slider', 'listino', 'prenota',
             'contatti', 'privacy', 'area-riservata', 'footer', 'mobile']
# Ordine degli script (conta: alcuni usano funzioni e dati definiti nei precedenti)
JS_ORDER = ['base/core', 'listino/listino', 'prenota/prenota', 'area-riservata/area-riservata',
            'area-riservata/utenti', 'area-riservata/clienti', 'hero/hero', 'slider/slider', 'base/avvio', 'base/supabase', 'contatti/contatti']

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


SOCIAL = [('instagram', 'Instagram'), ('facebook', 'Facebook'), ('tiktok', 'TikTok')]
ARROW = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 16 8M9 8h7v7" fill="none" '
         'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')


def social_icon(key):
    """Icona ufficiale messa da Enzo in src/img/social/ (instagram.svg/.png ...), come data URI; None se manca."""
    for ext, mime in (('svg', 'image/svg+xml'), ('png', 'image/png')):
        f = os.path.join(SRC, 'img', 'social', f'{key}.{ext}')
        if os.path.exists(f):
            with open(f, 'rb') as fh:
                return f'data:{mime};base64,' + base64.b64encode(fh.read()).decode()
    return None


def social_links(cls):
    """Link ai profili in dati/social.json (solo semplici link, nessun contenuto incorporato).
    Con l'icona in img/social/ compare l'icona, altrimenti il nome. Senza indirizzo: non cliccabile, «presto»."""
    path = os.path.join(SRC, 'dati', 'social.json')
    data = json.loads(read(path)) if os.path.exists(path) else {}
    items, waiting = [], 0
    for key, name in SOCIAL:
        url, icon = data.get(key, '').strip(), social_icon(key)
        live = url.startswith('https://')
        waiting += not live
        if icon:
            img = f'<img src="{icon}" alt="" width="40" height="40">'
            items.append(f'<a class="soc-ico" href="{url}" target="_blank" rel="noopener" aria-label="{name}" title="{name}">{img}</a>' if live
                         else f'<span class="soc-ico soon" role="img" aria-label="{name}, profilo in arrivo" title="{name} · presto">{img}</span>')
        else:
            items.append(f'<a href="{url}" target="_blank" rel="noopener">{name}{ARROW}</a>' if live
                         else f'<span class="soon">{name}<small>presto</small></span>')
    note = '<small class="soon-note">presto</small>' if waiting == len(SOCIAL) and all(social_icon(k) for k, _ in SOCIAL) else ''
    label = 'Seguimi su' if cls == 'ct-social' else 'Seguimi'
    return f'<div class="{cls}"><span>{label}</span><nav aria-label="Profili social">{"".join(items)}</nav>{note}</div>'


def seo(cfg):
    """Indirizzo canonico, anteprima per i social, dati strutturati per Google (attività locale) e codici di verifica."""
    url = cfg.get('site_url', '').strip()
    out = []
    if url:
        out.append(f'<link rel="canonical" href="{url}">')
        out.append('<meta property="og:type" content="website">')
        out.append(f'<meta property="og:url" content="{url}">')
    out.append('<meta property="og:title" content="L\'Estetique · Bellezza e Benessere di Paola Parisio">')
    out.append('<meta property="og:description" content="Centro estetico a San Giorgio del Sannio (BN): mani e piedi, unghie, epilazione, massaggi, viso e make-up. Prenota online.">')
    out.append('<meta property="og:locale" content="it_IT">')
    if cfg.get('verifica_google', '').strip():
        out.append(f'<meta name="google-site-verification" content="{cfg["verifica_google"].strip()}">')
    if cfg.get('verifica_bing', '').strip():
        out.append(f'<meta name="msvalidate.01" content="{cfg["verifica_bing"].strip()}">')
    day = lambda d: 'https://schema.org/' + d
    data = {
        '@context': 'https://schema.org', '@type': 'BeautySalon',
        'name': "L'Estetique, Bellezza e Benessere di Paola Parisio", 'alternateName': "L'Estetique",
        'telephone': '+39 393 007 6415', 'priceRange': '€',
        'address': {'@type': 'PostalAddress', 'streetAddress': 'Via Mario Lanzotti, 1', 'postalCode': '82018',
                    'addressLocality': 'San Giorgio del Sannio', 'addressRegion': 'BN', 'addressCountry': 'IT'},
        'openingHoursSpecification': [
            {'@type': 'OpeningHoursSpecification', 'dayOfWeek': [day(d) for d in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')], 'opens': '09:00', 'closes': '13:00'},
            {'@type': 'OpeningHoursSpecification', 'dayOfWeek': [day(d) for d in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')], 'opens': '15:00', 'closes': '19:00'},
            {'@type': 'OpeningHoursSpecification', 'dayOfWeek': day('Saturday'), 'opens': '09:00', 'closes': '13:00'}],
    }
    if url:
        data['url'] = url
    out.append('<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>')
    return '\n'.join(out)


def write_sitemap(cfg):
    """sitemap.xml e robots.txt (con l'indirizzo della mappa) per Google e Bing."""
    url = cfg.get('site_url', '').strip()
    if not url:
        return
    import datetime
    today = datetime.date.today().isoformat()
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               f'  <url><loc>{url}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n'
               '</urlset>\n')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write(sitemap)
    with open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write(f'User-agent: *\nAllow: /\n\nSitemap: {url}sitemap.xml\n')


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

    page = (page.replace('{{SEO}}', seo(cfg)).replace('{{FONTS}}', fonts_css())
                .replace('{{LOGO}}', img_uri('logo.png')).replace('{{MONO}}', img_uri('mono.png')).replace('{{ART}}', img_uri('art.png'))
                .replace('{{WA_ICON_JS}}', json.dumps(wa)).replace('{{WA_ICON}}', wa)
                .replace('{{SOCIAL_CONTATTI}}', social_links('ct-social')).replace('{{SOCIAL_FOOTER}}', social_links('foot-social'))
                .replace('{{DATA}}', json.dumps(listino(), ensure_ascii=False))
                .replace('{{SUPA_URL}}', cfg.get('supabase_url', '')).replace('{{SUPA_KEY}}', cfg.get('supabase_key', '')))
    left = sorted(set(re.findall(r'\{\{[A-Z_:a-z-]+\}\}', page)))
    if left:
        raise SystemExit('Segnaposto non sostituiti: ' + ', '.join(left))
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    write_sitemap(cfg)
    print(f'index.html scritto ({len(page) // 1024} KB)')


if __name__ == '__main__':
    build()
