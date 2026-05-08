const TILE=24,COLS=120,ROWS=90,FLOOR=0,WALL=1,DOOR_CLOSED=2,DOOR_OPEN=3,PROP=4;
let gameRunning=false,playerX=5,playerY=5,playerAngle=0;
let playerHP=100,playerMaxHP=100,playerArmor=0,playerMaxArmor=0;
let raidLoot=[],bagSize=6,ctx=null,animFrame=null;
let jsLeftActive=false,jsRightActive=false;
let jsLeftX=0,jsLeftY=0,jsRightX=0,jsRightY=0;
let lootBoxes=[],bots=[],doors=[],props=[],lastShot=0;
let currentWeapon=null,ammo=0;
let discoveredBots=new Set();
let fogMap=[];
let medkitCount=0,bandageCount=0;
let MAP_DATA=[],roomList=[],roomTypes=[];
let textures={};
let texturesLoaded=false;

// Типы комнат
const ROOM_TYPES={
  warehouse:{name:'Склад',floorColor:'#1a1a1a',wallColor:'#2a2a3a',accentColor:'#3a3a2a',props:['box','barrel'],lootBonus:'common'},
  office:{name:'Офис',floorColor:'#1a1e28',wallColor:'#1e2a3a',accentColor:'#2a3a4a',props:['table','chair'],lootBonus:'rare'},
  lab:{name:'Лаборатория',floorColor:'#0f1a1a',wallColor:'#1a2a2a',accentColor:'#1a3a3a',props:['table','barrel'],lootBonus:'vr'},
  storage:{name:'Хранилище',floorColor:'#1a1410',wallColor:'#2a1e14',accentColor:'#3a2a1a',props:['box','column'],lootBonus:'rare'},
  corridor:{name:'Коридор',floorColor:'#141414',wallColor:'#242424',accentColor:'#1a1a1a',props:[],lootBonus:'common'},
  armory:{name:'Оружейная',floorColor:'#1a1a14',wallColor:'#2a2a1a',accentColor:'#3a3a14',props:['barrel','column'],lootBonus:'epic'},
};

const WEAPONS={
  pistol:{name:'Пистолет М9',emoji:'🔫',damage:25,range:8,fireRate:350,ammoType:'pistol',spread:0.45},
  rifle:{name:'Винтовка АК',emoji:'🎯',damage:45,range:14,fireRate:500,ammoType:'rifle',spread:0.35},
  shotgun:{name:'Дробовик МП',emoji:'💥',damage:70,range:4,fireRate:900,ammoType:'shotgun',spread:0.7},
  smg:{name:'Пистолет-пулемёт',emoji:'⚡',damage:18,range:6,fireRate:200,ammoType:'pistol',spread:0.5},
  sniper:{name:'Снайперка СВД',emoji:'🔭',damage:90,range:20,fireRate:1500,ammoType:'rifle',spread:0.15},
};

const BOT_TYPES={
  patrol:{name:'Патрульный',hp:60,maxHp:60,weapon:'pistol',speed:0.025,viewAngle:2.1,viewRange:7,shootRange:5,shootCooldown:1400,damage:12,color:'#7a1515',drop:'common'},
  guard:{name:'Охранник',hp:100,maxHp:100,weapon:'shotgun',speed:0.015,viewAngle:2.1,viewRange:6,shootRange:3.5,shootCooldown:1800,damage:25,color:'#1a3a7a',drop:'rare'},
  sniper:{name:'Снайпер',hp:40,maxHp:40,weapon:'sniper',speed:0.008,viewAngle:1.2,viewRange:16,shootRange:15,shootCooldown:2500,damage:45,color:'#1a5a1a',drop:'rare'},
  elite:{name:'Элитный',hp:150,maxHp:150,weapon:'rifle',speed:0.03,viewAngle:2.4,viewRange:10,shootRange:8,shootCooldown:1000,damage:20,color:'#7a4a00',drop:'epic'},
};

