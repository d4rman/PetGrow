const SUPABASE_URL='https://tlrrbahllgrynhpgwcax.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscnJiYWhsbGdyeW5ocGd3Y2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDQ3MDYsImV4cCI6MjA5MzIyMDcwNn0.f9Qnunl1GjF8sj_iT3YoZOLESHya_P38H4RL7eAzDSU';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const ADMIN_IDS=[717860240];
const RC={common:50,rare:200,vr:500,epic:1500,legendary:5000};
const RN={common:'Обычный',rare:'Редкий',vr:'Очень редкий',epic:'Эпический',legendary:'Легендарный'};
const RCOL={common:'#888',rare:'#378ADD',vr:'#1D9E75',epic:'#a78bfa',legendary:'#EF9F27'};
const ACC_BONUS={common:5,rare:10,vr:20,epic:35,legendary:50};
const PET_NAMES=['Рекс','Дракоша','Орлик','Квакша','Барсик'];
const ACHIEVEMENTS=[
  {key:'earn_1k',emoji:'🥉',title:'Первая тысяча',desc:'Заработай 1,000 💜',threshold:1000},
  {key:'earn_10k',emoji:'🥈',title:'Десять тысяч',desc:'Заработай 10,000 💜',threshold:10000},
  {key:'earn_50k',emoji:'🥇',title:'Полтинник',desc:'Заработай 50,000 💜',threshold:50000},
  {key:'earn_100k',emoji:'💎',title:'Сотка',desc:'Заработай 100,000 💜',threshold:100000},
  {key:'earn_500k',emoji:'👑',title:'Пол миллиона',desc:'Заработай 500,000 💜',threshold:500000},
  {key:'earn_1m',emoji:'🌟',title:'Миллионер',desc:'Заработай 1,000,000 💜',threshold:1000000},
];

let currentUser=null,bal=0,activePet=null,incomeTimer=null;

async function initUser(){
  const tg=window.Telegram?.WebApp;
  if(tg){tg.ready();tg.expand();}
  const tgUser=tg?.initDataUnsafe?.user;
  if(!tgUser){document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#888;font-size:14px;text-align:center;padding:20px">Игра доступна только через Telegram<br><br>@PetGrow_bot</div>';return;}
  const userId=tgUser.id,username=tgUser.first_name||'Игрок';
  let {data:user}=await sb.from('users').select('*').eq('user_id',userId).single();
  if(!user){
    await sb.from('users').insert({user_id:userId,username,last_collected:new Date().toISOString(),uncollected_income:0});
    const r=await sb.from('users').select('*').eq('user_id',userId).single();
    user=r.data;
  }
  currentUser=user;bal=user.balance;
  if(ADMIN_IDS.includes(userId))document.getElementById('admin-menu-btn').style.display='flex';
  await loadActivePet();
  await checkAchievements();
  updateUI();startIncomeTimer();loadCases();
setInterval(checkNotifications,15000);
checkNotifications();
}

async function loadActivePet(){
  if(!currentUser)return;
  const {data}=await sb.from('user_pets').select('*,pets(*)').eq('user_id',currentUser.user_id).eq('is_active',true).single();
  activePet=data||null;
}

function calcIncome(){
  if(!activePet)return 0;
  const s=activePet.speed||1,a=activePet.agility||1,c=activePet.charm||1;
  return Math.round((s+a+c)*10*(parseFloat(activePet.boost)||1)*(1+(parseFloat(activePet.acc_bonus)||0)/100));
}

function calcUpgradeCost(level){return Math.floor(100*Math.pow(1.5,level-1));}

function setAvatarEl(elId,imageUrl,emoji,size){
  const el=document.getElementById(elId);if(!el)return;
  el.innerHTML=imageUrl?`<img src="${imageUrl}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:inherit">`:`<span style="font-size:${Math.floor(size*0.65)}px">${emoji}</span>`;
}

function updateUI(){
  if(!currentUser)return;
  bal=currentUser.balance;
  document.querySelectorAll('[id^="bal-"]').forEach(el=>el.textContent=bal.toLocaleString('ru'));
  setAvatarEl('pet-avatar-main',activePet?.pets?.image_url||null,activePet?.pets?.emoji||'🐱',56);
  setAvatarEl('pet-avatar-big',activePet?.pets?.image_url||null,activePet?.pets?.emoji||'🐱',100);
  if(!activePet){
    ['pet-name-display','pet-name-big'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='Нет питомца';});
    ['income-badge','income-big'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='Получи питомца через промокод PETCASE';});
    ['collect-card','pet-upgrade-card','acc-card'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    return;
  }
  ['collect-card','pet-upgrade-card','acc-card'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='block';});
  const s=activePet.speed||1,a=activePet.agility||1,c=activePet.charm||1,boost=parseFloat(activePet.boost)||1,income=calcIncome();
  document.getElementById('p-speed').textContent=s;
  document.getElementById('p-agility').textContent=a;
  document.getElementById('p-charm').textContent=c;
  document.getElementById('p-boost').textContent=boost+'x';
  document.getElementById('u-speed').textContent='ур.'+s;
  document.getElementById('u-agility').textContent='ур.'+a;
  document.getElementById('u-charm').textContent='ур.'+c;
  document.getElementById('cost-speed').textContent=calcUpgradeCost(s)+' 💜';
  document.getElementById('cost-agility').textContent=calcUpgradeCost(a)+' 💜';
  document.getElementById('cost-charm').textContent=calcUpgradeCost(c)+' 💜';
  document.getElementById('boost-bar').style.width=Math.min(boost/5*100,100)+'%';
  document.getElementById('income-badge').textContent='💜 +'+income+' / час';
  document.getElementById('income-big').textContent='💜 +'+income+' / час · Бустер '+boost+'x';
  const name=activePet.custom_name||activePet.pets?.name||'Питомец';
  document.getElementById('pet-name-display').textContent=name;
  document.getElementById('pet-name-big').textContent=name;
  if(typeof updateAccDisplay==='function')updateAccDisplay();
  const sl=document.getElementById('stat-lost');
