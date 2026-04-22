// master.js
const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898',
  steel: '#B7B7CE', fairy: '#D685AD'
};

const TYPE_NAMES_JA = {
  normal:'ノーマル', fire:'ほのお', water:'みず', electric:'でんき', grass:'くさ',
  ice:'こおり', fighting:'かくとう', poison:'どく', ground:'じめん', flying:'ひこう',
  psychic:'エスパー', bug:'むし', rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン',
  dark:'あく', steel:'はがね', fairy:'フェアリー'
};

let allMasterData = [];
let allItemsData = [];
let showChampionOnly = false;
let currentTab = 'pokemon'; // 'pokemon' or 'item'

document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('master-tbody');
  const itemsTbody = document.getElementById('item-tbody');
  
  try {
    const res = await fetch('/api/masterdata');
    if (!res.ok) throw new Error('Failed to fetch data');
    allMasterData = await res.json();
    renderTable(allMasterData);
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #ff5555;">データの読み込みに失敗しました</td></tr>`;
  }

  try {
    const res2 = await fetch('/api/masterdata/items');
    if (!res2.ok) throw new Error('Failed to fetch items data');
    allItemsData = await res2.json();
    renderItemsTable(allItemsData);
  } catch (e) {
    console.error(e);
    itemsTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ff5555;">アイテムデータの読み込みに失敗しました</td></tr>`;
  }

  // CSVアップロード
  const csvForm = document.getElementById('csv-upload-form');
  if(csvForm) {
    csvForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('csv-file');
      if(!fileInput.files || fileInput.files.length === 0) {
        alert('CSVファイルを選択してください。');
        return;
      }
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const btn = document.getElementById('csv-submit-btn');
      btn.textContent = '読込中...';
      btn.disabled = true;
      
      try {
        const res = await fetch('/api/import_csv', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        alert(result.message || 'インポートが完了しました。ページをリロードします。');
        location.reload();
      } catch(err) {
        console.error(err);
        alert('インポートに失敗しました。');
      } finally {
        btn.textContent = 'CSV読込';
        btn.disabled = false;
      }
    });
  }

  const searchInput = document.getElementById('search-input');
  const filterChampion = document.getElementById('filter-champion');

  function applyFilters() {
    const query = searchInput.value.trim();
    if (currentTab === 'pokemon') {
      let filtered = allMasterData;
      if (showChampionOnly) filtered = filtered.filter(d => d.is_champion);
      if (query) filtered = filtered.filter(d => d.name.includes(query));
      renderTable(filtered);
    } else {
      let filtered = allItemsData;
      if (showChampionOnly) filtered = filtered.filter(d => d.is_champion);
      if (query) filtered = filtered.filter(d => d.name.includes(query));
      renderItemsTable(filtered);
    }
  }

  searchInput.addEventListener('input', applyFilters);
  filterChampion.addEventListener('change', (e) => {
    showChampionOnly = e.target.checked;
    applyFilters();
  });
  
  document.getElementById('tab-pokemon').addEventListener('click', () => {
    currentTab = 'pokemon';
    document.getElementById('tab-pokemon').classList.add('active');
    document.getElementById('tab-item').classList.remove('active');
    document.getElementById('pokemon-table').style.display = 'table';
    document.getElementById('item-table').style.display = 'none';
    applyFilters();
  });
  
  document.getElementById('tab-item').addEventListener('click', () => {
    currentTab = 'item';
    document.getElementById('tab-item').classList.add('active');
    document.getElementById('tab-pokemon').classList.remove('active');
    document.getElementById('item-table').style.display = 'table';
    document.getElementById('pokemon-table').style.display = 'none';
    applyFilters();
  });
});