const LOOT_TABLE=[
  {name:'Скотч',emoji:'🧻',rarity:'common',chance:20,value:20,category:'misc'},
  {name:'Бинты',emoji:'🩹',rarity:'common',chance:15,value:40,category:'medical',count:3,healAmount:60},
  {name:'Аптечка',emoji:'💊',rarity:'rare',chance:5,value:150,category:'medical',count:1,healAmount:70},
  {name:'Броник лёгкий',emoji:'🦺',rarity:'rare',chance:3,value:500,category:'armor',armorAmount:50},
  {name:'Броник тяжёлый',emoji:'🛡️',rarity:'epic',chance:1,value:1500,category:'armor',armorAmount:100},
  {name:'Рюкзак туристический',emoji:'🎒',rarity:'rare',chance:2,value:800,category:'bag',bagSlots:10},
  {name:'Рюкзак тактический',emoji:'🎒',rarity:'epic',chance:0.8,value:2000,category:'bag',bagSlots:14},
  {name:'Рюкзак армейский',emoji:'🎒',rarity:'legendary',chance:0.2,value:5000,category:'bag',bagSlots:20},
  {name:'Патроны 9мм',emoji:'🔴',rarity:'common',chance:14,value:40,category:'ammo',ammoType:'pistol',count:15},
  {name:'Патроны 5.56',emoji:'🟡',rarity:'rare',chance:6,value:80,category:'ammo',ammoType:'rifle',count:10},
  {name:'Патроны 12к',emoji:'🟠',rarity:'rare',chance:4,value:90,category:'ammo',ammoType:'shotgun',count:5},
  {name:'Пистолет М9',emoji:'🔫',rarity:'rare',chance:3,value:300,category:'weapon',weaponType:'pistol'},
  {name:'Дробовик МП',emoji:'💥',rarity:'rare',chance:2,value:800,category:'weapon',weaponType:'shotgun'},
  {name:'Пистолет-пулемёт',emoji:'⚡',rarity:'epic',chance:1,value:1200,category:'weapon',weaponType:'smg'},
  {name:'Винтовка АК',emoji:'🎯',rarity:'epic',chance:0.8,value:1500,category:'weapon',weaponType:'rifle'},
  {name:'Снайперка СВД',emoji:'🔭',rarity:'legendary',chance:0.2,value:3000,category:'weapon',weaponType:'sniper'},
  {name:'Кабель видео',emoji:'🔌',rarity:'common',chance:12,value:50,category:'pc'},
  {name:'Термопаста КТ',emoji:'🧪',rarity:'common',chance:10,value:60,category:'pc'},
  {name:'ОЗУ 8ГБ DDR4',emoji:'💿',rarity:'rare',chance:3,value:400,category:'pc'},
  {name:'ОЗУ 16ГБ DDR5',emoji:'💿',rarity:'epic',chance:1,value:900,category:'pc'},
  {name:'SSD 256ГБ',emoji:'💾',rarity:'rare',chance:3,value:500,category:'pc'},
  {name:'SSD 1ТБ',emoji:'💾',rarity:'epic',chance:1,value:1200,category:'pc'},
  {name:'Проц i5',emoji:'🔧',rarity:'rare',chance:2,value:800,category:'pc'},
  {name:'Проц i7',emoji:'🔧',rarity:'epic',chance:0.7,value:2000,category:'pc'},
  {name:'Карта NVX 3060',emoji:'🖥️',rarity:'epic',chance:0.7,value:3000,category:'pc'},
  {name:'Карта NVX 4070',emoji:'🖥️',rarity:'legendary',chance:0.15,value:6000,category:'pc'},
  {name:'Мат. плата B550',emoji:'🟩',rarity:'rare',chance:1.5,value:1000,category:'pc'},
  {name:'БП 650W',emoji:'⚡',rarity:'rare',chance:1.5,value:800,category:'pc'},
  {name:'Семя травы',emoji:'🌿',rarity:'common',chance:6,value:50,category:'seed'},
  {name:'Семя клубники',emoji:'🍓',rarity:'rare',chance:2,value:200,category:'seed'},
  {name:'Семя кокоса',emoji:'🥥',rarity:'legendary',chance:0.1,value:800,category:'seed'},
];

