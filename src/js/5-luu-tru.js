
/* ================= lưu trữ: bộ nhớ đệm (IndexedDB) + file album .pbook ================= */
I.folder='<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
I.chev='<path d="m6 9 6 6 6-6"/>';
const PB_VERSION=($('meta[name="pb-version"]')||{}).content||'dev';
const DESK=window.PB_DESKTOP||null;                  // launcher .exe chèn vào khi phục vụ trang
const FILE={handle:null,name:null,savedHash:null,dirty:true,autoAt:null,busy:false,restoring:false,quotaWarned:false};
const IDB={db:null};
const hashStr=s=>{let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return h>>>0;};
const contentHash=()=>hashStr(JSON.stringify({A:S.A,spreads:S.spreads,guides:S.guides,lib:S.lib}));
const albumTitle=()=>FILE.name?FILE.name.replace(/\.pbook(\.zip)?$|\.zip$/i,''):'Album chưa đặt tên';
const hhmm=d=>d?d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'';
const toBlob=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q));

function idbOpen(){return new Promise(res=>{try{const r=indexedDB.open('xuong-photobook',1);
  r.onupgradeneeded=()=>{const d=r.result; if(!d.objectStoreNames.contains('photos')) d.createObjectStore('photos',{keyPath:'id'}); if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');};
  r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); r.onblocked=()=>res(null);}catch(e){res(null);}});}
function idb(store,mode,fn){return new Promise((res,rej)=>{if(!IDB.db) return res(undefined); let out;
  try{const tx=IDB.db.transaction(store,mode),r=fn(tx.objectStore(store)); if(r) r.onsuccess=()=>{out=r.result;};
    tx.oncomplete=()=>res(out); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error);}catch(e){rej(e);}});}
const kvGet=k=>idb('kv','readonly',s=>s.get(k)).catch(()=>undefined);
const kvSet=(k,v)=>idb('kv','readwrite',s=>s.put(v,k)).catch(()=>{});
const rec=p=>({id:p.id,name:p.name,w:p.w,h:p.h,sample:!!p.sample,blob:p.file,prev:p.prevBlob||null,thumb:p.thumbBlob});
function quotaWarn(){ if(FILE.quotaWarned) return; FILE.quotaWarned=true; toast('Bộ nhớ đệm của trình duyệt đã đầy nên ảnh mới không được tự lưu. Hãy lưu album ra file .pbook để giữ ảnh.',{ms:9000}); }

/* Chép ảnh vào bộ nhớ đệm rồi trỏ sang bản trong đó, để album không còn phụ thuộc file gốc trên ổ đĩa. */
async function materialize(p,mustCopy){
  if(IDB.db){ try{ await idb('photos','readwrite',s=>s.put(rec(p))); const r=await idb('photos','readonly',s=>s.get(p.id));
      // Trỏ cả ảnh gốc lẫn ảnh xem trước sang bản nằm trên đĩa (IndexedDB) để 1000 ảnh không chiếm RAM.
      // URL cũ thu hồi trễ: trang có thể vẫn đang tải ảnh từ URL đó.
      if(r&&r.blob){const old=p.url; p.file=r.blob; if(r.prev) p.prevBlob=r.prev; p.url=URL.createObjectURL(r.prev||r.blob); setTimeout(()=>URL.revokeObjectURL(old),60000);} return; }
    catch(e){quotaWarn();} }
  if(mustCopy) try{p.file=new Blob([await p.file.arrayBuffer()],{type:p.file.type}); if(!p.prevBlob){URL.revokeObjectURL(p.url); p.url=URL.createObjectURL(p.file);}}catch(e){}
}
async function photoFromBlob(id,m,blob,prevBlob,thumbBlob){
  let w=m.w,h=m.h;
  if(!thumbBlob){const src=URL.createObjectURL(blob);
    try{const im=await loadImg(src); w=im.naturalWidth||w; h=im.naturalHeight||h;
      prevBlob=Math.max(w,h)>2400?await toBlob(scaled(im,2400,w,h),.9):null; thumbBlob=await toBlob(scaled(im,360,w,h),.82);}
    finally{URL.revokeObjectURL(src);}}
  PH[id]={id,name:m.name||'anh.jpg',w,h,sample:!!m.sample,crc:m.crc??null,file:blob,prevBlob,thumbBlob,url:URL.createObjectURL(prevBlob||blob),thumb:URL.createObjectURL(thumbBlob)};
  return PH[id];
}
function referencedIds(spreads,lib){const s=new Set(lib); for(const sp of spreads) for(const f of sp.frames) if(f.photo) s.add(f.photo); return s;}
async function gcPhotos(){ if(!IDB.db) return; const keep=referencedIds(S.spreads,S.lib);
  const keys=await idb('photos','readonly',s=>s.getAllKeys()).catch(()=>[]);
  const drop=(keys||[]).filter(k=>!keep.has(k)); if(drop.length) await idb('photos','readwrite',s=>{drop.forEach(k=>s.delete(k));}).catch(()=>{}); }
