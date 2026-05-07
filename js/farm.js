let farmTimers={};

async function loadFarm(){
  const grid=document.getElementById('farm-grid'),sl=document.getElementById('seeds-list');
  grid.innerHTML='<div class="loading" style="grid-column:span 4">Загрузка...</div>';
  Object.values(farmTimers).forEach(t=>clearInterval(t));farmTimers={};
  const {data:fs}=await sb.from('farm_slots').select('*,plants(*)').eq('user_id',currentUser.user_id).eq('harvested',false);
  const {data:seeds}=await sb.from('seeds').select('*,plants(*)').eq('user_id',currentUser.user_id).gt('quantity',0);
  const sc=seeds?.reduce((a,s)=>a+s.quantity,0)||0;
  document.getElementById('farm-seeds-count').textContent='Семян: '+sc;
  const used=fs?.length||0,total=Math.min(16,Math.max(4,used+2));
  const now=new Date();let html='';
  for(let i=0;i<total;i++){
    const slot=fs?.find(s=>s.slot_index===i);
    if(slot){
      const end=new Date(new Date(slot.planted_at).getTime()+slot.plants.grow_minutes*60000);
      if(now>=end){
        html+=`<div class="farm-slot ready" onclick="harvest(${slot.id},${slot.plants.reward_diamonds},'${slot.plants.name}','${slot.plants.emoji}','${slot.plants.rarity}')">
          <span style="font-size:28px">${slot.plants.emoji}</span>
          <div class="farm-timer" style="color:#EF9F27">Готово!</div>
        </div>`;
      } else {
        html+=`<div class="farm-slot growing" id="fslot-${i}">
          <span style="font-size:28px">${slot.plants.emoji}</span>
          <div class="farm-timer" id="ftimer-${i}">...</div>
        </div>`;
        const endT=end;
        farmTimers[i]=setInterval(()=>{
          const r=Math.max(0,endT-new Date());
          const el=document.getElementById('ftimer-'+i);
          if(el){
            if(r<=0){clearInterval(farmTimers[i]);loadFarm();}
            else{const h=Math.floor(r/3600000),m=Math.floor((r%3600000)/60000),s=Math.floor((r%60000)/1000);el.textContent=h>0?h+'ч '+m+'м':m>0?m+'м '+s+'с':s+'с';}
          } else clearInterval(farmTimers[i]);
        },1000);
      }
    } else {
      html+=`<div class="farm-slot empty" onclick="openPlantSelect(${i})">
        <span style="color:#444;font-size:22px">+</span>
        <div class="farm-timer" style="color:#444">Посадить</div>
      </div>`;
    }
  }
  grid.innerHTML=html;
  if(!seeds||!seeds.length){sl.innerHTML='<div class="empty-msg">Нет семян</div>';return;}
  sl.innerHTML=seeds.map(s=>`
    <div class="seed-item" onclick="openPlantSelectSeed(${s.plant_id})">
      <span style="font-size:28px">${s.plants.emoji}</span>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600">${s.plants.name}</div>
        <div style="font-size:12px;color:${RCOL[s.plants.rarity]||'#888'}">${s.plants.grow_minutes>=60?Math.floor(s.plants.grow_minutes/60)+'ч':s.plants.grow_minutes+'м'} · +${s.plants.reward_diamonds} 💜</div>
      </div>
      <div style="font-size:13px;color:#a78bfa;font-weight:700">x${s.quantity}</div>
    </div>`).join('');
}

async function openPlantSelect(si){
  const {data:seeds}=await sb.from('seeds').select('*,plants(*)').eq('user_id',currentUser.user_id).gt('quantity',0);
  if(!seeds||!seeds.length){alert('Нет семян!');return;}
  showModal('Выбери семя',seeds.map(s=>`
    <div class="seed-item" onclick="closeModal();plantSeed(${si},${s.plant_id},${s.id})">
      <span style="font-size:28px">${s.plants.emoji}</span>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600">${s.plants.name}</div>
        <div style="font-size:12px;color:${RCOL[s.plants.rarity]||'#888'}">${s.plants.grow_minutes>=60?Math.floor(s.plants.grow_minutes/60)+'ч':s.plants.grow_minutes+'м'} · +${s.plants.reward_diamonds} 💜</div>
      </div>
      <div style="font-size:13px;color:#a78bfa;font-weight:700">x${s.quantity}</div>
    </div>`).join(''));
}

async function openPlantSelectSeed(plantId){
  const {data:fs}=await sb.from('farm_slots').select('slot_index').eq('user_id',currentUser.user_id).eq('harvested',false);
  const used=(fs||[]).map(s=>s.slot_index);let free=-1;
  for(let i=0;i<16;i++){if(!used.includes(i)){free=i;break;}}
  if(free===-1){alert('Нет грядок!');return;}
  const {data:seed}=await sb.from('seeds').select('*').eq('user_id',currentUser.user_id).eq('plant_id',plantId).single();
  if(!seed||seed.quantity<1){alert('Нет семян!');return;}
  await plantSeed(free,plantId,seed.id);
}

async function plantSeed(si,plantId,seedId){
  const {data:ex}=await sb.from('farm_slots').select('id').eq('user_id',currentUser.user_id).eq('slot_index',si).eq('harvested',false).single();
  if(ex){alert('Грядка занята!');return;}
  const {data:seed}=await sb.from('seeds').select('*').eq('id',seedId).single();
  if(!seed||seed.quantity<1){alert('Нет семян!');return;}
  await sb.from('farm_slots').insert({user_id:currentUser.user_id,slot_index:si,plant_id:plantId,planted_at:new Date().toISOString(),harvested:false});
  if(seed.quantity<=1)await sb.from('seeds').delete().eq('id',seedId);
  else await sb.from('seeds').update({quantity:seed.quantity-1}).eq('id',seedId);
  alert('Посажено! 🌱');await loadFarm();
}

async function harvest(slotId,reward,name,emoji,rarity){
  await sb.from('farm_slots').update({harvested:true}).eq('id',slotId);
  await saveUser({balance:bal+reward});
  const {data:ex}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('item_name',name).eq('is_equipped',false).single();
  if(ex)await sb.from('inventory').update({quantity:(ex.quantity||1)+1}).eq('id',ex.id);
  else await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:name,item_type:emoji,rarity:rarity||'common',base_price:reward,is_equipped:false,quantity:1});
  alert('Урожай!\n+'+reward+' 💜\n'+emoji+' '+name+' → инвентарь');
  await loadFarm();
}
