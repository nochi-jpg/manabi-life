const {chromium}=require('playwright');
const dot=c=>`#stage::before{background-image:radial-gradient(${c} 1px,transparent 1.5px)!important;opacity:.12!important}`;
// 本編を明るくするときの共通（暗い帯を白っぽく、文字を紺に）
const lightGame=(panel,accent)=>`
.ctrl,.seasons,.life{background:${panel}!important;border-color:rgba(35,48,90,.15)!important;color:var(--ink)!important}
.seasons span{color:var(--ink)}
#speed .pz{border-color:#fff}
#tl{background:linear-gradient(100deg,rgba(255,255,255,.94),rgba(255,255,255,.86))!important;box-shadow:inset 6px 0 0 ${accent}!important}
#tl .hd{color:var(--ink2)!important}
.post{background:#f3f6fc!important;border-color:rgba(35,48,90,.08)!important;color:var(--ink)}
.post .y,.post .m{color:var(--ink)!important}.post .a{color:var(--ink2)!important}
.post .e{background:#fff!important;box-shadow:0 0 0 1px rgba(35,48,90,.1)}
.post.choice{background:linear-gradient(90deg,#fff1c4,#fffaf0)!important;border-color:#f3c94a!important}
.post .t small{color:#c48a00!important}
#feed{scrollbar-color:rgba(35,48,90,.3) transparent}`;
const logoCard=`#logo{background-color:#fff;border-radius:28px;width:760px;height:400px;left:260px;top:24px;box-shadow:0 0 0 4px #fff,0 0 0 7px #ffe2a8,0 12px 26px rgba(5,10,40,.4)}#menu{top:452px}`;
const T=[
 {id:'0_now',name:'いまの色',game:'',front:''},
 {id:'1_navy',name:'ネイビー統一',game:'',
  front:`#stage.white{background:radial-gradient(ellipse at 30% 20%,#2b3f8a 0%,transparent 55%),radial-gradient(ellipse at 90% 90%,#3a1f6e 0%,transparent 50%),linear-gradient(160deg,#1b2a5e,#0b1230)!important}${logoCard}#note,#cred{color:#9fb4dc!important}`},
 {id:'2_sky',name:'そらいろ',
  game:`#stage{background:linear-gradient(180deg,#e9f6ff 0%,#cfe8fb 60%,#b7dbf6 100%)!important}${dot('#2f6aa8')}${lightGame('rgba(255,255,255,.8)','#1ec8ea')}`,
  front:`#stage.white{background:linear-gradient(180deg,#e9f6ff 0%,#cfe8fb 60%,#b7dbf6 100%)!important}#logo{mix-blend-mode:multiply}`},
 {id:'3_cream',name:'クリーム（ノート）',
  game:`#stage{background:#fbf5ea!important}#stage::before{opacity:1!important;background-image:linear-gradient(rgba(47,106,168,.08) 1px,transparent 1px)!important;background-size:100% 32px!important}${lightGame('rgba(255,255,255,.9)','#f08a1c')}`,
  front:`#stage.white{background:#fbf5ea!important}#stage.white::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(47,106,168,.08) 1px,transparent 1px);background-size:100% 32px}#logo{mix-blend-mode:multiply}`},
 {id:'4_hybrid',name:'白地＋ネイビーのカード',
  game:`#stage{background:linear-gradient(180deg,#f7f9fd,#e6ecf7)!important}${dot('#23305a')}#tl{background:linear-gradient(100deg,#1b2a5e,#16224a)!important}.ctrl,.seasons,.life{background:#1b2a5e!important}`,
  front:``},
 {id:'5_mint',name:'ミント（黒板の緑）',
  game:`#stage{background:radial-gradient(ellipse at 30% 20%,#2f7a6a 0%,transparent 55%),linear-gradient(160deg,#1f5a52,#0e2e2b)!important}
   .ctrl,.seasons,.life{background:rgba(6,30,26,.6)!important}
   #tl{background:linear-gradient(100deg,rgba(14,52,46,.94),rgba(20,70,62,.86))!important;box-shadow:inset 6px 0 0 #43d6a2!important}#tl .hd{color:#a6dccb!important}.post .a{color:#a6dccb!important}
   .date{background:linear-gradient(180deg,#2c6b60,#184640)!important;border-color:#0b2622!important}`,
  front:`#stage.white{background:radial-gradient(ellipse at 30% 20%,#2f7a6a 0%,transparent 55%),linear-gradient(160deg,#1f5a52,#0e2e2b)!important}${logoCard}#note,#cred{color:#a6dccb!important}`},
 {id:'6_sunset',name:'夕やけ（あたたかい紺）',
  game:`#stage{background:radial-gradient(ellipse at 80% 10%,#ff9a6b55 0%,transparent 45%),radial-gradient(ellipse at 10% 90%,#7a3f8f 0%,transparent 50%),linear-gradient(170deg,#3a2f6e,#1a1638)!important}
   #tl{background:linear-gradient(100deg,rgba(40,30,80,.92),rgba(60,40,100,.82))!important;box-shadow:inset 6px 0 0 #ffb04d!important}`,
  front:`#stage.white{background:linear-gradient(180deg,#fff6ec 0%,#ffe6d3 100%)!important}#logo{mix-blend-mode:multiply}`},
];
(async()=>{const b=await chromium.launch();
const shot=async(u,css,f)=>{const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto('file:///home/claude/manabi-life/ui/'+u);if(css)await p.addStyleTag({content:css});await p.waitForTimeout(u=='mock.html'?6500:600);await p.screenshot({path:f});await p.close()};
for(const t of T){const d='/tmp/claude-0/th/'+t.id;
 await shot('mock.html',t.game,d+'_g.png');const fr=t.front.replaceAll('#stage.white','#stage');await shot('title.html',fr,d+'_t.png');await shot('options.html',fr,d+'_o.png');}
await b.close();require('fs').writeFileSync('/tmp/claude-0/th/names.json',JSON.stringify(T.map(t=>[t.id,t.name])))})();
