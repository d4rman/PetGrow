const ROULETTE_NUMBERS=[
  {n:0,color:'green'},{n:32,color:'red'},{n:15,color:'black'},{n:19,color:'red'},
  {n:4,color:'black'},{n:21,color:'red'},{n:2,color:'black'},{n:25,color:'red'},
  {n:17,color:'black'},{n:34,color:'red'},{n:6,color:'black'},{n:27,color:'red'},
  {n:13,color:'black'},{n:36,color:'red'},{n:11,color:'black'},{n:30,color:'red'},
  {n:8,color:'black'},{n:23,color:'red'},{n:10,color:'black'},{n:5,color:'red'},
  {n:24,color:'black'},{n:16,color:'red'},{n:33,color:'black'},{n:1,color:'red'},
  {n:20,color:'black'},{n:14,color:'red'},{n:31,color:'black'},{n:9,color:'red'},
  {n:22,color:'black'},{n:18,color:'red'},{n:29,color:'black'},{n:7,color:'red'},
  {n:28,color:'black'},{n:12,color:'red'},{n:35,color:'black'},{n:3,color:'red'},
  {n:26,color:'black'},{n:0,color:'green'},
];

// Сетка стола — числа в правильном порядке
const TABLE_GRID=[
  [3,6,9,12,15,18,21,24,27,30,33,36],
  [2,5,8,11,14,17,20,23,26,29,32,35],
  [1,4,7,10,13,16,19,22,25,28,31,34],
];

const NUM_COLORS={
  0:'green',
  1:'red',2:'black',3:'red',4:'black',5:'red',6:'black',7:'red',8:'black',9:'red',10:'black',
  11:'black',12:'red',13:'black',14:'red',15:'black',16:'red',17:'black',18:'red',19:'red',20:'black',
  21:'red',22:'black',23:'red',24:'black',25:'red',26:'black',27:'red',28:'black',29:'black',30:'red',
  31:'black',32:'red',33:'black',34:'red',35:'black',36:'red',
};

let rouletteBets={},selectedChip=100,rouletteSpinning=false;
let rouletteModal=null;

function getChipColor(amount){
  if(amount>=10000)return'#EF9F27';
  if(amount>=5000)return'#a78bfa';
  if(amount>=1000)return'#378ADD';
  if(amount>=500)return'#1D9E75';
  return'#cc3333';
}

function getTotalBet(){
  return Object.values(rouletteBets).reduce((a,b)=>a+b,0);
}

