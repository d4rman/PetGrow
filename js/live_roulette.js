let liveRound=null,liveTimer=null,liveBets={},liveHistory=[],livePolling=null;
let liveSpinning=false,liveSelectedChip=100;

const LR_NUM_COLORS={
  0:'green',1:'red',2:'black',3:'red',4:'black',5:'red',6:'black',7:'red',
  8:'black',9:'red',10:'black',11:'black',12:'red',13:'black',14:'red',
  15:'black',16:'red',17:'black',18:'red',19:'red',20:'black',21:'red',
  22:'black',23:'red',24:'black',25:'red',26:'black',27:'red',28:'black',
  29:'black',30:'red',31:'black',32:'red',33:'black',34:'red',35:'black',36:'red',
};

const LR_TABLE_GRID=[
  [3,6,9,12,15,18,21,24,27,30,33,36],
  [2,5,8,11,14,17,20,23,26,29,32,35],
  [1,4,7,10,13,16,19,22,25,28,31,34],
];

function lrChipColor(amount){
  if(amount>=10000)return'#EF9F27';
  if(amount>=5000)return'#a78bfa';
  if(amount>=1000)return'#378ADD';
  if(amount>=500)return'#1D9E75';
  return'#cc3333';
}

function lrNumColor(n){return LR_NUM_COLORS[n]||'black';}

async function openLiveRoulette(){
  let overlay=document.getElementById('live-roulette-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='live-roulette-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#080d14;z-index:500;overflow-y:auto;font-family:Arial,sans-serif';
    document.body.appendChild(overlay);
  }
  overlay.style.display='block';
  liveBets={};
  await lrLoadHistory();
  await lrSyncRound();
  lrRender();
  lrStartPolling();
}

function closeLiveRoulette(){
  const overlay=document.getElementById('live-roulette-overlay');
  if(overlay)overlay.style.display='none';
  lrStopPolling();
  if(liveTimer)clearInterval(liveTimer);
}

function lrStopPolling(){
  if(livePolling)clearInterval(livePolling);
  livePolling=null;
}

function lrStartPolling(){
  lrStopPolling();
  livePolling=setInterval(async()=>{
    await lrSyncRound();
    lrRender();
  },3000);
}

async function lrLoadHistory(){
  const {data}=await sb.from('live_roulette')
    .select('*')
    .not('spin_result','is',null)
    .order('created_at',{ascending:false})
    .limit(20);
  liveHistory=data||[];
}

async function lrSyncRound(){
  // Берём текущий активный раунд
  const {data:rounds}=await sb.from('live_roulette')
    .select('*')
    .in('status',['betting','spinning'])
    .order('created_at',{ascending:false})
    .limit(1);

  if(!rounds||!rounds.length){
    // Нет активного раунда — создаём
    await lrCreateRound();
    return;
  }

  const round=rounds[0];
  const now=new Date();
  const endsAt=new Date(round.betting_ends_at);

  if(round.status==='betting'&&now>=endsAt){
    // Время ставок вышло — крутим
    await lrDoSpin(round);
    return;
  }

  if(round.status==='spinning'){
    const spinAt=new Date(round.spin_at);
    if(now-spinAt>8000){
      // Раунд завершён — создаём новый
      await lrCreateRound();
      await lrLoadHistory();
      return;
    }
  }

  liveRound=round;
}

async function lrCreateRound(){
  const now=new Date();
  const endsAt=new Date(now.getTime()+30000);
  const {data}=await sb.from('live_roulette').insert({
    status:'betting',
    betting_ends_at:endsAt.toISOString(),
  }).select().single();
  liveRound=data;
  liveBets={};
}

async function lrDoSpin(round){
  const n=Math.floor(Math.random()*37);
  const color=LR_NUM_COLORS[n]||'black';
  await sb.from('live_roulette').update({
    status:'spinning',
    spin_result:n,
    spin_color:color,
    spin_at:new Date().toISOString(),
  }).eq('id',round.id);
  liveRound={...round,status:'spinning',spin_result:n,spin_color:color};

  // Считаем выигрыши для всех игроков
  await lrCalculateWinnings(round.id,n,color);
}

