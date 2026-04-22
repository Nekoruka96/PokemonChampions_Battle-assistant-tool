const API_URL = "http://127.0.0.1:8000/api";

let pokemonDB = {};
let rankingDB = {};
let pokemonNames = [];
let movesDetail = {};

let myParty = Array(6).fill().map(() => ({ name: "", item: "", nature: "", ability: "", evs: {h:0,a:0,b:0,c:0,d:0,s:0}, moves: ["","","",""] }));
let enemyParty = Array(3).fill().map(() => ({ name: "", moves: ["","","",""], durability: "0" }));

let activeMyIndex = null;
let activeEnemyIndex = null;

let attackDirection = 'atk';
let myRanks = {h:0,a:0,b:0,c:0,d:0,s:0};
let enemyRanks = {h:0,a:0,b:0,c:0,d:0,s:0};
let selectedMoveIndex = null;

// window.setDirection = Vite module scope fix
window.setDirection = function(dir) {
  attackDirection = dir;
  document.getElementById('dir-atk').classList.toggle('dir-btn-active', dir === 'atk');
  document.getElementById('dir-def').classList.toggle('dir-btn-active', dir === 'def');
  selectedMoveIndex = null;
  renderCalcMoves();
  updateCalculator();
};

window.clearMyParty = function() {
  if (confirm("自陣の入力をすべてクリアしますか？")) {
    myParty = Array(6).fill().map(() => ({ name: "", item: "", nature: "", ability: "", evs: {h:0,a:0,b:0,c:0,d:0,s:0}, moves: ["","","",""] }));
    activeMyIndex = null;
    selectedMoveIndex = null;
    renderMyParty();
    updateCalculator();
  }
};

window.clearEnemyParty = function() {
  if (confirm("敵陣の入力をすべてクリアしますか？")) {
    enemyParty = Array(3).fill().map(() => ({ name: "", moves: ["","","",""], durability: "0" }));
    activeEnemyIndex = null;
    selectedMoveIndex = null;
    renderEnemyParty();
    updateCalculator();
    const suggestions = document.getElementById("suggestion-content");
    if(suggestions) suggestions.innerHTML = '<p class="empty-state" style="font-size:0.8rem;">敵陣のポケモンを選択すると表示されます。</p>';
  }
};

const TYPE_EN_TO_JA = {
  normal:'\u30ce\u30fc\u30de\u30eb', fire:'\u307b\u306e\u304a', water:'\u307f\u305a', electric:'\u3067\u3093\u304d', grass:'\u304f\u3055',
  ice:'\u3053\u304a\u308a', fighting:'\u304b\u304f\u3068\u3046', poison:'\u3069\u304f', ground:'\u3058\u3081\u3093', flying:'\u3072\u3053\u3046',
  psychic:'\u30a8\u30b9\u30d1\u30fc', bug:'\u3080\u3057', rock:'\u3044\u308f', ghost:'\u30b4\u30fc\u30b9\u30c8', dragon:'\u30c9\u30e9\u30b4\u30f3',
  dark:'\u3042\u304f', steel:'\u306f\u304c\u306d', fairy:'\u30d5\u30a7\u30a2\u30ea\u30fc'
};

function typeBadgeHTML(typeJa) {
  const color = TYPE_COLORS[typeJa] || '#777';
  return `<span style="background:${color}cc; border:1px solid ${color}; padding:0.15rem 0.45rem; border-radius:4px; font-size:0.8rem; font-weight:700; text-shadow:0 1px 2px rgba(0,0,0,0.8); color:#fff; display:inline-block;">${typeJa}</span>`;
}

// プリセット管理
const MAX_PRESETS = 5;
function loadPresets() {
  try { return JSON.parse(localStorage.getItem('party_presets') || '[]'); } catch(e){ return []; }
}
function savePresets(presets) { localStorage.setItem('party_presets', JSON.stringify(presets)); }

function renderPresetPanel() {
  const container = document.getElementById('preset-panel');
  if(!container) return;
  const presets = loadPresets();
  
  let options = '<option value="">(\u30d7\u30ea\u30bb\u30c3\u30c8\u9078\u629e)</option>';
  presets.forEach((p, i) => { options += `<option value="${i}">${p.name}</option>`; });

  container.innerHTML = `
    <div style="display:flex; gap:0.3rem; align-items:center;">
      <select id="preset-select" style="flex:1; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.2); color:#fff; font-size:0.75rem; padding:0.25rem; border-radius:4px; min-width:0;">
        ${options}
      </select>
      <button id="preset-load" class="preset-load-btn" style="flex:none; padding:0.25rem 0.6rem; text-align:center; width:auto;">読込</button>
      <button id="preset-save" class="preset-save-btn" style="flex:none; width:auto; margin-bottom:0; padding:0.25rem 0.6rem;">保存</button>
      <button id="preset-del" class="preset-del-btn" style="flex:none; padding:0.25rem 0.4rem;">×</button>
    </div>
  `;

  document.getElementById('preset-save').onclick = () => {
    const name = prompt('\u4fdd\u5b58\u3059\u308b\u30d7\u30ea\u30bb\u30c3\u30c8\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044', `\u30d1\u30fc\u30c6\u30a3${presets.length+1}`);
    if(!name) return;
    const list = loadPresets();
    if(list.length >= MAX_PRESETS) list.shift();
    list.push({ name, party: JSON.parse(JSON.stringify(myParty)) });
    savePresets(list);
    renderPresetPanel();
  };

  document.getElementById('preset-load').onclick = () => {
    const sel = document.getElementById('preset-select').value;
    if(sel === "") return;
    const p = presets[sel];
    if(!confirm(`\u300c${p.name}\u300d\u3092\u8aad\u307f\u8fbc\u307f\u307e\u3059\u304b\uff1f`)) return;
    myParty = JSON.parse(JSON.stringify(p.party));
    activeMyIndex = null;
    renderMyParty();
    updateCalculator();
  };

  document.getElementById('preset-del').onclick = () => {
    const sel = document.getElementById('preset-select').value;
    if(sel === "") return;
    const list = loadPresets();
    if(!confirm(`\u300c${list[sel].name}\u300d\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f`)) return;
    list.splice(sel, 1);
    savePresets(list);
    renderPresetPanel();
  };
}

const RANK_MULTS = [0.25,0.28,0.33,0.40,0.50,0.66,1.0,1.5,2.0,2.5,3.0,3.5,4.0];
function getRankMult(rank) { return RANK_MULTS[rank + 6]; }

