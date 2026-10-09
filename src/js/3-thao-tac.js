
/* ================= kéo thả trên trang ================= */
function drag(e,onMove,onUp){const id=e.pointerId;
  const mv=ev=>{if(ev.pointerId===id) onMove(ev);};
  const up=ev=>{if(ev.pointerId!==id) return; window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); onUp(ev);};
  window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);}
function setMouse(ev){const r=$('#vp').getBoundingClientRect(); V.mouse={x:(ev.clientX-r.left-V.origin.x)/V.sc,y:(ev.clientY-r.top-V.origin.y)/V.sc}; const p=$('#pos'); if(p) p.textContent=posText(); schedRulers();}
function snapTargets(sp,f){
  const A=S.A,Hh=A.h,SW=spreadW(sp),m=sp.margin,x=[0,SW,SW/2,-A.bleed,SW+A.bleed],y=[0,Hh,Hh/2,m,Hh-m,-A.bleed,Hh+A.bleed];
  for(const sd of ['L','R']){const r=sideRect(sp,sd); x.push(r.x,r.x+r.w,r.x+r.w/2,r.x+m,r.x+r.w-m);}
  for(const gd of S.guides)(gd.a==='v'?x:y).push(gd.v);
  for(const o of sp.frames) if(o!==f&&!o.rot&&o.side!=='P'){x.push(o.x,o.x+o.w,o.x+o.w/2); y.push(o.y,o.y+o.h,o.y+o.h/2);}
  return {x,y};}