async function lrCalculateWinnings(roundId,n,color){
  const {data:bets}=await sb.from('live_roulette_bets')
    .select('*').eq('round_id',roundId);
  if(!bets||!bets.length)return;

  for(const bet of bets){
    let won=0;
    const t=bet.bet_type,a=bet.amount;
    if(t.startsWith('n')&&parseInt(t.slice(1))===n)won=a*36;
    if(t==='red'&&color==='red')won=a*2;
    if(t==='black'&&color==='black')won=a*2;
    if(t==='green'&&color==='green')won=a*14;
    if(t==='even'&&n>0&&n%2===0)won=a*2;
    if(t==='odd'&&n>0&&n%2!==0)won=a*2;
    if(t==='low'&&n>=1&&n<=18)won=a*2;
    if(t==='high'&&n>=19&&n<=36)won=a*2;
    if(t==='dozen1'&&n>=1&&n<=12)won=a*3;
    if(t==='dozen2'&&n>=13&&n<=24)won=a*3;
    if(t==='dozen3'&&n>=25&&n<=36)won=a*3;
    if(t==='col1'&&[3,6,9,12,15,18,21,24,27,30,33,36].includes(n))won=a*3;
    if(t==='col2'&&[2,5,8,11,14,17,20,23,26,29,32,35].includes(n))won=a*3;
    if(t==='col3'&&[1,4,7,10,13,16,19,22,25,28,31,34].includes(n))won=a*3;

    if(won>0){
      await sb.from('live_roulette_bets').update({won}).eq('id',bet.id);
      const {data:u}=await sb.from('users').select('balance,total_won').eq('user_id',bet.user_id).single();
      if(u)await sb.from('users').update({
        balance:u.balance+won,
        total_won:(u.total_won||0)+won
      }).eq('user_id',bet.user_id);
    }
  }
}
async function lrPlaceBet(type){
  if(!liveRound||liveRound.status!=='betting'){alert('Ставки закрыты!');return;}
  if(!liveSelectedChip){alert('Выбери фишку!');return;}
  const now=new Date(),endsAt=new Date(liveRound.betting_ends_at);
  if(now>=endsAt){alert('Время ставок вышло!');return;}
  const newTotal=Object.values(liveBets).reduce((a,b)=>a+b,0)+liveSelectedChip;
  if(newTotal>bal){alert('Недостаточно 💜');return;}
  liveBets[type]=(liveBets[type]||0)+liveSelectedChip;
  await saveUser({
    balance:bal-liveSelectedChip,
    total_lost:(currentUser.total_lost||0)+liveSelectedChip
  });
  await sb.from('live_roulette_bets').insert({
    round_id:liveRound.id,
    user_id:currentUser.user_id,
    username:currentUser.username,
    bet_type:type,
    amount:liveSelectedChip,
  });
  lrRender();
}

async function lrPlaceBetNumber(n){
  await lrPlaceBet('n'+n);
}

function lrGetTimeLeft(){
  if(!liveRound)return 0;
  if(liveRound.status!=='betting')return 0;
  const now=new Date(),endsAt=new Date(liveRound.betting_ends_at);
  return Math.max(0,Math.ceil((endsAt-now)/1000));
}

function lrGetTimerColor(sec){
  if(sec>15)return'#1D9E75';
  if(sec>7)return'#EF9F27';
  return'#cc3333';
}