function renderRankPanels() {
  ['my','enemy'].forEach(side => {
    const grid = document.getElementById(`rank-${side}`);
    if(!grid) return;
    grid.innerHTML = '';
    const ranks = side === 'my' ? myRanks : enemyRanks;
    ['h','a','b','c','d','s'].forEach((st, i) => {
      const label = ['H','A','B','C','D','S'][i];
      const val = ranks[st];
      const col = document.createElement('div');
      col.className = 'rank-stat-col';
      const cls = val > 0 ? 'positive' : val < 0 ? 'negative' : '';
      col.innerHTML = `
        <button class="rank-adj-btn" data-side="${side}" data-st="${st}" data-d="1">△</button>
        <div class="rank-label">${label}</div>
        <div class="rank-value ${cls}">${val > 0 ? '+'+val : val}</div>
        <button class="rank-adj-btn" data-side="${side}" data-st="${st}" data-d="-1">▽</button>
      `;
      grid.appendChild(col);
    });
    grid.querySelectorAll('.rank-adj-btn').forEach(btn => {
      btn.onclick = () => {
        const { side, st, d } = btn.dataset;
        const r = side === 'my' ? myRanks : enemyRanks;
        r[st] = Math.max(-6, Math.min(6, (r[st]||0) + parseInt(d)));
        renderRankPanels();
        updateCalculator();
      };
    });
  });
}

function renderCalcMoves() {
  const container = document.getElementById('calc-moves');
  if(!container) return;
  container.innerHTML = '';
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 1fr';
  container.style.gap = '0.4rem';
  container.style.marginBottom = '0.5rem';
  
  // 攻撃側の技を表示
  const attackerParty = attackDirection === 'atk' ? myParty : enemyParty;
  const attackerIdx = attackDirection === 'atk' ? activeMyIndex : activeEnemyIndex;
  if(attackerIdx === null) return;
  const attacker = attackerParty[attackerIdx];
  if(!attacker) return;
  
  attacker.moves.forEach((move, i) => {
    const btn = document.createElement('button');
    btn.className = 'calc-move-btn' + (selectedMoveIndex === i ? ' selected' : '');
    const moveName = move || `技${i+1}(未入力)`;
    const mData = move ? movesDetail[move] : null;
    let badge = '';
    if(mData) {
      const typeJa = TYPE_EN_TO_JA[mData.type] || mData.type || '';
      const color = TYPE_COLORS[typeJa] || '#777';
      const classLabel = mData.damage_class === 'physical' ? '物' : mData.damage_class === 'special' ? '特' : '変';
      const classColor = mData.damage_class === 'physical' ? '#ef4444' : mData.damage_class === 'special' ? '#3b82f6' : '#a3a3a3';
      badge = `<span style="background:${color}bb; border-radius:3px; font-size:0.62rem; padding:0.05rem 0.25rem; margin-right:2px;">${typeJa}</span><span style="background:${classColor}44; border-radius:3px; font-size:0.62rem; padding:0.05rem 0.2rem; color:${classColor};">${classLabel}</span>`;
      if(mData.power) badge += ` <span style="color:#94a3b8; font-size:0.62rem;">威${mData.power}</span>`;
    }
    btn.innerHTML = `<span style="font-weight:600; display:block;">${moveName}</span><div style="display:flex; align-items:center; gap:2px; margin-top:2px;">${badge}</div>`;
    btn.onclick = () => {
      selectedMoveIndex = i;
      renderCalcMoves();
      updateCalculator();
    };
    container.appendChild(btn);
  });
}

// Fetch data
async function init() {
  try {
    const pDBReq = await fetch(`${API_URL}/pokemon`);
    pokemonNames = await pDBReq.json();
    const rDBReq = await fetch(`${API_URL}/ranking`);
    rankingDB = await rDBReq.json();
    const listsReq = await fetch(`${API_URL}/lists`);
    listsDB = await listsReq.json();
    movesDetail = listsDB.moves_detail || {};
    
    // Add abilities extracting from rankingDB
    const abilitiesSet = new Set();
    Object.values(rankingDB).forEach(r => {
      if(r.ability) r.ability.forEach(a => abilitiesSet.add(a.name));
    });
    listsDB.abilities = Array.from(abilitiesSet).sort();
    
    renderMyParty();
    renderEnemyParty();
    renderRankPanels();
    renderPresetPanel();
  } catch(e) {
    console.error("Failed to fetch data from API. Is the python server running?", e);
  }
}

// Basic type colors
const TYPE_COLORS = {
  "ノーマル": "#A8A77A", "ほのお": "#EE8130", "みず": "#6390F0", "でんき": "#F7D02C", "くさ": "#7AC74C",
  "こおり": "#96D9D6", "かくとう": "#C22E28", "どく": "#A33EA1", "じめん": "#E2BF65", "ひこう": "#A98FF3",
  "エスパー": "#F95587", "むし": "#A6B91A", "いわ": "#B6A136", "ゴースト": "#735797", "ドラゴン": "#6F35FC",
  "あく": "#705746", "はがね": "#B7B7CE", "フェアリー": "#D685AD"
};

const STAT_BOOST_ITEMS = [
  "こだわりハチマキ", "こだわりメガネ", "こだわりスカーフ",
  "いのちのたま", "たつじんのおび", "とつげきチョッキ",
  "しんかのきせき", "パンチグローブ", "クリアチャーム", "ブーストエナジー"
];

const TYPE_BOOST_ITEMS = {
  "シルクのスカーフ": "ノーマル", "ノーマルジュエル": "ノーマル",
  "もくたん": "ほのお", "ひのたまプレート": "ほのお",
  "しんぴのしずく": "みず", "うしおのおこう": "みず", "さざなみのおこう": "みず", "しずくプレート": "みず",
  "じしゃく": "でんき", "いかずちプレート": "でんき",
  "きせきのタネ": "くさ", "みどりのプレート": "くさ", "おはなのおこう": "くさ",
  "とけないこおり": "こおり", "つららのプレート": "こおり",
  "くろおび": "かくとう", "こぶしのプレート": "かくとう",
  "どくバリ": "どく", "もうどくプレート": "どく",
  "やわらかいすな": "じめん", "だいちのプレート": "じめん",
  "するどいくちばし": "ひこう", "あおぞらプレート": "ひこう",
  "まがったスプーン": "エスパー", "ふしぎのプレート": "エスパー", "あやしいおこう": "エスパー",
  "ぎんのこな": "むし", "たまむしプレート": "むし",
  "かたいいし": "いわ", "がんせきプレート": "いわ", "がんせきおこう": "いわ",
  "のろいのおふだ": "ゴースト", "もののけプレート": "ゴースト",
  "りゅうのキバ": "ドラゴン", "りゅうのプレート": "ドラゴン",
  "くろいメガネ": "あく", "こわもてプレート": "あく",
  "メタルコート": "はがね", "こうてつプレート": "はがね",
  "ようせいのはね": "フェアリー", "せいれいプレート": "フェアリー"
};

