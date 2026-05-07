let currentMarketTab='accessory';

function switchMarketTab(tab,btn){
  currentMarketTab=tab;
  document.querySelectorAll('#s-market .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const sellBtn=document.getElementById('sell-btn'),rar=document.getElementById('market-rarity');
  if(tab==='pet'){sellBtn.textContent='+ Продать питомца';sellBtn.onclick=()=>showSellPetPanel();rar.style.display='none';}
  else{sellBtn.textContent='+ Выставить предмет';sellBtn.onclick=()=>showSellPanel();rar.style.display='block';}
  loadMarket();
}

async function loadMarket(){
  const list=document.getElementById('market-list');list.innerHTML='<div class="loading">Загрузка...</div>';
  const sort=document.getElementById('market-sort')?.value||'price_asc',rarity=document.getElementById('market-rarity')?.value||'all';
  if(currentMarketTab==='pet'){
    let q=sb.from('marketplace_pets').select('*');
    if(sort==='price_asc')q=q.order('price',{ascending:true});
    else if(sort==='price_desc')q=q.order('price',{ascending:false});
    else q=q.order('listed_at',{ascending:false});
    const {data}=await q;
    if(!data||!data.length){list.innerHTML='<div class="empty-msg">Питомцев нет</div>';return;}
    list.innerHTML=data.map(it=>`
      <div class="mkt-item">
        <div style="width:50px;height:50px;border-radius:10px;flex-shrink:0;background:#0f0f1e;overflow:hidden;display:flex;align-items:center;justify-content:center">
          ${it.pet_image?`<img src="${it.pet_image}" style="width:50px;height:50px;object-fit:cover">`:`<span style="font-size:30px">${it.pet_emoji||'🐱'}</span>`}
        </div>
        <div style="flex:1"><div style="font-size:14px;font-weight:600">${it.pet_name}</div>
        <div style="font-size:11px;color:#888">⚡${it.speed} 🎯${it.agility} ✨${it.charm}</div>
        <div style="font-size:13px;font-weight:700;color:#a78bfa">${it.price.toLocaleString('ru')} 💜</div></div>
        ${it.seller_id!==currentUser?.user_id?`<button class="buy-btn" onclick="buyPet(${it.id},${it.price})">Купить</button>`:`<button class="cancel-btn" onclick="cancelPetListing(${it.id})">Снять</button>`}
      </div>`).join('');
    return;
  }
  let q=sb.from('marketplace').select('*').eq('category',currentMarketTab);
  if(rarity!=='all')q=q.eq('rarity',rarity);
  if(sort==='price_asc')q=q.order('price',{ascending:true});
  else if(sort==='price_desc')q=q.order('price',{ascending:false});
  else q=q.order('listed_at',{ascending:false});
  const {data}=await q;
  if(!data||!data.length){list.innerHTML='<div class="empty-msg">Ничего нет</div>';return;}
  list.innerHTML=data.map(it=>`
    <div class="mkt-item">
      <div style="width:44px;height:44px;border-radius:8px;flex-shrink:0;background:#0f0f1e;overflow:hidden;display:flex;align-items:center;justify-content:center">
        ${it.item_image?`<img src="${it.item_image}" style="width:44px;height:44px;object-fit:cover">`:`<span style="font-size:24px">${it.item_type||'❓'}</span>`}
      </div>
      <div style="flex:1"><div style="font-size:14px;font-weight:600">${it.item_name}</div>
      <div style="font-size:12px;color:${RCOL[it.rarity]||'#888'}">${RN[it.rarity]||it.rarity}</div>
      <div style="font-size:13px;font-weight:700;color:#a78bfa">${it.price.toLocaleString('ru')} 💜</div></div>
      ${it.seller_id!==currentUser?.user_id?`<button class="buy-btn" onclick="buyItem(${it.id},${it.price})">Купить</button>`:`<button class="cancel-btn" onclick="cancelListing(${it.id})">Снять</button>`}
    </div>`).join('');
}

async function showSellPanel(){
  const {data}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('is_equipped',false);
  if(!data||!data.length){alert('Инвентарь пуст!');return;}
  showModal('Выбери предмет',data.map(it=>`
    <div class="seed-item" onclick="closeModal();sellItem(${it.id})">
      ${it.item_image?`<img src="${it.item_image}" style="width:40px;height:40px;object-fit:cover;border-radius:8px">`:`<span style="font-size:28px">${it.item_type||'❓'}</span>`}
      <div><div style="font-size:14px;font-weight:600">${it.item_name}${(it.quantity||1)>1?' x'+(it.quantity||1):''}</div>
      <div style="font-size:12px;color:${RCOL[it.rarity]||'#888'}">${RN[it.rarity]||it.rarity}</div></div>
    </div>`).join(''));
}

async function buyItem(listingId,price){
  if(bal<price){alert('Нужно '+price+' 💜');return;}
  const {data:l}=await sb.from('marketplace').select('*').eq('id',listingId).single();
  if(!l){alert('Уже куплен!');await loadMarket();return;}
  await saveUser({balance:bal-price});
  const {data:s}=await sb.from('users').select('balance').eq('user_id',l.seller_id).single();
  if(s)await sb.from('users').update({balance:s.balance+Math.floor(price*0.9)}).eq('user_id',l.seller_id);
  const {data:ex}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('item_name',l.item_name).eq('is_equipped',false).single();
  if(ex)await sb.from('inventory').update({quantity:(ex.quantity||1)+1}).eq('id',ex.id);
  else await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:l.item_name,item_type:l.item_type,item_image:l.item_image||null,rarity:l.rarity,base_price:RC[l.rarity]||0,is_equipped:false,quantity:1});
  await sb.from('marketplace').delete().eq('id',listingId);
  alert('Куплено!');await loadMarket();
}

