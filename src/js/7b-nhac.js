
/* ================= nhạc nền cho trình chiếu ================= */
// Danh sách nhạc đi theo album: phát khi xem trước và chiếu toàn màn hình, nhúng vào file .pptx,
// lưu kèm trong .pbook. Nhạc không nằm trong contentHash nên đổi nhạc không phải dựng lại slide.
const MUS_MAX=12,MUS_MAX_MB=60;
const MUS_TYPES={mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'audio/mp4',aac:'audio/aac',wav:'audio/wav',wma:'audio/x-ms-wma',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',flac:'audio/flac',webm:'audio/webm'};
const MUS_PPT=new Set(['mp3','m4a','mp4','aac','wav','wma']);   // PowerPoint chỉ phát được các loại này
const MUS_RE=/\.(mp3|m4a|mp4|aac|wav|wma|ogg|oga|opus|flac|webm)$/i;
const MUS={list:[],audio:null,i:0,on:false};
const musExt=t=>{const m=String(t.name||'').match(/\.([a-z0-9]+)$/i),e=m?m[1].toLowerCase():'';
  if(MUS_TYPES[e]) return e; const k=Object.keys(MUS_TYPES).find(x=>MUS_TYPES[x]===t.type); return k||'mp3';};
const musTime=s=>{s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const musTotal=()=>MUS.list.reduce((a,t)=>a+(t.dur||0),0);
const musHash=()=>hashStr(MUS.list.map(t=>t.name+'|'+(t.blob?t.blob.size:0)).join('/'));
const musUrl=t=>t.url||(t.url=URL.createObjectURL(t.blob));
const musShowSec=()=>{const c=SS.cfg||SS_DEF; return (SS.slides.length?ssItems().length:0)*(c.dur+c.tdur);};

/* ---- thêm, bỏ, xếp lại ---- */
// Đọc độ dài bài hát; trả -1 nếu trình duyệt không giải mã được file.
function musMeta(blob){return new Promise(res=>{const u=URL.createObjectURL(blob),a=new Audio(); let done=false;
  const fin=d=>{if(done) return; done=true; URL.revokeObjectURL(u); res(d);};
  a.preload='metadata'; a.onloadedmetadata=()=>fin(isFinite(a.duration)?a.duration:0); a.onerror=()=>fin(-1);
  setTimeout(()=>fin(0),8000); a.src=u;});}
async function musAddFiles(list){
  const files=[...list].filter(f=>(f.type||'').startsWith('audio/')||MUS_RE.test(f.name));
  if(!files.length){toast('Không thấy file nhạc nào. App nhận MP3, M4A, WAV, AAC, WMA, OGG, FLAC.',{ms:7000}); return;}
  const room=MUS_MAX-MUS.list.length;
  if(room<=0){toast(`Danh sách nhạc đã đủ ${MUS_MAX} bài. Bỏ bớt rồi thêm lại.`,{ms:6000}); return;}
  const take=files.slice(0,room),over=files.length-take.length,t=toast(`Đang đọc nhạc 0/${take.length}…`,{sticky:true});
  const bad=[],big=[],dup=[]; let n=0;
  for(const f of take){
    t.set(`Đang đọc nhạc ${n+1}/${take.length}…`);
    if(MUS.list.some(x=>x.name===f.name&&x.blob.size===f.size)){dup.push(f.name); continue;}
    if(f.size>MUS_MAX_MB*1048576){big.push(f.name); continue;}
    let blob;
    try{ blob=new Blob([await f.arrayBuffer()],{type:f.type||MUS_TYPES[(f.name.match(/\.([a-z0-9]+)$/i)||['',''])[1].toLowerCase()]||'audio/mpeg'}); }
    catch(e){ bad.push(f.name); continue; }
    const dur=await musMeta(blob);
    if(dur<0){bad.push(f.name); continue;}
    MUS.list.push({id:uid('m'),name:f.name,type:blob.type,dur,blob,url:null}); n++;
  }
  t.close();
  await musChanged();
  if(!n&&!dup.length){toast('Chưa thêm được bài nào.'+(bad.length?` Không đọc được: ${bad.slice(0,3).join('; ')}.`:'')+(big.length?` Lớn hơn ${MUS_MAX_MB} MB: ${big.slice(0,3).join('; ')}.`:''),{ms:10000}); return;}
  let msg=n?`Đã thêm ${n} bài nhạc (cả danh sách ${musTime(musTotal())}).`:'Các bài này đã có trong danh sách.';
  if(dup.length) msg+=` Bỏ qua ${dup.length} bài đã có.`;
  if(big.length) msg+=` Bỏ qua ${big.length} file lớn hơn ${MUS_MAX_MB} MB.`;
  if(bad.length) msg+=` Không đọc được ${bad.length} file: ${bad.slice(0,2).join('; ')}.`;
  if(over) msg+=` Bỏ qua ${over} file vì vượt giới hạn ${MUS_MAX} bài.`;
  const noPpt=MUS.list.filter(x=>!MUS_PPT.has(musExt(x))).length;
  if(noPpt) msg+=` ${noPpt} bài không phải MP3/M4A/WAV nên không nhúng được vào PowerPoint.`;
  toast(msg,{ms:9000});
}
async function musChanged(){ await musPersist(); updateDirty();
  if(!$('#slideModal').hidden){ ssRenderSet(); ssRenderFoot();
    // Thêm nhạc lúc bản xem trước đang chạy thì cho nhạc lên ngay.
    if(MUS.list.length&&SS.player&&SS.player.playing()) musStart(); else if(!MUS.list.length) musStop(); } }

/* ---- phát nhạc trong app ---- */
function musAudio(){ if(!MUS.audio){ const a=new Audio(); a.preload='auto';
    a.addEventListener('ended',()=>musSkip(1,true));
    a.addEventListener('error',()=>{ if(MUS.on&&MUS.list.length>1) musSkip(1,true); });
    MUS.audio=a; } return MUS.audio; }
function musVolApply(){ if(MUS.audio) MUS.audio.volume=clamp((SS.cfg?SS.cfg.musVol:70)/100,0,1); }
function musTry(a){ const p=a.play(); if(p&&p.catch) p.catch(()=>{ if(MUS.on) toast('Trình duyệt chưa cho tự phát nhạc. Bấm nút chạy ở khung xem trước là nhạc lên.',{ms:7000}); }); }
function musLoad(i,play){ const t=MUS.list[i]; if(!t) return; MUS.i=i; const a=musAudio();
  a.src=musUrl(t); musVolApply(); if(play) musTry(a); }
function musSkip(d,auto){ if(!MUS.list.length) return; let n=MUS.i+d;
  if(n>=MUS.list.length){ if(auto&&!SS.cfg.musLoop){ musPause(); return; } n=0; }
  if(n<0) n=MUS.list.length-1;
  musLoad(n,MUS.on||!auto); musRenderList(); }
function musStart(){ if(!MUS.list.length) return; MUS.on=true; const a=musAudio();
  if(!a.src) musLoad(MUS.i<MUS.list.length?MUS.i:0,true); else {musVolApply(); musTry(a);} musRenderList(); }
function musPause(){ MUS.on=false; if(MUS.audio) MUS.audio.pause(); musRenderList(); }
function musStop(){ MUS.on=false; if(MUS.audio){MUS.audio.pause(); MUS.audio.removeAttribute('src');} MUS.i=0; }
function musSetPlaying(p){ if(!MUS.list.length) return; if(p) musStart(); else musPause(); }

/* ---- danh sách nhạc trong hộp Trình chiếu ---- */
function musListHtml(){
  const n=MUS.list.length;
  if(!n) return '<p class="hint">Chưa có nhạc. Thêm MP3, M4A, WAV… để nhạc chạy khi chiếu và nhúng sẵn vào file PowerPoint.</p>';
  const items=MUS.list.map((t,i)=>`<li class="mus-it${MUS.on&&MUS.i===i?' on':''}">`
    +`<button class="mus-nm" data-act="musPlay" data-arg="${i}" title="Phát từ bài này">${esc(t.name)}</button>`
    +`<span class="mus-du mono">${musTime(t.dur)}</span>`
    +`<button class="mus-b" data-act="musMove" data-arg="${i}|-1"${i?'':' disabled'} aria-label="Đưa lên">↑</button>`
    +`<button class="mus-b" data-act="musMove" data-arg="${i}|1"${i===n-1?' disabled':''} aria-label="Đưa xuống">↓</button>`
    +`<button class="mus-b" data-act="musDel" data-arg="${i}" aria-label="Bỏ bài ${esc(t.name)}">${ico('x')}</button></li>`).join('');
  const show=musShowSec(),tot=musTotal(),noPpt=MUS.list.filter(t=>!MUS_PPT.has(musExt(t))).length;
  return `<ul class="mus-list">${items}</ul><p class="hint">${n} bài · ${musTime(tot)}`
    +(show?` · slide chạy khoảng ${musTime(show)}`:'')
    +(show&&tot<show-1?(SS.cfg.musLoop?'. Hết nhạc thì quay lại bài đầu.':'. Hết nhạc thì phần slide còn lại chạy im lặng.'):'.')
    +(noPpt?` ${noPpt} bài không phải MP3/M4A/WAV: app vẫn phát, nhưng không nhúng vào PowerPoint được.`:'')+'</p>';
}
function musRenderList(){ const b=$('#musBox'); if(b) b.innerHTML=musListHtml(); }

/* ---- lưu nhạc vào bộ nhớ đệm ---- */
const musPersist=()=>IDB.db?kvSet('music',MUS.list.map(t=>({id:t.id,name:t.name,type:t.type,dur:t.dur,blob:t.blob}))):Promise.resolve();
function musSet(list){ musStop(); for(const t of MUS.list) if(t.url) URL.revokeObjectURL(t.url);
  MUS.list=(list||[]).filter(t=>t&&t.blob).slice(0,MUS_MAX)
    .map(t=>({id:t.id||uid('m'),name:t.name||'nhac.mp3',type:t.type||'audio/mpeg',dur:+t.dur||0,blob:t.blob,url:null})); }
async function musRestore(){ try{ musSet(await kvGet('music')); }catch(e){ musSet([]); } }

/* ---- nhạc trong file PowerPoint ---- */
// Mỗi bài gắn vào slide mà nó bắt đầu và đặt "phát xuyên slide" (numSld) cho tới khi bài sau vào.
function musPlan(nSlides,slideSec){
  if(!MUS.list.length||!nSlides||!(slideSec>0)) return [];
  const plan=[]; let t=0,k=0;
  while(k<MUS_MAX*4){
    if(t>=nSlides*slideSec) break;
    const slide=Math.min(nSlides-1,Math.floor(t/slideSec+1e-6));
    if(plan.length&&slide<=plan[plan.length-1].slide) break;   // bài trước vẫn đang chạy ở slide này
    const tr=MUS.list[k%MUS.list.length];
    if(MUS_PPT.has(musExt(tr))) plan.push({slide,track:tr});
    t+=Math.max(5,tr.dur||180); k++;
    if(k>=MUS.list.length&&!SS.cfg.musLoop) break;
  }
  plan.forEach((p,i)=>{p.span=(i+1<plan.length?plan[i+1].slide:nSlides)-p.slide;});
  return plan.filter(p=>p.span>0);
}
// Biểu tượng loa cho hình nhạc (PowerPoint bắt hình nhạc phải có ảnh đại diện).
async function musIconBlob(){
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  x.fillStyle='#1d1d1f'; x.fillRect(0,0,64,64); x.fillStyle='#ffffff';
  x.beginPath(); x.moveTo(16,26); x.lineTo(25,26); x.lineTo(35,16); x.lineTo(35,48); x.lineTo(25,38); x.lineTo(16,38); x.closePath(); x.fill();
  x.strokeStyle='#ffffff'; x.lineWidth=3; x.beginPath(); x.arc(37,32,11,-0.9,0.9); x.stroke();
  return toBlob(c,.9);
}
// Hình nhạc đặt ngoài mép slide để lúc chiếu không thấy, nhưng vẫn sửa được trong PowerPoint.
function musPicXml(id,name,ridImg,ridAudio,ridMedia){
  const s=457200;
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${xe(name)}"><a:hlinkClick r:id="" action="ppaction://media"/></p:cNvPr>`
    +`<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>`
    +`<p:nvPr><a:audioFile r:link="${ridAudio}"/><p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">`
    +`<p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${ridMedia}"/></p:ext></p:extLst></p:nvPr></p:nvPicPr>`
    +`<p:blipFill><a:blip r:embed="${ridImg}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
    +`<p:spPr><a:xfrm><a:off x="${-s-91440}" y="0"/><a:ext cx="${s}" cy="${s}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

/* ---- điều khiển ---- */
Object.assign(ACT,{
  musPick(){ const inp=$('#fileMusic'); if(!inp) return; inp.value=''; inp.click(); },
  musDel(i){ i=+i; const t=MUS.list[i]; if(!t) return; const cur=MUS.i===i;
    if(t.url) URL.revokeObjectURL(t.url);
    MUS.list.splice(i,1);
    if(!MUS.list.length) musStop();
    else if(cur){ MUS.i=Math.min(i,MUS.list.length-1); musLoad(MUS.i,MUS.on); }
    else if(MUS.i>i) MUS.i--;
    musChanged(); },
  musMove(a){ const [i,d]=String(a).split('|').map(Number),j=i+d; if(!MUS.list[i]||!MUS.list[j]) return;
    const cur=MUS.list[MUS.i],tmp=MUS.list[i]; MUS.list[i]=MUS.list[j]; MUS.list[j]=tmp;
    MUS.i=Math.max(0,MUS.list.indexOf(cur)); musChanged(); },
  musClearAll(){ musStop(); for(const t of MUS.list) if(t.url) URL.revokeObjectURL(t.url); MUS.list=[]; musChanged(); },
  musPlay(i){ i=+i; if(!MUS.list[i]) return; MUS.on=true; musLoad(i,true); musRenderList(); }
});
$('#fileMusic').addEventListener('change',e=>{const fs=e.target.files; if(fs&&fs.length) musAddFiles(fs);});
