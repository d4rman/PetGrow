let currentLobby=null,lobbyPolling=null,lobbyMyId=null;

async function openLobbies(){
  let overlay=document.getElementById('lobby-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='lobby-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#080d14;z-index:500;overflow-y:auto;font-family:Arial,sans-serif';
    document.body.appendChild(overlay);
  }
  overlay.style.display='block';
  await renderLobbies();
}

function closeLobbies(){
  const overlay=document.getElementById('lobby-overlay');
  if(overlay)overlay.style.display='none';
  if(lobbyPolling)clearInterval(lobbyPolling);
  lobbyPolling=null;
}

async function renderLobbies(){
  const overlay=document.getElementById('lobby-overlay');
  if(!overlay)return;
  const {data:lobbies}=await sb.from('game_lobbies')
    .select('*').eq('status','waiting')
    .order('created_at',{ascending:false});

  overlay.innerHTML=`
  <div style="background:#080d14;min-height:100%;padding:12px;padding-bottom:80px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <button onclick="closeLobbies()" style="background:none;border:1px solid #2a2a4a;border-radius:8px;color:#888;padding:6px 12px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">← Назад</button>
      <div style="font-size:15px;font-weight:700;color:#EF9F27">🎮 Игровые столы</div>
      <button onclick="openCreateLobby()" style="background:#7F77DD;border:none;border-radius:8px;color:#fff;padding:6px 12px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif;font-weight:700">+ Создать</button>
    </div>

    <div style="background:#0f0f1e;border-radius:12px;padding:12px;margin-bottom:12px;border:1px solid #2a2a4a">
      <div style="font-size:12px;color:#888;margin-bottom:4px">Твой баланс</div>
      <div style="font-size:20px;font-weight:700;color:#a78bfa">${bal.toLocaleString('ru')} 💜</div>
    </div>

    <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:10px">
      Открытые столы (${(lobbies||[]).length})
    </div>

    ${!lobbies||!lobbies.length?`
      <div style="text-align:center;padding:40px 20px;color:#888">
        <div style="font-size:48px;margin-bottom:12px">🃏</div>
        <div style="font-size:14px">Нет открытых столов</div>
        <div style="font-size:12px;margin-top:6px">Создай свой!</div>
      </div>`:''}

    ${(lobbies||[]).map(l=>{
      const players=l.players||[];
      const isMember=players.some(p=>p.id===currentUser.user_id);
      const isHost=l.host_id===currentUser.user_id;
      const isFull=players.length>=l.max_players;
      return`<div style="background:#16213e;border:1px solid #2a2a4a;border-radius:14px;padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-size:14px;font-weight:700;color:#fff">${l.name||'Стол #'+l.id}</div>
            <div style="font-size:11px;color:#888;margin-top:2px">🃏 Дурак · до ${l.max_players} игроков</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;color:#EF9F27;font-weight:700">${l.bet>0?l.bet.toLocaleString('ru')+' 💜':'Без ставки'}</div>
            <div style="font-size:11px;color:#888;margin-top:2px">${players.length}/${l.max_players} игроков</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
          ${players.map(p=>`
            <div style="background:#0f0f1e;border-radius:8px;padding:4px 8px;font-size:11px;color:${p.id===l.host_id?'#EF9F27':'#a78bfa'};display:flex;align-items:center;gap:4px">
              ${p.id===l.host_id?'👑':' 👤'} ${p.name}
            </div>`).join('')}
          ${Array(l.max_players-players.length).fill(0).map(()=>`
            <div style="background:#0f0f1e;border:1px dashed #2a2a4a;border-radius:8px;padding:4px 8px;font-size:11px;color:#444">
              ожидание...
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          ${!isMember&&!isFull?`<button onclick="joinLobby(${l.id})" style="flex:1;padding:10px;background:#1D9E75;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Присоединиться</button>`:''}
          ${isMember&&!isHost?`<button onclick="leaveLobby(${l.id})" style="flex:1;padding:10px;background:none;border:1px solid #993C1D;color:#993C1D;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Покинуть</button>`:''}
          ${isMember?`<button onclick="openLobbyRoom(${l.id})" style="flex:1;padding:10px;background:#7F77DD;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Войти в лобби</button>`:''}
          ${isHost?`<button onclick="deleteLobby(${l.id})" style="padding:10px 14px;background:none;border:1px solid #2a2a4a;color:#888;border-radius:10px;font-size:12px;cursor:pointer;font-family:Arial,sans-serif">Удалить</button>`:''}
          ${isFull&&!isMember?`<div style="flex:1;padding:10px;background:#2a2a4a;color:#888;border-radius:10px;font-size:13px;text-align:center">Стол заполнен</div>`:''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function openCreateLobby(){
  selectedMaxPlayers=2;
  selectedLobbyBet=0;
  showModal('➕ Создать стол',`
    <div>
      <div style="font-size:13px;color:#888;margin-bottom:12px">Создай стол и пригласи игроков</div>
      <div style="font-size:12px;color:#888;margin-bottom:4px">Название:</div>
      <input id="lobby-name" placeholder="Название стола..." style="width:100%;background:#0f0f1e;border:1px solid #2a2a4a;border-radius:10px;padding:10px;color:#fff;font-size:13px;margin-bottom:12px;font-family:Arial,sans-serif;box-sizing:border-box">
      <div style="font-size:12px;color:#888;margin-bottom:6px">Максимум игроков:</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button id="mp-2" onclick="selectMaxPlayers(2)" style="flex:1;padding:10px;background:#1a1035;border:2px solid #7F77DD;border-radius:10px;color:#a78bfa;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">2</button>
        <button id="mp-3" onclick="selectMaxPlayers(3)" style="flex:1;padding:10px;background:#0f0f1e;border:2px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">3</button>
        <button id="mp-4" onclick="selectMaxPlayers(4)" style="flex:1;padding:10px;background:#0f0f1e;border:2px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">4</button>
      </div>
      <div style="font-size:12px;color:#888;margin-bottom:6px">Ставка:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <button id="bet-0" onclick="selectLobbyBet(0)" style="padding:8px 12px;background:#1a1035;border:2px solid #7F77DD;border-radius:8px;color:#a78bfa;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Без ставки</button>
        <button id="bet-100" onclick="selectLobbyBet(100)" style="padding:8px 12px;background:#0f0f1e;border:2px solid #2a2a4a;border-radius:8px;color:#888;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">100</button>
        <button id="bet-500" onclick="selectLobbyBet(500)" style="padding:8px 12px;background:#0f0f1e;border:2px solid #2a2a4a;border-radius:8px;color:#888;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">500</button>
        <button id="bet-1000" onclick="selectLobbyBet(1000)" style="padding:8px 12px;background:#0f0f1e;border:2px solid #2a2a4a;border-radius:8px;color:#888;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">1000</button>
        <button id="bet-5000" onclick="selectLobbyBet(5000)" style="padding:8px 12px;background:#0f0f1e;border:2px solid #2a2a4a;border-radius:8px;color:#888;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">5000</button>
      </div>
      <input type="number" id="lobby-bet-custom" placeholder="Своя ставка..." style="width:100%;background:#0f0f1e;border:1px solid #2a2a4a;border-radius:10px;padding:10px;color:#fff;font-size:13px;margin-bottom:14px;font-family:Arial,sans-serif;box-sizing:border-box" oninput="selectLobbyBetCustom(parseInt(this.value)||0)">
      <button onclick="createLobby()" style="width:100%;padding:14px;background:linear-gradient(135deg,#7F77DD,#EF9F27);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
        🎮 Создать стол
      </button>
    </div>`);
}

let selectedMaxPlayers=2,selectedLobbyBet=0;

function selectMaxPlayers(n){
  selectedMaxPlayers=n;
  [2,3,4].forEach(i=>{
    const btn=document.getElementById('mp-'+i);
    if(!btn)return;
    if(i===n){btn.style.background='#1a1035';btn.style.borderColor='#7F77DD';btn.style.color='#a78bfa';}
    else{btn.style.background='#0f0f1e';btn.style.borderColor='#2a2a4a';btn.style.color='#888';}
  });
}

function selectLobbyBet(amount){
  selectedLobbyBet=amount;
  [0,100,500,1000,5000].forEach(v=>{
    const btn=document.getElementById('bet-'+v);
    if(!btn)return;
    if(v===amount){btn.style.background='#1a1035';btn.style.borderColor='#7F77DD';btn.style.color='#a78bfa';}
    else{btn.style.background='#0f0f1e';btn.style.borderColor='#2a2a4a';btn.style.color='#888';}
  });
}

function selectLobbyBetCustom(amount){
  selectedLobbyBet=amount;
  [0,100,500,1000,5000].forEach(v=>{
    const btn=document.getElementById('bet-'+v);
    if(btn){btn.style.background='#0f0f1e';btn.style.borderColor='#2a2a4a';btn.style.color='#888';}
  });
}

async function createLobby(){
  const nameEl=document.getElementById('lobby-name');
  const name=(nameEl?.value?.trim())||'Стол '+currentUser.username;
  if(selectedLobbyBet>bal){alert('Недостаточно 💜');return;}
  const players=[{id:currentUser.user_id,name:currentUser.username,ready:false}];
  const {data:lobby,error}=await sb.from('game_lobbies').insert({
    name:name,
    host_id:currentUser.user_id,
    max_players:selectedMaxPlayers,
    bet:selectedLobbyBet,
    status:'waiting',
    players:players,
    game_state:{},
  }).select().single();
  if(error){alert('Ошибка: '+error.message);return;}
  closeModal();
  if(lobby)openLobbyRoom(lobby.id);
}

async function joinLobby(lobbyId){
  const {data:lobby}=await sb.from('game_lobbies').select('*').eq('id',lobbyId).single();
  if(!lobby){alert('Стол не найден!');return;}
  if(lobby.status!=='waiting'){alert('Игра уже началась!');return;}
  const players=lobby.players||[];
  if(players.length>=lobby.max_players){alert('Стол заполнен!');return;}
  if(players.some(p=>p.id===currentUser.user_id)){openLobbyRoom(lobbyId);return;}
  if(lobby.bet>bal){alert('Недостаточно 💜 для ставки '+lobby.bet.toLocaleString('ru')+' 💜');return;}
  players.push({id:currentUser.user_id,name:currentUser.username,ready:false});
  await sb.from('game_lobbies').update({players,updated_at:new Date().toISOString()}).eq('id',lobbyId);
  openLobbyRoom(lobbyId);
}

async function leaveLobby(lobbyId){
  if(!confirm('Покинуть стол?'))return;
  const {data:lobby}=await sb.from('game_lobbies').select('*').eq('id',lobbyId).single();
  if(!lobby)return;
  const players=(lobby.players||[]).filter(p=>p.id!==currentUser.user_id);
  await sb.from('game_lobbies').update({players,updated_at:new Date().toISOString()}).eq('id',lobbyId);
  await renderLobbies();
}

async function deleteLobby(lobbyId){
  if(!confirm('Удалить стол?'))return;
  await sb.from('game_lobbies').delete().eq('id',lobbyId);
  await renderLobbies();
}
async function openLobbyRoom(lobbyId){
  currentLobby=null;
  lobbyMyId=currentUser.user_id;
  const overlay=document.getElementById('lobby-overlay');
  if(overlay)overlay.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#888;font-size:14px">Загрузка...</div>';
  const {data:lobby}=await sb.from('game_lobbies').select('*').eq('id',lobbyId).single();
  if(!lobby){alert('Стол не найден!');return;}
  currentLobby=lobby;
  renderLobbyRoom();
  if(lobbyPolling)clearInterval(lobbyPolling);
  lobbyPolling=setInterval(async()=>{
    const {data}=await sb.from('game_lobbies').select('*').eq('id',lobbyId).single();
    if(!data){clearInterval(lobbyPolling);closeLobbies();return;}
    const wasWaiting=currentLobby?.status==='waiting';
    currentLobby=data;
    if(data.status==='playing'&&wasWaiting){
      renderDurakMulti();
    } else if(data.status==='playing'){
      renderDurakMulti();
    } else {
      renderLobbyRoom();
    }
  },2000);
}

function renderLobbyRoom(){
  const overlay=document.getElementById('lobby-overlay');
  if(!overlay||!currentLobby)return;
  const players=currentLobby.players||[];
  const isHost=currentLobby.host_id===lobbyMyId;
  const myPlayer=players.find(p=>p.id===lobbyMyId);
  const amReady=myPlayer?.ready||false;
  const allReady=players.length>=2&&players.every(p=>p.ready);
  const bet=currentLobby.bet||0;

  overlay.innerHTML=`
  <div style="background:#080d14;min-height:100%;padding:12px;padding-bottom:80px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <button onclick="leaveLobbyRoom()" style="background:none;border:1px solid #2a2a4a;border-radius:8px;color:#888;padding:6px 12px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">← Выйти</button>
      <div style="font-size:15px;font-weight:700;color:#EF9F27">🎮 ${currentLobby.name||'Лобби'}</div>
      <div style="font-size:11px;color:#888">#${currentLobby.id}</div>
    </div>

    <div style="background:#0f0f1e;border-radius:12px;padding:12px;margin-bottom:12px;border:1px solid #2a2a4a">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:12px;color:#888">Ставка</div>
          <div style="font-size:18px;font-weight:700;color:#EF9F27">${bet>0?bet.toLocaleString('ru')+' 💜':'Без ставки'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:#888">Игроки</div>
          <div style="font-size:18px;font-weight:700;color:#a78bfa">${players.length}/${currentLobby.max_players}</div>
        </div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:10px">Игроки за столом:</div>
    ${players.map((p,i)=>`
      <div style="background:#16213e;border:1px solid ${p.id===currentLobby.host_id?'#EF9F27':p.ready?'#1D9E75':'#2a2a4a'};border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
        <div style="font-size:24px">${p.id===currentLobby.host_id?'👑':'👤'}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600;color:#fff">${p.name}${p.id===lobbyMyId?' (Ты)':''}</div>
          <div style="font-size:11px;color:${p.ready?'#1D9E75':'#888'}">${p.id===currentLobby.host_id?'Хозяин стола':p.ready?'✅ Готов':'⏳ Не готов'}</div>
        </div>
        ${isHost&&p.id!==lobbyMyId?`<button onclick="kickPlayer(${p.id})" style="padding:4px 8px;background:none;border:1px solid #993C1D;border-radius:6px;color:#993C1D;font-size:10px;cursor:pointer;font-family:Arial,sans-serif">Кик</button>`:''}
      </div>`).join('')}

    ${Array(currentLobby.max_players-players.length).fill(0).map(()=>`
      <div style="background:#0f0f1e;border:1px dashed #2a2a4a;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;opacity:0.5">
        <div style="font-size:24px">👤</div>
        <div style="font-size:13px;color:#444">Ожидание игрока...</div>
      </div>`).join('')}

    <div style="position:fixed;bottom:0;left:0;width:100%;background:rgba(8,13,20,0.97);border-top:1px solid #2a2a4a;padding:12px;z-index:501;font-family:Arial,sans-serif">
      ${!amReady&&!isHost?`
        <button onclick="setReady(true)" style="width:100%;padding:14px;background:#1D9E75;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          ✅ Готов к игре
        </button>`:''}
      ${amReady&&!isHost?`
        <button onclick="setReady(false)" style="width:100%;padding:14px;background:none;border:2px solid #888;color:#888;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          ↩️ Не готов
        </button>`:''}
      ${isHost?`
        <button onclick="startLobbyGame()" ${!allReady?'disabled':''} style="width:100%;padding:14px;background:${allReady?'linear-gradient(135deg,#7F77DD,#EF9F27)':'#2a2a4a'};color:${allReady?'#fff':'#888'};border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:${allReady?'pointer':'default'};font-family:Arial,sans-serif">
          ${allReady?'⚔️ Начать игру!':'⏳ Ждём всех игроков...'}
        </button>`:''}
    </div>
  </div>`;
}

async function setReady(ready){
  if(!currentLobby)return;
  const players=[...(currentLobby.players||[])];
  const idx=players.findIndex(p=>p.id===lobbyMyId);
  if(idx<0)return;
  players[idx].ready=ready;
  await sb.from('game_lobbies').update({players,updated_at:new Date().toISOString()}).eq('id',currentLobby.id);
  currentLobby.players=players;
  renderLobbyRoom();
}

async function kickPlayer(playerId){
  if(!currentLobby)return;
  const players=(currentLobby.players||[]).filter(p=>p.id!==playerId);
  await sb.from('game_lobbies').update({players,updated_at:new Date().toISOString()}).eq('id',currentLobby.id);
  currentLobby.players=players;
  renderLobbyRoom();
}

async function leaveLobbyRoom(){
  if(!currentLobby)return;
  if(currentLobby.host_id===lobbyMyId){
    if(!confirm('Удалить стол?'))return;
    await sb.from('game_lobbies').delete().eq('id',currentLobby.id);
  } else {
    const players=(currentLobby.players||[]).filter(p=>p.id!==lobbyMyId);
    await sb.from('game_lobbies').update({players,updated_at:new Date().toISOString()}).eq('id',currentLobby.id);
  }
  if(lobbyPolling)clearInterval(lobbyPolling);
  currentLobby=null;
  closeLobbies();
  openLobbies();
}

async function startLobbyGame(){
  if(!currentLobby)return;
  const players=currentLobby.players||[];
  if(players.length<2){alert('Нужно минимум 2 игрока!');return;}
  if(!players.every(p=>p.ready)){alert('Не все готовы!');return;}
  const bet=currentLobby.bet||0;
  // Снимаем ставки
  if(bet>0){
    for(const p of players){
      if(p.id===currentLobby.host_id)continue;
      const {data:u}=await sb.from('users').select('balance').eq('user_id',p.id).single();
      if(u&&u.balance<bet){alert(p.name+' не имеет достаточно 💜!');return;}
    }
    for(const p of players){
      const {data:u}=await sb.from('users').select('balance').eq('user_id',p.id).single();
      if(u)await sb.from('users').update({balance:u.balance-bet}).eq('user_id',p.id);
    }
    if(lobbyMyId===currentLobby.host_id){
      await saveUser({balance:bal-bet});
    }
  }
  // Создаём игру
  const gs=initDurakMultiGame(players);
  await sb.from('game_lobbies').update({
    status:'playing',
    game_state:gs,
    current_turn:gs.attacker,
    updated_at:new Date().toISOString(),
  }).eq('id',currentLobby.id);
  currentLobby.status='playing';
  currentLobby.game_state=gs;
  renderDurakMulti();
}

// ===== ДУРАК МУЛЬТИПЛЕЕР =====
const SUITS=['♠','♥','♦','♣'];
const VALS=['6','7','8','9','10','J','Q','K','A'];

function cardVal(v){return VALS.indexOf(v);}
function cardColor(s){return s==='♥'||s==='♦'?'#ff5555':'#5588ff';}
function cardBg(s){return s==='♥'||s==='♦'?'linear-gradient(135deg,#2a0a0a,#1a0505)':'linear-gradient(135deg,#0a0a2a,#050515)';}
function cardBorder(s){return s==='♥'||s==='♦'?'#cc3333':'#3333cc';}

function renderCardMulti(card,small=false,clickFn=''){
  if(!card)return'';
  const w=small?34:50,h=small?48:70;
  const nfs=small?9:13,sus=small?13:18;
  const col=cardColor(card.s);
  return`<div onclick="${clickFn}" style="width:${w}px;height:${h}px;background:${cardBg(card.s)};border-radius:6px;border:2px solid ${cardBorder(card.s)};display:flex;flex-direction:column;justify-content:space-between;padding:3px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.8);cursor:${clickFn?'pointer':'default'}${clickFn?';transform:translateY(0);transition:transform 0.1s':''}" ${clickFn?'onmousedown="this.style.transform=\'translateY(-8px)\'" onmouseup="this.style.transform=\'translateY(0)\'"':''}>
    <div style="font-size:${nfs}px;color:${col};font-weight:700;line-height:1">${card.v}${card.s}</div>
    <div style="font-size:${sus}px;text-align:center;color:${col}">${card.s}</div>
    <div style="font-size:${nfs}px;color:${col};font-weight:700;line-height:1;transform:rotate(180deg)">${card.v}${card.s}</div>
  </div>`;
}

function renderCardBack(small=false){
  const w=small?34:50,h=small?48:70;
  return`<div style="width:${w}px;height:${h}px;background:linear-gradient(135deg,#1a1a3a,#0a0a1a);border-radius:6px;border:2px solid #2a2a5a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:${small?12:18}px">🂠</div>`;
}

function initDurakMultiGame(players){
  const deck=[];
  SUITS.forEach(s=>VALS.forEach(v=>deck.push({s,v})));
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  const trump=deck[deck.length-1];
  const hands={};
  players.forEach(p=>{hands[p.id]=deck.splice(0,6);});
  // Определяем первого атакующего — у кого младший козырь
  let firstAttacker=players[0].id;
  let minTrump=99;
  players.forEach(p=>{
    const trumpCards=hands[p.id].filter(c=>c.s===trump.s);
    trumpCards.forEach(c=>{
      if(cardVal(c.v)<minTrump){minTrump=cardVal(c.v);firstAttacker=p.id;}
    });
  });
  const playerIds=players.map(p=>p.id);
  const attackerIdx=playerIds.indexOf(firstAttacker);
  const defenderIdx=(attackerIdx+1)%playerIds.length;
  return{
    deck,trump,hands,
    table:[],beaten:[],
    players:playerIds,
    attacker:firstAttacker,
    defender:playerIds[defenderIdx],
    status:'playing',
    winner:null,
    losers:[],
    pass:false,
    canTransfer:false,
  };
}

function canBeatCard(def,atk,trump){
  const defTrump=def.s===trump.s,atkTrump=atk.s===trump.s;
  if(defTrump&&!atkTrump)return true;
  if(!defTrump&&atkTrump)return false;
  if(def.s!==atk.s)return false;
  return cardVal(def.v)>cardVal(atk.v);
}

let selectedCardIdx=-1,selectedDefSlot=-1;

function renderDurakMulti(){
  const overlay=document.getElementById('lobby-overlay');
  if(!overlay||!currentLobby)return;
  const gs=currentLobby.game_state;
  if(!gs){overlay.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#888">Загрузка игры...</div>';return;}
  const myHand=gs.hands?.[lobbyMyId]||[];
  const players=currentLobby.players||[];
  const trump=gs.trump;
  const table=gs.table||[];
  const isMyTurn=currentLobby.current_turn===lobbyMyId;
  const amAttacker=gs.attacker===lobbyMyId;
  const amDefender=gs.defender===lobbyMyId;
  const deckLeft=gs.deck?.length||0;

  if(gs.status==='finished'){
    renderDurakFinish();
    return;
  }

  // Остальные игроки
  const others=players.filter(p=>p.id!==lobbyMyId);

  overlay.innerHTML=`
  <div style="display:flex;flex-direction:column;height:100vh;background:#0a1a0a;overflow:hidden">

    <!-- Шапка -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(0,0,0,0.5)">
      <div style="display:flex;align-items:center;gap:6px">
        <div style="font-size:12px;color:#888">Козырь:</div>
        ${renderCardMulti(trump,true)}
        <div style="font-size:11px;color:#888">Колода: ${deckLeft}</div>
      </div>
      <div style="font-size:13px;font-weight:700;color:#EF9F27">🃏 Дурак</div>
      <div style="font-size:11px;color:${isMyTurn?'#1D9E75':'#888'};font-weight:700">${isMyTurn?'Твой ход!':'Ход другого'}</div>
    </div>

    <!-- Карты других игроков -->
    <div style="padding:8px 12px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      ${others.map(p=>{
        const pData=players.find(pl=>pl.id===p.id);
        const hand=gs.hands?.[p.id]||[];
        const isAtt=gs.attacker===p.id;
        const isDef=gs.defender===p.id;
        return`<div style="text-align:center">
          <div style="font-size:10px;color:${isAtt?'#EF9F27':isDef?'#cc3333':'#888'};margin-bottom:4px;font-weight:${isAtt||isDef?'700':'400'}">
            ${pData?.name||'Игрок'} ${isAtt?'⚔️':isDef?'🛡️':''} (${hand.length})
          </div>
          <div style="display:flex;gap:2px;justify-content:center">
            ${hand.slice(0,8).map(()=>renderCardBack(true)).join('')}
            ${hand.length>8?`<div style="color:#888;font-size:10px;align-self:center">+${hand.length-8}</div>`:''}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Стол -->
    <div style="flex:1;margin:0 8px;background:#0d2a0d;border-radius:12px;border:1px solid #1D9E75;padding:8px;overflow:auto">
      <div style="font-size:11px;color:#888;margin-bottom:6px">
        Стол · ${amAttacker?'Ты атакуешь':amDefender?'Ты защищаешься':'Наблюдаешь'}
      </div>
      ${!table.length?`<div style="text-align:center;color:#888;font-size:12px;padding:16px">${amAttacker?'Нажми карту чтобы атаковать':'Ждём атаки...'}</div>`:''}
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
        ${table.map((pair,i)=>`
          <div style="display:flex;flex-direction:column;gap:4px;align-items:center">
            ${renderCardMulti(pair.attack,true)}
            ${pair.defense
              ?renderCardMulti(pair.defense,true)
              :amDefender&&isMyTurn
                ?`<div onclick="selectDefSlot(${i})" style="width:34px;height:48px;border:2px dashed ${selectedDefSlot===i?'#fff':'#EF9F27'};border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;background:${selectedDefSlot===i?'rgba(255,255,255,0.1)':'transparent'}">?</div>`
                :`<div style="width:34px;height:48px;border:2px dashed #333;border-radius:6px"></div>`
            }
          </div>`).join('')}
      </div>
    </div>

    <!-- Кнопки действий -->
    <div style="padding:6px 8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
      ${isMyTurn&&amDefender&&table.length>0?`
        <button onclick="multiTakeCards()" style="padding:8px 14px;background:#993C1D;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">📥 Взять</button>`:''}
      ${isMyTurn&&amDefender&&table.length>0&&table.every(p=>p.defense)?`
        <button onclick="multiEndDefense()" style="padding:8px 14px;background:#1D9E75;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">✅ Отбился</button>`:''}
      ${isMyTurn&&amAttacker&&table.length>0&&table.every(p=>p.defense)?`
        <button onclick="multiEndAttack()" style="padding:8px 14px;background:#7F77DD;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">✓ Закончить</button>`:''}
      ${!isMyTurn?`<div style="font-size:12px;color:#888;padding:8px">⏳ Ожидаем ход...</div>`:''}
    </div>

    <!-- Мои карты -->
    <div style="padding:8px 12px;background:rgba(0,0,0,0.4)">
      <div style="font-size:11px;color:#888;margin-bottom:6px">Мои карты (${myHand.length})${selectedCardIdx>=0?' · Карта выбрана':''}</div>
      <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px">
        ${myHand.map((card,i)=>`
          <div onclick="${isMyTurn?`multiPlayCard(${i})`:''}" style="flex-shrink:0;transform:${selectedCardIdx===i?'translateY(-10px)':'translateY(0)'};transition:transform 0.15s;cursor:${isMyTurn?'pointer':'default'}">
            ${renderCardMulti(card,false)}
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function selectDefSlot(i){
  selectedDefSlot=i;
  renderDurakMulti();
}

async function multiPlayCard(cardIdx){
  if(!currentLobby||!currentLobby.game_state)return;
  const gs=JSON.parse(JSON.stringify(currentLobby.game_state));
  const myHand=[...(gs.hands?.[lobbyMyId]||[])];
  const card=myHand[cardIdx];
  if(!card)return;
  const amAttacker=gs.attacker===lobbyMyId;
  const amDefender=gs.defender===lobbyMyId;
  const table=gs.table||[];
  const trump=gs.trump;
  const playerIds=gs.players||[];

  if(amAttacker){
    if(table.length>0&&!table.every(p=>p.defense)){alert('Противник ещё не отбился!');return;}
    if(table.length>=6){alert('Максимум 6 пар!');return;}
    if(table.length>0){
      const tableVals=table.flatMap(p=>[p.attack.v,p.defense?.v].filter(Boolean));
      if(!tableVals.includes(card.v)){alert('Можно подкидывать только: '+[...new Set(tableVals)].join(', '));return;}
    }
    myHand.splice(cardIdx,1);
    table.push({attack:card,defense:null});
    gs.hands[lobbyMyId]=myHand;
    gs.table=table;
    selectedCardIdx=-1;
    const defIdx=playerIds.indexOf(gs.defender);
    await multiSaveState(gs,gs.defender);

  } else if(amDefender){
    // Переводной дурак — если карта того же номинала что атакующая
    if(table.length>0&&table.every(p=>!p.defense)){
      const attackVals=table.map(p=>p.attack.v);
      if(attackVals.includes(card.v)&&attackVals.every(v=>v===attackVals[0])){
        // Можно перевести
        if(confirm('Перевести атаку следующему игроку?')){
          const defIdx=playerIds.indexOf(gs.defender);
          const nextDefIdx=(defIdx+1)%playerIds.length;
          const nextDef=playerIds[nextDefIdx];
          if(nextDef===gs.attacker){alert('Некуда переводить!');return;}
          table.push({attack:card,defense:null});
          myHand.splice(cardIdx,1);
          gs.hands[lobbyMyId]=myHand;
          gs.table=table;
          gs.attacker=lobbyMyId;
          gs.defender=nextDef;
          selectedCardIdx=-1;
          await multiSaveState(gs,nextDef);
          return;
        }
      }
    }
    // Обычная защита
    if(selectedDefSlot<0){
      const freeIdx=table.findIndex(p=>!p.defense);
      if(freeIdx<0){alert('Нечего отбивать!');return;}
      selectedDefSlot=freeIdx;
    }
    const attackCard=table[selectedDefSlot]?.attack;
    if(!attackCard){alert('Выбери слот!');return;}
    if(!canBeatCard(card,attackCard,trump)){alert('Нельзя отбить этой картой!');return;}
    myHand.splice(cardIdx,1);
    table[selectedDefSlot].defense=card;
    gs.hands[lobbyMyId]=myHand;
    gs.table=table;
    selectedDefSlot=-1;
    selectedCardIdx=-1;
    const allDefended=table.every(p=>p.defense);
    await multiSaveState(gs,allDefended?lobbyMyId:gs.defender);
  } else {
    // Подкидывание
    if(table.length>0&&table.every(p=>p.defense)){
      const tableVals=table.flatMap(p=>[p.attack.v,p.defense?.v].filter(Boolean));
      if(!tableVals.includes(card.v)){alert('Можно подкидывать только: '+[...new Set(tableVals)].join(', '));return;}
      if(table.length>=6){alert('Максимум 6 пар!');return;}
      myHand.splice(cardIdx,1);
      table.push({attack:card,defense:null});
      gs.hands[lobbyMyId]=myHand;
      gs.table=table;
      selectedCardIdx=-1;
      await multiSaveState(gs,gs.defender);
    }
  }
}

async function multiEndAttack(){
  if(!currentLobby)return;
  const gs=JSON.parse(JSON.stringify(currentLobby.game_state));
  const table=gs.table||[];
  if(!table.every(p=>p.defense)){alert('Не все отбиты!');return;}
  gs.beaten=[...(gs.beaten||[]),...table.flatMap(p=>[p.attack,p.defense])];
  gs.table=[];
  await multiDraw(gs);
  // Следующий атакующий — защищавшийся
  const prevDef=gs.defender;
  const playerIds=gs.players||[];
  const defIdx=playerIds.indexOf(prevDef);
  const nextDefIdx=(defIdx+1)%playerIds.length;
  gs.attacker=prevDef;
  gs.defender=playerIds[nextDefIdx];
  if(gs.attacker===gs.defender){
    const ni=(nextDefIdx+1)%playerIds.length;
    gs.defender=playerIds[ni];
  }
  await checkMultiFinish(gs);
}

async function multiEndDefense(){
  if(!currentLobby)return;
  const gs=JSON.parse(JSON.stringify(currentLobby.game_state));
  const table=gs.table||[];
  if(!table.every(p=>p.defense)){alert('Не все карты отбиты!');return;}
  gs.beaten=[...(gs.beaten||[]),...table.flatMap(p=>[p.attack,p.defense])];
  gs.table=[];
  await multiDraw(gs);
  const playerIds=gs.players||[];
  const defIdx=playerIds.indexOf(lobbyMyId);
  const nextAtkIdx=playerIds.indexOf(gs.attacker);
  gs.attacker=lobbyMyId;
  const nextDefIdx=(defIdx+1)%playerIds.length;
  gs.defender=playerIds[nextDefIdx];
  if(gs.attacker===gs.defender){
    gs.defender=playerIds[(nextDefIdx+1)%playerIds.length];
  }
  await checkMultiFinish(gs);
}

async function multiTakeCards(){
  if(!currentLobby)return;
  const gs=JSON.parse(JSON.stringify(currentLobby.game_state));
  const table=gs.table||[];
  const takeCards=table.flatMap(p=>[p.attack,p.defense].filter(Boolean));
  gs.hands[lobbyMyId]=[...(gs.hands[lobbyMyId]||[]),...takeCards];
  gs.table=[];
  await multiDraw(gs,true);
  const playerIds=gs.players||[];
  const defIdx=playerIds.indexOf(lobbyMyId);
  const nextAtkIdx=(defIdx+1)%playerIds.length;
  gs.attacker=playerIds[nextAtkIdx];
  const nextDefIdx=(nextAtkIdx+1)%playerIds.length;
  gs.defender=playerIds[nextDefIdx];
  if(gs.attacker===gs.defender){
    gs.defender=playerIds[(nextDefIdx+1)%playerIds.length];
  }
  await checkMultiFinish(gs);
}

async function multiDraw(gs,skipDefender=false){
  const playerIds=gs.players||[];
  const deck=[...(gs.deck||[])];
  const drawFor=async(uid)=>{
    const hand=gs.hands[uid]||[];
    while(hand.length<6&&deck.length>0)hand.push(deck.shift());
    gs.hands[uid]=hand;
  };
  // Сначала атакующий
  await drawFor(gs.attacker);
  // Потом остальные кроме защитника если skipDefender
  for(const pid of playerIds){
    if(pid===gs.attacker)continue;
    if(skipDefender&&pid===gs.defender)continue;
    await drawFor(pid);
  }
  if(!skipDefender)await drawFor(gs.defender);
  gs.deck=deck;
}

async function checkMultiFinish(gs){
  const playerIds=gs.players||[];
  const deckEmpty=!gs.deck?.length;
  if(deckEmpty){
    // Убираем игроков без карт (они победили)
    const active=playerIds.filter(pid=>(gs.hands[pid]||[]).length>0);
    if(active.length<=1){
      gs.status='finished';
      gs.winner=active.length===0?null:active[0];
      gs.losers=[active.length===0?playerIds[playerIds.length-1]:active[0]];
      await multiSaveState(gs,null,true);
      return;
    }
    gs.players=active;
    if(!active.includes(gs.attacker)){
      gs.attacker=active[0];
      gs.defender=active[1]||active[0];
    }
    if(!active.includes(gs.defender)){
      const idx=active.indexOf(gs.attacker);
      gs.defender=active[(idx+1)%active.length];
    }
  }
  await multiSaveState(gs,gs.attacker);
}

async function multiSaveState(gs,nextTurn,finished=false){
  const updates={
    game_state:gs,
    current_turn:nextTurn,
    updated_at:new Date().toISOString(),
  };
  if(finished){
    updates.status='finished';
    updates.winner_id=gs.winner;
  }
  await sb.from('game_lobbies').update(updates).eq('id',currentLobby.id);
  currentLobby={...currentLobby,...updates};
  if(finished)await multiHandleFinish();
  else renderDurakMulti();
}

async function multiHandleFinish(){
  const gs=currentLobby.game_state;
  const players=currentLobby.players||[];
  const bet=currentLobby.bet||0;
  if(bet>0&&gs.winner){
    const totalPot=bet*players.length;
    const {data:winner}=await sb.from('users').select('balance').eq('user_id',gs.winner).single();
    if(winner)await sb.from('users').update({balance:winner.balance+totalPot}).eq('user_id',gs.winner);
    if(gs.winner===lobbyMyId)await saveUser({balance:bal+totalPot});
  }
  renderDurakFinish();
}

function renderDurakFinish(){
  const overlay=document.getElementById('lobby-overlay');
  if(!overlay||!currentLobby)return;
  const gs=currentLobby.game_state;
  const players=currentLobby.players||[];
  const bet=currentLobby.bet||0;
  const isWinner=gs.winner===lobbyMyId;
  const totalPot=bet*players.length;
  overlay.innerHTML=`
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px;background:#0a1a0a">
    <div style="font-size:64px;margin-bottom:16px">${isWinner?'🏆':gs.winner?'🃏':'🤝'}</div>
    <div style="font-size:22px;font-weight:700;color:${isWinner?'#EF9F27':gs.winner?'#cc3333':'#888'};margin-bottom:8px">
      ${isWinner?'Ты победил!':gs.winner?'Ты проиграл!':'Ничья!'}
    </div>
    ${gs.winner&&bet>0?`<div style="font-size:16px;color:${isWinner?'#1D9E75':'#cc3333'};margin-bottom:24px">${isWinner?'+'+totalPot.toLocaleString('ru')+' 💜':'-'+bet.toLocaleString('ru')+' 💜'}</div>`:''}
    <div style="background:#16213e;border-radius:14px;padding:14px;width:100%;max-width:300px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">Итоги:</div>
      ${players.map(p=>{
        const hand=gs.hands?.[p.id]||[];
        const isW=gs.winner===p.id;
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #2a2a4a">
          <span style="color:${isW?'#EF9F27':'#888'};font-size:13px">${isW?'👑':hand.length>0?'💀':'✅'} ${p.name}</span>
          <span style="color:${isW?'#1D9E75':'#cc3333'};font-size:12px;font-weight:700">${isW&&bet>0?'+'+totalPot.toLocaleString('ru'):bet>0?'-'+bet.toLocaleString('ru'):''}</span>
        </div>`;
      }).join('')}
    </div>
    <button onclick="closeLobbies();openLobbies()" style="width:200px;padding:14px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
      🎮 К столам
    </button>
  </div>`;
}
