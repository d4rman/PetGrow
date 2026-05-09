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
  {n:26,color:'black'},{n:00,color:'green'},
];

const ROULETTE_PAYOUTS={
  red:2,black:2,green:14,
  even:2,odd:2,
  low:2,high:2,
  dozen1:3,dozen2:3,dozen3:3,
};

let rouletteBets={},rouletteBetTotal=0,rouletteSpinning=false;

function openRoulette(){
  showModal('🎰 Рулетка',getRouletteBetHTML());
}

function getRouletteBetHTML(){
  const totalBet=Object.values(rouletteBets).reduce((a,b)=>a+b,0);
  return `
    <div style="text-align:center">
      <div style="font-size:12px;color:#888;margin-bottom:10px">Баланс: <span style="color:#a78bfa;font-weight:700">${bal.toLocaleString('ru')} 💜</span></div>

      <!-- Фишки -->
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:#888;margin-bottom:6px">Выбери номинал фишки:</div>
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap" id="chip-btns">
          ${[100,500,1000,5000,10000].map(v=>`
            <button onclick="selectChip(${v},this)" class="spin-count-btn" style="padding:5px 8px;font-size:11px;border-radius:50%;width:44px;height:44px">${v>=1000?v/1000+'k':v}</button>
          `).join('')}
        </div>
      </div>
      <div id="selected-chip-display" style="font-size:12px;color:#EF9F27;margin-bottom:10px">Фишка: не выбрана</div>

      <!-- Ставки на цвет/чётность -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px">
        <button onclick="placeBet('red')" style="padding:10px 6px;background:#cc2222;color:#fff;border:2px solid ${rouletteBets.red?'#fff':'transparent'};border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          🔴 Красное<br><span style="font-size:10px;opacity:0.8">x2${rouletteBets.red?'<br>'+rouletteBets.red+'💜':''}</span>
        </button>
        <button onclick="placeBet('green')" style="padding:10px 6px;background:#1D9E75;color:#fff;border:2px solid ${rouletteBets.green?'#fff':'transparent'};border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          🟢 Зеро<br><span style="font-size:10px;opacity:0.8">x14${rouletteBets.green?'<br>'+rouletteBets.green+'💜':''}</span>
        </button>
        <button onclick="placeBet('black')" style="padding:10px 6px;background:#222;color:#fff;border:2px solid ${rouletteBets.black?'#fff':'#444'};border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          ⚫ Чёрное<br><span style="font-size:10px;opacity:0.8">x2${rouletteBets.black?'<br>'+rouletteBets.black+'💜':''}</span>
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <button onclick="placeBet('even')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.even?'#7F77DD':'#2a2a4a'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          Чётное x2${rouletteBets.even?'<br><span style="color:#a78bfa">'+rouletteBets.even+'💜</span>':''}
        </button>
        <button onclick="placeBet('odd')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.odd?'#7F77DD':'#2a2a4a'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          Нечётное x2${rouletteBets.odd?'<br><span style="color:#a78bfa">'+rouletteBets.odd+'💜</span>':''}
        </button>
        <button onclick="placeBet('low')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.low?'#7F77DD':'#2a2a4a'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          1-18 x2${rouletteBets.low?'<br><span style="color:#a78bfa">'+rouletteBets.low+'💜</span>':''}
        </button>
        <button onclick="placeBet('high')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.high?'#7F77DD':'#2a2a4a'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          19-36 x2${rouletteBets.high?'<br><span style="color:#a78bfa">'+rouletteBets.high+'💜</span>':''}
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
        <button onclick="placeBet('dozen1')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.dozen1?'#EF9F27':'#2a2a4a'};border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          1-12 x3${rouletteBets.dozen1?'<br><span style="color:#EF9F27">'+rouletteBets.dozen1+'💜</span>':''}
        </button>
        <button onclick="placeBet('dozen2')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.dozen2?'#EF9F27':'#2a2a4a'};border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          13-24 x3${rouletteBets.dozen2?'<br><span style="color:#EF9F27">'+rouletteBets.dozen2+'💜</span>':''}
        </button>
        <button onclick="placeBet('dozen3')" style="padding:8px;background:#1a1a3a;color:#fff;border:2px solid ${rouletteBets.dozen3?'#EF9F27':'#2a2a4a'};border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          25-36 x3${rouletteBets.dozen3?'<br><span style="color:#EF9F27">'+rouletteBets.dozen3+'💜</span>':''}
        </button>
      </div>

      ${totalBet>0?`
        <div style="background:#0f0f1e;border-radius:10px;padding:8px;margin-bottom:10px;font-size:12px">
          Общая ставка: <span style="color:#EF9F27;font-weight:700">${totalBet.toLocaleString('ru')} 💜</span>
          <button onclick="clearRouletteBets()" style="margin-left:8px;padding:2px 8px;background:none;border:1px solid #993C1D;border-radius:6px;color:#993C1D;font-size:10px;cursor:pointer;font-family:Arial,sans-serif">Сбросить</button>
        </div>
        <button onclick="spinRoulette()" style="width:100%;padding:14px;background:linear-gradient(135deg,#7F77DD,#EF9F27);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          🎰 Крутить!
        </button>`:`
        <div style="color:#888;font-size:12px;padding:10px">Выбери ставку и нажми на категорию</div>
      `}
    </div>`;
}

