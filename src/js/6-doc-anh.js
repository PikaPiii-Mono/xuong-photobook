
/* ================= đọc ảnh ngoài khả năng của trình duyệt: HEIC/HEIF, TIFF, RAW máy ảnh ================= */
// Edge/Chrome không tự giải mã HEIC (iPhone) và TIFF. Các bộ giải mã nằm trong vendor/ (kèm sẵn trong .exe,
// chạy offline); thiếu thì lấy từ CDN. Tất cả chạy trong một Web Worker để giao diện không bị đứng,
// và chỉ được tải khi gặp đúng loại file. Kết quả là một JPEG chất lượng 95% ở độ phân giải gốc.
const RAW_EXT=['dng','cr2','cr3','nef','nrw','arw','srf','sr2','raf','orf','rw2','pef','srw'];
const IMG_EXT_RE=new RegExp('\\.(jpe?g|jpe|jfif|png|webp|gif|bmp|avif|heic|heif|hif|tiff?|'+RAW_EXT.join('|')+')$','i');
const VENDOR={
  heif:['libheif-bundle.js','https://cdn.jsdelivr.net/npm/libheif-js@1.23.5/libheif-wasm/libheif-bundle.js'],
  pako:['pako_inflate.min.js','https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako_inflate.min.js'],
  utif:['UTIF.js','https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js']
};
const vendorUrls=k=>{const [file,cdn]=VENDOR[k],out=[]; try{ if(/^https?:$/.test(location.protocol)) out.push(new URL('vendor/'+file,location.href).href); }catch(e){} out.push(cdn); return out;};

async function sniffKind(file){
  const b=new Uint8Array(await file.slice(0,64).arrayBuffer()),s=(o,n)=>String.fromCharCode(...b.subarray(o,o+n));
  const ext=((file.name||'').match(/\.([a-z0-9]+)$/i)||[0,''])[1].toLowerCase();
  if(RAW_EXT.includes(ext)) return 'raw';
  if(s(4,4)==='ftyp'){ const size=((b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3])>>>0,brands=[s(8,4)];
    for(let o=16;o+4<=Math.min(size,64);o+=4) brands.push(s(o,4));
    if(brands.includes('crx ')) return 'raw';
    if(brands.some(x=>x==='avif'||x==='avis')) return 'native';
    if(brands.some(x=>['heic','heix','hevc','hevx','heim','heis','mif1','msf1'].includes(x))) return 'heic'; }
  if(s(0,4)==='II*\0'||s(0,4)==='MM\0*') return 'tiff';
  if(ext==='heic'||ext==='heif'||ext==='hif') return 'heic';
  if(ext==='tif'||ext==='tiff') return 'tiff';
  return 'native';
}

