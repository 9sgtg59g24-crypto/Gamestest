'use strict';
// ═══════════════════════════════════════════════════════
//  WEAPONS
// ═══════════════════════════════════════════════════════
const WEAPONS = {
  ironDagger: {
    id:'ironDagger', name:'Iron Dagger', icon:'🗡️',
    atkBonus:3, strBonus:1, speed:0.8,  // attack cooldown seconds
    maxHitBase:4, type:'slash',
    desc:'A short iron blade. Fast but weak.',
    reqAtk:1, reqStr:1,
    animType:'stab'   // stab | slash | crush
  },
  shortSword: {
    id:'shortSword', name:'Short Sword', icon:'⚔️',
    atkBonus:7, strBonus:5, speed:1.4,
    maxHitBase:8, type:'slash',
    desc:'Balanced iron shortsword.',
    reqAtk:5, reqStr:5,
    animType:'slash'
  },
  warhammer: {
    id:'warhammer', name:'Warhammer', icon:'🔨',
    atkBonus:5, strBonus:12, speed:2.2,
    maxHitBase:14, type:'crush',
    desc:'Heavy and slow, hits like a siege engine.',
    reqAtk:10, reqStr:15,
    animType:'crush'
  },
  battleAxe: {
    id:'battleAxe', name:'Battle Axe', icon:'🪓',
    atkBonus:9, strBonus:10, speed:1.8,
    maxHitBase:12, type:'slash',
    desc:'Wide blade for cleaving armour.',
    reqAtk:15, reqStr:10,
    animType:'slash'
  },
  darkBlade: {
    id:'darkBlade', name:'Dark Blade', icon:'🗡️',
    atkBonus:16, strBonus:16, speed:1.2,
    maxHitBase:18, type:'magic',
    desc:'A cursed blade forged in shadow. Scales with Magic.',
    reqAtk:20, reqStr:20,
    animType:'stab'
  },
};

let equippedWeapon = WEAPONS.ironDagger;

function weaponMaxHit(wpn){
  const strLv = skLv('strength');
  const magLv = skLv('magic');
  const statBonus = wpn.type==='magic' ? magLv*0.3 : strLv*0.2;
  return Math.max(1, Math.floor(wpn.maxHitBase + wpn.strBonus*0.5 + statBonus));
}
function weaponHitChance(wpn){
  const atkLv = skLv('attack');
  return Math.min(0.95, 0.45 + atkLv*0.012 + wpn.atkBonus*0.01);
}

// Attack animation state
const atkAnim = { active:false, timer:0, duration:0, type:'stab' };

// ═══════════════════════════════════════════════════════
//  ITEMS / LOOT
// ═══════════════════════════════════════════════════════
const ITEM_DEFS = {
  dashScroll:{name:'Basic Dash Scroll',icon:'📜',type:'Ability', wt:.1,  stats:{},             desc:'Double-tap to learn the Dash ability.', buy:0, sell:0},
  bone:      {name:'Bones',          icon:'🦴',type:'Material', wt:.5,  stats:{},             desc:'Bury for Prayer XP.',          buy:2,   sell:1},
  rustSword: {name:'Rusty Sword',    icon:'🗡️',type:'Weapon',   wt:2,   stats:{atk:+2},        desc:'A corroded blade.',            buy:25,  sell:8},
  ironHelm:  {name:'Iron Helm',      icon:'⛑️',type:'Armour',   wt:3,   stats:{def:+3},        desc:'Dented iron helm.',            buy:40,  sell:14},
  leatherAm: {name:'Leather Armour', icon:'🥋',type:'Armour',   wt:2.5, stats:{def:+2},        desc:'Worn leather vest.',           buy:30,  sell:10},
  coin:      {name:'Gold Coin',      icon:'🪙',type:'Currency', wt:0,   stats:{},             desc:'Currency of the realm.',       buy:0,   sell:0,  stackMax:100},
  healthHrb: {name:'Health Herb',    icon:'🌿',type:'Consumable',wt:.2,  stats:{},             desc:'Restores 10 HP when used.',    buy:18,  sell:6},
  darkShard: {name:'Dark Shard',     icon:'💎',type:'Rare',     wt:.3,  stats:{magic:+5},     desc:'Fragment of dark magic.',      buy:80,  sell:35},
  tombKey:   {name:'Tomb Key',       icon:'🗝️',type:'Quest',    wt:.1,  stats:{},             desc:'Key to an ancient tomb.',      buy:0,   sell:50},
  poisVial:  {name:'Poison Vial',    icon:'⚗️',type:'Consumable',wt:.3,  stats:{},             desc:'Poisons your weapon.',         buy:22,  sell:8},
  chainMail: {name:'Chainmail',      icon:'🔗',type:'Armour',   wt:5,   stats:{def:+5},        desc:'Links of iron.',               buy:70,  sell:25},
  grimTome:  {name:'Grim Tome',      icon:'📖',type:'Spellbook',wt:1,   stats:{magic:+4},     desc:'Whispers dark spells.',        buy:60,  sell:22},
  shadCloak: {name:'Shadow Cloak',   icon:'🧥',type:'Armour',   wt:1.8, stats:{def:+4,atk:+1},desc:'Cloak of shadows.',            buy:90,  sell:38},
  healthPot: {name:'Health Potion',  icon:'🧪',type:'Consumable',wt:.3,  stats:{},             desc:'Fully restores HP.',           buy:45,  sell:15},
  ironOre:   {name:'Iron Ore',       icon:'🪨',type:'Material', wt:1,   stats:{},             desc:'Raw iron ore.',                buy:5,   sell:3},
};

const COIN_STACK_MAX = 100;

const LOOT_TABLES = {
  1:['bone','coin','coin','coin','healthHrb','rustSword'],
  2:['bone','coin','coin','ironHelm','leatherAm','poisVial','healthHrb'],
  3:['bone','coin','coin','chainMail','darkShard','tombKey','grimTome','shadCloak'],
  4:['coin','coin','darkShard','darkShard','grimTome','shadCloak','healthPot'], // elite
};

const inventory = new Array(28).fill(null);
const storageSlots = new Array(28).fill(null);

function countCoins(){
  let total=0;
  for(const s of inventory) if(s&&s.id==='coin') total+=s.qty;
  return total;
}
function spendCoins(amount){
  let remaining=amount;
  for(let i=0;i<28&&remaining>0;i++){
    if(inventory[i]&&inventory[i].id==='coin'){
      const take=Math.min(inventory[i].qty,remaining);
      inventory[i].qty-=take; remaining-=take;
      if(inventory[i].qty<=0) inventory[i]=null;
    }
  }
}

function addToInventory(id, qty=1){
  const def=ITEM_DEFS[id];
  // Coins stack up to COIN_STACK_MAX per slot
  if(id==='coin'){
    let remaining=qty;
    // Fill existing stacks first
    for(let i=0;i<28&&remaining>0;i++){
      if(inventory[i]&&inventory[i].id==='coin'&&inventory[i].qty<COIN_STACK_MAX){
        const space=COIN_STACK_MAX-inventory[i].qty;
        const add=Math.min(space,remaining);
        inventory[i].qty+=add; remaining-=add;
      }
    }
    // Open new stacks for remainder
    while(remaining>0){
      const add=Math.min(COIN_STACK_MAX,remaining);
      let placed=false;
      for(let i=0;i<28;i++){
        if(!inventory[i]){inventory[i]={id:'coin',qty:add};placed=true;remaining-=add;break;}
      }
      if(!placed){showNotif('INVENTORY FULL — coins lost!');return false;}
    }
    return true;
  }
  // Other stackable (wt===0) items
  if(def&&def.wt===0){
    for(let i=0;i<28;i++){
      if(inventory[i]&&inventory[i].id===id){inventory[i].qty+=qty;return true;}
    }
  }
  for(let i=0;i<28;i++){if(!inventory[i]){inventory[i]={id,qty};return true;}}
  showNotif('INVENTORY FULL!');return false;
}

// ═══════════════════════════════════════════════════════
//  SKILLS
// ═══════════════════════════════════════════════════════
const XPT=[0];
for(let l=1;l<100;l++) XPT.push(Math.floor(XPT[l-1]+Math.floor(l+300*Math.pow(2,l/7))/4));
const lvFromXp=xp=>{let l=1;while(l<99&&XPT[l]<=xp)l++;return l;};
const xpPct=xp=>{const l=lvFromXp(xp);if(l>=99)return 100;return Math.min(100,((xp-XPT[l-1])/(XPT[l]-XPT[l-1]))*100);};
const xpToNxt=xp=>{const l=lvFromXp(xp);return l>=99?0:XPT[l]-xp;};
const SK={
  attack:   {name:'Attack',    icon:'⚔️',xp:0},
  strength: {name:'Strength',  icon:'💪',xp:0},
  defence:  {name:'Defence',   icon:'🛡️',xp:0},
  hitpoints:{name:'Hitpoints', icon:'❤️',xp:1154},
  ranged:   {name:'Ranged',    icon:'🏹',xp:0},
  magic:    {name:'Magic',     icon:'🔮',xp:0},
  prayer:   {name:'Prayer',    icon:'🙏',xp:0},
  woodcut:  {name:'Woodcutting',icon:'🪓',xp:0},
  mining:   {name:'Mining',    icon:'⛏️',xp:0},
  agility:  {name:'Agility',   icon:'🏃',xp:0},
  slayer:   {name:'Slayer',    icon:'💀',xp:0},
  crafting: {name:'Crafting',  icon:'🧵',xp:0},
};
const skLv=k=>lvFromXp(SK[k].xp);
const combatLv=()=>{
  const a=skLv('attack'),s=skLv('strength'),d=skLv('defence'),h=skLv('hitpoints'),p=skLv('prayer');
  return Math.floor((d+h+Math.floor(p/2))/4+Math.max(a+s,Math.floor(skLv('magic')*1.5))*13/40);
};
const totalLv=()=>Object.keys(SK).reduce((a,k)=>a+skLv(k),0);
const logEntries=[];
function addLog(msg,t=''){
  logEntries.unshift({msg,t});
  if(logEntries.length>80)logEntries.pop();
  if(activeTab==='log')renderPanel();
}
function gainXp(skill,amt){
  if(amt<=0)return;
  const old=skLv(skill);
  SK[skill].xp+=amt;
  const nw=skLv(skill);
  showXpPop(`+${Math.ceil(amt)} ${SK[skill].name}`);
  if(nw>old){
    addLog(`Level up! ${SK[skill].name} → ${nw}`,'l');
    showLvlUp(`${SK[skill].icon}  ${SK[skill].name.toUpperCase()}\nLEVEL ${nw}`);
    if(skill==='hitpoints'){player.maxHp=nw*10;player.hp=Math.min(player.hp,player.maxHp);}
    if(skill==='prayer'){player.maxPrayer=nw;player.prayer=Math.min(player.prayer,player.maxPrayer);}
    saveGame();
  }
  refreshHUD();
  if(panelOpen)renderPanel();
}

// ═══════════════════════════════════════════════════════
//  PANEL UI
// ═══════════════════════════════════════════════════════
let panelOpen=false,activeTab='inv';
document.getElementById('invBtn').addEventListener('click',()=>openPanel('inv'));
document.getElementById('skBtn').addEventListener('click',()=>openPanel('skills'));
document.getElementById('spX').addEventListener('click',closePanel);
document.getElementById('invBtn').addEventListener('touchend',e=>{e.preventDefault();openPanel('inv');},{passive:false});
document.getElementById('skBtn').addEventListener('touchend',e=>{e.preventDefault();openPanel('skills');},{passive:false});
document.getElementById('spX').addEventListener('touchend',e=>{e.preventDefault();closePanel();},{passive:false});
document.querySelectorAll('.sptab').forEach(t=>{
  t.addEventListener('click',()=>{
    if(t.dataset.t==='bank'&&Math.hypot(player.x-BANK_X,player.z-BANK_Z)>=8){
      showNotif('YOU MUST BE NEAR THE BANK');return;
    }
    activeTab=t.dataset.t;
    document.querySelectorAll('.sptab').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');
    const titles={inv:'INVENTORY',wpn:'WEAPONS',skills:'SKILLS',bank:'BANK',log:'LOG'};
    document.getElementById('spTitle').textContent=titles[activeTab]||'';
    renderPanel();
  });
});
function openPanel(tab){
  closeDialogue(); closeMerchant(); closeTestShop();
  // Auto-open bank tab when near the chest
  if(tab==='inv' && Math.hypot(player.x-BANK_X,player.z-BANK_Z)<8) tab='bank';
  panelOpen=true;activeTab=tab;
  document.querySelectorAll('.sptab').forEach(t=>t.classList.toggle('on',t.dataset.t===tab));
  const titles={inv:'INVENTORY',wpn:'WEAPONS',skills:'SKILLS',bank:'BANK',log:'LOG'};
  document.getElementById('spTitle').textContent=titles[tab]||'';
  document.getElementById('sidePanel').classList.add('open');
  renderPanel();
}
function closePanel(){panelOpen=false;document.getElementById('sidePanel').classList.remove('open');}
function renderPanel(){
  if(activeTab==='inv')renderInv();
  else if(activeTab==='wpn')renderWeapons();
  else if(activeTab==='skills')renderSkills();
  else if(activeTab==='bank')renderBank();
  else renderLog();
}

const BANK_X=5,BANK_Z=3;
function renderBank(){
  const b=document.getElementById('spBody');
  if(Math.hypot(player.x-BANK_X,player.z-BANK_Z)>=8){
    b.innerHTML=`<div style="text-align:center;padding:30px 12px;font-family:'Cinzel',serif;font-size:8px;color:#555;letter-spacing:1px;line-height:2.2;">📦 BANK<br>You must be near the bank chest<br>to access your stored items.</div>`;
    return;
  }
  let h=`<div style="font-family:'Cinzel',serif;font-size:8px;color:#4499dd;letter-spacing:1px;padding:4px 0 8px;border-bottom:1px solid rgba(60,140,220,.2);margin-bottom:6px;">📦 BANK STORAGE <span style="color:#555;font-size:6px;">(safe on death · tap to withdraw)</span></div>`;
  h+=`<div class="invgrid">`;
  for(let i=0;i<28;i++){
    const s=storageSlots[i];
    if(s){const d=ITEM_DEFS[s.id];h+=`<div class="invslot has-item" style="border-color:rgba(60,140,220,.5)" data-bwith="${i}"><span class="ico">${d.icon}</span>${s.qty>1?`<span class="qty">${s.qty}</span>`:''}<span class="iname">${d.name.slice(0,6)}</span></div>`;}
    else h+=`<div class="invslot"></div>`;
  }
  h+=`</div><div style="font-family:'Cinzel',serif;font-size:8px;color:#aaa;letter-spacing:1px;padding:8px 0 6px;border-top:1px solid rgba(160,120,40,.15);margin-top:8px;">🎒 YOUR PACK <span style="color:#555;font-size:6px;">(tap to deposit)</span></div><div class="invgrid">`;
  let any=false;
  for(let i=0;i<28;i++){
    const s=inventory[i];
    if(s){any=true;const d=ITEM_DEFS[s.id];h+=`<div class="invslot has-item" data-bdep="${i}"><span class="ico">${d.icon}</span>${s.qty>1?`<span class="qty">${s.qty}</span>`:''}<span class="iname">${d.name.slice(0,6)}</span></div>`;}
    else h+=`<div class="invslot"></div>`;
  }
  if(!any)h+=`<div style="grid-column:1/-1;text-align:center;color:#555;font-size:7px;padding:10px;font-family:'Cinzel',serif;">Pack is empty</div>`;
  h+=`</div>`;
  b.innerHTML=h;
  b.querySelectorAll('[data-bwith]').forEach(el=>el.addEventListener('click',()=>{
    const i=parseInt(el.dataset.bwith);const s=storageSlots[i];if(!s)return;
    const fi=inventory.findIndex(x=>!x);if(fi<0){showNotif('INVENTORY FULL!');return;}
    inventory[fi]=s;storageSlots[i]=null;saveGame();
    addLog(`Withdrew ${ITEM_DEFS[s.id].icon} ${ITEM_DEFS[s.id].name}.`,'i');renderBank();
  }));
  b.querySelectorAll('[data-bdep]').forEach(el=>el.addEventListener('click',()=>{
    const i=parseInt(el.dataset.bdep);const s=inventory[i];if(!s)return;
    const fi=storageSlots.findIndex(x=>!x);if(fi<0){showNotif('BANK IS FULL!');return;}
    storageSlots[fi]=s;inventory[i]=null;saveGame();
    addLog(`Deposited ${ITEM_DEFS[s.id].icon} ${ITEM_DEFS[s.id].name}.`,'i');renderBank();
  }));
}
function renderInv(){
  const b=document.getElementById('spBody');
  const nearBank=Math.hypot(player.x-BANK_X,player.z-BANK_Z)<8;
  let wt=0;
  let h='';
  if(nearBank) h+=`<div style="font-family:'Cinzel',serif;font-size:7px;color:#4499dd;letter-spacing:1px;padding:4px 0 8px;text-align:center;border-bottom:1px solid rgba(60,140,220,.2);margin-bottom:6px;">📦 Double-tap any item to deposit to bank</div>`;
  h+='<div class="invgrid">';
  for(let i=0;i<28;i++){
    const s=inventory[i];
    if(s){const d=ITEM_DEFS[s.id];wt+=d.wt*s.qty;
      h+=`<div class="invslot has-item" data-slot="${i}" data-id="${s.id}"><span class="ico">${d.icon}</span><span class="iname">${d.name.split(' ')[0]}</span>${s.qty>1?`<span class="qty">${s.qty}</span>`:''}</div>`;
    }else h+=`<div class="invslot" data-slot="${i}"></div>`;
  }
  h+=`</div><div class="inv-weight">WEIGHT: ${wt.toFixed(1)} kg</div>`;
  b.innerHTML=h;
  let lastTap={slot:-1,time:0};
  b.querySelectorAll('.invslot.has-item').forEach(el=>{
    el.addEventListener('pointerenter',ev=>showTooltip(el.dataset.id,ev));
    el.addEventListener('pointerleave',hideTooltip);
    el.addEventListener('click',()=>{
      const slot=parseInt(el.dataset.slot);
      const now=Date.now();
      if(lastTap.slot===slot&&now-lastTap.time<450){
        const s=inventory[slot];if(!s)return;
        // Double-tap: dash scroll → learn ability
        if(s.id==='dashScroll'){
          inventory[slot]=null;
          lastTap={slot:-1,time:0};
          unlockDash();
          renderInv();
          return;
        }
        // Double-tap near bank: deposit
        if(nearBank){
          const fi=storageSlots.findIndex(x=>!x);
          if(fi<0){showNotif('BANK IS FULL!');return;}
          storageSlots[fi]=s;inventory[slot]=null;
          saveGame();
          showNotif(`${ITEM_DEFS[s.id].icon} Deposited`);
          addLog(`Deposited ${ITEM_DEFS[s.id].icon} ${ITEM_DEFS[s.id].name}.`,'i');
          lastTap={slot:-1,time:0};
          renderInv();
        }
      } else {
        lastTap={slot,time:now};
        useItem(el.dataset.id,slot);
      }
    });
  });
}
function renderWeapons(){
  const b=document.getElementById('spBody');
  let h='<div style="font-size:7px;color:#666;padding:4px 0 8px;letter-spacing:1px;">TAP TO EQUIP</div><div class="wpn-grid">';
  for(const id in WEAPONS){
    const w=WEAPONS[id];
    const equipped=equippedWeapon.id===id;
    const atkReq=skLv('attack')>=w.reqAtk, strReq=skLv('strength')>=w.reqStr;
    const canUse=atkReq&&strReq;
    h+=`<div class="wpn-card${equipped?' equipped':''}" data-wpn="${id}" style="${canUse?'':'opacity:.45'}">
      <div class="wpn-card-ico">${w.icon}</div>
      <div class="wpn-card-name">${w.name}</div>
      <div class="wpn-card-stats">
        ATK+<span>${w.atkBonus}</span>  STR+<span>${w.strBonus}</span><br>
        Max Hit: <span>${weaponMaxHit(w)}</span><br>
        Speed: <span>${w.speed<=1?'Fast':w.speed<=1.6?'Normal':'Slow'}</span><br>
        Req Atk:<span>${w.reqAtk}</span> Str:<span>${w.reqStr}</span>
      </div>
    </div>`;
  }
  h+='</div>';
  b.innerHTML=h;
  b.querySelectorAll('.wpn-card').forEach(el=>{
    el.addEventListener('click',()=>{
      const w=WEAPONS[el.dataset.wpn];
      if(!w)return;
      if(skLv('attack')<w.reqAtk||skLv('strength')<w.reqStr){
        showNotif(`Need Atk ${w.reqAtk} / Str ${w.reqStr}`);return;
      }
      equippedWeapon=w;
      updateWeaponMesh();
      updateWeaponHUD();
      renderWeapons();
      saveGame();
      showNotif(`${w.icon} ${w.name} equipped!`);
    });
  });
}
function renderSkills(){
  const keys=Object.keys(SK);
  document.getElementById('spBody').innerHTML=`<div class="skgrid">${keys.map(k=>{
    const s=SK[k],lv=skLv(k),pct=xpPct(s.xp),tn=lv>=99?'MAX':`${xpToNxt(s.xp).toLocaleString()} to lv ${lv+1}`;
    return `<div class="skcard"><div class="sktop"><span class="skico">${s.icon}</span>
      <div><div class="skname">${s.name.toUpperCase()}</div><div class="sklvl">${lv}</div></div></div>
      <div class="skbar"><div class="skfill" style="width:${pct}%"></div></div>
      <div class="skxt">${s.xp.toLocaleString()} XP · ${tn}</div></div>`;
  }).join('')}</div>`;
}
function renderLog(){
  document.getElementById('spBody').innerHTML=logEntries.length
    ?`<div class="loglist">${logEntries.map(e=>`<div class="le ${e.t}">${e.msg}</div>`).join('')}</div>`
    :`<div style="color:#444;font-size:8px;padding:20px;text-align:center;">No activity yet.</div>`;
}
function showTooltip(id,ev){
  const def=ITEM_DEFS[id];if(!def)return;
  document.getElementById('ttN').textContent=def.name;
  document.getElementById('ttTy').textContent=def.type.toUpperCase();
  const stats=Object.entries(def.stats).map(([k,v])=>`<span>${k}: <span class="tt-val">${v>0?'+':''}${v}</span></span>`).join('<br>');
  document.getElementById('ttS').innerHTML=(stats||'')+(def.desc?`<br><span style="color:#555;font-size:6px;">${def.desc}</span>`:'');
  const tt=document.getElementById('tooltip');
  tt.style.left=Math.min(ev.clientX+10,innerWidth-200)+'px';
  tt.style.top=Math.max(ev.clientY-80,10)+'px';
  tt.classList.add('show');
}
function hideTooltip(){document.getElementById('tooltip').classList.remove('show');}
function useItem(id,slot){
  if(id==='healthHrb'){
    player.hp=Math.min(player.maxHp,player.hp+10);
    inventory[slot].qty--;if(inventory[slot].qty<=0)inventory[slot]=null;
    addLog('Used Health Herb. +10 HP','h');showNotif('+10 HP RESTORED');
    spawnHitsplat(PG.position.clone().add(new THREE.Vector3(0,2.8,0)),10,'hs-h');
    if(panelOpen)renderPanel();
  } else if(id==='bone'){
    gainXp('prayer',4.5);
    inventory[slot].qty--;if(inventory[slot].qty<=0)inventory[slot]=null;
    addLog('Buried bones. +4.5 Prayer XP','x');
    if(panelOpen)renderPanel();
  } else { showNotif(`${ITEM_DEFS[id]?ITEM_DEFS[id].name:id} used!`); }
}
function refreshHUD(){
  document.getElementById('combLvl').textContent=combatLv();
  document.getElementById('totLvl').textContent=`TOTAL:${totalLv()}`;
}
function updateWeaponHUD(){
  const w=equippedWeapon;
  document.getElementById('wpnIco').textContent=w.icon;
  document.getElementById('wpnName').textContent=w.name;
  document.getElementById('wpnStat').textContent=`ATK+${w.atkBonus} Max:${weaponMaxHit(w)}`;
}

