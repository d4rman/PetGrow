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
