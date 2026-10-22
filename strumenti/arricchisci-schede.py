#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ARRICCHISCI LE SCHEDE — Yourbea, 21/10/2026
   ============================================================
   «Non basta leggere la pagina Wikipedia: serve un'audiodescrizione
   orientativa — dimensioni, forme, materiali.» La critica e' giusta: una
   nostra scheda vera diceva «Gli Scogli Castelluccio sono delle isole
   dell'Italia site nel mar Ionio. Amministrativamente appartengono al
   comune di Siracusa» — a uno fermo li' davanti, niente.

   PERCHE' NON WIKIDATA. Misurato il 21/10 sulle 63.214 chiese italiane:
   altezza su 10, materiale su 89, stile sul 10%. Quella strada e' morta.

   PERCHE' IL WIKITESTO, E NON L'ARTICOLO LEGGIBILE. Noi usavamo
   l'INCIPIT (exintro), che e' il riassunto e non dice mai di che e' fatta
   una cosa. Il testo intero ce l'ha, ma Wikipedia ne da' UNO PER
   RICHIESTA — lo dice lei stessa: «exlimit was too large for a whole
   article extracts request». Settemila monumenti sarebbero settemila
   richieste.
   Il wikitesto invece si prende CINQUANTA PER VOLTA, e in piu' ha le
   schede laterali, dove i campi sono gia' separati:
     Basilica di Massenzio -> altezza 35 m, larghezza 65 m, lunghezza 100 m
     Torre del Mangia      -> altezza 88 metri, materiale muratura, marmo
   E LE MISURE A TERRA VALGONO PIU' DELL'ALTEZZA: «larga sessanta passi»
   si cammina, trentacinque metri in su no.

   COSA AGGIUNGE AI QUADRETTI, senza toccare quello che c'e' gia':
     h    altezza in metri (numero)
     mat  materiali, al massimo due
     frm  forme riconoscibili, al massimo tre
   Il campo «d» resta la storia, e diventa quello che si sente dicendo
   «ancora».

   PIANO. Wikimedia blocca per decine di minuti se la si martella, e
   blocca TUTTO (anche Wikipedia, non solo Wikidata). Qui si aspetta un
   minuto, poi due, fino a sette, e venti secondi fra una citta' e
   l'altra: ci mette ore, ma arriva in fondo invece di saltare mezza
   Italia.

   Si lancia:  python3 -I strumenti/arricchisci-schede.py firenze pisa
               python3 -I strumenti/arricchisci-schede.py --tutte
