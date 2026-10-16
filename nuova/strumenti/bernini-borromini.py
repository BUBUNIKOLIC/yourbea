#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""BERNINI CONTRO BORROMINI — il giro a tema, 16/10/2026
=========================================================
Vince: «come fosse un documentario di Sky».

Quindi: si apre con una scena, c'è un filo che tiene tutte le tappe — due
uomini, una città, quarant'anni — e ogni tappa finisce con la riga che lancia
la prossima. Fatti concreti al posto degli aggettivi: la data, il committente,
la misura. E quello che è leggenda si dice che è leggenda, perché detto come
vero, al primo che lo verifica, cade tutto il resto.

Il filo fra una tappa e l'altra (`poi`) si dice CAMMINANDO, a pezzi brevi, e
l'app lo butta appena ha da dire qualcosa di più utile: è il racconto della
strada, non della chiesa.

LE DATE, verificate il 16/10/2026 (Wikipedia it, voci Borromini, Bernini,
Sant'Agnese in Agone, San Pietro):
  Palazzo Barberini: Maderno comincia nel 1627, muore nel 1629; il cantiere
    passa a Bernini, con Borromini che vi lavora dal 1625 al 1632 (scala a
    chiocciola, porte del salone, finestre).
  San Carlo alle Quattro Fontane: i trinitari scalzi spagnoli lo incaricano
    nel 1634; ci lavora fino al 1641; la facciata è finita dopo la sua morte.
  Sant'Andrea al Quirinale: Bernini, 1658-1670, per il noviziato dei gesuiti.
  Sant'Ivo alla Sapienza: Borromini dal 1642, chiesa 1643-1662.
  Campanili di San Pietro: alzati dal 1637; il 26 febbraio 1646 Innocenzo X
    ne ordina la demolizione a spese di Bernini.
  Fontana dei Quattro Fiumi: 1648-1651. Il modello d'argento fatto arrivare
    di nascosto al papa è un racconto dei biografi: si dice come tale.
  Sant'Agnese in Agone: progetto di Girolamo Rainaldi, 1652; Borromini
    dirige dal 1653 al 1657; finita nel 1672 da Carlo Rainaldi. La fontana
    è PRIMA della facciata: la leggenda del Nilo non regge, e si racconta
    come leggenda.
  Colonnato di San Pietro: 1657-1667.
  Borromini muore il 2 agosto 1667: la sera prima si era gettato sulla
    propria spada.

Si lancia:  python3 nuova/strumenti/bernini-borromini.py
"""

import json, os, sys, importlib.util

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location(
    'giri', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fai-i-giri.py'))
giri = importlib.util.module_from_spec(spec); spec.loader.exec_module(giri)

# (nome del luogo, scheda, cosa vedere, approfondimento, pezzi del filo verso la tappa dopo)
TAPPE = [
    ("Palazzo Barberini",
     "Comincia qui, e comincia insieme. Nel 1629 muore Carlo Maderno, che questo palazzo lo aveva "
     "impostato, e il cantiere passa a Gian Lorenzo Bernini: ha trentun anni ed è già l'artista del "
     "papa. Accanto a lui lavora Francesco Borromini, un anno più giovane, che per Maderno aveva "
     "disegnato mezzo palazzo. Uno diventa il capo, l'altro resta l'aiuto. Da qui in poi non "
     "lavoreranno quasi mai più dalla stessa parte. Oggi è la Galleria Nazionale d'Arte Antica e si "
     "paga il biglietto.",
     "Le due scale, una per parte. Quella di Bernini è quadrata e larga, fatta per salire in "
     "corteo. Quella di Borromini è ovale, con le colonne a coppie che girano: si sale guardando "
     "in su, e la tromba sembra non finire.",
     "Da manuale: le finestre dell'ultimo piano sono costruite in prospettiva — la cornice si "
     "stringe andando verso l'interno, così il muro sembra più spesso di quanto è. È un trucco "
     "da scenografo applicato a un palazzo, e porta la mano di Borromini. I due lavorarono "
     "insieme qui dal 1629; Borromini al cantiere c'era già dal 1625, quando l'architetto era "
     "Maderno, suo parente. Si aspettava di ereditarne il posto. Ereditò un capo.",
     ["Adesso si scende verso le Quattro Fontane. È la strada che Sisto Quinto fece tirare dritta "
      "da Trinità dei Monti a Santa Maria Maggiore, nel Cinquecento.",
      "In cima all'incrocio c'è una chiesa piccolissima. Gliela diedero nel 1634 i trinitari "
      "scalzi spagnoli, un ordine povero: non potevano pagare quasi niente.",
      "Era la prima volta che Borromini costruiva una cosa sua, senza nessuno sopra. Aveva "
      "trentacinque anni."]),

    ("San Carlo alle Quattro Fontane",
     "Questa è la prima opera di Borromini da solo, e non è grande: si diceva, a Roma, che ci "
     "stesse tutta dentro un pilastro della cupola di San Pietro. I trinitari la commissionarono "
     "nel 1634 e lui ci lavorò fino al 1641, per pochi soldi, in un lotto storto all'incrocio di "
     "due strade. La facciata, quella che ondeggia, la finì alla fine della vita e fu terminata "
     "dopo la sua morte. Si entra dalla strada e non si paga. Duecento passi più giù, vent'anni "
     "dopo, Bernini costruirà la sua chiesa ovale.",
     "La cupola, da sotto. I cassettoni sono croci, ottagoni ed esagoni incastrati, e si "
     "rimpiccioliscono salendo verso la lanterna: la cupola sembra più alta di quanto è. La luce "
     "arriva da finestre che non si vedono, nascoste dietro il cornicione.",
     "Da manuale: Borromini non parte dal cerchio o dal quadrato, come si faceva, ma da due "
     "triangoli affiancati che formano un rombo. Il muro non è più un confine: si piega dentro e "
     "fuori in una sola linea continua, e le colonne stanno dentro l'onda invece che davanti. "
     "Nessuno aveva mai costruito una parete che si comporta come una cosa viva. Bernini, che di "
     "Borromini diceva peste e corna, la chiamava un'architettura fatta per i mostri.",
     ["Duecento passi su questa strada, e si passa da un architetto all'altro.",
      "Bernini qui arriva nel 1658, chiamato dai gesuiti per la chiesa del loro noviziato. A "
      "pagarla è il cardinale Camillo Pamphilj, nipote del papa.",
      "Sono gli anni in cui Bernini ha ripreso tutto in mano. Ma dieci anni prima era quasi "
      "finito: ci arriviamo a Piazza Navona."]),

    ("Sant'Andrea al Quirinale",
     "La chiesa di Bernini, 1658-1670, per i novizi gesuiti. Il lotto era largo e poco profondo: "
     "invece di piegarsi al problema, Bernini gira l'ovale di traverso, con l'asse lungo in "
     "orizzontale. Chi entra si trova già arrivato, davanti all'altare, senza corridoio da fare. "
     "Suo figlio raccontò che da vecchio ci veniva a sedere: diceva che era l'unica sua opera di "
     "cui fosse contento. Si entra dalla strada e non si paga. Duecento passi separano questa "
     "chiesa da quella di prima: una si contorce, questa ti viene incontro.",
     "Sopra l'altare, Sant'Andrea di marmo bianco sale verso il cupolino in mezzo ai raggi dorati, "
     "mentre nel quadro sotto è ancora in croce. La stessa storia raccontata prima in pittura, poi "
     "in scultura, poi in luce vera.",
     "Da manuale: la facciata è un semicerchio di gradini che esce verso la strada, come un "
     "palcoscenico. Bernini era anche uno scenografo: scriveva commedie, costruiva macchine per il "
     "teatro, e sapeva come si fa entrare qualcuno in scena. Borromini costruiva con la geometria; "
     "Bernini costruiva con il punto di vista di chi guarda.",
     ["Adesso si scende verso il centro, un chilometro e mezzo buono.",
      "Nel 1642 Borromini aveva preso il cantiere più strano della sua vita: una chiesa in fondo "
      "al cortile dell'università di Roma, la Sapienza.",
      "Ci lavorò quasi vent'anni. Intanto, a San Pietro, a Bernini stava franando tutto."]),

    ("Sant'Ivo alla Sapienza",
     "In fondo al cortile dell'università vecchia, Borromini costruisce dal 1642 la chiesa degli "
     "studenti. La pianta non è un cerchio né una croce: sono due triangoli sovrapposti, una "
     "stella a sei punte, con i lati che si gonfiano e si incavano. La cupola li segue fino in "
     "cima senza interruzione, cosa che nessuna cupola fa. Si entra dal cortile e non si paga, ma "
     "la chiesa apre poche ore e quasi solo la domenica mattina: il cortile, e la lanterna da "
     "fuori, si vedono anche negli altri giorni.",
     "La lanterna, da fuori: una spirale che sale e si avvita su se stessa, finendo in una "
     "corona di fiamme. Non somiglia a niente di romano; somiglia a una ziggurat, o a una conchiglia.",
     "Da manuale: la stella a sei punte è l'ape dei Barberini letta in geometria, dicono alcuni; "
     "la sapienza divina, dicono altri, che citano il versetto sulla casa dalle sette colonne. "
     "Quello che è certo è che la cupola non si appoggia su un tamburo: parte direttamente dai "
     "muri, che salgono curvandosi, e la stella si vede ancora nel cupolino. È il punto più "
     "lontano che l'architettura europea sia arrivata dalla scatola.",
     ["Da qui a Piazza Navona sono trecento passi, e si cambia storia.",
      "Nel 1637 Bernini aveva cominciato ad alzare un campanile sulla facciata di San Pietro. "
      "Le fondamenta cedettero e il campanile si crepò.",
      "Il 26 febbraio 1646 il papa, Innocenzo Decimo, ordinò di buttarlo giù. A spese di Bernini.",
      "Fu l'unica volta in vita sua che rischiò di finire. Smise di avere commissioni dal papa, "
      "e in città se ne parlava."]),

    ("Fontana dei Quattro Fiumi",
     "1648-1651: è il quadro che rimette in piedi Bernini. Dopo il campanile demolito, il papa "
     "Pamphilj non lo voleva più. Si racconta — è un racconto dei suoi biografi, non un documento "
     "— che un amico gli fece recapitare di nascosto a palazzo un modello d'argento della fontana, "
     "e che Innocenzo Decimo, vedendolo, disse che bisognava proprio chiamarlo. Quattro uomini di "
     "marmo per quattro fiumi, quattro continenti, e in mezzo un obelisco che sta su un blocco "
     "scavato: sembra appoggiato sul vuoto. Si guarda dalla piazza, gratis, a qualunque ora.",
     "Il blocco sotto l'obelisco è traforato: ci si vede attraverso, da parte a parte. Un obelisco "
     "di sedici metri che poggia su un vuoto è la cosa più spavalda che Bernini abbia fatto.",
     "Da manuale: i quattro fiumi sono il Nilo, il Gange, il Danubio e il Rio de la Plata, cioè "
     "Africa, Asia, Europa e America. Il Nilo ha il capo coperto da un velo perché all'epoca non si "
     "sapeva dove nascesse. Bernini scolpì di sua mano pochissimo: fece i modelli e diresse una "
     "squadra, come un regista. La fontana fu inaugurata nel 1651, in piena carestia, e ai romani "
     "non piacque affatto: pane volevano, non obelischi.",
     ["La chiesa che vedi di fronte, con la facciata curva, nel 1651 non c'era ancora.",
      "Il cantiere comincia l'anno dopo, su progetto di Girolamo Rainaldi. Nel 1653 lo prendono "
      "in mano a Borromini.",
      "È l'ultima volta che i due si trovano a pochi metri l'uno dall'altro. E da qui nasce la "
      "storia più raccontata di Roma — che però non regge."]),

    ("Sant'Agnese in Agone",
     "La facciata è di Borromini, che dirige il cantiere dal 1653 al 1657: allarga le due torri, "
     "incava il centro e fa arretrare la facciata, così la cupola si vede tutta dalla piazza. Prima "
     "di lui il progetto era di Girolamo Rainaldi, dopo di lui la finisce suo figlio Carlo, nel "
     "1672. Si entra dalla piazza e non si paga. Qui si racconta che il Nilo della fontana si copra "
     "il volto per non vedere questa facciata, e che il Rio de la Plata alzi il braccio per paura "
     "che crolli: è una leggenda, e le date lo dicono — la fontana è finita nel 1651, la facciata "
     "comincia dopo. Il velo sul Nilo c'era già quando qui non c'era niente da guardare.",
     "La facciata incavata: stai in mezzo alla piazza e la cupola ti viene addosso. Era il punto. "
     "Rainaldi l'aveva disegnata piatta, e la cupola spariva dietro.",
     "Da manuale: la leggenda è nata dopo, nel Settecento, quando ai viaggiatori del Grand Tour si "
     "raccontava la rivalità come una commedia. I fatti veri bastano: Innocenzo Decimo tolse a "
     "Borromini il cantiere nel 1657, dopo la morte del papa i Pamphilj richiamarono i Rainaldi, e "
     "lui si trovò a cinquantotto anni senza il lavoro più in vista di Roma. Bernini, nello stesso "
     "momento, stava per ricevere l'incarico più grande di tutti.",
     ["Da qui a San Pietro sono due chilometri e mezzo, lungo il Tevere.",
      "Nel 1657 il papa nuovo, Alessandro Settimo, chiede a Bernini di chiudere la piazza davanti "
      "alla basilica. Ci lavorerà dieci anni.",
      "Borromini, in quegli stessi dieci anni, finisce poche cose e ne distrugge molte: bruciò i "
      "suoi disegni prima di morire.",
      "La sera del primo agosto 1667 si gettò sulla propria spada. Morì il giorno dopo. Bernini "
      "gli sopravvisse tredici anni, carico di onori."]),

    ("Basilica di San Pietro in Vaticano",
     "Il colonnato è del 1657-1667: due bracci di quattro file di colonne che chiudono la piazza "
     "come due braccia aperte — l'immagine è di Bernini stesso, che la spiegò così al papa. È "
     "l'ultimo atto della storia: mentre qui si alzavano le colonne, a due chilometri Borromini "
     "moriva. Nella basilica si entra senza pagare, dopo i controlli; la cupola e gli scavi hanno "
     "biglietti a parte.",
     "I due dischi di marmo nel selciato, uno per lato dell'obelisco. Mettendoci sopra i piedi, le "
     "quattro file di colonne si allineano e se ne vede una sola: da lì il colonnato sparisce in "
     "profondità.",
     "Da manuale: qui sopra, dal 1637, Bernini aveva alzato il campanile che gli crollò addosso la "
     "carriera. Le colonne di quel campanile furono smontate e rimesse in piedi in due chiese a "
     "Piazza del Popolo. Vent'anni dopo, sulla stessa piazza, gli diedero da fare la cosa che "
     "ancora oggi si vede da mezza Roma. I due non si parlarono mai più. Borromini, in una lettera, "
     "scrisse che chi lo imitava rubava; Bernini, da vecchio, disse che Borromini era stato mandato "
     "a rovinare l'architettura. Camminando questo giro si è passati da un'opera all'altra in venti "
     "minuti: loro ci hanno messo quarant'anni, e non si sono mai perdonati.",
     []),
]


def fai():
    luoghi = {p['n']: p for p in json.load(open(os.path.join(QUI, 'dati', 'luoghi.json'), encoding='utf-8'))}
    tappe, punti = [], []
    for nome, d, i, a, poi in TAPPE:
        p = luoghi.get(nome)
        if not p:
            print('MANCA fra i luoghi: ' + nome, file=sys.stderr)
            return None
        t = {'n': nome, 'la': round(p['lat'], 5), 'lo': round(p['lon'], 5), 'd': d, 'i': i, 'a': a}
        if poi:
            t['poi'] = poi
        tappe.append(t)
        punti.append([p['lat'], p['lon']])
    linea, metri = giri.valhalla(punti)
    if not linea:
        print('niente strada', file=sys.stderr)
        return None
    return {'id': 'bernini-contro-borromini', 'tema': 'architettura',
            'n': 'Bernini contro Borromini — quarant\'anni, una città',
            'citta': 'Roma', 'metri': metri, 't': tappe, 'p': linea}


if __name__ == '__main__':
    dove = os.path.join(QUI, 'dati', 'passeggiate.json')
    tutti = [g for g in json.load(open(dove, encoding='utf-8'))
             if g['id'] != 'bernini-contro-borromini']
    g = fai()
    if not g:
        sys.exit(1)
    tutti.append(g)
    json.dump(tutti, open(dove, 'w', encoding='utf-8'), ensure_ascii=False)
    print('%s: %d tappe, %d m, %d pezzi di filo' %
          (g['id'], len(g['t']), g['metri'], sum(len(t.get('poi', [])) for t in g['t'])), file=sys.stderr)
    print('giri in tutto: %d' % len(tutti), file=sys.stderr)