const NATURE_EFFECTS = {
  "さみしがり": { up: "attack", down: "defense" },
  "いじっぱり": { up: "attack", down: "special-attack" },
  "やんちゃ": { up: "attack", down: "special-defense" },
  "ゆうかん": { up: "attack", down: "speed" },
  
  "ずぶとい": { up: "defense", down: "attack" },
  "わんぱく": { up: "defense", down: "special-attack" },
  "のうてんき": { up: "defense", down: "special-defense" },
  "のんき": { up: "defense", down: "speed" },
  
  "ひかえめ": { up: "special-attack", down: "attack" },
  "おっとり": { up: "special-attack", down: "defense" },
  "うっかりや": { up: "special-attack", down: "special-defense" },
  "れいせい": { up: "special-attack", down: "speed" },
  
  "おだやか": { up: "special-defense", down: "attack" },
  "おとなしい": { up: "special-defense", down: "defense" },
  "しんちょう": { up: "special-defense", down: "special-attack" },
  "なまいき": { up: "special-defense", down: "speed" },
  
  "おくびょう": { up: "speed", down: "attack" },
  "せっかち": { up: "speed", down: "defense" },
  "ようき": { up: "speed", down: "special-attack" },
  "むじゃき": { up: "speed", down: "special-defense" }
};

function calcRealStat(base, ev, type, nature) {
  if (!base) return "-";
  const b = parseInt(base) || 0;
  const e = parseInt(ev) || 0;
  
  if (type === 'hp') {
    return Math.floor((b * 2 + 31 + Math.floor(e / 4)) * 0.5) + 60;
  } else {
    let stat = Math.floor((Math.floor(b * 2 + 31 + Math.floor(e / 4)) * 0.5) + 5);
    if (nature && NATURE_EFFECTS[nature]) {
      if (NATURE_EFFECTS[nature].up === type) stat = Math.floor(stat * 1.1);
      if (NATURE_EFFECTS[nature].down === type) stat = Math.floor(stat * 0.9);
    }
    return stat;
  }
}

// UI Renderers
function renderMyParty() {
  const container = document.getElementById("my-party-container");
  container.innerHTML = "";
  const tmpl = document.getElementById("my-party-slot-template");
  
  myParty.forEach((poke, idx) => {
    const clone = tmpl.content.cloneNode(true);
    const slot = clone.querySelector(".party-slot");
    if (activeMyIndex === idx) slot.classList.add("active-battle");
    
    const btn = clone.querySelector(".battle-btn");
    btn.onclick = () => {
      activeMyIndex = idx;
      setDirection('atk');
      updateCalculator();
      renderMyParty();
    };
    
    const abiInput = clone.querySelector('.poke-ability-input');
    if (abiInput) {
      abiInput.value = poke.ability || '';
      abiInput.onclick = () => {
        showGojuonModal('abilities', (val) => {
          poke.ability = val;
          renderMyParty();
          updateCalculator();
        });
      };
    }
    
    const updateStats = () => {
      const pData = pokemonDB[poke.name];
      if (!pData) return;
      const bs = pData.stats;
      
      slot.querySelector('.bs-h').textContent = bs.hp || '-';
      slot.querySelector('.bs-a').textContent = bs.attack || '-';
      slot.querySelector('.bs-b').textContent = bs.defense || '-';
      slot.querySelector('.bs-c').textContent = bs['special-attack'] || '-';
      slot.querySelector('.bs-d').textContent = bs['special-defense'] || '-';
      slot.querySelector('.bs-s').textContent = bs.speed || '-';
      
      slot.querySelector('.rv-h').textContent = calcRealStat(bs.hp, poke.evs.h, 'hp', poke.nature);
      slot.querySelector('.rv-a').textContent = calcRealStat(bs.attack, poke.evs.a, 'attack', poke.nature);
      slot.querySelector('.rv-b').textContent = calcRealStat(bs.defense, poke.evs.b, 'defense', poke.nature);
      slot.querySelector('.rv-c').textContent = calcRealStat(bs['special-attack'], poke.evs.c, 'special-attack', poke.nature);
      slot.querySelector('.rv-d').textContent = calcRealStat(bs['special-defense'], poke.evs.d, 'special-defense', poke.nature);
      slot.querySelector('.rv-s').textContent = calcRealStat(bs.speed, poke.evs.s, 'speed', poke.nature);
    };

    const nameInput = clone.querySelector(".poke-name-input");
    nameInput.value = poke.name;
    nameInput.addEventListener('click', () => {
      showGojuonModal('pokemons', async (selected) => {
        poke.name = selected;
        if(selected && !pokemonDB[selected]) {
           try {
              const det = await fetch(`${API_URL}/pokemon/${selected}`).then(r => r.json());
              if(det) pokemonDB[selected] = det;
           } catch(e){}
        }
        updateCalculator();
        renderMyParty();
      });
    });

    const itemInput = clone.querySelector(".poke-item-input");
    itemInput.value = poke.item || '';
    if (STAT_BOOST_ITEMS.includes(poke.item) || TYPE_BOOST_ITEMS[poke.item]) {
       itemInput.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
       itemInput.style.borderColor = 'rgba(239, 68, 68, 0.5)';
       itemInput.style.color = '#fca5a5';
    } else {
       itemInput.style.backgroundColor = '';
       itemInput.style.borderColor = '';
       itemInput.style.color = '';
    }
    itemInput.addEventListener('click', () => {
      showGojuonModal('items', (selected) => {
        poke.item = selected;
        renderMyParty();
      });
    });

    const natureInput = clone.querySelector(".poke-nature-input");
    natureInput.value = poke.nature || '';
    natureInput.addEventListener('click', () => {
      showGojuonModal('natures', (selected) => {
        poke.nature = selected;
        renderMyParty();
      });
    });
    
    ['h','a','b','c','d','s'].forEach(st => {
      const input = clone.querySelector(`.ev-${st}`);
      input.value = poke.evs[st] === 0 ? '' : poke.evs[st];
      input.placeholder = '0';
      input.addEventListener('blur', (e) => {
        let v = parseInt(e.target.value) || 0;
        v = Math.max(0, Math.min(252, v));
        // round to nearest multiple of 4
        v = Math.round(v / 4) * 4;
        poke.evs[st] = v;
        e.target.value = v === 0 ? '' : v;
        e.target.placeholder = '0';
        updateStats();
        updateCalculator();
      });
      input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') input.blur();
      });
    });

    const moveInputs = clone.querySelectorAll(".move-input");
    moveInputs.forEach((mInput, moveIdx) => {
      mInput.value = poke.moves[moveIdx] || '';
      mInput.addEventListener('click', () => {
        showGojuonModal('moves', (selected) => {
          poke.moves[moveIdx] = selected;
          renderMyParty();
        });
      });
    });
    
    if (pokemonDB[poke.name]) {
        updateStats();
    } else if (poke.name) {
        fetch(`${API_URL}/pokemon/${poke.name}`).then(r => r.json()).then(det => {
            if(det) { pokemonDB[poke.name] = det; updateStats(); }
        }).catch(e=>{});
    }
    
    container.appendChild(clone);
  });
}

