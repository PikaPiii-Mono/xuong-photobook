
/* ================= vẽ tờ ================= */
function placeBox(d,f,sc){Object.assign(d.style,{left:f.x*sc+'px',top:f.y*sc+'px',width:f.w*sc+'px',height:f.h*sc+'px',transform:f.rot?`rotate(${f.rot}deg)`:''});}
function styleFrame(d,f,sc){
  placeBox(d,f,sc);
  const fin=d.firstChild,bx=fin.firstChild;
  fin.style.padding=f.border*sc+'px'; fin.style.background=f.border>0?f.borderColor:'transparent';
  fin.style.borderRadius=f.radius*sc+'px'; fin.style.boxShadow=f.shadow?`0 ${.8*sc}px ${3*sc}px rgba(0,0,0,.28)`:'';
  bx.style.borderRadius=Math.max(0,f.radius-f.border)*sc+'px';
  const im=bx.querySelector('img');
  if(im){const q=cropGeom(f); if(q){im.style.width=q.p.w*q.s*sc+'px'; im.style.height=q.p.h*q.s*sc+'px';
    im.style.transform=`translate(-50%,-50%) translate(${f.panX*q.fw*sc}px,${f.panY*q.fh*sc}px) rotate(${f.prot}deg)${f.flip?' scaleX(-1)':''}`;}}
  const t=bx.querySelector('.txt');
  if(t){const s=t.style; s.fontFamily=`"${f.font}",${FB[f.font]||'serif'}`; s.fontSize=f.size*PT*sc+'px'; s.color=f.color; s.textAlign=f.align;
    s.fontWeight=f.bold?'700':'400'; s.fontStyle=f.italic?'italic':'normal'; s.letterSpacing=(f.ls||0)+'em'; s.writingMode=f.vertical?'vertical-rl':'horizontal-tb';}
}
function frameEl(f,sc,mode){
  const d=el('div','frame '+f.type); d.dataset.id=f.id;
  const fin=el('div','fin'),bx=el('div','box'); fin.append(bx); d.append(fin);
  const live=mode==='edit'&&!V.preview;
  if(f.type==='photo'){const p=photoOf(f);
    if(p){const im=document.createElement('img'); im.alt=''; im.draggable=false; im.decoding='async'; im.src=mode==='thumb'?p.thumb:p.url; bx.append(im); d.classList.add('has');
      if(live&&!p.sample){const dp=dpiOf(f); if(dp<150){const w=el('span','lowres'); w.textContent=dp+' dpi'; w.title='Độ phân giải thấp, ảnh có thể vỡ hạt khi in. Nên từ 200 dpi trở lên.'; bx.append(w);}}}
    else{d.classList.add('empty'); if(live) bx.innerHTML=`<div class="hint-ph">${ico('image')}<span>Kéo ảnh vào<br>hoặc nhấp đúp</span></div>`;}}
  else{const t=el('div','txt'); t.textContent=f.text; bx.append(t);}
  styleFrame(d,f,sc); return d;
}
function renderSheet(sp,sc,mode){
  const A=S.A,W=A.w,Hh=A.h,s=spineOf(sp),SW=spreadW(sp),b=A.bleed,edit=mode==='edit';
  const cb=(edit&&!V.preview&&V.bleed)?b:0;
  const sheet=el('div','sheet '+mode+(edit?' ia':'')+(edit&&V.preview?' pv':''));
  sheet.style.width=SW*sc+'px'; sheet.style.height=Hh*sc+'px';
  const clip=el('div','clip'); Object.assign(clip.style,{left:-cb*sc+'px',top:-cb*sc+'px',width:(SW+2*cb)*sc+'px',height:(Hh+2*cb)*sc+'px'});
  const org=el('div','org'); org.style.left=cb*sc+'px'; org.style.top=cb*sc+'px'; clip.append(org); sheet.append(clip);
  const bgs=s?[['L',-b,W+b],['P',W,s],['R',W+s,W+b]]:[['L',-b,W+b],['R',W,W+b]];
  for(const [sd,x,w] of bgs){const d=el('div','pbg'); d.dataset.side=sd;
    Object.assign(d.style,{left:x*sc+'px',top:-b*sc+'px',width:w*sc+'px',height:(Hh+2*b)*sc+'px',background:sp.bg[sd]||'#ffffff'}); org.append(d);}
  const fs=[...sp.frames].sort((a,c)=>(a.side==='P')-(c.side==='P'));
  for(const f of fs) org.append(frameEl(f,sc,mode));
  if(edit) addOverlays(sheet,sp,sc);
  return sheet;
}
function addOverlays(sheet,sp,sc){
  const A=S.A,W=A.w,Hh=A.h,s=spineOf(sp),SW=spreadW(sp),b=A.bleed;
  const ov=el('div','ov'); sheet.append(ov);
  const box=(c,x,y,w,h)=>{const d=el('div',c); Object.assign(d.style,{left:x*sc+'px',top:y*sc+'px',width:w*sc+'px',height:h*sc+'px'}); ov.append(d); return d;};
  if(!V.preview){
    if(V.grid){const d=box('g-grid',0,0,SW,Hh); d.style.backgroundSize=`${10*sc}px ${10*sc}px`;}
    if(V.fold){ if(s) box('g-spine',W,0,s,Hh); else {box('g-gutter',W-6,0,12,Hh); box('g-fold',W,0,0,Hh);} }
    if(V.safe) for(const sd of ['L','R']){const r=sideRect(sp,sd); box('g-safe',r.x+A.safe,A.safe,r.w-2*A.safe,Hh-2*A.safe);}
    if(V.bleed&&b>0){const d=box('g-bleed',-b,-b,SW+2*b,Hh+2*b); d.style.borderWidth=b*sc+'px';}
    if(S.sel&&S.sel.kind==='side'){const r=sideRect(sp,S.sel.side); box('g-side',r.x,0,r.w,Hh);}
    const f=selFrame();
    if(f){const d=el('div','selbox'); d.dataset.sel=f.id; placeBox(d,f,sc);
      d.innerHTML=HANDLES.map(h=>`<i class="hd hd-${h}" data-h="${h}"></i>`).join('')+`<b class="mv" data-mv="1" title="Kéo để di chuyển khung">${ico('move')}</b>`;
      ov.append(d);}
    const sn=el('div','snaps'); sn.id='snaps'; ov.append(sn);
  }
  const labs=s?[['L',W/2],['P',W+s/2],['R',W+s+W/2]]:[['L',W/2],['R',W+W/2]];
  for(const [sd,cx] of labs){const d=el('div','plab'+(sd==='P'?' sm':'')+(S.sel&&S.sel.kind==='side'&&S.sel.side===sd?' on':''));
    d.textContent=sd==='P'?'Gáy':pageName(sp,sd); d.style.left=cx*sc+'px'; d.style.top=(Hh+b)*sc+10+'px'; ov.append(d);}
}
const frameNode=id=>$(`#sheetWrap .frame[data-id="${id}"]`);
function restyle(f){const n=frameNode(f.id); if(n) styleFrame(n,f,V.sc); const sb=$('#sheetWrap .selbox'); if(sb&&sb.dataset.sel===f.id) placeBox(sb,f,V.sc);}
function showSnaps(lines){const c=$('#snaps'); if(!c) return; const sc=V.sc,Hh=S.A.h,SW=spreadW(curSpread()),e=S.A.bleed+8;
  c.innerHTML=lines.map(([a,v])=>a==='v'?`<i class="v" style="left:${v*sc}px;top:${-e*sc}px;height:${(Hh+2*e)*sc}px"></i>`:`<i class="h" style="top:${v*sc}px;left:${-e*sc}px;width:${(SW+2*e)*sc}px"></i>`).join('');}