const sw=document.getElementById('stat-won');
const sp=document.getElementById('stat-profit');
if(sl)sl.textContent=(currentUser.total_lost||0).toLocaleString('ru')+' 💜';
if(sw)sw.textContent=(currentUser.total_won||0).toLocaleString('ru')+' 💜';
if(sp){
  const profit=(currentUser.total_won||0)-(currentUser.total_lost||0);
  sp.textContent=(profit>=0?'+':'')+profit.toLocaleString('ru')+' 💜';
  sp.style.color=profit>=0?'#1D9E75':'#cc3333';
}
}

function startIncomeTimer(){
  if(incomeTimer)clearInterval(incomeTimer);
  incomeTimer=setInterval(()=>{
    if(!currentUser||!activePet)return;
    const ipm=calcIncome()/60,last=new Date(currentUser.last_collected||Date.now()),min=(Date.now()-last.getTime())/60000,unc=Math.floor(min*ipm);
    const el=document.getElementById('uncollected-amount'),bar=document.getElementById('collect-bar'),btn=document.getElementById('collect-btn'),info=document.getElementById('collect-info');
    if(el)el.textContent=unc.toLocaleString('ru')+' 💜';
    if(bar){const sec=(Date.now()-last.getTime())/1000%60;bar.style.width=Math.min(sec/60*100,100)+'%';}
    if(info)info.textContent='+'+Math.floor(ipm)+' 💜 каждую минуту';
    if(btn)btn.disabled=unc<=0;
  },1000);
}

async function collectIncome(){
  if(!currentUser||!activePet)return;
  const ipm=calcIncome()/60,last=new Date(currentUser.last_collected||Date.now()),min=(Date.now()-last.getTime())/60000,unc=Math.floor(min*ipm);
  if(unc<=0){alert('Ещё не накопилось!');return;}
  await saveUser({balance:bal+unc,last_collected:new Date().toISOString()});
  alert('Собрано: +'+unc+' 💜');
  checkAchievements();
}

