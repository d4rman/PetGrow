const TILE=32,COLS=40,ROWS=30,FLOOR=0,WALL=1;
let gameRunning=false,playerX=3.5,playerY=3.5,playerAngle=0,playerHP=100;
let raidLoot=[],bagSize=10,ctx=null,animFrame=null;
let jsLeftActive=false,jsRightActive=false;
let jsLeftX=0,jsLeftY=0,jsRightX=0,jsRightY=0;
let lootBoxes=[],bots=[],lastShot=0;
let currentWeapon=null,ammo=0;

const WEAPONS={
  pistol:{name:'Пистолет',emoji:'🔫',damage:25,range:8,fireRate:350,ammoType:'pistol'},
  rifle:{name:'Винтовка',emoji:'🎯',damage:45,range:14,fireRate:550,ammoType:'rifle'},
  shotgun:{name:'Дробовик',emoji:'💥',damage:70,range:4,fireRate:900,ammoType:'shotgun'}
};

const LOOT_TABLE=[
  {name:'Скотч',emoji:'🧻',rarity:'common',chance:25,value:20,category:'misc'},
  {name:'Аптечка',emoji:'💊',rarity:'common',chance:18,value:80,category:'misc'},
  {name:'Патроны 9мм',emoji:'🔴',rarity:'common',chance:16,value:40,category:'ammo',ammoType:'pistol',count:15},
  {name:'Патроны 5.56',emoji:'🟡',rarity:'rare',chance:9,value:80,category:'ammo',ammoType:'rifle',count:10},
  {name:'Патроны 12к',emoji:'🟠',rarity:'rare',chance:7,value:90,category:'ammo',ammoType:'shotgun',count:5},
  {name:'Пистолет',emoji:'🔫',rarity:'rare',chance:5,value:300,category:'weapon',weaponType:'pistol'},
  {name:'Винтовка',emoji:'🎯',rarity:'epic',chance:1.5,value:1500,category:'weapon',weaponType:'rifle'},
  {name:'Дробовик',emoji:'💥',rarity:'rare',chance:2.5,value:800,category:'weapon',weaponType:'shotgun'},
  {name:'Кабель HDMI',emoji:'🔌',rarity:'common',chance:14,value:50,category:'pc'},
  {name:'Термопаста',emoji:'🧪',rarity:'common',chance:12,value:60,category:'pc'},
  {name:'Оперативная память DDR4 8GB',emoji:'💿',rarity:'rare',chance:5,value:400,category:'pc'},
  {name:'Оперативная память DDR5 16GB',emoji:'💿',rarity:'epic',chance:2,value:900,category:'pc'},
  {name:'SSD 256GB',emoji:'💾',rarity:'rare',chance:4,value:500,category:'pc'},
  {name:'SSD 1TB',emoji:'💾',rarity:'epic',chance:1.5,value:1200,category:'pc'},
  {name:'Процессор i5-12400',emoji:'🔧',rarity:'rare',chance:3,value:800,category:'pc'},
  {name:'Процессор i7-13700',emoji:'🔧',rarity:'epic',chance:1,value:2000,category:'pc'},
  {name:'Процессор Ryzen 5 5600',emoji:'🔧',rarity:'rare',chance:3,value:750,category:'pc'},
  {name:'Процессор Ryzen 9 7900X',emoji:'🔧',rarity:'epic',chance:0.8,value:2500,category:'pc'},
  {name:'Видеокарта RTX 3060',emoji:'🖥️',rarity:'epic',chance:1.2,value:3000,category:'pc'},
  {name:'Видеокарта RTX 4070',emoji:'🖥️',rarity:'legendary',chance:0.3,value:6000,category:'pc'},
  {name:'Видеокарта RX 6700',emoji:'🖥️',rarity:'epic',chance:0.8,value:2800,category:'pc'},
  {name:'Материнская плата B550',emoji:'🟩',rarity:'rare',chance:2.5,value:1000,category:'pc'},
  {name:'Материнская плата Z790',emoji:'🟩',rarity:'epic',chance:0.8,value:2200,category:'pc'},
  {name:'Блок питания 650W',emoji:'⚡',rarity:'rare',chance:2.5,value:800,category:'pc'},
  {name:'Семя травы',emoji:'🌿',rarity:'common',chance:7,value:50,category:'seed'},
  {name:'Семя клубники',emoji:'🍓',rarity:'rare',chance:2.5,value:200,category:'seed'},
  {name:'Семя кокоса',emoji:'🥥',rarity:'legendary',chance:0.2,value:800,category:'seed'},
];