let selectedChip=0;
function selectChip(amount,btn){
  selectedChip=amount;
  document.querySelectorAll('#chip-btns .spin-count-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const el=document.getElementById('selected-chip-display');
  if(el)el.textContent='Фишка: '+amount.toLocaleString('ru')+' 💜';
}

function placeBet(type){
  if(!selectedChip){alert('Сначала выбери номинал фишки!');return;}
  if((rouletteBets[type]||0)+selectedChip+Object.values(rouletteBets).reduce((a,b)=>a+b,0)-( rouletteBets[type]||0)>bal){
    alert('Недостаточно 💜');return;
  }
  rouletteBets[type]=(rouletteBets[type]||0)+selectedChip;
  document.getElementById('modal-content').innerHTML=getRouletteBetHTML();
}

function clearRouletteBets(){
  rouletteBets={};
  document.getElementById('modal-content').innerHTML=getRouletteBetHTML();
}

async function spinRoulette(){
  const totalBet=Object.values(rouletteBets).reduce((a,b)=>a+b,0);
  if(!totalBet){alert('Сделай ставку!');return;}
  if(totalBet>bal){alert('Недостаточно 💜');return;}
  if(rouletteSpinning)return;
  rouletteSpinning=true;
  await saveUser({balance:bal-totalBet});

  // Выбираем результат
  const resultIdx=Math.floor(Math.random()*ROULETTE_NUMBERS.length);
  const result=ROULETTE_NUMBERS[resultIdx];

  // Показываем анимацию
  document.getElementById('modal-content').innerHTML=getRouletteAnimHTML();
  runRouletteAnim(resultIdx,result,totalBet);
}

function getRouletteAnimHTML(){
  return `
    <div style="text-align:center">
      <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:12px">🎰 Крутим...</div>
      <div style="position:relative;overflow:hidden;height:80px;border-radius:12px;border:2px solid #7F77DD;background:#0f0f1e;margin-bottom:12px">
        <div id="roulette-strip" style="display:flex;position:absolute;top:50%;transform:translateY(-50%);left:0;transition:none;gap:4px;padding:0 4px"></div>
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:3px;height:100%;background:#EF9F27;z-index:10"></div>
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #EF9F27;margin-left:-8px"></div>
      </div>
      <div id="roulette-status" style="font-size:13px;color:#888">Шарик летит...</div>
    </div>`;
}

function runRouletteAnim(resultIdx,result,totalBet){
  const strip=document.getElementById('roulette-strip');
  if(!strip)return;

  const CELL_W=64,GAP=4,STEP=CELL_W+GAP;
  const POOL_SIZE=60;
  const WIN_IDX=45;

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
    div.style.cssText=`width:${CELL_W}px;height:64px;border-radius:10px;background:${cell.color==='red'?'#8B1A1A':cell.color==='green'?'#1a4a2a':'#1a1a1a'};border:2px solid ${cell.color==='red'?'#cc2222':cell.color==='green'?'#1D9E75':'#444'};display:flex;align-items:center;justify-content:center;flex-direction:column;flex-shrink:0`;
    div.innerHTML=`<div style="font-size:20px;font-weight:900;color:#fff">${cell.n}</div><div style="font-size:10px;color:rgba(255,255,255,0.6)">${cell.color==='red'?'🔴':cell.color==='green'?'🟢':'⚫'}</div>`;
    strip.appendChild(div);
  });

  // Центрируем полосу
  const containerW=document.querySelector('#roulette-strip')?.parentElement?.offsetWidth||300;
  const startLeft=containerW/2-CELL_W/2;
  strip.style.left=startLeft+'px';

  setTimeout(()=>{
    const finalLeft=startLeft-(WIN_IDX*STEP)+(Math.random()*20-10);
    strip.style.transition='left 4s cubic-bezier(0.17,0.67,0.05,0.99)';
    strip.style.left=finalLeft+'px';

    setTimeout(async()=>{
      rouletteSpinning=false;
      // Считаем выигрыш
      let won=0;
      const n=result.n;
      const bets=rouletteBets;

      if(bets.red&&result.color==='red')won+=bets.red*2;
      if(bets.black&&result.color==='black')won+=bets.black*2;
      if(bets.green&&result.color==='green')won+=bets.green*14;
      if(bets.even&&n>0&&n%2===0)won+=bets.even*2;
      if(bets.odd&&n>0&&n%2!==0)won+=bets.odd*2;
      if(bets.low&&n>=1&&n<=18)won+=bets.low*2;
      if(bets.high&&n>=19&&n<=36)won+=bets.high*2;
      if(bets.dozen1&&n>=1&&n<=12)won+=bets.dozen1*3;
      if(bets.dozen2&&n>=13&&n<=24)won+=bets.dozen2*3;
      if(bets.dozen3&&n>=25&&n<=36)won+=bets.dozen3*3;

      if(won>0)await saveUser({balance:bal+won});

      const profit=won-totalBet;
      const betsSnapshot={...rouletteBets};
      rouletteBets={};

      showRouletteResult(result,won,profit,totalBet,betsSnapshot);
    },4200);
  },100);
}