// ═══════════════════════════════════════════════════════
//  THREE.JS SCENE
// ═══════════════════════════════════════════════════════
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x07091a);
const fogObj=new THREE.Fog(0x07091a,60,260);
scene.fog=fogObj;
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,400);
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

// ── Day/Night cycle lights ──
const ambLight = new THREE.AmbientLight(0x000000,1);
scene.add(ambLight);
const sunLight  = new THREE.DirectionalLight(0xffd89b,0); // warm sun
sunLight.position.set(80,120,60);sunLight.castShadow=true;
sunLight.shadow.mapSize.set(1024,1024);
sunLight.shadow.camera.left=sunLight.shadow.camera.bottom=-180;
sunLight.shadow.camera.right=sunLight.shadow.camera.top=180;
sunLight.shadow.camera.far=400;
sunLight.shadow.camera.updateProjectionMatrix();
scene.add(sunLight);
const moonLight = new THREE.DirectionalLight(0x3344aa,0); // cold moon
moonLight.position.set(-80,100,40);scene.add(moonLight);
const hemiLight = new THREE.HemisphereLight(0x000000,0x000000,1);
scene.add(hemiLight);
// Spawn torches (always on)
const torch1=new THREE.PointLight(0xff6600,2.5,28);torch1.position.set(8,4,8);scene.add(torch1);
const torch2=new THREE.PointLight(0xff6600,2.0,22);torch2.position.set(-10,4,5);scene.add(torch2);

// Day/night state
const DN = {
  time: 0.5,         // 0..1, 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  speed: 1/240,      // full cycle in 240 seconds
  isNight: false,
};

// Stars particle system
let starPoints;
{const sg=new THREE.BufferGeometry(),sv=[];
 for(let i=0;i<1400;i++){
   const t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1),r=390+Math.random()*30;
   sv.push(r*Math.sin(p)*Math.cos(t),r*Math.cos(p),r*Math.sin(p)*Math.sin(t));
 }
 sg.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));
 starPoints=new THREE.Points(sg,new THREE.PointsMaterial({color:0xaabbff,size:0.55,sizeAttenuation:true,transparent:true,opacity:1}));
 scene.add(starPoints);
}

// Ground
const gGeo=new THREE.PlaneGeometry(800,800,48,48);
const gP=gGeo.attributes.position;
for(let i=0;i<gP.count;i++){
  const x=gP.getX(i),z=gP.getY(i);
  if(Math.abs(x)>12||Math.abs(z)>12) gP.setZ(i,Math.sin(x*.038)*Math.cos(z*.038)*2.8+(Math.random()-.5)*.4);
}
gGeo.computeVertexNormals();
const gMat=new THREE.MeshLambertMaterial({color:0x1a1c14});
const gMesh=new THREE.Mesh(gGeo,gMat);
gMesh.rotation.x=-Math.PI/2;gMesh.receiveShadow=true;scene.add(gMesh);
const grid=new THREE.GridHelper(800,60,0x1e1c14,0x1e1c14);grid.position.y=0.02;scene.add(grid);
function getGroundY(x,z){
  if(Math.abs(x)<12&&Math.abs(z)<12)return 0;
  return Math.sin(x*.038)*Math.cos(z*.038)*2.8;
}
const rnd=(a,b)=>a+Math.random()*(b-a);
const WORLD=240;

// ── Materials ──
const M={
  stone:    new THREE.MeshLambertMaterial({color:0x4a4858}),
  darkSt:   new THREE.MeshLambertMaterial({color:0x282038}),
  wood:     new THREE.MeshLambertMaterial({color:0x3a2214}),
  roof:     new THREE.MeshLambertMaterial({color:0x44180a}),
  thatch:   new THREE.MeshLambertMaterial({color:0x523614}),
  planks:   new THREE.MeshLambertMaterial({color:0x442c18}),
  enemy:    new THREE.MeshLambertMaterial({color:0x441020}),
  enemyEye: new THREE.MeshLambertMaterial({color:0xff4400,emissive:0xcc2200,emissiveIntensity:1.2}),
  flame:    new THREE.MeshLambertMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:1.5}),
  loot:     new THREE.MeshLambertMaterial({color:0xffcc22,emissive:0xcc8800,emissiveIntensity:1.0}),
  player:   new THREE.MeshLambertMaterial({color:0x3a60b0}),
  playerH:  new THREE.MeshLambertMaterial({color:0xe0b880}),
  playerL:  new THREE.MeshLambertMaterial({color:0x243268}),
  cape:     new THREE.MeshLambertMaterial({color:0x7a1010}),
  pad:      new THREE.MeshLambertMaterial({color:0x4a70c0}),
  boot:     new THREE.MeshLambertMaterial({color:0x18121e}),
  crystal:  new THREE.MeshLambertMaterial({color:0x5533ee,emissive:0x3322bb,emissiveIntensity:.9}),
  wpnBlade: new THREE.MeshLambertMaterial({color:0xc8d8e8,emissive:0x445566,emissiveIntensity:.4}),
  wpnHilt:  new THREE.MeshLambertMaterial({color:0x7a5510}),
};

// ── BUILDING FUNCTIONS ──
// Each returns {group, roofMesh, cx, cz, hw, hd}  — roof hides when player inside

const roofedBuildings = []; // [{roofMesh, cx, cz, hw, hd, roofY}]

function regRoof(roofMesh, cx, cz, hw, hd, roofY){
  roofMesh.material = roofMesh.material.clone();
  roofMesh.material.transparent = true;
  roofMesh.material.opacity = 1;
  roofedBuildings.push({roofMesh, cx, cz, hw, hd, roofY});
}

// ── BUILDING COLLIDERS (AABB) ──
// Each: {cx, cz, hw, hd}  — world-space axis-aligned box, player radius 0.5
const buildingColliders = [];
function addCollider(cx, cz, hw, hd){
  buildingColliders.push({cx, cz, hw, hd});
}

const PLAYER_RADIUS = 0.55;

function resolveCollisions(){
  for(const b of buildingColliders){
    const ex = b.cx - player.x;
    const ez = b.cz - player.z;
    const overlapX = (b.hw + PLAYER_RADIUS) - Math.abs(ex);
    const overlapZ = (b.hd + PLAYER_RADIUS) - Math.abs(ez);
    // Only resolve if actually inside the expanded AABB
    if(overlapX > 0 && overlapZ > 0){
      // Push out along the axis of least overlap
      if(overlapX < overlapZ){
        player.x -= Math.sign(ex) * overlapX;
        player.vx = 0;
      } else {
        player.z -= Math.sign(ez) * overlapZ;
        player.vz = 0;
      }
    }
  }
}

function makeHouse(x,z,rot=0){
  const g=new THREE.Group();
  const W=6,D=5,H=4;
  const walls=new THREE.Mesh(new THREE.BoxGeometry(W,H,D),M.stone);
  walls.position.y=H/2;walls.castShadow=true;walls.receiveShadow=true;g.add(walls);
  const roofGeo=new THREE.CylinderGeometry(0,Math.sqrt(W*W+D*D)/2,2.2,4,1);
  const roof=new THREE.Mesh(roofGeo,M.thatch);
  roof.position.y=H+1.1;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.8,.3),M.darkSt);
  door.position.set(0,.9,D/2+.05);g.add(door);
  [-1.8,1.8].forEach(ox=>{
    const win=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.3),M.darkSt);
    win.position.set(ox,H*.6,D/2+.05);g.add(win);
  });
  const tpost=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,2,4),M.wood);
  tpost.position.set(0.9,1,D/2+.2);g.add(tpost);
  const tfl=new THREE.Mesh(new THREE.ConeGeometry(.08,.28,5),M.flame);
  tfl.position.set(.9,2.1,D/2+.2);g.add(tfl);
  const tl=new THREE.PointLight(0xff5500,1.8,8);tl.position.set(.9,2.3,D/2+.4);g.add(tl);
  g.userData={flameRef:tfl,lightRef:tl,phase:Math.random()*Math.PI*2};
  g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  regRoof(roof, x, z, W/2+0.5, D/2+0.5, H+1.1);
  addCollider(x, z, W/2, D/2);
  return g;
}

function makeTavern(x,z,rot=0){
  const g=new THREE.Group();
  const W=10,D=8,H=5;
  const walls=new THREE.Mesh(new THREE.BoxGeometry(W,H,D),M.planks);
  walls.position.y=H/2;walls.castShadow=true;walls.receiveShadow=true;g.add(walls);
  const upper=new THREE.Mesh(new THREE.BoxGeometry(W+.6,2,D+.6),M.wood);
  upper.position.y=H+1;upper.castShadow=true;g.add(upper);
  const rg=new THREE.CylinderGeometry(0,Math.sqrt(W*W+D*D)/1.9,2.5,4,1);
  const roof=new THREE.Mesh(rg,M.thatch);
  roof.position.y=H+3;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(2,.8,.15),M.planks);
  sign.position.set(0,H+.5,D/2+.2);g.add(sign);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.2,.3),M.darkSt);
  door.position.set(0,1.1,D/2+.1);g.add(door);
  [-3.5,3.5].forEach(ox=>{
    const lp=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1.4,5),M.wood);
    lp.position.set(ox,H,.5+D/2);g.add(lp);
    const lfl=new THREE.Mesh(new THREE.ConeGeometry(.1,.3,5),M.flame);
    lfl.position.set(ox,H+1.1,.5+D/2);g.add(lfl);
    const ll=new THREE.PointLight(0xff5500,2,10);ll.position.set(ox,H+1.3,.5+D/2);g.add(ll);
    g.userData[`fl_${ox}`]={flameRef:lfl,lightRef:ll,phase:Math.random()*Math.PI*2};
  });
  g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  regRoof(roof, x, z, W/2+0.8, D/2+0.8, H+3);
  addCollider(x, z, W/2, D/2);
  return g;
}

function makeChurch(x,z,rot=0){
  const g=new THREE.Group();
  const nave=new THREE.Mesh(new THREE.BoxGeometry(8,7,14),M.darkSt);
  nave.position.y=3.5;nave.castShadow=true;nave.receiveShadow=true;g.add(nave);
  const tower=new THREE.Mesh(new THREE.BoxGeometry(3.5,14,3.5),M.stone);
  tower.position.set(0,7,-9);tower.castShadow=true;g.add(tower);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(.7,5,4),M.darkSt);
  spire.position.set(0,16,-9);spire.castShadow=true;g.add(spire);
  [-3,0,3].forEach(oz=>{[-1,1].forEach(sx=>{
    const win=new THREE.Mesh(new THREE.BoxGeometry(.4,2,.3),M.darkSt);
    win.position.set(sx*4.1,5,oz);g.add(win);
  });});
  const cv=new THREE.Mesh(new THREE.BoxGeometry(.25,2,.25),M.stone);cv.position.set(0,19,-9);g.add(cv);
  const ch=new THREE.Mesh(new THREE.BoxGeometry(1.2,.25,.25),M.stone);ch.position.set(0,18.5,-9);g.add(ch);
  const bl=new THREE.PointLight(0xaaaaff,1.5,20);bl.position.set(0,13,-9);g.add(bl);
  g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  regRoof(nave, x, z, 4.5, 7.5, 7);
  addCollider(x, z, 4.0, 7.0);       // nave
  addCollider(x, z-9, 1.75, 1.75);   // bell tower
  return g;
}

// ── MEDIC HUT ──
function makeMedicHut(x, z, rot=0){
  const g = new THREE.Group();
  const W=7, D=6, H=4.5;

  // Walls — whitewashed stone
  const wallMat = new THREE.MeshLambertMaterial({color:0xd8cfc0});
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W,H,D), wallMat);
  walls.position.y = H/2; walls.castShadow=true; walls.receiveShadow=true; g.add(walls);

  // Roof
  const roofGeo = new THREE.CylinderGeometry(0, Math.sqrt(W*W+D*D)/1.9, 2.4, 4, 1);
  const roofMat = new THREE.MeshLambertMaterial({color:0xcc2222}); // red roof for medic
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = H+1.2; roof.rotation.y = Math.PI/4; roof.castShadow=true; g.add(roof);

  // ── RED CROSS SIGN above door ──
  const signMat = new THREE.MeshLambertMaterial({color:0xffffff});
  const signBg = new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,.12), signMat);
  signBg.position.set(0, H-0.4, D/2+0.1); g.add(signBg);
  // Cross vertical bar
  const crossMat = new THREE.MeshLambertMaterial({color:0xdd0000, emissive:0x880000, emissiveIntensity:.4});
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.42,1.6,.18), crossMat);
  crossV.position.set(0, H-0.4, D/2+0.2); g.add(crossV);
  // Cross horizontal bar
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.55,0.42,.18), crossMat);
  crossH.position.set(0, H-0.4, D/2+0.2); g.add(crossH);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2,2.0,.3), M.darkSt);
  door.position.set(0, 1.0, D/2+0.05); g.add(door);

  // Windows each side
  [-2.2, 2.2].forEach(ox=>{
    const win = new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.3), M.darkSt);
    win.position.set(ox, H*.55, D/2+.05); g.add(win);
  });

  // Interior warm lantern light
  const intLight = new THREE.PointLight(0xffddaa, 1.6, 10);
  intLight.position.set(0, H-1, 0); g.add(intLight);

  // Torch on each side of door
  [-1,1].forEach(sx=>{
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,1.8,4), M.wood);
    tp.position.set(sx*0.9, 0.9, D/2+0.22); g.add(tp);
    const tfl = new THREE.Mesh(new THREE.ConeGeometry(.08,.26,5), M.flame);
    tfl.position.set(sx*0.9, 1.85, D/2+0.22); g.add(tfl);
    const tl = new THREE.PointLight(0xff5500,1.5,7);
    tl.position.set(sx*0.9,2.0,D/2+0.4); g.add(tl);
    g.userData[`torch_${sx}`]={flameRef:tfl,lightRef:tl,phase:Math.random()*Math.PI*2};
  });

  // A medical cot inside (just for flavour)
  const cotMat = new THREE.MeshLambertMaterial({color:0xdddddd});
  const cotBase = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.3,2.2), cotMat);
  cotBase.position.set(-2, 0.3, -1); g.add(cotBase);
  const cotPillow = new THREE.Mesh(new THREE.BoxGeometry(.9,.25,.55), new THREE.MeshLambertMaterial({color:0xffffff}));
  cotPillow.position.set(-2, 0.48, -1.8); g.add(cotPillow);

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  regRoof(roof, x, z, W/2+0.5, D/2+0.5, H+1.2);
  addCollider(x, z, W/2, D/2);
  return g;
}

function makeFortWall(x,z,len,rot=0){
  const g=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(len,6,.8),M.stone);
  wall.position.y=3;wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
  const merlons=Math.floor(len/2);
  for(let i=0;i<merlons;i++){
    const bx=i*2-len/2+1;
    const bt=new THREE.Mesh(new THREE.BoxGeometry(.8,1.4,.85),M.darkSt);
    bt.position.set(bx,6.7,0);bt.castShadow=true;g.add(bt);
  }
  g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  // Collider: wall runs along X when rot=0, along Z when rot=PI/2
  if(Math.abs(Math.sin(rot)) < 0.1){
    // Horizontal wall (along X axis)
    addCollider(x, z, len/2, 0.6);
  } else {
    // Vertical wall (along Z axis)
    addCollider(x, z, 0.6, len/2);
  }
  return g;
}

function makeDeadTree(x,z){
  const g=new THREE.Group(),h=rnd(5,10);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.2,.38,h,6),M.wood);
  trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+Math.random()*.5,bl=rnd(1.5,3.5),bh=h*rnd(.5,.85);
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.06,.12,bl,4),M.wood);
    br.position.set(Math.cos(a)*bl*.4,bh,Math.sin(a)*bl*.4);
    br.rotation.z=Math.PI/2-Math.abs(Math.cos(a))*.6;br.rotation.y=a;
    br.castShadow=true;g.add(br);
  }
  g.position.set(x,0,z);scene.add(g);return g;
}

