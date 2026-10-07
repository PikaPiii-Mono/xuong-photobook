
/* ================= xem dạng sách (lật trang) ================= */
const B={i:0,views:[],anim:false,sc:1};
function bookViews(){const cv=S.spreads[0],v=[{R:[cv,'R'],lab:'Bìa trước'}];
  for(let i=1;i<S.spreads.length;i++){const sp=S.spreads[i]; v.push({L:[sp,'L'],R:[sp,'R'],lab:`Trang ${2*i-1}–${2*i}`});}
  v.push({L:[cv,'L'],lab:'Bìa sau'}); return v;}
function pageView(ref){const d=el('div','pvw'); if(!ref) return d; const [sp,side]=ref,r=sideRect(sp,side),sh=renderSheet(sp,B.sc,'view');
  sh.style.position='absolute'; sh.style.left=-r.x*B.sc+'px'; sh.style.top='0'; d.append(sh); return d;}
function half(cls,ref){const d=el('div','bk-half '+cls+(ref?' has':'')); d.append(pageView(ref)); return d;}
function bookSize(){const st=$('#bkStage'),W=S.A.w,Hh=S.A.h; B.sc=Math.max(.2,Math.min((st.clientWidth-24)/(2*W),(st.clientHeight-12)/Hh));
  const bk=$('#book'); bk.style.width=2*W*B.sc+'px'; bk.style.height=Hh*B.sc+'px';}
function bookRender(){const bk=$('#book'),v=B.views[B.i]; bookSize(); bk.replaceChildren(half('l',v.L),half('r',v.R));
  if(v.L&&v.R) bk.append(el('div','fold-shade'));
  $('#bkLab').textContent=v.lab; $('#bkCount').textContent=`${B.i+1} / ${B.views.length}`;}
function openBook(){B.views=bookViews(); B.i=S.cur===0?0:S.cur; B.anim=false; $('#bookModal').hidden=false; bookRender();}
function closeBook(){$('#bookModal').hidden=true; $('#book').replaceChildren();}
function bookGo(dir){
  if(B.anim) return; const j=B.i+dir; if(j<0||j>=B.views.length) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){B.i=j; bookRender(); return;}
  const a=B.views[B.i],b=B.views[j],bk=$('#book'); bookSize();
  const leaf=el('div','leaf '+(dir>0?'r':'l')),fr=el('div','face front'),bkf=el('div','face back');
  const front=dir>0?a.R:a.L,back=dir>0?b.L:b.R;
  if(front){fr.classList.add('has'); fr.append(pageView(front));} if(back){bkf.classList.add('has'); bkf.append(pageView(back));}
  leaf.append(fr,bkf);
  bk.replaceChildren(dir>0?half('l',a.L):half('l',b.L),dir>0?half('r',b.R):half('r',a.R),leaf);
  B.anim=true; let done=false;
  const fin=()=>{if(done) return; done=true; B.i=j; B.anim=false; bookRender();};
  leaf.addEventListener('transitionend',fin,{once:true}); setTimeout(fin,1300);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{leaf.style.transform=`rotateY(${dir>0?-180:180}deg)`;}));
}

/* ================= thông báo ================= */
function toast(msg,o={}){const t=el('div','toast'),s=el('span'); s.textContent=msg; t.append(s);
  if(o.action){const b=el('button'); b.textContent=o.action; b.onclick=()=>{o.onAction(); t.remove();}; t.append(b);}
  $('#toasts').append(t); while($('#toasts').children.length>3) $('#toasts').firstChild.remove();
  if(!o.sticky) setTimeout(()=>t.remove(),o.ms||4200);
  return {set:m=>{s.textContent=m;},close:()=>t.remove()};}