async function saveCrcs(){const m={}; for(const id of S.lib) if(PH[id]&&PH[id].crc!=null) m[id]=PH[id].crc; await kvSet('crc',m);}

/* ---- tự lưu tạm ---- */
let _pt=0;
function persistSoon(){ updateDirty(); if(!IDB.db||FILE.restoring) return; clearTimeout(_pt); _pt=setTimeout(persistNow,700); }
async function persistNow(){ if(!IDB.db||FILE.restoring) return; clearTimeout(_pt);
  await kvSet('current',{v:1,snap:snapState(),fileName:FILE.name,savedHash:FILE.savedHash,at:Date.now()});
  FILE.autoAt=new Date(); renderFileChip(); }
function updateDirty(){ FILE.dirty=contentHash()!==FILE.savedHash; renderFileChip(); }
async function restoreSession(){
  const st=await kvGet('current'); if(!st||!st.snap) return false;
  const o=JSON.parse(st.snap); if(!o||!Array.isArray(o.spreads)||!o.spreads.length) return false;
  const recs=await idb('photos','readonly',s=>s.getAll()).catch(()=>[]),byId={}; (recs||[]).forEach(r=>{byId[r.id]=r;});
  const crc=(await kvGet('crc'))||{};
  for(const id of referencedIds(o.spreads,o.lib||[])){const r=byId[id]; if(r&&r.blob&&r.thumb) await photoFromBlob(id,{...r,crc:crc[id]},r.blob,r.prev,r.thumb);}
  S.A=o.A; S.spreads=o.spreads; S.guides=o.guides||[]; S.lib=(o.lib||[]).filter(id=>PH[id]); S.cur=clamp(o.cur||1,0,S.spreads.length-1); S.sel=null;
  FILE.name=st.fileName||null; FILE.savedHash=st.savedHash??null; FILE.autoAt=st.at?new Date(st.at):null;
  return true;
}

/* ---- hộp xác nhận trong trang (trình xem artifact chặn confirm()) ---- */
function confirmDlg(title,text,okLabel){return new Promise(res=>{
  const m=$('#confirmModal'); $('#cfTitle').textContent=title; $('#cfText').textContent=text; $('#cfOk').textContent=okLabel; m.hidden=false; $('#cfOk').focus();
  const done=v=>{m.hidden=true; $('#cfOk').onclick=$('#cfCancel').onclick=null; m.onkeydown=null; res(v);};
  $('#cfOk').onclick=()=>done(true); $('#cfCancel').onclick=()=>done(false);
  m.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault(); done(false);}};});}
const hasUnsaved=()=>FILE.dirty&&(H.undo.length>0||S.lib.some(id=>PH[id]&&!PH[id].sample));