"""
import json
import math, os, re, sys, time, urllib.error, urllib.parse, urllib.request

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATI = os.path.join(QUI, 'nuova', 'dati', 'cultura')
CITTA = os.path.join(QUI, 'strumenti', 'citta-italiane.txt')
AGENTE = 'Yourbea/1.0 (guida per non vedenti; descrizioni orientative)'

# L'ALTEZZA: solo quando e' detta chiaro. «alta 68 metri», «altezza di 45 m».
# Mai «circa», mai una stima: REGOLA 6, quello che non si sa non si dice.
ALTEZZA = re.compile(r'(?:alt[oa]|altezza)\s+(?:di\s+)?(\d{1,3}(?:[,.]\d+)?)\s*(?:metri|m\b)', re.I)
# IL MATERIALE: le parole che uno toccherebbe.
# «pietra» puo' avere un aggettivo, ma non uno qualunque: prendendo la
# parola dopo, da «su un rialzo di pietra delimitato da...» usciva il
# materiale «pietra delimitato». Si elencano le pietre che esistono.
MATERIA = re.compile(r'\b(travertino|marmo|marmorea|marmoreo|mattoni|laterizio|cotto|tufo|'
                     r'pietra\s+(?:calcarea|arenaria|serena|lavica|vulcanica|locale|bianca|'
                     r'rossa|grigia|viva|da\s+taglio|squadrata|a\s+vista)|'
                     r'pietra|granito|calcare|cemento|legno|bronzo|ferro|vetro|intonaco)\b', re.I)
# DI COSA E' FATTA SI DICE QUANDO IL TESTO PARLA DI COME E' COSTRUITA.
# «E' situata su un rialzo di pietra» non dice che la chiesa e' di pietra:
# dice che ci sta sopra. Si prende il materiale solo dalla frase che parla
# davvero della costruzione, e mai da una che parla di dove POGGIA.
COSTRUITA = re.compile(r'\b(costru|edific|eret|realizz|rivest|rifatt|innalz|'
                       r'fabbric|murat|facciat|parament|struttur|interamente|'
                       r'rivestiment|material)', re.I)
POGGIA = re.compile(r'\b(rialzo|basamento|sagrato|zoccolo|pavimento|piazzale|'
                    r'scalinata|poggia|sorge su|situata su|situato su)\b', re.I)
# LA FORMA: i pezzi che si riconoscono stando davanti.
# «facciata» non si raccoglie piu': ce l'hanno tutti gli edifici e non
# distingue niente (vedi parti/descrizione.js).
FORMA = re.compile(r'\b(cupola|campanile|torre|portico|colonne|navate|navata|'
                   r'arcate|loggia|rosone|guglia|scalinata|abside|gradini)\b', re.I)

# I CAMPI DELLA SCHEDA LATERALE. Il valore non deve cominciare con «|»
# (sarebbe il campo dopo, con quello vuoto) ne' contenere un «=»: con
# l'espressione larga usciva   larghezza = "|NomeComune = [[Pisa]]".
CAMPO = re.compile(r'^\s*\|\s*(altezza|larghezza|lunghezza|materiale|materiali|piani)\s*=\s*'
                   r'([^|=\n]{1,80})\s*$', re.I | re.M)

def numero(t):
    """«88 metri», «35 m», «2630» (centimetri), «26,30 m» -> metri"""
    t = re.sub(r'<ref.*', '', str(t)).replace('[[', '').replace(']]', '').strip()
    # «250px» E' LA FOTO, NON LA CHIESA. Nel riquadro «Edificio religioso»
    # il campo Larghezza dice quanto e' grande l'immagine: 250px diventava
    # 250, che sembrando troppo grande veniva letto in centimetri, e usciva
    # «la chiesa di Sant'Anastasio, larga due metri e mezzo». Lo stesso per
    # i nomi dei file.
    if re.search(r'\d\s*px\b', t, re.I):
        return None
    if re.search(r'\.(?:jpg|jpeg|png|svg|gif|webp|tif)\b', t, re.I):
        return None
    m = re.search(r'(\d{1,5}(?:[.,]\d+)?)', t)
    if not m:
        return None
    try:
        v = float(m.group(1).replace('.', '').replace(',', '.')) if m.group(1).count(',') else float(m.group(1).replace(',', '.'))
    except ValueError:
        return None
    # LE UNITA' NON SONO SCRITTE SEMPRE. La Fontana di Trevi ha «2630», che
    # sono centimetri: 26,30 metri. Sopra i 180 metri in Italia non c'e'
    # quasi niente, quindi un numero cosi' grande e' quasi sempre in cm.
    if 'cm' in t.lower() or v > 180:
        v = v / 100.0
    if not (2 <= v <= 180):
        return None
    return round(v, 1)

def chiedi(url, prove=12):
    """CON IL 429 NON SI INSISTE A DUE SECONDI. Il 21/10 Wikidata ci ha
       chiusi fuori — «HTTP Error 429: Please try again later» su tutt'e
       tre le citta' — perche' l'avevamo martellata misurando. Il 429 non
       e' un guasto: e' «aspetta». Quindi si aspetta sul serio invece di
       riprovare cinque volte in dieci secondi e dichiarare morto un
       servizio che sta benissimo.
       MA SI ASCOLTA QUANTO DICE DI ASPETTARE. Il mezzo minuto fisso era
       tarato su Wikidata, che chiude fuori per ore; l'API di Wikipedia
       nell'intestazione `Retry-After` dice lei stessa quanti secondi
       servono, e di solito sono pochi. Aspettare sessanta secondi quando
       ne bastano tre e' come averlo fatto apposta: il 22/10 questo
       lavoro e' rimasto fermo due ore senza scrivere una scheda."""
    for n in range(prove):
        try:
            r = urllib.request.Request(url, headers={'User-Agent': AGENTE})
            return json.load(urllib.request.urlopen(r, timeout=90))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                dice = 0
                try:
                    dice = int((e.headers or {}).get('Retry-After') or 0)
                except Exception:
                    dice = 0
                attesa = dice if dice > 0 else min(10 * (n + 1), 300)
                print('      429: aspetto %d secondi' % attesa, flush=True)
                time.sleep(attesa)
                continue
            if n == prove - 1:
                raise RuntimeError('non risponde dopo %d prove: %s' % (prove, e))
            time.sleep(3 * (n + 1))
        except Exception as e:
            if n == prove - 1:
                raise RuntimeError('non risponde dopo %d prove: %s' % (prove, e))
            time.sleep(3 * (n + 1))
    raise RuntimeError('non risponde: sempre 429, si riprova piu\' tardi')