function showRouletteResult(result,won,profit,totalBet,bets){
  const isWin=won>0;
  document.getElementById('modal-content').innerHTML=`
    <div style="text-align:center">
      <div style="width:80px;height:80px;border-radius:50%;background:${result.color==='red'?'#8B1A1A':result.color==='green'?'#1a4a2a':'#1a1a1a'};border:4px solid ${result.color==='red'?'#cc2222':result.color==='green'?'#1D9E75':'#555'};display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <span style="font-size:28px;font-weight:900;color:#fff">${result.n}</span>
      </div>
      <div style="font-size:13px;color:#888;margin-bottom:12px">${result.color==='red'?'🔴 Красное':result.color==='green'?'🟢 Зеро':'⚫ Чёрное'}</div>

      <div style="background:#0f0f1e;border-radius:12px;padding:12px;margin-bottom:14px">
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

      <div style="font-size:28px;margin-bottom:8px">${isWin?'🎉':'💀'}</div>
      <div style="font-size:16px;font-weight:700;color:${isWin?'#1D9E75':'#cc3333'};margin-bottom:14px">${isWin?'Повезло!':'Не в этот раз...'}</div>

      <button onclick="openRoulette()" style="width:100%;padding:12px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;margin-bottom:8px">
        🎰 Крутить снова
      </button>
      <button onclick="closeModal()" style="width:100%;padding:10px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">
        Выйти
      </button>
    </div>`;
}