async function saveUser(updates){
  if(!currentUser)return;
  await sb.from('users').update(updates).eq('user_id',currentUser.user_id);
  Object.assign(currentUser,updates);updateUI();
}

async function savePet(updates){
  if(!activePet)return;
  await sb.from('user_pets').update(updates).eq('id',activePet.id);
  Object.assign(activePet,updates);updateUI();
}

async function feedPet(){if(!activePet){alert('Нет питомца!');return;}await savePet({boost:2.0,last_fed:new Date().toISOString()});alert('Питомец сыт! Бустер 2x 😸');}

async function upgrade(stat){
  if(!activePet){alert('Нет питомца!');return;}
  const cur=activePet[stat]||1,cost=calcUpgradeCost(cur);
  if(bal<cost){alert('Нужно '+cost+' 💜');return;}
  await saveUser({balance:bal-cost});await savePet({[stat]:cur+1});
  alert({speed:'⚡ Скорость',agility:'🎯 Ловкость',charm:'✨ Милость'}[stat]+' → ур.'+(cur+1));
}

async function renamePet(){
  if(!activePet){alert('Нет питомца!');return;}
  const name=prompt('Новое имя:',activePet.custom_name||'Питомец');
  if(!name||!name.trim())return;
  await savePet({custom_name:name.trim()});
}

async function loadMyPets(){
  const list=document.getElementById('my-pets-list');list.innerHTML='<div class="loading">Загрузка...</div>';
  const {data}=await sb.from('user_pets').select('*,pets(*)').eq('user_id',currentUser.user_id);
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Нет питомцев<br><br>Введи промокод <b>PETCASE</b> в Меню</div>';return;}
  list.innerHTML=data.map(up=>`
    <div class="pet-card ${up.is_active?'active-pet':''}" onclick="setActivePet(${up.id})">
      <div class="pet-avatar">${up.pets?.image_url?`<img src="${up.pets.image_url}" style="width:56px;height:56px;object-fit:cover">`:`<span style="font-size:36px">${up.pets?.emoji||'🐱'}</span>`}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700">${up.custom_name||up.pets?.name||'Питомец'}</div>
        <div style="font-size:12px;color:#888">⚡${up.speed} 🎯${up.agility} ✨${up.charm} 🔥${up.boost}x</div>
        <div style="font-size:11px;color:#4fc3f7">Бафф: +${up.acc_bonus||0}%</div>
      </div>
      ${up.is_active?'<span style="font-size:11px;color:#1D9E75;font-weight:700;flex-shrink:0">Активен</span>':'<span style="font-size:10px;color:#888;flex-shrink:0">Выбрать</span>'}
    </div>`).join('');
}

async function setActivePet(petId){
  await sb.from('user_pets').update({is_active:false}).eq('user_id',currentUser.user_id);
  await sb.from('user_pets').update({is_active:true}).eq('id',petId);
  await loadActivePet();updateUI();await loadMyPets();alert('Питомец активирован!');
}