def leggiCitta():
    fuori = []
    for riga in open(CITTA, encoding='utf-8'):
        riga = riga.strip()
        if not riga or riga.startswith('#'):
            continue
        p = riga.split()
        if len(p) >= 5:
            fuori.append((p[0], float(p[1]), float(p[2]), float(p[3]), float(p[4])))
    return fuori

def titoliNelRiquadro(lo1, lo2, la1, la2, giu=0):
    """NOME, COORDINATE E TITOLO DELL'ARTICOLO — e non piu' da Wikidata.

       Il 22/10 questo lavoro e' rimasto fermo DUE ORE a prendere 429 da
       `query.wikidata.org` e ad aspettare sessanta secondi in cerchio:
       zero schede fatte, e nel quaderno solo «429: aspetto 60 secondi».
       Wikidata Query Service e' un servizio di ricerca pesante e chiude
       fuori chi lo interroga di fila; noi gli chiedevamo una cosa che
       Wikipedia stessa da' subito.
       `list=geosearch` dell'API di it.wikipedia risponde in mezzo secondo,
       da nome, coordinate e titolo in un colpo solo — e sono gia' solo le
       voci che un articolo italiano ce l'hanno, che era poi il motivo per
       cui si passava da Wikidata.
       L'UNICO limite e' cinquecento voci per richiesta: dove si tocca il
       tetto il riquadro si taglia in quattro e si rifa, fino a prenderle
       tutte. Nel centro di Roma ce ne sono piu' di cinquecento, ed e'
       esattamente li' che non ne vogliamo perdere nessuna."""
    TETTO = 500
    mezLa, mezLo = (la1 + la2) / 2.0, (lo1 + lo2) / 2.0
    # il raggio che copre tutto il riquadro: la meta' della diagonale
    altezza = (la2 - la1) * 111320.0
    larghezza = (lo2 - lo1) * 111320.0 * math.cos(math.radians(mezLa))
    raggio = int(math.hypot(altezza, larghezza) / 2) + 50
    raggio = max(10, min(10000, raggio))        # l'API accetta da 10 a 10.000 metri
    url = ('https://it.wikipedia.org/w/api.php?action=query&format=json&list=geosearch'
           '&gscoord=%.5f%%7C%.5f&gsradius=%d&gslimit=%d' % (mezLa, mezLo, raggio, TETTO))
    # UN RESPIRO E MEZZO FRA UNA RICHIESTA E L'ALTRA. Cinquecento voci
    # per volta sono una domanda cara, e un riquadro denso si taglia in
    # quattro e poi in sedici: a raffica Wikipedia risponde 429 e ci fa
    # aspettare cinquanta secondi — molto piu' del respiro che chiedeva.
    time.sleep(1.5)
    voci = chiedi(url).get('query', {}).get('geosearch', [])
    if len(voci) >= TETTO and giu < 3:
        # tetto toccato: si taglia in quattro e si rifa, se no qui si perde roba
        fuori, visti = [], set()
        for (a1, a2) in ((la1, mezLa), (mezLa, la2)):
            for (o1, o2) in ((lo1, mezLo), (mezLo, lo2)):
                for x in titoliNelRiquadro(o1, o2, a1, a2, giu + 1):
                    if x['art'] in visti:
                        continue
                    visti.add(x['art'])
                    fuori.append(x)
        return fuori
    fuori = []
    for v in voci:
        # il riquadro e' un rettangolo, la ricerca un cerchio: si buttano
        # gli angoli di troppo, che appartengono al riquadro del vicino
        if not (la1 <= v['lat'] <= la2 and lo1 <= v['lon'] <= lo2):
            continue
        fuori.append({'n': v['title'], 'art': v['title'],
                      'lat': round(v['lat'], 5), 'lon': round(v['lon'], 5)})
    return fuori

