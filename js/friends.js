let friendsList=[],pendingRequests=[],friendsPolling=null;

async function openFriends(){
  showModal('👥 Друзья',`<div style="text-align:center;padding:20px;color:#888">Загрузка...</div>`);
  await loadFriends();
  renderFriendsModal();
}

async function loadFriends(){
  const {data:accepted}=await sb.from('friendships')
    .select('*,friend:friend_id(user_id,username,balance),user:user_id(user_id,username,balance)')
    .eq('status','accepted')
    .or(`user_id.eq.${currentUser.user_id},friend_id.eq.${currentUser.user_id}`);
  friendsList=(accepted||[]).map(f=>{
    const isMe=f.user_id===currentUser.user_id;
    return isMe?f.friend:f.user;
  }).filter(Boolean);

  const {data:pending}=await sb.from('friendships')
    .select('*,user:user_id(user_id,username)')
    .eq('friend_id',currentUser.user_id)
    .eq('status','pending');
  pendingRequests=pending||[];
}

function renderFriendsModal(){
  const content=`
    <div>
      <!-- Поиск -->
      <div style="margin-bottom:12px">
        <input id="friend-search-input" placeholder="Введи username игрока..." style="width:100%;background:#0f0f1e;border:1px solid #2a2a4a;border-radius:10px;padding:10px;color:#fff;font-size:13px;font-family:Arial,sans-serif;margin-bottom:6px">
        <button onclick="searchAndAddFriend()" style="width:100%;padding:10px;background:#7F77DD;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">🔍 Найти и добавить</button>
      </div>

      <!-- Входящие заявки -->
      ${pendingRequests.length?`
        <div style="margin-bottom:12px">
          <div style="font-size:13px;font-weight:700;color:#EF9F27;margin-bottom:8px">📩 Заявки в друзья (${pendingRequests.length})</div>
          ${pendingRequests.map(r=>`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #2a2a4a">
              <div style="font-size:22px">👤</div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600">${r.user?.username||'Игрок'}</div>
                <div style="font-size:11px;color:#888">хочет добавить тебя</div>
              </div>
              <button onclick="acceptFriend(${r.id})" style="padding:5px 10px;background:#1D9E75;color:#fff;border:none;border-radius:8px;font-size:11px;cursor:pointer;font-family:Arial,sans-serif">✓</button>
              <button onclick="rejectFriend(${r.id})" style="padding:5px 10px;background:none;border:1px solid #993C1D;color:#993C1D;border-radius:8px;font-size:11px;cursor:pointer;font-family:Arial,sans-serif">✕</button>
            </div>`).join('')}
        </div>`:''}

      <!-- Список друзей -->
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">
        👥 Друзья (${friendsList.length})
      </div>
      ${!friendsList.length?`<div style="color:#888;text-align:center;padding:14px;font-size:13px">Нет друзей пока<br><br>Найди игрока по username выше</div>`:''}
      ${friendsList.map(f=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #2a2a4a">
          <div style="font-size:22px">👤</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${f.username}</div>
            <div style="font-size:11px;color:#a78bfa">${(f.balance||0).toLocaleString('ru')} 💜</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            <button onclick="inviteToDurak(${f.user_id},'${f.username}')" style="padding:5px 10px;background:#EF9F27;color:#fff;border:none;border-radius:8px;font-size:11px;cursor:pointer;font-family:Arial,sans-serif;white-space:nowrap">🃏 Дурак</button>
            <button onclick="removeFriend(${f.user_id})" style="padding:3px 8px;background:none;border:1px solid #2a2a4a;color:#888;border-radius:6px;font-size:10px;cursor:pointer;font-family:Arial,sans-serif">Удалить</button>
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('modal-content').innerHTML=content;
  document.getElementById('modal-title').textContent='👥 Друзья';
}

async function searchAndAddFriend(){
  const input=document.getElementById('friend-search-input');
  const username=input?.value?.trim();
  if(!username){alert('Введи username!');return;}
  if(username===currentUser.username){alert('Это ты сам!');return;}
  const {data:found}=await sb.from('users').select('*').ilike('username',username).single();
  if(!found){alert('Игрок не найден!');return;}
  const {data:existing}=await sb.from('friendships').select('*')
    .or(`and(user_id.eq.${currentUser.user_id},friend_id.eq.${found.user_id}),and(user_id.eq.${found.user_id},friend_id.eq.${currentUser.user_id})`)
    .single();
  if(existing){
    if(existing.status==='accepted')alert('Уже в друзьях!');
    else alert('Заявка уже отправлена!');
    return;
  }
  await sb.from('friendships').insert({user_id:currentUser.user_id,friend_id:found.user_id,status:'pending'});
  await sb.from('notifications').insert({user_id:found.user_id,type:'friend_request',data:{from_id:currentUser.user_id,from_name:currentUser.username}});
  alert('Заявка отправлена '+found.username+'!');
  if(input)input.value='';
}

async function acceptFriend(friendshipId){
  await sb.from('friendships').update({status:'accepted'}).eq('id',friendshipId);
  await loadFriends();
  renderFriendsModal();
}

async function rejectFriend(friendshipId){
  await sb.from('friendships').delete().eq('id',friendshipId);
  await loadFriends();
  renderFriendsModal();
}

async function removeFriend(friendId){
  if(!confirm('Удалить из друзей?'))return;
  await sb.from('friendships').delete()
    .or(`and(user_id.eq.${currentUser.user_id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.user_id})`);
  await loadFriends();
  renderFriendsModal();
}
// ===== ДУРАК =====
const DURAK_SUITS=['♠','♥','♦','♣'];
const DURAK_VALUES=['6','7','8','9','10','J','Q','K','A'];
let durakGame=null,durakPolling=null,durakMyId=null;

function durakCardColor(suit){return suit==='♥'||suit==='♦'?'#e74c3c':'#fff';}

function durakCreateDeck(){
  const deck=[];
  DURAK_SUITS.forEach(s=>DURAK_VALUES.forEach(v=>deck.push({s,v})));
  // Перемешать
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}

function durakCardValue(v){return DURAK_VALUES.indexOf(v);}

function durakRenderCard(card,small=false){
  if(!card)return'';
  const s=small?36:52;
  const fs=small?11:15;
  const sus=small?14:20;
  return`<div style="width:${s}px;height:${Math.floor(s*1.4)}px;background:#fff;border-radius:6px;border:2px solid #ccc;display:flex;flex-direction:column;justify-content:space-between;padding:3px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.5)">
    <div style="font-size:${fs}px;color:${durakCardColor(card.s)};font-weight:700;line-height:1">${card.v}${card.s}</div>
    <div style="font-size:${sus}px;text-align:center;color:${durakCardColor(card.s)}">${card.s}</div>
    <div style="font-size:${fs}px;color:${durakCardColor(card.s)};font-weight:700;line-height:1;transform:rotate(180deg)">${card.v}${card.s}</div>
  </div>`;
}

async function inviteToDurak(friendId,friendName){
  closeModal();
  const bet=parseInt(prompt(`Ставка для игры с ${friendName} (💜):`)||'0');
  if(isNaN(bet)||bet<0){return;}
  if(bet>bal){alert('Недостаточно 💜');return;}
  const deck=durakCreateDeck();
  const trump=deck[deck.length-1];
  const p1hand=deck.splice(0,6);
  const p2hand=deck.splice(0,6);
  const gameState={
    deck,trump,
    hands:{[currentUser.user_id]:p1hand,[friendId]:p2hand},
    table:[],
    attacker:currentUser.user_id,
    defender:friendId,
    beaten:[],
    pass:false,
    status:'waiting',
    winner:null,
  };
  if(bet>0)await saveUser({balance:bal-bet});
  const {data:game}=await sb.from('durak_games').insert({
    player1_id:currentUser.user_id,
    player2_id:friendId,
    bet,
    status:'waiting',
    game_state:gameState,
    current_turn:currentUser.user_id,
  }).select().single();
  await sb.from('notifications').insert({
    user_id:friendId,
    type:'durak_invite',
    data:{from_id:currentUser.user_id,from_name:currentUser.username,game_id:game.id,bet}
  });
  alert(`Приглашение отправлено ${friendName}!\nЖди ответа...`);
  openDurakGame(game.id);
}

async function openDurakGame(gameId){
  durakMyId=currentUser.user_id;
  const {data:game}=await sb.from('durak_games').select('*').eq('id',gameId).single();
  if(!game){alert('Игра не найдена!');return;}
  durakGame=game;

  let overlay=document.getElementById('durak-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='durak-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#0a1a0a;z-index:500;font-family:Arial,sans-serif;overflow:hidden';
    document.body.appendChild(overlay);
  }
  overlay.style.display='block';
  durakRender();
  durakStartPolling(gameId);
}

function closeDurakGame(){
  const overlay=document.getElementById('durak-overlay');
  if(overlay)overlay.style.display='none';
  if(durakPolling)clearInterval(durakPolling);
  durakPolling=null;
  durakGame=null;
}

function durakStartPolling(gameId){
  if(durakPolling)clearInterval(durakPolling);
  durakPolling=setInterval(async()=>{
    const {data:game}=await sb.from('durak_games').select('*').eq('id',gameId).single();
    if(!game)return;
    const oldStatus=durakGame?.status;
    durakGame=game;
    durakRender();
    if(game.status==='finished'&&oldStatus!=='finished'){
      clearInterval(durakPolling);
      await durakHandleFinish();
    }
  },2000);
}

function durakRender(){
  const overlay=document.getElementById('durak-overlay');
  if(!overlay||!durakGame)return;
  const gs=durakGame.game_state;
  const myHand=gs.hands?.[durakMyId]||[];
  const opId=durakGame.player1_id===durakMyId?durakGame.player2_id:durakGame.player1_id;
  const opHand=gs.hands?.[opId]||[];
  const isMyTurn=durakGame.current_turn===durakMyId;
  const amAttacker=gs.attacker===durakMyId;
  const amDefender=gs.defender===durakMyId;
  const table=gs.table||[];
  const trump=gs.trump;
  const deckLeft=gs.deck?.length||0;
  const bet=durakGame.bet||0;
  const status=durakGame.status;

  if(status==='waiting'&&durakGame.player1_id!==durakMyId){
    overlay.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:16px">🃏</div>
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:8px">Приглашение в Дурака!</div>
        <div style="font-size:14px;color:#888;margin-bottom:8px">Ставка: <span style="color:#EF9F27;font-weight:700">${bet.toLocaleString('ru')} 💜</span></div>
        <div style="font-size:13px;color:#888;margin-bottom:24px">Козырь: ${durakRenderCard(trump,true)}</div>
        <button onclick="durakAccept()" style="width:200px;padding:14px;background:#1D9E75;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;margin-bottom:10px">✅ Принять</button>
        <button onclick="durakDecline()" style="width:200px;padding:12px;background:none;border:1px solid #993C1D;color:#993C1D;border-radius:12px;font-size:14px;cursor:pointer;font-family:Arial,sans-serif">❌ Отказать</button>
      </div>`;
    return;
  }

  if(status==='waiting'&&durakGame.player1_id===durakMyId){
    overlay.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:16px">⏳</div>
        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px">Ждём противника...</div>
        <div style="font-size:13px;color:#888;margin-bottom:24px">Ставка: ${bet.toLocaleString('ru')} 💜</div>
        <button onclick="closeDurakGame()" style="padding:10px 20px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">Отмена</button>
      </div>`;
    return;
  }

  overlay.innerHTML=`
    <div style="display:flex;flex-direction:column;height:100%;padding:8px">

      <!-- Шапка -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <button onclick="closeDurakGame()" style="background:none;border:1px solid #2a2a4a;border-radius:8px;color:#888;padding:5px 10px;font-size:12px;cursor:pointer;font-family:Arial,sans-serif">← Выйти</button>
        <div style="text-align:center">
          <div style="font-size:13px;font-weight:700;color:#EF9F27">🃏 Дурак</div>
          ${bet>0?`<div style="font-size:11px;color:#a78bfa">Ставка: ${bet.toLocaleString('ru')} 💜</div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:11px;color:#888">Козырь:</div>
          ${durakRenderCard(trump,true)}
        </div>
      </div>

      <!-- Карты противника -->
      <div style="margin-bottom:8px">
        <div style="font-size:11px;color:#888;margin-bottom:4px">Противник: ${opHand.length} карт ${!amAttacker&&isMyTurn?'':'• '+(amDefender?'защищается':'атакует')}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${opHand.map(()=>`<div style="width:36px;height:50px;background:#1a3a1a;border-radius:6px;border:2px solid #2a4a2a;flex-shrink:0"></div>`).join('')}
        </div>
      </div>

      <!-- Стол -->
      <div style="flex:1;background:#0d2a0d;border-radius:12px;border:1px solid #1D9E75;padding:8px;margin-bottom:8px;overflow:hidden">
        <div style="font-size:11px;color:#888;margin-bottom:6px">
          Стол · Колода: ${deckLeft} карт
          ${isMyTurn?`<span style="color:#1D9E75;font-weight:700"> · Твой ход!</span>`:'<span style="color:#888"> · Ход противника</span>'}
        </div>
        ${!table.length?`<div style="text-align:center;color:#888;font-size:12px;padding:20px">Стол пуст · ${amAttacker?'Атакуй!':'Жди атаки'}</div>`:''}
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${table.map((pair,i)=>`
            <div style="display:flex;flex-direction:column;gap:4px;align-items:center">
              ${durakRenderCard(pair.attack,true)}
              ${pair.defense?durakRenderCard(pair.defense,true):`
                ${amDefender&&isMyTurn?`<div onclick="durakSelectDefense(${i})" id="def-slot-${i}" style="width:36px;height:50px;border:2px dashed #EF9F27;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px">?</div>`:`<div style="width:36px;height:50px;border:2px dashed #444;border-radius:6px"></div>`}
              `}
            </div>`).join('')}
        </div>
      </div>

      <!-- Действия -->
      ${isMyTurn?`
        <div style="display:flex;gap:6px;margin-bottom:8px;justify-content:center">
          ${amAttacker&&table.length>0&&table.every(p=>p.defense)?`
            <button onclick="durakEndAttack()" style="padding:8px 16px;background:#7F77DD;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">✓ Закончить атаку</button>`:''}
          ${amDefender&&table.length>0&&table.every(p=>p.defense)?`
            <button onclick="durakTakeCards()" style="padding:8px 16px;background:#993C1D;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">📥 Взять карты</button>`:''}
        </div>`:''}

      <!-- Мои карты -->
      <div>
        <div style="font-size:11px;color:#888;margin-bottom:4px">Мои карты (${myHand.length}):</div>
        <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px">
          ${myHand.map((card,i)=>`
            <div onclick="${isMyTurn?`durakPlayCard(${i})`:'return'}" style="cursor:${isMyTurn?'pointer':'default'};transform:${isMyTurn?'translateY(0px)':'none'};transition:transform 0.1s;flex-shrink:0" onmousedown="this.style.transform='translateY(-8px)'" onmouseup="this.style.transform='translateY(0)'">
              ${durakRenderCard(card)}
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

let selectedDefenseSlot=-1;

function durakSelectDefense(slotIndex){
  selectedDefenseSlot=slotIndex;
  const slots=document.querySelectorAll('[id^="def-slot-"]');
  slots.forEach(s=>s.style.borderColor='#EF9F27');
  const sel=document.getElementById('def-slot-'+slotIndex);
  if(sel)sel.style.borderColor='#fff';
  alert('Теперь нажми на карту из своей руки для защиты');
}

async function durakPlayCard(cardIndex){
  if(!durakGame)return;
  const gs={...durakGame.game_state};
  const myHand=[...(gs.hands?.[durakMyId]||[])];
  const card=myHand[cardIndex];
  if(!card)return;
  const opId=durakGame.player1_id===durakMyId?durakGame.player2_id:durakGame.player1_id;
  const amAttacker=gs.attacker===durakMyId;
  const amDefender=gs.defender===durakMyId;
  const table=gs.table||[];
  const trump=gs.trump;

  if(amAttacker){
    // Атака
    if(table.length>0&&!table.every(p=>p.defense)){
      alert('Сначала противник должен отбиться!');return;
    }
    if(table.length>=6){alert('Максимум 6 пар на столе!');return;}
    // Проверка — можно подкидывать только карты того же номинала
    if(table.length>0){
      const tableVals=table.flatMap(p=>[p.attack.v,p.defense?.v].filter(Boolean));
      if(!tableVals.includes(card.v)){alert('Можно подкидывать только '+tableVals.join('/')+' !');return;}
    }
    myHand.splice(cardIndex,1);
    table.push({attack:card,defense:null});
    gs.hands[durakMyId]=myHand;
    gs.table=table;
    await durakSaveState(gs,opId);

  } else if(amDefender){
    if(selectedDefenseSlot<0){
      // Если слот не выбран — авто выбираем первый незакрытый
      const freeIdx=table.findIndex(p=>!p.defense);
      if(freeIdx<0){alert('Нечего отбивать!');return;}
      selectedDefenseSlot=freeIdx;
    }
    const attackCard=table[selectedDefenseSlot]?.attack;
    if(!attackCard){alert('Выбери слот для защиты!');return;}
    // Проверка можно ли отбить
    const canBeat=durakCanBeat(card,attackCard,trump);
    if(!canBeat){alert('Этой картой нельзя отбить!');return;}
    myHand.splice(cardIndex,1);
    table[selectedDefenseSlot].defense=card;
    gs.hands[durakMyId]=myHand;
    gs.table=table;
    selectedDefenseSlot=-1;
    const allDefended=table.every(p=>p.defense);
    await durakSaveState(gs,allDefended?durakMyId:opId);
  }
}

function durakCanBeat(defCard,atkCard,trump){
  const defIsTrump=defCard.s===trump.s;
  const atkIsTrump=atkCard.s===trump.s;
  if(defIsTrump&&!atkIsTrump)return true;
  if(!defIsTrump&&atkIsTrump)return false;
  if(defCard.s!==atkCard.s)return false;
  return durakCardValue(defCard.v)>durakCardValue(atkCard.v);
}

async function durakEndAttack(){
  if(!durakGame)return;
  const gs={...durakGame.game_state};
  const opId=durakGame.player1_id===durakMyId?durakGame.player2_id:durakGame.player1_id;
  const table=gs.table||[];
  if(!table.every(p=>p.defense)){alert('Противник ещё не отбился!');return;}
  // Карты со стола в отбой
  gs.beaten=[...(gs.beaten||[]),...table.flatMap(p=>[p.attack,p.defense])];
  gs.table=[];
  // Добираем карты
  await durakDraw(gs);
  // Меняем роли
  const prevDef=gs.defender;
  gs.attacker=prevDef;
  gs.defender=gs.attacker===currentUser.user_id?opId:currentUser.user_id;
  // Проверяем конец игры
  const myHand=gs.hands?.[durakMyId]||[];
  const opHand=gs.hands?.[opId]||[];
  if(!gs.deck?.length&&(!myHand.length||!opHand.length)){
    gs.status='finished';
    gs.winner=!myHand.length?durakMyId:opId;
    await durakSaveState(gs,gs.attacker,true);
    return;
  }
  await durakSaveState(gs,prevDef);
}

async function durakTakeCards(){
  if(!durakGame)return;
  const gs={...durakGame.game_state};
  const opId=durakGame.player1_id===durakMyId?durakGame.player2_id:durakGame.player1_id;
  const table=gs.table||[];
  // Берём все карты со стола
  const takeCards=table.flatMap(p=>[p.attack,p.defense?.v?p.defense:null].filter(Boolean));
  gs.hands[durakMyId]=[...(gs.hands[durakMyId]||[]),...takeCards];
  gs.table=[];
  // Атакующий добирает карты
  await durakDraw(gs,true);
  // Атакующий ходит снова
  await durakSaveState(gs,opId);
}

async function durakDraw(gs,skipDefender=false){
  const opId=durakGame.player1_id===durakMyId?durakGame.player2_id:durakGame.player1_id;
  const deck=[...(gs.deck||[])];
  const drawFor=async(uid)=>{
    const hand=gs.hands[uid]||[];
    while(hand.length<6&&deck.length>0)hand.push(deck.shift());
    gs.hands[uid]=hand;
  };
  await drawFor(gs.attacker);
  if(!skipDefender)await drawFor(gs.defender);
  gs.deck=deck;
}

async function durakSaveState(gs,nextTurn,finished=false){
  const updates={
    game_state:gs,
    current_turn:nextTurn,
    updated_at:new Date().toISOString(),
  };
  if(finished){
    updates.status='finished';
    updates.winner_id=gs.winner;
  }
  await sb.from('durak_games').update(updates).eq('id',durakGame.id);
  durakGame={...durakGame,...updates};
  durakRender();
}

async function durakAccept(){
  if(!durakGame)return;
  const bet=durakGame.bet||0;
  if(bet>bal){alert('Недостаточно 💜 для ставки!');return;}
  if(bet>0)await saveUser({balance:bal-bet});
  const gs={...durakGame.game_state,status:'playing'};
  await sb.from('durak_games').update({status:'playing',game_state:gs}).eq('id',durakGame.id);
  durakGame={...durakGame,status:'playing',game_state:gs};
  durakRender();
}

async function durakDecline(){
  // Возвращаем ставку инициатору
  const bet=durakGame.bet||0;
  if(bet>0){
    const {data:p1}=await sb.from('users').select('balance').eq('user_id',durakGame.player1_id).single();
    if(p1)await sb.from('users').update({balance:p1.balance+bet}).eq('user_id',durakGame.player1_id);
  }
  await sb.from('durak_games').update({status:'declined'}).eq('id',durakGame.id);
  closeDurakGame();
}

async function durakHandleFinish(){
  if(!durakGame)return;
  const winnerId=durakGame.winner_id;
  const bet=durakGame.bet||0;
  const totalPot=bet*2;
  if(bet>0&&winnerId){
    const {data:winner}=await sb.from('users').select('balance').eq('user_id',winnerId).single();
    if(winner)await sb.from('users').update({balance:winner.balance+totalPot}).eq('user_id',winnerId);
  }
  const isWinner=winnerId===durakMyId;
  const opId=durakGame.player1_id===durakMyId?durakGame.player2_id:durakGame.player1_id;
  const overlay=document.getElementById('durak-overlay');
  if(overlay){
    overlay.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px">
        <div style="font-size:64px;margin-bottom:16px">${isWinner?'🏆':'🃏'}</div>
        <div style="font-size:22px;font-weight:700;color:${isWinner?'#1D9E75':'#cc3333'};margin-bottom:8px">${isWinner?'Ты победил!':'Ты проиграл!'}</div>
        ${bet>0?`<div style="font-size:16px;color:${isWinner?'#EF9F27':'#888'};margin-bottom:24px">${isWinner?'+'+totalPot.toLocaleString('ru')+' 💜':'-'+bet.toLocaleString('ru')+' 💜'}</div>`:''}
        <button onclick="closeDurakGame()" style="width:200px;padding:14px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Выйти</button>
      </div>`;
  }
}

async function checkNotifications(){
  if(!currentUser)return;
  const {data}=await sb.from('notifications')
    .select('*').eq('user_id',currentUser.user_id).eq('read',false);
  if(!data||!data.length)return;
  for(const notif of data){
    await sb.from('notifications').update({read:true}).eq('id',notif.id);
    if(notif.type==='friend_request'){
      const badge=document.getElementById('friends-badge');
      if(badge)badge.style.display='block';
    }
    if(notif.type==='durak_invite'){
      const d=notif.data;
      if(confirm(`🃏 ${d.from_name} приглашает тебя в Дурака!\nСтавка: ${(d.bet||0).toLocaleString('ru')} 💜\n\nПринять?`)){
        const {data:game}=await sb.from('durak_games').select('*').eq('id',d.game_id).single();
        if(game){durakGame=game;openDurakGame(d.game_id);}
      }
    }
  }
}
