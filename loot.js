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
function drawTile(x,y,textureKey,fallbackColor){
  if(texturesLoaded&&textures[textureKey]){
    ctx.drawImage(textures[textureKey],x,y,TILE,TILE);
  } else {
    ctx.fillStyle=fallbackColor;
    ctx.fillRect(x,y,TILE,TILE);
  }
}

function drawProp(sx,sy,propType){
  const size=TILE*0.8,offset=(TILE-size)/2;
  if(texturesLoaded&&textures['prop_'+propType]){
    ctx.drawImage(textures['prop_'+propType],sx+offset,sy+offset,size,size);
  } else {
    const colors={box:'#5a4a2a',barrel:'#2a4a2a',table:'#3a2a1a',column:'#3a3a3a'};
    const emojis={box:'📦',barrel:'🛢️',table:'🪑',column:'⬛'};
    ctx.fillStyle=colors[propType]||'#333';
    ctx.fillRect(sx+offset,sy+offset,size,size);
    ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;
    ctx.strokeRect(sx+offset,sy+offset,size,size);
    ctx.font=Math.floor(size*0.6)+'px Arial';
    ctx.textAlign='center';
    ctx.fillText(emojis[propType]||'▪',sx+TILE/2,sy+TILE*0.75);
  }
}

function render(){
  if(!ctx)return;
  const canvas=document.getElementById('game-canvas');
  const W=canvas.width,H=canvas.height;
  const camX=playerX-W/2/TILE,camY=playerY-H/2/TILE;
  ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);

  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const sx=(x-camX)*TILE,sy=(y-camY)*TILE;
      if(sx<-TILE||sx>W+TILE||sy<-TILE||sy>H+TILE)continue;
      if(!fogMap[y]||!fogMap[y][x]){
        ctx.fillStyle='#06060f';ctx.fillRect(sx,sy,TILE,TILE);
        continue;
      }
      const cell=MAP_DATA[y][x];
      const rtype=getRoomTypeAt(x,y);
      const rt=ROOM_TYPES[rtype]||ROOM_TYPES.warehouse;

      if(cell===WALL){
        // Стена с текстурой
        const wallTex=rtype==='lab'||rtype==='office'?'wall_metal':'wall_brick';
        drawTile(sx,sy,wallTex,rt.wallColor);
        // Тень на стене
        ctx.fillStyle='rgba(0,0,0,0.3)';
        ctx.fillRect(sx,sy,TILE,4);
        ctx.fillRect(sx,sy,4,TILE);
      } else if(cell===DOOR_CLOSED){
        ctx.fillStyle='#5a3a10';ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle='#EF9F27';ctx.lineWidth=2;ctx.strokeRect(sx,sy,TILE,TILE);
        ctx.fillStyle='#EF9F27';ctx.font='10px Arial';ctx.textAlign='center';
        ctx.fillText('🚪',sx+TILE/2,sy+TILE*0.75);
      } else if(cell===DOOR_OPEN){
        const floorTex=rtype==='office'?'floor_tile':rtype==='lab'?'floor_metal':'floor_concrete';
        drawTile(sx,sy,floorTex,rt.floorColor);
        ctx.fillStyle='rgba(29,158,117,0.15)';ctx.fillRect(sx,sy,TILE,TILE);
      } else if(cell===FLOOR){
        // Пол с текстурой по типу комнаты
        let floorTex='floor_concrete';
        if(rtype==='office')floorTex='floor_tile';
        else if(rtype==='lab')floorTex='floor_metal';
        else if(rtype==='storage')floorTex='floor_wood';
        else if(rtype==='armory')floorTex='floor_metal';
        drawTile(sx,sy,floorTex,rt.floorColor);
        // Детали пола
        if(!texturesLoaded){
          if((x+y)%6===0){ctx.fillStyle='rgba(255,255,255,0.02)';ctx.fillRect(sx,sy,TILE,TILE);}
          if(x%4===0&&y%4===0){ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(sx+TILE-2,sy,2,TILE);}
        }
      } else if(cell===PROP){
        // Пол под пропом
        let floorTex='floor_concrete';
        if(rtype==='office')floorTex='floor_tile';
        else if(rtype==='lab')floorTex='floor_metal';
        drawTile(sx,sy,floorTex,rt.floorColor);
        // Тень пропа
        ctx.fillStyle='rgba(0,0,0,0.4)';
        ctx.fillRect(sx+4,sy+4,TILE-2,TILE-2);
        // Проп
        const prop=props.find(p=>Math.floor(p.x)===x&&Math.floor(p.y)===y);
        if(prop)drawProp(sx,sy,prop.type);
      }
    }
  }

  // Название комнаты при входе
  const pRtype=getRoomTypeAt(Math.floor(playerX),Math.floor(playerY));
  const pRt=ROOM_TYPES[pRtype];
  if(pRt){
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fillRect(W/2-60,H/2+40,120,22);
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.font='11px Arial';ctx.textAlign='center';
    ctx.fillText(pRt.name,W/2,H/2+56);
  }

  // Точка эвакуации
  const EX=EXIT_X(),EY=EXIT_Y();
  if(fogMap[EY]&&fogMap[EY][EX]){
    const ex=(EX-camX)*TILE,ey=(EY-camY)*TILE;
    // Пульсирующий фон
    const pulse=Math.sin(Date.now()/400)*0.3+0.7;
    ctx.fillStyle=`rgba(10,74,37,${pulse})`;
    ctx.fillRect(ex-6,ey-6,TILE+12,TILE+12);
    ctx.strokeStyle='#00ff88';ctx.lineWidth=3;
    ctx.strokeRect(ex-6,ey-6,TILE+12,TILE+12);
    ctx.font='20px Arial';ctx.textAlign='center';
    ctx.fillText('🚁',ex+TILE/2,ey+TILE*0.75);
    ctx.fillStyle='#00ff88';ctx.font='bold 9px Arial';
    ctx.fillText('ВЫХОД',ex+TILE/2,ey+TILE+12);
  }

  // Ящики с лутом
  lootBoxes.forEach(box=>{
    const bx=(box.x-camX)*TILE+TILE/2,by=(box.y-camY)*TILE+TILE/2;
    if(bx<-TILE||bx>W+TILE||by<-TILE||by>H+TILE)return;
    if(!fogMap[Math.floor(box.y)]||!fogMap[Math.floor(box.y)][Math.floor(box.x)])return;
    if(!box.open){
      ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(bx-10,by-10+4,22,22);
      ctx.fillStyle='#6B4F12';ctx.fillRect(bx-11,by-11,22,22);
      ctx.strokeStyle=box.isBot?'#993C1D':'#EF9F27';ctx.lineWidth=2;
      ctx.strokeRect(bx-11,by-11,22,22);
      ctx.font='14px Arial';ctx.textAlign='center';
      ctx.fillText('📦',bx,by+5);
      // Мигание если рядом
      const d=Math.sqrt((box.x-playerX)**2+(box.y-playerY)**2);
      if(d<1.8){
        ctx.strokeStyle=`rgba(239,159,39,${Math.sin(Date.now()/200)*0.5+0.5})`;
        ctx.lineWidth=3;ctx.strokeRect(bx-12,by-12,24,24);
      }
    } else {
      ctx.fillStyle='rgba(50,30,5,0.6)';ctx.fillRect(bx-11,by-11,22,22);
      ctx.font='14px Arial';ctx.textAlign='center';
      ctx.fillText('📭',bx,by+5);
    }
  });

  // Боты
  bots.forEach(bot=>{
    if(bot.hp<=0)return;
    const bx=(bot.x-camX)*TILE,by=(bot.y-camY)*TILE;
    const vis=fogMap[Math.floor(bot.y)]&&fogMap[Math.floor(bot.y)][Math.floor(bot.x)];
    if(!vis&&!bot.alerted)return;
    if(bx<-60||bx>W+60||by<-60||by>H+60)return;
    const bt=BOT_TYPES[bot.type];
    // Тень
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();ctx.ellipse(bx,by+14,12,5,0,0,Math.PI*2);ctx.fill();
    // Тело
    ctx.beginPath();ctx.arc(bx,by,13,0,Math.PI*2);
    ctx.fillStyle=bt.color;ctx.fill();
    ctx.strokeStyle=bot.alerted?'#ff4444':'#cc2222';ctx.lineWidth=2;ctx.stroke();
    // Иконка
    ctx.font='13px Arial';ctx.textAlign='center';
    ctx.fillText(WEAPONS[bt.weapon]?.emoji||'👤',bx,by+5);
    // Индикатор тревоги
    if(bot.alerted){
      ctx.fillStyle='#ff4444';ctx.font='bold 10px Arial';
      ctx.fillText('!',bx,by-18);
    }
    // HP бар
    const hp=bot.hp/bot.maxHp;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(bx-14,by-22,28,5);
    ctx.fillStyle=hp>0.5?'#1D9E75':hp>0.25?'#EF9F27':'#cc3333';
    ctx.fillRect(bx-14,by-22,28*hp,5);
    // Направление взгляда
    ctx.beginPath();ctx.moveTo(bx,by);
    ctx.lineTo(bx+Math.cos(bot.angle)*18,by+Math.sin(bot.angle)*18);
    ctx.strokeStyle='rgba(200,100,100,0.5)';ctx.lineWidth=1.5;ctx.stroke();
  });

  // Игрок
  const px=(playerX-camX)*TILE,py=(playerY-camY)*TILE;
  // Тень
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(px,py+16,14,6,0,0,Math.PI*2);ctx.fill();
  // Тело
  ctx.beginPath();ctx.arc(px,py,15,0,Math.PI*2);
  ctx.fillStyle='#3a3a7a';ctx.fill();
  ctx.strokeStyle='#7F77DD';ctx.lineWidth=2.5;ctx.stroke();
  ctx.font='17px Arial';ctx.textAlign='center';
  ctx.fillText('🧑',px,py+6);
  // Луч прицела
  const rl=Math.min((currentWeapon?.range||2)*TILE*0.35,60);
  const ex2=px+Math.cos(playerAngle)*rl,ey2=py+Math.sin(playerAngle)*rl;
  ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(ex2,ey2);
  ctx.strokeStyle='rgba(255,255,80,0.6)';ctx.lineWidth=1.5;ctx.stroke();
  // Точка прицела
  ctx.beginPath();ctx.arc(ex2,ey2,3,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,80,0.8)';ctx.fill();
  // HP бар игрока
  const hpp=playerHP/100;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px-40,py-32,80,7);
  ctx.fillStyle=hpp>0.5?'#1D9E75':hpp>0.25?'#EF9F27':'#cc3333';
  ctx.fillRect(px-40,py-32,80*hpp,7);
  if(playerArmor>0){
    const ap=playerArmor/playerMaxArmor;
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px-40,py-24,80,5);
    ctx.fillStyle='#4fc3f7';ctx.fillRect(px-40,py-24,80*ap,5);
  }

  renderMinimap(W,H);
}