async function updateAccDisplay(){
  const display=document.getElementById('acc-slots-display');
  if(!display||!activePet)return;
  const slots=[activePet.acc_slot_1,activePet.acc_slot_2,activePet.acc_slot_3].filter(Boolean);
  if(!slots.length){display.innerHTML='<div class="empty-msg" style="padding:8px 0">Нет аксессуаров</div>';return;}
  const {data:accs}=await sb.from('inventory').select('*').in('id',slots);
  display.innerHTML=(accs||[]).map(ac=>`
    <div class="acc-slot">
      ${ac.item_image?`<img src="${ac.item_image}" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0">`:`<span style="font-size:24px">${ac.item_type||'❓'}</span>`}
      <div style="flex:1"><div style="font-size:13px;font-weight:600">${ac.item_name}</div>
      <div style="font-size:11px;color:${RCOL[ac.rarity]||'#888'}">+${ACC_BONUS[ac.rarity]||0}% к доходу</div></div>
      <button onclick="unequipOne(${ac.id})" style="padding:4px 8px;background:none;border:1px solid #993C1D;border-radius:8px;color:#993C1D;font-size:10px;cursor:pointer;font-family:Arial,sans-serif;flex-shrink:0">Снять</button>
    </div>`).join('');
}

async function showEquipAcc(){
  const {data}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('is_equipped',false);
  const items=(data||[]).filter(it=>!it.item_name.startsWith('Семя ')&&!PET_NAMES.some(n=>it.item_name.includes(n)));
  if(!items.length){alert('Нет предметов!');return;}
  showModal('Выбери акс',items.map(it=>`
    <div class="seed-item" onclick="closeModal();equipAcc(${it.id})">
      ${it.item_image?`<img src="${it.item_image}" style="width:40px;height:40px;object-fit:cover;border-radius:8px">`:`<span style="font-size:28px">${it.item_type||'❓'}</span>`}
      <div style="flex:1"><div style="font-size:14px;font-weight:600">${it.item_name}</div>
      <div style="font-size:11px;color:#4fc3f7">+${ACC_BONUS[it.rarity]||0}% к доходу</div></div>
    </div>`).join(''));
}

async function equipAcc(itemId){
  if(!activePet){alert('Нет питомца!');return;}
  const slots=['acc_slot_1','acc_slot_2','acc_slot_3'];let free=null;
  for(const s of slots){if(!activePet[s]){free=s;break;}}
  if(!free){alert('Все 3 слота заняты!');return;}
  const {data:item}=await sb.from('inventory').select('*').eq('id',itemId).single();
  if(!item)return;
  const bonus=ACC_BONUS[item.rarity]||0,newBonus=(parseFloat(activePet.acc_bonus)||0)+bonus;
  await sb.from('user_pets').update({[free]:itemId,acc_bonus:newBonus}).eq('id',activePet.id);
  await sb.from('inventory').update({is_equipped:true}).eq('id',itemId);
  Object.assign(activePet,{[free]:itemId,acc_bonus:newBonus});updateUI();
  alert('Акс надет! +'+bonus+'%');
}

async function unequipOne(itemId){
  if(!activePet)return;
  const slots=['acc_slot_1','acc_slot_2','acc_slot_3'];let slotR=null;
  for(const s of slots){if(activePet[s]===itemId){slotR=s;break;}}
  if(!slotR)return;
  const {data:item}=await sb.from('inventory').select('*').eq('id',itemId).single();
  const bonus=item?ACC_BONUS[item.rarity]||0:0,newBonus=Math.max(0,(parseFloat(activePet.acc_bonus)||0)-bonus);
  await sb.from('user_pets').update({[slotR]:null,acc_bonus:newBonus}).eq('id',activePet.id);
  await sb.from('inventory').update({is_equipped:false}).eq('id',itemId);
  Object.assign(activePet,{[slotR]:null,acc_bonus:newBonus});updateUI();
  alert('Акс снят!');
}

async function checkAchievements(){
  if(!currentUser)return;
  const total=currentUser.balance||0;
  for(const achv of ACHIEVEMENTS){
    if(total>=achv.threshold){
      const {data:ex}=await sb.from('achievements').select('*').eq('user_id',currentUser.user_id).eq('achievement_key',achv.key).single();
      if(!ex)await sb.from('achievements').insert({user_id:currentUser.user_id,achievement_key:achv.key});
    }
  }
}

async function loadAchievements(){
  const list=document.getElementById('achv-list');if(!list)return;
  list.innerHTML='<div class="loading">Загрузка...</div>';
  const {data:earned}=await sb.from('achievements').select('achievement_key').eq('user_id',currentUser.user_id);
  const earnedKeys=new Set((earned||[]).map(a=>a.achievement_key));
  const total=currentUser.balance||0;
  list.innerHTML=ACHIEVEMENTS.map(achv=>{
    const isEarned=earnedKeys.has(achv.key);
    const progress=Math.min(100,Math.floor(total/achv.threshold*100));
    return `<div class="achv-item ${isEarned?'':'achv-locked'}">
      <div class="achv-badge">${achv.emoji}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700">${achv.title} ${isEarned?'✅':''}</div>
        <div style="font-size:12px;color:#888;margin-bottom:4px">${achv.desc}</div>
        ${!isEarned?`<div style="height:4px;background:#2a2a4a;border-radius:4px;overflow:hidden"><div style="height:4px;background:#7F77DD;border-radius:4px;width:${progress}%"></div></div><div style="font-size:10px;color:#888;margin-top:2px">${progress}%</div>`:'<div style="font-size:11px;color:#1D9E75">Получено! 🎉</div>'}
      </div>
    </div>`;}).join('');
}

async function loadRaidHistory(){
  const list=document.getElementById('raid-history-list');if(!list)return;
  const {data}=await sb.from('raid_history').select('*').eq('user_id',currentUser.user_id).order('created_at',{ascending:false}).limit(5);
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Нет рейдов</div>';return;}
  list.innerHTML=data.map(r=>`
    <div class="history-item">
      <div><div style="font-weight:600">Рейд ${new Date(r.created_at).toLocaleDateString('ru')}</div>
      <div style="font-size:11px;color:#888">${r.items_count} предметов</div></div>
      <div style="font-size:14px;font-weight:700;color:#a78bfa">~${r.total_value.toLocaleString('ru')} 💜</div>
    </div>`).join('');
}

function showModal(title,content){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-content').innerHTML=content;
  document.getElementById('main-modal').classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal(){
  document.getElementById('main-modal').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

function openDrawer(){document.getElementById('overlay').classList.add('active');document.getElementById('menu-drawer').classList.add('active');}
function closeDrawer(){document.getElementById('overlay').classList.remove('active');document.getElementById('menu-drawer').classList.remove('active');}

async function goTo(id,btn){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const sc=document.getElementById('s-'+id);if(sc)sc.classList.add('active');if(btn)btn.classList.add('active');
  if(id==='inv')loadInventory();
  if(id==='market')loadMarket();
  if(id==='top')loadLeaderboard();
  if(id==='craft')loadCraftCounts();
  if(id==='pet'){loadMyPets();updateAccDisplay();}
  if(id==='farm')loadFarm();
  if(id==='achv'){loadAchievements();loadRaidHistory();}
  if(id==='admin'){loadAdminCasesList();loadAdminPetsList();loadPlayersList();loadPromoList();}
}

async function usePromo(){
  const code=document.getElementById('promo-input').value.trim().toUpperCase();
  if(!code)return;
  const {data:promo}=await sb.from('promocodes').select('*').eq('code',code).eq('is_active',true).single();
  if(!promo){alert('Промокод не найден!');return;}
  if(promo.used_count>=promo.max_uses){alert('Промокод исчерпан!');return;}
  const {data:used}=await sb.from('promo_uses').select('*').eq('user_id',currentUser.user_id).eq('code',code).single();
  if(used){alert('Ты уже использовал этот промокод!');return;}
  await sb.from('promo_uses').insert({user_id:currentUser.user_id,code});
  await sb.from('promocodes').update({used_count:promo.used_count+1}).eq('id',promo.id);
  if(code==='PETCASE'){
    const {data:pc}=await sb.from('cases').select('*').ilike('name','%Кейс питомца%').single();
    if(pc){await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:'🎁 Кейс питомца',item_type:'🎁',rarity:'epic',base_price:0,is_equipped:false,source_case_id:pc.id,quantity:1});document.getElementById('promo-input').value='';closeDrawer();alert('🎁 Кейс питомца добавлен в инвентарь!');return;}
  }
  if(promo.reward_diamonds>0){await saveUser({balance:bal+promo.reward_diamonds});alert('+'+promo.reward_diamonds+' 💜');}
  document.getElementById('promo-input').value='';closeDrawer();
}

window.addEventListener('load',initUser);
