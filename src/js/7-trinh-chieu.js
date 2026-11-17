
/* ================= trình chiếu: xem trước trong app + xuất PowerPoint (.pptx) ================= */
// Mỗi slide = ảnh nền đổ mờ (dựng sẵn thành ảnh) + ảnh chính, hoặc slide chữ (tiêu đề / lời kết).
// Hiệu ứng chỉ dùng loại PowerPoint có sẵn, để file mở ra chiếu đúng như bản xem trước.
I.play='<path d="M7 4.5v15l12-7.5z"/>';
I.slides='<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10.5 8.5 4 2.5-4 2.5z"/>';
const SS_FX=[['fade','Mờ dần'],['black','Mờ qua đen'],['dissolve','Hoà tan'],['push','Đẩy trượt'],['wipe','Vén màn'],['zoom','Phóng to'],['random','Ngẫu nhiên'],['none','Không hiệu ứng']];
const SS_FONTS=['Cambria','Segoe UI Light','Times New Roman','Arial','Playfair Display','Great Vibes','Dancing Script','Montserrat'];
const SS_DEF={mode:'spread',aspect:'16:9',transition:'fade',tdur:1.2,dur:5,auto:true,loop:true,fit:'margin',backdrop:'blur',blur:28,dim:45,bg:'#111111',
  kenburns:true,title:'',subtitle:'',endText:'Cảm ơn bạn đã xem',font:'Cambria',musVol:70,musLoop:true,musPptx:true};
const SS={cfg:null,slides:[],key:'',token:0,building:false,prog:'',player:null,off:new Set(),exporting:false};
function ssLoadCfg(){ let c={}; try{c=JSON.parse(localStorage.getItem('pb.slideCfg')||'{}');}catch(e){} SS.cfg={...SS_DEF,...c};
  if(!SS.cfg.title){ const cv=S.spreads[0]; const pick=r=>cv&&cv.frames.find(f=>f.type==='text'&&f.side==='R'&&f.role===r&&String(f.text).trim());
    const t=pick('title')||pick('script'),d=pick('date'); SS.cfg.title=t?t.text:(albumTitle()==='Album chưa đặt tên'?'':albumTitle()); if(!SS.cfg.subtitle&&d) SS.cfg.subtitle=d.text; } }
function ssSaveCfg(){ try{ const {title,subtitle,...rest}=SS.cfg; localStorage.setItem('pb.slideCfg',JSON.stringify({...rest,endText:SS.cfg.endText})); }catch(e){} }
const ssSize=a=>a==='4:3'?{cx:9144000,cy:6858000,W:1920,H:1440}:{cx:12192000,cy:6858000,W:2560,H:1440};

/* ---- dựng ảnh cho từng slide ---- */
function regionHasContent(sp,x0,x1){ return sp.frames.some(f=>{const cx=f.x+f.w/2; if(cx<x0||cx>x1) return false;
  return f.type==='photo'?!!photoOf(f):!!String(f.text).trim();}); }
