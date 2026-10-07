(()=>{
'use strict';
/* ================= tiện ích ================= */
const MM=96/25.4, PT=0.3528;               // px trên 1 mm ở 100%; mm trên 1 pt
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const el=(t,c)=>{const d=document.createElement(t); if(c) d.className=c; return d;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let _n=0; const uid=p=>(p||'f')+(++_n).toString(36)+Math.random().toString(36).slice(2,6);
const fmt1=v=>(Math.round(v*10)/10).toLocaleString('vi-VN',{maximumFractionDigits:1});
const fmtcm=mm=>fmt1(mm/10);
const r2=v=>Math.round(v*100)/100;

const I={
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 10v11"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  book:'<path d="M2 5.5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v13c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6.5v13"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  chevL:'<path d="m15 18-6-6 6-6"/>', chevR:'<path d="m9 18 6-6-6-6"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  alignL:'<path d="M4 3v18"/><rect x="8" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="7" height="4" rx="1"/>',
  alignCH:'<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>',
  alignR:'<path d="M20 3v18"/><rect x="4" y="6" width="12" height="4" rx="1"/><rect x="9" y="14" width="7" height="4" rx="1"/>',
  alignT:'<path d="M3 4h18"/><rect x="6" y="8" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="7" rx="1"/>',
  alignCV:'<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>',
  alignB:'<path d="M3 20h18"/><rect x="6" y="4" width="4" height="12" rx="1"/><rect x="14" y="9" width="4" height="7" rx="1"/>',
  rotL:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', rotR:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  flipH:'<path d="M12 3v18"/><path d="M8 7 3 12l5 5zM16 7l5 5-5 5z"/>',
  move:'<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  text:'<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  wand:'<path d="M4 20 15 9M15 9l2-2 1 1-2 2zM18 3v3M16.5 4.5h3M20 11v3M18.5 12.5h3M10 3v2M9 4h2"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  front:'<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  back:'<rect x="4" y="4" width="12" height="12" rx="1"/><path d="M20 8v11a1 1 0 0 1-1 1H8"/>'
};
const ico=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]||''}</svg>`;

/* ================= thư viện bố cục ================= */
const g=(c,r,x0=0,y0=0,w=1,h=1)=>{const a=[];for(let j=0;j<r;j++)for(let i=0;i<c;i++)a.push([x0+i*w/c,y0+j*h/r,w/c,h/r]);return a;};
const TX={
  title:{text:'Album Kỷ Niệm',font:'Playfair Display',size:40,align:'center',color:'#1f1d1a'},
  script:{text:'Ngày chung đôi',font:'Great Vibes',size:46,align:'center',color:'#1f1d1a'},
  body:{text:'Viết vài dòng kể lại khoảnh khắc này: ai đã ở đó, trời hôm ấy thế nào, điều gì khiến bạn nhớ mãi.',font:'Cormorant Garamond',size:13,align:'left',color:'#33302b'},
  caption:{text:'Chú thích ảnh',font:'Montserrat',size:9,align:'center',color:'#6b675f',ls:.06},
  date:{text:'07 · 10 · 2026',font:'Montserrat',size:11,align:'center',color:'#55524c',ls:.25},
  quote:{text:'“Mỗi bức ảnh là một lần ta được sống lại khoảnh khắc ấy.”',font:'Cormorant Garamond',size:20,align:'center',italic:true,color:'#33302b'}
};
const T=(x,y,w,h,role,o)=>({t:'text',r:[x,y,w,h],role,...TX[role],...o});
const POL={border:3.5,borderColor:'#ffffff',shadow:true};
const P=(x,y,w,h,o)=>({r:[x,y,w,h],...POL,...o});
const LAYOUT_DEF=[
 ['full','1','Tràn viền',{bleed:1},[[0,0,1,1]]],
 ['single','1','1 ảnh có lề',{},[[0,0,1,1]]],
 ['single-center','1','Ảnh giữa, nhiều khoảng trắng',{},[[.14,.14,.72,.72]]],
 ['single-land','1','Ảnh ngang giữa trang',{},[[0,.2,1,.6]]],
 ['single-port','1','Ảnh dọc giữa trang',{},[[.18,0,.64,1]]],
 ['2-col','2','2 ảnh dọc song song',{},g(2,1)],
 ['2-row','2','2 ảnh ngang xếp chồng',{},g(1,2)],
 ['2-big-left','2','1 lớn + 1 nhỏ',{},[[0,0,.64,1],[.64,0,.36,1]]],
 ['2-big-top','2','Ảnh lớn trên + dải dưới',{},[[0,0,1,.64],[0,.64,1,.36]]],
 ['2-stagger','2','So le chéo',{},[[0,0,.62,.48],[.38,.52,.62,.48]]],
 ['2-full','2','2 ảnh tràn viền',{bleed:1},g(2,1)],
 ['3-left-big','3','1 lớn trái + 2 nhỏ',{},[[0,0,.62,1],[.62,0,.38,.5],[.62,.5,.38,.5]]],
 ['3-right-big','3','2 nhỏ + 1 lớn phải',{},[[0,0,.38,.5],[0,.5,.38,.5],[.38,0,.62,1]]],
 ['3-top-big','3','1 lớn trên + 2 dưới',{},[[0,0,1,.6],[0,.6,.5,.4],[.5,.6,.5,.4]]],
 ['3-bottom-big','3','2 trên + 1 lớn dưới',{},[[0,0,.5,.4],[.5,0,.5,.4],[0,.4,1,.6]]],
 ['3-cols','3','3 cột dọc',{},g(3,1)],
 ['3-rows','3','3 dải ngang',{},g(1,3)],
 ['4-grid','4','Lưới 2×2',{},g(2,2)],
 ['4-top-big','4','1 lớn + 3 nhỏ dưới',{},[[0,0,1,.62],...g(3,1,0,.62,1,.38)]],
 ['4-left-big','4','1 lớn + 3 nhỏ phải',{},[[0,0,2/3,1],...g(1,3,2/3,0,1/3,1)]],
 ['4-cols','4','4 cột dọc',{},g(4,1)],
 ['4-mosaic','4','Mosaic 4 ảnh',{},[[0,0,.6,.55],[.6,0,.4,.55],[0,.55,.4,.45],[.4,.55,.6,.45]]],
 ['4-full','4','Lưới 2×2 tràn viền',{bleed:1},g(2,2)],
 ['5-hero','5','1 lớn + dải 4 ảnh',{},[[0,0,1,.58],...g(4,1,0,.58,1,.42)]],
 ['5-mosaic','5','Mosaic 5 ảnh',{},[[0,0,.5,.6],[.5,0,.5,.3],[.5,.3,.5,.3],[0,.6,.5,.4],[.5,.6,.5,.4]]],
 ['6-2x3','5','Lưới 2×3',{},g(2,3)],
 ['6-3x2','5','Lưới 3×2',{},g(3,2)],
 ['6-big','5','1 lớn + 5 nhỏ',{},[[0,0,2/3,2/3],[2/3,0,1/3,1/3],[2/3,1/3,1/3,1/3],...g(3,1,0,2/3,1,1/3)]],
 ['8-mosaic','collage','Mosaic 8 ảnh',{},[[0,0,.5,.5],[.5,0,.25,.25],[.75,0,.25,.25],[.5,.25,.5,.25],[0,.5,.25,.5],[.25,.5,.25,.25],[.25,.75,.25,.25],[.5,.5,.5,.5]]],
 ['9-grid','collage','Lưới 3×3',{},g(3,3)],
 ['12-grid','collage','Lưới 12 ảnh',{},g(3,4)],
 ['polaroid-3','collage','Polaroid 3 ảnh',{gap:0},[P(.03,.05,.52,.5,{rot:-5}),P(.45,.16,.52,.5,{rot:4}),P(.14,.5,.52,.46,{rot:-1.5})]],
 ['polaroid-4','collage','Polaroid 4 ảnh',{gap:0},[P(.02,.03,.47,.45,{rot:-4}),P(.51,.02,.47,.45,{rot:3}),P(.03,.52,.47,.45,{rot:2.5}),P(.5,.53,.47,.44,{rot:-3})]],
 ['caption','text','Ảnh + chú thích',{},[[0,0,1,.86],T(0,.9,1,.08,'caption')]],
 ['mag-left','text','Tạp chí: ảnh + bài viết',{},[[0,0,.58,1],T(.64,.06,.36,.18,'title',{align:'left',size:28}),T(.64,.3,.36,.62,'body')]],
 ['mag-top','text','Tạp chí: ảnh trên, chữ dưới',{},[[0,0,1,.62],T(0,.67,1,.1,'title',{size:26}),T(.08,.8,.84,.2,'body',{align:'center'})]],
 ['quote','text','Ảnh + câu trích dẫn',{},[[0,0,1,.7],T(.06,.76,.88,.2,'quote')]],
 ['text-only','text','Trang chữ (lời dẫn)',{},[T(.05,.3,.9,.16,'script'),T(.12,.5,.76,.24,'body',{align:'center'})]],
 ['blank','text','Trang trống',{},[]],
 ['sp-full','spread','Panorama tràn 2 trang',{scope:'S',bleed:1},[[0,0,1,1]]],
 ['sp-full-m','spread','Panorama có lề',{scope:'S'},[[0,0,1,1]]],
 ['sp-band','spread','Dải panorama giữa',{scope:'S'},[[0,.2,1,.6]]],
 ['sp-big3','spread','Ảnh lớn vắt gáy + 2',{scope:'S'},[[0,0,2/3,1],[2/3,0,1/3,.5],[2/3,.5,1/3,.5]]],
 ['sp-left-grid','spread','1 trang lớn + lưới 4',{scope:'S'},[[0,0,.5,1],...g(2,2,.5,0,.5,1)]],
 ['sp-strip','spread','Panorama + dải 4 ảnh',{scope:'S'},[[0,0,1,.58],...g(4,1,0,.58,1,.42)]],
 ['sp-8','spread','Lưới 8 ảnh trải đôi',{scope:'S'},g(4,2)],
 ['sp-mosaic','spread','Mosaic trải đôi',{scope:'S'},[[0,0,.5,.62],[0,.62,.25,.38],[.25,.62,.25,.38],[.5,0,.25,.38],[.75,0,.25,.38],[.5,.38,.5,.62]]],
 ['cv-photo-title','cover','Ảnh + tên album',{cover:1},[[0,0,1,.74],T(0,.79,1,.1,'title'),T(0,.9,1,.06,'date')]],
 ['cv-full-title','cover','Ảnh tràn + tên trên ảnh',{cover:1,bleed:1},[[0,0,1,1],T(.08,.74,.84,.12,'title',{color:'#ffffff'}),T(.08,.86,.84,.05,'date',{color:'#ffffff'})]],
 ['cv-frame','cover','Ảnh lồng khung + chữ ký',{cover:1},[[.1,.06,.8,.62],T(.04,.72,.92,.13,'script'),T(.04,.87,.92,.06,'date')]],
 ['cv-text','cover','Bìa chữ (in nhũ, ép kim)',{cover:1},[T(.05,.36,.9,.16,'title'),T(.05,.54,.9,.06,'date')]],
 ['cv-back','cover','Bìa sau: ảnh nhỏ + lời nhắn',{cover:1},[[.3,.22,.4,.36],T(.1,.64,.8,.16,'body',{align:'center',size:12})]],
 ['cv-wrap','cover','Ảnh bọc toàn bìa',{cover:1,scope:'S',bleed:1},[[0,0,1,1]]]
];
const LAYOUTS=LAYOUT_DEF.map(([id,cat,name,o,fr])=>({id,cat,name,scope:o.scope||'page',bleed:!!o.bleed,gap:o.gap!==0,cover:!!o.cover,frames:fr.map(f=>Array.isArray(f)?{r:f}:f)}));
const LBY=Object.fromEntries(LAYOUTS.map(d=>[d.id,d]));
const CATS=[['all','Tất cả'],['1','1 ảnh'],['2','2 ảnh'],['3','3 ảnh'],['4','4 ảnh'],['5','5–6 ảnh'],['collage','Collage'],['spread','Trải đôi'],['text','Có chữ'],['cover','Bìa']];
const PRESETS=[[200,200,'Vuông nhỏ'],[250,250,'Vuông vừa'],[300,300,'Phổ biến nhất'],[350,350,'Vuông lớn'],[300,200,'Ngang'],[350,250,'Ngang lớn'],[200,300,'Dọc'],[250,350,'Dọc lớn'],[297,210,'A4 ngang'],[210,297,'A4 dọc']];
const SWATCH=['#ffffff','#f6f1e9','#ece6dc','#e8e4ef','#dfe8e3','#1e1e1e','#2c3440','#6e2b36'];
const FONTS=['Playfair Display','Cormorant Garamond','Great Vibes','Dancing Script','Montserrat','Be Vietnam Pro'];
const FB={'Playfair Display':'Georgia,serif','Cormorant Garamond':'Georgia,serif','Great Vibes':'cursive','Dancing Script':'cursive','Montserrat':'Arial,sans-serif','Be Vietnam Pro':'Arial,sans-serif'};
const PLAN=[['text-only','full'],['S','sp-full'],['2-row','3-left-big'],['full','2-row'],['4-grid','single-center'],['S','sp-big3'],['polaroid-3','quote'],['6-2x3','full'],['S','sp-8'],['mag-left','single']];
const CYCLE=[['full','2-row'],['4-grid','single'],['S','sp-big3'],['3-left-big','2-col'],['6-2x3','full'],['S','sp-full'],['2-big-top','4-mosaic']];
const ZS=[.1,.15,.2,.25,.33,.5,.67,.75,1,1.25,1.5,2,3,4];
const HANDLES=['nw','n','ne','e','se','s','sw','w'];
const ANCH={tl:'Trên trái',t:'Trên giữa',tr:'Trên phải',l:'Giữa trái',c:'Chính giữa',r:'Giữa phải',bl:'Dưới trái',b:'Dưới giữa',br:'Dưới phải'};

/* ================= trạng thái ================= */
const PH={};                               // kho ảnh: id -> {id,name,w,h,url,thumb,sample}
const S={A:{w:300,h:300,spine:12,bleed:3,safe:6,margin:12,gap:5},lib:[],spreads:[],guides:[],cur:1,sel:null};
const V={zoom:'fit',bleed:true,safe:true,fold:true,grid:false,guides:true,preview:false,tab:'photos',cat:'all',target:'L',filter:'all',
  sc:1,origin:{x:0,y:0},sheetPos:{left:0,top:0},mouse:null,alignRef:'page',last:{},editing:null,pickTarget:null};
const H={undo:[],redo:[],pending:null};

/* ================= hình học (đơn vị mm, gốc = góc trên trái mép xén của tờ) ================= */
const spineOf=(sp,A=S.A)=>sp.kind==='cover'?A.spine:0;
const spreadW=(sp,A=S.A)=>2*A.w+spineOf(sp,A);
function sideRect(sp,side,A=S.A){const s=spineOf(sp,A);
  if(side==='L') return {x:0,y:0,w:A.w,h:A.h};
  if(side==='R') return {x:A.w+s,y:0,w:A.w,h:A.h};
  if(side==='P') return {x:A.w,y:0,w:s,h:A.h};
  return {x:0,y:0,w:2*A.w+s,h:A.h};}
function contentBox(sp,side,bleed){const r=sideRect(sp,side);
  if(!bleed){const m=sp.margin; return {x:r.x+m,y:r.y+m,w:r.w-2*m,h:r.h-2*m,ext:{l:0,r:0,t:0,b:0}};}
  const b=S.A.bleed; return {x:r.x,y:r.y,w:r.w,h:r.h,ext:{l:side==='R'?0:b,r:side==='L'?0:b,t:b,b:b}};}
function rectsFor(d,box,gap){const E=1e-6;
  return d.frames.map(spec=>{const [fx,fy,fw,fh]=spec.r;
    let x0=box.x+fx*box.w,y0=box.y+fy*box.h,x1=box.x+(fx+fw)*box.w,y1=box.y+(fy+fh)*box.h;
    if(d.gap){const h2=gap/2; if(fx>E)x0+=h2; if(fx+fw<1-E)x1-=h2; if(fy>E)y0+=h2; if(fy+fh<1-E)y1-=h2;}
    if(fx<E)x0-=box.ext.l; if(fx+fw>1-E)x1+=box.ext.r; if(fy<E)y0-=box.ext.t; if(fy+fh>1-E)y1+=box.ext.b;
    return {spec,x:x0,y:y0,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};});}
function pageSideAt(sp,x){const W=S.A.w,s=spineOf(sp); if(x<W) return 'L'; if(x>W+s) return 'R'; return 'P';}
const curSpread=()=>S.spreads[S.cur];
function pageName(sp,side){
  if(sp.kind==='cover') return {L:'Bìa sau',R:'Bìa trước',P:'Gáy',S:'Toàn bộ bìa'}[side];
  const i=S.spreads.indexOf(sp);
  return side==='L'?`Trang ${2*i-1}`:side==='R'?`Trang ${2*i}`:`Trang ${2*i-1}–${2*i}`;}

/* ================= mô hình ================= */
function mkPhoto(o){return Object.assign({id:uid(),type:'photo',side:'L',x:0,y:0,w:10,h:10,rot:0,border:0,borderColor:'#ffffff',radius:0,shadow:false,photo:null,zoom:1,panX:0,panY:0,prot:0,flip:false,fit:'fill'},o);}
function mkText(o){return Object.assign({id:uid(),type:'text',side:'L',x:0,y:0,w:10,h:10,rot:0,border:0,borderColor:'#ffffff',radius:0,shadow:false,text:'',font:'Be Vietnam Pro',size:12,color:'#222222',align:'center',bold:false,italic:false,vertical:false,ls:0},o);}
function newSpread(kind='inner'){const c=kind==='cover'?'#ece6dc':'#ffffff';
  return {id:uid('s'),kind,margin:S.A.margin,gap:S.A.gap,bg:{L:c,R:c,P:c},layout:{L:null,R:null,S:null},dirty:{L:false,R:false,S:false},frames:[]};}
const RANK={L:0,S:1,R:2,P:3};
const sortFrames=fs=>fs.map((f,i)=>[f,i]).sort((a,b)=>RANK[a[0].side]-RANK[b[0].side]||a[1]-b[1]).map(a=>a[0]);
const photoOf=f=>(f&&f.type==='photo'&&f.photo&&PH[f.photo])||null;
function setPhoto(f,id){Object.assign(f,{photo:id,zoom:1,panX:0,panY:0,prot:0,flip:false,fit:'fill'});}

function applyLayout(sp,id,target){
  const d=LBY[id]; if(!d) return; const scope=d.scope==='S'?'S':target;
  const kill=scope==='S'?['L','R','S']:[scope,'S'];
  const old=sortFrames(sp.frames.filter(f=>kill.includes(f.side)));
  const photos=old.filter(f=>photoOf(f)).map(f=>f.photo);
  const texts={}; old.filter(f=>f.type==='text'&&f.edited).forEach(f=>{(texts[f.role||'x']=texts[f.role||'x']||[]).push(f.text);});
  sp.frames=sp.frames.filter(f=>!kill.includes(f.side));
  if(scope==='S'){sp.layout.L=sp.layout.R=null; sp.layout.S=id; sp.dirty.L=sp.dirty.R=false;}
  else{ if(sp.layout.S){sp.layout.S=null; const o=scope==='L'?'R':'L'; if(!sp.frames.some(f=>f.side===o)) sp.layout[o]='blank';} sp.layout[scope]=id; }
  sp.dirty[scope]=false;
  const k=clamp(S.A.w/300,.55,1.6);
  rectsFor(d,contentBox(sp,scope,d.bleed),sp.gap).forEach((r,i)=>{const s=r.spec;
    const base={side:scope,ti:i,x:r.x,y:r.y,w:r.w,h:r.h,rot:s.rot||0,border:s.border||0,borderColor:s.borderColor||'#ffffff',shadow:!!s.shadow,radius:s.radius||0};
    if(s.t==='text'){const kept=texts[s.role]&&texts[s.role].shift();
      sp.frames.push(mkText({...base,role:s.role,text:kept??s.text,edited:kept!=null,font:s.font,size:r2(s.size*k),color:s.color,align:s.align,italic:!!s.italic,bold:!!s.bold,ls:s.ls||0}));}
    else sp.frames.push(mkPhoto({...base,photo:photos.shift()||null}));});
}
function applyPlan(sp,p){ if(p[0]==='S') applyLayout(sp,p[1],'S'); else {applyLayout(sp,p[0],'L'); applyLayout(sp,p[1],'R');} }
function fitSpine(sp){ if(sp.kind!=='cover') return; for(const f of sp.frames) if(f.side==='P'){f.x=S.A.w; f.w=Math.max(1,S.A.spine); f.y=S.A.h*.1; f.h=S.A.h*.8;} }
function relayout(sp){
  for(const sc of ['L','R','S']){const id=sp.layout[sc]; if(!id||sp.dirty[sc]) continue; const d=LBY[id];
    const rs=rectsFor(d,contentBox(sp,sc,d.bleed),sp.gap);
    for(const f of sp.frames) if(f.side===sc&&f.ti!=null&&rs[f.ti]){const r=rs[f.ti]; f.x=r.x;f.y=r.y;f.w=r.w;f.h=r.h; clampPan(f);}}
  fitSpine(sp);
}
function setAlbum(patch){
  const old={...S.A}; Object.assign(S.A,patch);
  for(const sp of S.spreads){
    for(const f of sp.frames){
      if(f.side==='P') continue;
      if(sp.dirty[f.side]||f.ti==null||!sp.layout[f.side]){
        const ro=sideRect(sp,f.side,old),rn=sideRect(sp,f.side,S.A);
        f.x=rn.x+(f.x-ro.x)*rn.w/ro.w; f.y=rn.y+(f.y-ro.y)*rn.h/ro.h; f.w*=rn.w/ro.w; f.h*=rn.h/ro.h; clampPan(f);}
      if(f.type==='text'&&old.w!==S.A.w) f.size=r2(f.size*S.A.w/old.w);
    }
    relayout(sp);
  }
  S.guides=S.guides.filter(gd=>gd.v>-50&&gd.v<(gd.a==='h'?S.A.h:2*S.A.w+S.A.spine)+50);
}
function cropGeom(f){const p=photoOf(f); if(!p) return null;
  const fw=Math.max(.5,f.w-2*f.border),fh=Math.max(.5,f.h-2*f.border),rt=(f.prot/90)%2!==0;
  const bw=rt?p.h:p.w,bh=rt?p.w:p.h,base=f.fit==='fit'?Math.min(fw/bw,fh/bh):Math.max(fw/bw,fh/bh),s=base*f.zoom;
  return {p,fw,fh,s,bbW:bw*s,bbH:bh*s};}
function clampPan(f){const q=cropGeom(f); if(!q) return; const mx=Math.abs(q.bbW-q.fw)/2/q.fw,my=Math.abs(q.bbH-q.fh)/2/q.fh;
  f.panX=clamp(f.panX,-mx,mx); f.panY=clamp(f.panY,-my,my);}
const dpiOf=f=>{const q=cropGeom(f); return q?Math.round(25.4/q.s):0;};
function reside(sp,f,old){ if(f.side==='L'||f.side==='R'){const ns=pageSideAt(sp,f.x+f.w/2); if(ns!=='P') f.side=ns;}
  if(old in sp.dirty) sp.dirty[old]=true; if(f.side in sp.dirty) sp.dirty[f.side]=true; }
function usageMap(){const u={}; for(const sp of S.spreads) for(const f of sp.frames) if(photoOf(f)) u[f.photo]=(u[f.photo]||0)+1; return u;}
function findFrame(id){for(const sp of S.spreads){const f=sp.frames.find(x=>x.id===id); if(f) return f;} return null;}
const selFrame=()=>S.sel&&S.sel.kind==='frame'?curSpread().frames.find(f=>f.id===S.sel.id)||null:null;
function autoFill(ids,addSpreads){
  const q=ids.slice(); let n=0;
  const fill=sp=>{for(const f of sortFrames(sp.frames)) if(f.type==='photo'&&!photoOf(f)&&q.length){setPhoto(f,q.shift()); n++;}};
  S.spreads.forEach(fill);
  let k=0; while(addSpreads&&q.length&&S.spreads.length<101){const sp=newSpread(); applyPlan(sp,CYCLE[k++%CYCLE.length]); S.spreads.push(sp); fill(sp);}
  return n;
}
function removeSamples(){const ids=new Set(S.lib.filter(id=>PH[id].sample)); S.lib=S.lib.filter(id=>!ids.has(id));
  for(const sp of S.spreads) for(const f of sp.frames) if(ids.has(f.photo)) f.photo=null;}
function spineFrame(){return mkText({side:'P',role:'spine',text:'ALBUM KỶ NIỆM · 2026',font:'Montserrat',size:8,color:'#3a3630',vertical:true,ls:.25});}
function initAlbum(){
  const cover=newSpread('cover'); applyLayout(cover,'cv-back','L'); applyLayout(cover,'cv-frame','R'); cover.frames.push(spineFrame()); fitSpine(cover);
  S.spreads=[cover];
  for(const p of PLAN){const sp=newSpread(); applyPlan(sp,p); S.spreads.push(sp);}
  S.cur=4;
}

/* ================= lịch sử (hoàn tác) ================= */
const snapState=()=>JSON.stringify({A:S.A,spreads:S.spreads,guides:S.guides,lib:S.lib,cur:S.cur});
function restore(s){const o=JSON.parse(s); S.A=o.A; S.spreads=o.spreads; S.guides=o.guides; S.lib=o.lib; S.cur=clamp(o.cur,0,S.spreads.length-1); S.sel=null;}
function beginEdit(){ if(!H.pending) H.pending=snapState(); }
function commit(){ if(H.pending){ if(H.pending!==snapState()){H.undo.push(H.pending); if(H.undo.length>100) H.undo.shift(); H.redo=[];} H.pending=null; } render(); }
function act(fn){ beginEdit(); fn(); commit(); }
function undo(){ if(H.pending) commit(); const s=H.undo.pop(); if(!s) return; H.redo.push(snapState()); restore(s); render(); }
function redo(){ const s=H.redo.pop(); if(!s) return; H.undo.push(snapState()); restore(s); render(); }