# QUELLO CHE NON E' FATTO DI NIENTE. Una piazza non e' «di mattoni e
# legno», e un parco non ha le navate: l'articolo parla di quello che ci
# sta INTORNO, e noi lo attribuivamo alla piazza. Uscivano frasi che
# suonavano bene e dicevano il falso — «la piazza dell'Indipendenza: di
# ferro» — ed e' peggio che tacere, perche' chi non vede si fida.
APERTI = re.compile(r'\b(piazza|piazzale|largo|parco|giardin|via|viale|corso|strada|'
                    r'lungomare|fiume|lago|isola|quartiere|rione|contrada|belvedere)\b', re.I)
# LE FORME DI CHIESA sono di chiesa. Un museo non ha un campanile e una
# navata: quelle parole stavano nell'articolo perche' parlava della chiesa
# della contrada, non del museo.
DI_CHIESA = {'navate', 'navata', 'abside', 'campanile', 'rosone', 'guglia', 'cupola'}
MURATURA = {'travertino', 'marmo', 'mattoni', 'laterizio', 'tufo', 'granito',
            'calcare', 'pietra', 'pietra calcarea', 'muratura'}
DOVE_VALE_TUTTO = re.compile(r'\b(ponte|viadotto|grattacielo|stazione|padiglione|serra)\b', re.I)
# I CONTENITORI parlano di quello che hanno dentro, non di se stessi: «il
# Museo della Cattedrale di Lucca. Ha una torre» — la torre e' della
# cattedrale. Da questi non si prende nessuna forma.
CONTENITORI = re.compile(r'\b(museo|galleria|pinacoteca|collezione|biblioteca|archivio|'
                         r'fondazione|istituto|centro|complesso)\b', re.I)
SACRI = re.compile(r'\b(chiesa|basilica|cattedrale|duomo|battistero|oratorio|santuario|'
                   r'pieve|abbazia|monastero|convento|cappella|collegiata|tempio)\b', re.I)