async function cancelListing(listingId){
  const {data:l}=await sb.from('marketplace').select('*').eq('id',listingId).single();
  if(!l)return;
  const {data:ex}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('item_name',l.item_name).eq('is_equipped',false).single();
  if(ex)await sb.from('inventory').update({quantity:(ex.quantity||1)+1}).eq('id',ex.id);
  else await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:l.item_name,item_type:l.item_type,item_image:l.item_image||null,rarity:l.rarity,base_price:RC[l.rarity]||0,is_equipped:false,quantity:1});
  await sb.from('marketplace').delete().eq('id',listingId);
  alert('Лот снят!');await loadMarket();
}

async function showSellPetPanel(){
  const {data:pets}=await sb.from('user_pets').select('*,pets(*)').eq('user_id',currentUser.user_id);
  if(!pets||pets.length<=1){alert('Нельзя продать единственного питомца!');return;}
  const sellable=pets.filter(p=>!p.is_active);
  if(!sellable.length){alert('Нельзя продать активного питомца!');return;}
  showModal('Выбери питомца',sellable.map(p=>`
    <div class="seed-item" onclick="closeModal();listPetForSale(${p.id})">
      <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#16213e;display:flex;align-items:center;justify-content:center">
        ${p.pets?.image_url?`<img src="${p.pets.image_url}" style="width:44px;height:44px;object-fit:cover">`:`<span style="font-size:30px">${p.pets?.emoji||'🐱'}</span>`}
      </div>
      <div><div style="font-size:14px;font-weight:700">${p.custom_name||p.pets?.name}</div>
      <div style="font-size:12px;color:#888">⚡${p.speed} 🎯${p.agility} ✨${p.charm}</div></div>
    </div>`).join(''));
}

async function listPetForSale(userPetId){
  const {data:pet}=await sb.from('user_pets').select('*,pets(*)').eq('id',userPetId).single();
  if(!pet)return;
  const price=prompt('Цена питомца (💜):');
  if(!price||isNaN(price)||parseInt(price)<=0)return;
  await sb.from('marketplace_pets').insert({seller_id:currentUser.user_id,user_pet_id:userPetId,pet_name:pet.custom_name||pet.pets?.name,pet_emoji:pet.pets?.emoji||'🐱',pet_image:pet.pets?.image_url||null,speed:pet.speed,agility:pet.agility,charm:pet.charm,boost:pet.boost,acc_bonus:pet.acc_bonus||0,price:parseInt(price)});
  await sb.from('user_pets').update({is_for_sale:true}).eq('id',userPetId);
  alert('Питомец выставлен!');await loadMarket();
}

async function buyPet(listingId,price){
  if(bal<price){alert('Нужно '+price+' 💜');return;}
  const {data:l}=await sb.from('marketplace_pets').select('*').eq('id',listingId).single();
  if(!l){alert('Уже куплен!');await loadMarket();return;}
  await saveUser({balance:bal-price});
  const {data:s}=await sb.from('users').select('balance').eq('user_id',l.seller_id).single();
  if(s)await sb.from('users').update({balance:s.balance+Math.floor(price*0.9)}).eq('user_id',l.seller_id);
  await sb.from('user_pets').update({user_id:currentUser.user_id,is_for_sale:false,is_active:false}).eq('id',l.user_pet_id);
  await sb.from('marketplace_pets').delete().eq('id',listingId);
  alert('Питомец куплен!');await loadMarket();
}

async function cancelPetListing(listingId){
  const {data:l}=await sb.from('marketplace_pets').select('*').eq('id',listingId).single();
  if(!l)return;
  await sb.from('user_pets').update({is_for_sale:false}).eq('id',l.user_pet_id);
  await sb.from('marketplace_pets').delete().eq('id',listingId);
  alert('Лот снят!');await loadMarket();
}

async function loadLeaderboard(){
  const lb=document.getElementById('lb-list');lb.innerHTML='<div class="loading">Загрузка...</div>';
  const {data}=await sb.from('users').select('user_id,username,balance').order('balance',{ascending:false}).neq('user_id',717860240).limit(20);
  const medals=['🥇','🥈','🥉'];
  if(!data||!data.length){lb.innerHTML='<div class="empty-msg">Пока никого нет</div>';}
  else lb.innerHTML=data.map((r,i)=>`
    <div class="lb-row" onclick="viewShowcase(${r.user_id},'${r.username}')">
      <div class="lb-rank">${i<3?medals[i]:(i+1)+'.'}</div>
      <div class="lb-name">${r.username}</div>
      <div class="lb-val">${r.balance.toLocaleString('ru')} 💜</div>
    </div>`).join('');
  document.getElementById('you-tag').textContent=`Ты: ${currentUser.username} — ${bal.toLocaleString('ru')} 💜`;
}

async function viewShowcase(userId,username){
  const {data:inv}=await sb.from('inventory').select('*').eq('user_id',userId).eq('is_equipped',false).limit(6);
  showModal(username+' — витрина',`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${Array(6).fill(0).map((_,i)=>{
        const it=(inv||[])[i];
        if(!it)return '<div style="aspect-ratio:1;border-radius:12px;border:1px dashed #2a2a4a;background:#0f0f1e;display:flex;align-items:center;justify-content:center;color:#444;font-size:18px">+</div>';
        return `<div style="aspect-ratio:1;border-radius:12px;border:1px solid ${RCOL[it.rarity]||'#444'};background:#0f0f1e;overflow:hidden;display:flex;align-items:center;justify-content:center">${it.item_image?`<img src="${it.item_image}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:26px">${it.item_type||'❓'}</span>`}</div>`;
      }).join('')}
    </div>`);
}