function getRandomLoot(){
  const total=LOOT_TABLE.reduce((a,b)=>a+b.chance,0);
  let rand=Math.random()*total;
  for(const item of LOOT_TABLE){rand-=item.chance;if(rand<=0)return{...item};}
  return{...LOOT_TABLE[0]};
}

const MAP_DATA=(()=>{
  const m=Array(ROWS).fill(null).map(()=>Array(COLS).fill(FLOOR));
  for(let i=0;i<COLS;i++){m[0][i]=WALL;m[ROWS-1][i]=WALL;}
  for(let i=0;i<ROWS;i++){m[i][0]=WALL;m[i][COLS-1]=WALL;}
  const rooms=[
    {x:2,y:2,w:10,h:8},{x:14,y:2,w:12,h:8},{x:28,y:2,w:10,h:8},
    {x:2,y:12,w:8,h:10},{x:12,y:12,w:16,h:10},{x:30,y:12,w:8,h:10},
    {x:4,y:24,w:10,h:4},{x:16,y:24,w:10,h:4},{x:28,y:24,w:8,h:4}
  ];
  rooms.forEach(r=>{
    for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
      if(y>0&&y<ROWS-1&&x>0&&x<COLS-1)m[y][x]=WALL;
    }
    for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++)m[y][x]=FLOOR;
    const doorY=Math.floor(r.y+r.h/2),doorX=Math.floor(r.x+r.w/2);
    if(r.x+r.w<COLS-1){m[doorY][r.x+r.w-1]=FLOOR;m[doorY][r.x+r.w]=FLOOR;}
    if(r.y+r.h<ROWS-1){m[r.y+r.h-1][doorX]=FLOOR;m[r.y+r.h][doorX]=FLOOR;}
  });
  [[10,6,14,6],[22,6,28,6],[10,17,12,17],[28,17,30,17],[8,20,8,24],[20,22,20,24],[32,22,32,24]].forEach(([x1,y1,x2,y2])=>{
    if(x1===x2){for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)m[y][x1]=FLOOR;}
    else{for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)m[y1][x]=FLOOR;}
  });
  return m;
})();

function startRaid(){
  document.getElementById('loot-menu').style.display='none';
  document.getElementById('loot-game').style.display='block';
  document.getElementById('loot-results').style.display='none';
  playerX=3.5;playerY=3.5;playerAngle=0;playerHP=100;
  raidLoot=[];gameRunning=true;currentWeapon=WEAPONS.pistol;ammo=30;
  updateWeaponUI();
  document.getElementById('hp-display').textContent=100;
  document.getElementById('bag-display').textContent='0/'+bagSize;
  lootBoxes=[];bots=[];
  [[5,5],[15,4],[30,4],[3,15],[20,16],[32,15],[6,26],[20,26],[30,26],[8,8],[25,8],[35,17]].forEach(([x,y])=>{
    const count=2+Math.floor(Math.random()*2);
    lootBoxes.push({x,y,open:false,items:Array(count).fill(0).map(()=>getRandomLoot())});
  });
  bots=[
    {x:15,y:6,angle:0,hp:60,maxHp:60,speed:0.015,lastShot:0,patrol:0},
    {x:30,y:6,angle:Math.PI,hp:60,maxHp:60,speed:0.015,lastShot:0,patrol:0},
    {x:20,y:17,angle:0,hp:80,maxHp:80,speed:0.02,lastShot:0,patrol:0},
    {x:5,y:17,angle:0,hp:40,maxHp:40,speed:0.01,lastShot:0,patrol:0},
    {x:25,y:26,angle:0,hp:60,maxHp:60,speed:0.018,lastShot:0,patrol:0},
    {x:10,y:26,angle:Math.PI,hp:40,maxHp:40,speed:0.012,lastShot:0,patrol:0},
  ];
  const canvas=document.getElementById('game-canvas');
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;
  ctx=canvas.getContext('2d');
  setupJoysticks();
  gameLoop();
}

function updateWeaponUI(){
  const el=document.getElementById('weapon-display');
  if(!el)return;
  if(!currentWeapon){el.textContent='🤜 Кулаки';return;}
  el.textContent=currentWeapon.emoji+' '+currentWeapon.name+' ['+ammo+']';
}

