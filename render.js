// node render.js scene.html out.mp4 [fps]
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
(async()=>{const [,,html,out,fpsArg]=process.argv;const fps=+(fpsArg||30);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+path.resolve(html));await p.evaluate(()=>document.fonts.ready);
const total=await p.evaluate(()=>window.TOTAL);
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium',out],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<total;f++){await p.evaluate(f=>window.renderFrame(f),f);ff.stdin.write(await p.screenshot({type:'jpeg',quality:92}));}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('frames',total);})();