function ssSources(mode){
  const out=[],A=S.A,cv=S.spreads[0];
  const region=(sp,rx,rw,key,label)=>{ if(regionHasContent(sp,rx,rx+rw)) out.push({key,label,sp,rx,rw}); };
  if(mode==='photo'){ const seen=new Set();
    for(const sp of [cv,...S.spreads.slice(1)]) for(const f of sortFrames(sp.frames)) if(photoOf(f)&&!seen.has(f.photo)){seen.add(f.photo); out.push({key:'p'+f.photo,label:PH[f.photo].name,photo:PH[f.photo]});}
    if(!out.length) for(const id of S.lib) if(PH[id]) out.push({key:'p'+id,label:PH[id].name,photo:PH[id]});
    return out; }
  const fr=sideRect(cv,'R'); region(cv,fr.x,fr.w,'cvR','Bìa trước');
  S.spreads.slice(1).forEach((sp,k)=>{const i=k+1;
    if(mode==='page') for(const sd of ['L','R']){const r=sideRect(sp,sd),n=sd==='L'?2*i-1:2*i; region(sp,r.x,r.w,sp.id+sd,`Trang ${n}`);}
    else region(sp,0,spreadW(sp),sp.id,`Trang ${2*i-1}–${2*i}`); });
  const bk=sideRect(cv,'L'); region(cv,bk.x,bk.w,'cvL','Bìa sau');
  return out;
}
async function ssRender(src,maxW,maxH){
  const cv=document.createElement('canvas');
  if(src.photo){ const im=await fullImg(src.photo),k=Math.min(1,maxW/src.photo.w,maxH/src.photo.h);
    cv.width=Math.max(1,Math.round(src.photo.w*k)); cv.height=Math.max(1,Math.round(src.photo.h*k));
    const x=cv.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(im,0,0,cv.width,cv.height); }
  else { const keep={dpi:EX.dpi,bleed:EX.bleed,marks:EX.marks};
    EX.dpi=Math.min(maxW/src.rw,maxH/S.A.h)*25.4; EX.bleed=false; EX.marks=false;
    try{ await drawRegion(cv,{sp:src.sp,rx:src.rx,rw:src.rw,label:src.label}); } finally{ Object.assign(EX,keep); } }
  clearFull();
  const blob=await toBlob(cv,.9),th=document.createElement('canvas'),k=120/cv.height; th.width=Math.round(cv.width*k); th.height=120;
  th.getContext('2d').drawImage(cv,0,0,th.width,th.height);
  return {blob,w:cv.width,h:cv.height,url:URL.createObjectURL(blob),thumb:URL.createObjectURL(await toBlob(th,.8))};
}
async function ssBuild(){
  const key=SS.cfg.mode+'|'+contentHash();
  if(key===SS.key&&SS.slides.length) return;
  const tok=++SS.token,srcs=ssSources(SS.cfg.mode),out=[];
  SS.building=true; ssRenderStrip(); ssRenderFoot();
  for(let i=0;i<srcs.length;i++){
    if(tok!==SS.token) return;
    SS.prog=`Đang dựng slide ${i+1}/${srcs.length}…`; ssRenderView();
    try{ out.push({...srcs[i],...(await ssRender(srcs[i],2560,1440))}); }catch(e){}
  }
  if(tok!==SS.token) return;
  for(const s of SS.slides){URL.revokeObjectURL(s.url); URL.revokeObjectURL(s.thumb);}
  SS.slides=out; SS.key=key; SS.building=false; SS.prog=''; SS.off=new Set();
  ssRenderStrip(); ssRestart(0); ssRenderFoot(); musRenderList();
}
const ssIncluded=()=>SS.slides.filter(s=>!SS.off.has(s.key));
function ssItems(){ const c=SS.cfg,it=[];
  if(c.title.trim()||c.subtitle.trim()) it.push({type:'title'});
  for(const s of ssIncluded()) it.push({type:'img',s});
  if(c.endText.trim()) it.push({type:'end'});
  return it; }