def viaIlCodice(wikitesto):
    """PRIMA DI LEGGERE, SI BUTTA QUELLO CHE NON E' SCRITTO PER ESSERE
       LETTO. Misurato il 22/10 su Lucca, prima di lanciare il lavoro su
       tutta Italia: alla chiesa di Sant'Anastasio stavamo per scrivere
       «larga 2,5 metri» e «ha una torre». Larga due metri e mezzo, una
       chiesa. Il numero veniva da `Larghezza = 250px`, che e' quanto e'
       grande la FOTO nel riquadro dei dati, e la torre dal nome del
       file: `Chiesa di Sant'Anastasio e torre guinigi.JPG` — la torre e'
       nella fotografia, non nella chiesa.
       Il riquadro, i nomi dei file, le note e le tabelle sono codice:
       hanno le parole giuste nel posto sbagliato, ed e' il modo piu'
       facile di scrivere una cosa falsa che suona vera. A chi non vede
       queste descrizioni servono per capire cosa ha davanti, e si fida.
       Qui resta solo la prosa."""
    t = wikitesto
    t = re.sub(r'<!--.*?-->', ' ', t, flags=re.S)
    t = re.sub(r'<ref[^>]*/>', ' ', t)
    t = re.sub(r'<ref.*?</ref>', ' ', t, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    # i riquadri {{...}}, anche uno dentro l'altro: si sbucciano da fuori
    for _ in range(12):
        nuovo = re.sub(r'\{\{[^{}]*\}\}', ' ', t)
        if nuovo == t:
            break
        t = nuovo
    # le tabelle
    for _ in range(6):
        nuovo = re.sub(r'(?s)\{\|(?:(?!\{\||\|\}).)*\|\}', ' ', t)
        if nuovo == t:
            break
        t = nuovo
    # le immagini, col testo che si portano dietro
    for _ in range(6):
        nuovo = re.sub(r'(?is)\[\[\s*(?:file|immagine|image|media)\s*:(?:[^\[\]]|\[\[[^\]]*\]\])*\]\]', ' ', t)
        if nuovo == t:
            break
        t = nuovo
    # i link restano, ma senza parentesi: [[Lucca|la citta]] -> la citta
    t = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]|]*)\]\]', r'\1', t)
    t = t.replace("'''", "").replace("''", "")
    t = re.sub(r'[ \t]+', ' ', t)
    return t

def soloIncipit(wikitesto):
    """L'INCIPIT PARLA DEL SOGGETTO; il resto dell'articolo parla d'altro —
       la storia della citta', le opere dentro, la contrada. Pescando da
       tutto uscivano materiali e forme di cose vicine, non di questa."""
    corpo = re.split(r'\n==', viaIlCodice(wikitesto), 1)[0]
    return corpo