/* ================= nạp ảnh ================= */
function pickFiles(target){const inp=$('#file'); inp.value=''; inp.multiple=!target; V.pickTarget=target; inp.click();}
const loadImg=src=>new Promise((res,rej)=>{const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=src;});
function scaled(src,max,w,h){const k=Math.min(1,max/Math.max(w,h)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k)); const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(src,0,0,c.width,c.height); return c;}
async function ingest(file){const src=URL.createObjectURL(file);
  try{const im=await loadImg(src),w=im.naturalWidth,h=im.naturalHeight; if(!w||!h) throw new Error('empty');
    const prevBlob=Math.max(w,h)>2400?await toBlob(scaled(im,2400,w,h),.9):null,thumbBlob=await toBlob(scaled(im,360,w,h),.82);
    if(prevBlob) URL.revokeObjectURL(src);
    const id=uid('p'); PH[id]={id,name:file.name,w,h,url:prevBlob?URL.createObjectURL(prevBlob):src,thumb:URL.createObjectURL(thumbBlob),file,prevBlob,thumbBlob};
    await materialize(PH[id],false); return id;}
  catch(err){URL.revokeObjectURL(src); return null;}}
async function addFiles(list,targetId){
  const files=[...list].filter(f=>(f.type||'').startsWith('image/')||/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  if(!files.length){toast('Không thấy file ảnh nào. Hãy chọn ảnh JPG, PNG hoặc WebP.'); return;}
  const t=toast(`Đang nạp ảnh 0/${files.length}…`,{sticky:true}),out=new Array(files.length); let done=0,next=0;
  const work=async()=>{while(next<files.length){const i=next++; out[i]=await ingest(files[i]); t.set(`Đang nạp ảnh ${++done}/${files.length}…`);}};
  await Promise.all([work(),work(),work()]); t.close();
  const ids=out.filter(Boolean),bad=files.length-ids.length;
  if(!ids.length){toast('Không đọc được ảnh nào. Ảnh HEIC của iPhone cần đổi sang JPG trước khi thêm.',{ms:7000}); return;}
  const hadSamples=S.lib.some(id=>PH[id]&&PH[id].sample); let placed=0;
  beginEdit();
  if(hadSamples) removeSamples();
  S.lib.push(...ids);
  if(targetId){const f=findFrame(targetId); if(f){setPhoto(f,ids[0]); placed=1;}}
  else if(hadSamples||!S.spreads.some(sp=>sp.frames.some(f=>photoOf(f)))) placed=autoFill(ids,false);
  V.tab='photos'; commit();
  let msg=`Đã thêm ${ids.length} ảnh${hadSamples?' thay cho ảnh mẫu':''}.`;
  if(!targetId){if(placed) msg+=` Đã đặt ${placed} ảnh vào khung trống.`; const left=ids.length-placed; if(left>0) msg+=` Còn ${left} ảnh trong thư viện, bấm “Tự động xếp” để thêm tờ.`;}
  if(bad) msg+=` Bỏ qua ${bad} file không đọc được.`;
  toast(msg,{ms:7000});
}

/* ================= ảnh mẫu (vẽ bằng canvas, đánh dấu rõ là mẫu) ================= */
const SKY=[['#f7c59f','#fde8d4','#fff6e5',['#d99b7e','#a8664f','#5e3a30']],['#8db6dc','#e4eef7','#ffffff',['#9db5c8','#6b889e','#3b5569']],
  ['#2d2f5c','#e48a74','#ffd9a8',['#7d4b6c','#4d2f50','#231a31']],['#a6d6c5','#eef7f2','#fffbea',['#8bbfa3','#5a9878','#2e6048']],
  ['#f2b3c0','#fde6ea','#fff7f8',['#d898a6','#b06a7f','#6d3c4e']],['#1d2643','#5cbfbd','#e9f6f5',['#3b516c','#27374e','#0c142c']],
  ['#f9dc86','#fff5d6','#ffffff',['#c8b07a','#998353','#5d4e2c']],['#c2b0e0','#efe8f8','#ffffff',['#a390c3','#79669b','#493c62']]];
function rgba(hex,a){const n=parseInt(hex.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function drawSample(i){
  const dims=[[1500,1000],[1000,1500],[1300,1300]][[0,0,1,0,2,0,1,0,0,1,0,2,0,0,1,0][i%16]],[w,h]=dims;
  const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); let sd=i*7919+13; const R=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
  const P=SKY[i%SKY.length]; let gr=x.createLinearGradient(0,0,0,h); gr.addColorStop(0,P[0]); gr.addColorStop(.72,P[1]); x.fillStyle=gr; x.fillRect(0,0,w,h);
  const sx=w*(.2+R()*.6),sy=h*(.16+R()*.22),sr=Math.min(w,h)*(.05+R()*.04);
  gr=x.createRadialGradient(sx,sy,0,sx,sy,sr*6); gr.addColorStop(0,P[2]); gr.addColorStop(.16,P[2]); gr.addColorStop(.19,rgba(P[2],.45)); gr.addColorStop(1,rgba(P[2],0)); x.fillStyle=gr; x.fillRect(0,0,w,h);
  P[3].forEach((cl,k)=>{const base=h*(.5+k*.13+R()*.05),amp=h*(.04+R()*.07),f1=1+R()*2.5,f2=3+R()*4,ph=R()*6;
    x.beginPath(); x.moveTo(0,h); for(let X=0;X<=w;X+=6){const t=X/w; x.lineTo(X,base-amp*Math.sin(t*Math.PI*f1+ph)-amp*.35*Math.sin(t*Math.PI*f2+ph*2));}
    x.lineTo(w,h); x.closePath(); x.fillStyle=cl; x.fill();});
  gr=x.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.78); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.26)'); x.fillStyle=gr; x.fillRect(0,0,w,h);
  x.font=`600 ${Math.round(Math.min(w,h)*.034)}px "Be Vietnam Pro",Arial,sans-serif`; x.fillStyle='rgba(255,255,255,.85)'; x.textAlign='right';
  x.fillText(`ẢNH MẪU ${String(i+1).padStart(2,'0')}`,w-Math.min(w,h)*.04,h-Math.min(w,h)*.04);
  return c;
}
async function loadSamples(){
  const ids=[];
  for(let i=0;i<16;i++){const c=drawSample(i),blob=await toBlob(c,.86),thumbBlob=await toBlob(scaled(c,360,c.width,c.height),.8),id=uid('p');
    PH[id]={id,name:`Ảnh mẫu ${String(i+1).padStart(2,'0')}.jpg`,w:c.width,h:c.height,url:URL.createObjectURL(blob),thumb:URL.createObjectURL(thumbBlob),file:blob,prevBlob:null,thumbBlob,sample:true}; ids.push(id);}
  if(S.lib.some(id=>!PH[id].sample)) return;     // người dùng đã thêm ảnh thật trong lúc chờ
  S.lib.push(...ids); autoFill(ids,false); render();
  for(const id of ids) await materialize(PH[id],false);   // lưu ngầm vào bộ nhớ đệm sau khi đã hiện
  persistNow();
}

/* ================= khởi động ================= */
function boot(){
  $$('[data-ico]').forEach(n=>{n.outerHTML=ico(n.dataset.ico);});
  initAlbum(); bindStage(); bindPanels(); bindControls(); render();
  let rt=0; new ResizeObserver(()=>{cancelAnimationFrame(rt); rt=requestAnimationFrame(()=>{if(V.zoom==='fit') renderStage(); else {updateOrigin(); drawRulers();} if(!$('#bookModal').hidden&&!B.anim) bookRender();});}).observe($('#vp'));
  window.addEventListener('resize',()=>{if(!$('#bookModal').hidden&&!B.anim) bookRender();});
  $('#book').addEventListener('click',e=>{const r=$('#book').getBoundingClientRect(); bookGo(e.clientX>r.left+r.width/2?1:-1);});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{renderStage(); renderStrip();});
  startup();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
