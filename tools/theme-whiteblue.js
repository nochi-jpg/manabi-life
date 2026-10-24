const {chromium}=require('playwright');
const css=`:root{--blue:#2f6aa8}
:root{--blue:#2f6aa8}
#stage{background:#fdfdfb!important}#stage::before{display:none!important}
.pearl{background:#fff!important;border:2px solid #dfe7f3!important;border-radius:24px!important;box-shadow:0 10px 30px rgba(47,106,168,.12)!important}
.pearl h3{color:var(--blue)!important}.pearl h3::after{background:#eef3fa!important}
button{color:var(--blue)!important;background:#fff!important;border:2px solid #c9d7ea!important;border-radius:999px!important;box-shadow:0 3px 0 #dfe7f3!important;text-shadow:none!important;filter:none!important}
button.gl{color:var(--blue)!important;background:#fff!important;border-color:#c9d7ea!important}
.gl::before{display:none!important}
button.g-green,button.g-cyan,button.g-purple,#speed button.on,.tabs button.on,button.main{color:#fff!important;background:var(--blue)!important;border-color:var(--blue)!important;box-shadow:0 3px 0 #1f4f82!important}
#speed .pz{border-color:var(--blue)!important}#speed .pl{border-left-color:var(--blue)!important}
#speed button.on .pl{border-left-color:#fff!important}#speed button.on .pz{border-color:#fff!important}
.bar{background:#e3ebf6!important;border:0!important;border-radius:999px!important;transform:none!important;box-shadow:none!important}
.date{background:var(--blue)!important;border:0!important;box-shadow:none!important;color:#fff}
.pname{background:#fff!important;box-shadow:inset 0 -3px 0 var(--blue)!important}
.ctrl,.seasons,.life{background:#fff!important;border:2px solid #dfe7f3!important;color:var(--ink)!important}
.seasons span{color:var(--ink)}.seasons span.on{background:var(--blue)!important;color:#fff!important;box-shadow:none!important}
#focus{box-shadow:0 3px 0 #dfe7f3!important}#focus .arw{color:var(--blue)!important}
#tl{background:#fff!important;clip-path:none!important;border:2px solid #dfe7f3;border-radius:24px;box-shadow:0 10px 30px rgba(47,106,168,.12)!important;padding-left:18px!important}
#tl .hd{color:var(--blue)!important}#tl .hd::after{background:#eef3fa!important}
.post{background:#f5f8fd!important;border-color:#eef3fa!important;color:var(--ink)}
.post .y,.post .m{color:var(--ink)!important}.post .a{color:var(--ink2)!important}
.post .e{background:#fff!important;box-shadow:0 0 0 2px #e3ebf6}
.post.choice{background:#eef4ff!important;border-color:#bcd2ee!important}.post .t small{color:var(--blue)!important}
.post.big{background:#fff0f5!important;border-color:#f6c4d8!important}
#feed{scrollbar-color:#c9d7ea transparent}
#bg{border:2px solid #dfe7f3!important;border-radius:24px!important;box-shadow:0 10px 30px rgba(47,106,168,.12)!important}
#bg .tag{background:#fff!important;color:var(--blue);border:2px solid #dfe7f3!important}
#face .pic{box-shadow:none!important;border-radius:16px!important}
#face .role{background:#f5f8fd!important;box-shadow:none!important}
.chip{background:#eef4ff!important;color:var(--blue);box-shadow:none!important}
.chip.more{background:var(--blue)!important;color:#fff}.chip.no{background:#f3f5f9!important}
.kv{border-bottom-color:#e3ebf6!important}

#behind{background-image:url(file:///tmp/claude-0/th/wb_a.png)!important}
#box,#paper{background:#fff!important;border:2px solid #dfe7f3!important;box-shadow:0 16px 40px rgba(47,106,168,.18)!important}
.cs{background:var(--blue)!important;border:0!important;box-shadow:none!important}
.img{box-shadow:none!important}.img .tag{background:#fff!important;color:var(--blue)!important;border:2px solid #dfe7f3!important}
.sec{background:#f5f8fd!important;box-shadow:none!important}
.money div,.eff div,.foot{background:#fff!important;border:2px solid #e3ebf6}
.chip{background:#eef4ff!important}
.rate{background:var(--blue)!important;text-shadow:none!important}
.hd{border-bottom-color:#dfe7f3!important}.tr{border-bottom-color:#eef3fa!important}
.foot .kv+.kv,.right{border-color:#dfe7f3!important}
.ov{background:rgba(253,253,251,.85)!important;backdrop-filter:none!important}
`;
(async()=>{const b=await chromium.launch();
const shot=async(u,c,f,w)=>{const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto('file:///home/claude/manabi-life/ui/'+u);if(c)await p.addStyleTag({content:c});await p.waitForTimeout(w);await p.screenshot({path:f});await p.close()};
await shot('mock.html',css,'th/wb_g.png',6500);await shot('mock.html#adult',css,'th/wb_a.png',6500);
await shot('job.html',css,'th/wb_job.png',800);await shot('report.html',css,'th/wb_rep.png',800);
await shot('title.html','','th/wb_t.png',600);await shot('options.html','','th/wb_o.png',600);await b.close()})();