// Dark fantasy leafy tree (RS-inspired)
function makeRSTree(x,z){
  const g=new THREE.Group();
  const h=rnd(4,8);
  const trunkMat=new THREE.MeshLambertMaterial({color:0x1e1008});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.24,.44,h,7),trunkMat);
  trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
  // Twisted branches feeding into canopy
  for(let i=0;i<3;i++){
    const a=i/3*Math.PI*2+.4,bl=rnd(1.2,2.4),bh=h*rnd(.6,.85);
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.05,.1,bl,4),trunkMat);
    br.position.set(Math.cos(a)*bl*.3,bh,Math.sin(a)*bl*.3);
    br.rotation.z=Math.PI/2-Math.abs(Math.cos(a))*.5;br.rotation.y=a;
    br.castShadow=true;g.add(br);
  }
  // Layered canopy — dark purple-green spheres
  const c1=new THREE.MeshLambertMaterial({color:0x162210});
  const c2=new THREE.MeshLambertMaterial({color:0x1a1a28});
  [[0,h+.6,0,1.7],[-.75,h-.2,.3,1.15],[.65,h-.4,-.5,1.05],[.1,h+1.5,0,1.0]].forEach(([lx,ly,lz,r],i)=>{
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(r,6,5),i%2===0?c1:c2);
    leaf.position.set(lx,ly,lz);leaf.castShadow=true;g.add(leaf);
  });
  // Rare wisp glow
  if(Math.random()<.35){
    const wl=new THREE.PointLight(0x003322,.4,5);
    wl.position.set(0,h+1.2,0);g.add(wl);
  }
  g.position.set(x,0,z);scene.add(g);return g;
}
function makeRuin(x,z){
  const g=new THREE.Group();
  const cols=Math.floor(rnd(2,5));
  for(let cx=0;cx<cols;cx++){
    const ch=rnd(1.2,4);
    const col=new THREE.Mesh(new THREE.BoxGeometry(1,ch,1),M.darkSt);
    col.position.set(cx*1.4-cols*.7,ch/2,0);col.castShadow=true;g.add(col);
  }
  g.position.set(x,0,z);g.rotation.y=Math.random()*Math.PI;scene.add(g);return g;
}
function makeTombstone(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(.8,.15,.4),M.stone);base.position.y=.075;g.add(base);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(.6,1.1,.12),M.darkSt);slab.position.y=1.0;slab.castShadow=true;g.add(slab);
  const arch=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.12,8,1,false,0,Math.PI),M.darkSt);
  arch.position.set(0,1.55,0);arch.rotation.x=Math.PI/2;g.add(arch);
  g.position.set(x,0,z);g.rotation.y=Math.random()*Math.PI*.4;scene.add(g);return g;
}
function makeTower(x,z){
  const g=new THREE.Group(),h=14;
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.5,h,8),M.darkSt);
  tower.position.y=h/2;tower.castShadow=true;tower.receiveShadow=true;g.add(tower);
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const bt=new THREE.Mesh(new THREE.BoxGeometry(.6,1.2,.6),M.stone);
    bt.position.set(Math.cos(a)*2.2,h+.6,Math.sin(a)*2.2);bt.castShadow=true;g.add(bt);
  }
  const top=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.35,8),M.stone);top.position.y=h;g.add(top);
  const tl=new THREE.PointLight(0xff5500,3,22);tl.position.set(0,h+2,0);g.add(tl);
  g.position.set(x,0,z);scene.add(g);return g;
}
function makeBonfire(x,z){
  const g=new THREE.Group();
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    const log=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,1.6,5),M.wood);
    log.position.set(Math.cos(a)*.4,.2,Math.sin(a)*.4);log.rotation.z=Math.PI/2-Math.PI*.15;log.rotation.y=a;g.add(log);
  }
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.3,.9,6),M.flame);flame.position.y=.7;g.add(flame);
  const fl=new THREE.PointLight(0xff6600,4,18);fl.position.y=1.2;g.add(fl);
  g.position.set(x,0,z);g.userData={flameRef:flame,lightRef:fl,phase:Math.random()*Math.PI*2};
  scene.add(g);return g;
}
function makeTorchPost(x,z){
  const g=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,3,5),M.wood);post.position.y=1.5;post.castShadow=true;g.add(post);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.25,.4,.25),M.wood);head.position.y=3.2;g.add(head);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.1,.35,5),M.flame);flame.position.y=3.6;g.add(flame);
  const fl=new THREE.PointLight(0xff5500,2.5,12);fl.position.y=3.8;g.add(fl);
  g.position.set(x,0,z);g.userData={flameRef:flame,lightRef:fl,phase:Math.random()*Math.PI*2};
  scene.add(g);return g;
}

// ── WORLD GENERATION ──
const bonfires=[],torchPosts=[],buildings=[];

// Medic hut — built first, Elara stands inside it
buildings.push(makeMedicHut(6, -10, Math.PI*0.05)); // door faces roughly toward spawn

// Village near spawn
buildings.push(makeHouse(22,10, 0));
buildings.push(makeHouse(-22,8, Math.PI*.15));
buildings.push(makeHouse(10,24, Math.PI*.5));
buildings.push(makeHouse(-12,22,Math.PI*.3));
buildings.push(makeTavern(0,30,  0));
buildings.push(makeChurch(0,-35, 0));
// Fort walls around village perimeter
makeFortWall(0,42,50,0);
makeFortWall(0,-48,50,0);
makeFortWall(44,0,50,Math.PI/2);
makeFortWall(-44,0,50,Math.PI/2);
// Outpost buildings further out
buildings.push(makeHouse(90,60,  Math.PI*.2));
buildings.push(makeHouse(-80,-70,Math.PI*.7));
buildings.push(makeHouse(100,-80,Math.PI*.1));
// Towers
makeTower(80,80);makeTower(-90,70);makeTower(75,-85);makeTower(-80,-80);
// Bonfires
[[-5,12],[12,-6],[-14,0],[0,-14],[20,20],[-22,-18],[0,38],[-38,0]].forEach(([x,z])=>bonfires.push(makeBonfire(x,z)));
// Torch posts
for(let i=0;i<22;i++){
  const a=i/22*Math.PI*2,r=rnd(15,65);
  torchPosts.push(makeTorchPost(Math.cos(a)*r,Math.sin(a)*r));
}
// Environment scatter
for(let i=0;i<55;i++){
  const x=rnd(-WORLD,WORLD),z=rnd(-WORLD,WORLD);
  if(Math.hypot(x,z)<18){i--;continue;}
  Math.random()<.45 ? makeRSTree(x,z) : makeDeadTree(x,z);
}
for(let i=0;i<18;i++){
  const x=rnd(-WORLD,WORLD),z=rnd(-WORLD,WORLD);
  if(Math.hypot(x,z)<16){i--;continue;}
  makeRuin(x,z);
}
for(let i=0;i<28;i++){
  const x=rnd(-WORLD,WORLD),z=rnd(-WORLD,WORLD);
  if(Math.hypot(x,z)<8){i--;continue;}
  makeTombstone(x,z);
}

// Crystals
const crystals=[];
for(let i=0;i<12;i++){
  const g=new THREE.Group();
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.6,0),M.crystal.clone());
  gem.castShadow=true;g.add(gem);
  const cl=new THREE.PointLight(0x4422ff,1.5,10);g.add(cl);
  g.position.set(rnd(-WORLD*.8,WORLD*.8),.8,rnd(-WORLD*.8,WORLD*.8));
  g.userData={collected:false,phase:Math.random()*Math.PI*2};
  scene.add(g);crystals.push(g);
}

// ── LOOT DROPS ──
const groundLoot=[];
function spawnLoot(x,z,itemId){
  const def=ITEM_DEFS[itemId];if(!def)return;
  const g=new THREE.Group();
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.25,0),M.loot.clone());
  gem.position.y=.35;gem.castShadow=true;g.add(gem);
  const gl=new THREE.PointLight(0xddaa00,1.2,5);gl.position.y=.6;g.add(gl);
  g.position.set(x,getGroundY(x,z),.0+z);
  g.userData={itemId,phase:Math.random()*Math.PI*2,picked:false};
  scene.add(g);
  const lbl=document.createElement('div');
  lbl.className='loot-label';lbl.textContent=`${def.icon} ${def.name}`;
  lbl.style.display='none';document.body.appendChild(lbl);
  groundLoot.push({group:g,itemId,label:lbl,x,z});
}

// ── SAFE ZONE ──
const SAFE_RADIUS = 44; // doubled from 22
const SAFE_X = 0, SAFE_Z = 0;

// Green glowing ring on the ground
(function buildSafeZone(){
  const segments = 64;
  const ringGeo = new THREE.RingGeometry(SAFE_RADIUS - 0.3, SAFE_RADIUS + 0.3, segments);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ff66, transparent: true, opacity: 0.55, side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  scene.add(ring);

  // Inner soft glow disc
  const discGeo = new THREE.CircleGeometry(SAFE_RADIUS, segments);
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x00ff44, transparent: true, opacity: 0.04, side: THREE.DoubleSide
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.03;
  scene.add(disc);

  // Pulsing point lights around the perimeter
  for(let i = 0; i < 6; i++){
    const a = (i/6)*Math.PI*2;
    const pl = new THREE.PointLight(0x00ff55, 1.2, 14);
    pl.position.set(
      SAFE_X + Math.cos(a)*SAFE_RADIUS,
      1.5,
      SAFE_Z + Math.sin(a)*SAFE_RADIUS
    );
    scene.add(pl);
  }

  // "SAFE ZONE" text label in HUD (shown when inside)
  const el = document.createElement('div');
  el.id = 'safeLabel';
  el.style.cssText = `position:fixed;bottom:200px;left:50%;transform:translateX(-50%);
    font-family:'Cinzel Decorative',serif;font-size:11px;color:#00ff88;letter-spacing:3px;
    text-shadow:0 0 16px #00ff88,0 0 32px #00ff8866;pointer-events:none;z-index:15;
    opacity:0;transition:opacity .5s;`;
  el.textContent = '✦ SAFE ZONE ✦';
  document.body.appendChild(el);
})();

function inSafeZone(x, z){
  return Math.hypot(x - SAFE_X, z - SAFE_Z) < SAFE_RADIUS;
}

// ── ELARA — FRIENDLY MEDIC NPC ──
// Medic hut is at (6,-10), D=6, door faces +Z (roughly), so outside door = z = -10 + 3 + 2.5 = -4.5
const ELARA_X = 6, ELARA_Z = -3.5; // standing just outside the medic hut door

const elaraMats = {
  skin:  new THREE.MeshLambertMaterial({color:0xe8c090}),
  coat:  new THREE.MeshLambertMaterial({color:0xdddddd}),  // white medic coat
  hair:  new THREE.MeshLambertMaterial({color:0x3a1a08}),  // dark brown hair
  belt:  new THREE.MeshLambertMaterial({color:0x553311}),
  cross: new THREE.MeshLambertMaterial({color:0xff2222,emissive:0xaa0000,emissiveIntensity:.4}),
};

const elaraGroup = new THREE.Group();
// Body (white coat)
const eBody = new THREE.Mesh(new THREE.BoxGeometry(.65,.95,.45), elaraMats.coat);
eBody.position.y=1.18; eBody.castShadow=true; elaraGroup.add(eBody);
// Red cross on coat
const eCrossV = new THREE.Mesh(new THREE.BoxGeometry(.08,.35,.06), elaraMats.cross);
eCrossV.position.set(0,1.28,.25); elaraGroup.add(eCrossV);
const eCrossH = new THREE.Mesh(new THREE.BoxGeometry(.25,.08,.06), elaraMats.cross);
eCrossH.position.set(0,1.28,.25); elaraGroup.add(eCrossH);
// Belt
const eBelt = new THREE.Mesh(new THREE.BoxGeometry(.68,.1,.48), elaraMats.belt);
eBelt.position.y=.72; elaraGroup.add(eBelt);
// Head
const eHead = new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5), elaraMats.skin);
eHead.position.y=2.02; eHead.castShadow=true; elaraGroup.add(eHead);
// Hair (top + back bun)
const eHairTop = new THREE.Mesh(new THREE.BoxGeometry(.52,.18,.52), elaraMats.hair);
eHairTop.position.y=2.32; elaraGroup.add(eHairTop);
const eHairBack = new THREE.Mesh(new THREE.BoxGeometry(.42,.3,.18), elaraMats.hair);
eHairBack.position.set(0,2.08,-.28); elaraGroup.add(eHairBack);
// Bun
const eHairBun = new THREE.Mesh(new THREE.SphereGeometry(.12,6,5), elaraMats.hair);
eHairBun.position.set(0,2.28,-.28); elaraGroup.add(eHairBun);
// Arms
const eArmL = new THREE.Mesh(new THREE.BoxGeometry(.2,.68,.2), elaraMats.coat);
eArmL.position.set(-.45,1.16,0); elaraGroup.add(eArmL);
const eArmR = eArmL.clone();
eArmR.position.set(.45,1.16,0); elaraGroup.add(eArmR);
// Legs
const eLegL = new THREE.Mesh(new THREE.BoxGeometry(.26,.75,.26), elaraMats.belt);
const eLegR = eLegL.clone();
eLegL.position.set(-.17,.33,0); eLegR.position.set(.17,.33,0);
elaraGroup.add(eLegL, eLegR);
// Soft green aura light
const elaraLight = new THREE.PointLight(0x44ff88, 1.2, 10);
elaraLight.position.y = 2.5;
elaraGroup.add(elaraLight);

elaraGroup.position.set(ELARA_X, 0, ELARA_Z);
elaraGroup.rotation.y = Math.PI * 0.15; // face slightly toward spawn
scene.add(elaraGroup);

// Floating "!" indicator mesh above Elara
const bangGeo = new THREE.BoxGeometry(.12,.4,.08);
const bangMat = new THREE.MeshBasicMaterial({color:0xffdd00});
const bangMesh = new THREE.Mesh(bangGeo, bangMat);
bangMesh.position.set(ELARA_X, 3.6, ELARA_Z);
scene.add(bangMesh);

// ── DIALOGUE SYSTEM ──
let dialogueOpen = false;
let elaraPhase = 'main'; // 'main' | 'heal' | 'healed' | 'full'

const dlgTexts = {
  main:   `"Welcome, traveller. These lands grow darker with each passing night.\n\nI am Elara — medic and keeper of this sanctuary. How may I help you?"`,
  heal:   `"You look battered. I can tend to your wounds and restore your hitpoints fully.\n\nShall I heal you?"`,
  healed: `"There. Rest a moment before venturing out again.\n\nThe dead walk in greater numbers after dusk — return here when the horde rises."`,
  full:   `"You are in good health, friend. No healing needed just yet.\n\nStay safe out there."`,
  bye:    `"Safe travels. Return anytime you need aid."`,
};

function openDialogue(phase){
  closePanel(); closeMerchant(); closeTestShop();
  elaraPhase = phase || 'main';
  dialogueOpen = true;
  document.getElementById('dialogueBox').classList.add('open');
  renderDialogue();
  // Hide the talk prompt while dialogue is open
  document.getElementById('talkPrompt').style.display='none';
}

function closeDialogue(){
  dialogueOpen = false;
  document.getElementById('dialogueBox').classList.remove('open');
}

function renderDialogue(){
  const textEl = document.getElementById('dlgText');
  const optsEl = document.getElementById('dlgOptions');

  textEl.innerText = dlgTexts[elaraPhase] || dlgTexts.main;
  optsEl.innerHTML = '';

  const makeBtn = (label, cls, cb) => {
    const b = document.createElement('button');
    b.className = `dlg-btn ${cls}`;
    b.textContent = label;
    b.addEventListener('click', cb);
    b.addEventListener('touchend', e => { e.preventDefault(); cb(); }, {passive:false});
    optsEl.appendChild(b);
  };

  if(elaraPhase === 'main'){
    makeBtn('💊 "Could you heal me?"', 'yes', () => {
      if(player.hp >= player.maxHp){ openDialogue('full'); }
      else { openDialogue('heal'); }
    });
    makeBtn('👋 "Farewell, Elara."', 'no', () => {
      openDialogue('bye');
      setTimeout(closeDialogue, 1800);
    });
  } else if(elaraPhase === 'heal'){
    makeBtn('✦ Yes, please heal me.', 'yes', () => {
      // Full heal
      const missing = player.maxHp - player.hp;
      player.hp = player.maxHp;
      gainXp('hitpoints', missing * 0.1);
      spawnHitsplat(PG.position.clone().add(new THREE.Vector3(0,2.8,0)), missing, 'hs-h');
      addLog(`Elara healed you for ${missing} HP.`, 'h');
      openDialogue('healed');
    });
    makeBtn('✕ No, I am fine.', 'no', () => openDialogue('main'));
  } else if(elaraPhase === 'healed' || elaraPhase === 'full'){
    makeBtn('✦ Thank you, Elara.', 'close-btn', () => closeDialogue());
  } else if(elaraPhase === 'bye'){
    // auto-close handled by setTimeout
  }
}

// Close button
document.getElementById('dlgClose').addEventListener('click', closeDialogue);
document.getElementById('dlgClose').addEventListener('touchend', e => { e.preventDefault(); closeDialogue(); }, {passive:false});

// Talk prompt click/tap
document.getElementById('talkPrompt').addEventListener('click', () => openDialogue('main'));
document.getElementById('talkPrompt').addEventListener('touchend', e => { e.preventDefault(); openDialogue('main'); }, {passive:false});

// ── ALDRIC — MERCHANT NPC ──
const ALDRIC_X = -8, ALDRIC_Z = -4;

// Merchant shop stock
const SHOP_STOCK = [
  {id:'healthHrb', qty:99},
  {id:'healthPot', qty:99},
  {id:'poisVial',  qty:15},
  {id:'ironHelm',  qty:5},
  {id:'leatherAm', qty:5},
  {id:'chainMail', qty:3},
  {id:'bone',      qty:99},
];

// Build Aldric mesh
const aldricMats = {
  robe: new THREE.MeshLambertMaterial({color:0x553311}),
  hat:  new THREE.MeshLambertMaterial({color:0x221108}),
  skin: new THREE.MeshLambertMaterial({color:0xc8905a}),
  belt: new THREE.MeshLambertMaterial({color:0xddaa22}),
  bag:  new THREE.MeshLambertMaterial({color:0x8b5e2a}),
};
const aldricGroup = new THREE.Group();
const aBody = new THREE.Mesh(new THREE.BoxGeometry(.65,1.05,.48), aldricMats.robe);
aBody.position.y=1.22; aBody.castShadow=true; aldricGroup.add(aBody);
const aBelt = new THREE.Mesh(new THREE.BoxGeometry(.67,.14,.5), aldricMats.belt);
aBelt.position.y=.72; aldricGroup.add(aBelt);
// Merchant's bag hanging off side
const aBag = new THREE.Mesh(new THREE.BoxGeometry(.3,.4,.25), aldricMats.bag);
aBag.position.set(.5,.7,0); aldricGroup.add(aBag);
const aHead = new THREE.Mesh(new THREE.BoxGeometry(.52,.52,.52), aldricMats.skin);
aHead.position.y=2.08; aHead.castShadow=true; aldricGroup.add(aHead);
// Merchant hat (tall brim)
const aHatBrim = new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.1,8), aldricMats.hat);
aHatBrim.position.y=2.42; aldricGroup.add(aHatBrim);
const aHatTop = new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.55,8), aldricMats.hat);
aHatTop.position.y=2.74; aldricGroup.add(aHatTop);
const aArmL = new THREE.Mesh(new THREE.BoxGeometry(.2,.7,.2), aldricMats.robe);
aArmL.position.set(-.45,1.18,0); aldricGroup.add(aArmL);
const aArmR = aArmL.clone(); aArmR.position.set(.45,1.18,0); aldricGroup.add(aArmR);
const aLegL = new THREE.Mesh(new THREE.BoxGeometry(.26,.75,.26), aldricMats.robe);
const aLegR = aLegL.clone();
aLegL.position.set(-.17,.33,0); aLegR.position.set(.17,.33,0);
aldricGroup.add(aLegL, aLegR);
const aldricLight = new THREE.PointLight(0xddaa22, 0.9, 8);
aldricLight.position.y=2.5; aldricGroup.add(aldricLight);
aldricGroup.position.set(ALDRIC_X, 0, ALDRIC_Z);
aldricGroup.rotation.y = Math.PI * 0.6;
scene.add(aldricGroup);

// Floating coin "!" above Aldric
const coinBangGeo = new THREE.BoxGeometry(.18,.18,.08);
const coinBangMat = new THREE.MeshBasicMaterial({color:0xddaa00});
const coinBangMesh = new THREE.Mesh(coinBangGeo, coinBangMat);
coinBangMesh.position.set(ALDRIC_X, 3.7, ALDRIC_Z);
scene.add(coinBangMesh);