/* ---- file album .pbook (ZIP: project.json + ảnh gốc) ---- */
async function projectBlob(){
  const photos={},files=[];
  for(const id of referencedIds(S.spreads,S.lib)){const p=PH[id]; if(!p) continue;
    const blob=p.file||await (await fetch(p.url)).blob(),ext=((p.name.match(/\.(jpe?g|png|webp|gif|bmp|avif)$/i)||[0,'jpg'])[1]).toLowerCase(),path=`photos/${id}.${ext}`;
    photos[id]={name:p.name,w:p.w,h:p.h,sample:!!p.sample,type:blob.type||'',path}; files.push({name:path,blob,crc:p.crc??null,pid:id});}
  const proj={app:'xuong-photobook',format:1,version:PB_VERSION,savedAt:new Date().toISOString(),A:S.A,spreads:S.spreads,guides:S.guides,lib:S.lib,cur:S.cur,photos};
  const z=await buildZip([{name:'project.json',blob:new Blob([JSON.stringify(proj)],{type:'application/json'})},...files]);
  for(const f of files) if(PH[f.pid]) PH[f.pid].crc=f.crc;
  saveCrcs(); return z;
}
const pbookName=()=>`${albumTitle()==='Album chưa đặt tên'?`Album_${S.A.w/10}x${S.A.h/10}cm_${new Date().toISOString().slice(0,10)}`:albumTitle()}.pbook`;
async function writeHandle(h,blob){const w=await h.createWritable(); await w.write(blob); await w.close();}
async function saveProject(saveAs){
  if(FILE.busy) return; if(document.activeElement&&document.activeElement!==document.body) document.activeElement.blur();
  let handle=saveAs?null:FILE.handle,mode='download';
  try{
    if(handle){ if(handle.queryPermission&&(await handle.queryPermission({mode:'readwrite'}))!=='granted'&&(await handle.requestPermission({mode:'readwrite'}))!=='granted') handle=null; else mode='handle'; }
    if(!handle&&window.showSaveFilePicker){ try{handle=await window.showSaveFilePicker({suggestedName:pbookName(),types:[{description:'Album Xưởng Photobook',accept:{'application/octet-stream':['.pbook']}}]}); mode='handle';}
      catch(e){ if(e&&e.name==='AbortError') return; handle=null; } }
  }catch(e){handle=null; mode='download';}
  FILE.busy=true; const t=toast('Đang lưu album…',{sticky:true});
  try{
    const blob=await projectBlob(); let name;
    if(mode==='handle'&&handle){await writeHandle(handle,blob); FILE.handle=handle; name=handle.name; kvSet('handle',handle);}
    else{ const inViewer=!!window.claude; name=inViewer?pbookName()+'.zip':pbookName(); const r=await saveFile(blob,name); if(!r.ok){t.close(); FILE.busy=false; toast(r.msg,{ms:7000}); return;} }
    FILE.name=name; FILE.savedHash=contentHash(); t.close(); updateDirty(); persistNow();
    toast(`Đã lưu ${name} (${fmtMB(blob.size)}).${mode==='handle'?' Lần sau bấm Ctrl+S sẽ ghi đè đúng file này.':''}`,{ms:6000});
  }catch(e){t.close(); toast('Không lưu được album: '+((e&&e.message)||e)+'.',{ms:8000});}
  FILE.busy=false;
}
async function readZip(file){
  const tl=Math.min(file.size,65557),tail=new Uint8Array(await file.slice(file.size-tl).arrayBuffer()); let eo=-1;
  for(let i=tail.length-22;i>=0;i--) if(tail[i]===0x50&&tail[i+1]===0x4b&&tail[i+2]===5&&tail[i+3]===6){eo=i; break;}
  if(eo<0) throw new Error('đây không phải file album .pbook');
  const dv=new DataView(tail.buffer),cnt=dv.getUint16(eo+10,true),cdSize=dv.getUint32(eo+12,true),cdOff=dv.getUint32(eo+16,true);
  const cb=await file.slice(cdOff,cdOff+cdSize).arrayBuffer(),cd=new DataView(cb),dec=new TextDecoder(),out={}; let p=0;
  for(let i=0;i<cnt&&p+46<=cb.byteLength;i++){ if(cd.getUint32(p,true)!==0x02014b50) break;
    const method=cd.getUint16(p+10,true),csz=cd.getUint32(p+20,true),nl=cd.getUint16(p+28,true),xl=cd.getUint16(p+30,true),cl=cd.getUint16(p+32,true),lo=cd.getUint32(p+42,true);
    const name=dec.decode(new Uint8Array(cb,p+46,nl)),lh=new DataView(await file.slice(lo,lo+30).arrayBuffer()),ds=lo+30+lh.getUint16(26,true)+lh.getUint16(28,true);
    let blob=file.slice(ds,ds+csz);
    if(method===8) blob=await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
    else if(method!==0) throw new Error('file nén theo kiểu không hỗ trợ');
    out[name]=blob; p+=46+nl+xl+cl;}
  return out;
}
async function openProject(file,handle){
  if(hasUnsaved()&&!(await confirmDlg('Mở album khác?','Album đang làm có thay đổi chưa lưu ra file. Mở album khác sẽ thay thế nó, kể cả bản tự lưu tạm.','Mở album'))) return;
  const t=toast('Đang mở album…',{sticky:true});
  try{
    const ent=await readZip(file); if(!ent['project.json']) throw new Error('trong file không có project.json');
    const pj=JSON.parse(await ent['project.json'].text());
    if(pj.app!=='xuong-photobook'||!Array.isArray(pj.spreads)) throw new Error('file này không phải album của Xưởng Photobook');
    const ids=Object.keys(pj.photos||{}); let done=0,next=0,miss=0;
    const work=async()=>{while(next<ids.length){const id=ids[next++],m=pj.photos[id],b=ent[m.path];
      if(!b){miss++; continue;}
      try{const p=await photoFromBlob(id,m,new Blob([b],{type:m.type||'image/jpeg'}),null,null); await materialize(p,true);}catch(e){miss++;}
      t.set(`Đang mở album… ${++done}/${ids.length} ảnh`);}};
    await Promise.all([work(),work(),work()]);
    S.A=pj.A; S.spreads=pj.spreads; S.guides=pj.guides||[]; S.lib=(pj.lib||[]).filter(id=>PH[id]); S.cur=clamp(pj.cur||1,0,S.spreads.length-1);
    S.sel=null; H.undo=[]; H.redo=[]; H.pending=null; V.zoom='fit';
    FILE.handle=handle||null; FILE.name=file.name; FILE.savedHash=contentHash(); kvSet('handle',FILE.handle);
    t.close(); render(); await persistNow(); gcPhotos();
    toast(`Đã mở ${file.name}: ${S.lib.length} ảnh, ${S.spreads.length-1} tờ.${miss?` ${miss} ảnh trong file bị hỏng nên bỏ qua.`:''}`,{ms:6000});
  }catch(e){t.close(); toast('Không mở được file: '+((e&&e.message)||e)+'.',{ms:8000});}
}
async function pickOpen(){
  if(window.showOpenFilePicker){ try{const [h]=await window.showOpenFilePicker({types:[{description:'Album Xưởng Photobook',accept:{'application/octet-stream':['.pbook','.zip']}}]}); return openProject(await h.getFile(),h);}
    catch(e){ if(e&&e.name==='AbortError') return; } }
  const inp=$('#fileOpen'); inp.value=''; inp.click();
}
async function newAlbum(){
  if(hasUnsaved()&&!(await confirmDlg('Tạo album mới?','Album đang làm có thay đổi chưa lưu ra file. Tạo album mới thì phần chưa lưu sẽ mất.','Tạo album mới'))) return;
  S.lib=[]; S.guides=[]; S.sel=null; initAlbum(); S.cur=1; H.undo=[]; H.redo=[]; H.pending=null; V.zoom='fit';
  FILE.handle=null; FILE.name=null; FILE.savedHash=null; kvSet('handle',null);
  render(); await persistNow(); gcPhotos(); toast('Đã tạo album mới. Bấm “Thêm ảnh” để bắt đầu.');
}