/* ================= sân khấu + thước ================= */
const PAD=44,LAB=34;
function renderStage(){
  const sp=curSpread(),vp=$('#vp'),ws=$('#ws'),SW=spreadW(sp),Hh=S.A.h,b=S.A.bleed,cw=vp.clientWidth,ch=vp.clientHeight;
  let sc;
  if(V.zoom==='fit') sc=Math.max(.15,Math.min((cw-PAD*2)/(SW+2*b),(ch-PAD*2-LAB)/(Hh+2*b)));
  else sc=V.zoom*MM;
  V.sc=sc;
  const sw=SW*sc,sh=Hh*sc,bp=b*sc;
  const wsW=V.zoom==='fit'?cw:Math.max(cw,Math.ceil(sw+2*bp+PAD*2)),wsH=V.zoom==='fit'?ch:Math.max(ch,Math.ceil(sh+2*bp+PAD*2+LAB));
  ws.style.width=wsW+'px'; ws.style.height=wsH+'px';
  V.sheetPos={left:Math.round((wsW-sw)/2),top:Math.round((wsH-sh-LAB)/2)};
  const wrap=$('#sheetWrap'); wrap.style.left=V.sheetPos.left+'px'; wrap.style.top=V.sheetPos.top+'px';
  wrap.replaceChildren(renderSheet(sp,sc,'edit'));
  renderGuides(); updateOrigin(); drawRulers();
  const zl=$('#zl'); if(zl) zl.textContent=Math.round(sc/MM*100)+'%';
}
function updateOrigin(){const vp=$('#vp'); V.origin={x:V.sheetPos.left-vp.scrollLeft,y:V.sheetPos.top-vp.scrollTop};}
function renderGuides(){const L=$('#guideLayer'); L.replaceChildren(); if(!V.guides||V.preview) return;
  S.guides.forEach((gd,i)=>{const d=el('div','guide '+gd.a); d.dataset.gi=i;
    if(gd.a==='h') d.style.top=V.sheetPos.top+gd.v*V.sc+'px'; else d.style.left=V.sheetPos.left+gd.v*V.sc+'px'; L.append(d);});}