// ── TEST SHOP NPC ──
const TEST_X = 10, TEST_Z = -6;
// Purple-robed dev figure
const testMats = {
  robe: new THREE.MeshLambertMaterial({color:0x441166}),
  skin: new THREE.MeshLambertMaterial({color:0xc8905a}),
  trim: new THREE.MeshLambertMaterial({color:0xaa44ff}),
  eye:  new THREE.MeshLambertMaterial({color:0x00ffaa}),
};
const testGroup = new THREE.Group();
const tBody = new THREE.Mesh(new THREE.BoxGeometry(.65,1.05,.48), testMats.robe);
tBody.position.y=1.22; tBody.castShadow=true; testGroup.add(tBody);
const tTrim = new THREE.Mesh(new THREE.BoxGeometry(.67,.12,.5), testMats.trim);
tTrim.position.y=.74; testGroup.add(tTrim);
const tHead = new THREE.Mesh(new THREE.BoxGeometry(.52,.52,.52), testMats.skin);
tHead.position.y=2.08; tHead.castShadow=true; testGroup.add(tHead);
const tEyeL = new THREE.Mesh(new THREE.BoxGeometry(.1,.08,.06), testMats.eye);
tEyeL.position.set(-.12,2.1,.28); testGroup.add(tEyeL);
const tEyeR = tEyeL.clone(); tEyeR.position.set(.12,2.1,.28); testGroup.add(tEyeR);
// Hood
const tHood = new THREE.Mesh(new THREE.CylinderGeometry(.34,.38,.45,8), testMats.robe);
tHood.position.y=2.32; testGroup.add(tHood);
const tHoodBrim = new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,8), testMats.robe);
tHoodBrim.position.y=2.1; testGroup.add(tHoodBrim);
const tArmL = new THREE.Mesh(new THREE.BoxGeometry(.2,.7,.2), testMats.robe);
tArmL.position.set(-.45,1.18,0); testGroup.add(tArmL);
const tArmR = tArmL.clone(); tArmR.position.set(.45,1.18,0); testGroup.add(tArmR);
const tLegL = new THREE.Mesh(new THREE.BoxGeometry(.26,.75,.26), testMats.robe);
const tLegR = tLegL.clone();
tLegL.position.set(-.17,.33,0); tLegR.position.set(.17,.33,0);
testGroup.add(tLegL, tLegR);
const testLight = new THREE.PointLight(0xaa44ff, 1.1, 7);
testLight.position.y=2.5; testGroup.add(testLight);
testGroup.position.set(TEST_X, 0, TEST_Z);
testGroup.rotation.y = Math.PI * 1.1;
scene.add(testGroup);
// Floating flask above test NPC
const testFlaskGeo = new THREE.SphereGeometry(.14, 6, 6);
const testFlaskMat = new THREE.MeshBasicMaterial({color:0xcc66ff});
const testFlaskMesh = new THREE.Mesh(testFlaskGeo, testFlaskMat);
testFlaskMesh.position.set(TEST_X, 3.7, TEST_Z);
scene.add(testFlaskMesh);

// ── BANK CHEST (safe zone storage) ──
{
  const bg = new THREE.Group();
  // Chest body
  const cBody = new THREE.Mesh(new THREE.BoxGeometry(1.2,.7,0.8), new THREE.MeshLambertMaterial({color:0x2a1a0a}));
  cBody.position.y=.35; cBody.castShadow=true; bg.add(cBody);
  // Chest lid
  const cLid = new THREE.Mesh(new THREE.BoxGeometry(1.2,.35,0.8), new THREE.MeshLambertMaterial({color:0x3a2510}));
  cLid.position.y=.875; cLid.castShadow=true; bg.add(cLid);
  // Metal bands
  const bMat = new THREE.MeshLambertMaterial({color:0x4499dd});
  [-0.35,0.35].forEach(bz=>{
    const band=new THREE.Mesh(new THREE.BoxGeometry(1.22,.08,.06),bMat);
    band.position.set(0,.35,bz); bg.add(band);
  });
  const lock=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.12),bMat);
  lock.position.set(0,.75,0.42); bg.add(lock);
  // Glow
  const bankLight=new THREE.PointLight(0x2266cc,.5,4);
  bankLight.position.y=1.5; bg.add(bankLight);
  bg.position.set(BANK_X,0,BANK_Z);
  scene.add(bg);
}

// ── MERCHANT DIALOGUE ──
let shopTab = 'buy';
let merchantOpen = false;

function openMerchant(){
  closePanel(); closeDialogue(); closeTestShop();
  merchantOpen = true;
  dialogueOpen = true;
  document.getElementById('dlgAvatar').textContent = '🛒';
  document.getElementById('dlgName').textContent = 'ALDRIC';
  document.getElementById('dlgTitle').textContent = 'MERCHANT · SAFE ZONE';
  document.getElementById('dialogueBox').classList.add('open');
  document.getElementById('talkPromptMerch').style.display='none';
  renderShop();
}

function closeMerchant(){
  merchantOpen = false;
  dialogueOpen = false;
  document.getElementById('dialogueBox').classList.remove('open');
}

function renderShop(){
  const coins = countCoins();
  let h = `<div class="shop-gold">🪙 ${coins} Gold Coins</div>`;
  h += `<div class="shop-tabs">
    <div class="shop-tab ${shopTab==='buy'?'on':''}" id="stBuy">BUY</div>
    <div class="shop-tab ${shopTab==='sell'?'on':''}" id="stSell">SELL</div>
  </div><div class="shop-list">`;

  if(shopTab === 'buy'){
    for(const s of SHOP_STOCK){
      const def = ITEM_DEFS[s.id]; if(!def) continue;
      const canAfford = coins >= def.buy;
      h += `<div class="shop-item">
        <span class="shop-item-ico">${def.icon}</span>
        <div class="shop-item-info">
          <div class="shop-item-name">${def.name}</div>
          <div class="shop-item-desc">${def.desc}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div class="shop-price">🪙${def.buy}</div>
          <button class="shop-btn" data-buy="${s.id}" ${canAfford&&s.qty>0?'':'disabled'}>BUY</button>
        </div>
      </div>`;
    }
  } else {
    let hasItems = false;
    for(let i=0;i<28;i++){
      const slot = inventory[i]; if(!slot) continue;
      const def = ITEM_DEFS[slot.id]; if(!def||def.sell===0) continue;
      hasItems = true;
      h += `<div class="shop-item">
        <span class="shop-item-ico">${def.icon}</span>
        <div class="shop-item-info">
          <div class="shop-item-name">${def.name}${slot.qty>1?' x'+slot.qty:''}</div>
          <div class="shop-item-desc">${def.desc}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div class="shop-price">🪙${def.sell}</div>
          <button class="shop-btn sell" data-sell="${i}">SELL</button>
        </div>
      </div>`;
    }
    if(!hasItems) h += `<div style="color:#555;font-size:8px;padding:14px;text-align:center;">Nothing to sell.</div>`;
  }
  h += '</div>';
  // Close button
  h += `<button class="dlg-btn close-btn" id="shopClose" style="margin-top:12px">✕ Leave</button>`;
  document.getElementById('dlgText').innerHTML = '';
  document.getElementById('dlgOptions').innerHTML = h;

  // JS touch scroll for shop list (CSS touch-action override is blocked by parent * selector)
  requestAnimationFrame(()=>{
    const sl=document.querySelector('.shop-list');
    if(!sl)return;
    let sy=0,st=0;
    sl.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;st=sl.scrollTop;e.stopPropagation();},{passive:true});
    sl.addEventListener('touchmove',e=>{sl.scrollTop=st+(sy-e.touches[0].clientY);e.stopPropagation();},{passive:true});
  });

  // Tab listeners
  document.getElementById('stBuy').addEventListener('click',()=>{shopTab='buy';renderShop();});
  document.getElementById('stSell').addEventListener('click',()=>{shopTab='sell';renderShop();});
  document.getElementById('shopClose').addEventListener('click', closeMerchant);

  // Buy listeners
  document.querySelectorAll('[data-buy]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=btn.dataset.buy; const def=ITEM_DEFS[id];
      if(countCoins()<def.buy){showNotif('Not enough gold!');return;}
      spendCoins(def.buy);
      addToInventory(id,1);
      addLog(`Bought ${def.icon} ${def.name} for ${def.buy} coins.`,'i');
      showNotif(`Bought ${def.name}`);
      saveGame();
      renderShop();
    });
  });
  // Sell listeners
  document.querySelectorAll('[data-sell]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const slotIdx=parseInt(btn.dataset.sell);
      const slot=inventory[slotIdx]; if(!slot) return;
      const def=ITEM_DEFS[slot.id];
      addToInventory('coin', def.sell);
      inventory[slotIdx].qty--;
      if(inventory[slotIdx].qty<=0) inventory[slotIdx]=null;
      addLog(`Sold ${def.icon} ${def.name} for ${def.sell} coins.`,'i');
      showNotif(`Sold ${def.name} +${def.sell}🪙`);
      saveGame();
      renderShop();
    });
  });
}

document.getElementById('dlgClose').addEventListener('click', ()=>{ closeDialogue(); closeMerchant(); closeTestShop(); });
document.getElementById('dlgClose').addEventListener('touchend', e=>{ e.preventDefault(); closeDialogue(); closeMerchant(); closeTestShop(); },{passive:false});
document.getElementById('talkPromptMerch').addEventListener('click', openMerchant);
document.getElementById('talkPromptMerch').addEventListener('touchend', e=>{ e.preventDefault(); openMerchant(); },{passive:false});

// ── TEST SHOP ──
let testShopOpen = false;

// Auto-stock: every item in ITEM_DEFS, qty 99, price 0 (free)
function getTestStock(){
  return Object.keys(ITEM_DEFS).map(id=>({id,qty:99}));
}

function openTestShop(){
  closePanel(); closeDialogue(); closeMerchant();
  testShopOpen = true;
  dialogueOpen = true;
  document.getElementById('dlgAvatar').textContent = '🧪';
  document.getElementById('dlgName').textContent = 'ZARA';
  document.getElementById('dlgTitle').textContent = 'TEST SHOP · ALL ITEMS · FREE';
  document.getElementById('dialogueBox').classList.add('open');
  document.getElementById('talkPromptTest').style.display = 'none';
  renderTestShop();
}

function closeTestShop(){
  testShopOpen = false;
  dialogueOpen = false;
  document.getElementById('dialogueBox').classList.remove('open');
}

function renderTestShop(){
  let h = `<div class="shop-gold" style="color:#cc66ff">🧪 Test Shop — All items FREE</div>`;
  h += `<div class="shop-list" style="max-height:320px">`;
  // Give coins button at top
  h += `<div class="shop-item">
    <span class="shop-item-ico">🪙</span>
    <div class="shop-item-info">
      <div class="shop-item-name">Give 1000 Coins</div>
      <div class="shop-item-desc">Add 1000 gold to your inventory.</div>
    </div>
    <button class="shop-btn" id="tsGiveCoins">GIVE</button>
  </div>`;
  // Unlock dash button
  if(!dashUnlocked){
    h += `<div class="shop-item">
      <span class="shop-item-ico">⚡</span>
      <div class="shop-item-info">
        <div class="shop-item-name">Unlock Dash</div>
        <div class="shop-item-desc">Instantly learn the Dash ability.</div>
      </div>
      <button class="shop-btn" id="tsUnlockDash">GIVE</button>
    </div>`;
  }
  for(const s of getTestStock()){
    const def = ITEM_DEFS[s.id]; if(!def) continue;
    h += `<div class="shop-item">
      <span class="shop-item-ico">${def.icon}</span>
      <div class="shop-item-info">
        <div class="shop-item-name">${def.name}</div>
        <div class="shop-item-desc">${def.desc}</div>
      </div>
      <button class="shop-btn" style="background:rgba(140,40,200,.6);border-color:rgba(160,80,220,.5)" data-tsbuy="${s.id}">GET</button>
    </div>`;
  }
  h += `</div>`;
  h += `<button class="dlg-btn close-btn" id="tsClose" style="margin-top:12px">✕ Leave</button>`;
  document.getElementById('dlgText').innerHTML = '';
  document.getElementById('dlgOptions').innerHTML = h;

  // Scroll
  requestAnimationFrame(()=>{
    const sl=document.querySelector('.shop-list');
    if(!sl)return;
    let sy=0,st=0;
    sl.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;st=sl.scrollTop;e.stopPropagation();},{passive:true});
    sl.addEventListener('touchmove',e=>{sl.scrollTop=st+(sy-e.touches[0].clientY);e.stopPropagation();},{passive:true});
  });

  document.getElementById('tsClose').addEventListener('click', closeTestShop);
  const gcBtn = document.getElementById('tsGiveCoins');
  if(gcBtn) gcBtn.addEventListener('click',()=>{ addToInventory('coin',1000); saveGame(); addLog('🧪 +1000 coins given.','i'); showNotif('+1000 🪙'); renderTestShop(); });
  const udBtn = document.getElementById('tsUnlockDash');
  if(udBtn) udBtn.addEventListener('click',()=>{ unlockDash(); renderTestShop(); });
  document.querySelectorAll('[data-tsbuy]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=btn.dataset.tsbuy; const def=ITEM_DEFS[id]; if(!def) return;
      addToInventory(id,1);
      addLog(`🧪 Got ${def.icon} ${def.name}.`,'i');
      showNotif(`Got ${def.name}`);
      saveGame();
    });
  });
}

document.getElementById('talkPromptTest').addEventListener('click', openTestShop);
document.getElementById('talkPromptTest').addEventListener('touchend', e=>{ e.preventDefault(); openTestShop(); },{passive:false});

// ── ENEMIES ──
// Tiered by distance from spawn — 3/4 hits near spawn, stronger further out
const enemies=[];
const NPC_NAMES=['Shade','Wraith','Revenant','Banshee','Spectre','Lich','Ghoul','Wight'];

// Attack pattern types: 'slam' | 'charge' | 'orbit' | 'summon_ring'
// Charge: enemy telegraphs, then dashes straight through player in a line
// Orbit: enemy circles player rapidly then closes in — hard to track
// Ring: enemy backs off and spawns a ring of AoE markers that close inward

const ATTACK_PATTERNS = {
  1: ['slam'],                         // tier1: only slam
  2: ['slam','charge'],                // tier2: slam or charge
  3: ['slam','charge','orbit'],        // tier3: all patterns
  4: ['charge','orbit','summon_ring'], // elite: hardest patterns
};

// Active special attacks beyond slams
const activeCharges = []; // {enemy, phase, timer, ox,oz, tx,tz, dirX,dirZ, mesh, light}
const activeRings   = []; // {enemy, phase, timer, cx,cz, markers:[{mesh,angle}], radius}

function pickPattern(tier){
  const opts = ATTACK_PATTERNS[Math.min(tier,4)] || ['slam'];
  return opts[Math.floor(Math.random()*opts.length)];
}

// ── CHARGE ATTACK ──
const CHARGE_WINDUP = 1.0;
const CHARGE_SPEED  = 22;   // units/sec during dash
const CHARGE_WIDTH  = 1.2;
const CHARGE_LEN    = 16;

function startCharge(enemy){
  const dx=player.x-enemy.position.x, dz=player.z-enemy.position.z;
  const len=Math.hypot(dx,dz)||1;
  const dirX=dx/len, dirZ=dz/len;

  // Red arrow indicator on ground
  const arrowGeo = new THREE.PlaneGeometry(CHARGE_WIDTH*2, CHARGE_LEN);
  const arrowMat = new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:0.35,side:THREE.DoubleSide,depthWrite:false});
  const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
  arrowMesh.rotation.x = -Math.PI/2;
  arrowMesh.position.set(enemy.position.x+dirX*CHARGE_LEN/2, 0.06, enemy.position.z+dirZ*CHARGE_LEN/2);
  arrowMesh.rotation.z = -Math.atan2(dirX,dirZ);
  scene.add(arrowMesh);

  const chLight = new THREE.PointLight(0xff6600,0,10);
  scene.add(chLight);

  activeCharges.push({
    enemy, phase:'windup', timer:0,
    ox:enemy.position.x, oz:enemy.position.z,
    dirX, dirZ,
    arrowMesh, arrowMat, chLight,
    hit:false,
  });
}

function updateCharges(dt){
  for(let i=activeCharges.length-1;i>=0;i--){
    const c=activeCharges[i]; c.timer+=dt;
    if(c.phase==='windup'){
      c.arrowMat.opacity=0.2+0.25*Math.abs(Math.sin(c.timer*Math.PI*4));
      if(c.enemy&&!c.enemy.userData.dead){
        c.enemy.scale.x=1+c.timer/CHARGE_WINDUP*.4;
        c.enemy.scale.z=0.7-c.timer/CHARGE_WINDUP*.2;
      }
      if(c.timer>=CHARGE_WINDUP){
        c.phase='dash'; c.timer=0;
        c.cx=c.ox; c.cz=c.oz;
        if(c.enemy&&!c.enemy.userData.dead){c.enemy.scale.set(1,1,1);}
      }
    } else if(c.phase==='dash'){
      const speed=CHARGE_SPEED*dt;
      c.cx+=c.dirX*speed; c.cz+=c.dirZ*speed;
      if(c.enemy&&!c.enemy.userData.dead){
        c.enemy.position.x=c.cx; c.enemy.position.z=c.cz;
        c.enemy.position.y=getGroundY(c.cx,c.cz);
      }
      c.chLight.position.set(c.cx,1,c.cz);
      c.chLight.intensity=3*(1-c.timer/(CHARGE_LEN/CHARGE_SPEED));
      // Hit check
      if(!c.hit){
        const px=player.x-c.cx, pz=player.z-c.cz;
        const along=px*c.dirX+pz*c.dirZ;
        const perp=Math.abs(px*c.dirZ-pz*c.dirX);
        if(Math.abs(along)<1.5&&perp<CHARGE_WIDTH){
          c.hit=true;
          const tier=c.enemy?c.enemy.userData.tier:1;
          const dmg=tier*4+Math.floor(Math.random()*6);
          player.hp=Math.max(0,player.hp-dmg);
          gainXp('defence',dmg*2);
          spawnHitsplat(PG.position.clone().add(new THREE.Vector3(0,2.8,0)),dmg,'hs-p');
          addLog(`${c.enemy?c.enemy.userData.name:'Enemy'} charged through you for ${dmg}!`,'d');
        }
      }
      const dist=Math.hypot(c.cx-c.ox,c.cz-c.oz);
      if(dist>=CHARGE_LEN){c.phase='done';c.timer=0;c.chLight.intensity=0;}
    } else {
      c.arrowMat.opacity=Math.max(0,0.35*(1-c.timer/.4));
      if(c.timer>=.4){
        scene.remove(c.arrowMesh); scene.remove(c.chLight);
        activeCharges.splice(i,1);
      }
    }
  }
}

// ── ORBIT ATTACK ──
// Enemy spirals around player, then slams when orbit completes
const activeOrbits=[];
const ORBIT_DURATION=2.8, ORBIT_RADIUS=5, ORBIT_SPEED=Math.PI*2/ORBIT_DURATION;

function startOrbit(enemy){
  const startAngle=Math.atan2(enemy.position.x-player.x, enemy.position.z-player.z);
  // Faint circle indicator
  const circGeo=new THREE.RingGeometry(ORBIT_RADIUS-.15,ORBIT_RADIUS+.15,32);
  const circMat=new THREE.MeshBasicMaterial({color:0xaa00ff,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false});
  const circMesh=new THREE.Mesh(circGeo,circMat);
  circMesh.rotation.x=-Math.PI/2; circMesh.position.y=0.05;
  scene.add(circMesh);
  activeOrbits.push({enemy,timer:0,angle:startAngle,circMesh,circMat,slammed:false});
}