function getRandomLoot(dropQuality){
  const pool=dropQuality==='epic'?LOOT_TABLE.filter(i=>['rare','epic','legendary'].includes(i.rarity)):
    dropQuality==='rare'?LOOT_TABLE.filter(i=>['common','rare'].includes(i.rarity)):LOOT_TABLE;
  const src=pool.length?pool:LOOT_TABLE;
  const total=src.reduce((a,b)=>a+b.chance,0);
  let rand=Math.random()*total;
  for(const item of src){rand-=item.chance;if(rand<=0)return{...item};}
  return{...src[0]};
}

function loadTextures(){
  const paths={
    floor_concrete:'assets/textures/floor_concrete.png',
    floor_metal:'assets/textures/floor_metal.png',
    floor_wood:'assets/textures/floor_wood.png',
    floor_tile:'assets/textures/floor_tile.png',
    wall_brick:'assets/textures/wall_brick.png',
    wall_metal:'assets/textures/wall_metal.png',
    prop_box:'assets/textures/prop_box.png',
    prop_barrel:'assets/textures/prop_barrel.png',
    prop_table:'assets/textures/prop_table.png',
    prop_column:'assets/textures/prop_column.png',
  };
  let loaded=0,total=Object.keys(paths).length;
  Object.entries(paths).forEach(([key,path])=>{
    const img=new Image();
    img.onload=()=>{textures[key]=img;loaded++;if(loaded===total)texturesLoaded=true;};
    img.onerror=()=>{loaded++;if(loaded===total)texturesLoaded=true;};
    img.src=path;
  });
}

// Назначаем тип комнаты
const ROOM_TYPE_LIST=Object.keys(ROOM_TYPES);
function assignRoomType(roomIndex){
  if(roomIndex===0)return'warehouse';
  // Оружейная только в дальних комнатах
  if(roomIndex>20&&Math.random()<0.1)return'armory';
  if(Math.random()<0.15)return'lab';
  if(Math.random()<0.2)return'office';
  if(Math.random()<0.2)return'storage';
  return'warehouse';
}