let _rq=0; function schedRulers(){ if(!_rq) _rq=requestAnimationFrame(()=>{_rq=0; drawRulers();}); }
function drawRulers(){drawRuler($('#rT'),true); drawRuler($('#rL'),false);}
function drawRuler(cv,hz){
  const dpr=window.devicePixelRatio||1,cw=cv.clientWidth,ch=cv.clientHeight; if(!cw||!ch) return;
  if(cv.width!==Math.round(cw*dpr)||cv.height!==Math.round(ch*dpr)){cv.width=Math.round(cw*dpr); cv.height=Math.round(ch*dpr);}
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0);
  const cs=getComputedStyle(document.documentElement),col=k=>cs.getPropertyValue(k).trim();
  const sp=curSpread(),A=S.A,s=spineOf(sp),len=hz?cw:ch,th=hz?ch:cw,sc=V.sc,o=hz?V.origin.x:V.origin.y;
  const span=(a,b2,fill)=>{const p0=o+a*sc,p1=o+b2*sc; x.fillStyle=fill; hz?x.fillRect(p0,0,p1-p0,ch):x.fillRect(0,p0,cw,p1-p0);};
  x.fillStyle=col('--ruler'); x.fillRect(0,0,cw,ch);
  const pg=col('--ruler-page');
  if(hz){span(0,A.w,pg); span(A.w+s,2*A.w+s,pg); if(s) span(A.w,A.w+s,col('--accent-soft'));} else span(0,A.h,pg);
  const f=selFrame(); if(f&&!V.preview){const a=hz?f.x:f.y; span(a,a+(hz?f.w:f.h),col('--accent-soft'));}
  const major=[10,20,50,100,200,500].find(m=>m*sc>=42)||1000;
  const minor=[1,2,5,10,20,50,100].find(m=>m*sc>=5&&major%m===0)||major;
  const m0=Math.floor((-o/sc)/minor)*minor,m1=(len-o)/sc;
  x.strokeStyle=col('--ruler-tick'); x.lineWidth=1; x.beginPath();
  const lab=[];
  for(let m=m0;m<=m1;m+=minor){const mm=Math.round(m*1000)/1000,p=Math.round(o+mm*sc)+.5;
    const isMaj=Math.abs(mm%major)<1e-6,isHalf=!isMaj&&Math.abs(mm%(major/2))<1e-6;
    const tl=isMaj?th-5:isHalf?th*.42:th*.24;
    if(hz){x.moveTo(p,ch);x.lineTo(p,ch-tl);} else {x.moveTo(cw,p);x.lineTo(cw-tl,p);}
    if(isMaj) lab.push([p,mm]);}
  x.stroke();
  x.fillStyle=col('--ruler-fg'); x.font=`500 9.5px ${col('--f-mono')}`;
  for(const [p,mm] of lab){const t=String(Math.round(mm/10*10)/10).replace('.',',');
    if(hz){x.textAlign='left'; x.fillText(t,p+3,10);} else {x.save(); x.translate(10,p+3); x.rotate(-Math.PI/2); x.textAlign='right'; x.fillText(t,0,0); x.restore();}}
  x.strokeStyle=col('--line'); x.beginPath(); if(hz){x.moveTo(0,ch-.5);x.lineTo(cw,ch-.5);} else {x.moveTo(cw-.5,0);x.lineTo(cw-.5,ch);} x.stroke();
  if(V.mouse){const p=Math.round(o+(hz?V.mouse.x:V.mouse.y)*sc)+.5; x.strokeStyle=col('--ruler-mark'); x.lineWidth=1.5; x.beginPath();
    if(hz){x.moveTo(p,0);x.lineTo(p,ch);} else {x.moveTo(0,p);x.lineTo(cw,p);} x.stroke();}
}
function zoomTo(z,ax,ay){
  const vp=$('#vp'),sc0=V.sc; if(ax==null){ax=vp.clientWidth/2; ay=vp.clientHeight/2;}
  const mx=(ax-(V.sheetPos.left-vp.scrollLeft))/sc0,my=(ay-(V.sheetPos.top-vp.scrollTop))/sc0;
  V.zoom=z==='fit'?'fit':clamp(z,.05,4);
  renderStage();
  if(V.zoom!=='fit'){vp.scrollLeft=V.sheetPos.left+mx*V.sc-ax; vp.scrollTop=V.sheetPos.top+my*V.sc-ay;}
  updateOrigin(); drawRulers(); renderGuides(); renderViewbar();
}

/* ================= dải tờ ================= */
// Album vài trăm tờ: chỉ vẽ lại ảnh thu nhỏ của tờ nào thật sự đổi nội dung.
const STRIP_CACHE=new Map();
function renderStrip(){
  const st=$('#strip'),n=S.spreads.length-1,sc=58/S.A.h,ak=JSON.stringify(S.A),seen=new Set(),frag=document.createDocumentFragment();
  S.spreads.forEach((sp,i)=>{const it=el('div','st'+(i===S.cur?' on':'')); it.dataset.idx=i; it.tabIndex=0; it.setAttribute('role','button');
    it.draggable=i>0; it.title=i?`Tờ ${i}: Trang ${2*i-1}–${2*i}`:'Bìa album (bìa sau, gáy, bìa trước)';
    const key=ak+JSON.stringify(sp); let c=STRIP_CACHE.get(sp.id);
    if(!c||c.key!==key){const th=el('div','st-th'); th.append(renderSheet(sp,sc,'thumb')); th.style.width=spreadW(sp)*sc+'px'; th.style.height=S.A.h*sc+'px'; c={key,th}; STRIP_CACHE.set(sp.id,c);}
    seen.add(sp.id);
    const lb=el('div','st-lab'); lb.textContent=i?`${2*i-1}–${2*i}`:'Bìa'; it.append(c.th,lb); frag.append(it);});
  for(const k of [...STRIP_CACHE.keys()]) if(!seen.has(k)) STRIP_CACHE.delete(k);
  st.replaceChildren(frag);
  $('#stripInfo').innerHTML=`Bìa + ${n} tờ <span>· ${n*2} trang ruột</span>`;
  const on=$('.st.on',st); if(on){const l=on.offsetLeft,r=l+on.offsetWidth; if(l<st.scrollLeft) st.scrollLeft=l-8; else if(r>st.scrollLeft+st.clientWidth) st.scrollLeft=r-st.clientWidth+8;}
}

