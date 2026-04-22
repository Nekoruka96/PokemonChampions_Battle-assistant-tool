import requests
from bs4 import BeautifulSoup
import json
import os

def build_ranking_db():
    print("Scraping Game8 ranking data...")
    url = 'https://game8.jp/pokemon-champions/779317'
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        html = requests.get(url, headers=headers, timeout=10).text
    except Exception as e:
        print(f"Error fetching Game8: {e}")
        return

    soup = BeautifulSoup(html, 'html.parser')
    tables = soup.find_all('table')

    ranking_data = {}
    
    for el in tables:
        rows = el.find_all('tr')
        if not rows: continue
        
        header_th_td = rows[0].find(['th', 'td'])
        if not header_th_td: continue
        header = header_th_td.get_text(strip=True)
        
        if 'の技採用率' in header or 'の持ち物採用率' in header:
            pokemon_name = header.split('の')[0]
            if pokemon_name not in ranking_data:
                ranking_data[pokemon_name] = {'moves': [], 'items': []}
                
            is_move = '技採用率' in header
            
            for r in rows[1:]:
                tds = r.find_all(['td', 'th'])
                if len(tds) >= 3:
                    rank = tds[0].get_text(strip=True)
                    name = tds[1].get_text(strip=True)
                    perc = tds[2].get_text(strip=True)
                    
                    if is_move:
                        ranking_data[pokemon_name]['moves'].append({'name': name, 'percent': perc})
                    else:
                        ranking_data[pokemon_name]['items'].append({'name': name, 'percent': perc})

    db_path = os.path.join(os.path.dirname(__file__), 'ranking_db.json')
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(ranking_data, f, ensure_ascii=False, indent=2)
    print(f"Saved ranking data for {len(ranking_data)} Pokemons to ranking_db.json")

if __name__ == "__main__":
    build_ranking_db()
