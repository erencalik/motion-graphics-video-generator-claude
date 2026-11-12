---
name: motion-graphics-video-generator
description: Produces an animated MP4 motion-graphics video with music from a single request (9:16 Reels or 16:9) by rendering an HTML/CSS/JS animation frame by frame and joining it with ffmpeg. Use for motion graphics, kinetic typography, animated stats, Reels animations.
---

# Motion Graphics Video

Produces an MP4 end to end inside Claude's code environment, with no editing software or stock footage. Requires code execution and file creation (on claude.ai: Settings > Capabilities). For a brand video, upload the logo, photos, colours and fonts or point to a brand style file. Reply in the user's language.

## How it works

1. The animation is written as a single HTML page. Every element's position, size, colour and opacity is computed **from the frame number** (`window.renderFrame(f)`); no CSS transitions, setTimeout or requestAnimationFrame. That makes the render deterministic.
2. Headless Chrome (Playwright) captures every frame. 20 s × 60 fps = 1,200 frames.
3. ffmpeg turns the frames into an MP4 (H.264, yuv420p).
4. Music is synthesised in code, timed to the transitions, and added to the video.

## Request checklist (ask once for whatever is missing)

1. **Length:** 15–20 s is ideal.
2. **Format:** 9:16 (1080x1920) for Reels/TikTok/Shorts, 16:9 (1920x1080) for YouTube/portfolio.
3. **Source material:** a website, uploaded photos, a logo, or nothing.
4. **Style:** name the technique: kinetic typography, animated infographic/stats, particles, halftone, map/topography, counter, timeline. A named technique gives more reliable results.
5. **Rules and exclusions:** colours to match, things to leave out (e.g. prices, extra text).
6. **Ambition:** if the user says "do your best", Claude picks concept, palette and music itself and goes bolder.

Ready-made structure for a story Reel: logo/hook intro (0–2 s) → story sentence in kinetic type → a number growing on a counter → timeline or map → closing card (account handle). Keep on-screen text inside the Reels safe area (top 210 px, bottom 310 px, right 84 px clear). Numbers and dates must be sourced; never animate an invented number.

## Production steps

1. Write the scene plan second by second (table: time | what's on screen | transition | audio hit) and show it.
2. Write `scene.html`. Rules: fixed pixel size, define `window.TOTAL` (total frames) and `window.renderFrame(f)`; interpolate with easing functions; embed fonts as base64 woff2 (the environment may not reach Google Fonts) and images as base64.
3. Capture 3–4 PNG frames first and inspect them yourself (overflowing text, wrong font, empty frame). Then do the full render.
4. Synthesise music with `audio.py`; put the hits on scene transitions. If the user uploads their own music, use that.
5. Join, verify length/resolution with `ffprobe`, visually check a middle frame, deliver the MP4.

Render time: 20 s at 60 fps takes roughly 8–10 minutes. Use 30 fps for quick drafts, 60 fps for the final. Take revision requests by timecode ("make the counter at 0:07 slower").

## Templates (tested; also shipped as files next to this SKILL.md)

**scene.html** (skeleton)
```html
<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0E0E10;font-family:'Montserrat',Arial,sans-serif}
#s{position:relative;width:1080px;height:1920px}
.t{position:absolute;left:90px;right:90px;color:#F5F1E8;font-weight:800;line-height:1.05}
</style></head><body><div id="s">
<div class="t" id="a" style="top:520px;font-size:120px">5,126</div>
<div class="t" id="b" style="top:680px;font-size:64px;color:#FF5A1F">FAILED PROTOTYPES</div>
</div><script>
const FPS=30,DUR=3;window.TOTAL=FPS*DUR;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const easeOut=t=>1-Math.pow(1-t,3);
window.renderFrame=f=>{const t=f/FPS;
 const p=easeOut(clamp(t/0.6));a.style.opacity=p;a.style.transform=`translateY(${(1-p)*80}px)`;
 a.textContent=Math.round(5126*easeOut(clamp(t/1.5))).toLocaleString('en-US');
 const q=easeOut(clamp((t-0.8)/0.5));b.style.opacity=q;b.style.transform=`scale(${0.8+0.2*q})`;};
</script></body></html>
```

**render.js**: `node render.js scene.html video.mp4 30` (if Playwright is missing: `npm i playwright && npx playwright install chromium`; failing that, build the same loop with Python Playwright)
```js
// node render.js scene.html out.mp4 [fps]
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
(async()=>{const [,,html,out,fpsArg]=process.argv;const fps=+(fpsArg||30);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+path.resolve(html));await p.evaluate(()=>document.fonts.ready);
const total=await p.evaluate(()=>window.TOTAL);
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium',out],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<total;f++){await p.evaluate(f=>window.renderFrame(f),f);ff.stdin.write(await p.screenshot({type:'jpeg',quality:92}));}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('frames',total);})();
```
For 16:9, change the viewport and the page size to 1920x1080.

**audio.py**: `python3 audio.py music.wav <seconds>` (numpy synthesis: pad + hits)
```python
# python3 audio.py music.wav 3   -> synthesised pad + hits
import sys,wave,numpy as np
out,dur=sys.argv[1],float(sys.argv[2]);sr=44100;t=np.arange(int(sr*dur))/sr
pad=sum(np.sin(2*np.pi*f*t) for f in (110,164.8,220))*0.08*np.minimum(1,t/0.5)
def hit(at,f0=60):
    x=np.zeros_like(t);m=t>=at;tt=t[m]-at;x[m]=np.sin(2*np.pi*f0*tt*(1+3*np.exp(-tt*30)))*np.exp(-tt*8)*0.6;return x
y=pad+hit(0.0)+hit(0.8,90)
y=y/np.max(np.abs(y))*0.8;fade=np.minimum(1,(dur-t)/0.4);y*=fade
w=wave.open(out,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((y*32767).astype(np.int16).tobytes());w.close()
```

**Join**
```bash
ffmpeg -y -i video.mp4 -i music.wav -c:v copy -c:a aac -b:a 192k -shortest final.mp4
```

## Limits

- Effects can be applied to photos (particles, halftone, cut-outs); people can't be animated and lip sync isn't possible (use a dedicated avatar/video model for that).
- Synthesised music is electronic; for real instruments or vocals, upload an audio file.
- No copyrighted characters or logos the user doesn't own. A real company logo only in news/commentary context, with its source.

Credit: based on the method in Michael Ly's guide "How to Generate Motion Graphics Videos with Claude" (milleemd.com/guides/motion-graphics-videos); the code templates were written for this skill.
