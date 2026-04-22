from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import os
import csv
import re
from io import StringIO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's a local tool
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data on startup
DB_DIR = os.path.dirname(__file__)

def load_json(name):
    path = os.path.join(DB_DIR, name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

pokemon_db = load_json('pokemon_db.json')
ranking_db = load_json('ranking_db.json')

flags_db_path = os.path.join(DB_DIR, 'flags_db.json')
def load_flags_db():
    if os.path.exists(flags_db_path):
        with open(flags_db_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    init_flags = {name: {"is_champion": True} for name in ranking_db.keys()}
    with open(flags_db_path, 'w', encoding='utf-8') as f:
        json.dump(init_flags, f, ensure_ascii=False, indent=2)
    return init_flags

flags_db = load_flags_db()

items_flags_db_path = os.path.join(DB_DIR, 'items_flags_db.json')
def load_items_flags_db():
    if os.path.exists(items_flags_db_path):
        with open(items_flags_db_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    items_set = set()
    for name, data in ranking_db.items():
        for i in data.get("items", []): items_set.add(i["name"])
    init_flags = {name: {"is_champion": True} for name in items_set}
    with open(items_flags_db_path, 'w', encoding='utf-8') as f:
        json.dump(init_flags, f, ensure_ascii=False, indent=2)
    return init_flags

items_flags_db = load_items_flags_db()
@app.get("/api/pokemon")
def get_pokemon_list():
    # Only send keys (names) for the autocomplete list
    return list(pokemon_db.keys())

@app.get("/api/pokemon/{name}")
def get_pokemon_detail(name: str):
    return pokemon_db.get(name)

@app.get("/api/ranking")
def get_ranking_all():
    return ranking_db

@app.get("/api/ranking/{name}")
def get_ranking_detail(name: str):
    return ranking_db.get(name)

@app.get("/api/masterdata")
def get_master_data():
    masterdata = []
    for name, data in pokemon_db.items():
        ranking_info = ranking_db.get(name, {})
        stats = data.get("stats", {})
        bst = sum(stats.values()) if stats else 0
        is_champion = flags_db.get(name, {}).get("is_champion", False)
        masterdata.append({
            "name": name,
            "en_name": data.get("en_name"),
            "id": data.get("id"),
            "stats": stats,
            "bst": bst,
            "types": data.get("types", []),
            "moves": ranking_info.get("moves", []),
            "items": ranking_info.get("items", []),
            "is_champion": is_champion
        })
    masterdata.sort(key=lambda x: x["bst"], reverse=True)
    return masterdata

@app.post("/api/import_csv")
async def import_csv(file: UploadFile = File(...)):
    global ranking_db, flags_db, items_flags_db
    content = await file.read()
    text = content.decode('utf-8-sig') # handle BOM if present
    
    f = StringIO(text)
    reader = csv.DictReader(f)
    
    pattern = re.compile(r"^\s*(.+?)\s*\(([\d\.]+%)\)\s*$")
    
    for row in reader:
        poke_name = row.get("ポケモン", "").strip()
        if not poke_name: continue
        
        # Initialize
        poke_data = {
            "ev_spread": [], "nature": [], "ability": [],
            "moves": [], "items": []
        }
        
        # 調整
        ev = row.get("調整1位", "").strip()
        if ev and ev != "-":
            m = re.match(r"^([\d\-]+)\(([\d\.]+%)\)$", ev)
            if m: poke_data["ev_spread"].append({"name": m.group(1), "percent": m.group(2)})
            else: poke_data["ev_spread"].append({"name": ev.split("(")[0], "percent": "-"})
            
        # 性格, 特性, 技, 道具 (1~3 or 1~5)
        def parse_columns(prefix, max_rank, target_list):
            for i in range(1, max_rank + 1):
                col = f"{prefix}{i}位"
                val = row.get(col, "").strip()
                if val and val != "-":
                    m = pattern.match(val)
                    if m: target_list.append({"name": m.group(1), "percent": m.group(2)})
                    else: target_list.append({"name": val, "percent": "-"})

        parse_columns("性格", 3, poke_data["nature"])
        parse_columns("特性", 3, poke_data["ability"])
        parse_columns("技", 5, poke_data["moves"])
        parse_columns("道具", 5, poke_data["items"])
        
        ranking_db[poke_name] = poke_data
        
        # update flags_db default to ON
        if poke_name not in flags_db:
            flags_db[poke_name] = {"is_champion": True}
            
        # update items_flags_db default to ON
        for it in poke_data["items"]:
            it_name = it["name"]
            if it_name not in items_flags_db:
                items_flags_db[it_name] = {"is_champion": True}

    # Save to JSON
    with open(os.path.join(DB_DIR, 'ranking_db.json'), 'w', encoding='utf-8') as f_out:
        json.dump(ranking_db, f_out, ensure_ascii=False, indent=2)
    with open(flags_db_path, 'w', encoding='utf-8') as f_out:
        json.dump(flags_db, f_out, ensure_ascii=False, indent=2)
    with open(items_flags_db_path, 'w', encoding='utf-8') as f_out:
        json.dump(items_flags_db, f_out, ensure_ascii=False, indent=2)
        
    return {"status": "success", "message": f"Imported data for {len(ranking_db)} pokemons."}


moves_db_path = os.path.join(DB_DIR, 'moves_db.json')
items_db_path = os.path.join(DB_DIR, 'items_db.json')

def load_json_safe(path, default=None):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return default or {}
    return default or {}

@app.get("/api/masterdata/items")
def get_masterdata_items():
    items_db = load_json_safe(items_db_path, {})
    master_items = []
    for name, data in items_db.items():
        cat = data.get("category", "other")
        if 'のみ' in name: cat = 'berry'
        master_items.append({
            "name": name,
            "category": cat,
            "is_champion": items_flags_db.get(name, {}).get("is_champion", False)
        })
    return master_items

@app.get("/api/lists")
def get_picker_lists():
    champion_pokemons = [name for name, v in flags_db.items() if v.get("is_champion")]
    
    moves_db = load_json_safe(moves_db_path, {})
    items_db = load_json_safe(items_db_path, {})
    
    # 技リスト: 名前のみ (ピッカー用) + 技詳細辞書 (計算用)
    moves_list = sorted(list(moves_db.keys()))
    moves_detail = {}
    for k, v in moves_db.items():
        moves_detail[k] = {
            "power": v.get("power"),
            "type": v.get("type"),
            "damage_class": v.get("damage_class"),
            "accuracy": v.get("accuracy")
        }

    items_list = []
    for k, v in items_db.items():
        if items_flags_db.get(k, {}).get("is_champion", False):
            cat = v.get("category", "other")
            if 'のみ' in k: cat = 'berry'
            items_list.append({"name": k, "category": cat})
            
    return {
        "pokemons": sorted(list(champion_pokemons)),
        "moves": moves_list,
        "moves_detail": moves_detail,
        "items": sorted(items_list, key=lambda x: x['name']),
        "natures": []
    }

@app.post("/api/flags/pokemon")
async def update_pokemon_flag(request: Request):
    data = await request.json()
    name = data.get("name")
    is_champion = data.get("is_champion", False)
    if name:
        if name not in flags_db:
            flags_db[name] = {}
        flags_db[name]["is_champion"] = is_champion
        with open(flags_db_path, 'w', encoding='utf-8') as f:
            json.dump(flags_db, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.post("/api/flags/item")
async def update_item_flag(request: Request):
    data = await request.json()
    name = data.get("name")
    is_champion = data.get("is_champion", False)
    if name:
        if name not in items_flags_db:
            items_flags_db[name] = {}
        items_flags_db[name]["is_champion"] = is_champion
        with open(items_flags_db_path, 'w', encoding='utf-8') as f:
            json.dump(items_flags_db, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

# Mount frontend if it exists in the parent directory
frontend_dir = os.path.join(os.path.dirname(DB_DIR), "frontend", "dist")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # run server on 8000
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