function generateMap(){
  MAP_DATA=Array(ROWS).fill(null).map(()=>Array(COLS).fill(WALL));
  roomList=[];doors=[];props=[];roomTypes=[];

  const rooms=[
    // Ряд 1
    {x:3,y:3,w:14,h:10},{x:20,y:3,w:18,h:10},{x:42,y:3,w:14,h:10},
    {x:60,y:3,w:16,h:10},{x:80,y:3,w:14,h:10},{x:98,y:3,w:18,h:10},
    // Ряд 2
    {x:3,y:17,w:12,h:12},{x:19,y:17,w:16,h:12},{x:39,y:17,w:18,h:12},
    {x:61,y:17,w:16,h:12},{x:81,y:17,w:14,h:12},{x:99,y:17,w:18,h:12},
    // Ряд 3
    {x:3,y:33,w:14,h:14},{x:21,y:33,w:18,h:14},{x:43,y:33,w:16,h:14},
    {x:63,y:33,w:16,h:14},{x:83,y:33,w:14,h:14},{x:101,y:33,w:16,h:14},
    // Ряд 4
    {x:3,y:51,w:16,h:12},{x:23,y:51,w:14,h:12},{x:41,y:51,w:18,h:12},
    {x:63,y:51,w:16,h:12},{x:83,y:51,w:14,h:12},{x:101,y:51,w:16,h:12},
    // Ряд 5
    {x:5,y:67,w:14,h:10},{x:23,y:67,w:16,h:10},{x:43,y:67,w:18,h:10},
    {x:65,y:67,w:14,h:10},{x:83,y:67,w:16,h:10},{x:103,y:67,w:14,h:10},
    // Ряд 6
    {x:5,y:81,w:16,h:6},{x:25,y:81,w:18,h:6},{x:47,y:81,w:16,h:6},
    {x:67,y:81,w:18,h:6},{x:89,y:81,w:16,h:6},
  ];

  rooms.forEach((r,i)=>{
    for(let y=r.y;y<r.y+r.h&&y<ROWS;y++)
      for(let x=r.x;x<r.x+r.w&&x<COLS;x++)
        MAP_DATA[y][x]=FLOOR;
    roomList.push(r);
    const rtype=assignRoomType(i);
    roomTypes.push(rtype);
    if(i>0)spawnRoomProps(r,rtype);
  });

  const corridors=[
    [16,7,20,7],[38,7,42,7],[56,7,60,7],[76,7,80,7],[96,7,98,7],
    [15,22,19,22],[35,22,39,22],[57,22,61,22],[77,22,81,22],[97,22,99,22],
    [17,38,21,38],[39,38,43,38],[59,38,63,38],[79,38,83,38],[99,38,101,38],
    [19,56,23,56],[37,56,41,56],[59,56,63,56],[79,56,83,56],[99,56,101,56],
    [19,72,23,72],[39,72,43,72],[61,72,65,72],[79,72,83,72],[99,72,103,72],
    [9,13,9,17],[9,29,9,33],[9,45,9,51],[9,63,9,67],[9,77,9,81],
    [29,13,29,17],[29,29,29,33],[29,45,29,51],[29,63,29,67],[29,77,29,81],
    [50,13,50,17],[50,29,50,33],[50,45,50,51],[50,63,50,67],[50,77,50,81],
    [70,13,70,17],[70,29,70,33],[70,45,70,51],[70,63,70,67],[70,77,70,81],
    [90,13,90,17],[90,29,90,33],[90,45,90,51],[90,63,90,67],[90,77,90,81],
    [110,13,110,17],[110,29,110,33],[110,45,110,51],[110,63,110,67],
  ];

  corridors.forEach(([x1,y1,x2,y2])=>{
    if(x1===x2){for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)if(y>=0&&y<ROWS)MAP_DATA[y][x1]=FLOOR;}
    else{for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)if(x>=0&&x<COLS)MAP_DATA[y1][x]=FLOOR;}
  });

  [[16,7],[38,7],[56,7],[76,7],[96,7],
   [15,22],[35,22],[57,22],[77,22],[97,22],
   [9,15],[29,15],[50,15],[70,15],[90,15],[110,15],
   [9,31],[29,31],[50,31],[70,31],[90,31],
   [9,47],[29,47],[50,47],[70,47],[90,47],
   [9,65],[29,65],[50,65],[70,65],[90,65]].forEach(([x,y])=>{
    if(y>=0&&y<ROWS&&x>=0&&x<COLS&&MAP_DATA[y][x]===FLOOR){
      const locked=Math.random()<0.35;
      doors.push({x,y,open:!locked,locked,isExit:false});
      if(locked)MAP_DATA[y][x]=DOOR_CLOSED;
    }
  });

  // Точка эвакуации
  const EX=107,EY=84;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const mx=EX+dx,my=EY+dy;
    if(mx>=0&&mx<COLS&&my>=0&&my<ROWS)MAP_DATA[my][mx]=FLOOR;
  }
  doors.push({x:EX,y:EY,open:false,locked:false,isExit:true});
  MAP_DATA[EY][EX]=FLOOR;
}

const EXIT_X=()=>107;
const EXIT_Y=()=>84;

function spawnRoomProps(room,roomType){
  const rt=ROOM_TYPES[roomType];
  if(!rt.props.length)return;
  const count=Math.floor(Math.random()*3)+1;
  for(let i=0;i<count;i++){
    const attempts=10;
    for(let a=0;a<attempts;a++){
      const px=room.x+1+Math.floor(Math.random()*(room.w-2));
      const py=room.y+1+Math.floor(Math.random()*(room.h-2));
      if(px>=COLS||py>=ROWS)continue;
      if(MAP_DATA[py][px]!==FLOOR)continue;
      // Не ставим у входа
      const tooClose=props.some(p=>Math.abs(p.x-px)<2&&Math.abs(p.y-py)<2);
      if(tooClose)continue;
      const propType=rt.props[Math.floor(Math.random()*rt.props.length)];
      props.push({x:px,y:py,type:propType,roomType});
      MAP_DATA[py][px]=PROP;
      break;
    }
  }
}