/* ---- thanh trạng thái file + menu Tệp ---- */
function renderFileChip(){
  const c=$('#fileChip'); if(!c) return;
  let cls='',txt;
  if(!FILE.name) {cls='warn'; txt=IDB.db?`Chưa lưu ra file${FILE.autoAt?` · tự lưu tạm ${hhmm(FILE.autoAt)}`:''}`:'Chưa lưu ra file · tải lại trang sẽ mất';}
  else if(FILE.dirty){cls='warn'; txt=`${albumTitle()} · có thay đổi chưa lưu`;}
  else {cls='ok'; txt=`${albumTitle()} · đã lưu`;}
  c.className='fchip '+cls; c.querySelector('span').textContent=txt; c.title=FILE.name?`File: ${FILE.name} — bấm để lưu (Ctrl+S)`:'Bấm để lưu album ra file .pbook (Ctrl+S)';
  document.title=`${FILE.dirty?'• ':''}${albumTitle()} – Xưởng Photobook`;
}
async function renderFileMenu(){
  const m=$('#fileMenu'); let usage='';
  try{ if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate(); usage=fmtMB(e.usage||0);} }catch(e){}
  const UPD={off:'đã tắt tự cập nhật',checking:'đang kiểm tra bản mới trên GitHub…',offline:'không có mạng, bỏ qua kiểm tra cập nhật',latest:'đang dùng bản mới nhất trên GitHub',ready:'đã tải bản mới, bấm “Cập nhật ngay” trong thông báo',error:'tải bản mới bị lỗi, lần mở sau sẽ thử lại'};
  const where=DESK?`Bản máy tính · ${UPD[UPDS.state]||UPD.off}`:window.claude?'Bản xem trên claude.ai':'Bản web';
  const it=(act,label,key)=>`<button role="menuitem" data-act="${act}"><span>${label}</span>${key?`<kbd>${key}</kbd>`:''}</button>`;
  m.innerHTML=it('newAlbum','Album mới')+it('openAlbum','Mở album…','Ctrl+O')+it('saveAlbum','Lưu','Ctrl+S')+it('saveAlbumAs','Lưu thành…','Ctrl+Shift+S')+'<hr>'+it('exportOpen','Xuất file in…','Ctrl+E')+'<hr>'
    +`<div class="minfo"><b>${esc(FILE.name||'Album chưa lưu ra file')}</b><span>${IDB.db?`Tự lưu tạm vào máy${FILE.autoAt?` lúc ${hhmm(FILE.autoAt)}`:''}${usage?` · bộ nhớ đệm ${usage}`:''}`:'Trình duyệt này không cho tự lưu, hãy lưu ra file'}</span><span>${where} · phiên bản ${esc(PB_VERSION)}</span></div>`;
}
function toggleMenu(open){const m=$('#fileMenu'),b=$('#bFile'); open=open??m.hidden; if(open) renderFileMenu(); m.hidden=!open; b.setAttribute('aria-expanded',String(open));}