function gameLoop(){
  if(!gameRunning)return;
  update();render();
  animFrame=requestAnimationFrame(gameLoop);
}

function update(){
  const speed=0.07;
  if(jsLeftActive){
    const len=Math.sqrt(jsLeftX*jsLeftX+jsLeftY*jsLeftY);
    if(len>0.1){
      const mx=jsLeftX/len*speed,my=jsLeftY/len*speed;
      const nx=playerX+mx,ny=playerY+my;
      if(MAP_DATA[Math.floor(playerY)]&&MAP_DATA[Math.floor(playerY)][Math.floor(nx)]===FLOOR)playerX=nx;
      if(MAP_DATA[Math.floor(ny)]&&MAP_DATA[Math.floor(ny)][Math.floor(playerX)]===FLOOR)playerY=ny;
    }
  }
  if(jsRightActive){
    const len=Math.sqrt(jsRightX*jsRightX+jsRightY*jsRightY);
    if(len>0.1){
      playerAngle=Math.atan2(jsRightY,jsRightX);
      tryShoot();
    }
  }
  const now=Date.now();
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const dx=playerX-bot.x,dy=playerY-bot.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const angleToPlayer=Math.atan2(dy,dx);
    if(dist<8){
      const nx=bot.x+Math.cos(angleToPlayer)*0.02;
      const ny=bot.y+Math.sin(angleToPlayer)*0.02;
      if(MAP_DATA[Math.floor(ny)]&&MAP_DATA[Math.floor(ny)][Math.floor(nx)]===FLOOR){bot.x=nx;bot.y=ny;}
      else{
        const alt=angleToPlayer+Math.PI/2;
        const ax=bot.x+Math.cos(alt)*0.02,ay=bot.y+Math.sin(alt)*0.02;
        if(MAP_DATA[Math.floor(ay)]&&MAP_DATA[Math.floor(ay)][Math.floor(ax)]===FLOOR){bot.x=ax;bot.y=ay;}
      }
      if(dist<5&&now-bot.lastShot>1200&&!hasWallBetween(bot.x,bot.y,playerX,playerY)){
  bot.lastShot=now;
  const acc=dist<2?0.1:dist<3.5?0.35:0.6;
  if(Math.random()>acc){
          const dmg=dist<2?20:dist<4?13:8;
          playerHP=Math.max(0,playerHP-dmg);
          document.getElementById('hp-display').textContent=Math.floor(playerHP);
          showDamageEffect();
          if(playerHP<=0){exitRaid();return;}
        }
      }
    } else {
      bot.patrol+=0.02;
      const px=Math.cos(bot.angle+bot.patrol)*0.02;
      const py=Math.sin(bot.angle+bot.patrol)*0.02;
      const nx=bot.x+px,ny=bot.y+py;
      if(nx>0&&nx<COLS&&ny>0&&ny<ROWS&&MAP_DATA[Math.floor(ny)][Math.floor(nx)]===FLOOR){bot.x=nx;bot.y=ny;}
      else bot.angle+=Math.PI/2;
    }
    if(dist<0.8){
      playerHP=Math.max(0,playerHP-0.2);
      document.getElementById('hp-display').textContent=Math.floor(playerHP);
      if(playerHP<=0){exitRaid();return;}
    }
  });
  let nearBox=null,nearDist=999;
  lootBoxes.forEach(box=>{
    if(!box.open){const d=Math.sqrt((box.x-playerX)**2+(box.y-playerY)**2);if(d<1.5&&d<nearDist){nearDist=d;nearBox=box;}}
  });
  const abtn=document.getElementById('action-btn');
  if(abtn){
    if(nearBox){abtn.style.display='block';abtn.onclick=()=>openBox(nearBox);}
    else abtn.style.display='none';
  }
  if(Math.sqrt((COLS-3-playerX)**2+(ROWS-3-playerY)**2)<1.5)finishRaid();
}