function renderEnemyParty() {
  const container = document.getElementById("enemy-party-container");
  container.innerHTML = "";
  const tmpl = document.getElementById("enemy-slot-template");
  
  enemyParty.forEach((poke, idx) => {
    const clone = tmpl.content.cloneNode(true);
    const slot = clone.querySelector(".enemy-slot");
    if (activeEnemyIndex === idx) slot.classList.add("active-battle");
    
    const btn = clone.querySelector(".battle-btn");
    btn.onclick = () => {
      activeEnemyIndex = idx;
      setDirection('def');
      selectedMoveIndex = null;
      renderEnemyParty();
      if(activeEnemyIndex !== null) showEnemySuggestions(enemyParty[activeEnemyIndex].name);
      updateCalculator();
    };
    
    const nameInput = clone.querySelector(".poke-name-input");
    nameInput.value = poke.name;
    nameInput.readOnly = true;
    nameInput.addEventListener('click', () => {
      showGojuonModal('pokemons', async (selected) => {
        poke.name = selected;
        if(selected) {
          try {
            const det = await fetch(`${API_URL}/pokemon/${selected}`).then(r => r.json());
            if(det) pokemonDB[selected] = det;
          } catch(e){}
        }
        if(activeEnemyIndex === idx) showEnemySuggestions(selected);
        updateCalculator();
        renderEnemyParty();
      });
    });
    
    // 技凥の入力
    const moveInputs = clone.querySelectorAll(".move-input");
    moveInputs.forEach((mInput, moveIdx) => {
      mInput.value = poke.moves?.[moveIdx] || '';
      mInput.addEventListener('click', () => {
        showGojuonModal('moves', (selected) => {
          if(!poke.moves) poke.moves = ["","","",""];
          poke.moves[moveIdx] = selected;
          renderEnemyParty();
        });
      });
    });
    
    // 種族値表示
    const bsH = clone.querySelector('.bs-h');
    const bsA = clone.querySelector('.bs-a');
    const bsB = clone.querySelector('.bs-b');
    const bsC = clone.querySelector('.bs-c');
    const bsD = clone.querySelector('.bs-d');
    const bsS = clone.querySelector('.bs-s');
    
    if(pokemonDB[poke.name]) {
      const bs = pokemonDB[poke.name].stats;
      if(bsH) bsH.textContent = bs.hp || '-';
      if(bsA) bsA.textContent = bs.attack || '-';
      if(bsB) bsB.textContent = bs.defense || '-';
      if(bsC) bsC.textContent = bs['special-attack'] || '-';
      if(bsD) bsD.textContent = bs['special-defense'] || '-';
      if(bsS) bsS.textContent = bs.speed || '-';
    }

    // 耐久設定
    const durSelect = clone.querySelector('.enemy-durability');
    if(durSelect) {
      durSelect.value = poke.durability || '0';
      durSelect.addEventListener('change', (e) => {
        poke.durability = e.target.value;
        updateCalculator();
      });
    }

    // タイプ表示
    if(pokemonDB[poke.name]) {
      const typesEl = clone.querySelector('.enemy-types');
      if(typesEl) {
        typesEl.innerHTML = pokemonDB[poke.name].types.map(t => {
          const typeJa = TYPE_EN_TO_JA[t] || t;
          return `<span class="type-badge" style="background:${TYPE_COLORS[typeJa]||'#555'}; font-size:0.65rem; padding:0.1rem 0.3rem; border-radius:3px; color:#fff;">${typeJa}</span>`;
        }).join('');
      }
    }
    
    container.appendChild(clone);
  });
}

// Modal functionality
let listsDB = { pokemons: [], moves: [], items: [], natures: [] };
let activeModalCallback = null;



const TYPE_EFFECTIVENESS = {
  normal: { weak: ['fighting'], resist: [], immune: ['ghost'] },
  fire: { weak: ['water', 'ground', 'rock'], resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune: [] },
  water: { weak: ['electric', 'grass'], resist: ['fire', 'water', 'ice', 'steel'], immune: [] },
  electric: { weak: ['ground'], resist: ['electric', 'flying', 'steel'], immune: [] },
  grass: { weak: ['fire', 'ice', 'poison', 'flying', 'bug'], resist: ['water', 'electric', 'grass', 'ground'], immune: [] },
  ice: { weak: ['fire', 'fighting', 'rock', 'steel'], resist: ['ice'], immune: [] },
  fighting: { weak: ['flying', 'psychic', 'fairy'], resist: ['bug', 'rock', 'dark'], immune: [] },
  poison: { weak: ['ground', 'psychic'], resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immune: [] },
  ground: { weak: ['water', 'grass', 'ice'], resist: ['poison', 'rock'], immune: ['electric'] },
  flying: { weak: ['electric', 'ice', 'rock'], resist: ['grass', 'fighting', 'bug'], immune: ['ground'] },
  psychic: { weak: ['bug', 'ghost', 'dark'], resist: ['fighting', 'psychic'], immune: [] },
  bug: { weak: ['fire', 'flying', 'rock'], resist: ['grass', 'fighting', 'ground'], immune: [] },
  rock: { weak: ['water', 'grass', 'fighting', 'ground', 'steel'], resist: ['normal', 'fire', 'poison', 'flying'], immune: [] },
  ghost: { weak: ['ghost', 'dark'], resist: ['poison', 'bug'], immune: ['normal', 'fighting'] },
  dragon: { weak: ['ice', 'dragon', 'fairy'], resist: ['fire', 'water', 'electric', 'grass'], immune: [] },
  dark: { weak: ['fighting', 'bug', 'fairy'], resist: ['ghost', 'dark'], immune: ['psychic'] },
  steel: { weak: ['fire', 'fighting', 'ground'], resist: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune: ['poison'] },
  fairy: { weak: ['poison', 'steel'], resist: ['fighting', 'bug', 'dark'], immune: ['dragon'] }
};