function renderTable(data) {
  const tbody = document.getElementById('master-tbody');
  tbody.innerHTML = '';

  if(data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align: center;">該当するデータがありません</td></tr>`;
    return;
  }

  data.forEach(p => {
    const tr = document.createElement('tr');
    
    // Types
    const typesHtml = p.types.map(t => {
      const color = TYPE_COLORS[t] || '#777';
      const label = TYPE_NAMES_JA[t] || t;
      return `<span class="type-badge-small" style="background-color: ${color}40; border: 1px solid ${color}; color: ${color};">${label}</span>`;
    }).join('');

    // Stats
    const st = p.stats;
    const h = st.hp || 0, a = st.attack || 0, b = st.defense || 0;
    const c = st['special-attack'] || 0, d = st['special-defense'] || 0, s = st.speed || 0;

    // Moves top 3
    const movesTop3 = (p.moves || []).slice(0, 3).map(m => `<li>${m.name} <span style="opacity:0.6;font-size:0.75rem;">${m.percent}</span></li>`).join('');
    const movesHtml = movesTop3 ? `<ul class="top-list">${movesTop3}</ul>` : '<span style="opacity:0.3">-</span>';

    // Items top 3
    const itemsTop3 = (p.items || []).slice(0, 3).map(i => `<li>${i.name} <span style="opacity:0.6;font-size:0.75rem;">${i.percent}</span></li>`).join('');
    const itemsHtml = itemsTop3 ? `<ul class="top-list">${itemsTop3}</ul>` : '<span style="opacity:0.3">-</span>';

    const spriteUrl = p.id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png` : '';

    tr.innerHTML = `
      <td class="poke-name-col">
        ${spriteUrl ? `<img src="${spriteUrl}" alt="" style="width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` : ''}
        ${p.name}
      </td>
      <td>${typesHtml}</td>
      <td style="text-align:center;">
        <input type="checkbox" class="champion-flag-checkbox" data-poke="${p.name}" ${p.is_champion ? 'checked' : ''} style="width:1.2rem; height:1.2rem; cursor:pointer;" title="採用フラグ">
      </td>
      <td><span class="stat-val">${h}</span></td>
      <td><span class="stat-val">${a}</span></td>
      <td><span class="stat-val">${b}</span></td>
      <td><span class="stat-val">${c}</span></td>
      <td><span class="stat-val">${d}</span></td>
      <td><span class="stat-val">${s}</span></td>
      <td><span class="stat-val stat-total">${p.bst}</span></td>
      <td>${movesHtml}</td>
      <td>${itemsHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  // バインディング：フラグ更新
  document.querySelectorAll(".champion-flag-checkbox").forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const name = e.target.getAttribute('data-poke');
      const is_champion = e.target.checked;
      
      const poke = allMasterData.find(d => d.name === name);
      if(poke) poke.is_champion = is_champion;
      
      try {
        await fetch('/api/flags/pokemon', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, is_champion })
        });
      } catch (err) {
        console.error("フラグの保存に失敗:", err);
      }
    });
  });
}

function renderItemsTable(data) {
  const tbody = document.getElementById('item-tbody');
  tbody.innerHTML = '';
  
  if(data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">該当するデータがありません</td></tr>`;
    return;
  }
  
  data.forEach(item => {
    const tr = document.createElement('tr');
    
    const catJa = item.category === 'berry' ? 'きのみ' : item.category === 'mega' ? 'メガストーン' : 'その他';
    
    tr.innerHTML = `
      <td style="font-weight:600; color:#fff;">${item.name}</td>
      <td><span class="type-badge-small" style="background-color:rgba(255,255,255,0.1); color:#ccc;">${catJa}</span></td>
      <td style="text-align:center;">
        <input type="checkbox" class="item-flag-checkbox" data-item="${item.name}" ${item.is_champion ? 'checked' : ''} style="width:1.2rem; height:1.2rem; cursor:pointer;" title="採用フラグ">
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.querySelectorAll('.item-flag-checkbox').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const name = e.target.getAttribute('data-item');
      const is_champion = e.target.checked;
      
      const targetData = allItemsData.find(d => d.name === name);
      if(targetData) targetData.is_champion = is_champion;
      
      try {
        await fetch('/api/flags/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, is_champion })
        });
      } catch (err) {
        console.error("アイテムフラグの保存に失敗:", err);
      }
    });
  });
}
