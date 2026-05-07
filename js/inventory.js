let invSort='new',showcaseSlots=[null,null,null,null,null,null],currentShowcaseSlot=0;

async function loadInventory(){
  const inv=document.getElementById('inv-list');
  inv.innerHTML='<div class="loading">Загрузка...</div>';
  let q=sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('is_equipped',false);
  if(invSort==='fav')q=q.eq('is_favorite',true);
  else if(invSort==='rarity')q=q.order('rarity',{ascending:false});
  else if(invSort==='price')q=q.order('base_price',{ascending:false});
  else q=q.order('obtained_at',{ascending:false});
  const {data}=await q;
  if(!data||!data.length){inv.innerHTML='<div class="empty-msg">Инвентарь пуст</div>';return;}
  const grouped={};
  data.forEach(it=>{
    const key=it.item_name+'_'+it.rarity;
    if(!grouped[key])grouped[key]={...it,totalQty:0,ids:[]};
    grouped[key].totalQty+=(it.quantity||1);
    grouped[key].ids.push(it.id);
  });
  inv.innerHTML=Object.values(grouped).map(it=>`
    <div class="inv-item" onclick="openItemCard(${it.id})">
      ${it.item_image?`<img src="${it.item_image}" class="inv-img">`:`<span style="font-size:32px;flex-shrink:0">${it.item_type||'❓'}</span>`}
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600">${it.item_name} ${it.is_favorite?'⭐':''}</div>
        <div style="font-size:12px;color:${RCOL[it.rarity]||'#888'}">${RN[it.rarity]||it.rarity}</div>
        <div style="font-size:11px;color:#888">~${(it.base_price||RC[it.rarity]||0).toLocaleString('ru')} 💜</div>
      </div>
      ${it.totalQty>1?`<div class="qty-badge">x${it.totalQty}</div>`:''}
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <button onclick="event.stopPropagation();quickSell(${it.id},${it.base_price||RC[it.rarity]||0})" class="quick-sell-btn">💰 Продать</button>
        <span style="color:#444;font-size:18px">›</span>
      </div>
    </div>`).join('');
}