function openRoulette(){
  // Открываем полноэкранный модал рулетки
  let overlay=document.getElementById('roulette-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='roulette-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0f1a;z-index:500;overflow-y:auto;font-family:Arial,sans-serif';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML=getRouletteHTML();
  overlay.style.display='block';
}

function closeRoulette(){
  const overlay=document.getElementById('roulette-overlay');
  if(overlay)overlay.style.display='none';
  rouletteBets={};
}

function getRouletteHTML(){
  const total=getTotalBet();
  return `
  <div style="background:#0a0f1a;min-height:100%;padding:12px;padding-bottom:100px">
    <!-- Шапка -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button onclick="closeRoulette()" style="background:none;border:1px solid #2a2a4a;border-radius:8px;color:#888;padding:6px 12px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">← Выйти</button>
      <div style="font-size:15px;font-weight:700;color:#EF9F27">🎰 Рулетка</div>
      <div style="font-size:13px;color:#a78bfa;font-weight:700">${bal.toLocaleString('ru')} 💜</div>
    </div>

    <!-- Лента анимации -->
    <div style="position:relative;overflow:hidden;height:72px;border-radius:12px;border:2px solid #7F77DD;background:#0f0f1e;margin-bottom:12px" id="wheel-container">
      <div id="wheel-strip" style="display:flex;position:absolute;top:50%;transform:translateY(-50%);left:0;gap:4px;padding:0 4px"></div>
      <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:3px;height:100%;background:#EF9F27;z-index:10;pointer-events:none"></div>
      <div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #EF9F27;margin-left:-8px;z-index:11"></div>
      <div id="wheel-result" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:900;color:#EF9F27;display:none;z-index:12;text-shadow:0 0 20px rgba(239,159,39,0.8)"></div>
    </div>

    <!-- Фишки -->
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:#888;margin-bottom:6px;text-align:center">Номинал фишки:</div>
      <div style="display:flex;gap:6px;justify-content:center">
        ${[100,500,1000,5000,10000].map(v=>`
          <div onclick="selectChipAmount(${v},this)" style="width:44px;height:44px;border-radius:50%;background:${getChipColor(v)};border:3px solid ${selectedChip===v?'#fff':'rgba(255,255,255,0.3)'};display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;font-weight:700;color:#fff;text-align:center;flex-shrink:0">
            ${v>=1000?v/1000+'k':v}
          </div>`).join('')}
      </div>
    </div>

    <!-- Стол рулетки -->
    <div style="background:#0d2a0d;border-radius:12px;border:2px solid #1D9E75;padding:8px;margin-bottom:10px;overflow-x:auto">

      <!-- Зеро -->
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <div onclick="placeBetOnNumber(0)" style="flex:0 0 calc(100%);height:36px;background:${rouletteBets['n0']?'rgba(29,158,117,0.6)':'#1a4a1a'};border:2px solid #1D9E75;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;font-weight:900;color:#1D9E75;position:relative">
          0
          ${rouletteBets['n0']?`<div style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:${getChipColor(rouletteBets['n0'])};border:2px solid #fff;font-size:8px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center">${rouletteBets['n0']>=1000?rouletteBets['n0']/1000+'k':rouletteBets['n0']}</div>`:''}
        </div>
      </div>

      <!-- Числа 1-36 в 3 ряда -->
      <div style="display:grid;grid-template-rows:repeat(3,1fr);gap:3px">
        ${TABLE_GRID.map((row,ri)=>`
          <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:3px">
            ${row.map(n=>{
              const col=NUM_COLORS[n];
              const betKey='n'+n;
              const hasBet=rouletteBets[betKey];
              return `<div onclick="placeBetOnNumber(${n})" style="height:34px;background:${hasBet?'rgba(127,119,221,0.5)':col==='red'?'#5a0000':'#1a1a1a'};border:1.5px solid ${col==='red'?'#cc2222':'#444'};border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;font-weight:700;color:#fff;position:relative;user-select:none">
              ${n}
              ${hasBet?`<div style="position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:${getChipColor(hasBet)};border:1.5px solid #fff;font-size:7px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center">${hasBet>=1000?hasBet/1000+'k':hasBet}</div>`:''}
            </div>`;
            }).join('')}
          </div>`).join('')}
      </div>

      <!-- 2 to 1 -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:4px">
        ${['2 to 1','2 to 1','2 to 1'].map((t,i)=>`
          <div onclick="placeBet('col'+(${i}+1))" style="height:28px;background:${rouletteBets['col'+(i+1)]?'rgba(239,159,39,0.3)':'rgba(255,255,255,0.05)'};border:1px solid #444;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:#888;position:relative">
            2:1${rouletteBets['col'+(i+1)]?`<div style="position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:${getChipColor(rouletteBets['col'+(i+1)])};border:1.5px solid #fff;font-size:7px;color:#fff;display:flex;align-items:center;justify-content:center">${rouletteBets['col'+(i+1)]>=1000?rouletteBets['col'+(i+1)]/1000+'k':rouletteBets['col'+(i+1)]}</div>`:''}
          </div>`).join('')}
      </div>
    </div>

    <!-- Внешние ставки -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">
      ${[
        {key:'dozen1',label:'1-12',payout:'x3'},
        {key:'dozen2',label:'13-24',payout:'x3'},
        {key:'dozen3',label:'25-36',payout:'x3'},
      ].map(b=>`
        <div onclick="placeBet('${b.key}')" style="padding:8px 4px;background:${rouletteBets[b.key]?'rgba(127,119,221,0.3)':'rgba(255,255,255,0.04)'};border:1.5px solid ${rouletteBets[b.key]?'#7F77DD':'#333'};border-radius:8px;text-align:center;cursor:pointer;position:relative">
          <div style="font-size:11px;color:#fff;font-weight:700">${b.label}</div>
          <div style="font-size:9px;color:#888">${b.payout}</div>
          ${rouletteBets[b.key]?`<div style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:${getChipColor(rouletteBets[b.key])};border:2px solid #fff;font-size:8px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center">${rouletteBets[b.key]>=1000?rouletteBets[b.key]/1000+'k':rouletteBets[b.key]}</div>`:''}
        </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
      ${[
        {key:'low',label:'1-18',payout:'x2'},
        {key:'even',label:'Чётное',payout:'x2'},
        {key:'red',label:'🔴 Красное',payout:'x2',bg:'#5a0000',border:'#cc2222'},
        {key:'black',label:'⚫ Чёрное',payout:'x2',bg:'#1a1a1a',border:'#555'},
        {key:'odd',label:'Нечётное',payout:'x2'},
        {key:'high',label:'19-36',payout:'x2'},
      ].map(b=>`
        <div onclick="placeBet('${b.key}')" style="padding:8px 4px;background:${rouletteBets[b.key]?'rgba(127,119,221,0.2)':b.bg||'rgba(255,255,255,0.04)'};border:1.5px solid ${rouletteBets[b.key]?'#7F77DD':b.border||'#333'};border-radius:8px;text-align:center;cursor:pointer;position:relative">
          <div style="font-size:11px;color:#fff;font-weight:700">${b.label}</div>
          <div style="font-size:9px;color:#888">${b.payout}</div>
          ${rouletteBets[b.key]?`<div style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:${getChipColor(rouletteBets[b.key])};border:2px solid #fff;font-size:8px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center">${rouletteBets[b.key]>=1000?rouletteBets[b.key]/1000+'k':rouletteBets[b.key]}</div>`:''}
        </div>`).join('')}
    </div>

    <!-- Итого и кнопки -->
    <div style="position:fixed;bottom:0;left:0;width:100%;background:rgba(10,15,26,0.97);border-top:1px solid #2a2a4a;padding:10px 12px;z-index:501">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;color:#888">Ставка: <span style="color:#EF9F27;font-weight:700">${total.toLocaleString('ru')} 💜</span></div>
        <button onclick="clearAllBets()" style="padding:4px 10px;background:none;border:1px solid #993C1D;border-radius:6px;color:#993C1D;font-size:11px;cursor:pointer;font-family:Arial,sans-serif">Сбросить</button>
      </div>
      ${total>0?`
        <button onclick="spinRouletteTable()" style="width:100%;padding:13px;background:linear-gradient(135deg,#7F77DD,#EF9F27);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          🎰 Крутить!
        </button>`:`
        <div style="text-align:center;color:#888;font-size:13px;padding:8px">Нажми на стол чтобы сделать ставку</div>
      `}
    </div>
  </div>`;
}
function selectChipAmount(amount,el){
  selectedChip=amount;
  const overlay=document.getElementById('roulette-overlay');
  if(overlay)overlay.innerHTML=getRouletteHTML();
}

function placeBetOnNumber(n){
  if(rouletteSpinning)return;
  const key='n'+n;
  const newTotal=getTotalBet()+selectedChip;
  if(newTotal>bal){alert('Недостаточно 💜');return;}
  rouletteBets[key]=(rouletteBets[key]||0)+selectedChip;
  refreshRouletteTable();
}

function placeBet(type){
  if(rouletteSpinning)return;
  const newTotal=getTotalBet()+selectedChip;
  if(newTotal>bal){alert('Недостаточно 💜');return;}
  rouletteBets[type]=(rouletteBets[type]||0)+selectedChip;
  refreshRouletteTable();
}

function clearAllBets(){
  rouletteBets={};
  refreshRouletteTable();
}

function refreshRouletteTable(){
  const overlay=document.getElementById('roulette-overlay');
  if(overlay)overlay.innerHTML=getRouletteHTML();
}

async function spinRouletteTable(){
  const total=getTotalBet();
  if(!total){alert('Сделай ставку!');return;}
  if(total>bal){alert('Недостаточно 💜');return;}
  if(rouletteSpinning)return;
  rouletteSpinning=true;
  await saveUser({balance:bal-total});

  // Выбираем результат
  const resultIdx=Math.floor(Math.random()*ROULETTE_NUMBERS.length);
  const result=ROULETTE_NUMBERS[resultIdx];

  // Блокируем кнопки
  const overlay=document.getElementById('roulette-overlay');
  if(overlay){
    const spinBtn=overlay.querySelector('button[onclick="spinRouletteTable()"]');
    if(spinBtn){spinBtn.disabled=true;spinBtn.textContent='🎰 Крутим...';}
  }

  // Запускаем анимацию ленты
  startWheelAnimation(result,total);
}

function startWheelAnimation(result,totalBet){
  const strip=document.getElementById('wheel-strip');
  const container=document.getElementById('wheel-container');
  if(!strip||!container)return;

  const CELL_W=60,GAP=4,STEP=CELL_W+GAP;
  const POOL_SIZE=80,WIN_IDX=60;

  // Строим ленту
  const pool=[];
  for(let i=0;i<POOL_SIZE;i++){
    const idx=Math.floor(Math.random()*ROULETTE_NUMBERS.length);
    pool.push(ROULETTE_NUMBERS[idx]);
  }
  pool[WIN_IDX]=result;

  strip.innerHTML='';
  strip.style.transition='none';
  strip.style.left='0px';

  pool.forEach(cell=>{
    const div=document.createElement('div');
    div.style.cssText=`
      width:${CELL_W}px;height:60px;border-radius:8px;
      background:${cell.color==='red'?'#5a0000':cell.color==='green'?'#1a4a1a':'#1a1a1a'};
      border:2px solid ${cell.color==='red'?'#cc2222':cell.color==='green'?'#1D9E75':'#444'};
      display:flex;align-items:center;justify-content:center;
      flex-direction:column;flex-shrink:0;
    `;
    div.innerHTML=`
      <div style="font-size:18px;font-weight:900;color:#fff">${cell.n}</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.5)">${cell.color==='red'?'🔴':cell.color==='green'?'🟢':'⚫'}</div>
    `;
    strip.appendChild(div);
  });

  const containerW=container.offsetWidth||300;
  const startLeft=containerW/2-CELL_W/2;
  strip.style.left=startLeft+'px';

  // Убираем старый результат
  const resultEl=document.getElementById('wheel-result');
  if(resultEl)resultEl.style.display='none';

  setTimeout(()=>{
    const finalLeft=startLeft-(WIN_IDX*STEP)+(Math.random()*10-5);
    strip.style.transition='left 5s cubic-bezier(0.17,0.67,0.05,0.99)';
    strip.style.left=finalLeft+'px';

    setTimeout(()=>{
      rouletteSpinning=false;
      finishRouletteRound(result,totalBet);
    },5200);
  },100);
}

function finishRouletteRound(result,totalBet){
  // Считаем выигрыш
  let won=0;
  const n=result.n;

  // Числа
  Object.entries(rouletteBets).forEach(([key,amount])=>{
    if(key.startsWith('n')){
      const num=parseInt(key.slice(1));
      if(num===n)won+=amount*36;
    }
  });

  // Внешние ставки
  if(rouletteBets.red&&result.color==='red')won+=rouletteBets.red*2;
  if(rouletteBets.black&&result.color==='black')won+=rouletteBets.black*2;
  if(rouletteBets.green&&result.color==='green')won+=rouletteBets.green*14;
  if(rouletteBets.even&&n>0&&n%2===0)won+=rouletteBets.even*2;
  if(rouletteBets.odd&&n>0&&n%2!==0)won+=rouletteBets.odd*2;
  if(rouletteBets.low&&n>=1&&n<=18)won+=rouletteBets.low*2;
  if(rouletteBets.high&&n>=19&&n<=36)won+=rouletteBets.high*2;
  if(rouletteBets.dozen1&&n>=1&&n<=12)won+=rouletteBets.dozen1*3;
  if(rouletteBets.dozen2&&n>=13&&n<=24)won+=rouletteBets.dozen2*3;
  if(rouletteBets.dozen3&&n>=25&&n<=36)won+=rouletteBets.dozen3*3;
  if(rouletteBets.col1&&[3,6,9,12,15,18,21,24,27,30,33,36].includes(n))won+=rouletteBets.col1*3;
  if(rouletteBets.col2&&[2,5,8,11,14,17,20,23,26,29,32,35].includes(n))won+=rouletteBets.col2*3;
  if(rouletteBets.col3&&[1,4,7,10,13,16,19,22,25,28,31,34].includes(n))won+=rouletteBets.col3*3;

  const profit=won-totalBet;
  const betsSnapshot={...rouletteBets};
  rouletteBets={};

  if(won>0)saveUser({balance:bal+won});

  // Показываем результат поверх стола
  showRouletteResultOverlay(result,won,profit,totalBet);
}

function showRouletteResultOverlay(result,won,profit,totalBet){
  let popup=document.getElementById('roulette-result-popup');
  if(!popup){
    popup=document.createElement('div');
    popup.id='roulette-result-popup';
    const overlay=document.getElementById('roulette-overlay');
    if(overlay)overlay.appendChild(popup);
  }
  const isWin=won>0;
  popup.style.cssText=`
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:#16213e;border:2px solid ${isWin?'#1D9E75':'#cc3333'};
    border-radius:20px;padding:24px;z-index:600;width:85%;max-width:320px;
    text-align:center;box-shadow:0 0 40px ${isWin?'rgba(29,158,117,0.4)':'rgba(204,51,51,0.4)'};
    font-family:Arial,sans-serif;
  `;
  popup.innerHTML=`
    <div style="width:80px;height:80px;border-radius:50%;
      background:${result.color==='red'?'#8B1A1A':result.color==='green'?'#1a4a2a':'#2a2a2a'};
      border:4px solid ${result.color==='red'?'#cc2222':result.color==='green'?'#1D9E75':'#666'};
      display:flex;align-items:center;justify-content:center;margin:0 auto 12px;
      box-shadow:0 0 20px ${result.color==='red'?'rgba(204,34,34,0.5)':result.color==='green'?'rgba(29,158,117,0.5)':'rgba(100,100,100,0.3)'}">
      <span style="font-size:28px;font-weight:900;color:#fff">${result.n}</span>
    </div>
    <div style="font-size:13px;color:#888;margin-bottom:12px">
      ${result.color==='red'?'🔴 Красное':result.color==='green'?'🟢 Зеро':'⚫ Чёрное'}
    </div>
    <div style="font-size:28px;margin-bottom:6px">${isWin?'🎉':'💀'}</div>
    <div style="font-size:17px;font-weight:700;color:${isWin?'#1D9E75':'#cc3333'};margin-bottom:14px">
      ${isWin?'Выигрыш!':'Не повезло...'}
    </div>
    <div style="background:#0f0f1e;border-radius:12px;padding:12px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #2a2a4a">
        <span style="color:#888">Ставка</span>
        <span style="color:#fff;font-weight:700">${totalBet.toLocaleString('ru')} 💜</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #2a2a4a">
        <span style="color:#888">Выигрыш</span>
        <span style="color:${won>0?'#1D9E75':'#888'};font-weight:700">${won.toLocaleString('ru')} 💜</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;padding:6px 0">
        <span style="color:#888">Итого</span>
        <span style="color:${profit>=0?'#1D9E75':'#cc3333'};font-weight:700">${profit>=0?'+':''}${profit.toLocaleString('ru')} 💜</span>
      </div>
    </div>
    <div style="display:grid;gap:8px">
      <button onclick="playAgainRoulette()" style="width:100%;padding:12px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
        🎰 Крутить снова
      </button>
      <button onclick="closeRoulette()" style="width:100%;padding:10px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">
        Выйти
      </button>
    </div>
  `;
}

function playAgainRoulette(){
  const popup=document.getElementById('roulette-result-popup');
  if(popup)popup.remove();
  refreshRouletteTable();
}