function snap1(c,vals,thr){let best=null; for(const v of vals) for(const t of c){const d=t-v; if(Math.abs(d)<=thr&&(!best||Math.abs(d)<Math.abs(best.d))) best={d,c:t};} return best;}
let ghostOn=false;
function ghost(src,ev){const gEl=$('#ghost'); if(!src){gEl.hidden=true; ghostOn=false; return;} gEl.style.backgroundImage=`url("${src}")`; gEl.hidden=false; ghostOn=true; if(ev) moveGhost(ev);}
function moveGhost(ev){const gEl=$('#ghost'); gEl.style.left=ev.clientX+'px'; gEl.style.top=ev.clientY+'px';}
function setDrop(n){$$('#sheetWrap .frame.drop').forEach(x=>{if(x!==n) x.classList.remove('drop');}); if(n) n.classList.add('drop');}
function dragPan(e,f){
  const sx=e.clientX,sy=e.clientY,p0={x:f.panX,y:f.panY},a=-f.rot*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a); let moved=false,swapping=false,target=null;
  drag(e,ev=>{
    const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&Math.hypot(dx,dy)<3) return;
    if(!moved){moved=true; beginEdit(); document.body.classList.add('dragging');}
    const n=frameNode(f.id),r=n&&n.getBoundingClientRect();
    const out=r&&(ev.clientX<r.left-14||ev.clientX>r.right+14||ev.clientY<r.top-14||ev.clientY>r.bottom+14);
    if(out&&!swapping){swapping=true; f.panX=p0.x; f.panY=p0.y; restyle(f); ghost(photoOf(f).thumb,ev);}
    else if(!out&&swapping){swapping=false; ghost(null); setDrop(null); target=null;}
    if(swapping){moveGhost(ev); const t=document.elementFromPoint(ev.clientX,ev.clientY); const fn=t&&t.closest('#sheetWrap .frame.photo'); target=fn&&fn.dataset.id!==f.id?fn:null; setDrop(target); return;}
    const q=cropGeom(f); if(!q) return;
    f.panX=p0.x+(dx*ca-dy*sa)/(q.fw*V.sc); f.panY=p0.y+(dx*sa+dy*ca)/(q.fh*V.sc); clampPan(f); restyle(f);
  },()=>{
    document.body.classList.remove('dragging'); ghost(null); setDrop(null);
    if(!moved) return;
    if(swapping&&target){const o=curSpread().frames.find(x=>x.id===target.dataset.id); if(o){const a1=f.photo; setPhoto(f,o.photo); setPhoto(o,a1); if(!f.photo) f.photo=null;}}
    commit();
  });
}
function dragMove(e,f){
  const sp=curSpread(),sx=e.clientX,sy=e.clientY,x0=f.x,y0=f.y,old=f.side; let moved=false;
  drag(e,ev=>{
    const dx=(ev.clientX-sx)/V.sc,dy=(ev.clientY-sy)/V.sc; if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<3) return;
    if(!moved){moved=true; beginEdit();}
    let nx=x0+dx,ny=y0+dy; const lines=[];
    if(!ev.altKey&&f.side!=='P'){const t=snapTargets(sp,f),thr=7/V.sc;
      const a=snap1(t.x,[nx,nx+f.w/2,nx+f.w],thr); if(a){nx+=a.d; lines.push(['v',a.c]);}
      const b=snap1(t.y,[ny,ny+f.h/2,ny+f.h],thr); if(b){ny+=b.d; lines.push(['h',b.c]);}}
    f.x=nx; f.y=ny; restyle(f); showSnaps(lines); setMouse(ev);
  },()=>{showSnaps([]); if(!moved) return; reside(sp,f,old); commit();});
}
function dragResize(e,f,h){
  const sp=curSpread(),sx=e.clientX,sy=e.clientY,o={x:f.x,y:f.y,w:f.w,h:f.h},ar=o.w/o.h,MIN=5; let moved=false;
  drag(e,ev=>{
    const dx=(ev.clientX-sx)/V.sc,dy=(ev.clientY-sy)/V.sc; if(!moved){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<2) return; moved=true; beginEdit();}
    let x0=o.x,y0=o.y,x1=o.x+o.w,y1=o.y+o.h; const lines=[];
    if(h.includes('w')) x0+=dx; if(h.includes('e')) x1+=dx; if(h.includes('n')) y0+=dy; if(h.includes('s')) y1+=dy;
    if(!ev.altKey){const t=snapTargets(sp,f),thr=7/V.sc,tryS=(arr,v,ax)=>{const r=snap1(arr,[v],thr); if(r){lines.push([ax,r.c]); return v+r.d;} return v;};
      if(h.includes('w')) x0=tryS(t.x,x0,'v'); if(h.includes('e')) x1=tryS(t.x,x1,'v'); if(h.includes('n')) y0=tryS(t.y,y0,'h'); if(h.includes('s')) y1=tryS(t.y,y1,'h');}
    if(x1-x0<MIN){if(h.includes('w')) x0=x1-MIN; else x1=x0+MIN;} if(y1-y0<MIN){if(h.includes('n')) y0=y1-MIN; else y1=y0+MIN;}
    if(ev.shiftKey&&h.length===2){const hh=(x1-x0)/ar; if(h.includes('n')) y0=y1-hh; else y1=y0+hh;}
    Object.assign(f,{x:x0,y:y0,w:x1-x0,h:y1-y0}); clampPan(f); restyle(f); showSnaps(lines); schedRulers();
  },()=>{showSnaps([]); if(!moved) return; reside(sp,f,f.side); commit();});
}
function guideDrag(e,gd,isNew){
  const vp=$('#vp'); let inList=!isNew; beginEdit(); V.guides=true;
  drag(e,ev=>{const r=vp.getBoundingClientRect(),inside=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
    let v=gd.a==='h'?(ev.clientY-r.top-V.origin.y)/V.sc:(ev.clientX-r.left-V.origin.x)/V.sc;
    gd.v=ev.shiftKey?Math.round(v/10)*10:Math.round(v*2)/2;
    if(inside&&!inList){S.guides.push(gd); inList=true;} else if(!inside&&inList){S.guides.splice(S.guides.indexOf(gd),1); inList=false;}
    renderGuides(); setMouse(ev); const p=$('#pos'); if(p) p.textContent=`Đường gióng ${gd.a==='h'?'Y':'X'} = ${fmtcm(gd.v)} cm`;
  },()=>commit());
}
function onDouble(f){
  if(f.type==='photo'&&!photoOf(f)){pickFiles(f.id); return;}
  if(f.type!=='text') return;
  const n=frameNode(f.id),t=n&&n.querySelector('.txt'); if(!t) return;
  V.editing=f.id; t.contentEditable='true'; t.focus();
  const rg=document.createRange(); rg.selectNodeContents(t); const s=getSelection(); s.removeAllRanges(); s.addRange(rg);
  t.addEventListener('blur',()=>{V.editing=null; const v=t.innerText.replace(/\n$/,''); act(()=>{const ff=findFrame(f.id); if(ff){ff.text=v; ff.edited=true;}});},{once:true});
}
function bindStage(){
  const ws=$('#ws'),vp=$('#vp');
  ws.addEventListener('pointerdown',e=>{
    if(e.button!==0||V.preview) return;
    const t=e.target;
    if(V.editing&&t.closest('.txt[contenteditable="true"]')) return;
    const hd=t.closest('[data-h]'),mv=t.closest('[data-mv]');
    if(hd||mv){const f=selFrame(); if(!f) return; e.preventDefault(); return hd?dragResize(e,f,hd.dataset.h):dragMove(e,f);}
    const gEl=t.closest('.guide'); if(gEl){e.preventDefault(); return guideDrag(e,S.guides[+gEl.dataset.gi],false);}
    const fn=t.closest('.frame');
    if(fn){const f=curSpread().frames.find(x=>x.id===fn.dataset.id); if(!f) return; e.preventDefault();
      if(document.activeElement&&document.activeElement!==document.body) document.activeElement.blur();
      const now=performance.now(),dbl=V.last.id===f.id&&now-V.last.t<380; V.last={id:f.id,t:now};
      if(!S.sel||S.sel.id!==f.id) select({kind:'frame',id:f.id});
      if(dbl){V.last={}; return onDouble(f);}
      if(f.type==='photo'&&photoOf(f)) return dragPan(e,f);
      return dragMove(e,f);}
    const bg=t.closest('[data-side]'); if(bg){select({kind:'side',side:bg.dataset.side}); return;}
    if(S.sel) select(null);
  });
  vp.addEventListener('pointermove',setMouse);
  vp.addEventListener('pointerleave',()=>{V.mouse=null; const p=$('#pos'); if(p) p.textContent=posText(); schedRulers();});
  vp.addEventListener('scroll',()=>{updateOrigin(); schedRulers();});
  let wt=0;
  vp.addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey){e.preventDefault(); const r=vp.getBoundingClientRect(); zoomTo((V.sc/MM)*Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top); return;}
    const f=selFrame(); if(!f||!photoOf(f)||V.preview) return; const n=e.target.closest&&e.target.closest('.frame'); if(!n||n.dataset.id!==f.id) return;
    e.preventDefault(); beginEdit(); f.zoom=clamp(f.zoom*Math.exp(-e.deltaY*.0012),1,5); clampPan(f); restyle(f);
    clearTimeout(wt); wt=setTimeout(commit,450);
  },{passive:false});
  $('#rT').addEventListener('pointerdown',e=>{if(e.button===0&&!V.preview){e.preventDefault(); guideDrag(e,{a:'h',v:0},true);}});
  $('#rL').addEventListener('pointerdown',e=>{if(e.button===0&&!V.preview){e.preventDefault(); guideDrag(e,{a:'v',v:0},true);}});
  // thả ảnh từ thư viện hoặc từ máy vào khung
  ws.addEventListener('dragover',e=>{const ty=[...e.dataTransfer.types]; if(!ty.includes('text/x-pid')&&!ty.includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect='copy'; setDrop(e.target.closest('#sheetWrap .frame.photo'));});
  ws.addEventListener('dragleave',e=>{if(!ws.contains(e.relatedTarget)) setDrop(null);});
  ws.addEventListener('drop',e=>{e.preventDefault(); const fn=e.target.closest('#sheetWrap .frame.photo'); setDrop(null);
    const pid=e.dataTransfer.getData('text/x-pid');
    if(pid){ if(fn){const f=findFrame(fn.dataset.id); act(()=>setPhoto(f,pid));} else toast('Thả ảnh vào một khung trên trang.'); return;}
    if(e.dataTransfer.files.length) addFiles(e.dataTransfer.files,fn?fn.dataset.id:null);});
}
function bindPanels(){
  const left=$('#left');
  left.addEventListener('dragstart',e=>{const th=e.target.closest('.th'); if(!th) return; e.dataTransfer.setData('text/x-pid',th.dataset.pid); e.dataTransfer.effectAllowed='copy';});
  left.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault(); left.classList.add('over');}});
  left.addEventListener('dragleave',e=>{if(!left.contains(e.relatedTarget)) left.classList.remove('over');});
  left.addEventListener('drop',e=>{left.classList.remove('over'); if(e.dataTransfer.files.length){e.preventDefault(); addFiles(e.dataTransfer.files,null);}});
  window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')) e.preventDefault();});
  window.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files')) e.preventDefault();});
  const st=$('#strip'); let from=-1;
  st.addEventListener('dragstart',e=>{const it=e.target.closest('.st'); if(!it||it.dataset.idx==='0'){e.preventDefault(); return;} from=+it.dataset.idx; e.dataTransfer.setData('text/x-spread',String(from)); e.dataTransfer.effectAllowed='move';});
  st.addEventListener('dragover',e=>{if(from<1) return; const it=e.target.closest('.st'); $$('.st.dropto',st).forEach(x=>x.classList.remove('dropto')); if(!it||it.dataset.idx==='0') return; e.preventDefault(); it.classList.add('dropto');});
  st.addEventListener('drop',e=>{const it=e.target.closest('.st'); $$('.st.dropto',st).forEach(x=>x.classList.remove('dropto')); if(from<1||!it||it.dataset.idx==='0') return; e.preventDefault();
    const to=+it.dataset.idx,f0=from; from=-1; if(to===f0) return; act(()=>{const [sp]=S.spreads.splice(f0,1); S.spreads.splice(to,0,sp); S.cur=to; S.sel=null;}); toast(`Đã chuyển tờ sang vị trí ${to} (trang ${2*to-1}–${2*to}).`);});
  st.addEventListener('dragend',()=>{from=-1; $$('.st.dropto',st).forEach(x=>x.classList.remove('dropto'));});
  st.addEventListener('keydown',e=>{const it=e.target.closest('.st'); if(it&&(e.key==='Enter'||e.key===' ')){e.preventDefault(); go(+it.dataset.idx);}});
}