function setInvSort(sort,btn){
  invSort=sort;
  document.querySelectorAll('.sort-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadInventory();
}

async function quickSell(itemId,price){
  if(!confirm('Продать за '+price+' 💜?'))return;
  await sb.from('inventory').delete().eq('id',itemId);
  await saveUser({balance:bal+price});
  alert('Продано за '+price+' 💜');
  await loadInventory();
}

async function openItemCard(itemId){
  const {data:item}=await sb.from('inventory').select('*').eq('id',itemId).single();
  if(!item)return;
  const {data:similar}=await sb.from('marketplace').select('price').eq('item_name',item.item_name).order('price',{ascending:true}).limit(1).single();
  const isPetCase=item.item_name==='🎁 Кейс питомца';
  showModal('Предмет',`
    <div style="text-align:center;padding:10px 0">
      ${item.item_image?`<img src="${item.item_image}" style="width:100px;height:100px;object-fit:cover;border-radius:16px;border:2px solid ${RCOL[item.rarity]||'#444'};display:block;margin:0 auto">`:`<div style="font-size:64px">${item.item_type||'❓'}</div>`}
      <div style="font-size:16px;font-weight:700;margin-top:10px">${item.item_name}</div>
      <div style="font-size:13px;color:${RCOL[item.rarity]||'#888'};margin-top:4px">${RN[item.rarity]||item.rarity}</div>
      ${(item.quantity||1)>1?`<div style="font-size:12px;color:#a78bfa;margin-top:4px">В наличии: x${item.quantity||1}</div>`:''}
    </div>
    <div style="background:#0f0f1e;border-radius:12px;padding:12px;margin:10px 0">
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #2a2a4a">
        <span style="color:#888">Базовая цена</span>
        <span style="color:#a78bfa;font-weight:700">${(item.base_price||RC[item.rarity]||0).toLocaleString('ru')} 💜</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #2a2a4a">
        <span style="color:#888">Мин. цена на рынке</span>
        <span style="color:${similar?.price?'#1D9E75':'#888'};font-weight:700">${similar?.price?similar.price.toLocaleString('ru')+' 💜':'Не продаётся'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0">
        <span style="color:#888">Бафф акса</span>
        <span style="color:#4fc3f7;font-weight:700">+${ACC_BONUS[item.rarity]||0}% к доходу</span>
      </div>
    </div>
    <div style="display:grid;gap:8px">
      ${isPetCase?`<button onclick="closeModal();openPetCase(${item.id},${item.source_case_id})" style="width:100%;padding:10px;background:#EF9F27;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">🎁 Открыть кейс питомца</button>`:''}
      ${!isPetCase?`<button onclick="closeModal();equipAcc(${item.id})" style="width:100%;padding:10px;background:#1D9E75;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">🐱 Надеть на питомца</button>`:''}
      <button onclick="closeModal();toggleFavorite(${item.id},${!!item.is_favorite})" style="width:100%;padding:10px;background:none;border:1px solid #EF9F27;border-radius:10px;color:#EF9F27;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">${item.is_favorite?'★ Убрать из избранного':'☆ В избранное'}</button>
      <button onclick="closeModal();sellItem(${item.id})" style="width:100%;padding:10px;background:none;border:1px solid #7F77DD;border-radius:10px;color:#a78bfa;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">🏪 На рынок</button>
      <button onclick="closeModal();openShowcaseSelect(0,${item.id})" style="width:100%;padding:10px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">🖼️ На витрину</button>
    </div>`);
}

async function toggleFavorite(itemId,current){
  await sb.from('inventory').update({is_favorite:!current}).eq('id',itemId);
  closeModal();await loadInventory();
}

async function openPetCase(invItemId,caseId){
  if(!confirm('Открыть кейс питомца?'))return;
  const {data:items}=await sb.from('case_items').select('*').eq('case_id',caseId);
  if(!items||!items.length){alert('Кейс пуст!');return;}
  const winner=items[Math.floor(Math.random()*items.length)];
  const {data:pd}=await sb.from('pets').select('*').ilike('name',winner.item_name).single();
  await sb.from('inventory').delete().eq('id',invItemId);
  if(pd){await sb.from('user_pets').insert({user_id:currentUser.user_id,pet_id:pd.id,custom_name:pd.name,speed:1,agility:1,charm:1,boost:1.0,acc_bonus:0,is_active:false});alert('Получен: '+winner.item_emoji+' '+winner.item_name+'\nНайди в Меню → Питомец 🐱');}
  await loadInventory();
}

async function sellItem(itemId){
  const {data:item}=await sb.from('inventory').select('*').eq('id',itemId).single();
  if(!item)return;
  const price=prompt('Цена (от '+(item.base_price||RC[item.rarity]||0)+' 💜):');
  if(!price||isNaN(price)||parseInt(price)<=0)return;
  const cat=item.item_name.startsWith('Семя ')?'seed':'accessory';
  await sb.from('marketplace').insert({seller_id:currentUser.user_id,item_id:itemId,item_name:item.item_name,item_type:item.item_type,item_image:item.item_image||null,rarity:item.rarity,price:parseInt(price),category:cat});
  await sb.from('inventory').delete().eq('id',itemId);
  alert('Выставлено!');await loadInventory();
}

async function openShowcaseSelect(slotIndex,preselectedItemId){
  currentShowcaseSlot=slotIndex;
  const {data}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('is_equipped',false);
  if(preselectedItemId){
    const item=data?.find(i=>i.id===preselectedItemId);
    if(item){
      showModal('Витрина',`
        <div style="text-align:center;padding:10px 0">
          ${item.item_image?`<img src="${item.item_image}" style="width:80px;height:80px;object-fit:cover;border-radius:12px;display:block;margin:0 auto">`:`<div style="font-size:52px">${item.item_type||'❓'}</div>`}
          <div style="font-size:15px;font-weight:700;margin-top:8px">${item.item_name}</div>
        </div>
        <div style="display:grid;gap:8px;margin-top:12px">
          <button onclick="fillAllSlots(${JSON.stringify(item).replace(/"/g,'&quot;')})" style="width:100%;padding:10px;background:#7F77DD;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Заполнить все 6 слотов</button>
          <button onclick="setShowcaseSlot(${JSON.stringify(item).replace(/"/g,'&quot;')})" style="width:100%;padding:10px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">Только один слот</button>
        </div>`);
      return;
    }
  }
  const content=(!data||!data.length)?'<div class="empty-msg">Инвентарь пуст</div>':
    `<div class="seed-item" onclick="setShowcaseSlot(null)"><span style="font-size:28px">✕</span><div style="font-size:14px;color:#888">Очистить слот</div></div>`+
    data.map(it=>`<div class="seed-item" onclick='setShowcaseSlot(${JSON.stringify({id:it.id,item_name:it.item_name,item_type:it.item_type,item_image:it.item_image,rarity:it.rarity,base_price:it.base_price||RC[it.rarity]||0})})'>
      ${it.item_image?`<img src="${it.item_image}" style="width:40px;height:40px;object-fit:cover;border-radius:8px">`:`<span style="font-size:28px">${it.item_type||'❓'}</span>`}
      <div><div style="font-size:14px;font-weight:600">${it.item_name}</div>
      <div style="font-size:12px;color:${RCOL[it.rarity]||'#888'}">${RN[it.rarity]||it.rarity}</div></div>
    </div>`).join('');
  showModal('Выбери предмет для витрины',content);
}

function fillAllSlots(item){
  for(let i=0;i<6;i++)showcaseSlots[i]=typeof item==='string'?JSON.parse(item):item;
  updateShowcase();closeModal();
}

function setShowcaseSlot(item){
  showcaseSlots[currentShowcaseSlot]=typeof item==='string'?JSON.parse(item):item;
  updateShowcase();closeModal();
}

function updateShowcase(){
  const grid=document.getElementById('showcase-slots');if(!grid)return;
  const slots=grid.querySelectorAll('.slot');
  slots.forEach((slot,i)=>{
    const item=showcaseSlots[i];slot.className='slot'+(item?' '+item.rarity:'');
    if(item){
      const badge={common:'C',rare:'R',vr:'VR',epic:'E',legendary:'L'}[item.rarity]||'';
      slot.innerHTML=item.item_image?`<img src="${item.item_image}"><span class="slot-badge">${badge}</span>`:`<span style="font-size:26px">${item.item_type||'❓'}</span><span class="slot-badge">${badge}</span>`;
      slot.onclick=()=>openShowcaseSelect(i,item.id);
    } else {
      slot.innerHTML='<span style="color:#444;font-size:18px">+</span>';
      slot.onclick=()=>openShowcaseSelect(i);
    }
  });
}

async function loadCraftCounts(){
  const {data}=await sb.from('inventory').select('rarity,quantity').eq('user_id',currentUser.user_id).eq('is_equipped',false);
  const cnt={common:0,rare:0,vr:0,epic:0};
  (data||[]).forEach(it=>{if(cnt[it.rarity]!==undefined)cnt[it.rarity]+=(it.quantity||1);});
  document.getElementById('cnt-common').textContent=cnt.common+' шт';
  document.getElementById('cnt-rare').textContent=cnt.rare+' шт';
  document.getElementById('cnt-vr').textContent=cnt.vr+' шт';
  document.getElementById('cnt-epic').textContent=cnt.epic+' шт';
}

async function craft(from,to){
  const {data:items}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('rarity',from).eq('is_equipped',false);
  if(!items||!items.length){alert('Нужно 10 предметов: '+RN[from]);return;}
  const total=items.reduce((a,i)=>a+(i.quantity||1),0);
  if(total<10){alert('Нужно 10 предметов '+RN[from]+'. У тебя: '+total);return;}
  let remaining=10;
  for(const item of items){
    if(remaining<=0)break;
    const qty=item.quantity||1;
    if(qty<=remaining){await sb.from('inventory').delete().eq('id',item.id);remaining-=qty;}
    else{await sb.from('inventory').update({quantity:qty-remaining}).eq('id',item.id);remaining=0;}
  }
  const srcId=items.find(i=>i.source_case_id)?.source_case_id||null;
  let crafted=null;
  if(srcId){const {data:ci}=await sb.from('case_items').select('*').eq('case_id',srcId).eq('rarity',to);if(ci&&ci.length)crafted=ci[Math.floor(Math.random()*ci.length)];}
  if(!crafted){const {data:ci}=await sb.from('case_items').select('*').eq('rarity',to);if(ci&&ci.length)crafted=ci[Math.floor(Math.random()*ci.length)];}
  if(crafted){
    const {data:ex}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('item_name',crafted.item_name).eq('is_equipped',false).single();
    if(ex)await sb.from('inventory').update({quantity:(ex.quantity||1)+1}).eq('id',ex.id);
    else await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:crafted.item_name,item_type:crafted.item_emoji||'❓',item_image:crafted.image_url||null,rarity:to,base_price:RC[to]||0,is_equipped:false,quantity:1,source_case_id:srcId||crafted.case_id});
    alert('Получен: '+crafted.item_name+'! 🎉');
  } else {
    await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:RN[to]+' предмет',item_type:'⚗️',rarity:to,base_price:RC[to]||0,is_equipped:false,quantity:1});
    alert('Получен: '+RN[to]+'!');
  }
  await loadCraftCounts();
}