function getRoomTypeAt(x,y){
  for(let i=0;i<roomList.length;i++){
    const r=roomList[i];
    if(x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)return roomTypes[i]||'warehouse';
  }
  return'corridor';
}

function initFog(){fogMap=Array(ROWS).fill(null).map(()=>Array(COLS).fill(false));}

function updateFog(){
  const vr=10;
  for(let dy=-vr;dy<=vr;dy++){
    for(let dx=-vr;dx<=vr;dx++){
      if(dx*dx+dy*dy>vr*vr)continue;
      const tx=Math.floor(playerX)+dx,ty=Math.floor(playerY)+dy;
      if(tx<0||tx>=COLS||ty<0||ty>=ROWS)continue;
      if(!hasWallBetween(playerX,playerY,tx+0.5,ty+0.5))fogMap[ty][tx]=true;
    }
  }
}

function startRaid(){
  document.getElementById('loot-menu').style.display='none';
  document.getElementById('loot-game').style.display='block';
  document.getElementById('loot-results').style.display='none';
  playerX=5;playerY=5;playerAngle=0;
  playerHP=100;playerMaxHP=100;playerArmor=0;playerMaxArmor=0;
  raidLoot=[];gameRunning=true;
  currentWeapon=WEAPONS.pistol;ammo=30;
  medkitCount=0;bandageCount=0;
  discoveredBots=new Set();
  generateMap();
  initFog();
  loadTextures();
  updateWeaponUI();
  updateHealthUI();
  document.getElementById('bag-display').textContent='0/'+bagSize;
  lootBoxes=[];
  roomList.forEach((r,ri)=>{
    if(ri===0)return;
    const bx=r.x+2+Math.floor(Math.random()*Math.max(1,r.w-4));
    const by=r.y+2+Math.floor(Math.random()*Math.max(1,r.h-4));
    if(bx<COLS&&by<ROWS&&MAP_DATA[by][bx]===FLOOR)
      lootBoxes.push({x:bx,y:by,open:false,items:[getRandomLoot(),getRandomLoot(),getRandomLoot()]});
  });
  bots=[];
  const spawns=[
    {t:'patrol',pos:[[25,8],[45,8],[65,8],[85,8],[105,8],[25,22],[45,22],[65,22]]},
    {t:'guard',pos:[[20,38],[42,38],[63,38],[84,38],[20,56],[42,56],[63,56]]},
    {t:'sniper',pos:[[10,38],[110,8],[10,55],[110,38],[55,20]]},
    {t:'elite',pos:[[55,38],[30,55],[80,22],[100,55]]},
  ];
  spawns.forEach(g=>g.pos.forEach(([bx,by])=>{
    if(by<ROWS&&bx<COLS&&MAP_DATA[by][bx]===FLOOR){
      const bt=BOT_TYPES[g.t];
      bots.push({x:bx,y:by,angle:Math.random()*Math.PI*2,hp:bt.hp,maxHp:bt.maxHp,type:g.t,lastShot:0,patrol:0,alerted:false,alertTimer:0,id:Math.random()});
    }
  }));
  const canvas=document.getElementById('game-canvas');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  ctx=canvas.getContext('2d');
  setupJoysticks();
  gameLoop();
}

function updateWeaponUI(){
  const el=document.getElementById('weapon-display');if(!el)return;
  el.textContent=currentWeapon?currentWeapon.emoji+' '+currentWeapon.name+' ['+ammo+']':'🤜 Кулаки';
}

function updateHealthUI(){
  const hp=document.getElementById('hp-display');if(hp)hp.textContent=Math.floor(playerHP);
  const ar=document.getElementById('armor-display');if(ar)ar.textContent=playerArmor>0?'🔵'+Math.floor(playerArmor):'';
  const mb=document.getElementById('medkit-btn');
  if(mb){
    if(medkitCount>0){mb.style.display='block';mb.textContent='💊 Аптечка ('+medkitCount+')';}
    else if(bandageCount>0){mb.style.display='block';mb.textContent='🩹 Бинт ('+bandageCount+')';}
    else mb.style.display='none';
  }
}

