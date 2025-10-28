// ======================================================
// p5.js "pipeline" — SVG robusto (fetch→Blob→ObjectURL + drawImage)
// Producción ABS (herbertspencer.net) + fallback local /cc/svg/ para dev
// ======================================================

const P5_REGISTRY = new Map();

function mountP5In(sectionEl){
  if(!sectionEl) return;
  sectionEl.querySelectorAll('.p5-host').forEach(host=>{
    if(P5_REGISTRY.has(host)) return;
    const type=(host.dataset.sketch||'').toLowerCase();
    if(type!=='pipeline') return;
    const inst=new p5(pipelineFactory(host), host);
    P5_REGISTRY.set(host, inst);
  });
}
function unmountP5In(sectionEl){
  if(!sectionEl) return;
  sectionEl.querySelectorAll('.p5-host').forEach(host=>{
    const inst=P5_REGISTRY.get(host);
    if(inst?.remove) inst.remove();
    P5_REGISTRY.delete(host);
    host.innerHTML='';
  });
}

// Reveal hooks
if(typeof window!=='undefined'){
  const R=window.Reveal;
  const cur=()=> (R?.getCurrentSlide? R.getCurrentSlide() : null);
  if(R?.on){
    R.on('ready',e=>{ document.querySelectorAll('.reveal .slides section').forEach(unmountP5In); mountP5In(e.currentSlide||cur()); });
    R.on('slidechanged',e=>{ unmountP5In(e.previousSlide); mountP5In(e.currentSlide); });
    R.on('overviewhidden',()=>{ document.querySelectorAll('.reveal .slides section').forEach(unmountP5In); mountP5In(cur()); });
  }else{
    document.addEventListener('DOMContentLoaded',()=>{
      const present=document.querySelector('.reveal .slides section.present');
      if(present){ document.querySelectorAll('.reveal .slides section').forEach(unmountP5In); mountP5In(present); }
    });
  }
}