function tryShoot(){
  if(!gameRunning)return;
  const now=Date.now();
  const fireRate=currentWeapon?currentWeapon.fireRate:400;
  if(now-lastShot<fireRate)return;
  if(currentWeapon&&ammo<=0)return;
  if(currentWeapon){ammo--;updateWeaponUI();}
  lastShot=now;
  const range=currentWeapon?currentWeapon.range:2;
  const damage=currentWeapon?currentWeapon.damage:10;
  const angleSpread=currentWeapon?.ammoType==='shotgun'?0.6:0.45;
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const dx=bot.x-playerX,dy=bot.y-playerY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>range)return;
    const angleToBot=Math.atan2(dy,dx);
    let diff=Math.abs(playerAngle-angleToBot);
    if(diff>Math.PI)diff=Math.PI*2-diff;
    if(diff>angleSpread)return;
    if(hasWallBetween(playerX,playerY,bot.x,bot.y))return;
    bot.hp-=damage;
    if(bot.hp<=0){
      lootBoxes.push({x:bot.x,y:bot.y,open:false,items:[getRandomLoot(),getRandomLoot()],isBot:true});
    }
  });
}

function hasWallBetween(x1,y1,x2,y2){
  const steps=Math.ceil(Math.sqrt((x2-x1)**2+(y2-y1)**2)*4);
  for(let i=1;i<steps;i++){
    const t=i/steps;
    const cx=x1+(x2-x1)*t;
    const cy=y1+(y2-y1)*t;
    const mx=Math.floor(cx),my=Math.floor(cy);
    if(my>=0&&my<ROWS&&mx>=0&&mx<COLS&&MAP_DATA[my][mx]===WALL)return true;
  }
  return false;
}

function punchAttack(){
  const now=Date.now();
  if(now-lastShot<500)return;
  lastShot=now;
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    if(Math.sqrt((bot.x-playerX)**2+(bot.y-playerY)**2)<1.2){
      bot.hp-=15;
      if(bot.hp<=0)lootBoxes.push({x:bot.x,y:bot.y,open:false,items:[getRandomLoot()],isBot:true});
    }
  });
}

function render(){
  if(!ctx)return;
  const canvas=document.getElementById('game-canvas');
  const W=canvas.width,H=canvas.height;
  const camX=playerX-W/2/TILE,camY=playerY-H/2/TILE;
  ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,W,H);
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const sx=(x-camX)*TILE,sy=(y-camY)*TILE;
      if(sx<-TILE||sx>W+TILE||sy<-TILE||sy>H+TILE)continue;
      if(MAP_DATA[y][x]===WALL){
        ctx.fillStyle='#2a3a5a';ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle='#1a2540';ctx.lineWidth=1;ctx.strokeRect(sx,sy,TILE,TILE);
      } else {
        ctx.fillStyle='#16213e';ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle='#1a2535';ctx.lineWidth=0.5;ctx.strokeRect(sx,sy,TILE,TILE);
      }
    }
  }
  const ex=(COLS-3-camX)*TILE,ey=(ROWS-3-camY)*TILE;
  ctx.fillStyle='#1D9E75';ctx.fillRect(ex,ey,TILE,TILE);
  ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText('🚪',ex+TILE/2,ey+TILE*0.75);
  lootBoxes.forEach(box=>{
    const bx=(box.x-camX)*TILE,by=(box.y-camY)*TILE;
    if(bx<-TILE||bx>W+TILE||by<-TILE||by>H+TILE)return;
    ctx.fillStyle=box.open?'#222':'#6B4F12';
    ctx.fillRect(bx-14,by-14,28,28);
    ctx.strokeStyle=box.isBot?'#993C1D':'#EF9F27';
    ctx.lineWidth=2;ctx.strokeRect(bx-14,by-14,28,28);
    ctx.font='16px Arial';ctx.textAlign='center';
    ctx.fillText(box.open?'📭':'📦',bx,by+6);
  });
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const bx=(bot.x-camX)*TILE,by=(bot.y-camY)*TILE;
    if(bx<-60||bx>W+60||by<-60||by>H+60)return;
    ctx.beginPath();ctx.arc(bx,by,14,0,Math.PI*2);
    ctx.fillStyle='#7a1515';ctx.fill();
    ctx.strokeStyle='#cc3333';ctx.lineWidth=2;ctx.stroke();
    ctx.font='16px Arial';ctx.textAlign='center';ctx.fillText('👤',bx,by+5);
    const hpPct=bot.hp/bot.maxHp;
    ctx.fillStyle='#333';ctx.fillRect(bx-14,by-24,28,5);
    ctx.fillStyle=hpPct>0.5?'#1D9E75':hpPct>0.25?'#EF9F27':'#cc3333';
    ctx.fillRect(bx-14,by-24,28*hpPct,5);
  });
  const px=(playerX-camX)*TILE,py=(playerY-camY)*TILE;
  ctx.beginPath();ctx.arc(px,py,16,0,Math.PI*2);
  ctx.fillStyle='#3a3a7a';ctx.fill();
  ctx.strokeStyle='#7F77DD';ctx.lineWidth=2.5;ctx.stroke();
  ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText('🧑',px,py+6);
  const rayLen=(currentWeapon?.range||2)*TILE;
  ctx.beginPath();ctx.moveTo(px,py);
  ctx.lineTo(px+Math.cos(playerAngle)*rayLen,py+Math.sin(playerAngle)*rayLen);
  ctx.strokeStyle='rgba(255,255,80,0.5)';ctx.lineWidth=1.5;ctx.stroke();
  const hpPct=playerHP/100;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px-40,py-32,80,8);
  ctx.fillStyle=hpPct>0.5?'#1D9E75':hpPct>0.25?'#EF9F27':'#cc3333';
  ctx.fillRect(px-40,py-32,80*hpPct,8);
}