function updateOrbits(dt){
  for(let i=activeOrbits.length-1;i>=0;i--){
    const o=activeOrbits[i]; o.timer+=dt;
    if(o.enemy&&!o.enemy.userData.dead){
      o.angle+=ORBIT_SPEED*dt;
      o.enemy.position.x=player.x+Math.sin(o.angle)*ORBIT_RADIUS;
      o.enemy.position.z=player.z+Math.cos(o.angle)*ORBIT_RADIUS;
      o.enemy.position.y=getGroundY(o.enemy.position.x,o.enemy.position.z);
      o.enemy.rotation.y=Math.atan2(player.x-o.enemy.position.x,player.z-o.enemy.position.z);
      o.circMesh.position.set(player.x,0.05,player.z);
      o.circMat.opacity=.25+.15*Math.sin(o.timer*Math.PI*3);
    }
    if(o.timer>=ORBIT_DURATION&&!o.slammed){
      o.slammed=true;
      if(o.enemy&&!o.enemy.userData.dead) startSlam(o.enemy);
      showSlamWarn();
    }
    if(o.timer>=ORBIT_DURATION+2.0){
      o.circMat.opacity=Math.max(0,o.circMat.opacity-.05);
      if(o.timer>=ORBIT_DURATION+2.5){ scene.remove(o.circMesh); activeOrbits.splice(i,1); }
    }
  }
}

// ── RING AoE ATTACK ──
const activeRingAtks=[];
const RING_WINDUP=1.5, RING_RADIUS_START=8, RING_RADIUS_END=1.5;

function startRingAtk(enemy){
  const cx=player.x, cz=player.z;
  const markerCount=8;
  const markers=[];
  for(let i=0;i<markerCount;i++){
    const a=(i/markerCount)*Math.PI*2;
    const mGeo=new THREE.BoxGeometry(.8,.5,.8);
    const mMat=new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:.7,depthWrite:false});
    const m=new THREE.Mesh(mGeo,mMat);
    m.position.set(cx+Math.sin(a)*RING_RADIUS_START,0.25,cz+Math.cos(a)*RING_RADIUS_START);
    scene.add(m);
    markers.push({mesh:m,mat:mMat,angle:a});
  }
  const rl=new THREE.PointLight(0xff2200,2,20);
  rl.position.set(cx,1,cz); scene.add(rl);
  activeRingAtks.push({enemy,timer:0,cx,cz,markers,rl,hit:false});
}

function updateRingAtks(dt){
  for(let i=activeRingAtks.length-1;i>=0;i--){
    const r=activeRingAtks[i]; r.timer+=dt;
    const prog=Math.min(r.timer/RING_WINDUP,1);
    const curR=RING_RADIUS_START+(RING_RADIUS_END-RING_RADIUS_START)*prog;
    r.rl.intensity=2*(1-prog*.5);
    for(const m of r.markers){
      m.mesh.position.set(r.cx+Math.sin(m.angle)*curR,0.25+Math.sin(r.timer*8)*.1,r.cz+Math.cos(m.angle)*curR);
      m.mat.opacity=.5+.4*Math.abs(Math.sin(r.timer*Math.PI*3));
    }
    if(r.timer>=RING_WINDUP&&!r.hit){
      r.hit=true;
      const pdist=Math.hypot(player.x-r.cx,player.z-r.cz);
      if(pdist<RING_RADIUS_END+1.5){
        const tier=r.enemy?r.enemy.userData.tier:1;
        const dmg=tier*5+Math.floor(Math.random()*8);
        player.hp=Math.max(0,player.hp-dmg);
        gainXp('defence',dmg*2);
        spawnHitsplat(PG.position.clone().add(new THREE.Vector3(0,2.8,0)),dmg,'hs-p');
        addLog(`Ring of ruin hit you for ${dmg}! Step outside the ring next time.`,'d');
      } else {
        showNotif('Ring dodged! ✦'); gainXp('agility',12);
      }
    }
    if(r.timer>=RING_WINDUP+.6){
      for(const m of r.markers) scene.remove(m.mesh);
      scene.remove(r.rl);
      activeRingAtks.splice(i,1);
    }
  }
}

function makeEnemy(x,z,forceTier){
  const dist=Math.hypot(x,z);
  const tier = forceTier || (dist<40 ? 1 : dist<90 ? 2 : dist<150 ? 3 : 4);
  const pattern = pickPattern(tier);
  const g=new THREE.Group();
  const sc=0.85+tier*.18;

  // Pattern-specific colour palette
  let bodyCol,eyeCol,eyeEmit,glowCol,cloakCol;
  switch(pattern){
    case 'charge':
      bodyCol=0x3a1800;eyeCol=0xff8800;eyeEmit=0xcc5500;glowCol=0x993300;cloakCol=0x2a1000;break;
    case 'orbit':
      bodyCol=0x051a38;eyeCol=0x00ccff;eyeEmit=0x0088cc;glowCol=0x003388;cloakCol=0x031228;break;
    case 'summon_ring':
      bodyCol=0x051a0d;eyeCol=0x00ff88;eyeEmit=0x00cc66;glowCol=0x004422;cloakCol=0x031208;break;
    default:
      bodyCol=0x441020;eyeCol=0xff4400;eyeEmit=0xcc2200;glowCol=0x550022;cloakCol=0x330818;
  }
  const bodyMat  = new THREE.MeshLambertMaterial({color:bodyCol});
  const eyeMat   = new THREE.MeshLambertMaterial({color:eyeCol,emissive:eyeEmit,emissiveIntensity:1.2});
  const cloakMat = new THREE.MeshLambertMaterial({color:cloakCol});

  const body=new THREE.Mesh(new THREE.SphereGeometry(.78*sc,8,6),bodyMat);
  body.position.y=.9*sc;body.castShadow=true;g.add(body);

  if(pattern==='charge'){
    // Long forward-swept horns
    [-1,1].forEach(s=>{
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.1*sc,.72*sc,4),M.stone);
      horn.position.set(s*.22*sc,1.55*sc,.28*sc);horn.rotation.x=0.65;horn.rotation.z=s*-.18;
      horn.castShadow=true;g.add(horn);
    });
    // Orange aura ring around torso
    const rg=new THREE.TorusGeometry(.88*sc,.055,6,18);
    const rm=new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:.55});
    g.add(new THREE.Mesh(rg,rm)).position||(g.children[g.children.length-1].position.y=.9*sc,g.children[g.children.length-1].rotation.x=Math.PI/2);
  } else if(pattern==='orbit'){
    // Curling horns
    [-1,1].forEach(s=>{
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.13*sc,.65*sc,4),M.stone);
      horn.position.set(s*.38*sc,1.72*sc,0);horn.rotation.z=s*-.82;horn.castShadow=true;g.add(horn);
    });
    // Cyan orbit ring (stored for animation)
    const rg=new THREE.TorusGeometry(1.08*sc,.06,6,20);
    const rm=new THREE.MeshBasicMaterial({color:0x00ccff,transparent:true,opacity:.6});
    const ring=new THREE.Mesh(rg,rm);ring.position.y=.9*sc;g.add(ring);
    g.userData.orbitRing=ring;
  } else if(pattern==='summon_ring'){
    // Crown of 6 spikes
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      const spike=new THREE.Mesh(new THREE.ConeGeometry(.08*sc,.52*sc,4),M.stone);
      spike.position.set(Math.sin(a)*.44*sc,1.65*sc,Math.cos(a)*.44*sc);
      spike.rotation.z=Math.sin(a)*.48;spike.rotation.x=Math.cos(a)*.48;
      spike.castShadow=true;g.add(spike);
    }
    // Green hexagon ring at crown level
    const rg=new THREE.TorusGeometry(.9*sc,.055,6,6);
    const rm=new THREE.MeshBasicMaterial({color:0x00ff88,transparent:true,opacity:.5});
    const ring=new THREE.Mesh(rg,rm);ring.position.y=1.65*sc;g.add(ring);
  } else {
    // Default slam: classic two horns
    [-1,1].forEach(s=>{
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.12*sc,.5*sc,4),M.stone);
      horn.position.set(s*.35*sc,1.6*sc,0);horn.rotation.z=s*-.5;horn.castShadow=true;g.add(horn);
    });
  }

  // Glowing eyes
  [-1,1].forEach(s=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.15*sc,5,4),eyeMat);
    eye.position.set(s*.28*sc,1.05*sc,.72*sc);g.add(eye);
  });
  // Cloak
  const cloak=new THREE.Mesh(new THREE.ConeGeometry(.9*sc,1.4*sc,6),cloakMat);
  cloak.position.y=.3*sc;g.add(cloak);
  // HP bar
  const hpBg=new THREE.Mesh(new THREE.PlaneGeometry(1.5*sc,.16),new THREE.MeshBasicMaterial({color:0x330000,side:THREE.DoubleSide}));
  hpBg.position.y=2.3*sc;hpBg.rotation.x=-Math.PI*.18;g.add(hpBg);
  const hpFg=new THREE.Mesh(new THREE.PlaneGeometry(1.5*sc,.16),new THREE.MeshBasicMaterial({color:0xcc1111,side:THREE.DoubleSide}));
  hpFg.position.set(0,2.3*sc,.01);hpFg.rotation.x=-Math.PI*.18;g.add(hpFg);
  // Point light
  const glow=new THREE.PointLight(glowCol,.6,5);glow.position.y=sc;g.add(glow);

  const maxHp=tier===1?Math.floor(rnd(6,10)):tier===2?Math.floor(rnd(14,22)):tier===3?Math.floor(rnd(28,40)):Math.floor(rnd(60,90));
  const spd=tier===1?rnd(.25,.45):tier===2?rnd(.35,.55):tier===3?rnd(.4,.65):rnd(.5,.7);

  g.position.set(x,0,z);
  const eName=NPC_NAMES[Math.floor(Math.random()*NPC_NAMES.length)]+' (T'+tier+')';
  const tierCol=['','#cc4444','#dd7722','#4488ff','#aa44ff'][Math.min(tier,4)];
  const eLabel=document.createElement('div');
  eLabel.className='enemy-label';eLabel.textContent=eName;
  eLabel.style.color=tierCol;eLabel.style.display='none';
  document.body.appendChild(eLabel);
  g.userData={hp:maxHp,maxHp,speed:spd,aggroRange:rnd(14,26),
    vx:0,vz:0,
    attackCd:2+Math.random()*4,
    dead:false,tier,hpFg,hpBg,sc,
    attackDmg:tier,pattern,
    name:eName,nameLabel:eLabel};
  scene.add(g);enemies.push(g);
}

// ── TEST SPAWN RING — one of each mob, evenly spaced around the safe zone ──
// 7 mobs total at radius 54 (SAFE_RADIUS + 10), equal angular spacing
{
  const R = SAFE_RADIUS + 10;
  const mobs = [
    { kind:'named', type:'skeleton' },
    { kind:'proc',  tier:1 },
    { kind:'named', type:'mage'    },
    { kind:'proc',  tier:2 },
    { kind:'named', type:'archer'  },
    { kind:'proc',  tier:3 },
    { kind:'proc',  tier:4 },
  ];
  mobs.forEach((m, i) => {
    const a = (i / mobs.length) * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    if(m.kind === 'named') makeNamedNPC(x, z, m.type);
    else makeEnemy(x, z, m.tier);
  });
}

// ── NAMED NPC FACTORY ──
// Creates unique enemy meshes for skeleton / mage / archer
function makeNamedNPC(x,z,type){
  const g=new THREE.Group();
  let maxHp,spd,aggroRange,pattern,name,tier,glowCol;

  if(type==='skeleton'){
    maxHp=20;spd=0.42;aggroRange=22;pattern='slam';tier=2;name='Skeleton Warrior';glowCol=0x441100;
    const bone=new THREE.MeshLambertMaterial({color:0xddd5b8});
    const dark=new THREE.MeshLambertMaterial({color:0x998f78});
    const eyeM=new THREE.MeshLambertMaterial({color:0xff2200,emissive:0xcc1100,emissiveIntensity:1.6});
    const rustM=new THREE.MeshLambertMaterial({color:0x886644});
    const hiltM=new THREE.MeshLambertMaterial({color:0x553322});
    // Torso
    const torso=new THREE.Mesh(new THREE.BoxGeometry(.60,.72,.36),bone);
    torso.position.y=1.32;torso.castShadow=true;g.add(torso);
    // Ribs
    for(let r=0;r<3;r++){
      const rib=new THREE.Mesh(new THREE.BoxGeometry(.56,.07,.1),dark);
      rib.position.set(0,1.18+r*.2,.21);g.add(rib);
    }
    // Spine
    const spine=new THREE.Mesh(new THREE.BoxGeometry(.1,.72,.06),dark);
    spine.position.set(0,1.32,-.2);g.add(spine);
    // Head
    const head=new THREE.Mesh(new THREE.BoxGeometry(.50,.46,.47),bone);
    head.position.y=1.98;head.castShadow=true;g.add(head);
    // Jaw
    const jaw=new THREE.Mesh(new THREE.BoxGeometry(.40,.13,.38),bone);
    jaw.position.set(0,1.72,.03);g.add(jaw);
    // Eye sockets
    [-1,1].forEach(s=>{
      const eye=new THREE.Mesh(new THREE.BoxGeometry(.13,.1,.06),eyeM);
      eye.position.set(s*.13,2.01,.26);g.add(eye);
    });
    // Arms
    [-1,1].forEach(s=>{
      const arm=new THREE.Mesh(new THREE.BoxGeometry(.14,.63,.14),bone);
      arm.position.set(s*.42,1.22,0);arm.castShadow=true;g.add(arm);
      const hand=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.16),bone);
      hand.position.set(s*.42,.86,0);g.add(hand);
    });
    // Legs
    [-1,1].forEach(s=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,.68,.16),bone);
      leg.position.set(s*.18,.56,0);leg.castShadow=true;g.add(leg);
      const foot=new THREE.Mesh(new THREE.BoxGeometry(.18,.1,.26),bone);
      foot.position.set(s*.18,.18,.04);g.add(foot);
    });
    // Rusty sword
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.08,.62,.05),rustM);
    blade.position.set(.54,.8,.1);blade.rotation.z=.1;g.add(blade);
    const hilt=new THREE.Mesh(new THREE.BoxGeometry(.22,.07,.07),hiltM);
    hilt.position.set(.54,1.07,.1);g.add(hilt);

  } else if(type==='mage'){
    maxHp=14;spd=0.28;aggroRange=30;pattern='orbit';tier=2;name='Bone Mage';glowCol=0x220055;
    const robeM=new THREE.MeshLambertMaterial({color:0x1a0033});
    const boneM=new THREE.MeshLambertMaterial({color:0xcfc8b0});
    const eyeM2=new THREE.MeshLambertMaterial({color:0x00ccff,emissive:0x0088ff,emissiveIntensity:1.8});
    const staffM=new THREE.MeshLambertMaterial({color:0x3a2a18});
    const orbM=new THREE.MeshLambertMaterial({color:0x9900ff,emissive:0x6600cc,emissiveIntensity:1.3});
    // Robe body
    const robe=new THREE.Mesh(new THREE.CylinderGeometry(.22,.52,1.2,7),robeM);
    robe.position.y=.72;robe.castShadow=true;g.add(robe);
    // Chest
    const chest=new THREE.Mesh(new THREE.BoxGeometry(.54,.58,.36),robeM);
    chest.position.y=1.48;chest.castShadow=true;g.add(chest);
    // Skull
    const skull=new THREE.Mesh(new THREE.BoxGeometry(.47,.44,.45),boneM);
    skull.position.y=2.02;skull.castShadow=true;g.add(skull);
    // Eyes
    [-1,1].forEach(s=>{
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,5,4),eyeM2);
      eye.position.set(s*.12,2.06,.24);g.add(eye);
    });
    // Hood
    const hood=new THREE.Mesh(new THREE.ConeGeometry(.31,.54,7),robeM);
    hood.position.y=2.40;g.add(hood);
    // Sleeves
    [-1,1].forEach(s=>{
      const sl=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.55,5),robeM);
      sl.position.set(s*.40,1.50,0);sl.rotation.z=s*.28;g.add(sl);
    });
    // Staff
    const staffBody=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.62,5),staffM);
    staffBody.position.set(.5,1.38,.06);staffBody.rotation.z=-.18;g.add(staffBody);
    const staffOrb=new THREE.Mesh(new THREE.SphereGeometry(.15,7,6),orbM);
    staffOrb.position.set(.66,2.22,.06);g.add(staffOrb);
    // Magical orbit ring (animated)
    const rg=new THREE.TorusGeometry(.96,.055,6,20);
    const rm=new THREE.MeshBasicMaterial({color:0x9900ff,transparent:true,opacity:.65});
    const ring=new THREE.Mesh(rg,rm);ring.position.y=1.08;g.add(ring);
    g.userData.orbitRing=ring;

  } else if(type==='archer'){
    maxHp=16;spd=0.50;aggroRange=28;pattern='charge';tier=2;name='Skeleton Archer';glowCol=0x114400;
    const boneA=new THREE.MeshLambertMaterial({color:0xd4c89a});
    const leatM=new THREE.MeshLambertMaterial({color:0x5a3a1a});
    const bowM=new THREE.MeshLambertMaterial({color:0x6b4a22});
    const eyeM3=new THREE.MeshLambertMaterial({color:0x88ff44,emissive:0x44cc00,emissiveIntensity:1.4});
    const arwM=new THREE.MeshLambertMaterial({color:0xccaa44});
    // Slim torso
    const torso=new THREE.Mesh(new THREE.BoxGeometry(.50,.68,.33),boneA);
    torso.position.y=1.30;torso.castShadow=true;g.add(torso);
    // Leather tunic
    const tunic=new THREE.Mesh(new THREE.BoxGeometry(.52,.48,.27),leatM);
    tunic.position.set(0,1.36,.04);g.add(tunic);
    // Head
    const head=new THREE.Mesh(new THREE.BoxGeometry(.45,.44,.43),boneA);
    head.position.y=1.96;head.castShadow=true;g.add(head);
    // Green glowing eyes
    [-1,1].forEach(s=>{
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,5,4),eyeM3);
      eye.position.set(s*.12,1.99,.23);g.add(eye);
    });
    // Bone cap
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.25,.27,.18,6),boneA);
    cap.position.y=2.26;g.add(cap);
    // Arms
    [-1,1].forEach(s=>{
      const arm=new THREE.Mesh(new THREE.BoxGeometry(.13,.58,.13),boneA);
      arm.position.set(s*.37,1.22,0);arm.castShadow=true;g.add(arm);
    });
    // Legs
    [-1,1].forEach(s=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.15,.70,.15),boneA);
      leg.position.set(s*.17,.56,0);leg.castShadow=true;g.add(leg);
    });
    // Bow (left hand)
    const bowArc=new THREE.TorusGeometry(.36,.04,5,12,Math.PI);
    const bow=new THREE.Mesh(bowArc,bowM);
    bow.position.set(-.44,1.32,.22);bow.rotation.y=Math.PI*.5;bow.rotation.x=.1;g.add(bow);
    // Bowstring
    const strGeo=new THREE.CylinderGeometry(.008,.008,.72,3);
    const strM=new THREE.MeshLambertMaterial({color:0xddcc88});
    const bowStr=new THREE.Mesh(strGeo,strM);
    bowStr.position.set(-.44,1.32,.26);bowStr.rotation.z=Math.PI*.5;bowStr.rotation.y=Math.PI*.5;g.add(bowStr);
    // Nocked arrow
    const arrowM=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.70,4),arwM);
    arrowM.position.set(-.44,1.42,.22);arrowM.rotation.z=Math.PI*.5;arrowM.rotation.y=Math.PI*.5;g.add(arrowM);
    // Quiver (back)
    const quiver=new THREE.Mesh(new THREE.CylinderGeometry(.08,.07,.44,6),leatM);
    quiver.position.set(.28,1.40,-.20);quiver.rotation.z=.18;g.add(quiver);
  }

  // Shared HP bar
  const sc=1.0;
  const hpBg=new THREE.Mesh(new THREE.PlaneGeometry(1.5*sc,.16),new THREE.MeshBasicMaterial({color:0x330000,side:THREE.DoubleSide}));
  hpBg.position.y=2.78;hpBg.rotation.x=-Math.PI*.18;g.add(hpBg);
  const hpFg=new THREE.Mesh(new THREE.PlaneGeometry(1.5*sc,.16),new THREE.MeshBasicMaterial({color:0xcc1111,side:THREE.DoubleSide}));
  hpFg.position.set(0,2.78,.01);hpFg.rotation.x=-Math.PI*.18;g.add(hpFg);
  // Glow
  const glow=new THREE.PointLight(glowCol,.7,6);glow.position.y=1.2;g.add(glow);

  g.position.set(x,0,z);
  const namedCol={skeleton:'#ddd5b8',mage:'#aa66ff',archer:'#88ff44'}[type]||'#e8c060';
  const nLabel=document.createElement('div');
  nLabel.className='enemy-label';nLabel.textContent=name;
  nLabel.style.color=namedCol;nLabel.style.display='none';
  document.body.appendChild(nLabel);
  g.userData={
    hp:maxHp,maxHp,speed:spd,aggroRange,
    vx:0,vz:0,
    attackCd:3+Math.random()*2,
    dead:false,tier,hpFg,hpBg,sc,
    attackDmg:tier,pattern,name,
    npcType:type,spawnX:x,spawnZ:z,
    nameLabel:nLabel,
  };
  scene.add(g);enemies.push(g);
}