/* ---- bản xem trước (gần đúng hiệu ứng PowerPoint) ---- */
function ssPlayer(root,start){
  const c=SS.cfg,items=ssItems(),sz=ssSize(c.aspect),first=ssIncluded()[0];
  root.innerHTML='<div class="spv-frame"></div><div class="spv-bar"><button data-sp="prev" aria-label="Slide trước">'+ico('chevL')+'</button><button data-sp="play" aria-label="Chạy hoặc dừng"></button><button data-sp="next" aria-label="Slide sau">'+ico('chevR')+'</button><span class="spv-n mono"></span></div>';
  const frame=root.firstChild,bar=root.lastChild; let i=-1,cur=null,timer=0,playing=c.auto;
  const fit=()=>{const W=root.clientWidth,H=root.clientHeight,k=Math.min(W/sz.W,H/sz.H); frame.style.width=sz.W*k+'px'; frame.style.height=sz.H*k+'px'; frame.style.setProperty('--tsz',sz.H*k*.085+'px');};
  const ro=new ResizeObserver(fit); ro.observe(root); fit();
  const bgFilter=`blur(${c.blur*0.6}px) brightness(${1-c.dim/100}) saturate(1.15)`;
  function layer(it){ const L=el('div','ly'),src=it.type==='img'?it.s.url:first&&first.url;
    if(c.backdrop==='blur'&&src){const b=new Image(); b.className='bd'; b.src=src; b.alt=''; b.style.filter=bgFilter; L.append(b);}
    else L.style.background=c.backdrop==='white'?'#ffffff':c.backdrop==='color'?c.bg:'#000000';
    if(it.type==='img'){const im=new Image(); im.className='fg '+c.fit; im.src=it.s.url; im.alt=it.s.label;
      if(c.kenburns){im.classList.add('kb'); im.style.setProperty('--kd',c.dur+'s'); im.style.animationDelay=c.tdur+'s';} L.append(im);}
    else{const t=el('div','tx'+(c.backdrop==='white'?' dark':'')); t.style.fontFamily=`"${c.font}",Georgia,serif`;
      if(it.type==='title'){const a=el('div','t'),b=el('div','s'); a.textContent=c.title; b.textContent=c.subtitle; t.append(a,b);}
      else{const a=el('div','t sm'); a.textContent=c.endText; t.append(a);} L.append(t);}
    return L; }
  const FXS=['fade','black','dissolve','push','wipe','zoom'];
  function show(n){ const N=items.length; if(!N){frame.innerHTML='<p class="spv-empty">Chưa có slide nào. Hãy chọn ít nhất một ảnh ở dải bên dưới.</p>'; ui(); return;}
    if(n>=N){ if(!c.loop){playing=false; musSetPlaying(false); ui(); return;} n=0; } if(n<0) n=N-1;
    const f=c.transition==='random'?FXS[Math.floor(Math.random()*FXS.length)]:c.transition;
    const L=layer(items[n]); L.style.setProperty('--td',(f==='none'?0.01:c.tdur)+'s'); L.classList.add('in-'+f); frame.append(L);
    if(cur){const o=cur; o.classList.add('out-'+f); o.style.setProperty('--td',(f==='none'?0.01:c.tdur)+'s'); setTimeout(()=>o.remove(),(f==='none'?0:c.tdur*1000)+80);}
    cur=L; i=n; ui(); sched(); }
  function sched(){clearTimeout(timer); if(playing) timer=setTimeout(()=>show(i+1),(c.dur+c.tdur)*1000);}
  function ui(){bar.querySelector('[data-sp=play]').innerHTML=ico(playing?'pause':'play'); bar.querySelector('.spv-n').textContent=items.length?`${i+1} / ${items.length}`:'0 / 0';}
  bar.onclick=e=>{const b=e.target.closest('[data-sp]'); if(!b) return; const a=b.dataset.sp;
    if(a==='prev') show(i-1); else if(a==='next') show(i+1); else {playing=!playing; if(playing) sched(); else clearTimeout(timer); musSetPlaying(playing); ui();}};
  show(Math.min(start||0,Math.max(0,items.length-1)));
  musSetPlaying(playing);
  return {go:n=>show(n),next:()=>show(i+1),prev:()=>show(i-1),toggle:()=>bar.querySelector('[data-sp=play]').click(),index:()=>i,playing:()=>playing,items,
    destroy:()=>{clearTimeout(timer); ro.disconnect(); root.innerHTML='';}};
}
I.pause='<path d="M8 5v14M16 5v14"/>';
let _ssT=0;
function ssRestart(at){ clearTimeout(_ssT); _ssT=setTimeout(()=>{ const v=$('#ssView'); if(!v||$('#slideModal').hidden) return;
  const keep=at??(SS.player?SS.player.index():0); if(SS.player) SS.player.destroy(); SS.player=null;
  if(SS.building){ssRenderView(); return;} SS.player=ssPlayer(v,Math.max(0,keep)); ssRenderFoot(); },60); }

