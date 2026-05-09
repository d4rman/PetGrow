const CARD_SUITS=['♠','♥','♦','♣'];
const CARD_VALUES=[2,3,4,5,6,7,8,9,10,11,12,13,14];
const CARD_NAMES={2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
const MULTIPLIERS=[1.5,2.0,2.8,3.8,5.0,6.5,8.0,10.0];

let cardBet=0,cardCurrent=null,cardStreak=0,cardWinnings=0,cardActive=false;

function randomCard(){
  return{
    value:CARD_VALUES[Math.floor(Math.random()*CARD_VALUES.length)],
    suit:CARD_SUITS[Math.floor(Math.random()*CARD_SUITS.length)]
  };
}

function cardColor(suit){return suit==='♥'||suit==='♦'?'#e74c3c':'#ecf0f1';}

function renderCard(card,size='big'){
  const s=size==='big'?120:70;
  const fs=size==='big'?52:28;
  const nfs=size==='big'?22:14;
  return `<div style="width:${s}px;height:${s*1.4}px;background:#fff;border-radius:12px;border:3px solid #2a2a4a;display:flex;flex-direction:column;justify-content:space-between;padding:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
    <div style="font-size:${nfs}px;color:${cardColor(card.suit)};font-weight:700;line-height:1">${CARD_NAMES[card.value]}${card.suit}</div>
    <div style="font-size:${fs}px;text-align:center;line-height:1">${card.suit}</div>
    <div style="font-size:${nfs}px;color:${cardColor(card.suit)};font-weight:700;line-height:1;transform:rotate(180deg)">${CARD_NAMES[card.value]}${card.suit}</div>
  </div>`;
}

function getMultiplier(streak){
  return MULTIPLIERS[Math.min(streak,MULTIPLIERS.length-1)];
}

function calcHigherChance(value){
  // Сколько карт выше
  const higher=CARD_VALUES.filter(v=>v>value).length;
  return Math.round(higher/CARD_VALUES.length*100);
}

function openCardsGame(){
  showModal('🃏 Выше / Ниже',`
    <div style="text-align:center">
      <div style="font-size:13px;color:#888;margin-bottom:14px">Угадай следующую карту!<br>Каждое угадывание увеличивает выигрыш</div>
      <div style="font-size:13px;color:#fff;margin-bottom:8px">Твой баланс: <span style="color:#a78bfa;font-weight:700">${bal.toLocaleString('ru')} 💜</span></div>
      <div style="margin-bottom:12px">
        <div style="font-size:12px;color:#888;margin-bottom:6px">Выбери ставку:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
          ${[50,100,250,500,1000,2500,5000,10000].map(v=>`
            <button onclick="setCardBet(${v},this)" class="spin-count-btn" style="padding:6px 10px;font-size:12px">${v.toLocaleString('ru')}</button>
          `).join('')}
        </div>
      </div>
      <input type="number" id="card-bet-input" placeholder="Своя ставка..." min="10" max="100000"
        style="width:100%;background:#0f0f1e;border:1px solid #2a2a4a;border-radius:10px;padding:10px;color:#fff;font-size:14px;margin-bottom:12px;font-family:Arial,sans-serif;text-align:center"
        oninput="cardBet=parseInt(this.value)||0;updateCardBetDisplay()">
      <div id="card-bet-display" style="font-size:13px;color:#888;margin-bottom:14px">Ставка: <span style="color:#EF9F27;font-weight:700">не выбрана</span></div>
      <button onclick="startCardsGame()" style="width:100%;padding:14px;background:linear-gradient(135deg,#7F77DD,#EF9F27);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
        🃏 Начать игру
      </button>
    </div>`);
}

function setCardBet(amount,btn){
  cardBet=amount;
  document.querySelectorAll('#main-modal .spin-count-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const inp=document.getElementById('card-bet-input');
  if(inp)inp.value=amount;
  updateCardBetDisplay();
}

function updateCardBetDisplay(){
  const el=document.getElementById('card-bet-display');
  if(!el)return;
  if(cardBet>0){
    el.innerHTML=`Ставка: <span style="color:#EF9F27;font-weight:700">${cardBet.toLocaleString('ru')} 💜</span>`;
  } else {
    el.innerHTML=`Ставка: <span style="color:#EF9F27;font-weight:700">не выбрана</span>`;
  }
}

async function startCardsGame(){
  if(!cardBet||cardBet<10){alert('Минимальная ставка 10 💜');return;}
  if(cardBet>bal){alert('Недостаточно 💜');return;}
  if(cardBet>100000){alert('Максимальная ставка 100,000 💜');return;}
  await saveUser({balance:bal-cardBet});
  cardCurrent=randomCard();
  cardStreak=0;
  cardWinnings=cardBet;
  cardActive=true;
  renderCardsRound();
}

function renderCardsRound(){
  const mult=getMultiplier(cardStreak);
  const potential=Math.floor(cardBet*getMultiplier(cardStreak+1));
  const higherChance=calcHigherChance(cardCurrent.value);
  const lowerChance=100-higherChance;
  const canTakeNow=cardStreak>0;

  document.getElementById('modal-content').innerHTML=`
    <div style="text-align:center">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;background:#0f0f1e;border-radius:10px;padding:8px 12px">
        <div style="font-size:12px;color:#888">Серия: <span style="color:#a78bfa;font-weight:700">${cardStreak} ✓</span></div>
        <div style="font-size:12px;color:#888">Выигрыш: <span style="color:#1D9E75;font-weight:700">${Math.floor(cardBet*mult).toLocaleString('ru')} 💜</span></div>
        <div style="font-size:12px;color:#888">x<span style="color:#EF9F27;font-weight:700">${mult}</span></div>
      </div>

      <div style="display:flex;justify-content:center;margin-bottom:16px">
        ${renderCard(cardCurrent,'big')}
      </div>

      <div style="font-size:13px;color:#888;margin-bottom:12px">
        Следующая карта будет...
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <button onclick="guessCard('higher')" style="padding:14px;background:linear-gradient(135deg,#1D9E75,#0d6a4a);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          ⬆️ Выше
          <div style="font-size:10px;font-weight:400;margin-top:2px;opacity:0.8">${higherChance}% шанс</div>
        </button>
        <button onclick="guessCard('lower')" style="padding:14px;background:linear-gradient(135deg,#993C1D,#6a1a0d);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          ⬇️ Ниже
          <div style="font-size:10px;font-weight:400;margin-top:2px;opacity:0.8">${lowerChance}% шанс</div>
        </button>
      </div>

      <div style="font-size:11px;color:#888;margin-bottom:12px">
        Если угадаешь → <span style="color:#EF9F27;font-weight:700">x${getMultiplier(cardStreak+1)} = ${potential.toLocaleString('ru')} 💜</span>
      </div>

      ${canTakeNow?`
        <button onclick="cashOut()" style="width:100%;padding:12px;background:none;border:2px solid #1D9E75;border-radius:12px;color:#1D9E75;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          💰 Забрать ${Math.floor(cardBet*mult).toLocaleString('ru')} 💜
        </button>`:''}
    </div>`;
}

async function guessCard(guess){
  if(!cardActive)return;
  const next=randomCard();

  // Анти-читерство: небольшой шанс что карта "случайно" не та
  // Если у игрока длинная серия — немного увеличиваем шанс проигрыша
  let cheatChance=0;
  if(cardStreak>=3)cheatChance=0.05;
  if(cardStreak>=5)cheatChance=0.10;
  if(Math.random()<cheatChance){
    // Форсируем равную карту (проигрыш)
    next.value=cardCurrent.value;
  }

  const correct=(guess==='higher'&&next.value>cardCurrent.value)||(guess==='lower'&&next.value<cardCurrent.value);
  const equal=next.value===cardCurrent.value;

  // Показываем результат
  const mult=getMultiplier(cardStreak);
  const won=Math.floor(cardBet*getMultiplier(cardStreak+1));

  if(correct){
    cardStreak++;
    cardWinnings=Math.floor(cardBet*getMultiplier(cardStreak));
    const prevCard=cardCurrent;
    cardCurrent=next;
    document.getElementById('modal-content').innerHTML=`
      <div style="text-align:center">
        <div style="font-size:28px;margin-bottom:8px">✅</div>
        <div style="font-size:16px;font-weight:700;color:#1D9E75;margin-bottom:12px">Угадал!</div>
        <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:16px">
          ${renderCard(prevCard,'small')}
          <div style="font-size:24px;color:#888">→</div>
          ${renderCard(next,'small')}
        </div>
        <div style="background:#0d2e1a;border-radius:10px;padding:10px;margin-bottom:14px">
          <div style="font-size:13px;color:#1D9E75;font-weight:700">Серия: ${cardStreak} ✓</div>
          <div style="font-size:15px;color:#EF9F27;font-weight:700;margin-top:4px">Выигрыш: ${cardWinnings.toLocaleString('ru')} 💜</div>
        </div>
        <button onclick="renderCardsRound()" style="width:100%;padding:12px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;margin-bottom:8px">
          🃏 Продолжить (x${getMultiplier(cardStreak+1)})
        </button>
        <button onclick="cashOut()" style="width:100%;padding:12px;background:none;border:2px solid #1D9E75;border-radius:12px;color:#1D9E75;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">
          💰 Забрать ${cardWinnings.toLocaleString('ru')} 💜
        </button>
      </div>`;
  } else {
    cardActive=false;
    const reason=equal?'Равная карта — проигрыш!':'Не угадал!';
    document.getElementById('modal-content').innerHTML=`
      <div style="text-align:center">
        <div style="font-size:28px;margin-bottom:8px">💀</div>
        <div style="font-size:16px;font-weight:700;color:#cc3333;margin-bottom:8px">${reason}</div>
        <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:16px">
          ${renderCard(cardCurrent,'small')}
          <div style="font-size:24px;color:#cc3333">→</div>
          ${renderCard(next,'small')}
        </div>
        <div style="background:#2e0d0d;border-radius:10px;padding:10px;margin-bottom:14px">
          <div style="font-size:13px;color:#cc3333">Серия остановлена на: ${cardStreak}</div>
          <div style="font-size:15px;color:#888;margin-top:4px">Потеряно: -${cardBet.toLocaleString('ru')} 💜</div>
        </div>
        <button onclick="openCardsGame()" style="width:100%;padding:12px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;margin-bottom:8px">
          🔄 Сыграть снова
        </button>
        <button onclick="closeModal()" style="width:100%;padding:10px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">
          Выйти
        </button>
      </div>`;
  }
}

async function cashOut(){
  if(!cardActive&&cardStreak===0)return;
  cardActive=false;
  const mult=getMultiplier(cardStreak);
  const won=Math.floor(cardBet*mult);
  await saveUser({balance:bal+won});
  document.getElementById('modal-content').innerHTML=`
    <div style="text-align:center">
      <div style="font-size:48px;margin-bottom:8px">🏆</div>
      <div style="font-size:18px;font-weight:700;color:#EF9F27;margin-bottom:8px">Отличная игра!</div>
      <div style="background:#1a1a0d;border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:13px;color:#888">Серия угаданий</div>
        <div style="font-size:28px;font-weight:700;color:#a78bfa">${cardStreak} ✓</div>
        <div style="font-size:13px;color:#888;margin-top:8px">Множитель</div>
        <div style="font-size:22px;font-weight:700;color:#EF9F27">x${mult}</div>
        <div style="font-size:13px;color:#888;margin-top:8px">Выигрыш</div>
        <div style="font-size:24px;font-weight:700;color:#1D9E75">+${won.toLocaleString('ru')} 💜</div>
      </div>
      <button onclick="openCardsGame()" style="width:100%;padding:12px;background:#7F77DD;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;margin-bottom:8px">
        🔄 Сыграть снова
      </button>
      <button onclick="closeModal()" style="width:100%;padding:10px;background:none;border:1px solid #2a2a4a;border-radius:10px;color:#888;font-size:13px;cursor:pointer;font-family:Arial,sans-serif">
        Выйти
      </button>
    </div>`;
}
