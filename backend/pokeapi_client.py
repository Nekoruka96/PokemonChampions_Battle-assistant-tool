import requests
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_japanese_name(names):
    for name_data in names:
        if name_data['language']['name'] == 'ja-Hrkt':
            return name_data['name']
    for name_data in names:
        if name_data['language']['name'] == 'ja':
            return name_data['name']
    return None

def fetch_pokemon_detail(url):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return None

def fetch_species_detail(url):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return None

def build_pokemon_db():
    print("Building Pokemon DB... (This might take a minute)")
    db_path = os.path.join(os.path.dirname(__file__), 'pokemon_db.json')
    if os.path.exists(db_path):
        print("pokemon_db.json already exists.")
        return

    # First, get the list of up to Gen 9 (~1025)
    r = requests.get("https://pokeapi.co/api/v2/pokemon-species?limit=1025")
    species_list = r.json().get('results', [])
    
    pokemon_db = {}
    
    def process_species(species_item):
        species_url = species_item['url']
        s_data = fetch_species_detail(species_url)
        if not s_data:
            return None
        
        japanese_name = get_japanese_name(s_data.get('names', []))
        if not japanese_name:
            return None
        
        forms_to_keep = [
            'alola', 'galar', 'hisui', 'paldea', 'rapid-strike', 'bloodmoon', 
            'origin', 'therian', 'crowned', 'hero', 'mega', 'primal',
            'heat', 'wash', 'frost', 'fan', 'mow',
            'eternal', 'small', 'large', 'super',
            'midday', 'midnight', 'dusk',
            'sunny', 'rainy', 'snowy',
            'combat', 'blaze', 'aqua'
        ]
        
        results = []
        for v in s_data.get('varieties', []):
            url = v['pokemon']['url']
            name_suffix = v['pokemon']['name'].split('-')[1:] if '-' in v['pokemon']['name'] else []
            
            is_valid_form = v['is_default'] or any(f in name_suffix for f in forms_to_keep)
            # e.g., Filter out cosplay pikachu etc.
            if not is_valid_form:
                continue
                
            p_data = fetch_pokemon_detail(url)
            if not p_data:
                continue
                
            ja_form_name = japanese_name
            if not v['is_default'] and name_suffix:
                if 'mega' in name_suffix:
                    if 'x' in name_suffix: ja_form_name += '(メガX)'
                    elif 'y' in name_suffix: ja_form_name += '(メガY)'
                    else: ja_form_name += '(メガ)'
                elif 'primal' in name_suffix: ja_form_name += '(ゲンシ)'
                elif 'alola' in name_suffix: ja_form_name += '(アローラ)'
                elif 'galar' in name_suffix: ja_form_name += '(ガラル)'
                elif 'hisui' in name_suffix: ja_form_name += '(ヒスイ)'
                elif 'paldea' in name_suffix:
                    if 'combat' in name_suffix: ja_form_name += '(パルデア・コンバット)'
                    elif 'blaze' in name_suffix: ja_form_name += '(パルデア・ブレイズ)'
                    elif 'aqua' in name_suffix: ja_form_name += '(パルデア・ウォーター)'
                    else: ja_form_name += '(パルデア)'
                elif 'rapid' in name_suffix and 'strike' in name_suffix: ja_form_name += '(れんげき)'
                elif 'bloodmoon' in name_suffix: ja_form_name += '(アカツキ)'
                elif 'origin' in name_suffix: ja_form_name += '(オリジン)'
                elif 'therian' in name_suffix: ja_form_name += '(霊獣)'
                elif 'hero' in name_suffix: ja_form_name += '(マイティ)'
                elif 'heat' in name_suffix: ja_form_name += '(ヒート)'
                elif 'wash' in name_suffix: ja_form_name += '(ウォッシュ)'
                elif 'frost' in name_suffix: ja_form_name += '(フロスト)'
                elif 'fan' in name_suffix: ja_form_name += '(スピン)'
                elif 'mow' in name_suffix: ja_form_name += '(カット)'
                elif 'eternal' in name_suffix: ja_form_name += '(えいえんのはな)'
                elif 'small' in name_suffix: ja_form_name += '(ちいさいサイズ)'
                elif 'large' in name_suffix: ja_form_name += '(おおきいサイズ)'
                elif 'super' in name_suffix: ja_form_name += '(とくだいサイズ)'
                elif 'midday' in name_suffix: ja_form_name += '(まひる)'
                elif 'midnight' in name_suffix: ja_form_name += '(まよなか)'
                elif 'dusk' in name_suffix: ja_form_name += '(たそがれ)'
                elif 'sunny' in name_suffix: ja_form_name += '(たいよう)'
                elif 'rainy' in name_suffix: ja_form_name += '(あまみず)'
                elif 'snowy' in name_suffix: ja_form_name += '(ゆきぐも)'
            
            stats = {s['stat']['name']: s['base_stat'] for s in p_data['stats']}
            types = [t['type']['name'] for t in p_data['types']]
            
            results.append({
                'ja_name': ja_form_name,
                'en_name': p_data['name'],
                'stats': stats,
                'types': types,
                'id': p_data['id']
            })
            
        return results

    valid_results = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(process_species, item): item for item in species_list}
        for i, future in enumerate(as_completed(futures)):
            res_list = future.result()
            if res_list:
                for res in res_list:
                    pokemon_db[res['ja_name']] = {
                        'en_name': res['en_name'],
                        'stats': res['stats'],
                        'types': res['types'],
                        'id': res['id']
                    }
            if i % 100 == 0:
                print(f"Processed {i}/{len(species_list)}")

    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(pokemon_db, f, indent=2, ensure_ascii=False)
    print(f"Saved DB with {len(pokemon_db)} Pokemons.")

if __name__ == "__main__":
    build_pokemon_db()