// Spawn the three named NPCs just east of the safe zone
// Named NPCs are now spawned in the test ring above

// ── PLAYER MESH ──
const PG=new THREE.Group();
const pbody=new THREE.Mesh(new THREE.BoxGeometry(.7,1.0,.5),M.player);
pbody.position.y=1.2;pbody.castShadow=true;PG.add(pbody);
const phead=new THREE.Mesh(new THREE.BoxGeometry(.54,.54,.54),M.playerH);
phead.position.y=2.08;phead.castShadow=true;PG.add(phead);
const visor=new THREE.Mesh(new THREE.BoxGeometry(.56,.2,.56),M.player);visor.position.y=2.22;PG.add(visor);
const legL=new THREE.Mesh(new THREE.BoxGeometry(.28,.8,.28),M.playerL);
const legR=legL.clone();
legL.position.set(-.2,.34,0);legR.position.set(.2,.34,0);
legL.castShadow=legR.castShadow=true;PG.add(legL,legR);
const armL=new THREE.Mesh(new THREE.BoxGeometry(.22,.72,.22),M.playerL);
const armR=armL.clone();
armL.position.set(-.5,1.18,0);armR.position.set(.5,1.18,0);PG.add(armL,armR);
// Weapon mesh (right arm child)
const wpnGroup=new THREE.Group();
// Blade
const bladeMesh=new THREE.Mesh(new THREE.BoxGeometry(.08,.7,.06),M.wpnBlade);
bladeMesh.position.y=-.55;wpnGroup.add(bladeMesh);
// Hilt
const hiltMesh=new THREE.Mesh(new THREE.BoxGeometry(.22,.1,.1),M.wpnHilt);
hiltMesh.position.y=-.15;wpnGroup.add(hiltMesh);
wpnGroup.position.set(.5,1.18,0);
PG.add(wpnGroup);
const sdisk=new THREE.Mesh(new THREE.CircleGeometry(.5,10),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.25}));
sdisk.rotation.x=-Math.PI/2;sdisk.position.y=.01;PG.add(sdisk);
// Shoulder pads
const padL=new THREE.Mesh(new THREE.BoxGeometry(.28,.18,.42),M.pad);
padL.position.set(-.48,1.65,0);padL.castShadow=true;PG.add(padL);
const padR=new THREE.Mesh(new THREE.BoxGeometry(.28,.18,.42),M.pad);
padR.position.set(.48,1.65,0);padR.castShadow=true;PG.add(padR);
// Cape
const cape=new THREE.Mesh(new THREE.BoxGeometry(.60,1.15,.06),M.cape);
cape.position.set(0,.82,-.27);cape.castShadow=true;PG.add(cape);
// Belt buckle detail
const belt=new THREE.Mesh(new THREE.BoxGeometry(.72,.1,.52),M.pad);
belt.position.set(0,.72,0);PG.add(belt);
// Boot guards
const bootL=new THREE.Mesh(new THREE.BoxGeometry(.33,.2,.33),M.boot);
bootL.position.set(-.2,-.05,0);bootL.castShadow=true;PG.add(bootL);
const bootR=new THREE.Mesh(new THREE.BoxGeometry(.33,.2,.33),M.boot);
bootR.position.set(.2,-.05,0);bootR.castShadow=true;PG.add(bootR);
scene.add(PG);

// Update weapon mesh shape based on equipped weapon
function updateWeaponMesh(){
  const w=equippedWeapon;
  // Scale blade by weapon type
  if(w.animType==='crush'){
    bladeMesh.scale.set(2.5,1.0,2.5);  // wide hammerhead
    bladeMesh.position.y=-.4;
    hiltMesh.scale.set(1,1,1);
  } else if(w.animType==='slash'){
    bladeMesh.scale.set(1.2,1.5,1);    // longer sword
    bladeMesh.position.y=-.7;
    hiltMesh.scale.set(1.5,1,1);
  } else {
    bladeMesh.scale.set(1,1,1);        // default dagger
    bladeMesh.position.y=-.55;
    hiltMesh.scale.set(1,1,1);
  }
}
updateWeaponMesh();

// Player state
const player={
  x:0,z:0,vx:0,vz:0,vy:0,y:0,angle:0,
  hp:100,maxHp:100,prayer:1,maxPrayer:1,runEnergy:100,
  score:0,jumping:false,attackCd:0,inCombat:false,combatTimer:0,
  speed:0.5,sprintMult:1.55,
  dashCd:0,dashImpX:0,dashImpZ:0,dashTimer:0,dashing:false,
};
player.maxHp=skLv('hitpoints')*10;player.hp=player.maxHp;

// Camera
const camState={yaw:0,pitch:0.38,dist:11};
const CAM_TARGET=new THREE.Vector3();

// ── JOYSTICK ──
const jZone=document.getElementById('jZone');
const jKnob=document.getElementById('jKnob');
const MAX_R=48;
const joy={active:false,id:null,startX:0,startY:0,dx:0,dy:0,mag:0};
jZone.addEventListener('touchstart',e=>{
  e.preventDefault();
  const t=e.changedTouches[0],r=jZone.getBoundingClientRect();
  joy.active=true;joy.id=t.identifier;
  joy.startX=r.left+r.width/2;joy.startY=r.top+r.height/2;
},{passive:false});
jZone.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){if(t.identifier!==joy.id)continue;
    let dx=t.clientX-joy.startX,dy=t.clientY-joy.startY;
    const d=Math.hypot(dx,dy);joy.mag=Math.min(d/MAX_R,1);
    if(d>MAX_R){dx*=MAX_R/d;dy*=MAX_R/d;}
    joy.dx=dx;joy.dy=dy;
    jKnob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}
},{passive:false});
const resetJoy=e=>{
  for(const t of e.changedTouches)if(t.identifier===joy.id){
    joy.active=false;joy.dx=joy.dy=joy.mag=0;
    jKnob.style.transform='translate(-50%,-50%)';}};
jZone.addEventListener('touchend',resetJoy);jZone.addEventListener('touchcancel',resetJoy);

// ── CAMERA DRAG + LOOT TAP ──
const camDrag={active:false,id:null,lx:0,ly:0,moved:false};
document.addEventListener('touchstart',e=>{
  for(const t of e.changedTouches){
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&(el.closest('#jZone')||el.closest('#btns')||el.closest('#sidePanel')||el.closest('#invBtn')||el.closest('#skBtn')||el.closest('#dialogueBox')))continue;
    if(camDrag.active)continue;
    camDrag.active=true;camDrag.id=t.identifier;camDrag.lx=t.clientX;camDrag.ly=t.clientY;camDrag.moved=false;
    hideHint();
  }},{passive:true});
document.addEventListener('touchmove',e=>{
  for(const t of e.changedTouches){if(t.identifier!==camDrag.id)continue;
    const ddx=t.clientX-camDrag.lx,ddy=t.clientY-camDrag.ly;
    if(Math.hypot(ddx,ddy)>4)camDrag.moved=true;
    camState.yaw-=ddx*.007;
    camState.pitch=Math.max(.12,Math.min(1.1,camState.pitch+ddy*.006));
    camDrag.lx=t.clientX;camDrag.ly=t.clientY;}},{passive:true});
document.addEventListener('touchend',e=>{
  for(const t of e.changedTouches){if(t.identifier!==camDrag.id)continue;
    if(!camDrag.moved)tryPickupLoot(t.clientX,t.clientY);
    camDrag.active=false;camDrag.id=null;}},{passive:true});
let mDrag=false,mLx=0,mLy=0,mMoved=false;
document.addEventListener('mousedown',e=>{
  if(e.target.closest('#jZone')||e.target.closest('#btns')||e.target.closest('#sidePanel')||e.target.closest('#invBtn')||e.target.closest('#skBtn'))return;
  mDrag=true;mLx=e.clientX;mLy=e.clientY;mMoved=false;
});
document.addEventListener('mousemove',e=>{if(!mDrag)return;
  const ddx=e.clientX-mLx,ddy=e.clientY-mLy;
  if(Math.hypot(ddx,ddy)>4)mMoved=true;
  camState.yaw-=ddx*.007;
  camState.pitch=Math.max(.12,Math.min(1.1,camState.pitch+ddy*.006));
  mLx=e.clientX;mLy=e.clientY;});
document.addEventListener('mouseup',e=>{if(mDrag&&!mMoved)tryPickupLoot(e.clientX,e.clientY);mDrag=false;});

// Raycaster for loot pickup
const raycaster=new THREE.Raycaster();
const mouse2=new THREE.Vector2();
function tryPickupLoot(cx,cy){
  mouse2.x=(cx/innerWidth)*2-1;mouse2.y=-(cy/innerHeight)*2+1;
  raycaster.setFromCamera(mouse2,camera);
  const meshes=groundLoot.filter(l=>!l.group.userData.picked).map(l=>l.group.children[0]);
  const hits=raycaster.intersectObjects(meshes,false);
  if(!hits.length)return;
  const lootObj=groundLoot.find(l=>l.group.children[0]===hits[0].object&&!l.group.userData.picked);
  if(!lootObj)return;
  if(Math.hypot(lootObj.x-player.x,lootObj.z-player.z)>8){showNotif('TOO FAR AWAY');return;}
  lootObj.group.userData.picked=true;scene.remove(lootObj.group);lootObj.label.remove();
  if(addToInventory(lootObj.itemId)){
    const def=ITEM_DEFS[lootObj.itemId];
    addLog(`Picked up: ${def.icon} ${def.name}`,'i');
    showNotif(`${def.icon} ${def.name}`);
    saveGame();
    if(panelOpen&&activeTab==='inv')renderPanel();
  }
}

// Keyboard
const keys={};
window.addEventListener('keydown',e=>keys[e.key]=true);
window.addEventListener('keyup',e=>keys[e.key]=false);

// Buttons
let isSprinting=false;
document.getElementById('bSprint').addEventListener('touchstart',e=>{e.preventDefault();isSprinting=true;},{passive:false});
document.getElementById('bSprint').addEventListener('touchend',e=>{e.preventDefault();isSprinting=false;},{passive:false});
document.getElementById('bSprint').addEventListener('mousedown',()=>isSprinting=true);
document.getElementById('bSprint').addEventListener('mouseup',()=>isSprinting=false);
document.getElementById('bAtk').addEventListener('touchstart',e=>{e.preventDefault();doAttack();},{passive:false});
document.getElementById('bAtk').addEventListener('mousedown',doAttack);
document.getElementById('bDash').addEventListener('touchstart',e=>{e.preventDefault();doDash();},{passive:false});
document.getElementById('bDash').addEventListener('mousedown',doDash);

function doJump(){
  if(!player.jumping&&player.runEnergy>10){
    player.jumping=true;player.vy=8;player.runEnergy=Math.max(0,player.runEnergy-12);
  }
}

let dashUnlocked=false;
function unlockDash(){
  dashUnlocked=true;
  const btn=document.getElementById('bDash');
  if(btn) btn.style.display='flex';
  saveGame();
  addLog('⚡ Dash ability learned!','x');
  showNotif('⚡ DASH UNLOCKED!');
}
const DASH_SPEED=80,DASH_DUR=0.30,DASH_CD=5.0;
const dashGhosts=[];
function spawnDashGhost(){
  const mat=new THREE.MeshBasicMaterial({color:0x66ccff,transparent:true,opacity:.5,depthWrite:false});
  const g=new THREE.Group();
  const sil=new THREE.Mesh(new THREE.BoxGeometry(.72,1.85,.52),mat);
  sil.position.y=.93;g.add(sil);
  g.position.copy(PG.position);g.rotation.copy(PG.rotation);
  scene.add(g);dashGhosts.push({g,mat,life:.4});
}
const lightningBolts=[];
let dashBoltTimer=0;

function spawnLightningBolt(x,z,angle){
  const BOLT_LEN=6,SEGS=12;
  const perpX=Math.cos(angle),perpZ=-Math.sin(angle);
  const pts=[];
  for(let i=0;i<=SEGS;i++){
    const t=i/SEGS;
    const bx=x-Math.sin(angle)*t*BOLT_LEN;
    const bz=z-Math.cos(angle)*t*BOLT_LEN;
    const jitter=(Math.random()-.5)*.8;
    pts.push(new THREE.Vector3(
      bx+perpX*jitter,
      getGroundY(bx,bz)+.3+Math.random()*1.3,
      bz+perpZ*jitter
    ));
  }
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const mat=new THREE.LineBasicMaterial({color:0x55ddff,transparent:true,opacity:.95});
  const line=new THREE.Line(geo,mat);scene.add(line);

  // Branch forks
  const branches=[];
  for(let b=0;b<2;b++){
    const si=2+Math.floor(Math.random()*(SEGS-3));
    const bp=pts[si];
    const bpts=[bp.clone()];
    for(let k=0;k<3;k++){
      const jb=(Math.random()-.5)*1.4,tb=(Math.random()-.5)*.8;
      bpts.push(new THREE.Vector3(
        bp.x+perpX*jb-Math.sin(angle)*tb,
        bp.y-k*.15+Math.random()*.4,
        bp.z+perpZ*jb-Math.cos(angle)*tb
      ));
    }
    const bgeo=new THREE.BufferGeometry().setFromPoints(bpts);
    const bmat=new THREE.LineBasicMaterial({color:0xaaeeff,transparent:true,opacity:.7});
    const br=new THREE.Line(bgeo,bmat);scene.add(br);
    branches.push({line:br,mat:bmat});
  }

  // Inner bright core line — slightly offset from main
  const corePts=pts.map((p,i)=>{
    const jc=(Math.random()-.5)*.18;
    return new THREE.Vector3(p.x+perpX*jc,p.y,p.z+perpZ*jc);
  });
  const cgeo=new THREE.BufferGeometry().setFromPoints(corePts);
  const cmat=new THREE.LineBasicMaterial({color:0xeefeff,transparent:true,opacity:.7});
  const core=new THREE.Line(cgeo,cmat);scene.add(core);

  // Glow light
  const gl=new THREE.PointLight(0x33aaff,5,9);
  gl.position.set(x,getGroundY(x,z)+1,z);scene.add(gl);

  lightningBolts.push({line,mat,branches,core,cmat,gl,life:.28});
}

function doDash(){
  if(!dashUnlocked||player.dashCd>0||playerDead||player.hp<=0)return;
  player.dashImpX=Math.sin(player.angle)*DASH_SPEED;
  player.dashImpZ=Math.cos(player.angle)*DASH_SPEED;
  player.dashTimer=DASH_DUR;player.dashing=true;player.dashCd=DASH_CD;
  dashBoltTimer=0;
  spawnDashGhost();
  // Initial burst
  spawnLightningBolt(player.x,player.z,player.angle);
  spawnLightningBolt(player.x,player.z,player.angle);
  const bl=new THREE.PointLight(0x44ccff,8,14);
  bl.position.set(player.x,getGroundY(player.x,player.z)+1,player.z);
  scene.add(bl);setTimeout(()=>scene.remove(bl),220);
  showNotif('⚡ DASH!');
}

function doAttack(){
  if(player.attackCd>0){showNotif(`Next attack in ${player.attackCd.toFixed(1)}s`);return;}
  const w=equippedWeapon;
  let hit=false;
  for(const e of enemies){
    if(e.userData.dead)continue;
    const dx=e.position.x-player.x,dz=e.position.z-player.z;
    if(Math.hypot(dx,dz)<5.5){
      const chance=weaponHitChance(w);
      const maxHit=weaponMaxHit(w);
      const dmg=Math.random()<chance?Math.ceil(Math.random()*maxHit):0;
      e.userData.hp-=dmg;
      const nd=Math.hypot(dx,dz)||1;
      e.userData.vx+=(dx/nd)*2.5;e.userData.vz+=(dz/nd)*2.5;
      // XP
      gainXp('attack',dmg*4);gainXp('strength',dmg*4);gainXp('hitpoints',Math.floor(dmg*1.3));
      if(w.type==='magic')gainXp('magic',dmg*3);
      // Hitsplat on enemy
      const eHitPos=e.position.clone().add(new THREE.Vector3(0,2.4*e.userData.sc,0));
      spawnHitsplat(eHitPos,dmg,dmg===0?'hs-m':'hs-e');
      if(dmg===0)addLog(`Missed ${e.userData.name}.`,'');
      else addLog(`${w.name}: ${dmg} on ${e.userData.name}.`,'d');
      // Weapon attack animation
      triggerAtkAnim(w.animType,w.speed);
      // Update HP bar
      const hr=Math.max(0,e.userData.hp/e.userData.maxHp);
      e.userData.hpFg.scale.x=hr;
      e.userData.hpFg.position.x=(hr-1)*.75*e.userData.sc;
      if(e.userData.hp<=0){
        e.userData.dead=true;
        if(e.userData.nameLabel) e.userData.nameLabel.style.display='none';
        // Drop loot
        const table=LOOT_TABLES[Math.min(e.userData.tier,4)]||LOOT_TABLES[1];
        const drops=Math.ceil(Math.random()*e.userData.tier)+1;
        for(let d=0;d<drops;d++){
          const item=table[Math.floor(Math.random()*table.length)];
          spawnLoot(e.position.x+rnd(-1.2,1.2),e.position.z+rnd(-1.2,1.2),item);
        }
        // 1/5 chance: drop Basic Dash Scroll from tier-1 enemies (if not yet unlocked)
        if(e.userData.tier===1&&!dashUnlocked&&Math.random()<0.2){
          spawnLoot(e.position.x+rnd(-1,1),e.position.z+rnd(-1,1),'dashScroll');
          addLog('📜 A scroll tumbles to the ground...','i');
        }
        scene.remove(e);
        player.score+=100*e.userData.tier;
        gainXp('slayer',25*e.userData.tier);
        addLog(`${e.userData.name} slain! Loot dropped.`,'x');
        showNotif(`SLAIN — ${100*e.userData.tier} pts`);
        const _type=e.userData.npcType,_sx=e.userData.spawnX,_sz=e.userData.spawnZ;
        setTimeout(()=>{
          if(_type){ makeNamedNPC(_sx,_sz,_type); }
          else { const a=Math.random()*Math.PI*2,r=rnd(18,180); makeEnemy(Math.cos(a)*r,Math.sin(a)*r); }
        },20000);
      }
      player.attackCd=w.speed;
      player.inCombat=true;player.combatTimer=8;
      hit=true;break;
    }
  }
  if(!hit)showNotif('NO ENEMY IN RANGE');
}

// Weapon attack animation
function triggerAtkAnim(type,duration){
  atkAnim.active=true;atkAnim.timer=0;atkAnim.duration=duration*.45;atkAnim.type=type;
}

// ── NOTIFICATIONS / EFFECTS ──
let notifTimer;
function showNotif(msg){
  const n=document.getElementById('notif');n.textContent=msg;n.classList.add('show');
  clearTimeout(notifTimer);notifTimer=setTimeout(()=>n.classList.remove('show'),2400);
}
function showXpPop(msg){
  const el=document.createElement('div');el.className='xpop';el.textContent=msg;
  el.style.cssText=`left:${38+Math.random()*28}%;top:${28+Math.random()*18}%;`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),1600);
}
let lvlTimer;
function showLvlUp(msg){
  const fl=document.getElementById('lvlFlash');
  document.getElementById('lvlMsg').innerText=msg;
  fl.classList.add('show');clearTimeout(lvlTimer);
  lvlTimer=setTimeout(()=>fl.classList.remove('show'),3000);
}
let hitsplatsThisFrame = 0;
function spawnHitsplat(worldPos,val,cls){
  if(hitsplatsThisFrame >= 3) return; // cap DOM writes per frame
  hitsplatsThisFrame++;
  const v=worldPos.clone();v.project(camera);
  if(v.z>1)return;
  const sx=(v.x*.5+.5)*innerWidth,sy=(-.5*v.y+.5)*innerHeight;
  const el=document.createElement('div');
  el.className=`hitsplat ${cls}`;
  el.textContent=cls==='hs-m'?'0':cls==='hs-b'?'B':val;
  el.style.cssText=`left:${sx-15}px;top:${sy-15}px;`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),950);
}
let hintGone=false;
function hideHint(){if(hintGone)return;hintGone=true;const h=document.getElementById('hint');h.style.opacity='0';setTimeout(()=>h&&h.remove(),1000);}
setTimeout(hideHint,7000);

