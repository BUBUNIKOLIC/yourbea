#!/usr/bin/env python3
"""Taglia i luoghi di una città in quadretti da un centesimo di grado.

Un centesimo di grado è poco più di un chilometro. Con quadretti doppi, a
Napoli il più grande arrivava a 1,2 MB: troppo da scaricare mentre si
cammina, e quasi tutto roba a due isolati di distanza.

Il nome del file è il quadretto stesso — `4182_1248.json` — così l'app lo
calcola dalla posizione senza bisogno di un indice da scaricare prima.
"""
import json, os, sys, collections

grezzo, cartella, citta = sys.argv[1], sys.argv[2], sys.argv[3]
roba = json.load(open(grezzo, encoding='utf-8'))

def quadretto(lat, lon):
    return '%04d_%04d' % (int(lat * 100), int(lon * 100))

# QUELLO CHE SI INCONTRA CAMMINANDO, e come si chiama in italiano.
# Overture mette tutto insieme: studi legali, uffici al terzo piano,
# agenzie immobiliari, società di servizi. Dalla strada non si vedono e a
# chi cammina non servono — e sono più della metà. Si tengono solo le cose
# che hanno una porta sulla strada, e il nome italiano si scrive qui una
# volta per tutte invece di tradurlo sul telefono ogni volta.
PAROLE = {
 'restaurant': 'ristorante', 'casual_eatery': 'tavola calda', 'pizzeria': 'pizzeria',
 'bar': 'bar', 'coffee_shop': 'bar', 'cafe': 'bar', 'pub': 'pub',
 'non_alcoholic_beverage_venue': 'bar', 'bakery': 'panificio', 'dessert_shop': 'pasticceria',
 'ice_cream_shop': 'gelateria', 'food_and_beverage_store': 'alimentari',
 'grocery_store': 'alimentari', 'supermarket': 'supermercato', 'butcher': 'macelleria',
 'fish_market': 'pescheria', 'fruit_and_vegetable_store': 'frutta e verdura',
 'wine_and_spirits_store': 'enoteca', 'deli': 'gastronomia',
 'pharmacy_and_drug_store': 'farmacia', 'hospital': 'ospedale', 'doctor': 'ambulatorio',
 'dentist': 'dentista', 'optometrist': 'ottico', 'veterinarian': 'veterinario',
 'specialized_health_care': 'ambulatorio', 'physical_medicine_and_rehabilitation': 'fisioterapia',
 'fashion_and_apparel_store': 'negozio di vestiti', 'shoe_store': 'negozio di scarpe',
 'jewelry_store': 'gioielleria', 'book_store': 'libreria', 'toy_store': 'negozio di giocattoli',
 'electronics_store': 'negozio di elettronica', 'mobile_phone_store': 'negozio di telefonia',
 'furniture_store': 'negozio di mobili', 'hardware_store': 'ferramenta',
 'florist': 'fioraio', 'pet_store': 'negozio di animali', 'sporting_goods_store': 'negozio di sport',
 'department_store': 'grande magazzino', 'shopping_center': 'centro commerciale',
 'newsstand': 'edicola', 'tobacco_store': 'tabaccheria', 'gift_shop': 'negozio di regali',
 'personal_or_beauty_service': 'parrucchiere', 'hair_salon': 'parrucchiere',
 'barber': 'barbiere', 'wellness_service': 'centro benessere', 'gym': 'palestra',
 'sport_or_fitness_facility': 'centro sportivo', 'laundry_service': 'lavanderia',
 'bank': 'banca', 'atm': 'bancomat', 'post_office': 'ufficio postale',
 'financial_service': 'banca', 'travel_agency': 'agenzia di viaggi',
 'hotel': 'albergo', 'bed_and_breakfast': 'bed and breakfast', 'hostel': 'ostello',
 'museum': 'museo', 'art_gallery': "galleria d'arte", 'theater': 'teatro',
 'movie_theater': 'cinema', 'library': 'biblioteca', 'tourist_attraction': 'luogo da vedere',
 'park': 'parco', 'playground': 'parco giochi', 'market': 'mercato',
 'gas_station': 'distributore', 'parking': 'parcheggio', 'car_repair': 'officina',
 'automotive_service': 'officina', 'bicycle_store': 'negozio di biciclette',
 'school': 'scuola', 'university': 'università', 'police_station': 'commissariato',
 'fire_station': 'caserma dei pompieri', 'train_station': 'stazione',
 'bus_station': 'stazione dei bus', 'airport': 'aeroporto',
}

mucchi = collections.defaultdict(list)
for x in roba:
    if x.get('lat') is None or x.get('lon') is None:
        continue
    parola = PAROLE.get(x.get('t') or '')
    if not parola:
        continue                      # uffici e servizi che dalla strada non si vedono
    r = {'n': x['n'], 't': parola, 'lat': x['lat'], 'lon': x['lon']}
    if x.get('a'):
        r['a'] = x['a']
    mucchi[quadretto(x['lat'], x['lon'])].append(r)

os.makedirs(cartella, exist_ok=True)
scritti = peso = 0
for k, v in mucchi.items():
    f = os.path.join(cartella, k + '.json')
    vecchi = []
    if os.path.exists(f):
        try:
            vecchi = json.load(open(f, encoding='utf-8'))
        except Exception:
            vecchi = []
    # due città vicine possono toccare lo stesso quadretto: si uniscono
    visti = {(r['n'], round(r['lat'], 5), round(r['lon'], 5)) for r in vecchi}
    for r in v:
        k2 = (r['n'], round(r['lat'], 5), round(r['lon'], 5))
        if k2 not in visti:
            vecchi.append(r); visti.add(k2)
    json.dump(vecchi, open(f, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    scritti += 1
    peso += os.path.getsize(f)

print('%s: %d tenuti su %d, in %d quadretti, %.1f MB in tutto, %.0f KB il più grande' % (
    citta, sum(len(v) for v in mucchi.values()), len(roba), scritti, peso / 1e6,
    max(os.path.getsize(os.path.join(cartella, k + '.json')) for k in mucchi) / 1e3))