/* ================= nút bấm ================= */
const withF=fn=>()=>{const f=selFrame(); if(f) act(()=>fn(f,curSpread()));};
function refBox(sp,f){let sd=f.side==='S'||f.side==='P'?'S':pageSideAt(sp,f.x+f.w/2); if(sd==='P') sd='S'; const r=sideRect(sp,sd);
  if(V.alignRef==='margin'){const m=sp.margin; return {x:r.x+m,y:m,w:r.w-2*m,h:r.h-2*m};} return r;}
function clickLibPhoto(pid){
  const sp=curSpread(); let f=selFrame();
  if(!(f&&f.type==='photo')) f=sortFrames(sp.frames).find(x=>x.type==='photo'&&!photoOf(x));
  if(!f){toast('Tờ này đã kín ảnh. Chọn một khung để thay ảnh, hoặc kéo ảnh vào khung.'); return;}
  act(()=>setPhoto(f,pid));
}
I.unplace='<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m9 9 6 6M15 9l-6 6"/>';
// Mặc định KHÔNG tự xếp ảnh vào khung khi thêm; lựa chọn nhớ theo từng máy.
V.autoPlace=(()=>{try{return localStorage.getItem('pb.autoPlace')==='1';}catch(e){return false;}})();
const ACT={
  addPhotos(){pickFiles(null);},
  clearSamples(){act(removeSamples); toast('Đã gỡ ảnh mẫu.');},
  toggleAutoPlace(){V.autoPlace=!V.autoPlace; try{localStorage.setItem('pb.autoPlace',V.autoPlace?'1':'0');}catch(e){}
    renderLeft(); toast(V.autoPlace?'Ảnh thêm vào sẽ tự xếp vào các khung trống.':'Ảnh thêm vào chỉ nằm trong thư viện, bạn tự kéo vào khung.');},
  unplaceAll(){let n=0; for(const sp of S.spreads) for(const f of sp.frames) if(photoOf(f)) n++;
    if(!n){toast('Chưa có ảnh nào nằm trong khung.'); return;}
    act(()=>{for(const sp of S.spreads) for(const f of sp.frames) if(f.type==='photo') f.photo=null; S.sel=null;});
    toast(`Đã gỡ ${n} ảnh khỏi khung. Ảnh vẫn còn trong thư viện.`,{ms:8000,action:'Hoàn tác',onAction:undo});},
  autofill(){const u=usageMap(),free=S.lib.filter(id=>!u[id]); if(!free.length){toast('Mọi ảnh trong thư viện đều đã được xếp.'); return;}
    const before=S.spreads.length; let n=0; act(()=>{n=autoFill(free,true);});
    toast(`Đã xếp ${n} ảnh${S.spreads.length>before?`, thêm ${S.spreads.length-before} tờ mới`:''}.`);},
  tab(a){V.tab=a; renderLeft();},
  cat(a){V.cat=a; renderLeft();},
  filter(a){V.filter=a; renderLeft();},
  target(a){V.target=a; S.sel={kind:'side',side:a}; renderStage(); renderProps(); renderLeft();},
  layout(id){const sp=curSpread(),d=LBY[id]; act(()=>{S.sel=null; applyLayout(sp,id,d.scope==='S'?'S':V.target);});},
  preset(a){const [w,h]=a.split('x').map(Number); act(()=>setAlbum({w,h})); toast(`Đã đổi khổ album sang ${fmtcm(w)} × ${fmtcm(h)} cm.`);},
  undo, redo,
  zoomIn(){const z=V.sc/MM; zoomTo(ZS.find(s=>s>z*1.02)||4);},
  zoomOut(){const z=V.sc/MM; zoomTo([...ZS].reverse().find(s=>s<z*.98)||.1);},
  zoomFit(){zoomTo('fit');}, zoom100(){zoomTo(1);},
  toggle(k){V[k]=!V[k]; renderStage(); renderViewbar();},
  clearGuides(){act(()=>{S.guides=[];});},
  preview(){V.preview=!V.preview; if(V.preview) S.sel=null; render();},
  book(){openBook();}, bookClose(){closeBook();}, bookPrev(){bookGo(-1);}, bookNext(){bookGo(1);},
  prev(){go(S.cur-1);}, next(){go(S.cur+1);},
  deselect(){select(null);},
  addSpread(){act(()=>{const sp=newSpread(); applyPlan(sp,['2-row','full']); const at=Math.max(1,S.cur+1); S.spreads.splice(at,0,sp); S.cur=at; S.sel=null;}); toast(`Đã thêm tờ mới: trang ${2*S.cur-1}–${2*S.cur}.`);},
  addSpreadEnd(){act(()=>{const sp=newSpread(); applyPlan(sp,PLAN[(S.spreads.length-1)%PLAN.length]); S.spreads.push(sp);});},
  dupSpread(){const sp=curSpread(); if(sp.kind==='cover'){toast('Bìa không nhân bản được.'); return;}
    act(()=>{const c=JSON.parse(JSON.stringify(sp)); c.id=uid('s'); c.frames.forEach(f=>{f.id=uid();}); S.spreads.splice(S.cur+1,0,c); S.cur++; S.sel=null;});},
  delSpread(){const sp=curSpread(); if(sp.kind==='cover'){toast('Bìa luôn có trong album nên không xóa được.'); return;} if(S.spreads.length<=2){toast('Album cần ít nhất một tờ.'); return;}
    const lab=pageName(sp,'S'); act(()=>{S.spreads.splice(S.cur,1); S.cur=Math.min(S.cur,S.spreads.length-1); S.sel=null;}); toast(`Đã xóa tờ ${lab}.`,{action:'Hoàn tác',onAction:undo});},
  delLastSpread(){if(S.spreads.length<=2){toast('Album cần ít nhất một tờ.'); return;} act(()=>{S.spreads.pop(); S.cur=Math.min(S.cur,S.spreads.length-1);});},
  alignRef(a){V.alignRef=a; renderProps();},
  frameAlign:a=>withF((f,sp)=>{const b=refBox(sp,f);
    if(a==='l') f.x=b.x; if(a==='ch') f.x=b.x+(b.w-f.w)/2; if(a==='r') f.x=b.x+b.w-f.w;
    if(a==='t') f.y=b.y; if(a==='cv') f.y=b.y+(b.h-f.h)/2; if(a==='b') f.y=b.y+b.h-f.h; reside(sp,f,f.side);})(),
  frameFill:a=>withF((f,sp)=>{let sd=f.side==='S'?'S':pageSideAt(sp,f.x+f.w/2); if(sd==='P') sd='S'; const b=contentBox(sp,sd,a==='bleed');
    Object.assign(f,{x:b.x-b.ext.l,y:b.y-b.ext.t,w:b.w+b.ext.l+b.ext.r,h:b.h+b.ext.t+b.ext.b,rot:0}); clampPan(f); reside(sp,f,f.side);})(),
  photoFit:a=>withF(f=>{f.fit=a; f.zoom=1; f.panX=f.panY=0;})(),
  photoRot:a=>withF(f=>{f.prot=((f.prot+ +a)%360+360)%360; f.panX=f.panY=0; clampPan(f);})(),
  photoFlip:withF(f=>{f.flip=!f.flip;}),
  photoAnchor:a=>withF(f=>{const q=cropGeom(f); if(!q) return; const ox=(q.bbW-q.fw)/2/q.fw,oy=(q.bbH-q.fh)/2/q.fh;
    f.panX=a.includes('l')?ox:a.includes('r')?-ox:0; f.panY=a.startsWith('t')?oy:a.startsWith('b')?-oy:0;})(),
  photoReplace(){const f=selFrame(); if(f) pickFiles(f.id);},
  photoRemove:withF(f=>{f.photo=null;}),
  frameDel(){const f=selFrame(); if(!f) return; act(()=>{const sp=curSpread(); sp.frames=sp.frames.filter(x=>x!==f); if(f.side in sp.dirty) sp.dirty[f.side]=true; S.sel=null;});},
  frameDup(){const f=selFrame(); if(!f) return; act(()=>{const sp=curSpread(),c=JSON.parse(JSON.stringify(f)); c.id=uid(); c.x+=8; c.y+=8; c.ti=null; if(c.side==='P') c.side='R'; sp.frames.push(c); if(c.side in sp.dirty) sp.dirty[c.side]=true; S.sel={kind:'frame',id:c.id};});},
  frameFront(){const f=selFrame(); if(f) act(()=>{const sp=curSpread(); sp.frames=sp.frames.filter(x=>x!==f).concat(f);});},
  frameBack(){const f=selFrame(); if(f) act(()=>{const sp=curSpread(); sp.frames=[f].concat(sp.frames.filter(x=>x!==f));});},
  addFrame(t){const sp=curSpread(),side=V.target==='R'?'R':'L',r=sideRect(sp,side); let id;
    act(()=>{const w=r.w*.44,h=t==='text'?r.h*.12:r.h*.32,base={side,x:r.x+(r.w-w)/2,y:(r.h-h)/2,w,h};
      const f=t==='text'?mkText({...base,role:'free',text:'Nhập chữ của bạn',font:'Playfair Display',size:r2(24*S.A.w/300),color:'#1f1d1a',edited:true}):mkPhoto(base);
      id=f.id; sp.frames.push(f); sp.dirty[side]=true; S.sel={kind:'frame',id};});},
  resetLayout(){const sp=curSpread(); act(()=>{const L={...sp.layout}; if(L.S) applyLayout(sp,L.S,'S'); else {if(L.L) applyLayout(sp,L.L,'L'); if(L.R) applyLayout(sp,L.R,'R');} fitSpine(sp); S.sel=null;}); toast('Đã đặt lại bố cục của tờ này.');},
  spacingAll(){const c=curSpread(); act(()=>{S.A.margin=c.margin; S.A.gap=c.gap; for(const sp of S.spreads){sp.margin=c.margin; sp.gap=c.gap; relayout(sp);}}); toast(`Đã áp lề ${fmt1(c.margin)} mm, khoảng cách ${fmt1(c.gap)} mm cho mọi tờ.`);},
  delPhoto(id){act(()=>{S.lib=S.lib.filter(x=>x!==id); for(const sp of S.spreads) for(const f of sp.frames) if(f.photo===id) f.photo=null;});},
  bg(a){const [sd,c]=a.split('|'); act(()=>{curSpread().bg[sd]=c;});},
  borderColor:a=>withF(f=>{f.borderColor=a; if(!f.border) f.border=3;})(),
  textAlign:a=>withF(f=>{f.align=a;})(),
  textBold:withF(f=>{f.bold=!f.bold;}),
  textItalic:withF(f=>{f.italic=!f.italic;}),
  showLeft(){const a=$('#app'); a.classList.toggle('show-left'); a.classList.remove('show-right');},
  showRight(){const a=$('#app'); a.classList.toggle('show-right'); a.classList.remove('show-left');},
  closePanels(){$('#app').classList.remove('show-left','show-right');}
};
function applyInput(e){
  const k=e.dataset.k,v=e.type==='checkbox'?e.checked:e.value,n=parseFloat(v),sp=curSpread(),f=selFrame();
  switch(k){
    case 'margin': if(isFinite(n)){sp.margin=n; relayout(sp);} break;
    case 'gap': if(isFinite(n)){sp.gap=n; relayout(sp);} break;
    case 'bg': sp.bg[e.dataset.side]=v; break;
    case 'zoom': if(f&&isFinite(n)){f.zoom=n/100; clampPan(f);} break;
    case 'border': if(f&&isFinite(n)){f.border=n; clampPan(f);} break;
    case 'borderColor': if(f) f.borderColor=v; break;
    case 'radius': if(f&&isFinite(n)) f.radius=n; break;
    case 'rot': if(f&&isFinite(n)) f.rot=n; break;
    case 'shadow': if(f) f.shadow=v; break;
    case 'gx': case 'gy': case 'gw': case 'gh': if(f&&isFinite(n)){const key=k[1]; f[key]=key==='w'||key==='h'?Math.max(5,n*10):n*10; clampPan(f); reside(sp,f,f.side);} break;
    case 'text': if(f){f.text=v; f.edited=true;} break;
    case 'font': if(f) f.font=v; break;
    case 'size': if(f&&n>0) f.size=n; break;
    case 'color': if(f) f.color=v; break;
    case 'vertical': if(f) f.vertical=v; break;
    case 'aw': if(n>0) setAlbum({w:clamp(Math.round(n*100)/10,80,800)}); break;
    case 'ah': if(n>0) setAlbum({h:clamp(Math.round(n*100)/10,80,800)}); break;
    case 'spine': if(isFinite(n)) setAlbum({spine:clamp(n,0,80)}); break;
    case 'bleed': if(isFinite(n)) setAlbum({bleed:clamp(n,0,15)}); break;
    case 'safe': if(isFinite(n)) S.A.safe=clamp(n,0,40); break;
    case 'amargin': if(isFinite(n)) S.A.margin=clamp(n,0,60); break;
    case 'agap': if(isFinite(n)) S.A.gap=clamp(n,0,30); break;
  }
}
const isLive=e=>e.type==='range'||e.type==='color'||e.tagName==='TEXTAREA';
function bindControls(){
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');
    if(b){const fn=ACT[b.dataset.act]; if(fn){e.preventDefault(); fn(b.dataset.arg,b);} return;}
    const th=e.target.closest('.th'); if(th){clickLibPhoto(th.dataset.pid); return;}
    const st=e.target.closest('.st'); if(st) go(+st.dataset.idx);
  });
  document.addEventListener('input',e=>{const t=e.target; if(!t.dataset||!t.dataset.k||!isLive(t)) return; beginEdit(); applyInput(t); renderStage();
    if(t.type==='range'){const o=t.closest('.rg')&&t.closest('.rg').querySelector('output'); if(o) o.textContent=fmt1(+t.value)+' '+t.dataset.unit;}});
  document.addEventListener('change',e=>{const t=e.target; if(!t.dataset||!t.dataset.k) return; if(!isLive(t)){beginEdit(); applyInput(t);} commit();});
  $('#file').addEventListener('change',e=>{const fs=e.target.files; if(fs&&fs.length) addFiles(fs,V.pickTarget); V.pickTarget=null;});
  document.addEventListener('keydown',e=>{
    if(!$('#bookModal').hidden){if(e.key==='Escape') closeBook(); else if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault(); bookGo(1);} else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault(); bookGo(-1);} return;}
    const a=document.activeElement,typing=a&&(a.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
    if(typing){if(e.key==='Escape') a.blur(); return;}
    const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
    if(mod&&k==='z'){e.preventDefault(); e.shiftKey?redo():undo(); return;}
    if(mod&&k==='y'){e.preventDefault(); redo(); return;}
    if(mod&&k==='d'){if(selFrame()){e.preventDefault(); ACT.frameDup();} return;}
    if(mod) return;
    const f=selFrame();
    if(e.key==='Delete'||e.key==='Backspace'){if(f){e.preventDefault(); if(photoOf(f)) ACT.photoRemove(); else ACT.frameDel();} return;}
    if(e.key.startsWith('Arrow')){e.preventDefault();
      if(f){const st=e.shiftKey?10:1,sp=curSpread(); act(()=>{if(e.key==='ArrowLeft') f.x-=st; if(e.key==='ArrowRight') f.x+=st; if(e.key==='ArrowUp') f.y-=st; if(e.key==='ArrowDown') f.y+=st; reside(sp,f,f.side);});}
      else if(e.key==='ArrowLeft') go(S.cur-1); else if(e.key==='ArrowRight') go(S.cur+1);
      return;}
    if(e.key==='PageUp'){e.preventDefault(); go(S.cur-1);} else if(e.key==='PageDown'){e.preventDefault(); go(S.cur+1);}
    else if(e.key==='Escape'){if(V.preview) ACT.preview(); else if(S.sel) select(null); ACT.closePanels();}
  });
}