Object.assign(ACT,{
  fileMenu(){toggleMenu();},
  newAlbum(){toggleMenu(false); newAlbum();},
  openAlbum(){toggleMenu(false); pickOpen();},
  saveAlbum(){toggleMenu(false); saveProject(false);},
  saveAlbumAs(){toggleMenu(false); saveProject(true);}
});
const _exportOpen=ACT.exportOpen; ACT.exportOpen=()=>{toggleMenu(false); _exportOpen();};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-wrap')&&!$('#fileMenu').hidden) toggleMenu(false);});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('#fileMenu').hidden){toggleMenu(false); return;}
  if(!(e.ctrlKey||e.metaKey)) return; const k=e.key.toLowerCase(); if(k!=='s'&&k!=='o'&&k!=='e') return;
  e.preventDefault(); e.stopPropagation();
  if(!$('#exportModal').hidden||!$('#confirmModal').hidden||!$('#bookModal').hidden) return;
  if(k==='s') saveProject(e.shiftKey); else if(k==='o') pickOpen(); else openExport();
},true);
$('#fileOpen').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0]; if(f) openProject(f,null);});
// Thả file .pbook vào cửa sổ là mở album; chặn trước các vùng thả ảnh.
window.addEventListener('drop',e=>{const fs=[...((e.dataTransfer&&e.dataTransfer.files)||[])],pb=fs.find(f=>/\.pbook$|\.zip$/i.test(f.name));
  if(!pb) return; e.preventDefault(); e.stopPropagation(); $$('.over').forEach(x=>x.classList.remove('over')); openProject(pb,null);},true);
window.addEventListener('beforeunload',e=>{ if(!IDB.db&&hasUnsaved()){e.preventDefault(); e.returnValue='';} else if(IDB.db) persistNow(); });

async function startup(){
  IDB.db=await idbOpen(); renderFileChip();
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  let restored=false;
  if(IDB.db){FILE.restoring=true; try{restored=await restoreSession();}catch(e){restored=false;} FILE.restoring=false;}
  if(restored){ const h=await kvGet('handle'); if(h&&FILE.name&&h.name===FILE.name) FILE.handle=h;
    render(); gcPhotos(); toast(`Đã mở lại album đang làm${FILE.autoAt?` (tự lưu lúc ${hhmm(FILE.autoAt)})`:''}.`);}
  else await loadSamples();
  updateDirty();
  if(DESK){const beat=()=>fetch('/__pb_alive',{method:'POST',cache:'no-store'}).catch(()=>{}); beat(); setInterval(beat,15000); document.addEventListener('visibilitychange',()=>{if(!document.hidden) beat();});
    if(DESK.updated) toast(`Đã cập nhật từ GitHub lên phiên bản ${PB_VERSION}.`,{ms:6000});
    if(UPDS.state==='checking') pollUpdate();}
}
/* Bản mới tải ngầm (mạng chậm lúc mở app): hỏi launcher đến khi xong rồi mời cập nhật. */
const UPDS={state:(DESK&&DESK.update)||'off'};
let _pu=0;
async function pollUpdate(){
  try{const r=await (await fetch('/__pb_update',{cache:'no-store'})).json(); UPDS.state=r.state;
    if(r.state==='ready'&&r.version>PB_VERSION){
      toast(`Đã tải xong phiên bản mới ${r.version} từ GitHub.`,{sticky:true,action:'Cập nhật ngay',onAction:async()=>{await persistNow(); location.reload();}});
      return;}
    if(r.state!=='checking') return;}
  catch(e){}
  if(++_pu<40) setTimeout(pollUpdate,3000);
}