def dalTestoPieno(testo, nome='', tipo=''):
    """quello che serve a chi non vede: prima la scheda laterale, poi l'incipit"""
    fuori = {}
    # SI GUARDA NOME *E* TIPO. Guardando solo il nome, «piazza Tolomei»
    # — dove «piazza» sta nel TIPO e il nome e' solo «Tolomei» — passava
    # il filtro e si prendeva «una facciata piatta».
    tutto = (nome or '') + ' ' + (tipo or '')
    aperto = bool(APERTI.search(tutto)) or bool(CONTENITORI.search(tutto))
    sacro = bool(SACRI.search(tutto))
    # 1. LA SCHEDA LATERALE, dove i campi sono gia' separati. Si guarda qui
    #    per prima: «altezza = 35 m» e' un dato, «alta trentacinque metri»
    #    dentro un paragrafo e' una frase da interpretare.
    scheda = {}
    for k, v in CAMPO.findall(testo):
        k = k.lower().replace('materiali', 'materiale')
        if k not in scheda:
            scheda[k] = v.strip()
    for campo, chiave in (('altezza', 'h'), ('larghezza', 'l'), ('lunghezza', 'p')):
        if campo in scheda:
            v = numero(scheda[campo])
            if v:
                fuori[chiave] = v
    if 'materiale' in scheda:
        mats = []
        for pezzo in re.split(r'[,;/]| e ', scheda['materiale']):
            k = pezzo.strip().lower().replace('[[', '').replace(']]', '')
            if MATERIA.search(k) and k not in mats:
                mats.append(MATERIA.search(k).group(1).lower())
            if len(mats) >= 2:
                break
        if mats:
            fuori['mat'] = mats

    # 2. L'INCIPIT, per quello che la scheda non aveva
    incipit = soloIncipit(testo)
    if 'h' not in fuori:
        m = ALTEZZA.search(incipit)
        if m:
            v = numero(m.group(1))
            if v:
                fuori['h'] = v
    mat, visti = list(fuori.get('mat', [])), set(fuori.get('mat', []))
    for frase in ([] if aperto else re.split(r'(?<=[.;])\s+', incipit)):
        if not COSTRUITA.search(frase) or POGGIA.search(frase):
            continue
        for x in MATERIA.findall(frase):
            k = x.lower().strip()
            if k not in visti:
                visti.add(k); mat.append(k)
            if len(mat) >= 2:
                break
        if len(mat) >= 2:
            break
    # DI COSA E' FATTA, non cosa viene nominato. In una chiesa il ferro e'
    # un cancello, il vetro una vetrata, il legno un coro: il testo li
    # nomina e noi li prendevamo per struttura — «la chiesa di Santa
    # Rosalia: di ferro». Con un'espressione non si distingue «e' fatto
    # di» da «ha un cancello in»: provato il 21/10, il filtro piu' stretto
    # teneva lo stesso il ferro del Teatro Grande e buttava i mattoni del
    # Ponte della Liberta'. Allora si cambia criterio: per una cosa
    # storica i materiali veri sono quelli di MURATURA. Dove il ferro e il
    # vetro sono davvero struttura — i ponti, le stazioni — valgono tutti.
    if mat and not DOVE_VALE_TUTTO.search(tutto):
        mat = [m for m in mat if any(m.startswith(k) or k.startswith(m) for k in MURATURA)]
    if mat:
        # «di pietra e pietra calcarea» e' la stessa cosa detta due volte:
        # se uno e' l'inizio dell'altro, si tiene il piu' preciso.
        puliti = []
        for a in mat:
            if any(a != b and (b.startswith(a) or a.startswith(b)) and len(b) > len(a) for b in mat):
                continue
            puliti.append(a)
        fuori['mat'] = puliti[:2]
    frm, visti2 = [], set()
    for x in ([] if aperto else FORMA.findall(incipit)):
        k = x.lower()
        if k in DI_CHIESA and not sacro:
            continue            # un museo non ha le navate
        if k not in visti2:
            visti2.add(k); frm.append(k)
        if len(frm) >= 3:
            break
    if frm:
        fuori['frm'] = frm
    return fuori

def testiPieni(titoli):
    """il WIKITESTO, cinquanta per volta (vedi la spiegazione in cima)"""
    fuori = {}
    for i in range(0, len(titoli), 50):
        mucchio = titoli[i:i + 50]
        url = ('https://it.wikipedia.org/w/api.php?action=query&format=json&prop=revisions'
               '&rvprop=content&rvslots=main&redirects=1&titles=' + urllib.parse.quote('|'.join(mucchio)))
        try:
            d = chiedi(url)['query']
        except Exception:
            time.sleep(2); continue
        rimandi = {r['from']: r['to'] for r in d.get('redirects', [])}
        perTitolo = {}
        for p in d.get('pages', {}).values():
            try:
                perTitolo[p['title']] = p['revisions'][0]['slots']['main']['*']
            except (KeyError, IndexError):
                pass
        for t in mucchio:
            testo = perTitolo.get(rimandi.get(t, t), '')
            if testo:
                fuori[t] = testo
        time.sleep(1.5)          # non si martella Wikipedia
    return fuori