function renderMinimap(W,H){
  const mw=110,mh=80,mx=10,my=50,scaleX=mw/COLS,scaleY=mh/ROWS;
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(mx-2,my-2,mw+4,mh+4);
  ctx.strokeStyle='#2a2a4a';ctx.lineWidth=1;ctx.strokeRect(mx-2,my-2,mw+4,mh+4);
  for(let y=0;y<ROWS;y+=2){
    for(let x=0;x<COLS;x+=2){
      if(!fogMap[y]||!fogMap[y][x])continue;
      const cell=MAP_DATA[y][x];
      if(cell===WALL)continue;
      const rtype=getRoomTypeAt(x,y);
      const rt=ROOM_TYPES[rtype]||ROOM_TYPES.warehouse;
      if(cell===DOOR_CLOSED)ctx.fillStyle='#8B6914';
      else if(cell===DOOR_OPEN)ctx.fillStyle='#1a4a1a';
      else if(cell===PROP)ctx.fillStyle='#4a3a2a';
      else ctx.fillStyle=rt.floorColor;
      ctx.fillRect(mx+x*scaleX,my+y*scaleY,scaleX*2+1,scaleY*2+1);
    }
  }
  // Боты на карте
  bots.forEach(bot=>{
    if(bot.hp<=0||!discoveredBots.has(bot.id))return;
    const bx=mx+bot.x*scaleX,by=my+bot.y*scaleY;
    ctx.fillStyle='#ff4444';
    ctx.beginPath();ctx.moveTo(bx,by-3);ctx.lineTo(bx+2,by+2);ctx.lineTo(bx-2,by+2);
    ctx.closePath();ctx.fill();
  });
  // Игрок
  const ppx=mx+playerX*scaleX,ppy=my+playerY*scaleY;
  ctx.fillStyle='#7F77DD';ctx.beginPath();ctx.arc(ppx,ppy,3,0,Math.PI*2);ctx.fill();
  // Направление игрока
  ctx.beginPath();ctx.moveTo(ppx,ppy);
  ctx.lineTo(ppx+Math.cos(playerAngle)*6,ppy+Math.sin(playerAngle)*6);
  ctx.strokeStyle='#a78bfa';ctx.lineWidth=1.5;ctx.stroke();
  // Выход
  const epx=mx+EXIT_X()*scaleX,epy=my+EXIT_Y()*scaleY;
  const pulse=Math.sin(Date.now()/400)*0.5+0.5;
  ctx.fillStyle=`rgba(0,255,136,${pulse})`;
  ctx.beginPath();ctx.arc(epx,epy,4,0,Math.PI*2);ctx.fill();
  // Легенда
  ctx.fillStyle='#888';ctx.font='8px Arial';ctx.textAlign='left';
  ctx.fillText('Карта',mx,my-4);
}

