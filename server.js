const express=require("express"),http=require("http"),WebSocket=require("ws"),crypto=require("crypto");
const app=express();app.use(express.static("public"));app.get("/health",(_,r)=>r.json({ok:true}));
const server=http.createServer(app),wss=new WebSocket.Server({server});
const WORLD={w:2600,h:1800},players=new Map(),mobs=[];
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const classes={
 warrior:{label:"고회장 · 전사",hp:180,atk:24,def:12,range:92,speed:3.1,skill:"강타",color:"#e3b65b"},
 archer:{label:"신선생 · 궁수",hp:115,atk:21,def:5,range:260,speed:3.8,skill:"연속 사격",color:"#80d89a"},
 mage:{label:"낙엽이 · 마법사",hp:105,atk:29,def:4,range:220,speed:3.2,skill:"화염구",color:"#a9a0ff"},
 healer:{label:"새싹이 · 보조힐러",hp:145,atk:13,def:9,range:125,speed:3.3,skill:"치유의 빛",color:"#ff9fd0"}
};
const itemDefs={
 slime_gel:{name:"슬라임 젤리",type:"material",icon:"🟢"},
 goblin_ear:{name:"고블린 귀",type:"material",icon:"👂"},
 iron_sword:{name:"철검",type:"weapon",slot:"weapon",atk:8,icon:"🗡️"},
 oak_bow:{name:"참나무 활",type:"weapon",slot:"weapon",atk:9,icon:"🏹"},
 apprentice_staff:{name:"수습 지팡이",type:"weapon",slot:"weapon",atk:10,icon:"🪄"},
 cleric_mace:{name:"치유의 메이스",type:"weapon",slot:"weapon",atk:5,icon:"🔨"},
 leather_armor:{name:"가죽 갑옷",type:"armor",slot:"armor",def:5,icon:"🥋"},
 bronze_ring:{name:"청동 반지",type:"accessory",slot:"accessory",def:2,atk:2,icon:"💍"},
 weapon_scroll:{name:"무기 강화 주문서",type:"scroll",target:"weapon",icon:"📜"},
 armor_scroll:{name:"방어구 강화 주문서",type:"scroll",target:"armor",icon:"📜"},
 accessory_scroll:{name:"장신구 강화 주문서",type:"scroll",target:"accessory",icon:"📜"},
 potion:{name:"회복 물약",type:"consumable",icon:"🧪"}
};
function addItem(p,id,n=1){let d=itemDefs[id];if(!d)return;let found=p.inventory.find(i=>i.id===id&&["material","scroll","consumable"].includes(d.type));if(found)found.qty+=n;else p.inventory.push({id,qty:n,enhance:0});}
function itemView(i){return {...i,...itemDefs[i.id]};}
function initMobs(){mobs.length=0;for(let i=0;i<38;i++){let gob=i%3===0;mobs.push({id:"mob"+i,type:gob?"goblin":"slime",name:gob?"고블린":"숲 슬라임",x:rand(170,WORLD.w-170),y:rand(170,WORLD.h-170),hp:gob?100:58,maxHp:gob?100:58,atk:gob?13:8,def:gob?5:2,range:gob?42:35,alive:true,respawnAt:0,lastAtk:0,aggro:null});}}
initMobs();
function send(ws,o){if(ws.readyState===1)ws.send(JSON.stringify(o));}
function pubPlayer(p){return {id:p.id,name:p.name,classId:p.classId,className:classes[p.classId].label,x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,level:p.level,xp:p.xp,gold:p.gold,atk:stat(p).atk,def:stat(p).def,inventory:p.inventory.map(itemView),equip:p.equip,skillCd:Math.max(0,p.skillCd-Date.now())};}
function stat(p){let c=classes[p.classId],weapon=p.equip.weapon?itemDefs[p.equip.weapon.id]:null,armor=p.equip.armor?itemDefs[p.equip.armor.id]:null,acc=p.equip.accessory?itemDefs[p.equip.accessory.id]:null;return {atk:c.atk+(weapon?.atk||0)+(weapon?.enhance||0)*2+(acc?.atk||0)+(acc?.enhance||0),def:c.def+(armor?.def||0)+(armor?.enhance||0)*2+(acc?.def||0)};}
function state(){return {type:"state",world:WORLD,players:[...players.values()].map(pubPlayer),mobs:mobs.map(m=>({id:m.id,type:m.type,name:m.name,x:m.x,y:m.y,hp:m.hp,maxHp:m.maxHp,alive:m.alive}))};}
function notice(ws,text){send(ws,{type:"notice",text});}
function drop(p,m,ws){let gold=rand(m.type==="goblin"?8:3,m.type==="goblin"?24:12);p.gold+=gold;notice(ws,`🪙 ${gold} 골드 획득!`);let pool=m.type==="goblin"?["goblin_ear","iron_sword","leather_armor","weapon_scroll","armor_scroll","accessory_scroll","bronze_ring","potion"]:["slime_gel","weapon_scroll","armor_scroll","potion"];let chance=Math.random();if(chance<(m.type==="goblin"?.55:.32)){let id=pool[rand(0,pool.length-1)];addItem(p,id);notice(ws,`🎁 아이템 드롭: ${itemDefs[id].name}`);}p.xp+=m.type==="goblin"?38:20;while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.maxHp+=classes[p.classId].hp*.06|0;p.hp=p.maxHp;notice(ws,`✨ 레벨 업! Lv.${p.level}`);}}
function attack(p,ws,skill){let c=classes[p.classId],now=Date.now();if(skill&&now<p.skillCd){notice(ws,"스킬 재사용 대기 중입니다.");return;}let s=stat(p);let target=mobs.filter(m=>m.alive&&Math.hypot(m.x-p.x,m.y-p.y)<(skill?c.range*1.18:c.range)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(!target){notice(ws,"사정거리 안에 몬스터가 없습니다.");return;}if(skill)p.skillCd=now+(p.classId==="healer"?7000:5500);let dmg=Math.max(1,Math.round(s.atk*(skill?(p.classId==="warrior"?2.0:p.classId==="archer"?1.65:p.classId==="mage"?2.25:1.35):1)*(rand(85,115)/100))-target.def);target.hp=Math.max(0,target.hp-dmg);notice(ws,`${skill?c.skill:"공격"}! ${target.name}에게 ${dmg} 피해`);if(target.hp<=0){target.alive=false;target.respawnAt=Date.now()+8000;drop(p,target,ws);}}
wss.on("connection",ws=>{let id=crypto.randomUUID(),p=null;send(ws,{type:"hello",classes:Object.entries(classes).map(([id,c])=>({id,...c}))});
ws.on("message",raw=>{let m;try{m=JSON.parse(raw)}catch{return}
if(m.type==="join"){if(p)return;let classId=classes[m.classId]?m.classId:"warrior";p={id,name:String(m.name||"모험가").trim().slice(0,12)||"모험가",classId,x:WORLD.w/2+rand(-50,50),y:WORLD.h/2+rand(-50,50),level:1,xp:0,gold:100,hp:classes[classId].hp,maxHp:classes[classId].hp,inventory:[],equip:{weapon:null,armor:null,accessory:null},lastAttack:0,skillCd:0,lastMove:0};addItem(p,classId==="warrior"?"iron_sword":classId==="archer"?"oak_bow":classId==="mage"?"apprentice_staff":"cleric_mace");addItem(p,"potion",3);players.set(id,p);ws._playerId=id;send(ws,{type:"joined",id,player:pubPlayer(p)});return;}
if(!p)return;
if(m.type==="name")p.name=String(m.name||"모험가").trim().slice(0,12)||"모험가";
if(m.type==="move"){let dx=clamp(Number(m.dx)||0,-1,1),dy=clamp(Number(m.dy)||0,-1,1),len=Math.hypot(dx,dy)||1,c=classes[p.classId];p.x=clamp(p.x+dx/len*c.speed,25,WORLD.w-25);p.y=clamp(p.y+dy/len*c.speed,25,WORLD.h-25);}
if(m.type==="attack"||m.type==="skill"){if(Date.now()-p.lastAttack>320){p.lastAttack=Date.now();attack(p,ws,m.type==="skill");}}
if(m.type==="equip"){let i=p.inventory.find(i=>i.id===m.id),d=i&&itemDefs[i.id];if(!i||!d||!d.slot){notice(ws,"장착할 수 없는 아이템입니다.");return;}let old=p.equip[d.slot];if(old)addItem(p,old.id);p.equip[d.slot]={id:i.id,enhance:i.enhance||0};p.inventory.splice(p.inventory.indexOf(i),1);notice(ws,`${d.name} 장착 완료!`);}
if(m.type==="use"){let i=p.inventory.find(i=>i.id===m.id),d=i&&itemDefs[i.id];if(!i)return;if(d.type==="consumable"&&m.id==="potion"){p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*.45));i.qty--;notice(ws,"회복 물약 사용!");}
else if(d.type==="scroll"){let slot=d.target,eq=p.equip[slot];if(!eq){notice(ws,`${slot==="weapon"?"무기":slot==="armor"?"방어구":"장신구"}를 먼저 장착하세요.`);return;}if(Math.random()<.78){eq.enhance=(eq.enhance||0)+1;notice(ws,`✨ 강화 성공! ${itemDefs[eq.id].name} +${eq.enhance}`);}else notice(ws,"강화 실패! 아이템은 유지되었습니다.");i.qty--;}
else{notice(ws,"이 아이템은 사용할 수 없습니다.");return;}if(i.qty<=0)p.inventory.splice(p.inventory.indexOf(i),1);}
});
ws.on("close",()=>{if(p)players.delete(id);});});
setInterval(()=>{let now=Date.now();for(let m of mobs){if(!m.alive&&m.respawnAt<=now){m.alive=true;m.hp=m.maxHp;m.x=rand(160,WORLD.w-160);m.y=rand(160,WORLD.h-160);m.aggro=null;}if(!m.alive)continue;
let near=[...players.values()].filter(p=>Math.hypot(p.x-m.x,p.y-m.y)<230).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];if(near){m.aggro=near.id;let d=Math.hypot(near.x-m.x,near.y-m.y);if(d>m.range){let dx=(near.x-m.x)/d,dy=(near.y-m.y)/d;m.x+=dx*(m.type==="goblin"?1.15:.85);m.y+=dy*(m.type==="goblin"?1.15:.85);}else if(now-m.lastAtk>1350){m.lastAtk=now;let damage=Math.max(2,m.atk-stat(near).def+rand(-2,3));near.hp-=damage;if(near.hp<=0){near.hp=near.maxHp;near.x=WORLD.w/2;near.y=WORLD.h/2;near.gold=Math.max(0,near.gold-10);let client=[...wss.clients].find(c=>c.readyState===1&&c._playerId===near.id);if(client)notice(client,"쓰러졌습니다. 마을에서 부활합니다. 골드 10을 잃었습니다.");}}}else m.aggro=null;}
let data=JSON.stringify(state());for(let c of wss.clients)if(c.readyState===1)c.send(data);},100);
const port=process.env.PORT||3000;server.listen(port,"0.0.0.0",()=>console.log("BASAN RPG v2 running on "+port));