/* ================= bảng trái ================= */
const sec=(t,b)=>`<section class="sec"><h3>${t}</h3>${b}</section>`;
let _libKey='';
function renderLeft(){
  $$('#tabs button').forEach(b=>{const on=b.dataset.arg===V.tab; b.classList.toggle('on',on); b.setAttribute('aria-selected',on);});
  const body=$('#leftBody'),top=body.scrollTop;
  if(V.tab==='photos'){
    // Thư viện 1000 ảnh: dựng lại cả nghìn ảnh thu nhỏ mỗi lần bấm sẽ giật, nên chỉ dựng khi có gì đổi.
    const used=usageMap(),key=[V.filter,V.autoPlace,JSON.stringify(used),S.lib.map(id=>PH[id]?PH[id].thumb:'').join()].join('|');
    if(key===_libKey&&body.dataset.tab==='photos') return;
    _libKey=key; body.innerHTML=libHTML(used);
  } else { _libKey=''; body.innerHTML=V.tab==='layouts'?layoutsHTML():albumHTML(); }
  body.dataset.tab=V.tab; body.scrollTop=top;
}
function libHTML(used){
  const all=S.lib.map(id=>PH[id]).filter(Boolean),nUsed=all.filter(p=>used[p.id]).length,hasSample=all.some(p=>p.sample),nReal=all.filter(p=>!p.sample).length;
  const list=all.filter(p=>V.filter==='all'||(V.filter==='free'?!used[p.id]:!!used[p.id]));
  return `<div class="lib-top"><button class="btn primary grow" data-act="addPhotos">${ico('upload')}Thêm ảnh từ máy</button><button class="btn" data-act="autofill" title="Xếp các ảnh chưa dùng vào khung trống, tự thêm tờ khi thiếu chỗ">${ico('wand')}Tự động xếp</button></div>
  <div class="lib-tools"><button class="tgl${V.autoPlace?' on':''}" data-act="toggleAutoPlace" aria-pressed="${V.autoPlace}" title="Bật thì ảnh vừa thêm được xếp ngay vào các khung trống"><span></span>Tự xếp khi thêm ảnh</button><button class="btn sm danger" data-act="unplaceAll" title="Đưa mọi ảnh ra khỏi khung về thư viện. Có thể hoàn tác.">${ico('unplace')}Gỡ hết ảnh khỏi khung</button></div>
  <div class="dropzone" id="dropzone">Kéo thả ảnh từ máy tính vào đây, hoặc thả thẳng vào một khung trên trang. Tối đa ${MAX_PHOTOS} ảnh: JPG, PNG, HEIC (iPhone), TIFF, WebP, AVIF và ảnh RAW máy ảnh.</div>
  ${hasSample?`<div class="banner"><b>Đang dùng ảnh mẫu</b><span>Ảnh minh họa để bạn xem trước bố cục. Khi bạn thêm ảnh của mình, ảnh mẫu sẽ tự được gỡ.</span><button class="link" data-act="clearSamples">Gỡ ảnh mẫu</button></div>`:''}
  <div class="lib-meta"><span><b>${hasSample?all.length:nReal}</b>${hasSample?'':` / ${MAX_PHOTOS}`} ảnh · ${nUsed} đã xếp</span><div class="seg sm">${[['all','Tất cả'],['free','Chưa xếp'],['used','Đã xếp']].map(([k,l])=>`<button class="${V.filter===k?'on':''}" data-act="filter" data-arg="${k}">${l}</button>`).join('')}</div></div>
  ${list.length?`<div class="lib">${list.map(p=>`<figure class="th${used[p.id]?' used':''}" draggable="true" data-pid="${p.id}" title="${esc(p.name)} · ${p.w}×${p.h} px${used[p.id]?` · đã đặt ${used[p.id]} lần`:' · chưa xếp'}"><img src="${p.thumb}" alt="${esc(p.name)}" loading="lazy">${used[p.id]?`<span class="cnt">${used[p.id]}</span>`:''}<button class="del" data-act="delPhoto" data-arg="${p.id}" aria-label="Xóa ${esc(p.name)} khỏi thư viện" title="Xóa khỏi thư viện">${ico('x')}</button></figure>`).join('')}</div>`
    :`<p class="empty">${all.length?'Không có ảnh nào trong nhóm này.':'Chưa có ảnh nào. Bấm “Thêm ảnh từ máy” để bắt đầu.'}</p>`}
  <p class="hint">Nhấp một ảnh để đặt vào khung đang chọn, hoặc khung trống đầu tiên của tờ. Chấm trắng ở góc là ảnh chưa xếp.</p>`;
}
function laySvg(d,sp){
  const A=S.A,fake={kind:sp.kind,margin:sp.margin,gap:sp.gap},side=d.scope==='S'?'S':V.target,r=sideRect(fake,side);
  let s=`<svg viewBox="0 0 ${r.w} ${r.h}" aria-hidden="true"><rect class="pg" x="0" y="0" width="${r.w}" height="${r.h}"/>`;
  for(const q of rectsFor(d,contentBox(fake,side,d.bleed),sp.gap)){
    const x=q.x-r.x,y=q.y,w=q.w,h=q.h,rot=q.spec.rot?` transform="rotate(${q.spec.rot} ${x+w/2} ${y+h/2})"`:'';
    if(q.spec.t==='text'){const n=q.spec.role==='body'?3:1,lh=Math.min(h/(n*2.2),A.h*.028); let ty=y+h/2-(n*lh*1.8-lh*.8)/2;
      for(let k=0;k<n;k++){const lw=w*(n>1?(k===n-1?.55:.95):.7),lx=q.spec.align==='left'?x:x+(w-lw)/2; s+=`<rect class="tx" x="${lx}" y="${ty}" width="${lw}" height="${lh}" rx="${lh/2}"/>`; ty+=lh*1.8;}}
    else s+=`<rect class="${q.spec.border?'pol':'fr'}" x="${x}" y="${y}" width="${w}" height="${h}"${rot}/>`;
  }
  if(d.scope==='S') s+=sp.kind==='cover'?`<rect class="spn" x="${A.w}" y="0" width="${A.spine}" height="${A.h}"/>`:`<line class="fd" x1="${A.w}" y1="0" x2="${A.w}" y2="${A.h}" vector-effect="non-scaling-stroke"/>`;
  return s+'</svg>';
}
function layoutsHTML(){
  const sp=curSpread(),cover=sp.kind==='cover';
  const tg=cover?[['L','Bìa sau'],['R','Bìa trước']]:[['L',`${pageName(sp,'L')} · trái`],['R',`${pageName(sp,'R')} · phải`]];
  const cats=CATS.filter(c=>c[0]!=='cover'||cover); if(!cats.some(c=>c[0]===V.cat)) V.cat='all';
  const list=LAYOUTS.filter(d=>V.cat==='all'?(cover||!d.cover):d.cat===V.cat);
  const isOn=d=>d.scope==='S'?sp.layout.S===d.id:sp.layout[V.target]===d.id;
  const cnt=d=>d.frames.filter(f=>f.t!=='text').length;
  return `<div class="lay-target"><span class="lbl">Áp dụng bố cục cho</span><div class="seg">${tg.map(([k,l])=>`<button class="${V.target===k?'on':''}" data-act="target" data-arg="${k}">${l}</button>`).join('')}</div>
    <p class="hint">Nhóm “Trải đôi” luôn phủ cả hai trang. Đổi bố cục vẫn giữ ảnh đã đặt.</p></div>
  <div class="chips">${cats.map(([k,l])=>`<button class="chipb${V.cat===k?' on':''}" data-act="cat" data-arg="${k}">${l}</button>`).join('')}</div>
  <div class="lays">${list.map(d=>`<button class="lay${d.scope==='S'?' wide':''}${isOn(d)?' on':''}" data-act="layout" data-arg="${d.id}" title="${esc(d.name)}">${laySvg(d,sp)}<span><b>${esc(d.name)}</b><em>${cnt(d)} ảnh${d.scope==='S'?' · trải đôi':''}${d.bleed?' · tràn viền':''}</em></span></button>`).join('')}</div>`;
}
function albumHTML(){
  const A=S.A,n=S.spreads.length-1,px=mm=>Math.round(mm/25.4*300).toLocaleString('vi-VN');
  return sec('Khổ album (1 trang)',`<div class="presets">${PRESETS.map(([w,h,l])=>{const k=26/Math.max(w,h);
      return `<button class="pre${A.w===w&&A.h===h?' on':''}" data-act="preset" data-arg="${w}x${h}"><i style="width:${w*k}px;height:${h*k}px"></i><b>${fmtcm(w)}×${fmtcm(h)}</b><span>${l}</span></button>`;}).join('')}</div>
    <div class="custom"><label>Rộng<div><input type="number" id="in-aw" data-k="aw" min="8" max="80" step="0.1" value="${A.w/10}"><i>cm</i></div></label><span>×</span><label>Cao<div><input type="number" id="in-ah" data-k="ah" min="8" max="80" step="0.1" value="${A.h/10}"><i>cm</i></div></label></div>
    <p class="note">Mở ra thành tờ trải đôi <b class="mono">${fmtcm(2*A.w)} × ${fmtcm(A.h)} cm</b>. Đổi khổ sẽ tự co giãn mọi bố cục.</p>`)
  +sec('Thông số in',`<div class="fields">
      <label>Tràn lề (bleed)<div><input type="number" id="in-bleed" data-k="bleed" min="0" max="15" step="0.5" value="${A.bleed}"><i>mm</i></div></label>
      <label>Vùng an toàn<div><input type="number" id="in-safe" data-k="safe" min="0" max="40" step="0.5" value="${A.safe}"><i>mm</i></div></label>
      <label>Gáy bìa<div><input type="number" id="in-spine" data-k="spine" min="0" max="80" step="0.5" value="${A.spine}"><i>mm</i></div></label></div>
    <p class="note">File in mỗi tờ ở 300 dpi (gồm tràn lề): <b class="mono">${px(2*A.w+2*A.bleed)} × ${px(A.h+2*A.bleed)} px</b>. Nhà in thường cần tràn lề 3 mm và giữ chữ cách mép xén ít nhất 5 mm.</p>`)
  +sec('Số tờ',`<div class="pages"><button class="btn icon" data-act="delLastSpread" aria-label="Bớt một tờ cuối">${ico('minus')}</button><b>${n} tờ</b><button class="btn icon" data-act="addSpreadEnd" aria-label="Thêm một tờ vào cuối">${ico('plus')}</button></div>
    <p class="note">Bìa + ${n} tờ = <b>${n*2} trang ruột</b>. Mỗi tờ là hai trang đối diện khi mở album.</p>`)
  +sec('Mặc định cho tờ mới',`<div class="fields">
      <label>Lề trang<div><input type="number" id="in-amargin" data-k="amargin" min="0" max="60" step="0.5" value="${A.margin}"><i>mm</i></div></label>
      <label>Khoảng cách ảnh<div><input type="number" id="in-agap" data-k="agap" min="0" max="30" step="0.5" value="${A.gap}"><i>mm</i></div></label></div>`);
}

