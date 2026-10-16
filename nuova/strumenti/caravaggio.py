#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CARAVAGGIO A ROMA E A NAPOLI — i due giri a tema, 16/10/2026
================================================================
Vince: «come primo percorso a tema, Caravaggio a Napoli e Roma».

QUESTE TAPPE SONO STATE VERIFICATE UNA PER UNA, il 16/10/2026, perché i
quadri si spostano e mandare qualcuno a vedere una tela che non c'è più è il
modo peggiore di rovinargli la giornata. Dove sono oggi:

  Roma, in chiesa, ingresso libero:
    Santa Maria del Popolo, cappella Cerasi — Conversione di san Paolo e
      Crocifissione di san Pietro, 1600-1601.
    Sant'Agostino, cappella Cavalletti — Madonna dei Pellegrini, 1604-1606.
    San Luigi dei Francesi, cappella Contarelli — Vocazione e Martirio di
      san Matteo (1599-1600) e San Matteo e l'angelo (1602).
  Roma, nei musei, biglietto:
    Palazzo Barberini — Giuditta e Oloferne, Narciso, San Francesco in
      meditazione, Ritratto di Maffeo Barberini.
    Galleria Borghese — sei quadri nella sala VIII; si entra a turni, su
      prenotazione.
  Napoli:
    Pio Monte della Misericordia — Sette opere di Misericordia, 1607,
      ancora sull'altare per cui fu dipinta. Biglietto della quadreria.
    San Domenico Maggiore — la cappella de Franchis: la Flagellazione NON
      è più qui, dal 1972; al suo posto una copia attribuita ad Andrea
      Vaccaro.
    Gallerie d'Italia, via Toledo 177 — Martirio di sant'Orsola, maggio
      1610, l'ultimo quadro; tornato a Napoli nell'agosto 2025 dopo la
      mostra di Palazzo Barberini. NON è più a Palazzo Zevallos, lasciato
      dal museo nel 2022. Biglietto.
    Capodimonte — Flagellazione di Cristo, 1607, portata qui nel 1972 dopo
      i tentativi di furto. Biglietto, e sta sulla collina, fuori dal centro.