function openBox(box){
  box.open=true;
  const items=box.items||[];
  let msg='';
  items.forEach(item=>{
    if(item.category==='weapon'){
      const wpData=WEAPONS[item.weaponType];
      if(!wpData)return;
      if(!currentWeapon){
        currentWeapon=wpData;
        ammo=item.weaponType==='pistol'?30:item.weaponType==='rifle'?20:item.weaponType==='shotgun'?10:item.weaponType==='smg'?40:8;
        updateWeaponUI();msg+='🔫 Оружие: '+wpData.name+'\n';
      } else if(raidLoot.length<bagSize){
        raidLoot.push(item);
        document.getElementById('bag-display').textContent=raidLoot.length+'/'+bagSize;
        msg+='🎒 В рюкзак: '+item.name+'\n';
      } else msg+='❌ Рюкзак полон!\n';
      return;
    }
    if(item.category==='ammo'&&currentWeapon&&item.ammoType===currentWeapon.ammoType){
      ammo+=item.count||10;updateWeaponUI();msg+='🔴 Патроны: +'+item.count+'\n';return;
    }
    if(item.category==='medical'){
      if(item.healAmount===70){medkitCount+=item.count||1;msg+='💊 Аптечка x'+(item.count||1)+'\n';}
      else{bandageCount+=item.count||3;msg+='🩹 Бинты x'+(item.count||3)+'\n';}
      updateHealthUI();return;
    }
    if(item.category==='armor'){
      if(item.armorAmount>playerMaxArmor){
        playerArmor=item.armorAmount;playerMaxArmor=item.armorAmount;
        updateHealthUI();msg+='🛡️ Броня: '+item.name+'\n';
      } else if(raidLoot.length<bagSize){
        raidLoot.push(item);
        document.getElementById('bag-display').textContent=raidLoot.length+'/'+bagSize;
        msg+='🎒 В рюкзак: '+item.name+'\n';
      }
      return;
    }
    if(item.category==='bag'){
      if((item.bagSlots||10)>bagSize){
        bagSize=item.bagSlots||10;
        document.getElementById('bag-display').textContent=raidLoot.length+'/'+bagSize;
        msg+='🎒 Рюкзак: '+item.bagSlots+' слотов!\n';
      }
      return;
    }
    if(raidLoot.length<bagSize){
      raidLoot.push(item);
      document.getElementById('bag-display').textContent=raidLoot.length+'/'+bagSize;
      msg+=item.emoji+' '+item.name+'\n';
    } else msg+='❌ Рюкзак полон!\n';
  });
  if(msg)alert(msg.trim());
}

