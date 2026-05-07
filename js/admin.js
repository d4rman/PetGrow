async function adminCreateCase(){
  const name=document.getElementById('a-case-name').value.trim();
  const price=parseInt(document.getElementById('a-case-price').value)||0;
  const cooldown=parseInt(document.getElementById('a-case-cooldown').value)||0;
  const emoji=document.getElementById('a-case-emoji').value.trim()||'📦';
  if(!name){alert('Введи название!');return;}
  await sb.from('cases').insert({name,price,cooldown_hours:cooldown,image_url:emoji,is_free:price===0,is_active:true});
  alert('Кейс создан!');
  ['a-case-name','a-case-price','a-case-cooldown','a-case-emoji'].forEach(id=>document.getElementById(id).value='');
  loadCases();
}

async function adminAddItem(){
  const caseId=document.getElementById('a-item-case').value;
  const name=document.getElementById('a-item-name').value.trim();
  const emoji=document.getElementById('a-item-emoji').value.trim()||'❓';
  const rarity=document.getElementById('a-item-rarity').value;
  const chance=parseFloat(document.getElementById('a-item-chance').value)||0;
  if(!caseId||!name||!chance){alert('Заполни все поля!');return;}
  await sb.from('case_items').insert({case_id:parseInt(caseId),item_name:name,item_emoji:emoji,rarity,chance});
  alert('Предмет добавлен!');
  ['a-item-name','a-item-emoji','a-item-chance'].forEach(id=>document.getElementById(id).value='');
}

async function loadAdminCasesList(){
  const list=document.getElementById('admin-cases-list');if(!list)return;
  const {data}=await sb.from('cases').select('*').order('created_at',{ascending:false});
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Нет кейсов</div>';return;}
  list.innerHTML=data.map(c=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2a2a4a">
      <div><span style="font-size:18px">${c.image_url||'📦'}</span> <span style="font-size:13px;font-weight:600">${c.name}</span></div>
      <button onclick="adminToggleCase(${c.id},${c.is_active})" style="padding:4px 10px;background:none;border:1px solid #2a2a4a;border-radius:8px;color:${c.is_active?'#1D9E75':'#888'};font-size:11px;cursor:pointer;font-family:Arial,sans-serif">${c.is_active?'Скрыть':'Показать'}</button>
    </div>`).join('');
}

async function adminToggleCase(id,current){
  await sb.from('cases').update({is_active:!current}).eq('id',id);
  loadCases();
}

async function adminAddPet(){
  const name=document.getElementById('a-pet-name').value.trim();
  const emoji=document.getElementById('a-pet-emoji').value.trim()||'🐱';
  const imgUrl=document.getElementById('a-pet-img').value.trim()||null;
  const desc=document.getElementById('a-pet-desc').value.trim();
  const price=parseInt(document.getElementById('a-pet-price').value)||0;
  if(!name){alert('Введи имя!');return;}
  await sb.from('pets').insert({name,emoji,image_url:imgUrl,description:desc,price_diamonds:price,is_starter:false});
  alert('Питомец добавлен!');
  ['a-pet-name','a-pet-emoji','a-pet-img','a-pet-desc','a-pet-price'].forEach(id=>document.getElementById(id).value='');
  loadAdminPetsList();
}

async function loadAdminPetsList(){
  const list=document.getElementById('admin-pets-list');if(!list)return;
  const {data}=await sb.from('pets').select('*').order('id');
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Нет питомцев</div>';return;}
  list.innerHTML=data.map(p=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2a4a">
      <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#0f0f1e;display:flex;align-items:center;justify-content:center">
        ${p.image_url?`<img src="${p.image_url}" style="width:40px;height:40px;object-fit:cover">`:`<span style="font-size:26px">${p.emoji}</span>`}
      </div>
      <div><div style="font-size:13px;font-weight:600">${p.name}</div>
      <div style="font-size:11px;color:#888">${p.price_diamonds?p.price_diamonds+' 💜':'Бесплатный'}</div></div>
    </div>`).join('');
}

async function adminGiveBalance(){
  const uid=parseInt(document.getElementById('a-give-id').value);
  const amount=parseInt(document.getElementById('a-give-amount').value);
  if(!uid||!amount){alert('Заполни поля!');return;}
  const {data:u}=await sb.from('users').select('balance').eq('user_id',uid).single();
  if(!u){alert('Игрок не найден!');return;}
  await sb.from('users').update({balance:u.balance+amount}).eq('user_id',uid);
  if(currentUser.user_id===uid){currentUser.balance=u.balance+amount;updateUI();}
  alert('Выдано '+amount+' 💜');
}

async function adminCreatePromo(){
  const code=document.getElementById('a-promo-code').value.trim().toUpperCase();
  const amount=parseInt(document.getElementById('a-promo-amount').value)||0;
  const uses=parseInt(document.getElementById('a-promo-uses').value)||1;
  if(!code){alert('Введи код!');return;}
  const {error}=await sb.from('promocodes').insert({code,reward_diamonds:amount,max_uses:uses,used_count:0,is_active:true});
  if(error){alert('Ошибка: '+error.message);return;}
  alert('Промокод создан!');
  ['a-promo-code','a-promo-amount','a-promo-uses'].forEach(id=>document.getElementById(id).value='');
  loadPromoList();
}

async function loadPromoList(){
  const list=document.getElementById('promo-list');if(!list)return;
  const {data}=await sb.from('promocodes').select('*').order('created_at',{ascending:false});
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Нет промокодов</div>';return;}
  list.innerHTML=data.map(p=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2a2a4a">
      <div><div style="font-size:13px;font-weight:700;color:#a78bfa">${p.code}</div>
      <div style="font-size:11px;color:#888">+${p.reward_diamonds} 💜 · ${p.used_count}/${p.max_uses}</div></div>
      <button onclick="adminTogglePromo(${p.id},${p.is_active})" style="padding:4px 10px;background:none;border:1px solid #2a2a4a;border-radius:8px;color:${p.is_active?'#1D9E75':'#888'};font-size:11px;cursor:pointer;font-family:Arial,sans-serif">${p.is_active?'Выкл':'Вкл'}</button>
    </div>`).join('');
}

async function adminTogglePromo(id,current){
  await sb.from('promocodes').update({is_active:!current}).eq('id',id);
  loadPromoList();
}

async function loadPlayersList(){
  const list=document.getElementById('players-list');if(!list)return;
  const {data}=await sb.from('users').select('user_id,username,balance').order('balance',{ascending:false}).limit(50);
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Нет игроков</div>';return;}
  list.innerHTML=data.map(u=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2a2a4a">
      <div><div style="font-size:13px;font-weight:600">${u.username}</div>
      <div style="font-size:11px;color:#888">ID: ${u.user_id}</div></div>
      <div style="font-size:13px;color:#a78bfa;font-weight:700">${u.balance.toLocaleString('ru')} 💜</div>
    </div>`).join('');
}

function switchAdminTab(tabId,btn){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}