function openBox(box){
  if(raidLoot.length>=bagSize){alert('Рюкзак полон!');return;}
  box.open=true;
  const item=box.items[0];
  if(item.category==='weapon'){
    if(!currentWeapon){
      currentWeapon=WEAPONS[item.weaponType]||null;
      ammo=item.weaponType==='pistol'?12:item.weaponType==='rifle'?8:4;
      updateWeaponUI();
      alert('Подобрано: '+item.emoji+' '+item.name);
      return;
    }
  }
  if(item.category==='ammo'&&currentWeapon&&item.ammoType===currentWeapon.ammoType){
    ammo+=item.count||10;updateWeaponUI();
    alert('+'+item.count+' патронов ['+ammo+' всего]');return;
  }
  raidLoot.push(item);
  document.getElementById('bag-display').textContent=raidLoot.length+'/'+bagSize;
  alert('Найдено: '+item.emoji+' '+item.name);
}

function finishRaid(){
  gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);
  document.getElementById('loot-game').style.display='none';
  document.getElementById('loot-results').style.display='block';
  const list=document.getElementById('loot-found-list');
  if(!raidLoot.length){list.innerHTML='<div style="color:#888;text-align:center;padding:20px">Ничего не нашли</div>';return;}
  const total=raidLoot.reduce((a,b)=>a+(b.value||0),0);
  const RCOL_L={common:'#888',rare:'#378ADD',vr:'#1D9E75',epic:'#a78bfa',legendary:'#EF9F27'};
  const RN_L={common:'Обычный',rare:'Редкий',vr:'Очень редкий',epic:'Эпический',legendary:'Легендарный'};
  list.innerHTML=`<div style="font-size:13px;color:#888;margin-bottom:10px;text-align:center">Итого: ~${total.toLocaleString('ru')} 💜</div>`+
    raidLoot.map(it=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2a4a">
        <span style="font-size:24px">${it.emoji}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600">${it.name}</div>
          <div style="font-size:11px;color:${RCOL_L[it.rarity]||'#888'}">${RN_L[it.rarity]||it.rarity}</div>
        </div>
        <div style="font-size:13px;color:#a78bfa;font-weight:700">~${it.value} 💜</div>
      </div>`).join('');
}

function exitRaid(){
  gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);
  document.getElementById('loot-game').style.display='none';
  if(raidLoot.length>0)finishRaid();
  else{document.getElementById('loot-results').style.display='none';document.getElementById('loot-menu').style.display='block';}
}

async function saveLootAndExit(){
  for(const item of raidLoot){
    if(item.category==='seed'){
      const plantName=item.name.replace('Семя ','');
      const {data:plant}=await sb.from('plants').select('*').ilike('name',plantName).single();
      if(plant){
        const {data:ex}=await sb.from('seeds').select('*').eq('user_id',currentUser.user_id).eq('plant_id',plant.id).single();
        if(ex)await sb.from('seeds').update({quantity:ex.quantity+1}).eq('id',ex.id);
        else await sb.from('seeds').insert({user_id:currentUser.user_id,plant_id:plant.id,quantity:1});
      } else {
        await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:item.name,item_type:item.emoji,rarity:item.rarity,base_price:item.value||50,is_equipped:false});
      }
    } else {
      await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:item.name,item_type:item.emoji,rarity:item.rarity,base_price:item.value||50,is_equipped:false});
    }
  }
  raidLoot=[];
  alert('Лут сохранён в инвентарь!');
  document.getElementById('loot-results').style.display='none';
  document.getElementById('loot-menu').style.display='block';
}

function showRaidBag(){
  if(!raidLoot.length){alert('Рюкзак пуст!');return;}
  const RCOL_L={common:'#888',rare:'#378ADD',vr:'#1D9E75',epic:'#a78bfa',legendary:'#EF9F27'};
  if(typeof showModal==='function'){
    showModal('🎒 Рюкзак ('+raidLoot.length+'/'+bagSize+')',
      raidLoot.map((it,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2a4a">
          <span style="font-size:24px">${it.emoji}</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">${it.name}</div>
            <div style="font-size:12px;color:${RCOL_L[it.rarity]||'#888'}">~${it.value} 💜</div>
          </div>
          <button onclick="dropLootItem(${i})" style="padding:4px 10px;background:none;border:1px solid #993C1D;border-radius:8px;color:#993C1D;font-size:11px;cursor:pointer;font-family:Arial,sans-serif">Выбросить</button>
        </div>`).join(''));
  }
}