// ── MINIMAP ──
const mmC=document.getElementById('mmC');
const mm=mmC.getContext('2d');
function drawMinimap(){
  const W=68,H=68,cx=34,cy=34;
  mm.clearRect(0,0,W,H);
  mm.fillStyle='rgba(3,2,1,.94)';mm.beginPath();mm.arc(cx,cy,cx,0,Math.PI*2);mm.fill();
  const sc=W/260;
  for(const c of crystals){if(c.userData.collected)continue;
    const mx=cx+(c.position.x-player.x)*sc,my=cy+(c.position.z-player.z)*sc;
    if(mx<2||mx>W-2||my<2||my>H-2)continue;
    mm.fillStyle='#6644ee';mm.beginPath();mm.arc(mx,my,2,0,Math.PI*2);mm.fill();}
  for(const e of enemies){if(e.userData.dead)continue;
    const mx=cx+(e.position.x-player.x)*sc,my=cy+(e.position.z-player.z)*sc;
    if(mx<2||mx>W-2||my<2||my>H-2)continue;
    const col=e.userData.tier===1?'#cc2233':e.userData.tier===2?'#dd4411':'#ff2200';
    mm.fillStyle=col;mm.beginPath();mm.arc(mx,my,2.5,0,Math.PI*2);mm.fill();}
  for(const l of groundLoot){if(l.group.userData.picked)continue;
    const mx=cx+(l.x-player.x)*sc,my=cy+(l.z-player.z)*sc;
    if(mx<2||mx>W-2||my<2||my>H-2)continue;
    mm.fillStyle='#ddaa00';mm.beginPath();mm.arc(mx,my,2,0,Math.PI*2);mm.fill();}
  mm.fillStyle='#eee';mm.beginPath();mm.arc(cx,cy,3.5,0,Math.PI*2);mm.fill();
  const ax=cx+Math.sin(player.angle)*11,ay=cy-Math.cos(player.angle)*11;
  mm.strokeStyle='#c8a040';mm.lineWidth=1.8;mm.beginPath();mm.moveTo(cx,cy);mm.lineTo(ax,ay);mm.stroke();
  mm.strokeStyle='rgba(160,120,40,.28)';mm.lineWidth=1.5;mm.beginPath();mm.arc(cx,cy,cx-1,0,Math.PI*2);mm.stroke();
}

// ── DAY/NIGHT ──
function updateDayNight(dt){
  DN.time=(DN.time+DN.speed*dt)%1;
  const t=DN.time;
  // t: 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  // Smooth day/night transitions
  // Daylight factor: 0 at night, 1 at noon
  let dayFactor;
  if(t<0.2)      dayFactor=0;                            // midnight-pre-dawn
  else if(t<0.3) dayFactor=(t-0.2)/0.1;                  // dawn 0→1
  else if(t<0.7) dayFactor=1;                            // full day
  else if(t<0.8) dayFactor=1-(t-0.7)/0.1;               // dusk 1→0
  else            dayFactor=0;                            // night
  const nightFactor=1-dayFactor;

  // Sky colour
  const skyDay =new THREE.Color(0x5588cc);
  const skyDusk=new THREE.Color(0x661122);
  const skyNight=new THREE.Color(0x050408);
  let skyCol;
  if(t<0.2||t>0.8) skyCol=skyNight.clone();
  else if(t<0.3){
    skyCol=skyDusk.clone();skyCol.lerp(skyDay,dayFactor);
  } else if(t<0.7) skyCol=skyDay.clone();
  else { skyCol=skyDay.clone();skyCol.lerp(skyDusk,1-dayFactor*2+1); }
  // Simple blend: night sky is very dark
  skyCol.lerp(skyNight,nightFactor*.85);
  scene.background=skyCol;
  fogObj.color.copy(skyCol);

  // Sun light
  sunLight.intensity=dayFactor*1.4;
  // Moon light
  moonLight.intensity=nightFactor*.65;
  // Ambient
  const ambDay=new THREE.Color(0x334466);
  const ambNight=new THREE.Color(0x0a0810);
  ambLight.color.copy(ambNight).lerp(ambDay,dayFactor);
  ambLight.intensity=0.9+dayFactor*0.3;
  // Hemisphere
  hemiLight.color.setHex(dayFactor>0.5?0x224488:0x111122);
  hemiLight.groundColor.setHex(dayFactor>0.5?0x223311:0x050505);
  hemiLight.intensity=0.5+dayFactor*0.5;
  // Stars — visible at night
  starPoints.material.opacity=nightFactor;
  // Ground brightness
  gMat.color.set(dayFactor>0.5?0x2a2218:0x1a1410);
  // Torches brighter at night
  const tIntMult=0.7+nightFactor*1.5;
  torch1.intensity=2.5*tIntMult;torch2.intensity=2.0*tIntMult;

  // Time label
  let timeStr;
  if(t<0.2||t>0.9)     timeStr='MIDNIGHT';
  else if(t<0.3)        timeStr='DAWN';
  else if(t<0.45)       timeStr='MORNING';
  else if(t<0.55)       timeStr='NOON';
  else if(t<0.7)        timeStr='AFTERNOON';
  else if(t<0.8)        timeStr='DUSK';
  else                  timeStr='NIGHT';
  document.getElementById('timeLabel').textContent=timeStr;
}

// ── GAME LOOP ──
const clock=new THREE.Clock();
let legPhase=0,lastRegen=0;

// ── HORDE STATE ──
let isHordeNight = false;  // becomes true at night
let hordeTransitioned = false; // prevents re-triggering mid-cycle

function setHordeMode(active){
  if(isHordeNight === active) return;
  isHordeNight = active;
  if(active){
    addLog('⚠ The night horde awakens! ALL enemies are now hostile.','d');
    showNotif('⚠ HORDE NIGHT — RUN TO SAFE ZONE!');
    // Boost all enemy aggro range and spread them out toward player
    for(const e of enemies){
      if(e.userData.dead) continue;
      e.userData.hordeAggroRange = 999; // see everything at night
    }
  } else {
    addLog('Dawn breaks. The horde retreats.','x');
    showNotif('✦ DAWN — SINGLE COMBAT RESTORED');
    for(const e of enemies){
      if(e.userData.dead) continue;
      e.userData.hordeAggroRange = null; // back to normal
    }
  }
}

// ── SLAM ATTACK SYSTEM ──
const activeSlams = [];
const SLAM_WINDUP   = 1.4;   // windup window (player sees box, must dodge)
const SLAM_STRIKE   = 0.18;  // flash duration when it slams
const SLAM_RANGE    = 10;    // box length along attack direction
const SLAM_WIDTH    = 1.6;   // half-width of the danger box
const SLAM_HEIGHT   = 2.2;   // box height (taller than player for visibility)
const SLAM_FADE     = 0.6;   // fade out duration after strike

let slamWarnTimer = 0;
function showSlamWarn(){
  document.getElementById('slamWarn').classList.add('show');
  slamWarnTimer = SLAM_WINDUP;
}

function startSlam(enemy){
  const dx = player.x - enemy.position.x;
  const dz = player.z - enemy.position.z;
  const len = Math.hypot(dx,dz)||1;
  const dirX = dx/len, dirZ = dz/len;

  // ── WINDUP BOX — solid red transparent box showing the hitbox ──
  const boxW = SLAM_WIDTH*2, boxH = SLAM_HEIGHT, boxD = SLAM_RANGE;
  const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);

  // Solid semi-transparent red fill
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xff2200,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const fillBox = new THREE.Mesh(boxGeo, fillMat);

  // Wireframe edges — bright red lines so the box reads clearly in 3D
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.9,
    wireframe: true,
  });
  const edgeBox = new THREE.Mesh(boxGeo, edgeMat);

  // Group them, rotate to face slam direction, position centred along corridor
  const boxGroup = new THREE.Group();
  boxGroup.add(fillBox);
  boxGroup.add(edgeBox);

  // Box sits with bottom at ground level
  const cx = enemy.position.x + dirX * (SLAM_RANGE/2);
  const cz = enemy.position.z + dirZ * (SLAM_RANGE/2);
  boxGroup.position.set(cx, SLAM_HEIGHT/2, cz);
  // Rotate so the box length faces the slam direction
  boxGroup.rotation.y = Math.atan2(dirX, dirZ);
  scene.add(boxGroup);

  // ── STRIKE FLASH BOX — bright solid box that flashes on impact ──
  const strikeMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const strikeBox = new THREE.Mesh(boxGeo, strikeMat);
  const strikeGroup = new THREE.Group();
  strikeGroup.add(strikeBox);
  strikeGroup.position.copy(boxGroup.position);
  strikeGroup.rotation.copy(boxGroup.rotation);
  scene.add(strikeGroup);

  // Impact light at far end of box
  const slamLight = new THREE.PointLight(0xff3300, 0, 14);
  slamLight.position.set(
    enemy.position.x + dirX * SLAM_RANGE,
    1.5,
    enemy.position.z + dirZ * SLAM_RANGE
  );
  scene.add(slamLight);

  activeSlams.push({
    enemy,
    phase: 'windup',
    timer: 0,
    originX: enemy.position.x,
    originZ: enemy.position.z,
    dirX, dirZ,
    boxGroup, fillMat, edgeMat,
    strikeGroup, strikeMat,
    slamLight,
    hit: false,
  });
}

function updateSlams(dt){
  // DODGE warning timer
  if(slamWarnTimer > 0){
    slamWarnTimer -= dt;
    if(slamWarnTimer <= 0) document.getElementById('slamWarn').classList.remove('show');
  }

  for(let i = activeSlams.length-1; i >= 0; i--){
    const s = activeSlams[i];
    s.timer += dt;

    if(s.phase === 'windup'){
      // Pulse the box opacity to draw attention
      const pulse = 0.15 + 0.18 * Math.abs(Math.sin(s.timer * Math.PI * 3.5));
      s.fillMat.opacity = pulse;
      // Edge lines flicker faster near end of windup
      const urgency = s.timer / SLAM_WINDUP;
      s.edgeMat.opacity = 0.6 + 0.4*Math.abs(Math.sin(s.timer * Math.PI * (2 + urgency*6)));

      // Enemy windup: lean back and swell
      if(s.enemy && !s.enemy.userData.dead){
        s.enemy.rotation.x = -(s.timer/SLAM_WINDUP)*0.55;
        s.enemy.scale.y    =  1 + (s.timer/SLAM_WINDUP)*0.35;
        s.enemy.scale.x    =  1 + (s.timer/SLAM_WINDUP)*0.15;
      }

      if(s.timer >= SLAM_WINDUP){
        s.phase = 'strike';
        s.timer = 0;
        // Reset enemy pose
        if(s.enemy && !s.enemy.userData.dead){
          s.enemy.rotation.x = 0;
          s.enemy.scale.set(1,1,1);
        }
        // Check hit — player must be OUTSIDE the box
        const px = player.x - s.originX;
        const pz = player.z - s.originZ;
        const along = px*s.dirX + pz*s.dirZ;
        const perp  = Math.abs(px*s.dirZ - pz*s.dirX);
        const inBox = along > 0 && along < SLAM_RANGE && perp < SLAM_WIDTH;
        if(inBox && !s.hit){
          s.hit = true;
          const tier = s.enemy ? s.enemy.userData.tier : 1;
          const dmg  = tier * 3 + Math.floor(Math.random() * tier * 4);
          player.hp  = Math.max(0, player.hp - dmg);
          player.inCombat = true; player.combatTimer = 8;
          gainXp('defence', dmg*2);
          spawnHitsplat(PG.position.clone().add(new THREE.Vector3(0,2.8,0)), dmg, 'hs-p');
          addLog(`Slam crushed you for ${dmg}! Sidestep next time.`, 'd');
        } else if(!s.hit){
          s.hit = true;
          addLog('You sidestepped the slam!', 'x');
          showNotif('SIDESTEPPED! ✦');
          gainXp('agility', 8);
        }
        // Flash the strike box bright
        s.strikeMat.opacity = 0.85;
        s.slamLight.intensity = 5;
      }

    } else if(s.phase === 'strike'){
      // Flash fades quickly
      s.strikeMat.opacity = Math.max(0, 0.85 * (1 - s.timer/SLAM_STRIKE));
      s.fillMat.opacity   = Math.max(0, 0.22 * (1 - s.timer/SLAM_STRIKE));
      s.edgeMat.opacity   = Math.max(0, 0.9  * (1 - s.timer/SLAM_STRIKE));
      s.slamLight.intensity = Math.max(0, 5*(1 - s.timer/SLAM_STRIKE));

      if(s.timer >= SLAM_STRIKE){
        s.phase = 'fade';
        s.timer = 0;
        s.slamLight.intensity = 0;
      }

    } else if(s.phase === 'fade'){
      // Everything already faded — just clean up
      if(s.timer >= SLAM_FADE){
        scene.remove(s.boxGroup);
        scene.remove(s.strikeGroup);
        scene.remove(s.slamLight);
        activeSlams.splice(i, 1);
      }
    }
  }
}

