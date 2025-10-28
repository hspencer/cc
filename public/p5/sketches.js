// ========================================================================
// Reveal.js + p5.js — Sketch único "pipeline"
// Versión PNG: rutas ABS /cc/images/utterance.png y /cc/images/pictogram-g.png
// Drag/hover corregidos (getBoundingClientRect) + logs
// ========================================================================

const P5_REGISTRY = new Map();

function mountP5In(sectionEl) {
  if (!sectionEl) return;
  sectionEl.querySelectorAll('.p5-host').forEach(host => {
    if (P5_REGISTRY.has(host)) return;
    const type = (host.dataset.sketch || '').toLowerCase();
    if (type !== 'pipeline') return;
    const instance = new p5(pipelineSketchFactory(host), host);
    P5_REGISTRY.set(host, instance);
  });
}

function unmountP5In(sectionEl) {
  if (!sectionEl) return;
  sectionEl.querySelectorAll('.p5-host').forEach(host => {
    const inst = P5_REGISTRY.get(host);
    if (inst && typeof inst.remove === 'function') inst.remove();
    P5_REGISTRY.delete(host);
    host.innerHTML = '';
  });
}

if (typeof window !== 'undefined') {
  const R = window.Reveal;
  const cur = () => (R && typeof R.getCurrentSlide === 'function') ? R.getCurrentSlide() : null;

  if (R && typeof R.on === 'function') {
    R.on('ready', (e) => {
      document.querySelectorAll('.reveal .slides section').forEach(unmountP5In);
      mountP5In(e.currentSlide || cur());
    });
    R.on('slidechanged', (e) => {
      unmountP5In(e.previousSlide);
      mountP5In(e.currentSlide);
    });
    R.on('overviewhidden', () => {
      document.querySelectorAll('.reveal .slides section').forEach(unmountP5In);
      mountP5In(cur());
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const present = document.querySelector('.reveal .slides section.present');
      if (present) {
        document.querySelectorAll('.reveal .slides section').forEach(unmountP5In);
        mountP5In(present);
      }
    });
  }
}