function dropLootItem(index){
  raidLoot.splice(index,1);
  const el=document.getElementById('bag-display');
  if(el)el.textContent=raidLoot.length+'/'+bagSize;
  if(typeof closeModal==='function')closeModal();
  if(raidLoot.length)showRaidBag();
}

function showDamageEffect(){
  const flash=document.createElement('div');
  flash.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.3);z-index:999;pointer-events:none';
  document.body.appendChild(flash);
  setTimeout(()=>flash.remove(),180);
}

function setupJoysticks(){
  const jl=document.getElementById('joystick-left');
  const jld=document.getElementById('js-left-dot');
  const jr=document.getElementById('joystick-right');
  const jrd=document.getElementById('js-right-dot');
  if(!jl||!jr)return;
  let leftId=null,rightId=null,leftCX=0,leftCY=0,rightCX=0,rightCY=0;

  function calcJoy(cx,cy,tx,ty,dot,maxR=65){
    const dx=tx-cx,dy=ty-cy,len=Math.sqrt(dx*dx+dy*dy);
    const clamp=Math.min(len,maxR),nx=len>0?dx/len:0,ny=len>0?dy/len:0;
    dot.style.transform=`translate(calc(-50% + ${nx*clamp}px),calc(-50% + ${ny*clamp}px))`;
    return{x:nx,y:ny,active:len>8};
  }

  document.addEventListener('touchstart',e=>{
    Array.from(e.changedTouches).forEach(t=>{
      const lr=jl.getBoundingClientRect(),rr=jr.getBoundingClientRect();
      if(leftId===null&&t.clientX>lr.left-30&&t.clientX<lr.right+30&&t.clientY>lr.top-30&&t.clientY<lr.bottom+30){
        leftId=t.identifier;leftCX=lr.left+lr.width/2;leftCY=lr.top+lr.height/2;
      }
      if(rightId===null&&t.clientX>rr.left-30&&t.clientX<rr.right+30&&t.clientY>rr.top-30&&t.clientY<rr.bottom+30){
        rightId=t.identifier;rightCX=rr.left+rr.width/2;rightCY=rr.top+rr.height/2;
      }
    });
  },{passive:false});

  document.addEventListener('touchmove',e=>{
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t=>{
      if(t.identifier===leftId){const r=calcJoy(leftCX,leftCY,t.clientX,t.clientY,jld);jsLeftActive=r.active;jsLeftX=r.x;jsLeftY=r.y;}
      if(t.identifier===rightId){const r=calcJoy(rightCX,rightCY,t.clientX,t.clientY,jrd);jsRightActive=r.active;jsRightX=r.x;jsRightY=r.y;}
    });
  },{passive:false});

  document.addEventListener('touchend',e=>{
    Array.from(e.changedTouches).forEach(t=>{
      if(t.identifier===leftId){leftId=null;jsLeftActive=false;jsLeftX=0;jsLeftY=0;jld.style.transform='translate(-50%,-50%)';}
      if(t.identifier===rightId){rightId=null;jsRightActive=false;jsRightX=0;jsRightY=0;jrd.style.transform='translate(-50%,-50%)';}
    });
  });
}