def testiPuliti(titoli):
    """LA SCHEDA, in prosa gia' pulita. «E aggiorna tutte le schede»
       (Vince, 22/10): 9.224 luoghi su 20.836 non avevano nessun testo.
       Qui NON si usa il wikitesto: provato il 22/10, la didascalia di una
       foto finiva dentro la frase — «File Panorama dalla Torre del Mangia
       jpg miniatura in questa immagine possiamo notare…» — e letta a voce
       a chi non vede sarebbe oscena. L'API degli estratti con `exintro`
       da' la prosa gia' pulita, VENTI PAGINE PER RICHIESTA: niente
       marcature da togliere, quindi niente marcature dimenticate."""
    fuori = {}
    for i in range(0, len(titoli), 20):
        mucchio = titoli[i:i + 20]
        url = ('https://it.wikipedia.org/w/api.php?action=query&format=json&prop=extracts'
               '&exintro=1&explaintext=1&exlimit=20&redirects=1&titles=' +
               urllib.parse.quote('|'.join(mucchio)))
        try:
            d = chiedi(url)['query']
        except Exception:
            time.sleep(2); continue
        rimandi = {r['from']: r['to'] for r in d.get('redirects', [])}
        perTitolo = {p['title']: p.get('extract', '') for p in d.get('pages', {}).values()}
        for t in mucchio:
            testo = perTitolo.get(rimandi.get(t, t), '')
            if testo:
                fuori[t] = ' '.join(testo.split())[:700]
        time.sleep(1.5)
    return fuori

def quadretto(lat, lon):
    return '%04d_%04d' % (int(lat * 100), int(lon * 100))

def vicini(a, b):
    return abs(a['lat'] - b['lat']) < 0.0006 and abs(a['lon'] - b['lon']) < 0.0006

def stessoNomeEVicino(a, b):
    """IL NOME VALE SOLO DA VICINO. Dentro un riquadro da undici chilometri
       ci stanno due «chiesa di San Giuseppe», e prendendo l'articolo per
       nome si attaccava la descrizione di una all'altra: e' lo stesso
       sbaglio che il 21/10 aveva fatto sparire 1.790 monumenti. Entro due
       chilometri e' la stessa cosa segnata due volte; piu' in la' e' un
       altro posto che si chiama uguale."""
    if a['n'] != b.get('n'):
        return False
    return abs(a['lat'] - b['lat']) < 0.018 and abs(a['lon'] - b['lon']) < 0.024