// ========================================================================
// Fábrica del sketch "pipeline" (PNG)
// ========================================================================
function pipelineSketchFactory(parentEl) {
  return function(p) {
    // --- Rutas PNG absolutas ---
    const PNG_UTTERANCE = '/cc/images/utterance.png';
    const PNG_PICTO     = '/cc/images/pictogram-g.png';

    // --- Estado & config ---
    let columns = [];
    const columnHeight = 300;
    const labelFontFamily = 'Lexend';
    const labelSize = 14;
    const labelMaxWidth = 100;
    const labelMarginNormal = 8;
    const labelMarginImage  = -80;

    const COLORS = {
      "Text Processing":   { r:  65, g:  47, b:166 },
      "NLU":               { r: 161, g:  76, b: 87 },
      "Concept Mapping":   { r: 236, g:  98, b: 27 },
      "Blending":          { r: 112, g:  40, b: 11 },
      "Styler":            { r:  44, g:   9, b:  2 }
    };

    const COLUMN_DEFS = [
      { label: "Utterance",       type: "image"  },
      { label: "Text Processing", type: "normal" },
      { label: "NLU",             type: "normal" },
      { label: "Concept Mapping", type: "normal" },
      { label: "Blending",        type: "normal" },
      { label: "Styler",          type: "normal" },
      { label: "SVG Output",      type: "image"  }
    ];

    // Pulsos
    const BASE_ALPHA  = 0;
    const PEAK_ALPHA  = 200;
    const BASE_STROKE = 0.25;
    const PEAK_STROKE = 1.0;
    const PEAK_PROB   = 0.001;

    const FADE_IN_SPEED  = 0.04;
    const FADE_OUT_SPEED = 0.02;

    let hoverColumn = null;
    let draggingColumn = null;
    let dragOffsetX = 0, dragOffsetY = 0;

    let imgUtterance = null, imgPictogram = null;
    let connectionStates = [];

    // Puntero en coords de canvas (corrige transform/scale de Reveal)
    let pointerX = 0, pointerY = 0;
    function toLocalXYFromEvent(e) {
      const rect = p.canvas.getBoundingClientRect();
      const pt = e?.touches?.[0] || e?.changedTouches?.[0] || e;
      const cx = pt?.clientX ?? 0;
      const cy = pt?.clientY ?? 0;
      return {
        x: (cx - rect.left) * (p.width  / rect.width),
        y: (cy - rect.top ) * (p.height / rect.height),
      };
    }
    function updatePointer(e) {
      const { x, y } = toLocalXYFromEvent(e);
      pointerX = x; pointerY = y;
    }

    // ---------- p5 lifecycle ----------
    p.preload = function() {
      console.groupCollapsed('[pipeline] preload PNGs');
      console.log('→', PNG_UTTERANCE);
      imgUtterance = p.loadImage(
        PNG_UTTERANCE,
        () => console.log('✔ loaded utterance.png'),
        (err) => console.error('✖ error loading', PNG_UTTERANCE, err)
      );
      console.log('→', PNG_PICTO);
      imgPictogram = p.loadImage(
        PNG_PICTO,
        () => console.log('✔ loaded pictogram-g.png'),
        (err) => console.error('✖ error loading', PNG_PICTO, err)
      );
      console.groupEnd();
    };

    p.setup = function() {
      p.createCanvas(parentEl.clientWidth, parentEl.clientHeight);
      p.textFont(labelFontFamily);
      p.textSize(labelSize);
      p.textAlign(p.CENTER, p.TOP);
      p.canvas.style.touchAction = 'none';

      generateColumns();

      p.canvas.addEventListener('pointermove', updatePointer, { passive: true });
      p.canvas.addEventListener('pointerdown', updatePointer, { passive: true });
      p.canvas.addEventListener('pointerup',   updatePointer, { passive: true });
      p.canvas.addEventListener('pointercancel', updatePointer, { passive: true });

      console.info('[pipeline] setup — canvas size:', p.width, 'x', p.height);
    };

    p.draw = function() {
      p.clear();
      hoverColumn = null;
      detectHover(pointerX, pointerY);
      drawConnections();
      drawColumns();
    };

    p.windowResized = function() {
      p.resizeCanvas(parentEl.clientWidth, parentEl.clientHeight);
      generateColumns();
      console.info('[pipeline] windowResized — canvas size:', p.width, 'x', p.height);
    };

    // Interacción
    p.mousePressed = function(e) {
      updatePointer(e);
      for (let col of columns) {
        if (pointerX >= col.left && pointerX <= col.left + col.w &&
            pointerY >= col.top  && pointerY <= col.top  + col.h) {
          draggingColumn = col;
          dragOffsetX = pointerX - col.left;
          dragOffsetY = pointerY - col.top;
          break;
        }
      }
    };

    p.mouseDragged = function(e) {
      if (!draggingColumn) return;
      updatePointer(e);

      draggingColumn.left = pointerX - dragOffsetX;
      draggingColumn.top  = pointerY - dragOffsetY;

      draggingColumn.x = draggingColumn.left + draggingColumn.w/2;
      draggingColumn.y = draggingColumn.top;

      if (draggingColumn.type === "image") {
        const cx = draggingColumn.left + draggingColumn.w/2;
        const cy = draggingColumn.top  + draggingColumn.h/2;
        for (let n of draggingColumn.nodes) { n.x = cx; n.y = cy; }
      } else {
        const nCount = draggingColumn.nodes.length;
        const gap = draggingColumn.h / (nCount + 1);
        for (let i = 0; i < nCount; i++) {
          draggingColumn.nodes[i].x = draggingColumn.left + draggingColumn.w/2;
          draggingColumn.nodes[i].y = draggingColumn.top  + gap * (i + 1);
        }
      }
    };

    p.mouseReleased = function(e) {
      updatePointer(e);
      draggingColumn = null;
    };

    // -------- Helpers ----------
    function generateColumns() {
      columns = [];
      const spacing = p.width / (COLUMN_DEFS.length + 1);

      for (let i = 0; i < COLUMN_DEFS.length; i++) {
        const def = COLUMN_DEFS[i];
        const cx = spacing * (i + 1);
        const w  = spacing * 0.19;
        const yTop = p.height / 2 - columnHeight / 2;
        const isImage = def.type === "image";

        const nodes = [];
        if (isImage) {
          const n = 20, px = cx, py = yTop + columnHeight/2;
          for (let k = 0; k < n; k++) nodes.push({ x: px, y: py });
        } else {
          const n = 20, gap = columnHeight / (n + 1);
          for (let j = 0; j < n; j++) nodes.push({ x: cx, y: yTop + gap * (j + 1) });
        }

        const colRGB =
          def.type === "normal" ? (COLORS[def.label] || { r: 220, g: 80, b: 80 })
                                : { r: 230, g: 230, b: 230 };

        let img = null;
        if (isImage) {
          if (def.label === 'Utterance')  img = imgUtterance;
          if (def.label === 'SVG Output') img = imgPictogram;
        }

        columns.push({
          label: def.label,
          labelUpper: def.label.toUpperCase(),
          type: def.type,
          x: cx,
          y: yTop,
          w: w,
          h: columnHeight,
          left: cx - w/2,
          top: yTop,
          nodes,
          color: colRGB,
          image: img
        });
      }

      // Estados de conexión
      connectionStates = [];
      for (let i = 0; i < columns.length - 1; i++) {
        const aLen = columns[i].nodes.length;
        const bLen = columns[i+1].nodes.length;
        const states = [];
        for (let ia = 0; ia < aLen; ia++) {
          const row = [];
          for (let ib = 0; ib < bLen; ib++) {
            row.push({ progress: 0, state: 'idle' });
          }
          states.push(row);
        }
        connectionStates.push(states);
      }
    }

    function detectHover(x, y) {
      if (draggingColumn) return;
      for (let col of columns) {
        if (x >= col.left && x <= col.left + col.w &&
            y >= col.top  && y <= col.top  + col.h) {
          hoverColumn = col; return;
        }
      }
    }

    function drawColumns() {
      p.rectMode(p.CORNER);
      for (let col of columns) {
        if (col.type === "normal") {
          const baseA = (col === hoverColumn) ? 200 : 120;
          p.noStroke();
          p.fill(col.color.r, col.color.g, col.color.b, baseA);
          p.rect(col.left, col.top, col.w, col.h, 12);
        }

        if (col.type === "image") {
          if (col.image) {
            const drawW = 100;
            const ar = (col.image.width && col.image.height) ? (col.image.width / col.image.height) : 1;
            const drawH = drawW / ar;
            p.imageMode(p.CENTER);
            p.image(col.image, col.left + col.w/2, col.top + col.h/2, drawW, drawH);
          } else {
            p.push();
            p.noStroke();
            p.fill(240);
            p.rect(col.left, col.top + col.h/2 - 20, col.w, 40, 8);
            p.fill(120);
            p.textSize(12);
            p.text('loading…', col.left + col.w/2, col.top + col.h/2 - 6);
            p.pop();
          }
        } else {
          p.noStroke();
          p.fill(col.color.r, col.color.g, col.color.b);
          for (let n of col.nodes) p.circle(n.x, n.y, 4);
        }

        p.fill(0);
        p.textSize(labelSize);
        const margin = (col.type === "image") ? labelMarginImage : labelMarginNormal;
        const labelY = col.top + col.h + margin;
        drawWrappedText(col.labelUpper, col.left + col.w/2, labelY, labelMaxWidth, 16);
      }
    }

    function drawConnections() {
      if (!connectionStates.length) return;
      for (let i = 0; i < columns.length - 1; i++) {
        const A = columns[i], B = columns[i + 1];
        const isToPic = (B.type === "image" && B.label === "SVG Output");
        const c = isToPic ? { r: 0, g: 0, b: 0 } : B.color;
        const nodesA = A.nodes, nodesB = B.nodes, states = connectionStates[i];

        for (let ia = 0; ia < nodesA.length; ia++) {
          if (!states[ia]) continue;
          for (let ib = 0; ib < nodesB.length; ib++) {
            const n1 = nodesA[ia], n2 = nodesB[ib], st = states[ia][ib];
            if (st.state === 'idle') {
              if (p.random() < PEAK_PROB) { st.state = 'fading-in'; st.progress = 0; }
            } else if (st.state === 'fading-in') {
              st.progress += FADE_IN_SPEED;
              if (st.progress >= 1) { st.progress = 1; st.state = 'fading-out'; }
            } else if (st.state === 'fading-out') {
              st.progress -= FADE_OUT_SPEED;
              if (st.progress <= 0) { st.progress = 0; st.state = 'idle'; }
            }
            if (BASE_ALPHA > 0) {
              p.stroke(c.r, c.g, c.b, BASE_ALPHA);
              p.strokeWeight(BASE_STROKE);
              p.line(n1.x, n1.y, n2.x, n2.y);
            }
            if (st.progress > 0) {
              const eased = st.progress < 0.5 ? 4*st.progress**3
                                              : 1 - Math.pow(-2*st.progress + 2, 3) / 2;
              const alphaVal = p.lerp(0, PEAK_ALPHA, eased);
              const strokeW = p.lerp(BASE_STROKE, PEAK_STROKE, eased);
              p.stroke(c.r, c.g, c.b, alphaVal);
              p.strokeWeight(strokeW);
              p.line(n1.x, n1.y, n2.x, n2.y);
            }
          }
        }
      }
    }

    function drawWrappedText(str, cx, topY, maxW, lineH) {
      const words = str.split(' ');
      let line = '', y = topY;
      for (let i = 0; i < words.length; i++) {
        const test = (line ? line + ' ' : '') + words[i];
        if (p.textWidth(test) > maxW && line) {
          p.noStroke(); p.text(line, cx, y);
          line = words[i]; y += lineH;
        } else line = test;
      }
      p.noStroke();
      if (line) p.text(line, cx, y);
    }
  };
}