function useHeal(){
  if(medkitCount>0){playerHP=Math.min(playerMaxHP,playerHP+70);medkitCount--;}
  else if(bandageCount>0){playerHP=Math.min(playerMaxHP,playerHP+60);bandageCount--;}
  updateHealthUI();
}

function gameLoop(){if(!gameRunning)return;update();render();animFrame=requestAnimationFrame(gameLoop);}

function canMove(x,y){
  const mx=Math.floor(x),my=Math.floor(y);
  if(mx<0||mx>=COLS||my<0||my>=ROWS)return false;
  const cell=MAP_DATA[my][mx];
  return cell===FLOOR||cell===DOOR_OPEN;
}

function isInFOV(bot,tx,ty,fovAngle,fovRange){
  const dx=tx-bot.x,dy=ty-bot.y,dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>fovRange)return false;
  const a=Math.atan2(dy,dx);let diff=Math.abs(bot.angle-a);
  if(diff>Math.PI)diff=Math.PI*2-diff;
  return diff<fovAngle/2;
}

function hasWallBetween(x1,y1,x2,y2){
  const steps=Math.ceil(Math.sqrt((x2-x1)**2+(y2-y1)**2)*6);
  for(let i=1;i<steps;i++){
    const t=i/steps,cx=x1+(x2-x1)*t,cy=y1+(y2-y1)*t;
    const mx=Math.floor(cx),my=Math.floor(cy);
    if(my>=0&&my<ROWS&&mx>=0&&mx<COLS){
      const cell=MAP_DATA[my][mx];
      if(cell===WALL||cell===DOOR_CLOSED||cell===PROP)return true;
    }
  }
  return false;
}

function openDoor(door){
  door.open=true;
  const mx=Math.floor(door.x),my=Math.floor(door.y);
  if(MAP_DATA[my]&&MAP_DATA[my][mx]===DOOR_CLOSED)MAP_DATA[my][mx]=DOOR_OPEN;
}

