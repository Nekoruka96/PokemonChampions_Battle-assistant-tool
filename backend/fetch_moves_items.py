import requests
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_japanese_name(names):
    for n in names:
        if n['language']['name'] == 'ja-Hrkt' or n['language']['name'] == 'ja':
            return n['name']
    return None

def fetch_moves():
    print("Fetching all moves...")
    moves_data = {}
    r = requests.get("https://pokeapi.co/api/v2/move?limit=1000")
    results = r.json().get('results', [])
    
    def process_move(item):
        try:
            req = requests.get(item['url'], timeout=10)
            data = req.json()
            ja_name = get_japanese_name(data.get('names', []))
            if not ja_name: return None
            
            return {
                'ja_name': ja_name,
                'power': data.get('power'),
                'type': data.get('type', {}).get('name'),
                'damage_class': data.get('damage_class', {}).get('name'),
                'accuracy': data.get('accuracy')
            }
        except:
            return None

    count = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(process_move, res): res for res in results}
        for future in as_completed(futures):
            count += 1
            if count % 100 == 0: print(f"Moves: {count}/{len(results)}")
            m = future.result()
            if m:
                moves_data[m['ja_name']] = m
                
    db_path = os.path.join(os.path.dirname(__file__), 'moves_db.json')
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(moves_data, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(moves_data)} moves to moves_db.json")

def fetch_items():
    print("Fetching all items...")
    items_data = {}
    r = requests.get("https://pokeapi.co/api/v2/item?limit=2500")
    results = r.json().get('results', [])
    
    def process_item(item):
        try:
            req = requests.get(item['url'], timeout=10)
            data = req.json()
            ja_name = get_japanese_name(data.get('names', []))
            if not ja_name: return None
            
            category_name = data.get('category', {}).get('name', '')
            
            # カテゴリの簡略化
            item_cat = 'other'
            if 'berry' in category_name or 'きのみ' in ja_name:
                item_cat = 'berry'
            elif 'mega' in category_name or 'ナイト' in ja_name:
                item_cat = 'mega'
                
            return {
                'ja_name': ja_name,
                'category': item_cat
            }
        except:
            return None

    count = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(process_item, res): res for res in results}
        for future in as_completed(futures):
            count += 1
            if count % 200 == 0: print(f"Items: {count}/{len(results)}")
            i = future.result()
            if i:
                items_data[i['ja_name']] = i
                
    db_path = os.path.join(os.path.dirname(__file__), 'items_db.json')
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(items_data, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(items_data)} items to items_db.json")

if __name__ == "__main__":
    fetch_moves()
    fetch_items()