function lrRender(){
  const overlay=document.getElementById('live-roulette-overlay');
  if(!overlay||overlay.style.display==='none')return;
  const timeLeft=lrGetTimeLeft();
  const isBetting=liveRound?.status==='betting';
  const isSpinning=liveRound?.status==='spinning';
  const myTotalBet=Object.values(liveBets).reduce((a,b)=>a+b,0);

  overlay.innerHTML=`
  <div style="background:#080d14;min-height:100%;padding:12px;padding-bottom:120px">

    <!-- Шапка -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <button onclick="closeLiveRoulette()" style="background:none;border:1px solid #2a2a4a;border-radius:8px;color:#888;padding:6px 12px;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">← Выйти</button>
      <div style="text-align:center">
        <div style="font-size:14px;font-weight:700;color:#EF9F27">🎰 Live Рулетка</div>
        <div style="font-size:10px;color:#888">Общий стол</div>
      </div>
      <div style="font-size:13px;color:#a78bfa;font-weight:700">${bal.toLocaleString('ru')} 💜</div>
    </div>

    <!-- Таймер -->
    <div style="background:#0f0f1e;border-radius:12px;padding:12px;margin-bottom:10px;text-align:center;border:1px solid #2a2a4a">
      ${isBetting?`
        <div style="font-size:12px;color:#888;margin-bottom:4px">Время на ставки:</div>
        <div style="font-size:36px;font-weight:900;color:${lrGetTimerColor(timeLeft)};line-height:1">${timeLeft}</div>
        <div style="height:6px;background:#2a2a4a;border-radius:6px;margin-top:8px;overflow:hidden">
          <div style="height:6px;background:${lrGetTimerColor(timeLeft)};border-radius:6px;width:${Math.min(100,timeLeft/30*100)}%;transition:width 1s"></div>
        </div>
      `:isSpinning?`
        <div style="font-size:14px;color:#EF9F27;font-weight:700;margin-bottom:8px">🎰 Крутим колесо...</div>
        <div style="font-size:36px">⏳</div>
      `:`
        <div style="font-size:14px;color:#888">Загрузка...</div>
      `}
    </div>

    <!-- Лента прокрута -->
    ${isSpinning?`
    <div style="position:relative;overflow:hidden;height:72px;border-radius:12px;border:2px solid #EF9F27;background:#0f0f1e;margin-bottom:10px">
      <div id="lr-strip" style="display:flex;position:absolute;top:50%;transform:translateY(-50%);left:0;gap:4px;padding:0 4px"></div>
      <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:3px;height:100%;background:#EF9F27;z-index:10;pointer-events:none"></div>
      <div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #EF9F27;margin-left:-8px;z-index:11"></div>
    </div>`:''}

    <!-- История последних чисел -->
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:#888;margin-bottom:6px">Последние 20 чисел:</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${liveHistory.map(r=>`
          <div style="width:30px;height:30px;border-radius:50%;background:${r.spin_color==='red'?'#8B1A1A':r.spin_color==='green'?'#1a4a1a':'#1a1a1a'};border:2px solid ${r.spin_color==='red'?'#cc2222':r.spin_color==='green'?'#1D9E75':'#444'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">
            ${r.spin_result}
          </div>`).join('')}
        ${!liveHistory.length?'<div style="color:#888;font-size:12px">Нет истории</div>':''}
      </div>
    </div>

    <!-- Фишки -->
    <div style="margin-bottom:8px">
      <div style="font-size:11px;color:#888;margin-bottom:6px;text-align:center">Номинал фишки:</div>
      <div style="display:flex;gap:8px;justify-content:center">
        ${[100,500,1000,5000,10000].map(v=>`
          <div onclick="lrSelectChip(${v})" style="width:44px;height:44px;border-radius:50%;background:${lrChipColor(v)};border:3px solid ${liveSelectedChip===v?'#fff':'rgba(255,255,255,0.2)'};display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:${liveSelectedChip===v?'0 0 12px rgba(255,255,255,0.4)':'none'}">
            ${v>=1000?v/1000+'k':v}
          </div>`).join('')}
      </div>
    </div>

    <!-- Стол -->
    <div style="background:#0d2a0d;border-radius:12px;border:2px solid #1D9E75;padding:8px;margin-bottom:8px;${!isBetting?'opacity:0.5;pointer-events:none':''}">

      <!-- Зеро -->
      <div onclick="lrPlaceBetNumber(0)" style="height:34px;background:${liveBets['n0']?'rgba(29,158,117,0.5)':'#1a4a1a'};border:2px solid #1D9E75;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;font-weight:900;color:#1D9E75;margin-bottom:4px;position:relative">
        0
        ${liveBets['n0']?`<div style="position:absolute;top:-6px;right:4px;background:${lrChipColor(liveBets['n0'])};border-radius:10px;padding:1px 5px;font-size:9px;font-weight:700;color:#fff">${liveBets['n0'].toLocaleString('ru')}</div>`:''}
      </div>

      <!-- Числа -->
      <div style="display:grid;grid-template-rows:repeat(3,1fr);gap:3px;margin-bottom:4px">
        ${LR_TABLE_GRID.map(row=>`
          <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:3px">
            ${row.map(n=>{
              const col=lrNumColor(n);
              const key='n'+n;
              const hasBet=liveBets[key];
              return `<div onclick="lrPlaceBetNumber(${n})" style="height:32px;background:${hasBet?'rgba(127,119,221,0.6)':col==='red'?'#4a0000':'#141414'};border:1.5px solid ${col==='red'?'#993333':'#333'};border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;font-weight:700;color:#fff;position:relative;user-select:none">
                ${n}
                ${hasBet?`<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:${lrChipColor(hasBet)};border:1px solid #fff;font-size:6px;color:#fff;display:flex;align-items:center;justify-content:center">${hasBet>=1000?'k':'✓'}</div>`:''}
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>

      <!-- 2 to 1 -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:4px">
        ${[1,2,3].map(i=>`
          <div onclick="lrPlaceBet('col${i}')" style="height:24px;background:${liveBets['col'+i]?'rgba(239,159,39,0.3)':'rgba(255,255,255,0.04)'};border:1px solid #333;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:#888;position:relative">
            2:1${liveBets['col'+i]?`<div style="position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;background:${lrChipColor(liveBets['col'+i])};border:1px solid #fff"></div>`:''}
          </div>`).join('')}
      </div>

      <!-- Дюжины -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:4px">
        ${[{k:'dozen1',l:'1-12'},{k:'dozen2',l:'13-24'},{k:'dozen3',l:'25-36'}].map(b=>`
          <div onclick="lrPlaceBet('${b.k}')" style="height:26px;background:${liveBets[b.k]?'rgba(127,119,221,0.3)':'rgba(255,255,255,0.04)'};border:1px solid ${liveBets[b.k]?'#7F77DD':'#333'};border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;color:#888;position:relative">
            ${b.l} x3${liveBets[b.k]?`<div style="position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;background:${lrChipColor(liveBets[b.k])};border:1px solid #fff"></div>`:''}
          </div>`).join('')}
      </div>

      <!-- Внешние ставки -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px">
        ${[
          {k:'low',l:'1-18'},{k:'even',l:'Чёт'},{k:'red',l:'🔴',bg:'#4a0000',bc:'#993333'},
          {k:'black',l:'⚫',bg:'#141414',bc:'#444'},{k:'odd',l:'Нечет'},{k:'high',l:'19-36'},
        ].map(b=>`
          <div onclick="lrPlaceBet('${b.k}')" style="height:28px;background:${liveBets[b.k]?'rgba(127,119,221,0.2)':b.bg||'rgba(255,255,255,0.04)'};border:1.5px solid ${liveBets[b.k]?'#7F77DD':b.bc||'#333'};border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;color:#fff;font-weight:600;position:relative">
            ${b.l} x2${liveBets[b.k]?`<div style="position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;background:${lrChipColor(liveBets[b.k])};border:1px solid #fff"></div>`:''}
          </div>`).join('')}
      </div>
    </div>

    <!-- Мои ставки -->
    ${myTotalBet>0?`
    <div style="background:#0f0f1e;border-radius:10px;padding:10px;margin-bottom:8px;font-size:12px">
      <div style="color:#888;margin-bottom:4px">Мои ставки в этом раунде:</div>
      ${Object.entries(liveBets).map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;padding:2px 0;color:#fff">
          <span style="color:#a78bfa">${k.startsWith('n')?'Число '+k.slice(1):k}</span>
          <span style="color:#EF9F27;font-weight:700">${v.toLocaleString('ru')} 💜</span>
        </div>`).join('')}
      <div style="border-top:1px solid #2a2a4a;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-weight:700">
        <span style="color:#888">Итого</span>
        <span style="color:#EF9F27">${myTotalBet.toLocaleString('ru')} 💜</span>
      </div>
    </div>`:''}

  </div>

  <!-- Нижняя панель -->
  <div style="position:fixed;bottom:0;left:0;width:100%;background:rgba(8,13,20,0.97);border-top:1px solid #2a2a4a;padding:10px 12px;z-index:501;font-family:Arial,sans-serif">
    ${isBetting?`
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:#888">Ставка: <span style="color:#EF9F27;font-weight:700">${myTotalBet.toLocaleString('ru')} 💜</span></div>
        ${myTotalBet>0?`<button onclick="lrClearBets()" style="padding:6px 12px;background:none;border:1px solid #993C1D;border-radius:8px;color:#993C1D;font-size:11px;cursor:pointer;font-family:Arial,sans-serif">Сбросить</button>`:''}
      </div>
      ${myTotalBet>0?`<div style="margin-top:6px;font-size:12px;color:#1D9E75;text-align:center">✅ Ставки приняты! Жди прокрута через ${timeLeft} сек</div>`:`<div style="margin-top:6px;font-size:12px;color:#888;text-align:center">Нажми на стол чтобы поставить фишку</div>`}
    `:isSpinning?`
      <div style="text-align:center;font-size:13px;color:#EF9F27;font-weight:700">🎰 Крутим! Результаты скоро...</div>
    `:`<div style="text-align:center;font-size:13px;color:#888">Загрузка раунда...</div>`}
  </div>`;

  // Запускаем анимацию если spinning
  if(isSpinning&&liveRound.spin_result!==null&&!liveSpinning){
    liveSpinning=true;
    setTimeout(()=>lrRunAnimation(liveRound.spin_result,liveRound.spin_color),300);
  }

  // Обновляем таймер каждую секунду
  if(liveTimer)clearInterval(liveTimer);
  if(isBetting){
    liveTimer=setInterval(()=>{
      const tl=lrGetTimeLeft();
      const timerEl=document.querySelector('#live-roulette-overlay [style*="font-size:36px"]');
      if(timerEl)timerEl.textContent=tl;
      const barEl=document.querySelector('#live-roulette-overlay [style*="transition:width 1s"]');
      if(barEl){barEl.style.width=Math.min(100,tl/30*100)+'%';barEl.style.background=lrGetTimerColor(tl);}
      if(tl<=0){clearInterval(liveTimer);lrSyncRound().then(()=>lrRender());}
    },1000);
  }
}

function lrSelectChip(amount){
  liveSelectedChip=amount;
  lrRender();
}

async function lrClearBets(){
  // Возвращаем ставки
  const total=Object.values(liveBets).reduce((a,b)=>a+b,0);
  if(total>0){
    await saveUser({balance:bal+total,total_lost:Math.max(0,(currentUser.total_lost||0)-total)});
    // Удаляем ставки из БД
    if(liveRound){
      await sb.from('live_roulette_bets')
        .delete()
        .eq('round_id',liveRound.id)
        .eq('user_id',currentUser.user_id);
    }
  }
  liveBets={};
  lrRender();
}

function lrRunAnimation(resultNum,resultColor){
  const strip=document.getElementById('lr-strip');
  const container=strip?.parentElement;
  if(!strip||!container)return;

  const CELL_W=58,GAP=4,STEP=CELL_W+GAP;
  const POOL_SIZE=80,WIN_IDX=60;
  const nums=Object.values(LR_NUM_COLORS);

  const pool=[];
  const allNums=Object.keys(LR_NUM_COLORS).map(Number);
  for(let i=0;i<POOL_SIZE;i++){
    const n=allNums[Math.floor(Math.random()*allNums.length)];
    pool.push({n,color:LR_NUM_COLORS[n]});
  }
  pool[WIN_IDX]={n:resultNum,color:resultColor};

  strip.innerHTML='';
  strip.style.transition='none';
  strip.style.left='0px';

  pool.forEach(cell=>{
    const div=document.createElement('div');
    div.style.cssText=`width:${CELL_W}px;height:60px;border-radius:8px;background:${cell.color==='red'?'#5a0000':cell.color==='green'?'#1a4a1a':'#1a1a1a'};border:2px solid ${cell.color==='red'?'#cc2222':cell.color==='green'?'#1D9E75':'#444'};display:flex;align-items:center;justify-content:center;flex-direction:column;flex-shrink:0`;
    div.innerHTML=`<div style="font-size:18px;font-weight:900;color:#fff">${cell.n}</div><div style="font-size:9px;color:rgba(255,255,255,0.5)">${cell.color==='red'?'🔴':cell.color==='green'?'🟢':'⚫'}</div>`;
    strip.appendChild(div);
  });

  const containerW=container.offsetWidth||300;
  const startLeft=containerW/2-CELL_W/2;
  strip.style.left=startLeft+'px';

  setTimeout(()=>{
    const finalLeft=startLeft-(WIN_IDX*STEP)+(Math.random()*10-5);
    strip.style.transition='left 5s cubic-bezier(0.17,0.67,0.05,0.99)';
    strip.style.left=finalLeft+'px';
    setTimeout(()=>{
      liveSpinning=false;
      lrShowResult(resultNum,resultColor);
    },5200);
  },100);
}

function lrShowResult(n,color){
  const myWon=lrCalcMyWin(n,color);
  const myBetTotal=Object.values(liveBets).reduce((a,b)=>a+b,0);
  const profit=myWon-myBetTotal;

  let popup=document.getElementById('lr-result-popup');
  if(!popup){
    popup=document.createElement('div');
    popup.id='lr-result-popup';
    document.getElementById('live-roulette-overlay')?.appendChild(popup);
  }
  popup.style.cssText=`position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#16213e;border:2px solid ${myWon>0?'#1D9E75':'#cc3333'};border-radius:20px;padding:24px;z-index:600;width:85%;max-width:320px;text-align:center;font-family:Arial,sans-serif;box-shadow:0 0 40px ${myWon>0?'rgba(29,158,117,0.4)':'rgba(204,51,51,0.3)'}`;
  popup.innerHTML=`
    <div style="width:80px;height:80px;border-radius:50%;background:${color==='red'?'#8B1A1A':color==='green'?'#1a4a2a':'#2a2a2a'};border:4px solid ${color==='red'?'#cc2222':color==='green'?'#1D9E75':'#666'};display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 0 24px ${color==='red'?'rgba(204,34,34,0.5)':color==='green'?'rgba(29,158,117,0.5)':'rgba(100,100,100,0.3)'}">
      <span style="font-size:28px;font-weight:900;color:#fff">${n}</span>
    </div>
    <div style="font-size:13px;color:#888;margin-bottom:10px">${color==='red'?'🔴 Красное':color==='green'?'🟢 Зеро':'⚫ Чёрное'}</div>
    <div style="font-size:26px;margin-bottom:6px">${myWon>0?'🎉':'💀'}</div>
    <div style="font-size:16px;font-weight:700;color:${myWon>0?'#1D9E75':'#cc3333'};margin-bottom:12px">${myWon>0?'Выигрыш!':myBetTotal>0?'Не повезло...':'Ты не ставил'}</div>
    ${myBetTotal>0?`
    <div style="background:#0f0f1e;border-radius:10px;padding:10px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px solid #2a2a4a">
        <span style="color:#888">Ставка</span><span style="color:#fff;font-weight:700">${myBetTotal.toLocaleString('ru')} 💜</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px solid #2a2a4a">
        <span style="color:#888">Выигрыш</span><span style="color:${myWon>0?'#1D9E75':'#888'};font-weight:700">${myWon.toLocaleString('ru')} 💜</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:5px 0">
        <span style="color:#888">Итого</span><span style="color:${profit>=0?'#1D9E75':'#cc3333'};font-weight:700">${profit>=0?'+':''}${profit.toLocaleString('ru')} 💜</span>
      </div>
    </div>`:''}
    <button onclick="lrCloseResult()" style="width:100%;padding:12px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
      🎰 Следующий раунд
    </button>`;
}

function lrCalcMyWin(n,color){
  let won=0;
  Object.entries(liveBets).forEach(([t,a])=>{
    if(t.startsWith('n')&&parseInt(t.slice(1))===n)won+=a*36;
    if(t==='red'&&color==='red')won+=a*2;
    if(t==='black'&&color==='black')won+=a*2;
    if(t==='green'&&color==='green')won+=a*14;
    if(t==='even'&&n>0&&n%2===0)won+=a*2;
    if(t==='odd'&&n>0&&n%2!==0)won+=a*2;
    if(t==='low'&&n>=1&&n<=18)won+=a*2;
    if(t==='high'&&n>=19&&n<=36)won+=a*2;
    if(t==='dozen1'&&n>=1&&n<=12)won+=a*3;
    if(t==='dozen2'&&n>=13&&n<=24)won+=a*3;
    if(t==='dozen3'&&n>=25&&n<=36)won+=a*3;
    if(t==='col1'&&[3,6,9,12,15,18,21,24,27,30,33,36].includes(n))won+=a*3;
    if(t==='col2'&&[2,5,8,11,14,17,20,23,26,29,32,35].includes(n))won+=a*3;
    if(t==='col3'&&[1,4,7,10,13,16,19,22,25,28,31,34].includes(n))won+=a*3;
  });
  return won;
}

async function lrCloseResult(){
  const popup=document.getElementById('lr-result-popup');
  if(popup)popup.remove();
  liveBets={};
  liveSpinning=false;
  await lrLoadHistory();
  await lrSyncRound();
  lrRender();
}