function update(){
  const speed=0.07;
  if(jsLeftActive){
    const len=Math.sqrt(jsLeftX*jsLeftX+jsLeftY*jsLeftY);
    if(len>0.1){
      const mx=jsLeftX/len*speed,my=jsLeftY/len*speed;
      if(canMove(playerX+mx,playerY))playerX+=mx;
      if(canMove(playerX,playerY+my))playerY+=my;
    }
  }
  if(jsRightActive){
    const len=Math.sqrt(jsRightX*jsRightX+jsRightY*jsRightY);
    if(len>0.1){playerAngle=Math.atan2(jsRightY,jsRightX);tryShoot();}
  }
  updateFog();
  const now=Date.now();
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const bt=BOT_TYPES[bot.type];
    const dx=playerX-bot.x,dy=playerY-bot.y,dist=Math.sqrt(dx*dx+dy*dy);
    const atp=Math.atan2(dy,dx);
    const canSee=isInFOV(bot,playerX,playerY,bt.viewAngle,bt.viewRange)&&!hasWallBetween(bot.x,bot.y,playerX,playerY);
    if(canSee){bot.alerted=true;bot.alertTimer=now;discoveredBots.add(bot.id);}
    else if(bot.alerted&&now-bot.alertTimer>5000)bot.alerted=false;
    if(bot.alerted&&dist<bt.viewRange*1.5){
      if(dist>1.5){
        const nx=bot.x+Math.cos(atp)*bt.speed,ny=bot.y+Math.sin(atp)*bt.speed;
        if(canMove(nx,bot.y))bot.x=nx;if(canMove(bot.x,ny))bot.y=ny;
        bot.angle=atp;
      }
      if(dist<=bt.shootRange&&canSee&&now-bot.lastShot>bt.shootCooldown){
        bot.lastShot=now;
        const acc=dist<2?0.1:dist<4?0.3:0.55;
        if(Math.random()>acc){
          let dmg=bt.damage;
          if(playerArmor>0){const ab=Math.min(playerArmor,dmg*0.5);playerArmor-=ab;dmg-=ab;}
          playerHP=Math.max(0,playerHP-dmg);updateHealthUI();showDamageEffect();
          if(playerHP<=0){exitRaid(true);return;}
        }
      }
    } else {
      bot.patrol+=0.015;
      const px=Math.cos(bot.angle+bot.patrol)*bt.speed,py=Math.sin(bot.angle+bot.patrol)*bt.speed;
      if(canMove(bot.x+px,bot.y))bot.x+=px;
      else if(canMove(bot.x,bot.y+py))bot.y+=py;
      else bot.angle+=Math.PI/2;
    }
    if(dist<0.8){
      let dmg=bt.damage*0.1;
      if(playerArmor>0){const ab=Math.min(playerArmor,dmg*0.5);playerArmor-=ab;dmg-=ab;}
      playerHP=Math.max(0,playerHP-dmg);updateHealthUI();
      if(playerHP<=0){exitRaid(true);return;}
    }
  });
  const abtn=document.getElementById('action-btn');
  let nearDoor=null,nearDoorDist=999,nearBox=null,nearBoxDist=999;
  doors.forEach(door=>{
    if(door.open&&!door.isExit)return;
    const mx=Math.floor(door.x),my=Math.floor(door.y);
    if(MAP_DATA[my]&&MAP_DATA[my][mx]!==DOOR_CLOSED&&!door.isExit)return;
    const d=Math.sqrt((door.x-playerX)**2+(door.y-playerY)**2);
    if(d<2.5&&d<nearDoorDist){nearDoorDist=d;nearDoor=door;}
  });
  lootBoxes.forEach(box=>{
    if(!box.open){const d=Math.sqrt((box.x-playerX)**2+(box.y-playerY)**2);if(d<1.8&&d<nearBoxDist){nearBoxDist=d;nearBox=box;}}
  });
  if(abtn){
    if(nearDoor){
      abtn.style.display='block';
      if(nearDoor.isExit){
        abtn.textContent='🚁 Эвакуироваться!';
        abtn.style.background='#1D9E75';
        abtn.onclick=()=>finishRaid();
      } else {
        abtn.textContent='🚪 Открыть дверь';
        abtn.style.background='#EF9F27';
        abtn.onclick=()=>openDoor(nearDoor);
      }
    } else if(nearBox){
      abtn.style.display='block';
      abtn.textContent='📦 Открыть ящик';
      abtn.style.background='#EF9F27';
      abtn.onclick=()=>openBox(nearBox);
    } else {
      abtn.style.display='none';
    }
  }
  // Автоэвакуация
  const distToExit=Math.sqrt((EXIT_X()-playerX)**2+(EXIT_Y()-playerY)**2);
  if(distToExit<2.5)finishRaid();
}

function tryShoot(){
  if(!gameRunning)return;
  const now=Date.now();
  const wp=currentWeapon||{fireRate:400,range:2,damage:10,spread:0.5};
  if(now-lastShot<wp.fireRate)return;
  let hasTarget=false;
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const dx=bot.x-playerX,dy=bot.y-playerY,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>wp.range)return;
    if(hasWallBetween(playerX,playerY,bot.x,bot.y))return;
    const a=Math.atan2(dy,dx);let diff=Math.abs(playerAngle-a);
    if(diff>Math.PI)diff=Math.PI*2-diff;
    if(diff<wp.spread)hasTarget=true;
  });
  if(!hasTarget)return;
  if(currentWeapon&&ammo<=0)return;
  if(currentWeapon){ammo--;updateWeaponUI();}
  lastShot=now;
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const dx=bot.x-playerX,dy=bot.y-playerY,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>wp.range)return;
    if(hasWallBetween(playerX,playerY,bot.x,bot.y))return;
    const a=Math.atan2(dy,dx);let diff=Math.abs(playerAngle-a);
    if(diff>Math.PI)diff=Math.PI*2-diff;
    if(diff>=wp.spread)return;
    bot.hp-=wp.damage;bot.alerted=true;bot.alertTimer=now;
    if(bot.hp<=0){
      const bt=BOT_TYPES[bot.type];
      lootBoxes.push({x:bot.x,y:bot.y,open:false,items:[getRandomLoot(bt.drop),getRandomLoot(bt.drop)],isBot:true});
    }
  });
}