def faiLaCitta(nome, lo1, lo2, la1, la2):
    print('  %s: chiedo a Wikipedia...' % nome, flush=True)
    schede = titoliNelRiquadro(lo1, lo2, la1, la2)
    print('    %d voci con un articolo' % len(schede), flush=True)
    if not schede:
        return (0, 0, 0, 0)
    testi = testiPieni([x['art'] for x in schede])
    print('    %d wikitesti presi' % len(testi), flush=True)
    schede2 = testiPuliti([x['art'] for x in schede])
    print('    %d schede in prosa prese' % len(schede2), flush=True)

    perQuadretto = {}
    for x in schede:
        t = testi.get(x['art'])
        if not t:
            continue
        perQuadretto.setdefault(quadretto(x['lat'], x['lon']), []).append((x, t))

    toccati = conH = conMat = conFrm = 0
    nuoveSchede = [0]
    for q, elenco in perQuadretto.items():
        f = os.path.join(DATI, q + '.json')
        if not os.path.exists(f):
            continue
        dati = json.load(open(f, encoding='utf-8'))
        lista = dati if isinstance(dati, list) else list(dati.values())[0]
        for (x, testo) in elenco:
            for y in lista:
                if vicini(x, y) or stessoNomeEVicino(x, y):
                    roba = dalTestoPieno(testo, x['n'], y.get('t', ''))
                    # LA SCHEDA A CHI NON CE L'HA. Non si tocca quella che
                    # c'e' gia': si riempie solo il vuoto. 9.224 luoghi su
                    # 20.836 non avevano nessun testo.
                    if not y.get('d'):
                        nuova = schede2.get(x['art'])
                        if nuova and len(nuova) > 40:
                            y['d'] = nuova
                            nuoveSchede[0] += 1
                    # via i campi vecchi: se adesso un dato non c'e' piu',
                    # non deve restare quello sbagliato di prima
                    for k in ('h', 'l', 'p', 'mat', 'frm'):
                        y.pop(k, None)
                    if not roba:
                        break
                    y.update(roba)
                    toccati += 1
                    conH += 1 if 'h' in roba else 0
                    conMat += 1 if 'mat' in roba else 0
                    conFrm += 1 if 'frm' in roba else 0
                    break
        json.dump(dati, open(f, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('    schede nuove scritte: %d' % nuoveSchede[0], flush=True)
    return (toccati, conH, conMat, conFrm)

def tuttaItalia():
    """TUTTA ITALIA, non solo i centri storici. «E aggiorna tutte le
       schede» (Vince, 22/10). Le citta' d'arte coprivano 1.276 luoghi su
       20.836: il resto — i paesi, le frazioni, le chiese di campagna —
       restava senza. Si guardano i NOSTRI dati e si interrogano solo i
       riquadri dove abbiamo qualcosa da arricchire: duecento riquadri da
       undici chilometri invece di tremila da uno."""
    import collections
    zone = collections.Counter()
    for g in sorted(os.listdir(DATI)):
        if not g.endswith('.json'):
            continue
        try:
            d = json.load(open(os.path.join(DATI, g), encoding='utf-8'))
        except Exception:
            continue
        v = d if isinstance(d, list) else list(d.values())[0]
        for x in v:
            if x.get('h') or x.get('l') or x.get('mat') or x.get('frm'):
                continue
            zone[(int(x['lat'] * 10), int(x['lon'] * 10))] += 1
    # prima i riquadri dove c'e' piu' roba: se si interrompe, si e' fatto il grosso
    ordinate = sorted(zone.items(), key=lambda t: -t[1])
    fuori = []
    for ((la, lo), quanti) in ordinate:
        fuori.append(('%d_%d (%d luoghi)' % (la, lo, quanti),
                      lo / 10.0, lo / 10.0 + 0.1, la / 10.0, la / 10.0 + 0.1))
    return fuori

if __name__ == '__main__':
    quali = [a for a in sys.argv[1:] if not a.startswith('-')]
    if '--tutta' in sys.argv:
        citta = tuttaItalia()
        print('TUTTA ITALIA: %d riquadri da fare' % len(citta))
        T = H = M = F = 0
        for (nome, lo1, lo2, la1, la2) in citta:
            try:
                t, h, m, f = faiLaCitta(nome, lo1, lo2, la1, la2)
            except Exception as e:
                print('  %s: NON FATTO — %s' % (nome, e), flush=True)
                continue
            T += t; H += h; M += m; F += f
            print('    arricchite %d (totale %d)' % (t, T), flush=True)
            time.sleep(5)       # geosearch non chiede l'elemosina come faceva Wikidata
        print('')
        print('TOTALE: %d schede arricchite — altezza %d, materiale %d, forma %d' % (T, H, M, F))
        sys.exit(0)
    citta = leggiCitta()
    if '--tutte' not in sys.argv and quali:
        citta = [c for c in citta if c[0] in quali]
    elif '--tutte' not in sys.argv:
        print('dimmi quali citta, o --tutte. Ce ne sono %d.' % len(citta))
        sys.exit(1)
    T = H = M = F = 0
    for (nome, lo1, lo2, la1, la2) in citta:
        try:
            t, h, m, f = faiLaCitta(nome, lo1, lo2, la1, la2)
        except Exception as e:
            print('  %s: NON FATTA — %s' % (nome, e), flush=True)
            continue
        T += t; H += h; M += m; F += f
        time.sleep(20)           # fra una citta' e l'altra si respira DAVVERO
        print('    arricchite %d schede (altezza %d, materiale %d, forma %d)' % (t, h, m, f), flush=True)
    print('')
    print('TOTALE: %d schede arricchite — altezza %d, materiale %d, forma %d' % (T, H, M, F))