function update(){
  const dt=Math.min(clock.getDelta(),.05);
  if(playerDead) return;
  const now=clock.elapsedTime;
  hitsplatsThisFrame = 0;

  // Day/Night
  updateDayNight(dt);

  // Movement
  let moveX=0,moveZ=0;
  if(joy.active&&joy.mag>.08){
    const fwdX=Math.sin(camState.yaw),fwdZ=Math.cos(camState.yaw);
    const rgtX=Math.cos(camState.yaw),rgtZ=-Math.sin(camState.yaw);
    // joy.dy negative = pushed UP = forward
    // joy.dx positive = pushed RIGHT on screen
    // Right vector is negated because camera yaw decreases when dragging right
    const jFwd = -joy.dy / MAX_R;
    const jRgt = -joy.dx / MAX_R;
    moveX = jFwd*fwdX + jRgt*rgtX;
    moveZ = jFwd*fwdZ + jRgt*rgtZ;
  }
  if(keys['ArrowUp']  ||keys['w']||keys['W']){moveX+=Math.sin(camState.yaw); moveZ+=Math.cos(camState.yaw);}
  if(keys['ArrowDown']||keys['s']||keys['S']){moveX-=Math.sin(camState.yaw); moveZ-=Math.cos(camState.yaw);}
  if(keys['ArrowLeft']||keys['a']||keys['A']){moveX-=Math.cos(camState.yaw); moveZ+=Math.sin(camState.yaw);}
  if(keys['ArrowRight']||keys['d']||keys['D']){moveX+=Math.cos(camState.yaw); moveZ-=Math.sin(camState.yaw);}
  if(keys[' '])doJump();

  const len=Math.hypot(moveX,moveZ);
  const sprinting=(isSprinting||keys['Shift'])&&player.runEnergy>0;
  const spd=player.speed*(sprinting?player.sprintMult:1);
  if(len>.01){
    const nx=moveX/len,nz=moveZ/len;
    player.vx=nx*spd;player.vz=nz*spd;
    player.angle=Math.atan2(nx,nz);
    legPhase+=dt*spd*8;
    if(sprinting)gainXp('agility',dt*1.5);
  } else { player.vx*=.7;player.vz*=.7; }
  player.x+=player.vx;player.z+=player.vz;
  // Dash impulse
  if(player.dashing){
    player.dashTimer-=dt;
    if(player.dashTimer>0){
      const frac=player.dashTimer/DASH_DUR;
      player.x+=player.dashImpX*frac*dt;
      player.z+=player.dashImpZ*frac*dt;
      legPhase+=dt*18;
      // Spawn lightning along trail
      dashBoltTimer-=dt;
      if(dashBoltTimer<=0){
        spawnLightningBolt(player.x,player.z,player.angle);
        dashBoltTimer=0.05;
      }
    } else { player.dashing=false;player.dashImpX=player.dashImpZ=0; }
  }
  if(player.dashCd>0)player.dashCd=Math.max(0,player.dashCd-dt);
  // Dash ghost trail fade
  for(let i=dashGhosts.length-1;i>=0;i--){
    const dg=dashGhosts[i];dg.life-=dt;
    dg.mat.opacity=Math.max(0,(dg.life/.4)*.5);
    if(dg.life<=0){scene.remove(dg.g);dashGhosts.splice(i,1);}
  }
  // Lightning bolt fade
  for(let i=lightningBolts.length-1;i>=0;i--){
    const lb=lightningBolts[i];lb.life-=dt;
    const a=Math.max(0,lb.life/.28);
    lb.mat.opacity=a*.95;
    lb.cmat.opacity=a*.7;
    lb.gl.intensity=a*5;
    for(const br of lb.branches)br.mat.opacity=a*.7;
    if(lb.life<=0){
      scene.remove(lb.line);scene.remove(lb.core);scene.remove(lb.gl);
      for(const br of lb.branches)scene.remove(br.line);
      lightningBolts.splice(i,1);
    }
  }
  // Dash button cooldown label
  const bDE=document.getElementById('bDash');
  if(bDE){if(player.dashCd>.05){bDE.textContent=player.dashCd.toFixed(1);bDE.classList.add('on-cd');}
  else{bDE.textContent='DASH';bDE.classList.remove('on-cd');}}
  player.x=Math.max(-WORLD,Math.min(WORLD,player.x));
  player.z=Math.max(-WORLD,Math.min(WORLD,player.z));
  resolveCollisions();

  // Jump
  if(player.jumping||player.y>0){
    player.vy-=16*dt;player.y+=player.vy*dt;
    if(player.y<=0){player.y=0;player.vy=0;player.jumping=false;}
  }
  // Run energy
  if(sprinting&&len>.01)player.runEnergy=Math.max(0,player.runEnergy-20*dt);
  else player.runEnergy=Math.min(100,player.runEnergy+7*dt);
  // Combat / regen
  if(player.attackCd>0)player.attackCd=Math.max(0,player.attackCd-dt);
  if(player.inCombat){player.combatTimer-=dt;if(player.combatTimer<=0)player.inCombat=false;}
  if(!player.inCombat&&now-lastRegen>8&&player.hp<player.maxHp){
    player.hp=Math.min(player.maxHp,player.hp+1);
    addLog(`+1 HP (${Math.ceil(player.hp)}/${player.maxHp})`,'h');
    spawnHitsplat(PG.position.clone().add(new THREE.Vector3(0,2.8,0)),1,'hs-h');
    lastRegen=now;
  }
  if(player.hp<=0&&!playerDead) triggerDeath();

  // Player mesh
  const gY=getGroundY(player.x,player.z);
  PG.position.set(player.x,gY+player.y,player.z);
  PG.rotation.y=player.angle;
  const moving=Math.hypot(player.vx,player.vz)>.05;
  legL.position.y=.34+(moving?Math.sin(legPhase)*.28:0);
  legR.position.y=.34+(moving?Math.sin(legPhase+Math.PI)*.28:0);
  legL.rotation.x=moving?Math.sin(legPhase)*.42:0;
  legR.rotation.x=moving?Math.sin(legPhase+Math.PI)*.42:0;
  armL.rotation.x=(moving?Math.sin(legPhase)*.44:0);
  armR.rotation.x=-(moving?Math.sin(legPhase)*.44:0);
  // Head bob
  phead.position.y=2.08+(moving?Math.sin(legPhase*2)*.025:0);
  visor.position.y=2.22+(moving?Math.sin(legPhase*2)*.025:0);

  // Weapon attack animation
  if(atkAnim.active){
    atkAnim.timer+=dt;
    const p=Math.min(atkAnim.timer/atkAnim.duration,1);
    const swing=Math.sin(p*Math.PI);  // 0→1→0 arc
    if(atkAnim.type==='stab'){
      // Forward thrust
      wpnGroup.rotation.x=-swing*1.2;
      wpnGroup.position.z=.5+swing*.4;
      wpnGroup.position.y=1.18;
    } else if(atkAnim.type==='slash'){
      // Wide horizontal sweep
      wpnGroup.rotation.z=-swing*1.4;
      wpnGroup.rotation.x=-swing*.6;
      wpnGroup.position.z=.2;
      wpnGroup.position.y=1.18;
    } else { // crush - overhead slam
      wpnGroup.rotation.x=-(1-p)*Math.PI*.6-swing*.2;
      wpnGroup.position.y=1.18+swing*.4;
      wpnGroup.position.z=.2;
    }
    if(p>=1){
      atkAnim.active=false;
      wpnGroup.rotation.set(0,0,0);
      wpnGroup.position.set(.5,1.18,0);
    }
  } else {
    // Idle sway
    wpnGroup.rotation.x=moving?Math.sin(legPhase)*.35:0;
    wpnGroup.position.set(.5,1.18,0);
  }

  // Camera
  CAM_TARGET.lerp(PG.position,.14);
  const cx2=CAM_TARGET.x-Math.sin(camState.yaw)*Math.cos(camState.pitch)*camState.dist;
  const cy2=CAM_TARGET.y+Math.sin(camState.pitch)*camState.dist+1.5;
  const cz2=CAM_TARGET.z-Math.cos(camState.yaw)*Math.cos(camState.pitch)*camState.dist;
  camera.position.set(cx2,cy2,cz2);
  camera.lookAt(CAM_TARGET.x,CAM_TARGET.y+1.4,CAM_TARGET.z);

  // HP bar billboard (face camera)
  for(const e of enemies){
    if(e.userData.dead)continue;
    const [hpBg,hpFg]=[ e.userData.hpBg,e.userData.hpFg];
    if(hpBg&&hpFg){
      const angle=Math.atan2(camera.position.x-e.position.x,camera.position.z-e.position.z);
      hpBg.rotation.y=angle-e.rotation.y;
      hpFg.rotation.y=angle-e.rotation.y;
    }
    if(e.userData.nameLabel){
      const sc=e.userData.sc||1;
      const labelWorldY=e.position.y+(e.userData.npcType?3.15:2.3*sc+0.42);
      const wp=new THREE.Vector3(e.position.x,labelWorldY,e.position.z);
      wp.project(camera);
      const dist=Math.hypot(player.x-e.position.x,player.z-e.position.z);
      if(dist<40&&wp.z<1&&wp.z>-1){
        const sx=(wp.x*.5+.5)*innerWidth;
        const sy=(-.5*wp.y+.5)*innerHeight;
        e.userData.nameLabel.style.display='block';
        e.userData.nameLabel.style.left=sx+'px';
        e.userData.nameLabel.style.top=sy+'px';
      } else {
        e.userData.nameLabel.style.display='none';
      }
    }
  }

  // Animate bonfires + torches — dimmer during day
  const nightMult=0.4+DN.time<0.3||DN.time>0.7?0.6:0;
  for(const b of bonfires){
    b.userData.phase+=dt*3;
    const fl=b.userData.flameRef,li=b.userData.lightRef;
    fl.scale.y=0.85+Math.sin(b.userData.phase)*.25;
    fl.scale.x=0.9+Math.sin(b.userData.phase*1.3)*.15;
    li.intensity=(3+Math.sin(b.userData.phase*2)*.8);
  }
  for(const tp of torchPosts){
    tp.userData.phase+=dt*4;
    tp.userData.flameRef.scale.y=0.8+Math.sin(tp.userData.phase)*.2;
    tp.userData.lightRef.intensity=2+Math.sin(tp.userData.phase*1.8)*.45;
  }
  // Building torch flicker
  for(const bd of buildings){
    for(const key in bd.userData){
      const d=bd.userData[key];
      if(d&&d.flameRef){
        d.phase=(d.phase||0)+dt*3.5;
        d.flameRef.scale.y=0.85+Math.sin(d.phase)*.2;
        if(d.lightRef)d.lightRef.intensity=1.6+Math.sin(d.phase*2.1)*.5;
      }
    }
  }
  torch1.intensity=(1.8+Math.sin(now*3.1)*.4)*(0.6+((1-DN.time)*0.4));
  torch2.intensity=(1.6+Math.sin(now*2.7+1)*.35)*(0.6+((1-DN.time)*0.4));

  // Crystals
  for(const c of crystals){if(c.userData.collected)continue;
    c.userData.phase+=dt;c.rotation.y+=dt*.7;
    c.position.y=getGroundY(c.position.x,c.position.z)+.8+Math.sin(c.userData.phase)*.2;
    if(Math.hypot(c.position.x-player.x,c.position.z-player.z)<2.5){
      c.userData.collected=true;scene.remove(c);
      gainXp('prayer',45);player.score+=30;
      addLog('Dark crystal absorbed. +45 Prayer XP','x');showNotif('DARK CRYSTAL +45 Prayer XP');
    }
  }

  // Ground loot — animate + label
  for(const l of groundLoot){if(l.group.userData.picked)continue;
    l.group.userData.phase+=dt*1.8;
    l.group.children[0].position.y=.32+Math.sin(l.group.userData.phase)*.2;
    l.group.children[0].rotation.y+=dt*2.5;
    l.group.children[0].rotation.x=Math.sin(l.group.userData.phase*.7)*.2;
    if(l.group.children[1]) l.group.children[1].intensity=0.9+Math.sin(l.group.userData.phase*1.5)*.5;
    const dist=Math.hypot(l.x-player.x,l.z-player.z);
    if(dist<12){
      const wp=new THREE.Vector3(l.x,getGroundY(l.x,l.z)+.9,l.z);
      wp.project(camera);
      const sx=(wp.x*.5+.5)*innerWidth,sy=(-.5*wp.y+.5)*innerHeight;
      l.label.style.display='block';l.label.style.left=sx+'px';l.label.style.top=sy+'px';
    } else l.label.style.display='none';
  }

  // ── HORDE TRANSITION based on day/night ──
  // isNight when dayFactor < 0.15 (roughly t<0.22 or t>0.78)
  const t = DN.time;
  const dayFactor2 = (t>=0.3&&t<=0.7)?1:(t<0.3?Math.max(0,(t-0.2)/0.1):Math.max(0,(0.8-t)/0.1));
  const nowNight = dayFactor2 < 0.15;
  setHordeMode(nowNight);

  // ── ROOF FADE — hide roof when player is inside building ──
  for(const rb of roofedBuildings){
    const inside = Math.abs(player.x - rb.cx) < rb.hw && Math.abs(player.z - rb.cz) < rb.hd;
    const targetOp = inside ? 0 : 1;
    const cur = rb.roofMesh.material.opacity;
    rb.roofMesh.material.opacity = cur + (targetOp - cur) * Math.min(1, dt * 4);
    rb.roofMesh.visible = rb.roofMesh.material.opacity > 0.01;
  }

  // ── SAFE ZONE LABEL ──
  const playerInSafe = inSafeZone(player.x, player.z);
  const safeEl = document.getElementById('safeLabel');
  if(safeEl) safeEl.style.opacity = playerInSafe ? '1' : '0';

  // ── SLAM SYSTEM UPDATE ──
  updateSlams(dt);
  updateCharges(dt);
  updateOrbits(dt);
  updateRingAtks(dt);

  // ── ENEMY AI ──
  // DAY  → single combat: only closest aggro'd enemy attacks
  // NIGHT → horde mode: all enemies in range pursue and attack simultaneously

  // Find active enemies (those that can attack this frame)
  let activeEnemies = [];
  if(isHordeNight){
    // All alive enemies are active
    for(const e of enemies){
      if(!e.userData.dead) activeEnemies.push(e);
    }
  } else {
    // Only the single closest enemy within range
    let closest = null, closestDist = Infinity;
    for(const e of enemies){
      if(e.userData.dead) continue;
      const dx = player.x - e.position.x, dz = player.z - e.position.z;
      const dist = Math.hypot(dx, dz);
      if(dist < e.userData.aggroRange && dist < closestDist){
        closestDist = dist; closest = e;
      }
    }
    if(closest) activeEnemies.push(closest);
  }

  for(const e of enemies){
    if(e.userData.dead) continue;
    const dx = player.x - e.position.x, dz = player.z - e.position.z;
    const dist = Math.hypot(dx, dz);
    const isActive = activeEnemies.includes(e);

    // Safe zone: enemies that were chasing FULLY drop aggro and retreat
    const eInSafe = inSafeZone(e.position.x, e.position.z);
    if(eInSafe){
      // Push out radially
      const ex = e.position.x - SAFE_X, ez = e.position.z - SAFE_Z;
      const el2 = Math.hypot(ex, ez) || 1;
      e.userData.vx += (ex/el2) * 3 * dt * 60;
      e.userData.vz += (ez/el2) * 3 * dt * 60;
    }

    // If player is in safe zone: all enemies lose aggro completely — stop moving toward player
    if(playerInSafe){
      e.userData.vx *= 0.85;
      e.userData.vz *= 0.85;
      // Reset attack cooldown so they don't instantly slam when player leaves
      if(e.userData.attackCd < 2) e.userData.attackCd = 2;
    } else if(isActive && !eInSafe){
      // Night horde: ALL rush the player
      // Day: only the chosen one pursues
      const stopDist = isHordeNight ? 3.5 : 4.5;
      if(dist > stopDist){
        e.userData.vx += (dx/dist)*e.userData.speed*dt*2;
        e.userData.vz += (dz/dist)*e.userData.speed*dt*2;
      }
    } else if(!isActive){
      e.userData.vx *= 0.7;
      e.userData.vz *= 0.7;
    }

    e.userData.vx *= .86; e.userData.vz *= .86;
    e.position.x += e.userData.vx*dt*28;
    e.position.z += e.userData.vz*dt*28;
    e.position.y = getGroundY(e.position.x, e.position.z) + Math.sin(now*1.1+e.userData.attackCd*2.2)*.07;

    if(dist < 30) e.rotation.y = Math.atan2(dx, dz);

    // Only active enemies can attack; enemies can't attack inside safe zone
    if(!isActive || playerInSafe) continue;

    const alreadySlamming = activeSlams.some(s => s.enemy === e && s.phase !== 'fade');
    const alreadyCharging = activeCharges.some(c => c.enemy === e);
    const alreadyOrbiting = activeOrbits.some(o => o.enemy === e);
    const alreadyRinging  = activeRingAtks.some(r => r.enemy === e);
    const busyAttacking = alreadySlamming||alreadyCharging||alreadyOrbiting||alreadyRinging;

    // Cap total concurrent slams to 2
    const totalActiveSlams = activeSlams.filter(s => s.phase !== 'fade').length;
    e.userData.attackCd -= dt;

    const cdBase = isHordeNight ? 2.5 : 3.5;
    if(e.userData.attackCd <= 0 && dist < 10 && !busyAttacking){
      const pat = e.userData.pattern || 'slam';
      if(pat === 'slam' && totalActiveSlams < 2){
        startSlam(e); showSlamWarn();
        addLog(`${e.userData.name} winds up a slam!`, '');
      } else if(pat === 'charge'){
        startCharge(e);
        addLog(`${e.userData.name} charges!`, '');
        showNotif('⚠ CHARGE — SIDESTEP!');
      } else if(pat === 'orbit'){
        startOrbit(e);
        addLog(`${e.userData.name} begins orbiting...`, '');
        showNotif('⚠ ORBIT INCOMING!');
      } else if(pat === 'summon_ring'){
        startRingAtk(e);
        addLog(`${e.userData.name} summons a ring of ruin!`, '');
        showNotif('⚠ STEP OUT OF THE RING!');
      } else if(totalActiveSlams < 2){
        startSlam(e); showSlamWarn();
      }
      e.userData.attackCd = cdBase + e.userData.tier * 0.5 + Math.random() * 1.5;
      player.inCombat = true; player.combatTimer = 8;
    } else if(e.userData.attackCd <= 0 && totalActiveSlams >= 2){
      e.userData.attackCd = 0.8 + Math.random() * 0.5;
    }
  }

  // ── ELARA NPC ANIMATION + TALK PROMPT ──
  elaraGroup.rotation.y = Math.PI*0.15 + Math.sin(now*0.4)*0.06;
  elaraLight.intensity = 1.0 + Math.sin(now*1.8)*0.3;
  bangMesh.position.y = 3.6 + Math.sin(now*2.5)*0.18;
  bangMesh.rotation.y += dt*1.2;

  const elaraDist = Math.hypot(player.x - ELARA_X, player.z - ELARA_Z);
  const talkEl = document.getElementById('talkPrompt');
  if(!dialogueOpen && elaraDist < 7){
    const elaraWorldPos = new THREE.Vector3(ELARA_X, 3.0, ELARA_Z);
    elaraWorldPos.project(camera);
    if(elaraWorldPos.z < 1){
      const sx = (elaraWorldPos.x*.5+.5)*innerWidth;
      const sy = (-.5*elaraWorldPos.y+.5)*innerHeight;
      talkEl.style.display = 'block';
      talkEl.style.left = sx+'px';
      talkEl.style.top  = sy+'px';
    }
  } else { talkEl.style.display = 'none'; }

  // ── ALDRIC NPC ANIMATION + TALK PROMPT ──
  aldricGroup.rotation.y = Math.PI*0.6 + Math.sin(now*0.3)*0.05;
  aldricLight.intensity = 0.8 + Math.sin(now*1.4)*0.25;
  coinBangMesh.position.y = 3.7 + Math.sin(now*2.2)*0.2;
  coinBangMesh.rotation.y += dt*2;

  const aldricDist = Math.hypot(player.x - ALDRIC_X, player.z - ALDRIC_Z);
  const talkElM = document.getElementById('talkPromptMerch');
  if(!dialogueOpen && aldricDist < 7){
    const aldricPos = new THREE.Vector3(ALDRIC_X, 3.0, ALDRIC_Z);
    aldricPos.project(camera);
    if(aldricPos.z < 1){
      const sx = (aldricPos.x*.5+.5)*innerWidth;
      const sy = (-.5*aldricPos.y+.5)*innerHeight;
      talkElM.style.display = 'block';
      talkElM.style.left = sx+'px';
      talkElM.style.top  = sy+'px';
    }
  } else { talkElM.style.display = 'none'; }

  // ── TEST SHOP NPC ANIMATION + TALK PROMPT ──
  testGroup.rotation.y = Math.PI*1.1 + Math.sin(now*0.4)*0.06;
  testLight.intensity = 1.0 + Math.sin(now*1.8)*0.35;
  testFlaskMesh.position.y = 3.7 + Math.sin(now*2.6)*0.22;
  testFlaskMesh.rotation.y += dt*2.5;
  const testDist = Math.hypot(player.x - TEST_X, player.z - TEST_Z);
  const talkElT = document.getElementById('talkPromptTest');
  if(!dialogueOpen && testDist < 7){
    const testPos = new THREE.Vector3(TEST_X, 3.0, TEST_Z);
    testPos.project(camera);
    if(testPos.z < 1){
      const sx = (testPos.x*.5+.5)*innerWidth;
      const sy = (-.5*testPos.y+.5)*innerHeight;
      talkElT.style.display = 'block';
      talkElT.style.left = sx+'px';
      talkElT.style.top  = sy+'px';
    }
  } else { talkElT.style.display = 'none'; }

  // ── ORBIT RING ANIMATION ──
  for(const e of enemies){
    if(!e.userData.dead&&e.userData.orbitRing) e.userData.orbitRing.rotation.y+=dt*2.2;
  }

  // ── BANK CHEST PROMPT + TAB VISIBILITY ──
  const bankDist=Math.hypot(player.x-BANK_X,player.z-BANK_Z);
  document.querySelector('.sptab[data-t="bank"]').style.display=bankDist<8?'':'none';
  const bankEl=document.getElementById('talkPromptBank');
  if(!dialogueOpen&&bankDist<6){
    const bPos=new THREE.Vector3(BANK_X,2.2,BANK_Z);bPos.project(camera);
    if(bPos.z<1){
      bankEl.style.display='block';
      bankEl.style.left=((bPos.x*.5+.5)*innerWidth)+'px';
      bankEl.style.top=((-.5*bPos.y+.5)*innerHeight)+'px';
    }
  } else { bankEl.style.display='none'; }

  // HUD
  document.getElementById('hpF').style.width=(player.hp/player.maxHp*100)+'%';
  document.getElementById('stF').style.width=(player.prayer/player.maxPrayer*100)+'%';
  document.getElementById('reF').style.width=player.runEnergy+'%';
  document.getElementById('hpT').textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;
  document.getElementById('stT').textContent=`${Math.ceil(player.prayer)}/${player.maxPrayer}`;
  document.getElementById('reT').textContent=`${Math.floor(player.runEnergy)}%`;
  document.getElementById('coords').textContent=`X:${Math.floor(player.x)}  Z:${Math.floor(player.z)}  ✦${player.score}`;
  drawMinimap();
}

// ── DEATH / RESPAWN ──
let playerDead=false;

function triggerDeath(){
  playerDead=true;
  player.inCombat=false;
  closeDialogue();
  closeMerchant();
  closePanel();
  document.getElementById('deathScreen').classList.add('show');
  addLog('You have died. All items lost.','d');
}

function respawnPlayer(){
  // Wipe inventory (storage is kept)
  for(let i=0;i<28;i++) inventory[i]=null;
  equippedWeapon=WEAPONS.ironDagger;
  updateWeaponMesh();updateWeaponHUD();
  // Teleport to safe zone centre
  player.x=SAFE_X;player.z=SAFE_Z;player.vx=0;player.vz=0;player.y=0;player.vy=0;
  player.hp=player.maxHp;player.prayer=player.maxPrayer;player.runEnergy=100;
  player.attackCd=0;player.inCombat=false;
  playerDead=false;
  saveGame();
  refreshHUD();
  if(panelOpen)renderPanel();
  document.getElementById('deathScreen').classList.remove('show');
  addLog('Respawned at safe zone.','h');
  showNotif('RESPAWNED');
}
document.getElementById('deathRespawn').addEventListener('click',respawnPlayer);
document.getElementById('deathRespawn').addEventListener('touchend',e=>{e.preventDefault();respawnPlayer();},{passive:false});

// ── BANK PROMPT HANDLER ──
document.getElementById('talkPromptBank').addEventListener('click',()=>openPanel('bank'));
document.getElementById('talkPromptBank').addEventListener('touchend',e=>{e.preventDefault();openPanel('bank');},{passive:false});

function loop(){requestAnimationFrame(loop);update();renderer.render(scene,camera);}

// ── SAVE / LOAD ──
const SAVE_KEY='darkRealm_save_v1';

function saveGame(){
  try{
    const data={
      skills:{},
      inventory:JSON.parse(JSON.stringify(inventory)),
      storageSlots:JSON.parse(JSON.stringify(storageSlots)),
      equippedWeaponId:equippedWeapon.id,
      score:player.score,
      dashUnlocked,
    };
    for(const k in SK) data.skills[k]=SK[k].xp;
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  }catch(e){}
}

function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    const data=JSON.parse(raw);
    if(data.skills){
      for(const k in SK){
        if(data.skills[k]!==undefined) SK[k].xp=data.skills[k];
      }
    }
    if(Array.isArray(data.inventory)){
      for(let i=0;i<28;i++) inventory[i]=data.inventory[i]||null;
    }
    if(Array.isArray(data.storageSlots)){
      for(let i=0;i<28;i++) storageSlots[i]=data.storageSlots[i]||null;
    }
    if(data.equippedWeaponId&&WEAPONS[data.equippedWeaponId]){
      equippedWeapon=WEAPONS[data.equippedWeaponId];
    }
    if(typeof data.score==='number') player.score=data.score;
    if(data.dashUnlocked){dashUnlocked=true;const btn=document.getElementById('bDash');if(btn)btn.style.display='flex';}
    player.maxHp=skLv('hitpoints')*10;
    player.hp=player.maxHp;
    player.maxPrayer=skLv('prayer');
    player.prayer=player.maxPrayer;
  }catch(e){}
}

// Periodic auto-save every 30 seconds
setInterval(saveGame,30000);

// ── INIT ──
loadGame();
refreshHUD();
updateWeaponHUD();
updateWeaponMesh();
showNotif('DARK REALM — Welcome back!');
loop();