function finishRaid(){
  gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);
  document.getElementById('loot-game').style.display='none';
  document.getElementById('loot-results').style.display='block';
  const list=document.getElementById('loot-found-list');
  if(!raidLoot.length){
    list.innerHTML='<div style="color:#888;text-align:center;padding:20px">Ничего не нашли</div>';
    // Сохраняем пустой рейд в историю
    if(typeof sb!=='undefined'&&currentUser){
      sb.from('raid_history').insert({user_id:currentUser.user_id,total_value:0,items_count:0});
    }
    return;
  }
  const total=raidLoot.reduce((a,b)=>a+(b.value||0),0);
  const RC2={common:'#888',rare:'#378ADD',vr:'#1D9E75',epic:'#a78bfa',legendary:'#EF9F27'};
  const RN2={common:'Обычный',rare:'Редкий',vr:'Очень редкий',epic:'Эпический',legendary:'Легендарный'};
  list.innerHTML=`
    <div style="font-size:13px;color:#888;margin-bottom:10px;text-align:center">
      Итого: ~${total.toLocaleString('ru')} 💜 · ${raidLoot.length} предметов
    </div>`+
    raidLoot.map(it=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2a4a">
        <span style="font-size:22px">${it.emoji}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${it.name}</div>
          <div style="font-size:11px;color:${RC2[it.rarity]||'#888'}">${RN2[it.rarity]||it.rarity}</div>
        </div>
        <div style="font-size:13px;color:#a78bfa;font-weight:700">~${it.value} 💜</div>
      </div>`).join('');
  // Сохраняем в историю рейдов
  if(typeof sb!=='undefined'&&currentUser){
    sb.from('raid_history').insert({user_id:currentUser.user_id,total_value:total,items_count:raidLoot.length});
  }
}

function exitRaid(died=false){
  gameRunning=false;if(animFrame)cancelAnimationFrame(animFrame);
  document.getElementById('loot-game').style.display='none';
  if(died){
    raidLoot=[];currentWeapon=null;ammo=0;medkitCount=0;bandageCount=0;
    document.getElementById('loot-results').style.display='none';
    document.getElementById('loot-menu').style.display='block';
    alert('Ты погиб 💀\nВесь лут потерян');return;
  }
  finishRaid();
}

function confirmExitRaid(){
  if(confirm('Бросить рейд?\n⚠️ Весь лут будет потерян!\nДля сохранения найди точку эвакуации 🚁'))
    exitRaid(true);
}

async function saveLootAndExit(){
  if(!raidLoot.length){
    document.getElementById('loot-results').style.display='none';
    document.getElementById('loot-menu').style.display='block';
    return;
  }
  for(const item of raidLoot){
    if(item.category==='seed'){
      const pn=item.name.replace('Семя ','');
      const {data:plant}=await sb.from('plants').select('*').ilike('name',pn).single();
      if(plant){
        const {data:ex}=await sb.from('seeds').select('*').eq('user_id',currentUser.user_id).eq('plant_id',plant.id).single();
        if(ex)await sb.from('seeds').update({quantity:ex.quantity+1}).eq('id',ex.id);
        else await sb.from('seeds').insert({user_id:currentUser.user_id,plant_id:plant.id,quantity:1});
      } else {
        await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:item.name,item_type:item.emoji,rarity:item.rarity,base_price:item.value||50,is_equipped:false,quantity:1});
      }
    } else {
      const {data:ex}=await sb.from('inventory').select('*').eq('user_id',currentUser.user_id).eq('item_name',item.name).eq('is_equipped',false).single();
      if(ex)await sb.from('inventory').update({quantity:(ex.quantity||1)+1}).eq('id',ex.id);
      else await sb.from('inventory').insert({user_id:currentUser.user_id,item_name:item.name,item_type:item.emoji,rarity:item.rarity,base_price:item.value||50,is_equipped:false,quantity:1});
    }
  }
  raidLoot=[];
  alert('Лут сохранён! 🎉');
  document.getElementById('loot-results').style.display='none';
  document.getElementById('loot-menu').style.display='block';
}

function showRaidBag(){
  if(!raidLoot.length){alert('Рюкзак пуст!');return;}
  const RC2={common:'#888',rare:'#378ADD',vr:'#1D9E75',epic:'#a78bfa',legendary:'#EF9F27'};
  if(typeof showModal==='function'){
    showModal('🎒 Рюкзак ('+raidLoot.length+'/'+bagSize+')',
      raidLoot.map((it,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2a4a">
          <span style="font-size:22px">${it.emoji}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${it.name}</div>
            <div style="font-size:12px;color:${RC2[it.rarity]||'#888'}">~${it.value} 💜</div>
          </div>
          <button onclick="dropLootItem(${i})" style="padding:4px 8px;background:none;border:1px solid #993C1D;border-radius:8px;color:#993C1D;font-size:11px;cursor:pointer;font-family:Arial,sans-serif">Выбросить</button>
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
  flash.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.28);z-index:999;pointer-events:none';
  document.body.appendChild(flash);setTimeout(()=>flash.remove(),160);
}

function setupJoysticks(){
  const jl=document.getElementById('joystick-left'),jld=document.getElementById('js-left-dot');
  const jr=document.getElementById('joystick-right'),jrd=document.getElementById('js-right-dot');
  if(!jl||!jr)return;
  let leftId=null,rightId=null,leftCX=0,leftCY=0,rightCX=0,rightCY=0;
  function calcJoy(cx,cy,tx,ty,dot,maxR=65){
    const dx=tx-cx,dy=ty-cy,len=Math.sqrt(dx*dx+dy*dy),clamp=Math.min(len,maxR);
    const nx=len>0?dx/len:0,ny=len>0?dy/len:0;
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
      if(t.identifier===leftId){
        const r=calcJoy(leftCX,leftCY,t.clientX,t.clientY,jld);
        jsLeftActive=r.active;jsLeftX=r.x;jsLeftY=r.y;
      }
      if(t.identifier===rightId){
        const r=calcJoy(rightCX,rightCY,t.clientX,t.clientY,jrd);
        jsRightActive=r.active;jsRightX=r.x;jsRightY=r.y;
      }
    });
  },{passive:false});
  document.addEventListener('touchend',e=>{
    Array.from(e.changedTouches).forEach(t=>{
      if(t.identifier===leftId){
        leftId=null;jsLeftActive=false;jsLeftX=0;jsLeftY=0;
        jld.style.transform='translate(-50%,-50%)';
      }
      if(t.identifier===rightId){
        rightId=null;jsRightActive=false;jsRightX=0;jsRightY=0;
        jrd.style.transform='translate(-50%,-50%)';
      }
    });
  });
}