/* ---- giao diện hộp Trình chiếu ---- */
function ssRenderSet(){
  const c=SS.cfg,opt=(k,list)=>`<div class="seg sm">${list.map(([v,l])=>`<button class="${String(c[k])===String(v)?'on':''}" data-act="ssOpt" data-arg="${k}|${v}">${l}</button>`).join('')}</div>`;
  const tog=(k,l)=>`<button class="tgl${c[k]?' on':''}" data-act="ssOpt" data-arg="${k}|${c[k]?0:1}" aria-pressed="${c[k]}"><span></span>${l}</button>`;
  const rg=(k,l,min,max,step,unit)=>`<label class="rg"><span>${l}</span><output>${fmt1(c[k])} ${unit}</output><input type="range" data-ss="${k}" min="${min}" max="${max}" step="${step}" value="${c[k]}"></label>`;
  $('#ssSet').innerHTML=
  sec('Nội dung slide',`<div class="ss-row"><span class="lbl">Mỗi slide là</span>${opt('mode',[['spread','Một tờ album'],['page','Một trang'],['photo','Một ảnh']])}</div>
    <div class="ss-row"><span class="lbl">Khổ slide</span>${opt('aspect',[['16:9','16:9 màn rộng'],['4:3','4:3']])}</div>
    <p class="hint">Tờ hoặc trang trống được bỏ qua. Bấm dấu tích trên ảnh ở dải bên dưới để bỏ bớt slide.</p>`)
  +sec('Hiệu ứng chuyển slide',`<div class="ss-fx">${SS_FX.map(([v,l])=>`<button class="chipb${c.transition===v?' on':''}" data-act="ssOpt" data-arg="transition|${v}">${l}</button>`).join('')}</div>
    ${rg('tdur','Thời gian chuyển',0.3,3,0.1,'giây')}`)
  +sec('Ảnh và nền',`<div class="ss-row"><span class="lbl">Ảnh trong slide</span>${opt('fit',[['margin','Vừa khung, có lề'],['edge','Vừa khung'],['cover','Tràn kín']])}</div>
    <div class="ss-row"><span class="lbl">Nền slide</span>${opt('backdrop',[['blur','Ảnh đổ mờ'],['black','Đen'],['white','Trắng'],['color','Màu khác']])}</div>
    ${c.backdrop==='blur'?rg('blur','Độ mờ của nền',8,60,1,'px')+rg('dim','Độ tối của nền',0,80,1,'%'):''}
    ${c.backdrop==='color'?`<div class="ss-row"><span class="lbl">Màu nền</span><input type="color" data-ss="bg" value="${c.bg}" aria-label="Màu nền"></div>`:''}
    <div class="row" style="margin-top:6px">${tog('kenburns','Phóng chậm ảnh khi chiếu')}</div>`)
  +sec('Tự chạy',`<div class="row">${tog('auto','Tự chuyển slide')}${tog('loop','Lặp lại khi hết')}</div>
    ${rg('dur','Thời gian mỗi slide',2,20,0.5,'giây')}`)
  +sec('Nhạc nền',`<div id="musBox">${musListHtml()}</div>
    <div class="row mus-add"><button class="btn sm" data-act="musPick">${ico('plus')}Thêm nhạc…</button>${MUS.list.length?`<button class="btn sm ghost" data-act="musClearAll">${ico('trash')}Bỏ hết</button>`:''}</div>
    ${MUS.list.length?rg('musVol','Âm lượng nhạc',0,100,5,'%')+`<div class="row">${tog('musLoop','Lặp lại danh sách nhạc')}${tog('musPptx','Nhúng nhạc vào file .pptx')}</div>
    <p class="hint">Nhạc trong file .pptx đặt ở chế độ tự phát, chạy xuyên các slide; hình cái loa nằm ngoài mép slide nên lúc chiếu không thấy. File .pptx sẽ nặng thêm bằng cỡ các bài nhạc.</p>`:''}`)
  +sec('Slide mở đầu và kết',`<label class="ss-in"><span>Tiêu đề</span><input type="text" data-ss="title" value="${esc(c.title)}" placeholder="Để trống thì không có slide mở đầu"></label>
    <label class="ss-in"><span>Dòng phụ</span><input type="text" data-ss="subtitle" value="${esc(c.subtitle)}" placeholder="Ngày, địa điểm…"></label>
    <label class="ss-in"><span>Lời kết</span><input type="text" data-ss="endText" value="${esc(c.endText)}" placeholder="Để trống thì không có slide kết"></label>
    <label class="ss-in"><span>Phông chữ</span><select data-ss="font">${SS_FONTS.map(f=>`<option${f===c.font?' selected':''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label>
    <p class="hint">Cambria, Segoe UI, Times New Roman và Arial có sẵn trên mọi máy Windows. Phông khác cần cài trên máy chiếu, nếu không PowerPoint sẽ thay bằng phông gần giống.</p>`);
}
function ssRenderStrip(){
  const st=$('#ssStrip'); if(!st) return;
  if(SS.building&&!SS.slides.length){st.innerHTML=''; return;}
  const lead=(SS.cfg.title.trim()||SS.cfg.subtitle.trim())?1:0; let k=0;
  st.innerHTML=SS.slides.map(s=>{const on=!SS.off.has(s.key),idx=on?lead+(k++):-1;
    return `<div class="ss-th${on?'':' off'}" data-act="ssGo" data-arg="${idx}" title="${esc(s.label)}"><img src="${s.thumb}" alt=""><button class="ss-ck" data-act="ssToggle" data-arg="${esc(s.key)}" aria-label="${on?'Bỏ':'Thêm lại'} slide ${esc(s.label)}" aria-pressed="${on}"></button><span>${esc(s.label)}</span></div>`;}).join('');
}
function ssRenderView(){ const v=$('#ssView'); if(!v) return; if(SS.building){ if(SS.player){SS.player.destroy(); SS.player=null;} v.innerHTML=`<div class="ss-wait"><div class="bar"><i></i></div><p>${esc(SS.prog||'Đang dựng slide…')}</p></div>`; } }
function ssRenderFoot(){
  const n=SS.building?0:ssItems().length,c=SS.cfg,sec=Math.round(n*(c.dur+c.tdur)),mm=Math.floor(sec/60),ss2=sec%60;
  $('#ssInfo').textContent=SS.building?'Đang dựng slide…':`${n} slide${c.auto?` · tự chạy khoảng ${mm?mm+' phút ':''}${ss2} giây`:' · bấm chuột để chuyển'}`;
  $('#ssExport').disabled=SS.building||!n||SS.exporting;
}
function ssOpen(){ ssLoadCfg(); $('#slideModal').hidden=false; ACT.closePanels(); ssRenderSet(); ssRenderView(); ssRenderStrip(); ssRenderFoot();
  ssBuild().then(()=>{ if(!SS.building) ssRestart(0); }); }
function ssClose(){ if(SS.exporting) return; $('#slideModal').hidden=true; SS.token++; SS.building=false; musStop(); if(SS.player){SS.player.destroy(); SS.player=null;} if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }

/* ---- ghi file PowerPoint ---- */
const NS_A='http://schemas.openxmlformats.org/drawingml/2006/main',NS_R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',NS_P='http://schemas.openxmlformats.org/presentationml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const xe=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const XH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const rels=list=>XH+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(([id,t,tg])=>`<Relationship Id="${id}" Type="${t.startsWith('http')?t:REL+t}" Target="${tg}"/>`).join('')}</Relationships>`;
async function blurBg(blob,W,H){
  const bmp=await createImageBitmap(blob),c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'),k=Math.max(W/bmp.width,H/bmp.height)*1.15,w=bmp.width*k,h=bmp.height*k;
  x.fillStyle='#000'; x.fillRect(0,0,W,H); x.filter=`blur(${SS.cfg.blur}px) brightness(${1-SS.cfg.dim/100}) saturate(1.15)`;
  x.drawImage(bmp,(W-w)/2,(H-h)/2,w,h); bmp.close(); return toBlob(c,.82);
}
function transXml(c){
  const t=c.transition,ms=Math.round(c.tdur*1000),spd=ms<=500?'fast':ms<=900?'med':'slow',adv=c.auto?` advTm="${Math.round(c.dur*1000)}"`:'';
  const fx={fade:'<p:fade/>',black:'<p:fade thruBlk="1"/>',dissolve:'<p:dissolve/>',push:'<p:push dir="l"/>',wipe:'<p:wipe dir="r"/>',zoom:'<p:zoom/>',random:'<p:random/>',none:''}[t]||'<p:fade/>';
  if(t==='none') return `<p:transition${adv}/>`;
  return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p14"><p:transition spd="${spd}" p14:dur="${ms}"${adv}>${fx}</p:transition></mc:Choice><mc:Fallback><p:transition spd="${spd}"${adv}>${fx}</p:transition></mc:Fallback></mc:AlternateContent>`;
}
// Dòng thời gian của một slide: phóng chậm ảnh (Ken Burns) và nhạc tự phát xuyên các slide.
function ssTimingXml(kbSpid,c,audio){
  if(!kbSpid&&!audio) return '';
  let id=5,eff='';
  if(kbSpid) eff+=`<p:par><p:cTn id="${id++}" presetID="6" presetClass="emph" presetSubtype="0" fill="hold" nodeType="withEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:animScale><p:cBhvr><p:cTn id="${id++}" dur="${Math.round(c.dur*1000)}" fill="hold"/><p:tgtEl><p:spTgt spid="${kbSpid}"/></p:tgtEl></p:cBhvr><p:by x="110000" y="110000"/></p:animScale></p:childTnLst></p:cTn></p:par>`;
  if(audio) eff+=`<p:par><p:cTn id="${id++}" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="withEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="${id++}" dur="2147483647" fill="hold"/><p:tgtEl><p:spTgt spid="${audio.spid}"/></p:tgtEl></p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par>`;
  const seq=`<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${eff}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`;
  const aud=audio?`<p:audio><p:cMediaNode vol="${audio.vol}" numSld="${audio.numSld}" showWhenStopped="0"><p:cTn id="${id++}" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="${audio.spid}"/></p:tgtEl></p:cMediaNode></p:audio>`:'';
  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${seq}${aud}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
}
function picXml(id,name,rid,x,y,w,h,crop,shadow){
  const src=crop?`<a:srcRect l="${crop.l}" t="${crop.t}" r="${crop.r}" b="${crop.b}"/>`:'';
  const sh=shadow?'<a:effectLst><a:outerShdw blurRad="381000" dist="114300" dir="5400000" algn="ctr" rotWithShape="0"><a:prstClr val="black"><a:alpha val="45000"/></a:prstClr></a:outerShdw></a:effectLst>':'';
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${xe(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/>${src}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${sh}</p:spPr></p:pic>`; }
function textXml(id,name,text,x,y,w,h,pt,color,font,shadow){
  const sh=shadow?'<a:effectLst><a:outerShdw blurRad="76200" dist="25400" dir="5400000" algn="ctr" rotWithShape="0"><a:prstClr val="black"><a:alpha val="55000"/></a:prstClr></a:outerShdw></a:effectLst>':'';
  const paras=String(text).split('\n').map(l=>`<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="vi-VN" sz="${Math.round(pt*100)}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${sh}<a:latin typeface="${xe(font)}"/><a:cs typeface="${xe(font)}"/></a:rPr><a:t>${xe(l)}</a:t></a:r></a:p>`).join('');
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xe(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`; }
async function buildPptx(onProg){
  const c=SS.cfg,sz=ssSize(c.aspect),items=ssItems(),files=[],media=[],first=ssIncluded()[0];
  const bgSolid=c.backdrop==='white'?'FFFFFF':c.backdrop==='color'?c.bg.replace('#','').toUpperCase():'000000';
  const txtColor=c.backdrop==='white'?'1D1D1F':'FFFFFF',useBlur=c.backdrop==='blur';
  let firstBg=null; if(useBlur&&first) firstBg=await blurBg(first.blob,1280,Math.round(1280*sz.cy/sz.cx));
  const mediaSeen=new Set(),audioExt=new Set();
  const musP=c.musPptx?musPlan(items.length,c.dur+c.tdur):[];
  const musIcon=musP.length?await musIconBlob():null;
  const slideXml=[],slideRels=[];
  for(let n=0;n<items.length;n++){
    onProg(`Đang tạo slide ${n+1}/${items.length}…`);
    const it=items[n],rl=[['rId1','slideLayout','../slideLayouts/slideLayout1.xml']]; let shapes='',kbSpid=0,nid=2;
    const addRel=(t,tg)=>{const rid='rId'+(rl.length+1); rl.push([rid,t,tg]); return rid;};
    const addFile=(blob,name)=>{ if(!mediaSeen.has(name)){mediaSeen.add(name); media.push({blob,name});} };
    const addMedia=(blob,name)=>{addFile(blob,name); return addRel('image','../media/'+name);};
    const bg=it.type==='img'?(useBlur?await blurBg(it.s.blob,1280,Math.round(1280*sz.cy/sz.cx)):null):firstBg;
    if(bg) shapes+=picXml(nid++,'Nền đổ mờ',addMedia(bg,`bg${n+1}.jpeg`),0,0,sz.cx,sz.cy,null,false);
    if(it.type==='img'){ const s=it.s,rid=addMedia(s.blob,`slide${n+1}.jpeg`),pid=nid++;
      if(c.fit==='cover'){ const ia=s.w/s.h,sa=sz.cx/sz.cy; let crop={l:0,t:0,r:0,b:0};
        if(ia>sa){const keep=sa/ia,cut=Math.round((1-keep)/2*100000); crop={l:cut,t:0,r:cut,b:0};} else {const keep=ia/sa,cut=Math.round((1-keep)/2*100000); crop={l:0,t:cut,r:0,b:cut};}
        shapes+=picXml(pid,s.label,rid,0,0,sz.cx,sz.cy,crop,false); }
      else { const m=c.fit==='margin'?0.05:0,aw=sz.cx*(1-2*m),ah=sz.cy*(1-2*m),k=Math.min(aw/s.w,ah/s.h),w=s.w*k,h=s.h*k;
        shapes+=picXml(pid,s.label,rid,(sz.cx-w)/2,(sz.cy-h)/2,w,h,null,c.fit==='margin'&&c.backdrop!=='white'); }
      if(c.kenburns) kbSpid=pid; }
    else if(it.type==='title'){
      if(c.title.trim()) shapes+=textXml(nid++,'Tiêu đề',c.title,sz.cx*.08,sz.cy*.28,sz.cx*.84,sz.cy*.26,c.aspect==='4:3'?44:54,txtColor,c.font,useBlur);
      if(c.subtitle.trim()) shapes+=textXml(nid++,'Dòng phụ',c.subtitle,sz.cx*.12,sz.cy*.56,sz.cx*.76,sz.cy*.12,22,txtColor,c.font,useBlur); }
    else shapes+=textXml(nid++,'Lời kết',c.endText,sz.cx*.1,sz.cy*.36,sz.cx*.8,sz.cy*.28,c.aspect==='4:3'?36:44,txtColor,c.font,useBlur);
    // Nhạc: bài nào bắt đầu ở slide này thì gắn vào đây, đặt tự phát và chạy xuyên mp.span slide.
    let audio=null; const mp=musP.find(p=>p.slide===n);
    if(mp){ const ext=musExt(mp.track),mn=`nhac${MUS.list.indexOf(mp.track)+1}.${ext}`,tgt='../media/'+mn;
      audioExt.add(ext); addFile(mp.track.blob,mn);
      const ridImg=addMedia(musIcon,'nhac-icon.jpeg'),ridA=addRel('audio',tgt),ridM=addRel('http://schemas.microsoft.com/office/2007/relationships/media',tgt),spid=nid++;
      shapes+=musPicXml(spid,mp.track.name,ridImg,ridA,ridM);
      audio={spid,numSld:mp.span,vol:Math.round(clamp(c.musVol,0,100)*1000)}; }
    const timing=ssTimingXml(kbSpid,c,audio);
    const bgXml=bg?'':`<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bgSolid}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
    slideXml.push(XH+`<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld>${bgXml}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>${transXml(c)}${timing}</p:sld>`);
    slideRels.push(rels(rl));
  }
  onProg('Đang đóng gói PowerPoint…');
  const N=items.length,ct='application/vnd.openxmlformats-officedocument.presentationml.',now=new Date().toISOString().replace(/\.\d+Z$/,'Z'),title=c.title.trim()||albumTitle();
  const xml=(name,str)=>files.push({name,blob:new Blob([str],{type:'application/xml'})});
  xml('[Content_Types].xml',XH+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/>${[...audioExt].map(e=>`<Default Extension="${e}" ContentType="${MUS_TYPES[e]}"/>`).join('')}<Override PartName="/ppt/presentation.xml" ContentType="${ct}presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${ct}slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${ct}slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="${ct}presProps+xml"/>${slideXml.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="${ct}slide+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  xml('_rels/.rels',rels([['rId1','officeDocument','ppt/presentation.xml'],['rId2','http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties','docProps/core.xml'],['rId3','extended-properties','docProps/app.xml']]));
  xml('docProps/core.xml',XH+`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(title)}</dc:title><dc:creator>Xưởng Photobook</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  xml('docProps/app.xml',XH+`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Xưởng Photobook</Application><Slides>${N}</Slides></Properties>`);
  xml('ppt/presentation.xml',XH+`<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideXml.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${sz.cx}" cy="${sz.cy}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  xml('ppt/_rels/presentation.xml.rels',rels([['rId1','slideMaster','slideMasters/slideMaster1.xml'],...slideXml.map((_,i)=>['rId'+(i+2),'slide',`slides/slide${i+1}.xml`]),['rId'+(N+2),'presProps','presProps.xml'],['rId'+(N+3),'theme','theme/theme1.xml']]));
  xml('ppt/presProps.xml',XH+`<p:presentationPr xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}">${c.loop?'<p:showPr loop="1" showNarration="1"><p:present/><p:sldAll/><p:penClr><a:prstClr val="red"/></p:penClr></p:showPr>':''}</p:presentationPr>`);
  xml('ppt/theme/theme1.xml',PPTX_TPL.theme);
  xml('ppt/slideMasters/slideMaster1.xml',PPTX_TPL.master);
  xml('ppt/slideMasters/_rels/slideMaster1.xml.rels',rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]));
  xml('ppt/slideLayouts/slideLayout1.xml',PPTX_TPL.layout);
  xml('ppt/slideLayouts/_rels/slideLayout1.xml.rels',rels([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]));
  slideXml.forEach((s,i)=>{xml(`ppt/slides/slide${i+1}.xml`,s); xml(`ppt/slides/_rels/slide${i+1}.xml.rels`,slideRels[i]);});
  for(const m of media) files.push({name:'ppt/media/'+m.name,blob:m.blob});
  return {blob:new Blob([await buildZip(files)],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}),n:N,aud:musP.length};
}
async function ssExport(){
  if(SS.exporting||SS.building) return;
  const c=SS.cfg,base=(c.title.trim()||albumTitle()).replace(/[\\/:*?"<>|]+/g,' ').trim().slice(0,80)||'Album',name=`${base} - Trinh chieu.pptx`;
  let handle=null;
  if(window.showSaveFilePicker){ try{handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'Bản trình chiếu PowerPoint',accept:{'application/vnd.openxmlformats-officedocument.presentationml.presentation':['.pptx']}}]});}
    catch(e){ if(e&&e.name==='AbortError') return; handle=null; } }
  SS.exporting=true; ssRenderFoot(); const info=$('#ssInfo');
  try{
    const {blob,n,aud}=await buildPptx(m=>{info.textContent=m;});
    let saved=name;
    if(handle){await writeHandle(handle,blob); saved=handle.name;}
    else{const r=await saveFile(blob,name); if(!r.ok) throw new Error(r.msg);}
    const musTxt=aud?` Nhạc đã nhúng sẵn (${aud} lượt vào nhạc), tự phát khi chiếu.`:(MUS.list.length&&!c.musPptx?' Nhạc không nhúng vào file này vì công tắc “Nhúng nhạc vào file .pptx” đang tắt.':'');
    toast(`Đã xuất ${saved}: ${n} slide, ${fmtMB(blob.size)}.${musTxt} Mở bằng PowerPoint rồi bấm F5 để chiếu.`,{ms:9000});
  }catch(e){toast('Xuất PowerPoint không thành công: '+((e&&e.message)||e),{ms:9000});}
  SS.exporting=false; ssRenderFoot();
}

/* ---- điều khiển ---- */
Object.assign(ACT,{
  ssOpen(){ssOpen();}, ssOpenMenu(){toggleMenu(false); ssOpen();}, ssClose(){ssClose();},
  ssOpt(a){const [k,v]=a.split('|'); const num=['tdur','dur','blur','dim'].includes(k),bool=['kenburns','auto','loop','musLoop','musPptx'].includes(k);
    SS.cfg[k]=bool?v==='1':num?+v:v; ssSaveCfg(); ssRenderSet();
    if(k==='musLoop'||k==='musPptx') return;
    if(k==='mode'){SS.key=''; ssBuild();} else ssRestart(); },
  ssToggle(key){ if(SS.off.has(key)) SS.off.delete(key); else SS.off.add(key); ssRenderStrip(); ssRestart(); },
  ssGo(i){ if(+i>=0&&SS.player) SS.player.go(+i); },
  ssPresent(){ const v=$('#ssView'); if(v.requestFullscreen) v.requestFullscreen().catch(()=>toast('Trình duyệt không cho chiếu toàn màn hình ở đây.')); },
  ssExport(){ssExport();}
});
(function bindSlideshow(){
  const m=$('#slideModal');
  m.addEventListener('input',e=>{const t=e.target,k=t.dataset&&t.dataset.ss; if(!k) return;
    SS.cfg[k]=t.type==='range'?+t.value:t.value;
    if(t.type==='range'){const o=t.closest('.rg').querySelector('output'); if(o) o.textContent=fmt1(+t.value)+' '+(o.textContent.split(' ').slice(1).join(' '));}
    ssSaveCfg();
    if(k==='musVol'){musVolApply(); return;}   // đổi âm lượng thì không dựng lại bản xem trước
    if(k==='title'||k==='subtitle') ssRenderStrip(); ssRestart(); });
  m.addEventListener('click',e=>{if(e.target===m) ssClose();});
  window.addEventListener('keydown',e=>{ if(m.hidden) return;
    const a=document.activeElement,typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='range';
    if(e.key==='Escape'&&!document.fullscreenElement){e.preventDefault(); ssClose();}
    else if(!typing&&SS.player){ if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault(); SS.player.next();} else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault(); SS.player.prev();} else if(e.key===' '){e.preventDefault(); SS.player.toggle();} }
    if(!typing||e.key==='Escape') e.stopPropagation();
  },true);
})();
