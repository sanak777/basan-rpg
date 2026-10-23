const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();
app.use(express.static("public"));
app.get("/health", (_, res) => res.json({ok:true}));
const server = http.createServer(app);
const wss = new WebSocket.Server({server});
const players = new Map();
const monsters = [];
const WORLD = {w:2400,h:1600};
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
for(let i=0;i<22;i++) monsters.push({
  id:"m"+i, type:i%4===0?"goblin":"slime",
  x:rand(140,WORLD.w-140), y:rand(140,WORLD.h-140),
  hp:i%4===0?65:35, maxHp:i%4===0?65:35, alive:true, respawnAt:0
});
function safeSend(ws,obj){ if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
function publicState(){
  return {type:"state", world:WORLD,
    players:[...players.values()].map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,level:p.level,xp:p.xp,gold:p.gold})),
    monsters:monsters.map(m=>({id:m.id,type:m.type,x:m.x,y:m.y,hp:m.hp,maxHp:m.maxHp,alive:m.alive}))};
}
wss.on("connection", ws=>{
  const id=crypto.randomUUID();
  const p={id,name:"모험가",x:WORLD.w/2+rand(-80,80),y:WORLD.h/2+rand(-80,80),hp:100,maxHp:100,level:1,xp:0,gold:0,lastAttack:0};
  players.set(id,p);
  safeSend(ws,{type:"welcome",id,player:p,world:WORLD});
  ws.on("message",raw=>{
    let msg; try{msg=JSON.parse(raw.toString())}catch{return}
    const cur=players.get(id); if(!cur)return;
    if(msg.type==="name"){
      const name=String(msg.name||"모험가").trim().slice(0,12);
      cur.name=name||"모험가";
    }
    if(msg.type==="move"){
      const dx=Math.max(-1,Math.min(1,Number(msg.dx)||0));
      const dy=Math.max(-1,Math.min(1,Number(msg.dy)||0));
      const speed=Number(msg.speed)===1?4:3.2;
      cur.x=Math.max(28,Math.min(WORLD.w-28,cur.x+dx*speed));
      cur.y=Math.max(28,Math.min(WORLD.h-28,cur.y+dy*speed));
    }
    if(msg.type==="attack" && Date.now()-cur.lastAttack>420){
      cur.lastAttack=Date.now();
      let target=monsters.filter(m=>m.alive && Math.hypot(m.x-cur.x,m.y-cur.y)<105).sort((a,b)=>Math.hypot(a.x-cur.x,a.y-cur.y)-Math.hypot(b.x-cur.x,b.y-cur.y))[0];
      if(target){
        const damage=rand(12,24)+(cur.level-1)*2;
        target.hp=Math.max(0,target.hp-damage);
        safeSend(ws,{type:"notice",text:`${target.type==="goblin"?"고블린":"슬라임"}에게 ${damage} 피해!`});
        if(target.hp<=0){
          target.alive=false; target.respawnAt=Date.now()+7000;
          cur.xp+=target.type==="goblin"?30:15; cur.gold+=target.type==="goblin"?12:5;
          safeSend(ws,{type:"notice",text:`처치 성공! 경험치와 골드를 획득했습니다.`});
          while(cur.xp>=cur.level*100){cur.xp-=cur.level*100;cur.level++;cur.maxHp+=10;cur.hp=cur.maxHp;safeSend(ws,{type:"notice",text:`레벨 업! 현재 레벨 ${cur.level}`});}
        }
      } else safeSend(ws,{type:"notice",text:"공격 범위 안에 몬스터가 없습니다."});
    }
  });
  ws.on("close",()=>players.delete(id));
});
setInterval(()=>{
  const now=Date.now();
  for(const m of monsters) if(!m.alive && m.respawnAt<=now){m.alive=true;m.hp=m.maxHp;m.x=rand(140,WORLD.w-140);m.y=rand(140,WORLD.h-140);}
  const state=JSON.stringify(publicState());
  for(const client of wss.clients) if(client.readyState===WebSocket.OPEN) client.send(state);
},100);
const port=process.env.PORT||3000;
server.listen(port,"0.0.0.0",()=>console.log("BASAN RPG running on "+port));
