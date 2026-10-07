
/* ================= xuất file gửi nhà in ================= */
I.download='<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>';
const EX={fmt:'pdf',split:'spread',range:'all',dpi:300,bleed:true,marks:false,q:.95,busy:false,cancel:false,prog:0,msg:'',done:null,ok:true};
const SLUG=10;
const pad=(n,d)=>String(n).padStart(d,'0');
const fmtMB=b=>(b/1048576).toLocaleString('vi-VN',{maximumFractionDigits:1})+' MB';
let crcT=null;
function crc32(u8){ if(!crcT){crcT=new Uint32Array(256); for(let n=0;n<256;n++){let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; crcT[n]=c>>>0;}}
  let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=crcT[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0;}

function exportItems(){
  const all=S.spreads; let sps;
  if(EX.range==='cur') sps=[curSpread()]; else if(EX.range==='inner') sps=all.slice(1); else if(EX.range==='cover') sps=[all[0]]; else sps=all.slice();
  const d=Math.max(2,String((all.length-1)*2).length),items=[];
  for(const sp of sps){const i=all.indexOf(sp);
    if(sp.kind==='cover'){items.push({sp,rx:0,rw:spreadW(sp),name:'00_Bia',label:'Bìa'}); continue;}
    if(EX.split==='page') for(const sd of ['L','R']){const r=sideRect(sp,sd),n=sd==='L'?2*i-1:2*i; items.push({sp,rx:r.x,rw:r.w,name:`Trang-${pad(n,d)}`,label:`Trang ${n}`});}
    else items.push({sp,rx:0,rw:spreadW(sp),name:`${pad(i,2)}_Trang-${pad(2*i-1,d)}-${pad(2*i,d)}`,label:`Trang ${2*i-1}–${2*i}`});}
  return items;
}
const edgeOf=()=>(EX.bleed?S.A.bleed:0)+(EX.marks?SLUG:0);
const dimsOf=it=>{const k=EX.dpi/25.4,e=edgeOf(); return [Math.round((it.rw+2*e)*k),Math.round((S.A.h+2*e)*k)];};
function preflight(items){
  const sps=[...new Set(items.map(it=>it.sp))],empty=[],low=[],txt=[]; let samples=0;
  for(const sp of sps) for(const f of sp.frames){
    const where=f.side==='P'?'gáy bìa':pageName(sp,f.side);
    if(f.type==='photo'){const p=photoOf(f); if(!p){empty.push(where); continue;} if(p.sample) samples++; else {const d=dpiOf(f); if(d<150) low.push(`${where} (${d} dpi)`);}}
    else if(String(f.text).trim()&&f.side!=='P'){const sd=f.side==='S'?pageSideAt(sp,f.x+f.w/2):f.side; if(sd==='P') continue;
      const r=sideRect(sp,sd),m=S.A.safe; if(!f.rot&&(f.x<r.x+m-.05||f.x+f.w>r.x+r.w-m+.05||f.y<m-.05||f.y+f.h>r.h-m+.05)) txt.push(where);}}
  const u=a=>[...new Set(a)];
  return {empty:u(empty),emptyN:empty.length,low,samples,txt:u(txt)};
}
const FMT_HINT={
  pdf:'Một file nhiều trang, mỗi trang đúng khổ tờ, có khai báo vùng xén (TrimBox) và tràn lề (BleedBox). Hợp với đa số nhà in.',
  jpg:'Mỗi tờ một ảnh JPG đã ghi sẵn độ phân giải, gói chung trong một file ZIP. Nhẹ, các xưởng in album ảnh hay nhận.',
  png:'Không nén mất chi tiết nên nặng hơn JPG nhiều lần và xuất chậm hơn. Chỉ dùng khi nhà in yêu cầu.'
};
function renderExport(){
  const b=$('#exBody'); if(!b) return;
  if(EX.busy){b.innerHTML=`<div class="ex-prog"><div class="bar"><i style="width:${Math.round(EX.prog*100)}%"></i></div><p>${esc(EX.msg)}</p><button class="btn" data-act="exCancel">Dừng xuất</button></div>`; return;}
  const A=S.A,items=exportItems(),pf=preflight(items),cover=items.find(it=>it.sp.kind==='cover'),main=items.find(it=>it.sp.kind!=='cover')||items[0];
  const opt=(key,list)=>`<div class="seg">${list.map(([v,l])=>`<button class="${String(EX[key])===String(v)?'on':''}" data-act="exOpt" data-arg="${key}|${v}">${l}</button>`).join('')}</div>`;
  const tog=(key,label)=>`<button class="tgl${EX[key]?' on':''}" data-act="exOpt" data-arg="${key}|${EX[key]?0:1}" aria-pressed="${EX[key]}"><span></span>${label}</button>`;
  const nf=n=>n.toLocaleString('vi-VN'),k=EX.dpi/25.4,[w,h]=dimsOf(main),FMT=EX.fmt.toUpperCase();
  const what=EX.fmt==='pdf'?`1 file PDF, ${items.length} trang`:items.length===1?`1 file ${FMT}`:`${items.length} file ${FMT}, gói trong 1 file ZIP`;
  const list=(a,n=4)=>esc(a.slice(0,n).join(', '))+(a.length>n?` và ${a.length-n} chỗ khác`:'');
  const li=(c,t)=>`<li class="${c}">${t}</li>`;
  const checks=(pf.emptyN?li('warn',`<b>${pf.emptyN} khung ảnh còn trống</b> ở ${list(pf.empty)}. Khung trống sẽ in ra màu nền trang.`):li('ok','Mọi khung ảnh đều đã có ảnh.'))
    +(pf.low.length?li('warn',`<b>${pf.low.length} ảnh dưới 150 dpi</b>: ${list(pf.low)}. Ảnh có thể vỡ hạt khi in.`):li('ok','Không có ảnh nào dưới 150 dpi.'))
    +(pf.samples?li('warn',`<b>Album còn ${pf.samples} ảnh mẫu.</b> Hãy thay bằng ảnh của bạn trước khi gửi in.`):'')
    +(pf.txt.length?li('warn',`<b>Chữ nằm ngoài vùng an toàn</b> ở ${list(pf.txt)}. Chữ sát mép có thể bị xén mất.`):'')
    +li('info','File xuất ra ở hệ màu RGB (sRGB). Nhà in sẽ chuyển sang CMYK, nên nhờ họ in thử một tờ nếu cần màu thật chuẩn.');
  b.innerHTML=`<div class="ex-grid">
    <div class="ex-row"><span class="lbl">Định dạng</span>${opt('fmt',[['pdf','PDF'],['jpg','JPG'],['png','PNG']])}<p class="hint">${FMT_HINT[EX.fmt]}</p></div>
    <div class="ex-row"><span class="lbl">Phạm vi</span>${opt('range',[['all','Cả album'],['inner','Chỉ ruột'],['cover','Chỉ bìa'],['cur','Tờ đang mở']])}</div>
    <div class="ex-row"><span class="lbl">Cách tách</span>${opt('split',[['spread','Theo tờ trải đôi'],['page','Từng trang đơn']])}<p class="hint">Album ép gỗ, lay-flat thường in theo tờ trải đôi. Bìa luôn xuất nguyên tấm gồm bìa sau, gáy và bìa trước.</p></div>
    <div class="ex-row"><span class="lbl">Độ phân giải</span>${opt('dpi',[[300,'300 dpi · bản in'],[200,'200 dpi'],[150,'150 dpi · xem thử']])}</div>
    ${EX.fmt==='png'?'':`<div class="ex-row"><span class="lbl">Chất lượng nén</span>${opt('q',[[.98,'Tối đa'],[.95,'Cao'],[.88,'Gọn nhẹ']])}</div>`}
    <div class="ex-row"><span class="lbl">Tuỳ chọn in</span><div class="row">${tog('bleed',`Gồm tràn lề ${fmt1(A.bleed)} mm`)}${tog('marks','Dấu cắt (crop marks)')}</div></div>
  </div>
  <div class="ex-sum"><b>${what}</b><span class="mono">${nf(w)} × ${nf(h)} px mỗi ${EX.split==='page'&&main.sp.kind!=='cover'?'trang':'tờ'} · ${fmtcm(w/k)} × ${fmtcm(h/k)} cm</span>${cover&&cover!==main?`<span class="mono">Bìa: ${dimsOf(cover).map(nf).join(' × ')} px · gồm gáy ${fmt1(A.spine)} mm</span>`:''}</div>
  <div class="ex-check"><h4>Kiểm tra trước khi in</h4><ul>${checks}</ul></div>
  <div class="ex-foot"><span class="ex-done${EX.ok?'':' err'}" role="status">${EX.done?esc(EX.done):''}</span><div class="row"><button class="btn" data-act="exportClose">Đóng</button><button class="btn primary" data-act="exRun">${ico('download')}Xuất ${FMT}</button></div></div>`;
}
function openExport(){EX.done=null; $('#exportModal').hidden=false; ACT.closePanels(); renderExport(); setTimeout(()=>{const x=$('#exportModal [data-act="exRun"]'); if(x) x.focus();},30);}
function closeExport(){if(EX.busy) return; $('#exportModal').hidden=true;}

/* ---- dựng tờ ra canvas (đơn vị mm, k = px/mm) ---- */
const FULL=new Map();
async function fullImg(p){if(FULL.has(p.id)) return FULL.get(p.id).im;
  const src=p.file?URL.createObjectURL(p.file):p.url,im=await loadImg(src); try{await im.decode();}catch(e){}
  FULL.set(p.id,{im,src:p.file?src:null}); return im;}
function clearFull(){for(const v of FULL.values()) if(v.src) URL.revokeObjectURL(v.src); FULL.clear();}
function rr(x,X,Y,w,h,r){r=Math.max(0,Math.min(r||0,w/2,h/2)); x.beginPath(); if(!r){x.rect(X,Y,w,h); return;}
  x.moveTo(X+r,Y); x.arcTo(X+w,Y,X+w,Y+h,r); x.arcTo(X+w,Y+h,X,Y+h,r); x.arcTo(X,Y+h,X,Y,r); x.arcTo(X,Y,X+w,Y,r); x.closePath();}
function wrapLines(x,text,maxW){const out=[];
  for(const para of String(text).split('\n')){let line='';
    for(const wd of para.split(' ')){const t=line?line+' '+wd:wd;
      if(x.measureText(t).width<=maxW){line=t; continue;}
      if(line) out.push(line);
      if(x.measureText(wd).width<=maxW){line=wd; continue;}
      let part=''; for(const ch of wd){if(part&&x.measureText(part+ch).width>maxW){out.push(part); part=ch;} else part+=ch;} line=part;}
    out.push(line);}
  return out;}
async function drawTextC(x,f,w,h,k){
  const st=`${f.italic?'italic ':''}${f.bold?'700':'400'}`,px=f.size*PT*k;
  try{await document.fonts.load(`${st} 24px "${f.font}"`,f.text||'a');}catch(e){}
  x.save(); x.scale(1/k,1/k);
  let bw=w*k; if(f.vertical){x.rotate(Math.PI/2); bw=h*k;}
  x.font=`${st} ${px}px "${f.font}",${FB[f.font]||'serif'}`; x.fillStyle=f.color; x.textBaseline='middle';
  if('letterSpacing' in x) x.letterSpacing=((f.ls||0)*px).toFixed(2)+'px';
  x.textAlign=f.align==='left'?'left':f.align==='right'?'right':'center';
  const tx=f.align==='left'?-bw/2:f.align==='right'?bw/2:0,lines=wrapLines(x,f.text,bw),lh=px*1.25; let y=-(lines.length-1)*lh/2;
  for(const ln of lines){x.fillText(ln,tx,y); y+=lh;}
  x.restore();
}
async function drawFrameC(x,f,k){
  const p=photoOf(f);
  if(f.type==='photo'&&!p&&!(f.border>0)) return;
  if(f.type==='text'&&!String(f.text).trim()&&!(f.border>0)) return;
  const img=p?await fullImg(p):null;
  x.save(); x.translate(f.x+f.w/2,f.y+f.h/2); if(f.rot) x.rotate(f.rot*Math.PI/180);
  const w=f.w,h=f.h,bd=Math.min(f.border||0,w/2,h/2);
  if(f.shadow||bd>0){rr(x,-w/2,-h/2,w,h,f.radius);
    if(f.shadow){x.save(); x.shadowColor='rgba(0,0,0,0.28)'; x.shadowBlur=3*k; x.shadowOffsetY=.8*k; x.fillStyle=bd>0?f.borderColor:'#ffffff'; x.fill(); x.restore();}
    if(bd>0){x.fillStyle=f.borderColor; x.fill();}}
  const iw=w-2*bd,ih=h-2*bd; rr(x,-iw/2,-ih/2,iw,ih,Math.max(0,f.radius-bd)); x.clip();
  if(img){const q=cropGeom(f); x.translate(f.panX*q.fw,f.panY*q.fh); x.rotate(f.prot*Math.PI/180); if(f.flip) x.scale(-1,1);
    const dw=q.p.w*q.s,dh=q.p.h*q.s; x.drawImage(img,-dw/2,-dh/2,dw,dh);}
  else if(f.type==='text') await drawTextC(x,f,iw,ih,k);
  x.restore();
}
function drawMarks(x,it,eb,k){
  const A=S.A,Hh=A.h,x0=it.rx,x1=it.rx+it.rw,off=eb+2,len=6;
  x.save(); x.strokeStyle='#000000'; x.lineWidth=.1; x.beginPath();
  const seg=(a,b,c,d)=>{x.moveTo(a,b); x.lineTo(c,d);};
  for(const cx of [x0,x1]){seg(cx,-off,cx,-off-len); seg(cx,Hh+off,cx,Hh+off+len);}
  for(const cy of [0,Hh]){seg(x0-off,cy,x0-off-len,cy); seg(x1+off,cy,x1+off+len,cy);}
  x.stroke();
  const folds=(it.sp.kind==='cover'?[A.w,A.w+A.spine]:[A.w]).filter(v=>v>x0+.5&&v<x1-.5);
  if(folds.length){x.setLineDash([1,1]); x.beginPath(); for(const fx of folds){seg(fx,-off,fx,-off-len); seg(fx,Hh+off,fx,Hh+off+len);} x.stroke(); x.setLineDash([]);}
  x.scale(1/k,1/k); x.fillStyle='#000000'; x.font=`${2.2*k}px "Be Vietnam Pro",Arial,sans-serif`; x.textBaseline='middle'; x.textAlign='left';
  x.fillText(`${it.label} · khổ ${fmtcm(A.w)} × ${fmtcm(A.h)} cm · ${EX.dpi} dpi · tràn lề ${EX.bleed?fmt1(A.bleed):0} mm`,(x0+4)*k,(Hh+eb+SLUG/2)*k);
  x.restore();
}
async function drawRegion(cv,it){
  const A=S.A,sp=it.sp,k=EX.dpi/25.4,eb=EX.bleed?A.bleed:0,sl=EX.marks?SLUG:0,e=eb+sl,b=A.bleed;
  const W=Math.round((it.rw+2*e)*k),Hh=Math.round((A.h+2*e)*k);
  cv.width=W; cv.height=Hh; const x=cv.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
  x.setTransform(1,0,0,1,0,0); x.fillStyle='#ffffff'; x.fillRect(0,0,W,Hh);
  x.setTransform(k,0,0,k,(e-it.rx)*k,e*k);
  x.save(); x.beginPath(); x.rect(it.rx-eb,-eb,it.rw+2*eb,A.h+2*eb); x.clip();
  const s=spineOf(sp),Wp=A.w,bgs=s?[['L',-b,Wp+b],['P',Wp,s],['R',Wp+s,Wp+b]]:[['L',-b,Wp+b],['R',Wp,Wp+b]];
  for(const [sd,bx,bw] of bgs){x.fillStyle=sp.bg[sd]||'#ffffff'; x.fillRect(bx,-b,bw,A.h+2*b);}
  for(const f of [...sp.frames].sort((a,c)=>(a.side==='P')-(c.side==='P'))){
    if(!f.rot&&(f.x>it.rx+it.rw+eb||f.x+f.w<it.rx-eb)) continue;
    await drawFrameC(x,f,k);}
  x.restore();
  if(EX.marks) drawMarks(x,it,eb,k);
  return {w:W,h:Hh,mmW:it.rw+2*e,mmH:A.h+2*e,e,sl};
}

/* ---- đóng gói: ghi dpi, PDF, ZIP ---- */
async function tagDpi(blob,ext,dpi){
  const u=new Uint8Array(await blob.arrayBuffer());
  if(ext==='jpg'){ if(u[0]!==0xFF||u[1]!==0xD8) return blob;
    if(u[2]===0xFF&&u[3]===0xE0&&u[6]===0x4A&&u[7]===0x46&&u[8]===0x49&&u[9]===0x46){u[13]=1; u[14]=dpi>>8; u[15]=dpi&255; u[16]=dpi>>8; u[17]=dpi&255; return new Blob([u],{type:'image/jpeg'});}
    return new Blob([u.subarray(0,2),new Uint8Array([0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0]),u.subarray(2)],{type:'image/jpeg'});}
  if(u[12]!==0x49||u[13]!==0x48||u[14]!==0x44||u[15]!==0x52) return blob;
  const ppm=Math.round(dpi/0.0254),ch=new Uint8Array(21),dv=new DataView(ch.buffer);
  dv.setUint32(0,9); ch.set([0x70,0x48,0x59,0x73],4); dv.setUint32(8,ppm); dv.setUint32(12,ppm); ch[16]=1; dv.setUint32(17,crc32(ch.subarray(4,17)));
  return new Blob([u.subarray(0,33),ch,u.subarray(33)],{type:'image/png'});
}
function buildPDF(pages){
  const enc=new TextEncoder(),parts=[],offs=[]; let pos=0;
  const s=str=>{const b=enc.encode(str); parts.push(b); pos+=b.length;};
  const pt=mm=>(mm*72/25.4).toFixed(3),N=pages.length,d=new Date(),ts=`${d.getFullYear()}${pad(d.getMonth()+1,2)}${pad(d.getDate(),2)}${pad(d.getHours(),2)}${pad(d.getMinutes(),2)}${pad(d.getSeconds(),2)}`;
  parts.push(new Uint8Array([0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A,0x25,0xE2,0xE3,0xCF,0xD3,0x0A])); pos+=15;
  offs[1]=pos; s('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  offs[2]=pos; s(`2 0 obj\n<< /Type /Pages /Count ${N} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>\nendobj\n`);
  pages.forEach((pg,i)=>{const n=3+i*3,m=pg.meta,W=pt(m.mmW),H=pt(m.mmH),box=o=>`${pt(o)} ${pt(o)} ${pt(m.mmW-o)} ${pt(m.mmH-o)}`;
    offs[n]=pos; s(`${n} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /BleedBox [${box(m.sl)}] /TrimBox [${box(m.e)}] /Resources << /XObject << /Im${i} ${n+2} 0 R >> >> /Contents ${n+1} 0 R >>\nendobj\n`);
    const cs=`q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    offs[n+1]=pos; s(`${n+1} 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`);
    offs[n+2]=pos; s(`${n+2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${m.w} /Height ${m.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.blob.size} >>\nstream\n`);
    parts.push(pg.blob); pos+=pg.blob.size; s('\nendstream\nendobj\n');});
  const info=3+N*3; offs[info]=pos;
  s(`${info} 0 obj\n<< /Producer (Xuong Photobook) /Title (Album ${String(S.A.w/10)}x${String(S.A.h/10)} cm) /CreationDate (D:${ts}) >>\nendobj\n`);
  const xref=pos,total=info+1; let t=`xref\n0 ${total}\n0000000000 65535 f \n`;
  for(let n=1;n<total;n++) t+=pad(offs[n],10)+' 00000 n \n';
  s(t+`trailer\n<< /Size ${total} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}
async function buildZip(files){
  const parts=[],cen=[],enc=new TextEncoder(),d=new Date(); let off=0;
  const tm=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dt=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const f of files){
    if(f.crc==null) f.crc=crc32(new Uint8Array(await f.blob.arrayBuffer())); const crc=f.crc,nm=enc.encode(f.name),sz=f.blob.size;
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(10,tm,true); h.setUint16(12,dt,true);
    h.setUint32(14,crc,true); h.setUint32(18,sz,true); h.setUint32(22,sz,true); h.setUint16(26,nm.length,true);
    parts.push(h.buffer,nm,f.blob);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(12,tm,true); c.setUint16(14,dt,true);
    c.setUint32(16,crc,true); c.setUint32(20,sz,true); c.setUint32(24,sz,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    cen.push(c.buffer,nm); off+=30+nm.length+sz;}
  const cs=cen.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cs,true); e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:'application/zip'});
}
async function saveFile(blob,name){
  let dl=null; try{if(window.claude&&typeof window.claude.use==='function') dl=await window.claude.use('downloads');}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob}); return {ok:true};}
    catch(e){const c=e&&e.code;
      if(c==='declined') return {ok:false,msg:'Bạn đã không lưu file. Bấm Xuất lần nữa khi cần.'};
      if(c==='rate_limited') return {ok:false,msg:'Đang có một hộp thoại lưu file mở. Đóng nó rồi bấm Xuất lại.'};
      if(c==='too_large') return {ok:false,msg:'File quá lớn để lưu ở đây. Hãy giảm độ phân giải hoặc xuất riêng phần ruột và bìa.'};
      if(c==='extension_not_enabled'||c==='rejected_extension') return {ok:false,msg:'Trình xem này không cho lưu định dạng này. Hãy chọn định dạng khác.'};}}
  let framed=false; try{framed=window.top!==window.self;}catch(e){framed=true;}
  if(framed&&window.claude) return {ok:false,msg:'Trình xem này không cho tải file. Hãy mở bản file HTML trên máy để xuất.'};
  const a=document.createElement('a'),u=URL.createObjectURL(blob); a.href=u; a.download=name; a.rel='noopener'; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),180000); return {ok:true};
}
async function runExport(){
  if(EX.busy) return; const items=exportItems(); if(!items.length) return;
  if(Math.max(...items.map(it=>{const [w,h]=dimsOf(it); return w*h;}))>220e6){EX.ok=false; EX.done='Tờ quá lớn để dựng trong trình duyệt ở độ phân giải này. Hãy chọn 200 hoặc 150 dpi.'; renderExport(); return;}
  const isPdf=EX.fmt==='pdf',ext=EX.fmt==='png'?'png':'jpg',type=ext==='png'?'image/png':'image/jpeg',outs=[],cv=document.createElement('canvas');
  const base=`Album_${S.A.w/10}x${S.A.h/10}cm_${EX.dpi}dpi`;
  EX.busy=true; EX.cancel=false; EX.done=null;
  try{
    for(let i=0;i<items.length;i++){const it=items[i];
      EX.prog=i/items.length; EX.msg=`Đang dựng ${it.label} (${i+1}/${items.length})…`; renderExport(); await new Promise(r=>setTimeout(r,30));
      if(EX.cancel) break;
      const meta=await drawRegion(cv,it);
      let blob=await new Promise(r=>cv.toBlob(r,type,ext==='png'?undefined:EX.q));
      clearFull();
      if(!blob) throw new Error('trình duyệt không dựng được ảnh lớn như vậy, hãy giảm độ phân giải');
      if(!isPdf) blob=await tagDpi(blob,ext,EX.dpi);
      outs.push({name:`${it.name}.${ext}`,blob,meta});}
    cv.width=cv.height=1;
    if(EX.cancel){EX.busy=false; EX.ok=false; EX.done='Đã dừng xuất, chưa có file nào được lưu.'; renderExport(); return;}
    EX.prog=1; EX.msg=isPdf?'Đang ghép file PDF…':outs.length>1?'Đang gói file ZIP…':'Đang hoàn tất…'; renderExport(); await new Promise(r=>setTimeout(r,30));
    let file,fname;
    if(isPdf){file=buildPDF(outs); fname=`${base}.pdf`;}
    else if(outs.length===1){file=outs[0].blob; fname=`${base}_${outs[0].name}`;}
    else {file=await buildZip(outs); fname=`${base}_${ext.toUpperCase()}.zip`;}
    EX.busy=false; EX.msg='Đang chờ lưu file…'; renderExport();
    const r=await saveFile(file,fname);
    EX.ok=r.ok; EX.done=r.ok?`Đã xuất ${fname} (${fmtMB(file.size)}).`:r.msg;
  }catch(err){EX.busy=false; clearFull(); EX.ok=false; EX.done='Xuất file không thành công: '+((err&&err.message)||err)+'.';}
  EX.busy=false; renderExport();
}
Object.assign(ACT,{
  exportOpen(){openExport();}, exportClose(){closeExport();},
  exOpt(a){const [k,v]=a.split('|'); EX[k]=k==='fmt'||k==='split'||k==='range'?v:(k==='bleed'||k==='marks')?v==='1':+v; EX.done=null; renderExport();},
  exRun(){runExport();}, exCancel(){EX.cancel=true; EX.msg='Đang dừng sau tờ hiện tại…'; renderExport();}
});
window.addEventListener('keydown',e=>{const m=$('#exportModal'); if(!m||m.hidden) return;
  if(e.key==='Escape'){e.preventDefault(); closeExport();}
  e.stopPropagation();},true);
$('#exportModal').addEventListener('click',e=>{if(e.target.id==='exportModal') closeExport();});