/* ================= bảng phải ================= */
const range=(k,label,v,min,max,step,unit)=>`<label class="rg"><span>${label}</span><output>${fmt1(v)} ${unit}</output><input type="range" id="in-${k}" data-k="${k}" data-unit="${unit}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
function renderProps(){const f=selFrame(),p=$('#props'),top=p.scrollTop; p.innerHTML=V.preview?previewProps():f?(f.type==='photo'?photoProps(f):textProps(f)):pageProps(curSpread()); p.scrollTop=top;}
function previewProps(){return `<div class="phead"><div><b>Đang xem trước</b><span>Đã ẩn đường gióng, khung trống và tay nắm.</span></div></div><button class="btn" data-act="preview">Quay lại chỉnh sửa</button>`;}
function where(f){const sp=curSpread(); if(f.side==='S') return pageName(sp,'S')+' · trải đôi'; return pageName(sp,f.side);}
function head(t,sub){return `<div class="phead"><div><b>${t}</b><span>${sub}</span></div><button class="btn sm ghost" data-act="deselect">Bỏ chọn</button></div>`;}
function pageProps(sp){
  const cover=sp.kind==='cover',side=S.sel&&S.sel.kind==='side'?S.sel.side:null;
  const t=side?pageName(sp,side):cover?'Bìa album':`Tờ ${S.cur}`,sub=cover?'Bìa sau · gáy · bìa trước':pageName(sp,'S');
  const sides=cover?['L','P','R']:['L','R'],dirty=['L','R','S'].some(k=>sp.dirty[k]);
  return `<div class="phead"><div><b>${t}</b><span>${sub}</span></div></div>`
  +sec('Nền trang',sides.map(sd=>`<div class="bgrow"><span>${pageName(sp,sd)}</span><div class="row">${SWATCH.map(c=>`<button class="sw${(sp.bg[sd]||'').toLowerCase()===c?' on':''}" style="background:${c}" data-act="bg" data-arg="${sd}|${c}" aria-label="Nền ${c}" title="${c}"></button>`).join('')}<input type="color" id="in-bg-${sd}" data-k="bg" data-side="${sd}" value="${sp.bg[sd]}" aria-label="Chọn màu khác"></div></div>`).join(''))
  +sec('Lề & khoảng cách',range('margin','Lề trang',sp.margin,0,40,.5,'mm')+range('gap','Khoảng cách giữa ảnh',sp.gap,0,20,.5,'mm')
    +(dirty?`<p class="hint">Tờ này có khung đã chỉnh tay nên lề mới không tự áp. Bấm “Đặt lại bố cục” để căn lại.</p>`:'')
    +`<div class="row" style="margin-top:6px"><button class="btn sm" data-act="resetLayout">Đặt lại bố cục</button><button class="btn sm" data-act="spacingAll">Áp dụng cho mọi tờ</button></div>`)
  +sec('Thêm vào trang',`<div class="row"><button class="btn sm" data-act="addFrame" data-arg="photo">${ico('image')}Khung ảnh</button><button class="btn sm" data-act="addFrame" data-arg="text">${ico('text')}Khung chữ</button></div><p class="hint">Khung mới được đặt vào ${pageName(sp,V.target)}.</p>`)
  +sec('Thao tác nhanh',`<ul class="tips">
      <li><b>Kéo ảnh trong khung</b> để chọn phần cắt; kéo ra khung khác để đổi chỗ hai ảnh.</li>
      <li><b>Lăn chuột</b> trên khung đang chọn để phóng ảnh; <b>Ctrl + lăn</b> để thu phóng trang.</li>
      <li><b>Kéo từ thước</b> để tạo đường gióng; kéo đường gióng ra khỏi trang để xóa.</li>
      <li>Phím mũi tên dịch khung 1 mm (Shift: 10 mm). Giữ <b>Alt</b> khi kéo để tắt hút dính.</li>
      <li><b>Delete</b> gỡ ảnh khỏi khung, nhấn lần nữa để xóa khung. <b>Ctrl+Z</b> hoàn tác.</li></ul>`);
}
function geomHTML(f){
  const v=k=>(f[k]/10).toFixed(1);
  return sec('Vị trí & kích thước',`<div class="xywh">${[['x','X'],['y','Y'],['w','Rộng'],['h','Cao']].map(([k,l])=>`<label><span>${l}</span><input type="number" id="g-${k}" data-k="g${k}" step="0.1" value="${v(k)}"><i>cm</i></label>`).join('')}</div><p class="hint">Đo từ góc trên trái của tờ, khớp với số trên thước.</p>`)
  +sec('Căn khung',`<div class="row between"><span class="lbl">Căn theo</span><div class="seg sm"><button class="${V.alignRef==='page'?'on':''}" data-act="alignRef" data-arg="page">Mép trang</button><button class="${V.alignRef==='margin'?'on':''}" data-act="alignRef" data-arg="margin">Lề trang</button></div></div>
    <div class="aligns">${[['l','alignL','Căn trái'],['ch','alignCH','Căn giữa theo chiều ngang'],['r','alignR','Căn phải'],['t','alignT','Căn trên'],['cv','alignCV','Căn giữa theo chiều dọc'],['b','alignB','Căn dưới']].map(([a,i,t])=>`<button class="btn icon sm" data-act="frameAlign" data-arg="${a}" title="${t}" aria-label="${t}">${ico(i)}</button>`).join('')}</div>
    <div class="row"><button class="btn sm" data-act="frameFill" data-arg="bleed">Phủ kín trang</button><button class="btn sm" data-act="frameFill" data-arg="margin">Vừa trong lề</button></div>`);
}
const arrangeHTML=()=>sec('Sắp xếp',`<div class="row"><button class="btn sm" data-act="frameFront">${ico('front')}Lên trên</button><button class="btn sm" data-act="frameBack">${ico('back')}Xuống dưới</button><button class="btn sm" data-act="frameDup">${ico('copy')}Nhân bản</button><button class="btn sm danger" data-act="frameDel">${ico('trash')}Xóa khung</button></div>`);
function photoProps(f){
  const p=photoOf(f); let h=head('Khung ảnh',where(f));
  if(p){const d=dpiOf(f),q=p.sample?['','Ảnh mẫu']:d>=220?['ok','đủ nét để in']:d>=150?['mid','tạm được']:['bad','thấp, dễ vỡ hạt'];
    h+=sec('Ảnh trong khung',`<div class="pinfo"><img src="${p.thumb}" alt=""><div><b title="${esc(p.name)}">${esc(p.name)}</b><span class="mono">${p.w} × ${p.h} px</span><span class="dpi ${q[0]}">${p.sample?'Ảnh mẫu, không tính độ nét':`${d} dpi · ${q[1]}`}</span></div></div>`
      +range('zoom','Phóng to ảnh',Math.round(f.zoom*100),100,500,1,'%')
      +`<div class="row"><div class="seg sm"><button class="${f.fit==='fill'?'on':''}" data-act="photoFit" data-arg="fill" title="Ảnh phủ kín khung, cắt bớt phần thừa">Lấp đầy</button><button class="${f.fit==='fit'?'on':''}" data-act="photoFit" data-arg="fit" title="Thấy trọn ảnh, có thể chừa nền">Vừa khung</button></div>
        <button class="btn icon sm" data-act="photoRot" data-arg="-90" title="Xoay ảnh trái 90°" aria-label="Xoay ảnh trái 90°">${ico('rotL')}</button><button class="btn icon sm" data-act="photoRot" data-arg="90" title="Xoay ảnh phải 90°" aria-label="Xoay ảnh phải 90°">${ico('rotR')}</button><button class="btn icon sm${f.flip?' on':''}" data-act="photoFlip" title="Lật ngang" aria-label="Lật ngang">${ico('flipH')}</button></div>
      <div class="anchor-wrap"><span class="lbl">Căn ảnh trong khung</span><div class="anchor">${Object.entries(ANCH).map(([a,t])=>`<button data-act="photoAnchor" data-arg="${a}" title="${t}" aria-label="${t}"></button>`).join('')}</div></div>
      <div class="row"><button class="btn sm" data-act="photoReplace">${ico('upload')}Thay ảnh</button><button class="btn sm" data-act="photoRemove">Gỡ ảnh khỏi khung</button></div>`);}
  else h+=sec('Ảnh trong khung',`<p class="muted">Khung đang trống. Kéo ảnh từ thư viện vào, nhấp một ảnh trong thư viện, hoặc chọn từ máy.</p><button class="btn sm primary" data-act="photoReplace">${ico('upload')}Chọn ảnh từ máy</button>`);
  return h+geomHTML(f)
   +sec('Kiểu khung',range('border','Viền',f.border,0,15,.5,'mm')+`<div class="row between" style="margin-bottom:10px"><span class="lbl">Màu viền</span><div class="row">${['#ffffff','#f6f1e9','#1e1e1e','#b08d57'].map(c=>`<button class="sw${f.borderColor===c?' on':''}" style="background:${c}" data-act="borderColor" data-arg="${c}" aria-label="Viền ${c}"></button>`).join('')}<input type="color" id="in-bc" data-k="borderColor" value="${f.borderColor}" aria-label="Màu viền khác"></div></div>`
     +range('radius','Bo góc',f.radius,0,40,.5,'mm')+range('rot','Xoay khung',f.rot,-45,45,.5,'°')+`<label class="chk"><input type="checkbox" id="in-shadow" data-k="shadow" ${f.shadow?'checked':''}>Đổ bóng (kiểu ảnh polaroid)</label>`)
   +arrangeHTML();
}
function textProps(f){
  return head('Khung chữ',f.side==='P'?'Chữ trên gáy bìa':where(f))
  +sec('Nội dung',`<textarea id="in-text" data-k="text" rows="3">${esc(f.text)}</textarea><p class="hint">Hoặc nhấp đúp vào khung chữ trên trang để gõ trực tiếp.</p>`)
  +sec('Chữ',`<select class="fontsel" id="in-font" data-k="font">${FONTS.map(n=>`<option${n===f.font?' selected':''} style="font-family:'${n}'">${n}</option>`).join('')}</select>
    <div class="row between"><label class="row lbl">Cỡ <input type="number" id="in-size" data-k="size" min="4" max="200" step="0.5" value="${f.size}"> pt</label><input type="color" id="in-tcolor" data-k="color" value="${f.color}" aria-label="Màu chữ"></div>
    <div class="row" style="margin-top:10px"><div class="seg sm">${[['left','Trái'],['center','Giữa'],['right','Phải']].map(([a,l])=>`<button class="${f.align===a?'on':''}" data-act="textAlign" data-arg="${a}">${l}</button>`).join('')}</div>
    <button class="btn icon sm${f.bold?' on':''}" data-act="textBold" title="Chữ đậm" aria-label="Chữ đậm"><b>B</b></button><button class="btn icon sm${f.italic?' on':''}" data-act="textItalic" title="Chữ nghiêng" aria-label="Chữ nghiêng"><i>I</i></button></div>
    <label class="chk"><input type="checkbox" id="in-vert" data-k="vertical" ${f.vertical?'checked':''}>Chữ dọc (dùng cho gáy)</label>`)
  +(f.side==='P'?'':geomHTML(f))+arrangeHTML();
}

/* ================= thanh trên & thanh hiển thị ================= */
function renderViewbar(){
  const T=[['bleed','Tràn lề','--g-bleed'],['safe','Vùng an toàn','--g-safe'],['fold','Gáy giữa','--g-fold'],['grid','Lưới 1 cm','--g-guide'],['guides','Đường gióng','--g-guide']];
  $('#viewbar').innerHTML=`<div class="row tgs">${T.map(([k,l,c])=>`<button class="tg${V[k]?' on':''}" data-act="toggle" data-arg="${k}" aria-pressed="${!!V[k]}"><span class="dot" style="background:var(${c})"></span>${l}</button>`).join('')}${S.guides.length?`<button class="tg on" data-act="clearGuides">${ico('x')}Xóa ${S.guides.length} đường gióng</button>`:''}</div>
  <span class="pos mono" id="pos">${posText()}</span>
  <div class="zoom"><button class="btn icon sm" data-act="zoomOut" title="Thu nhỏ" aria-label="Thu nhỏ">${ico('minus')}</button><button class="zl" id="zl" data-act="zoom100" title="Bấm để về 100% (gần đúng kích thước thật)">${Math.round(V.sc/MM*100)}%</button><button class="btn icon sm" data-act="zoomIn" title="Phóng to" aria-label="Phóng to">${ico('plus')}</button><button class="btn sm${V.zoom==='fit'?' on':''}" data-act="zoomFit">Vừa màn hình</button></div>`;
}
const posText=()=>V.mouse?`X ${fmtcm(V.mouse.x)} · Y ${fmtcm(V.mouse.y)} cm`:'Rê chuột lên trang để đo';
function renderChrome(){
  const A=S.A,n=S.spreads.length-1,sp=curSpread();
  $('#sizeChip').textContent=`${fmtcm(A.w)} × ${fmtcm(A.h)} cm · ${n*2} trang`;
  $('#navLab').innerHTML=sp.kind==='cover'?`<b>Bìa album</b><span>sau · gáy · trước</span>`:`<b>Tờ ${S.cur} / ${n}</b><span>Trang ${2*S.cur-1}–${2*S.cur}</span>`;
  $('#bUndo').disabled=!H.undo.length; $('#bRedo').disabled=!H.redo.length;
  $('#bPrevSp').disabled=S.cur===0; $('#bNextSp').disabled=S.cur===S.spreads.length-1;
  const bp=$('#bPreview'); bp.classList.toggle('on',V.preview); bp.querySelector('span').textContent=V.preview?'Thoát xem trước':'Xem trước';
  renderViewbar();
}
function render(){renderChrome(); renderStage(); renderStrip(); renderLeft(); renderProps(); persistSoon();}
function select(sel){
  S.sel=sel;
  if(sel&&sel.kind==='side'&&sel.side!=='P') V.target=sel.side;
  const f=selFrame(); if(f&&(f.side==='L'||f.side==='R')) V.target=f.side;
  renderStage(); renderProps(); if(V.tab==='layouts') renderLeft();
}
function go(i){i=clamp(i,0,S.spreads.length-1); if(i===S.cur) return; S.cur=i; S.sel=null; render();}