Si lancia:  python3 nuova/strumenti/caravaggio.py
"""

import json, os, sys, importlib.util

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('giri', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fai-i-giri.py'))
giri = importlib.util.module_from_spec(spec); spec.loader.exec_module(giri)

ROMA = [
    ("Santa Maria del Popolo",
     "Nella cappella Cerasi, a sinistra dell'altare maggiore, due tele del 1600-1601 una di fronte "
     "all'altra: la Conversione di san Paolo e la Crocifissione di san Pietro. In mezzo, sull'altare, "
     "l'Assunta di Annibale Carracci: i due modi di dipingere lo stesso anno, uno accanto all'altro. "
     "Si entra dalla piazza e non si paga; la luce delle cappelle spesso si accende con una moneta.",
     "Il cavallo che occupa mezza tela e Paolo rovesciato a terra sotto gli zoccoli, con le braccia "
     "aperte: del miracolo non c'è nessun cielo aperto, solo la luce che lo prende da fuori quadro."),
    ("Basilica di Sant'Agostino",
     "Nella prima cappella a sinistra entrando, la Madonna dei Pellegrini, detta anche Madonna di "
     "Loreto, 1604-1606. La Madonna non è in cielo: sta sulla soglia di casa, appoggiata allo stipite, "
     "con il bambino in braccio e due pellegrini in ginocchio davanti. Si entra dalla piazza e non si paga.",
     "I piedi sporchi dei due pellegrini, in primo piano, grandi come il volto della Madonna: fu quello "
     "a far gridare allo scandalo, perché mette la povertà vera dentro una pala d'altare."),
    ("Chiesa di San Luigi dei Francesi",
     "Nella cappella Contarelli, l'ultima a sinistra prima dell'altare, i tre san Matteo: la Vocazione e "
     "il Martirio, dipinti fra il 1599 e il 1600, e sull'altare San Matteo e l'angelo, del 1602. Fu la "
     "prima commissione pubblica di Caravaggio: aveva ventotto anni e dopo queste tele la pittura romana "
     "non fu più la stessa. Si entra dalla piazza e non si paga.",
     "Nella Vocazione, il fascio di luce che entra da destra e taglia il muro sopra le teste: segue la "
     "mano di Cristo e arriva a Matteo prima delle parole. La finestra dipinta in alto non dà luce: è opaca."),
    ("Palazzo Barberini",
     "Gallerie Nazionali d'Arte Antica: qui si paga il biglietto. Di Caravaggio ci sono Giuditta e "
     "Oloferne, del 1599, il Narciso, che quasi tutti gli danno, il San Francesco in meditazione e il "
     "ritratto di Maffeo Barberini, il cardinale che sarebbe diventato papa Urbano Ottavo.",
     "In Giuditta e Oloferne, la fronte corrugata della ragazza che taglia: non è un'eroina, è una che "
     "sta facendo una cosa difficile e disgustosa, e si scosta indietro mentre la fa."),
    ("Galleria Borghese",
     "Si paga, e si entra a turni, su prenotazione. Nella sala ottava ci sono sei Caravaggio: il Fanciullo "
     "con canestro di frutta, il Bacchino malato, la Madonna dei Palafrenieri, il San Girolamo scrivente, "
     "il San Giovanni Battista e il David con la testa di Golia. Li raccolse il cardinale Scipione "
     "Borghese, che fu il suo collezionista più accanito.",
     "Nel David con la testa di Golia, dipinto intorno al 1610, la testa mozzata che il ragazzo tiene per "
     "i capelli è l'autoritratto di Caravaggio: il quadro era destinato a chi poteva concedergli la grazia."),
]

NAPOLI = [
    ("Pio Monte della Misericordia",
     "Le Sette opere di Misericordia, 1607, sull'altare, nel posto esatto per cui furono dipinte: è "
     "l'unico Caravaggio di Napoli rimasto dove l'ha messo lui. Nel 1613 la congregazione decise che non "
     "si sarebbe potuto vendere a nessun prezzo, ed è per questo che è ancora qui. Si paga il biglietto "
     "della quadreria.",
     "Sette opere di misericordia in un quadro solo, e non in fila: un vicolo di notte, con la luce di "
     "una torcia, e tutto che succede insieme. In alto la Madonna con due angeli si affaccia sulla scena, "
     "come dalla finestra di un palazzo."),
    ("Basilica di San Domenico Maggiore",
     "Nella cappella de Franchis, la prima a sinistra entrando dall'ingresso vero, stava la Flagellazione "
     "di Cristo, dipinta da Caravaggio nel 1607. Dal 1972 il quadro è a Capodimonte, portato al sicuro "
     "dopo tre tentativi di furto, e qui al suo posto c'è una copia attribuita ad Andrea Vaccaro. Nella "
     "chiesa si entra dalla piazza e non si paga; la sagrestia con i sepolcri aragonesi ha un biglietto "
     "a parte ed è un'altra visita.",
     "La cappella com'è: lo spazio, l'altezza e la luce per cui la Flagellazione fu pensata. Il quadro "
     "vero lo si vede a Capodimonte, ma in una sala di museo, non in questa penombra."),
    ("Gallerie d'Italia — Napoli",
     "Via Toledo 177, nel palazzo del Banco di Napoli: dal 2022 il museo sta qui e non più a Palazzo "
     "Zevallos, cento passi più giù. Dentro, il Martirio di sant'Orsola, finito nel maggio 1610: è "
     "l'ultimo quadro di Caravaggio di cui si abbia la data, dipinto poche settimane prima di morire. "
     "Si paga il biglietto.",
     "La freccia è già entrata, e sant'Orsola guarda in basso il proprio petto quasi incuriosita; il re "
     "unno che l'ha scoccata ha ancora la mano tesa. Dietro, l'uomo con la bocca aperta che allunga il "
     "collo per vedere è l'autoritratto del pittore."),
    ("Museo e Real Bosco di Capodimonte",
     "La Flagellazione di Cristo, 1607, dipinta per la cappella de Franchis in San Domenico Maggiore e "
     "portata qui nel 1972 per metterla al sicuro: dall'ultimo riordino sta da sola in una sala, a metà "
     "del secondo piano. Si paga il biglietto, e il museo è sulla collina, fuori dal centro: da via "
     "Toledo ci sono più di tre chilometri in salita.",
     "I tre aguzzini non picchiano: tengono. Uno lega, uno tira i capelli, uno si china a preparare le "
     "verghe, e il corpo di Cristo scivola verso il basso al centro della tela, nell'unico punto illuminato."),
]


def fai(ident, tema, titolo, citta, luoghi_per_nome, elenco):
    tappe, punti = [], []
    for nome, d, i in elenco:
        p = luoghi_per_nome.get(nome)
        if not p:
            print('MANCA fra i luoghi: ' + nome, file=sys.stderr)
            return None
        tappe.append({'n': nome, 'la': round(p['lat'], 5), 'lo': round(p['lon'], 5), 'd': d, 'i': i})
        punti.append([p['lat'], p['lon']])
    linea, metri = giri.valhalla(punti)
    if not linea:
        print('niente strada per ' + ident, file=sys.stderr)
        return None
    return {'id': ident, 'tema': tema, 'n': titolo, 'citta': citta, 'metri': metri,
            't': tappe, 'p': linea}


if __name__ == '__main__':
    luoghi = {p['n']: p for p in json.load(open(os.path.join(QUI, 'dati', 'luoghi.json'), encoding='utf-8'))}
    tutti = json.load(open(os.path.join(QUI, 'dati', 'passeggiate.json'), encoding='utf-8'))
    tutti = [g for g in tutti if not g['id'].startswith('caravaggio-')]

    fatti = []
    r = fai('caravaggio-roma', 'arte', 'Caravaggio a Roma — le chiese e i due musei', 'Roma', luoghi, ROMA)
    if r: fatti.append(r)
    n = fai('caravaggio-napoli', 'arte', 'Caravaggio a Napoli — dall\'altare al museo', 'Napoli', luoghi, NAPOLI)
    if n: fatti.append(n)

    for g in fatti:
        print('%-22s %d tappe, %d m — %s' % (g['id'], len(g['t']), g['metri'], g['n']), file=sys.stderr)
    json.dump(tutti + fatti, open(os.path.join(QUI, 'dati', 'passeggiate.json'), 'w', encoding='utf-8'),
              ensure_ascii=False)
    print('giri in tutto: %d' % (len(tutti) + len(fatti)), file=sys.stderr)