function getDefensiveMultipliers(defTypesEn) {
  const multipliers = {};
  Object.keys(TYPE_EN_TO_JA).forEach(atkType => {
    let mult = 1.0;
    defTypesEn.forEach(defType => {
      const eff = TYPE_EFFECTIVENESS[defType];
      if (!eff) return;
      if (eff.weak.includes(atkType)) mult *= 2;
      if (eff.resist.includes(atkType)) mult *= 0.5;
      if (eff.immune.includes(atkType)) mult = 0;
    });
    multipliers[atkType] = mult;
  });
  return multipliers;
}

function renderTypeMatchups(typesEn) {
  if(!typesEn || typesEn.length === 0) return '';
  const mults = getDefensiveMultipliers(typesEn);
  const groups = { 'x4': [], 'x2': [], 'x0.5': [], 'x0.25': [], 'x0': [] };
  Object.keys(mults).forEach(typeEn => {
    const val = mults[typeEn];
    const typeJa = TYPE_EN_TO_JA[typeEn];
    if (val === 4) groups['x4'].push(typeJa);
    else if (val === 2) groups['x2'].push(typeJa);
    else if (val === 0.5) groups['x0.5'].push(typeJa);
    else if (val === 0.25) groups['x0.25'].push(typeJa);
    else if (val === 0) groups['x0'].push(typeJa);
  });
  
  let html = `<div style="font-size:0.65rem; text-align:left; background:rgba(0,0,0,0.2); padding:0.2rem 0.4rem; border-radius:4px; line-height:1.2;">`;
  let hasAny = false;
  ['x4', 'x2', 'x0.5', 'x0.25', 'x0'].forEach(m => {
    if (groups[m].length > 0) {
      hasAny = true;
      html += `<div style="margin: 0.1rem 0;"><span style="color:${m==='x4'||m==='x2'?'#ef4444':(m==='x0'?'#9ca3af':'#3b82f6')}; font-weight:bold; width:30px; display:inline-block;">${m}:</span> <span style="color:#e2e8f0;">${groups[m].join('、')}</span></div>`;
    }
  });
  html += `</div>`;
  return hasAny ? html : `<div style="font-size:0.65rem; text-align:left; background:rgba(0,0,0,0.2); padding:0.2rem 0.4rem; border-radius:4px;">弱点等なし</div>`;
}

const GOJUON_ROWS = [
  { id: 'a', label: 'ア' }, { id: 'ka', label: 'カ' }, { id: 'sa', label: 'サ' },
  { id: 'ta', label: 'タ' }, { id: 'na', label: 'ナ' }, { id: 'ha', label: 'ハ' },
  { id: 'ma', label: 'マ' }, { id: 'ya', label: 'ヤ' }, { id: 'ra', label: 'ラ' },
  { id: 'wa', label: 'ワ' }, { id: 'other', label: '他' }
];

const ITEM_CATEGORY_ROWS = [
  { id: 'berry', label: 'きのみ' },
  { id: 'mega', label: 'メガストーン' },
  { id: 'other', label: 'その他' },
  { id: 'search', label: '全部' }
];

const NATURE_MATRIX = [
  { down: "攻撃↓", row: ["がんばりや", "ずぶとい", "ひかえめ", "おだやか", "おくびょう"] },
  { down: "防御↓", row: ["さみしがり", "きまぐれ", "おっとり", "おとなしい", "せっかち"] },
  { down: "特攻↓", row: ["いじっぱり", "わんぱく", "まじめ", "しんちょう", "ようき"] },
  { down: "特防↓", row: ["やんちゃ", "のうてんき", "うっかりや", "てれや", "むじゃき"] },
  { down: "早さ↓", row: ["ゆうかん", "のんき", "れいせい", "なまいき", "すなお"] }
];
const NATURE_COLUMNS = ["", "攻撃↑", "防御↑", "特攻↑", "特防↑", "早さ↑"];

function getGojuonStr(char) {
  if (!char) return 'other';
  const c = char.charCodeAt(0);
  if ((c >= 0x3041 && c <= 0x304A) || (c >= 0x30A1 && c <= 0x30AA)) return 'a';
  if ((c >= 0x304B && c <= 0x3054) || (c >= 0x30AB && c <= 0x30B4) || char==='ガ'||char==='ギ'||char==='グ'||char==='ゲ'||char==='ゴ') return 'ka';
  if ((c >= 0x3055 && c <= 0x305E) || (c >= 0x30B5 && c <= 0x30BE) || char==='ザ'||char==='ジ'||char==='ズ'||char==='ゼ'||char==='ゾ') return 'sa';
  if ((c >= 0x305F && c <= 0x3069) || (c >= 0x30BF && c <= 0x30C9) || char==='ダ'||char==='ヂ'||char==='ヅ'||char==='デ'||char==='ド') return 'ta';
  if ((c >= 0x306A && c <= 0x306E) || (c >= 0x30CA && c <= 0x30CE)) return 'na';
  if ((c >= 0x306F && c <= 0x307D) || (c >= 0x30CF && c <= 0x30DD) || char==='バ'||char==='ビ'||char==='ブ'||char==='ベ'||char==='ボ'||char==='パ'||char==='ピ'||char==='プ'||char==='ペ'||char==='ポ') return 'ha';
  if ((c >= 0x307E && c <= 0x3082) || (c >= 0x30DE && c <= 0x30E2)) return 'ma';
  if ((c >= 0x3083 && c <= 0x3088) || (c >= 0x30E3 && c <= 0x30E8)) return 'ya';
  if ((c >= 0x3089 && c <= 0x308D) || (c >= 0x30E9 && c <= 0x30ED)) return 'ra';
  if ((c >= 0x308E && c <= 0x3093) || (c >= 0x30EE && c <= 0x30F3)) return 'wa';
  return 'other';
}