/* Mã chạy trong Worker. Viết thành chuỗi để cả bản .exe lẫn bản web dùng chung một file HTML. */
const CONV_WORKER=`
const loaded={};
function need(k,urls){ if(loaded[k]) return; let err;
  for(const u of urls){ try{ importScripts(u); loaded[k]=true; return; }catch(e){ err=e; } }
  throw new Error('chưa tải được bộ giải mã '+k+' (bản này chưa kèm sẵn và máy đang không có mạng)'); }
let heif=null;
async function heifMod(urls){ if(heif) return heif; need('heif',urls); let m=self.libheif();
  if(m&&typeof m.then==='function') m=await m; if(m&&m.ready&&typeof m.ready.then==='function') await m.ready; return heif=m; }
function r16(u,o,le){return le?u[o]|u[o+1]<<8:u[o]<<8|u[o+1];}
function r32(u,o,le){return (le?(u[o]|u[o+1]<<8|u[o+2]<<16|u[o+3]<<24):(u[o]<<24|u[o+1]<<16|u[o+2]<<8|u[o+3]))>>>0;}
function tiffOrient(u,off){ if(off+8>u.length) return 1; const le=u[off]===0x49; if(r16(u,off+2,le)!==42) return 1;
  const ifd=off+r32(u,off+4,le); if(ifd+2>u.length) return 1; const n=r16(u,ifd,le);
  for(let i=0;i<n&&ifd+2+i*12+12<=u.length;i++){const e=ifd+2+i*12; if(r16(u,e,le)===0x0112) return r16(u,e+8,le)||1;} return 1; }
function jpegOrient(u,s){ let p=s+2; while(p+4<u.length&&u[p]===0xFF){ const m=u[p+1],len=u[p+2]<<8|u[p+3];
    if(m===0xE1&&u[p+4]===0x45&&u[p+5]===0x78&&u[p+6]===0x69&&u[p+7]===0x66) return tiffOrient(u,p+10);
    if(m===0xDA) break; p+=2+len; } return 0; }
function jpegEnd(u,s){ let p=s+2; while(p+3<u.length){ if(u[p]!==0xFF) return -1; const m=u[p+1];
    if(m===0xFF){p++; continue;} if(m===0xD9) return p+2; if((m>=0xD0&&m<=0xD7)||m===0x01){p+=2; continue;}
    const len=u[p+2]<<8|u[p+3]; p+=2+len;
    if(m===0xDA){ while(p+1<u.length&&!(u[p]===0xFF&&u[p+1]!==0&&!(u[p+1]>=0xD0&&u[p+1]<=0xD7))) p++; } }
  return -1; }
function largestJpeg(u){ let best=null;
  for(let i=0;i+3<u.length;i++) if(u[i]===0xFF&&u[i+1]===0xD8&&u[i+2]===0xFF){ const e=jpegEnd(u,i);
    if(e>0){ if(!best||e-i>best.e-best.s) best={s:i,e}; i=e-1; } }
  return best; }
async function encode(src,w,h,orient){ const rot=orient===6||orient===8,W=rot?h:w,H=rot?w:h,c=new OffscreenCanvas(W,H),x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,W,H);
  if(orient===6){x.translate(W,0); x.rotate(Math.PI/2);} else if(orient===8){x.translate(0,H); x.rotate(-Math.PI/2);} else if(orient===3){x.translate(W,H); x.rotate(Math.PI);}
  x.drawImage(src,0,0,w,h); return {blob:await c.convertToBlob({type:'image/jpeg',quality:.95}),w:W,h:H}; }
self.onmessage=async e=>{ const {id,kind,buf,libs}=e.data;
  try{ let out;
    if(kind==='heic'){ const m=await heifMod(libs.heif),imgs=new m.HeifDecoder().decode(new Uint8Array(buf));
      if(!imgs||!imgs.length) throw new Error('trong file không có ảnh');
      const img=imgs.find(i=>i.is_primary&&i.is_primary())||imgs[0],w=img.get_width(),h=img.get_height();
      const d=await new Promise((res,rej)=>img.display({data:new Uint8ClampedArray(w*h*4),width:w,height:h},r=>r?res(r):rej(new Error('giải mã HEIC lỗi'))));
      const bmp=await createImageBitmap(new ImageData(d.data,w,h)); out=await encode(bmp,w,h,1); bmp.close();
      for(const i of imgs) if(i.free) try{i.free();}catch(_){} }
    else if(kind==='tiff'){ need('pako',libs.pako); need('utif',libs.utif);
      const ifds=UTIF.decode(buf); let best=null,area=0;
      for(const f of ifds){ const a=(f.t256?f.t256[0]:0)*(f.t257?f.t257[0]:0); if(a>area){area=a; best=f;} }
      if(!best) throw new Error('TIFF không có ảnh'); UTIF.decodeImage(buf,best,ifds);
      const w=best.width,h=best.height,rgba=new Uint8ClampedArray(UTIF.toRGBA8(best).buffer);
      const bmp=await createImageBitmap(new ImageData(rgba,w,h)); out=await encode(bmp,w,h,tiffOrient(new Uint8Array(buf),0)); bmp.close(); }
    else { const u=new Uint8Array(buf),j=largestJpeg(u);
      if(!j||j.e-j.s<60000) throw new Error('file RAW này không có ảnh xem trước đủ lớn');
      const jp=u.slice(j.s,j.e),inner=jpegOrient(jp,0),blob=new Blob([jp],{type:'image/jpeg'});
      const orient=inner?1:((u[0]===0x49&&u[1]===0x49)||(u[0]===0x4D&&u[1]===0x4D)?tiffOrient(u,0):1);
      const bmp=await createImageBitmap(blob);
      out=orient===1?{blob,w:bmp.width,h:bmp.height}:await encode(bmp,bmp.width,bmp.height,orient); bmp.close(); }
    self.postMessage({id,blob:out.blob,w:out.w,h:out.h});
  }catch(err){ self.postMessage({id,error:String((err&&err.message)||err)}); } };`;
const CONV={w:null,seq:0,wait:new Map()};
function convWorker(){
  if(CONV.w) return CONV.w;
  CONV.w=new Worker(URL.createObjectURL(new Blob([CONV_WORKER],{type:'text/javascript'})));
  CONV.w.onmessage=e=>{const p=CONV.wait.get(e.data.id); if(!p) return; CONV.wait.delete(e.data.id); e.data.error?p.rej(new Error(e.data.error)):p.res(e.data);};
  CONV.w.onerror=e=>{for(const p of CONV.wait.values()) p.rej(new Error('bộ giải mã bị lỗi')); CONV.wait.clear(); CONV.w.terminate(); CONV.w=null;};
  return CONV.w;
}
/* Trả về JPEG đã chuyển đổi, hoặc chính file nếu trình duyệt tự đọc được. */
async function decodeAny(file){
  const kind=await sniffKind(file);
  if(kind==='native') return {blob:file,kind};
  const buf=await file.arrayBuffer(),id=++CONV.seq,libs={heif:vendorUrls('heif'),pako:vendorUrls('pako'),utif:vendorUrls('utif')};
  const r=await new Promise((res,rej)=>{CONV.wait.set(id,{res,rej}); convWorker().postMessage({id,kind,buf,libs},[buf]);});
  return {blob:r.blob,kind};
}
