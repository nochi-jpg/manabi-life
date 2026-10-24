const {chromium}=require('playwright');
const css=`
#stage{background:#fdfdfb!important}#stage::before{opacity:1!important;background-image:none!important;background-size:100% 32px!important}
.ctrl,.seasons,.life{background:#f3f6fc!important;border-color:#e3e8f2!important;color:var(--ink)!important}
.seasons span{color:var(--ink)}
#tl{background:#fff!important;outline:2px solid #e3e8f2;outline-offset:-2px;box-shadow:inset 6px 0 0 #f08a1c!important}
#tl .hd{color:var(--ink2)!important}
.post{background:#f3f6fc!important;border-color:rgba(35,48,90,.08)!important;color:var(--ink)}
.post .y,.post .m{color:var(--ink)!important}.post .a{color:var(--ink2)!important}
.post .e{background:#fff!important;box-shadow:0 0 0 1px rgba(35,48,90,.1)!important}
.post.choice{background:linear-gradient(90deg,#fff1c4,#fffaf0)!important;border-color:#f3c94a!important}
.post .t small{color:#c48a00!important}
/* 影を消す（立体のつやは残す） */
.pearl{box-shadow:inset 0 0 0 3px #ffe2a8!important}
#bg{box-shadow:inset 0 0 0 3px #ffe2a8!important}
button{box-shadow:none!important}
button:not(.gl){border-color:#d6deee!important}
.gl{box-shadow:inset 0 3px 0 rgba(255,255,255,.45),inset 0 -4px 0 rgba(0,0,0,.16)!important;text-shadow:none!important}
.bar{box-shadow:none!important}
#face .role{box-shadow:none!important;border:1px solid #d6deee}
.seasons span.on{box-shadow:0 0 0 3px var(--cyan)!important}
.pname{box-shadow:inset 0 -4px 0 var(--cyan)!important}
.date{box-shadow:none!important}`;
(async()=>{const b=await chromium.launch();
const shot=async(u,c,f,w)=>{const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto('file:///home/claude/manabi-life/ui/'+u);if(c)await p.addStyleTag({content:c});await p.waitForTimeout(w);await p.screenshot({path:f});await p.close()};
await shot('mock.html',css,'th/w2_g.png',6500);await shot('mock.html#adult',css,'th/w2_a.png',6500);
await shot('title.html','','th/w2_t.png',600);await shot('options.html','','th/w2_o.png',600);await b.close()})();
