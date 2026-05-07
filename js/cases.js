let spinning=false,selectedCase=null,selectedCaseItems=[],spinCount=1,currentCasePrice=0;

async function loadCases(){
  const grid=document.getElementById('cases-grid');
  grid.innerHTML='<div class="loading" style="grid-column:span 2">Загрузка...</div>';
  const {data:cases}=await sb.from('cases').select('*').eq('is_active',true).order('price');
  if(!cases||!cases.length){grid.innerHTML='<div class="empty-msg" style="grid-column:span 2">Кейсы не добавлены</div>';return;}
  grid.innerHTML=cases.map(c=>`
    <div class="case-card ${c.price===0?'free':''}" onclick="selectCase(${c.id},${c.price||0},this)">
      <div class="case-img">${c.image_url||'📦'}</div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${c.price===0?'<span class="free-tag">Бесплатно</span>':'<span class="diamond" style="width:10px;height:10px;border-width:1.5px"></span>'+c.price}</div>
    </div>`).join('');
  const sel=document.getElementById('a-item-case');
  if(sel)sel.innerHTML='<option value="">— выбери кейс —</option>'+cases.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  if(typeof loadAdminCasesList==='function')loadAdminCasesList();
}

function setSpinCount(n,btn){
  spinCount=n;
  document.querySelectorAll('.spin-count-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const total=currentCasePrice*n;
  const el=document.getElementById('spin-total-cost');
  if(el)el.textContent=total>0?total.toLocaleString('ru')+' 💜':'Бесплатно';
  const openBtn=document.getElementById('open-btn');
  if(openBtn)openBtn.textContent=n>1?'Открыть '+n+' кейса':'Открыть кейс';
}

async function selectCase(caseId,price,el){
  document.querySelectorAll('.case-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  selectedCase=caseId;currentCasePrice=price||0;
  document.getElementById('open-btn').style.display='block';
  document.getElementById('spin-count-wrap').style.display='block';
  document.getElementById('roulette').style.display='none';
  document.getElementById('won-box').style.display='none';
  spinCount=1;
  document.querySelectorAll('.spin-count-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  const el2=document.getElementById('spin-total-cost');
  if(el2)el2.textContent=price>0?price.toLocaleString('ru')+' 💜':'Бесплатно';
  document.getElementById('open-btn').textContent='Открыть кейс';
  const {data:items}=await sb.from('case_items').select('*').eq('case_id',caseId);
  selectedCaseItems=items||[];
  document.getElementById('chances').style.display='block';
  if(!selectedCaseItems.length){document.getElementById('chances-list').innerHTML='<div class="empty-msg">Предметы не добавлены</div>';return;}
  const sorted=[...selectedCaseItems].sort((a,b)=>{const o={common:0,rare:1,vr:2,epic:3,legendary:4};return (o[a.rarity]||0)-(o[b.rarity]||0);});
  document.getElementById('chances-list').innerHTML=sorted.map(it=>`
    <div class="chance-row">
      <span style="display:flex;align-items:center;gap:8px">
        ${it.image_url?`<img src="${it.image_url}" style="width:28px;height:28px;object-fit:cover;border-radius:6px">`:`<span style="font-size:20px">${it.item_emoji||'❓'}</span>`}
        <span>${it.item_name}</span>
      </span>
      <span style="color:${RCOL[it.rarity]||'#888'};font-weight:700">${it.chance}%</span>
    </div>`).join('');
}

function pickWinner(){
  const rand=Math.random()*100;let cum=0,winner=selectedCaseItems[0];
  for(const it of selectedCaseItems){cum+=parseFloat(it.chance)||0;if(rand<=cum){winner=it;break;}}
  return winner;
}

async function spinMultiple(){
  if(spinning||!selectedCase||!selectedCaseItems.length)return;
  if(spinCount===1){await spin();return;}
  const totalCost=currentCasePrice*spinCount;
  if(bal<totalCost){alert('Нужно '+totalCost+' 💜');return;}
  spinning=true;
  document.getElementById('open-btn').style.display='none';
  document.getElementById('spin-count-wrap').style.display='none';
  document.getElementById('chances').style.display='none';

  const winners=[];
  for(let i=0;i<spinCount;i++)winners.push(pickWinner());

  // Показываем рулетку для последнего победителя
  const lastWinner=winners[winners.length-1];
  const ITEM_W=78,GAP=6,STEP=ITEM_W+GAP,WIN_IDX=30,POOL_SIZE=44;
  const pool=[];
  for(let i=0;i<POOL_SIZE;i++)pool.push(selectedCaseItems[Math.floor(Math.random()*selectedCaseItems.length)]);
  pool[WIN_IDX]=lastWinner;

  document.getElementById('roulette').style.display='block';
  document.getElementById('won-box').style.display='none';
  document.getElementById('multi-won-list').innerHTML='';
  document.getElementById('rou-title').textContent='Прокрутка '+spinCount+' кейсов...';

  const track=document.getElementById('rou-items'),trackEl=document.getElementById('rou-track');
  track.innerHTML='';track.style.transition='none';track.style.left='0px';
  pool.forEach(it=>{
    const d=document.createElement('div');d.className='r-item '+(it.rarity==='vr'?'vr':it.rarity);
    d.innerHTML=it.image_url?`<img src="${it.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:11px"><span class="r-label">${RN[it.rarity]||it.rarity}</span>`:`<span style="font-size:24px">${it.item_emoji||'❓'}</span><span class="r-label">${RN[it.rarity]||it.rarity}</span>`;
    track.appendChild(d);
  });

  const tw=trackEl.offsetWidth||300,finalLeft=Math.floor(tw/2)-Math.floor(ITEM_W/2)-(WIN_IDX*STEP);
  setTimeout(()=>{
    track.style.transition='left 4s cubic-bezier(0.17,0.67,0.12,0.99)';
    track.style.left=finalLeft+'px';
    setTimeout(async()=>{
      await saveUser({balance:bal-totalCost});
      for(const w of winners)await addItemToInventory(w);
      document.getElementById('rou-title').textContent='Получено '+spinCount+' предметов!';
      document.getElementById('won-visual').innerHTML='';
      document.getElementById('won-rarity').textContent='';
      document.getElementById('multi-won-list').innerHTML=winners.map(w=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2a4a">
          ${w.image_url?`<img src="${w.image_url}" style="width:36px;height:36px;object-fit:cover;border-radius:8px">`:`<span style="font-size:24px">${w.item_emoji||'❓'}</span>`}
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${w.item_name}</div>
          <div style="font-size:11px;color:${RCOL[w.rarity]||'#888'}">${RN[w.rarity]||w.rarity}</div></div>
        </div>`).join('');
      document.getElementById('won-box').style.display='block';
      spinning=false;
    },4100);
  },50);
}

async function spin(){
  if(spinning||!selectedCase||!selectedCaseItems.length)return;
  if(bal<currentCasePrice){alert('Нужно '+currentCasePrice+' 💜');return;}
  spinning=true;
  document.getElementById('open-btn').style.display='none';
  document.getElementById('spin-count-wrap').style.display='none';
  document.getElementById('roulette').style.display='block';
  document.getElementById('won-box').style.display='none';
  document.getElementById('multi-won-list').innerHTML='';
  document.getElementById('rou-title').textContent='Прокрутка...';

  const winner=pickWinner();
  const ITEM_W=78,GAP=6,STEP=ITEM_W+GAP,WIN_IDX=30,POOL_SIZE=44;
  const pool=[];
  for(let i=0;i<POOL_SIZE;i++)pool.push(selectedCaseItems[Math.floor(Math.random()*selectedCaseItems.length)]);
  pool[WIN_IDX]=winner;

  const track=document.getElementById('rou-items'),trackEl=document.getElementById('rou-track');
  track.innerHTML='';track.style.transition='none';track.style.left='0px';
  pool.forEach(it=>{
    const d=document.createElement('div');d.className='r-item '+(it.rarity==='vr'?'vr':it.rarity);
    d.innerHTML=it.image_url?`<img src="${it.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:11px"><span class="r-label">${RN[it.rarity]||it.rarity}</span>`:`<span style="font-size:24px">${it.item_emoji||'❓'}</span><span class="r-label">${RN[it.rarity]||it.rarity}</span>`;
    track.appendChild(d);
  });

  const tw=trackEl.offsetWidth||300,finalLeft=Math.floor(tw/2)-Math.floor(ITEM_W/2)-(WIN_IDX*STEP);
  setTimeout(()=>{
    track.style.transition='left 4s cubic-bezier(0.17,0.67,0.12,0.99)';
    track.style.left=finalLeft+'px';
    setTimeout(async()=>{
      spinning=false;
      document.getElementById('rou-title').textContent='Вы получили:';
      const wv=document.getElementById('won-visual');
      wv.innerHTML=winner.image_url?`<img src="${winner.image_url}" class="won-img">`:`<div style="font-size:52px">${winner.item_emoji||'❓'}</div>`;
      document.getElementById('won-rarity').textContent=RN[winner.rarity]||winner.rarity;
      document.getElementById('won-rarity').style.color=RCOL[winner.rarity]||'#888';
      document.getElementById('won-box').style.display='block';
      await saveUser({balance:bal-currentCasePrice});
      await addItemToInventory(winner);
    },4100);
  },50);
}

async function addItemToInventory(winner){
  const isPet=PET_NAMES.includes(winner.item_name),isSeed=winner.item_name.startsWith('Семя ');
  if(isPet){
    const {data:pd}=await sb.from('pets').select('*').ilike('name',winner.item_name).single();
    if(pd)await sb.from('user_pets').insert({user_id:currentUser.user_id,pet_id:pd.id,custom_name:pd.name,speed:1,agility:1,charm:1,boost:1.0,acc_bonus:0,is_active:false});
  } else if(isSeed){
    const pn=winner.item_name.replace('Семя ','');
    const {data:pl}=await sb.from('plants').select('*').ilike('name',pn).single();
    if(pl){
      const {data:ex}=await sb.from('seeds').select('*').eq('user_id',currentUser.user_id).eq('plant_id',pl.id).single();
      if(ex)await sb.from('seeds').update({quantity:ex.quantity+1}).eq('id',ex.id);
      else await sb.from('seeds').insert({user_id:currentUser.user_id,plant_id:pl.id,quantity:1});
    }
  } else {
    const {data:ex}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('item_name',winner.item_name).eq('is_equipped',false).single();
    if(ex)await sb.from('inventory').update({quantity:(ex.quantity||1)+1}).eq('id',ex.id);
    else await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:winner.item_name,item_type:winner.item_emoji||'❓',item_image:winner.image_url||null,rarity:winner.rarity,base_price:RC[winner.rarity]||0,is_equipped:false,source_case_id:selectedCase,quantity:1});
  }
}

function resetCase(){
  document.getElementById('roulette').style.display='none';
  document.getElementById('won-box').style.display='none';
  document.getElementById('open-btn').style.display='block';
  document.getElementById('spin-count-wrap').style.display='block';
  document.getElementById('chances').style.display='block';
}
