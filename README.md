# L'Estetique · Bellezza e Benessere di Paola Parisio

Sito dello studio estetico a San Giorgio del Sannio (BN), pubblicato con GitHub Pages:
ogni modifica al ramo `main` va online in automatico.

## Come è organizzato

Il sito è diviso in **moduli**, uno per sezione della pagina. Ogni modulo ha la sua cartella
in `src/moduli/` con l'HTML, gli stili (CSS) e, se serve, il codice (JS).

| Modulo | Cosa contiene |
|---|---|
| `base/` | colori, caratteri, pulsanti, campi dei moduli, notifiche; `core.js` (funzioni comuni), `avvio.js` (accensione della pagina), `supabase.js` (collegamento a database e login) |
| `header/` | barra in alto: logo, menu, lucchetto dell'area riservata, Prenota |
| `hero/` | apertura: titolo, presentazione e scheda "Prima disponibilità" |
| `passaparola/` | promo "Una coccola per te" in stile flyer |
| `trattamenti/` | le sei categorie con il prezzo di partenza |
| `listino/` | listino prezzi a schede (genera anche le schede dei trattamenti) |
| `prenota/` | prenotazione: trattamento, giorno, orario, conferma, "Le tue prenotazioni" |
| `contatti/` | WhatsApp, telefono, indirizzo, orari con "aperto adesso" |
| `privacy/` | informativa privacy e cookie |
| `area-riservata/` | login, agenda, registro di cassa; `utenti.js` per le schede Utenti e Attività |
| `footer/` | dati dello studio e link privacy |

Altri file in `src/`:

- `pagina.html` — lo scheletro: dice in che ordine compaiono i moduli
- `dati/listino.json` — trattamenti, **prezzi** e durate (in minuti, usate per le prenotazioni)
- `dati/popolarita.json` — quante volte è stato fatto ogni trattamento (stelline "più richiesti")
- `config.json` — indirizzo e chiave pubblica di Supabase
- `img/` — logo, monogramma, illustrazione del flyer, icona WhatsApp

## Come si aggiorna

1. Modifica il modulo o il file di dati che ti interessa.
2. Esegui `python3 build.py`: rimette insieme i moduli e scrive `index.html`.
3. Pubblica `index.html` (commit e push su `main`).

`index.html` è generato: non va modificato a mano, perché alla prossima costruzione verrebbe sovrascritto.

## Altro

- `fonts/` — caratteri ospitati sul sito (licenza SIL OFL, vedi `fonts/OFL-LICENSE.txt`)
- `vendor/supabase.js` — libreria supabase-js 2.117.3 (licenza MIT)
- Prenotazioni, agenda e registro di cassa usano Supabase; l'area riservata richiede il login.
  Nel repository non ci sono dati delle clienti né del registro di cassa.