function showGojuonModal(modalType, callback) {
  activeModalCallback = callback;
  const modal = document.getElementById("gojuon-modal");
  const title = document.getElementById("modal-title");
  
  if(modalType === 'pokemons') title.textContent = 'ポケモンを選択 (チャンピオンズフラグ対象のみ)';
  if(modalType === 'moves') title.textContent = '技を選択';
  if(modalType === 'items') title.textContent = '持ち物を選択';
  if(modalType === 'natures') title.textContent = '性格を選択';
  if(modalType === 'abilities') title.textContent = '特性を選択';

  modal.style.display = 'flex';
  const searchInput = document.getElementById("modal-search");
  searchInput.value = "";
  
  const currentList = listsDB[modalType] || [];
  const tabsContainer = document.getElementById("modal-tabs");
  
  if (modalType === 'natures') {
    tabsContainer.style.display = 'none';
    searchInput.style.display = 'none';
    renderNatureMatrix();
    
    document.getElementById("modal-close-btn").onclick = () => {
      modal.style.display = 'none';
    };
    return;
  }
  
  tabsContainer.style.display = 'flex';
  searchInput.style.display = 'block';
  tabsContainer.innerHTML = "";
  
  let ROWS = GOJUON_ROWS;
  if (modalType === 'items') ROWS = ITEM_CATEGORY_ROWS;
  
  let activeTabId = ROWS[0].id;
  
  ROWS.forEach(row => {
    const btn = document.createElement("button");
    btn.textContent = row.label;
    btn.className = "modal-tab-btn";
    btn.style.cssText = `background:none; border:none; color:#fff; padding:1rem 0; cursor:pointer; width:100%; border-bottom:1px solid rgba(255,255,255,0.1); transition:background 0.2s; font-size: 0.9rem;`;
    if(row.id === activeTabId) btn.style.background = 'rgba(255,255,255,0.1)';
    
    btn.onclick = () => {
      document.querySelectorAll(".modal-tab-btn").forEach(b => b.style.background = 'none');
      btn.style.background = 'rgba(255,255,255,0.1)';
      renderModalList(currentList, row.id, "", modalType);
    };
    tabsContainer.appendChild(btn);
  });
  
  renderModalList(currentList, activeTabId, "", modalType);
  
  searchInput.oninput = (e) => {
    renderModalList(currentList, null, e.target.value, modalType);
  };
  
  document.getElementById("modal-close-btn").onclick = () => {
    modal.style.display = 'none';
  };
}

function renderModalList(fullList, filterId, searchQuery, modalType) {
  const container = document.getElementById("modal-list");
  container.innerHTML = "";
  container.style.display = "grid";
  let filtered = fullList;
  
  if (modalType === 'items') {
    if (searchQuery) {
      filtered = filtered.filter(item => item.name.includes(searchQuery));
    } else if (filterId && filterId !== 'search') {
      filtered = filtered.filter(item => item.category === filterId);
    }
    
    filtered.forEach(item => {
      const btn = createModalButton(item.name);
      container.appendChild(btn);
    });
  } else {
    if (searchQuery) {
      filtered = filtered.filter(item => item.includes(searchQuery));
    } else if (filterId) {
      filtered = filtered.filter(item => getGojuonStr(item) === filterId);
    }
    
    filtered.forEach(item => {
      const btn = createModalButton(item);
      container.appendChild(btn);
    });
  }
}

function createModalButton(text) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.style.cssText = `background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:0.8rem; border-radius:8px; cursor:pointer; text-align:left; transition:background 0.2s; font-size:0.95rem;`;
  btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.15)';
  btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.05)';
  
  btn.onclick = () => {
    document.getElementById("gojuon-modal").style.display = 'none';
    if(activeModalCallback) activeModalCallback(text);
  };
  return btn;
}

function renderNatureMatrix() {
  const container = document.getElementById("modal-list");
  container.innerHTML = "";
  container.style.display = "block"; 
  
  let html = `<table style="width:100%; border-collapse:collapse; text-align:center; color:#fff; font-size:1.1rem; line-height:2.2;">`;
  html += `<tr>`;
  NATURE_COLUMNS.forEach(c => {
    html += `<th style="border:1px solid rgba(255,255,255,0.3); padding:0.5rem; background:rgba(255,255,255,0.1);">${c}</th>`;
  });
  html += `</tr>`;
  
  NATURE_MATRIX.forEach(r => {
    html += `<tr>`;
    html += `<th style="border:1px solid rgba(255,255,255,0.3); padding:0.5rem; background:rgba(255,255,255,0.1);">${r.down}</th>`;
    r.row.forEach((nature) => {
      const isNeutral = ['がんばりや', 'きまぐれ', 'まじめ', 'てれや', 'すなお'].includes(nature);
      const color = isNeutral ? '#fff' : '#0ff';
      const bg = isNeutral ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)';
      
      html += `<td class="nature-cell" data-nature="${nature}" style="border:1px solid rgba(255,255,255,0.3); padding:0.5rem; background:${bg}; color:${color}; cursor:pointer; transition:background 0.2s;">${nature}</td>`;
    });
    html += `</tr>`;
  });
  html += `</table>`;
  
  container.innerHTML = html;
  
  container.querySelectorAll('.nature-cell').forEach(td => {
    td.onmouseenter = () => td.style.background = 'rgba(255,255,255,0.3)';
    td.onmouseleave = () => {
      const n = td.getAttribute('data-nature');
      td.style.background = ['がんばりや', 'きまぐれ', 'まじめ', 'てれや', 'すなお'].includes(n) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)';
    };
    td.onclick = () => {
      document.getElementById("gojuon-modal").style.display = 'none';
      if(activeModalCallback) activeModalCallback(td.getAttribute('data-nature'));
    };
  });
}

function showEnemySuggestions(name) {
  const content = document.getElementById("suggestion-content");
  if (!name || !rankingDB[name]) {
    content.innerHTML = `<p class="empty-state">「${name||''}」の詳細データは見つかりませんでした。</p>`;
    return;
  }
  
  const data = rankingDB[name];
  let html = "";
  
  const renderList = (title, items, limit) => {
    if(!items || items.length === 0) return "";
    let res = `<div class="section-title" style="margin-top:0.8rem; font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.1rem; margin-bottom:0.2rem;">${title}</div>`;
    items.slice(0, limit).forEach(i => {
      res += `<div class="stat-item" style="padding:0.1rem 0; font-size:0.72rem; display:flex; justify-content:space-between;"><span class="stat-name">${i.name}</span><span class="stat-perc" style="color:var(--accent-color);">${i.percent}</span></div>`;
    });
    return res;
  };

  html += renderList("調整(努力値)", data.ev_spread, 3);
  html += renderList("特性", data.ability, 3);
  html += renderList("性格", data.nature, 3);
  html += renderList("採用技", data.moves, 5);
  html += renderList("持ち物", data.items, 5);
  
  content.innerHTML = html;
}