// ---------- Cargar SVG → HTMLImageElement mediante Blob/ObjectURL ----------
async function loadSVGAsHTMLImage(primaryUrl, fallbackUrl, label){
  const bust = (u)=> u + (u.includes('?')?'&':'?') + 'cb=' + Date.now();

  async function fetchToImg(url){
    const res = await fetch(bust(url), { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const svgText = await res.text();

    // (Opcional) saneos seguros si tus SVG enlazan recursos externos:
    //  - Elimina <image href="http..."> externos
    //  - Garantiza viewBox/width/height
    // Aquí sólo convertimos a Blob:
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const objUrl = URL.createObjectURL(blob);

    const img = await new Promise((resolve, reject)=>{
      const im = new Image();
      im.decoding = 'async';
      im.onload = ()=> resolve(im);
      im.onerror = reject;
      im.src = objUrl;
    });

    return { img, objUrl };
  }

  // Intento primario
  try{
    const {img, objUrl} = await fetchToImg(primaryUrl);
    console.log(`[pipeline] ✔ ${label} primary loaded`, primaryUrl, img.naturalWidth, 'x', img.naturalHeight);
    return { img, used: primaryUrl, objUrl };
  }catch(e){
    console.warn(`[pipeline] ✖ ${label} primary failed → fallback`, primaryUrl, e);
    // Fallback local
    try{
      const {img, objUrl} = await fetchToImg(fallbackUrl);
      console.log(`[pipeline] ✔ ${label} fallback loaded`, fallbackUrl, img.naturalWidth, 'x', img.naturalHeight);
      return { img, used: fallbackUrl, objUrl };
    }catch(e2){
      console.error(`[pipeline] ✖ ${label} fallback failed`, fallbackUrl, e2);
      return { img: null, used: fallbackUrl, objUrl: null };
    }
  }
}

// ======================================================
// Sketch
// ======================================================
function pipelineFactory(parentEl){
  return function(p){
    // URLs ABS (prod) + fallback local (dev)
    const ABS_UTTER = 'https://herbertspencer.net/cc/svg/utterance.svg';
    const ABS_PICTO = 'https://herbertspencer.net/cc/svg/pictogram-g.svg';
    const LOC_UTTER = '/cc/svg/utterance.svg';
    const LOC_PICTO = '/cc/svg/pictogram-g.svg';

    // Estado
    let columns=[];
    let svgUtter=null, svgPicto=null;       // HTMLImageElement (desde blob:)
    let urlU='(none)', urlP='(none)';       // info
    let urlUObj=null, urlPObj=null;         // blob: objectURL para revocar

    // Visual
    const columnHeight=300, labelSize=14, labelFont='Lexend', labelMaxW=100, labelMarginNormal=8, labelMarginImage=-80;
    const COLORS={
      "Tokenization":{r:65,g:47,b:166},
      "NLU":{r:161,g:76,b:87},
      "NSM":{r:236,g:98,b:27},
      "Blending":{r:112,g:40,b:11},
      "Styler":{r:44,g:9,b:2}
    };
    const COLDEF=[
      {label:"Utterance",type:"image"},
      {label:"Tokenization",type:"normal"},
      {label:"NLU",type:"normal"},
      {label:"NSM",type:"normal"},
      {label:"Blending",type:"normal"},
      {label:"Styler",type:"normal"},
      {label:"SVG Output",type:"image"}
    ];

    // Conexiones
    const BASE_ALPHA=0, PEAK_ALPHA=200, BASE_STROKE=0.25, PEAK_STROKE=1.0, PEAK_PROB=0.001;
    const FADE_IN=0.04, FADE_OUT=0.02;
    let connectionStates=[];
    let hover=null, dragging=null, dx=0, dy=0;

    // Pointer compensado por transform
    let px=0, py=0;
    function toLocal(e){
      const r=p.canvas.getBoundingClientRect();
      const t=e?.touches?.[0] || e?.changedTouches?.[0] || e;
      const cx=t?.clientX??0, cy=t?.clientY??0;
      return {x:(cx-r.left)*(p.width/r.width), y:(cy-r.top)*(p.height/r.height)};
    }
    function upd(e){ const v=toLocal(e); px=v.x; py=v.y; }

    p.setup = async function(){
      p.createCanvas(parentEl.clientWidth, parentEl.clientHeight);
      p.textFont(labelFont); p.textSize(labelSize); p.textAlign(p.CENTER,p.TOP);
      p.canvas.style.touchAction='none';

      console.groupCollapsed('[pipeline] load SVGs (abs → local fallback, blob URLs)');
      const U = await loadSVGAsHTMLImage(ABS_UTTER, LOC_UTTER, 'utterance');
      const P = await loadSVGAsHTMLImage(ABS_PICTO, LOC_PICTO, 'pictogram');
      svgUtter = U.img; urlU = U.used; urlUObj = U.objUrl;
      svgPicto = P.img; urlP = P.used; urlPObj = P.objUrl;
      console.log('[pipeline] used URLs →', { utterance:urlU, pictogram:urlP });
      console.groupEnd();

      generateColumns();

      p.canvas.addEventListener('pointermove', upd, {passive:true});
      p.canvas.addEventListener('pointerdown', upd, {passive:true});
      p.canvas.addEventListener('pointerup',   upd, {passive:true});
      p.canvas.addEventListener('pointercancel', upd, {passive:true});
    };

    p.remove = function(){
      // Revocar objectURLs para liberar memoria
      try { if (urlUObj) URL.revokeObjectURL(urlUObj); } catch(_) {}
      try { if (urlPObj) URL.revokeObjectURL(urlPObj); } catch(_) {}
      // p5 cleanup normal
      p._removeElements?.();
      const cnv = p.canvas; cnv?.parentNode?.removeChild?.(cnv);
    };

    p.windowResized = function(){
      p.resizeCanvas(parentEl.clientWidth, parentEl.clientHeight);
      generateColumns();
    };

    p.draw = function(){
      p.clear();
      hover=null;
      detectHover(px,py);
      drawConnections();
      drawColumns();

      /*
      // Pequeño overlay de diagnostico (opcional; puedes quitarlo)
      p.fill(0); p.textAlign(p.LEFT,p.TOP); p.textSize(12);
      p.text(`SVG U: ${!!svgUtter} (${svgUtter?.naturalWidth||0}×${svgUtter?.naturalHeight||0})`, 10, 8);
      p.text(`SVG P: ${!!svgPicto} (${svgPicto?.naturalWidth||0}×${svgPicto?.naturalHeight||0})`, 10, 24);
      p.textAlign(p.CENTER,p.TOP); p.textSize(labelSize);
      */
    };

    // -------- interacción --------
    p.mousePressed = function(e){
      upd(e);
      for(const c of columns){
        if(px>=c.left && px<=c.left+c.w && py>=c.top && py<=c.top+c.h){
          dragging=c; dx=px-c.left; dy=py-c.top; break;
        }
      }
    };
    p.mouseDragged = function(e){
      if(!dragging) return;
      upd(e);
      dragging.left=px-dx; dragging.top=py-dy;
      dragging.x=dragging.left+dragging.w/2; dragging.y=dragging.top;
      if(dragging.type==='image'){
        const cx=dragging.left+dragging.w/2, cy=dragging.top+dragging.h/2;
        for(const n of dragging.nodes){ n.x=cx; n.y=cy; }
      }else{
        const n=dragging.nodes.length, gap=dragging.h/(n+1);
        for(let i=0;i<n;i++){ dragging.nodes[i].x=dragging.left+dragging.w/2; dragging.nodes[i].y=dragging.top+gap*(i+1); }
      }
    };
    p.mouseReleased = ()=>{ dragging=null; };

    // -------- helpers visuales --------
    function generateColumns(){
      columns=[]; const spacing=p.width/(COLDEF.length+1);
      for(let i=0;i<COLDEF.length;i++){
        const def=COLDEF[i], cx=spacing*(i+1), w=spacing*0.19, yTop=p.height/2-columnHeight/2;
        const isImage = def.type==='image';
        const nodes=[];
        if(isImage){ const n=20, px=cx, py=yTop+columnHeight/2; for(let k=0;k<n;k++) nodes.push({x:px,y:py}); }
        else{ const n=20, gap=columnHeight/(n+1); for(let j=0;j<n;j++) nodes.push({x:cx,y:yTop+gap*(j+1)}); }
        const colRGB = isImage ? {r:230,g:230,b:230} : (COLORS[def.label]||{r:200,g:80,b:80});
        columns.push({label:def.label, type:def.type, x:cx, y:yTop, w, h:columnHeight, left:cx-w/2, top:yTop, nodes, color:colRGB});
      }
      connectionStates=[];
      for(let i=0;i<columns.length-1;i++){
        const a=columns[i].nodes.length, b=columns[i+1].nodes.length, rows=[];
        for(let ia=0; ia<a; ia++){ const row=[]; for(let ib=0; ib<b; ib++) row.push({progress:0,state:'idle'}); rows.push(row); }
        connectionStates.push(rows);
      }
    }

    function detectHover(x,y){
      if(dragging) return;
      for(const c of columns){
        if(x>=c.left && x<=c.left+c.w && y>=c.top && y<=c.top+c.h){ hover=c; return; }
      }
    }

    function drawColumns(){
      p.rectMode(p.CORNER);
      for(const c of columns){
        if(c.type==='normal'){
          p.noStroke(); p.fill(c.color.r,c.color.g,c.color.b,(c===hover?200:120));
          p.rect(c.left,c.top,c.w,c.h,12);
        }
        if(c.type==='image'){
          const el = (c.label==='Utterance') ? svgUtter : (c.label==='SVG Output') ? svgPicto : null;
          if(el && el.naturalWidth && el.naturalHeight){
            const drawW=100; const ar=el.naturalWidth/el.naturalHeight; const drawH=drawW/(ar||1);
            const ctx=p.drawingContext; ctx.imageSmoothingEnabled=true;
            ctx.drawImage(el, c.left+c.w/2-drawW/2, c.top+c.h/2-drawH/2, drawW, drawH);
          }else{
            p.noStroke(); p.fill(240); p.rect(c.left, c.top+c.h/2-18, c.w, 36, 8);
            p.fill(120); p.textSize(12);
            p.text((c.label==='Utterance'?'utterance':'pictogram')+' loading…', c.left+c.w/2, c.top+c.h/2-6);
            p.textSize(labelSize);
          }
        }else{
          p.noStroke(); p.fill(c.color.r,c.color.g,c.color.b);
          for(const n of c.nodes) p.circle(n.x,n.y,4);
        }
        p.noStroke();
        p.fill(0); p.textSize(labelSize);
        const m = (c.type==='image')? labelMarginImage : labelMarginNormal;
        p.text(c.label.toUpperCase(), c.left+c.w/2, c.top+c.h+m);
      }
    }

    function drawConnections(){
      if(!connectionStates.length) return;
      for(let i=0;i<columns.length-1;i++){
        const A=columns[i], B=columns[i+1];
        const col=(B.type==='image' && B.label==='SVG Output')? {r:0,g:0,b:0} : B.color;
        const nodesA=A.nodes, nodesB=B.nodes, states=connectionStates[i];
        for(let ia=0; ia<nodesA.length; ia++){
          if(!states[ia]) continue;
          for(let ib=0; ib<nodesB.length; ib++){
            const n1=nodesA[ia], n2=nodesB[ib], st=states[ia][ib];
            if(st.state==='idle'){ if(p.random()<0.001){ st.state='fading-in'; st.progress=0; } }
            else if(st.state==='fading-in'){ st.progress+=0.04; if(st.progress>=1){ st.progress=1; st.state='fading-out'; } }
            else if(st.state==='fading-out'){ st.progress-=0.02; if(st.progress<=0){ st.progress=0; st.state='idle'; } }

            if(BASE_ALPHA>0){ p.stroke(col.r,col.g,col.b,BASE_ALPHA); p.strokeWeight(BASE_STROKE); p.line(n1.x,n1.y,n2.x,n2.y); }
            if(st.progress>0){
              const t=st.progress<0.5? 4*st.progress**3 : 1-Math.pow(-2*st.progress+2,3)/2;
              p.stroke(col.r,col.g,col.b, p.lerp(0,PEAK_ALPHA,t));
              p.strokeWeight(p.lerp(BASE_STROKE,PEAK_STROKE,t));
              p.line(n1.x,n1.y,n2.x,n2.y);
            }
          }
        }
      }
    }
  };
}