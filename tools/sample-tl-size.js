const {chromium}=require('playwright');const fs=require('fs');
let css=fs.readFileSync('/tmp/claude-0/wb.js','utf8').match(/const css=`([\s\S]*?)`;/)[1];
css+=`#tl .hd::after{order:1}.fsz{order:2}.fsz{margin-left:8px;display:flex;gap:6px}.fsz button{width:40px;height:30px;padding:0;font-size:14px;box-shadow:none!important}
.fsz button.on{color:#fff!important;background:var(--blue)!important;border-color:var(--blue)!important}
#tl.s .post{font-size:15px;min-height:36px;padding:3px 10px;margin-bottom:4px}#tl.s .post .e{width:30px;height:30px;font-size:18px}#tl.s .post .y,#tl.s .post .m{font-size:13px}#tl.s .post .a{font-size:12px}
#tl.l .post{font-size:22px;min-height:60px}#tl.l .post .e{width:48px;height:48px;font-size:28px}`;
const add=(sz)=>`(()=>{const h=document.querySelector('#tl .hd');const d=document.createElement('div');d.className='fsz';d.innerHTML='<button data-z="s">小</button><button data-z="m">中</button><button data-z="l">大</button>';h.appendChild(d);d.querySelector('[data-z=${sz}]').classList.add('on');document.getElementById('tl').classList.add('${sz}')})()`;
(async()=>{const b=await chromium.launch();
for(const z of ['s','m']){const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto('file:///home/claude/manabi-life/ui/mock.html#adult');await p.addStyleTag({content:css});await p.waitForTimeout(9000);await p.evaluate(add(z));await p.waitForTimeout(400);await p.screenshot({path:`/home/claude/manabi-life/docs/ui/s-tl-size-${z}.png`});await p.close()}
const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto('file:///home/claude/manabi-life/ui/lessons.html');await p.waitForTimeout(700);await p.screenshot({path:'/home/claude/manabi-life/docs/ui/s-lessons.png'});await b.close()})();
