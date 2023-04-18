# Thanks to @VallIum#6037 on discord

import mtg_api
import json
import requests
import time
from dotenv import dotenv_values
from pymongo import MongoClient
from tqdm import tqdm

base_url = "https://edhtop16.com/api/"
headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
data = {'standing': {'$lte': 16}, 'tourney_filter': {'size': {'$gte': 64}}}

def get_staples_list(url=(base_url + 'req'), filters=data, headers=headers, sort=False):
    dict_of_cards = {}
    decks_analysed = 0
    broken_links = 0

    players = json.loads(requests.post(url, json=filters, headers=headers).text)
    for person in tqdm(players):
            try:
                deck_object = mtg_api.get_deck(person["decklist"])
                deck_list = deck_object.get_decklist()
            except: #broken link
                broken_links = broken_links + 1
                continue

            decks_analysed += 1
            for card in deck_list:
                    try:
                        dict_of_cards[card] += 1
                    except KeyError:
                        dict_of_cards[card] = 1
    if sort:
        dict_of_cards = dict(sorted(dict_of_cards.items(), key=lambda x:x[1], reverse=True))
    return dict_of_cards, broken_links, decks_analysed

if __name__ == "__main__":
    client = MongoClient(dotenv_values("../config.env")['ATLAS_URI'])
    db = client['cedhtop16']
    col = db['staples']

    dict_of_cards, broken_links, decks_analysed = get_staples_list()
    print(f"broken links: {broken_links}\ndecks analysed: {decks_analysed}")

    for card in tqdm(dict_of_cards.keys()):
        if dict_of_cards[card] < 10: continue
        percent_playrate = f"{(dict_of_cards[card]/decks_analysed * 100):.2f}"
        card_info = mtg_api.get_card(card)
        try:
            card_type = card_info["type_line"]
        except:
            if card == "Minsc & Boo, Timeless Heroes":
                card_type = "Legendary Planeswalker — Minsc"
        if card_type.find(' —') != -1:
            types = card_type[0:card_type.find(' —')].split(' ')
        else:
            types = card_type.split(' ')

        col.find_one_and_update({'card': card}, {'$set': {'count': dict_of_cards[card], 'types': types}}, upsert=True)