// Calculator Logic
async function updateCalculator() {
  const mySide = document.getElementById("calc-my-side");
  const enemySide = document.getElementById("calc-enemy-side");
  const resultLog = document.getElementById("damage-log");
  
  if (activeMyIndex === null || activeEnemyIndex === null) {
    resultLog.textContent = "\u81ea\u9663\u304a\u3088\u3073\u6575\u9663\u304b\u3089\u6226\u95d8\u4e2d\u306e\u30dd\u30b1\u30e2\u30f3\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002";
    renderCalcMoves();
    return;
  }
  
  const myPoke = myParty[activeMyIndex];
  const enemyPoke = enemyParty[activeEnemyIndex];
  
  if (!myPoke.name || !enemyPoke.name) { renderCalcMoves(); return; }
  
  if (!pokemonDB[myPoke.name]) {
    try { pokemonDB[myPoke.name] = await fetch(`${API_URL}/pokemon/${myPoke.name}`).then(r=>r.json()); } catch(e){}
  }
  if (!pokemonDB[enemyPoke.name]) {
    try { pokemonDB[enemyPoke.name] = await fetch(`${API_URL}/pokemon/${enemyPoke.name}`).then(r=>r.json()); } catch(e){}
  }
  
  const myData = pokemonDB[myPoke.name];
  const enData = pokemonDB[enemyPoke.name];
  if(!myData || !enData) { renderCalcMoves(); return; }
  
  // タイプは英語キーから日本語名に変換
  const myTypesJa = (myData.types || []).map(t => TYPE_EN_TO_JA[t] || t);
  const enTypesJa = (enData.types || []).map(t => TYPE_EN_TO_JA[t] || t);
  
  // VSボード
  mySide.innerHTML = `
    <div class="vs-name" style="font-size:0.95rem; font-weight:800; margin-bottom:0.3rem;">${myPoke.name}</div>
    <div class="vs-types" style="display:flex; gap:0.3rem; flex-wrap:wrap; justify-content:center;">
      ${myTypesJa.map(t => typeBadgeHTML(t)).join('')}
    </div>
  `;
  enemySide.innerHTML = `
    <div class="vs-name" style="font-size:0.95rem; font-weight:800; margin-bottom:0.3rem;">${enemyPoke.name}</div>
    <div class="vs-types" style="display:flex; gap:0.3rem; flex-wrap:wrap; justify-content:center;">
      ${enTypesJa.map(t => typeBadgeHTML(t)).join('')}
    </div>
  `;
  
  const typeResistMy = document.getElementById("type-resist-my");
  const typeResistEnemy = document.getElementById("type-resist-enemy");
  if(typeResistMy) typeResistMy.innerHTML = renderTypeMatchups(myData.types || []);
  if(typeResistEnemy) typeResistEnemy.innerHTML = renderTypeMatchups(enData.types || []);
  
  renderCalcMoves();
  
  // 攻撃方向
  const isAtk = attackDirection === 'atk';
  const atkPoke = isAtk ? myPoke : enemyPoke;
  const defPoke = isAtk ? enemyPoke : myPoke;
  const atkData = isAtk ? myData : enData;
  const defData = isAtk ? enData : myData;
  const atkRanks = isAtk ? myRanks : enemyRanks;
  const defRanks = isAtk ? enemyRanks : myRanks;
  const atkItem = isAtk ? myPoke.item : '';
  const defItem = isAtk ? '' : myPoke.item;
  const atkTypesJa = isAtk ? myTypesJa : enTypesJa;
  
  // 自陣の努力値/性格
  const myEvsObj = myPoke.evs || {h:0,a:0,b:0,c:0,d:0,s:0};
  const myNatureStr = myPoke.nature || '';

  // 敵陣の耐久設定から実数値用パラメータを逆算
  const enDur = enemyPoke.durability || '0';
  let enEvsObj = {h:0,a:0,b:0,c:0,d:0,s:0};
  let enNatureStr = '';
  if (enDur === '252') { enEvsObj.h = 252; }
  else if (enDur === 'hb252') { enEvsObj.h = 252; enEvsObj.b = 252; enNatureStr = 'ずぶとい'; } // B↑
  else if (enDur === 'hd252') { enEvsObj.h = 252; enEvsObj.d = 252; enNatureStr = 'おだやか'; } // D↑

  // 敵陣の攻撃時は、攻撃努力値・補正が不明なため現状は無振り扱いとする
  const atkEvs = isAtk ? myEvsObj : enEvsObj;
  const defEvs = isAtk ? enEvsObj : myEvsObj;
  const atkNature = isAtk ? myNatureStr : enNatureStr;
  const defNature = isAtk ? enNatureStr : myNatureStr;
  
  if(selectedMoveIndex === null) {
    resultLog.textContent = "技ボタンを選択するとダメージ計算を行います。";
    document.getElementById("damage-bar-remain").style.width = '0%';
    document.getElementById("damage-marker-min").style.display = 'none';
    document.getElementById("damage-marker-max").style.display = 'none';
    document.querySelector(".dmg-percent").textContent = "--% ~ --%";
    document.querySelector(".dmg-rolls").textContent = "\u78ba--\u767a";
    return;
  }
  
  const moveName = atkPoke.moves?.[selectedMoveIndex];
  if(!moveName) { resultLog.textContent = "\u6280\u30dc\u30bf\u30f3\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002"; return; }
  
  // \u6280\u30c7\u30fc\u30bf
  const mData = movesDetail[moveName];
  const dmgClass = mData?.damage_class || 'physical';
  const movePower = mData?.power || null;
  const moveTypeEn = mData?.type || null;
  const moveTypeJa = moveTypeEn ? (TYPE_EN_TO_JA[moveTypeEn] || moveTypeEn) : null;
  
  if(dmgClass === 'status') {
    resultLog.innerHTML = `<span style="color:#94a3b8;">「${moveName}」は変化技のためダメージはありません。</span>`;
    document.getElementById("damage-bar-remain").style.width = '100%';
    document.getElementById("damage-bar-remain").style.background = '#22c55e';
    document.getElementById("damage-marker-min").style.display = 'none';
    document.getElementById("damage-marker-max").style.display = 'none';
    document.querySelector(".dmg-percent").textContent = "---";
    document.querySelector(".dmg-rolls").textContent = "変化技";
    return;
  }
  if(!movePower) {
    resultLog.innerHTML = `<span style="color:#94a3b8;">「${moveName}」の威力データが見つかりません。可変威力技の可能性があります。</span>`;
    document.getElementById("damage-bar-remain").style.width = '0%';
    document.getElementById("damage-marker-min").style.display = 'none';
    document.getElementById("damage-marker-max").style.display = 'none';
    document.querySelector(".dmg-percent").textContent = "---";
    return;
  }
  
  const isSpecial = dmgClass === 'special';
  
  // \u5b9f\u6570\u5024
  const atkStatBase = isSpecial
    ? calcRealStat(atkData.stats['special-attack'], atkEvs.c||0, 'special-attack', atkNature)
    : calcRealStat(atkData.stats.attack, atkEvs.a||0, 'attack', atkNature);
  const defStatBase = isSpecial
    ? calcRealStat(defData.stats['special-defense'], defEvs.d||0, 'special-defense', defNature)
    : calcRealStat(defData.stats.defense, defEvs.b||0, 'defense', defNature);
  const defHp = calcRealStat(defData.stats.hp, defEvs.h||0, 'hp', '');
  
  // \u30e9\u30f3\u30af\u88dc\u6b63
  const atkStatRanked = Math.floor(atkStatBase * getRankMult(isSpecial ? atkRanks.c : atkRanks.a));
  const defStatRanked = Math.floor(defStatBase * getRankMult(isSpecial ? defRanks.d : defRanks.b));
  
  // \u6301\u3061\u7269\u88dc\u6b63(\u653b\u6483\u5074)
  const notes = [];
  let atkMult = 1.0;
  if(atkItem === '\u3053\u3060\u308f\u308a\u30cf\u30c1\u30de\u30ad' && !isSpecial) { atkMult = 1.5; notes.push('\u30cf\u30c1\u30de\u30ad\xd71.5'); }
  if(atkItem === '\u3053\u3060\u308f\u308a\u30e1\u30ac\u30cd' && isSpecial)  { atkMult = 1.5; notes.push('\u30e1\u30ac\u30cd\xd71.5'); }
  if(atkItem === '\u3044\u306e\u3061\u306e\u305f\u307e')                     { atkMult = 1.3; notes.push('\u3044\u306e\u3061\u306e\u305f\u307e\xd71.3'); }
  if(atkItem === '\u30d1\u30f3\u30c1\u30b0\u30ed\u30fc\u30d6' && !isSpecial){ atkMult = 1.1; notes.push('\u30d1\u30f3\u30c1\u30b0\u30ed\u30fc\u30d6\xd71.1'); }
  if(TYPE_BOOST_ITEMS[atkItem] === moveTypeJa)     { atkMult *= 1.2; notes.push(atkItem + "\xd71.2"); }
  
  // \u6301\u3061\u7269(\u9632\u5fa1\u5074)
  let defMult = 1.0;
  if(defItem === '\u3068\u3064\u3052\u304d\u30c1\u30e7\u30c3\u30ad' && isSpecial) { defMult = 1.5; notes.push('\u30c1\u30e7\u30c3\u30ad\u7279\u9632\xd71.5'); }
  if(defItem === '\u3057\u3093\u304b\u306e\u304d\u305b\u304d')                   { defMult = 1.5; notes.push('\u3057\u3093\u304b\u306e\u304d\u305b\u304d\xd71.5'); }
  
  // STAB
  const hasStab = moveTypeJa && atkTypesJa.includes(moveTypeJa);
  if(hasStab) notes.push('STAB\xd71.5');
  const stabMult = hasStab ? 1.5 : 1.0;

  // タイプ相性
  let typeMult = 1.0;
  if (moveTypeEn) {
    const mults = getDefensiveMultipliers(defData.types || []);
    typeMult = mults[moveTypeEn] !== undefined ? mults[moveTypeEn] : 1.0;
  }
  if (typeMult > 1.0) notes.push(`効果絶大\xd7${typeMult}`);
  if (typeMult < 1.0 && typeMult > 0) notes.push(`今ひとつ\xd7${typeMult}`);
  if (typeMult === 0) notes.push('効果なし\xd70');

  const finalAtk = Math.floor(atkStatRanked * atkMult);
  const finalDef = Math.floor(defStatRanked * defMult);
  
  // 基本ダメージ (Lv50): floor( floor( floor(22 * power * Atk / Def) / 50 ) + 2 )
  const baseDmg = Math.floor(Math.floor(Math.floor(22 * movePower * finalAtk / finalDef) / 50) + 2);
  const baseDmgStab = Math.floor(baseDmg * stabMult);
  const baseDmgFinal = Math.floor(baseDmgStab * typeMult);
  
  // 16段階乱数計算 (85/100 ～ 100/100)
  const rolls = Array.from({length:16}, (_,k) => Math.floor(baseDmgFinal * (85+k) / 100));
  const minDmg = rolls[0];
  const maxDmg = rolls[15];
  const minPct = Math.floor(minDmg / defHp * 1000) / 10;
  const maxPct = Math.floor(maxDmg / defHp * 1000) / 10;
  
  const ohkoCount = rolls.filter(r => r >= defHp).length;
  let killText = '';
  if(ohkoCount === 16)       killText = '確1発';
  else if(ohkoCount > 0)     killText = `乱数1発 (${ohkoCount}/16)`;
  else if(minDmg*2 >= defHp) killText = '確2発';
  else if(maxDmg*2 >= defHp) killText = '乱数2発';
  else                       killText = '確3発以上';
  
  const minHpPct = Math.max(0, 100 - maxPct);
  const maxHpPct = Math.max(0, 100 - minPct);
  
  const remainBar = document.getElementById("damage-bar-remain");
  remainBar.style.width = `${maxHpPct}%`;
  if (maxHpPct >= 50) remainBar.style.background = '#22c55e'; // Green
  else if (maxHpPct >= 20) remainBar.style.background = '#eab308'; // Yellow/Orange
  else remainBar.style.background = '#ef4444'; // Red
  
  const markerMin = document.getElementById("damage-marker-min");
  const markerMax = document.getElementById("damage-marker-max");
  markerMax.style.display = 'block';
  markerMax.style.left = `${maxHpPct}%`;
  
  if (minHpPct < maxHpPct) {
    markerMin.style.display = 'block';
    markerMin.style.left = `${minHpPct}%`;
  } else {
    markerMin.style.display = 'none';
  }
  
  document.querySelector(".dmg-percent").textContent = `${minPct}% ~ ${maxPct}%`;
  document.querySelector(".dmg-rolls").textContent = killText;
  
  const typeInfo = moveTypeJa ? typeBadgeHTML(moveTypeJa) : '';
  const classStr = isSpecial ? '\u7279\u6b8a' : '\u7269\u7406';
  const notesStr = notes.length ? `<br><span style="font-size:0.72rem; color:#94a3b8;">\u88dc\u6b63: ${notes.join(' / ')}</span>` : '';
  
  resultLog.innerHTML = `
    <b>\u25b6 ${atkPoke.name}</b> \u306e ${typeInfo} <b>\u300c${moveName}\u300d</b> [${classStr}\u30fb\u5a01\u529b${movePower}] \u2192 <b>${defPoke.name}</b><br>
    Atk\u5b9f\u6570\u5024 <b>${finalAtk}</b> vs Def\u5b9f\u6570\u5024 <b>${finalDef}</b> (\u6b64\u306e\u76f8\u624b\u6700\u5927HP: <b>${defHp}</b>)<br>
    \u30c0\u30e1\u30fc\u30b8: <b>${minDmg}\uff5e${maxDmg}</b> = <b style="color:#f8fafc;">${minPct}%\uff5e${maxPct}%</b>${notesStr}
  `;
}

init();

