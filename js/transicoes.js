/* Papo Dom · catálogo de transições entre seções.
   Cada transição recebe a seção de saída (out) e a de entrada (inn) e é conduzida por um
   ScrollTrigger em scrub: progresso 0 quando o topo da entrada toca o pé da viewport, 1 quando
   chega ao topo. Fora desse intervalo as duas seções voltam ao estado natural (sem transform,
   sem will-change), então o documento continua sendo um fluxo vertical comum.
   Só transform, opacity e clip-path são animados (T8 anima também a variável --pd-swap). */
(function () {
  var FX = window.PapoFX = window.PapoFX || {};
  var YELLOW = '#EBF06B', PURPLE = '#7433E6', BLACK = '#0A0A0A';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function io(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function oc(t) { return 1 - (1 - t) * (1 - t); }
  function ic(t) { return t * t; }
  function VH() { return window.innerHeight; }
  function VW() { return document.documentElement.clientWidth; }
  function same(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
  function layer(j, css) {
    var d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;inset:0;pointer-events:none;display:none;' + css;
    j.layer.appendChild(d);
    return d;
  }


  function interior(ctx, ch, font) {
    var c = ctx.canvas; ctx.font = font;
    var m = ctx.measureText(ch), pad = 8, left = Math.ceil(m.actualBoundingBoxLeft), asc = Math.ceil(m.actualBoundingBoxAscent);
    c.width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2);
    c.height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2);
    ctx.font = font; ctx.fillStyle = '#000'; ctx.fillText(ch, pad + left, pad + asc);
    var w = c.width, h = c.height, px = ctx.getImageData(0, 0, w, h).data, rows = new Uint16Array(w + 1), size = 0, bx = 0, by = 0;
    for (var y = 0; y < h; y++) {
      var dg = 0;
      for (var x = 0; x < w; x++) {
        var ab = rows[x + 1];
        rows[x + 1] = px[(y * w + x) * 4 + 3] > 245 ? Math.min(ab, rows[x], dg) + 1 : 0;
        dg = ab;
        if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
      }
    }
    if (size < 3) return null;
    return { x: (bx + 1 - size / 2 - pad - left) / 3, y: (by + 1 - size / 2 - pad - asc) / 3, r: (size / 2 - 1) / 3 };
  }
  function portalMeasure(j) {
    var W = VW(), H = VH();
    if (j.m && j.m.W === W && j.m.H === H) return;
    var d = CAT.T3, ink = j.ink;
    if (!ink) {
      var ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      var f100 = d.weight + ' 100px ' + d.family, f300 = d.weight + ' 300px ' + d.family;
      ctx.font = f100; try { ctx.fontKerning = 'none'; } catch (e) {}
      var mt = ctx.measureText(d.word), best = null;
      var bx = -mt.actualBoundingBoxLeft, by = -mt.actualBoundingBoxAscent;
      var bw = mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight, bh = mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent;
      for (var i = 0; i < d.word.length; i++) {
        ctx.font = f100; var adv = ctx.measureText(d.word.slice(0, i)).width;
        var k = interior(ctx, d.word[i], f300);
        if (k && (!best || k.r > best.r)) best = { x: k.x + adv, y: k.y, r: k.r };
      }
      ink = j.ink = { cx: bx + bw / 2, cy: by + bh / 2, bw: bw || 1, bh: bh || 1, t: best || { x: bx + bw / 2, y: by + bh / 2, r: 6 } };
    }
    var s0 = Math.min(W * .82 / ink.bw, H * .5 / ink.bh);
    j.m = { W: W, H: H, s0: s0, s1: Math.max(s0 * 2, Math.hypot(W, H) / (ink.t.r * 1.2)), cx: ink.cx, cy: ink.cy, tx: ink.t.x, ty: ink.t.y };
  }

  var CAT = {
    // T1 · corte de página: a entrada espera atrás; a saída sobe fechando por clip-path de baixo para cima.
    T1: {
      begin: function (j) { j.inn.style.zIndex = j.outZ - 5; },
      render: function (j, p) {
        var h = VH();
        gsap.set(j.inn, { y: -(1 - p) * h });
        j.out.style.clipPath = 'inset(0 0 ' + (p * h * .6).toFixed(1) + 'px 0)';
      }
    },
    // T2 · varredura sólida: bloco diagonal cobre a tela e revela a seção nova por trás.
    T2: {
      init: function (j) { j.sweep = layer(j, 'background:' + ((same(j.bgOut, YELLOW) || same(j.bgIn, YELLOW)) ? PURPLE : YELLOW)); },
      begin: function (j) { j.sweep.style.zIndex = j.inZ + 5; j.sweep.style.display = 'block'; },
      render: function (j, p) {
        var s = 35, a = (100 + s) * io(seg(p, 0, .5)), b = (100 + s) * io(seg(p, .5, 1));
        j.sweep.style.clipPath = 'polygon(' + b + '% 0,' + a + '% 0,' + (a - s) + '% 100%,' + (b - s) + '% 100%)';
        gsap.set(j.inn, { y: -(1 - p) * VH(), opacity: p < .5 ? 0 : 1 });
      },
      end: function (j) { j.sweep.style.display = 'none'; j.sweep.style.clipPath = ''; }
    },
    // T3 · portal tipográfico (glyph portal): a palavra "Dom" surge na tela como janelas para o preto da
    // seção seguinte; a câmera mergulha na maior área de tinta de uma letra até o preto ocupar tudo.
    // Ganha um espaçador próprio (1,6 tela) para ter curso de rolagem sem pin.
    T3: {
      word: 'Dom', family: "'Bricolage Grotesque', sans-serif", weight: 800,
      init: function (j) {
        var sp = j.spacer = document.createElement('div');
        sp.setAttribute('aria-hidden', 'true');
        sp.style.cssText = 'position:relative;z-index:' + (j.inZ - 1) + ';background:' + (j.bgIn || BLACK);
        j.inn.parentNode.insertBefore(sp, j.inn);
        j.sizeSp = function () { sp.style.height = Math.round(VH() * 1.6) + 'px'; };
        j.sizeSp(); ScrollTrigger.addEventListener('refreshInit', j.sizeSp);
        var id = 'pd-portal-' + j.prio, NS = 'http://www.w3.org/2000/svg';
        var ov = j.ov = layer(j, 'overflow:hidden');
        var paper = j.paper = document.createElement('div');
        paper.style.cssText = 'position:absolute;inset:0;background:' + j.bgOut;
        var field = j.field = document.createElement('div');
        field.style.cssText = 'position:absolute;inset:0;background:' + (j.bgIn || BLACK) + ';clip-path:url(#' + id + ')';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
        var cp = j.clip = document.createElementNS(NS, 'clipPath');
        cp.setAttribute('id', id); cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
        var tx = j.glyph = document.createElementNS(NS, 'text');
        tx.setAttribute('x', '0'); tx.setAttribute('y', '0');
        tx.style.cssText = 'font-family:' + CAT.T3.family + ';font-weight:' + CAT.T3.weight + ';font-size:100px;font-kerning:none;font-variant-ligatures:none;letter-spacing:0';
        tx.textContent = CAT.T3.word;
        cp.appendChild(tx); svg.appendChild(cp); ov.appendChild(svg); ov.appendChild(paper); ov.appendChild(field);
        j.clipId = id;
      },
      range: function (j) { return { trigger: j.spacer, start: 'top bottom', endTrigger: j.inn, end: 'top top' }; },
      begin: function (j) { j.ov.style.zIndex = j.inZ + 5; j.ov.style.display = 'block'; portalMeasure(j); },
      render: function (j, p) {
        var m = j.m; if (!m) return;
        var a = seg(p, 0, .14), t = seg(p, .12, .88);
        var e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        var s0 = m.s0 * (.88 + .12 * oc(a)), sc = Math.exp(Math.log(s0) + (Math.log(m.s1) - Math.log(s0)) * e);
        var bl = clamp((1 / sc - 1 / s0) / (1 / m.s1 - 1 / s0), 0, 1);
        var cx = m.cx + (m.tx - m.cx) * bl, cy = m.cy + (m.ty - m.cy) * bl;
        j.clip.setAttribute('transform', 'scale(' + sc + ')');
        j.glyph.setAttribute('transform', 'translate(' + (m.W / 2 / sc - cx) + ' ' + (m.H / 2 / sc - cy) + ')');
        j.field.style.clipPath = t >= 1 ? 'none' : 'url(#' + j.clipId + ')';
        j.paper.style.opacity = a; j.field.style.opacity = a;
        j.ov.style.opacity = 1 - seg(p, .9, 1);
      },
      end: function (j) { j.ov.style.display = 'none'; },
      kill: function (j) { ScrollTrigger.removeEventListener('refreshInit', j.sizeSp); j.spacer.remove(); j.ov.remove(); }
    },
    // T4 · empilhamento de adesivo: entrada sobe com 4° voltando a 0 e sombra dura.
    T4: {
      begin: function (j) {
        j.inn.style.boxShadow = '12px -12px 0 0 ' + (same(j.bgOut, BLACK) ? YELLOW : BLACK);
        gsap.set(j.inn, { transformOrigin: '50% 0%' });
      },
      render: function (j, p) {
        gsap.set(j.out, { scale: 1 - .04 * p });
        gsap.set(j.inn, { rotation: 4 * (1 - oc(p)) });
      }
    },
    // T5 · deslize com profundidade: saída recua (0.92) e esmaece; entrada sobe por cima.
    T5: {
      begin: function (j) { gsap.set(j.out, { transformOrigin: '50% ' + (j.out.offsetHeight - VH() / 2) + 'px' }); },
      // sem scale: encolher a seção abria faixas pretas nas laterais. Só deriva para cima e escurece.
      render: function (j, p) { var e = oc(p); gsap.set(j.out, { y: -VH() * .08 * e, opacity: 1 - .7 * e, force3D: true }); }
    },
    // T6 · corrida horizontal: pin na saída, conteúdo corre para a esquerda, entrada chega pela direita.
    T6: {
      init: function (j) {
        j.pin = ScrollTrigger.create({ trigger: j.out, start: 'bottom bottom', end: function () { return '+=' + VH(); }, pin: true, pinSpacing: false, anticipatePin: 1, refreshPriority: j.prio + 1 });
      },
      render: function (j, p) {
        var w = VW();
        gsap.set(j.out, { x: -w * .5 * io(p) });
        gsap.set(j.inn, { y: -(1 - p) * VH(), x: w * (1 - io(seg(p, .25, 1))) });
      },
      kill: function (j) { if (j.pin) j.pin.kill(true); }
    },
    // T7 · cortina de scanline: 10 faixas da entrada surgem intercaladas, de cima para baixo.
    T7: {
      render: function (j, p) {
        var h = VH(), n = 10, bh = h / n, pts = [];
        for (var i = 0; i < n; i++) {
          var st = (i % 2 ? .18 : 0) + (i >> 1) / (n / 2) * .5, f = oc(seg(p, st, st + .3));
          var t = i * bh, b = t + bh * f;
          pts.push('0 ' + t.toFixed(1) + 'px', '100% ' + t.toFixed(1) + 'px', '100% ' + b.toFixed(1) + 'px', '0 ' + b.toFixed(1) + 'px');
        }
        gsap.set(j.out, { opacity: 1 - .4 * p });
        gsap.set(j.inn, { y: -(1 - p) * h });
        j.inn.style.clipPath = 'polygon(' + pts.join(',') + ')';
      }
    },
    // T8 · inversão de cor: o fundo troca de cor antes do conteúdo novo aparecer.
    T8: {
      init: function (j) { j.swap = layer(j, 'background:var(--pd-swap)'); j.mix = gsap.utils.interpolate(j.bgOut, j.bgIn); },
      begin: function (j) { j.swap.style.zIndex = j.outZ + 5; j.swap.style.display = 'block'; },
      render: function (j, p) {
        j.swap.style.setProperty('--pd-swap', j.mix(io(seg(p, .3, .6))));
        j.swap.style.opacity = seg(p, 0, .3);
        gsap.set(j.inn, { y: -(1 - p) * VH(), opacity: oc(seg(p, .6, 1)) });
      },
      end: function (j) { j.swap.style.display = 'none'; }
    }
  };

  // T9 · deslize lateral: a seção de entrada cruza a tela pelo lado (direita por padrão, side: "left" para
  // a esquerda) cobrindo a de saída, que recua para o lado oposto e escurece. A entrada fica presa no topo
  // por um pin do GSAP (position: fixed) durante o curso, então só o eixo X anima: nada de compensar Y.
  // margin-top: -100vh faz a entrada chegar ao topo no mesmo instante em que a saída assenta; o pinSpacing
  // devolve essa altura, então o comprimento do documento não muda.
  function firstBox(el) {
    var c = el.firstElementChild;
    while (c && getComputedStyle(c).display === 'contents') c = c.firstElementChild;
    return c || el;
  }
  CAT.T9 = {
    keepInn: true,
    init: function (j) {
      j.d = j.side === 'left' ? -1 : 1;
      j.bg = j.inn.style.background;
      j.setM = function () { j.inn.style.marginTop = -VH() + 'px'; };
      j.setM(); ScrollTrigger.addEventListener('refreshInit', j.setM);
      j.pin = ScrollTrigger.create({ trigger: j.inn, start: 'top top', end: function () { return '+=' + VH(); }, pin: true, pinSpacing: true, anticipatePin: 1, refreshPriority: j.prio + 1 });
    },
    range: function (j) { return { trigger: j.inn, start: 'top top', end: function () { return '+=' + VH(); } }; },
    box: function (j) { return j.box || (j.box = firstBox(j.inn)); },
    // keepBg: o fundo ([data-bgl]) das duas seções fica parado; só os componentes cruzam a tela.
    parts: function (j) {
      if (j.pp) return j.pp;
      // raiz de cada seção = o elemento com data-screen-label (o mount do componente pode ser um wrapper)
      var ib = j.inn.querySelector('[data-screen-label]') || CAT.T9.box(j), ob = j.srcOut.querySelector('[data-screen-label]') || firstBox(j.srcOut);
      var kids = function (b) { return [].slice.call(b.children).filter(function (c) { return !c.hasAttribute('data-bgl') && c.tagName !== 'SCRIPT'; }); };
      return (j.pp = { ib: ib, ibg: ib.style.background, bgl: ib.querySelector('[data-bgl]'), inC: kids(ib), outC: kids(ob) });
    },
    shell: function (j, on) {
      var q = CAT.T9.parts(j);
      q.ib.style.background = on ? 'transparent' : q.ibg;
      if (q.bgl) q.bgl.style.opacity = on ? '0' : '';
    },
    rest: function (j, p) {
      if (j.keepBg) {
        var q = CAT.T9.parts(j);
        CAT.T9.shell(j, p <= 0);
        j.inn.style.background = p <= 0 ? 'transparent' : j.bg;
        gsap.set(q.outC, { clearProps: 'transform,opacity' });
        if (p <= 0) gsap.set(q.inC, { x: j.d * VW() }); else gsap.set(q.inC, { clearProps: 'transform' });
        return;
      }
      var b = CAT.T9.box(j);
      if (p <= 0) { j.inn.style.background = 'transparent'; gsap.set(b, { x: j.d * VW() }); }
      else { j.inn.style.background = j.bg; gsap.set(b, { clearProps: 'transform' }); }
    },
    begin: function (j) { j.inn.style.background = 'transparent'; if (j.keepBg) CAT.T9.shell(j, true); },
    render: function (j, p) {
      var w = VW(), e = io(p);
      if (j.keepBg) {
        var q = CAT.T9.parts(j);
        gsap.set(q.inC, { x: j.d * w * (1 - e), force3D: true });
        gsap.set(q.outC, { x: -j.d * w * e, opacity: 1 - .4 * e, force3D: true });
        return;
      }
      gsap.set(CAT.T9.box(j), { x: j.d * w * (1 - e), force3D: true });
      gsap.set(j.out, { x: -j.d * w * .2 * e, opacity: 1 - .55 * e, force3D: true });
    },
    kill: function (j) {
      ScrollTrigger.removeEventListener('refreshInit', j.setM);
      j.pin && j.pin.kill(true);
      j.inn.style.marginTop = ''; j.inn.style.background = j.bg;
      if (j.box) gsap.set(j.box, { clearProps: 'transform' });
      if (j.pp) { CAT.T9.shell(j, false); gsap.set(j.pp.inC.concat(j.pp.outC), { clearProps: 'transform,opacity' }); }
    }
  };

  // T0 · corte rasgado: sem animação. A seção de entrada ganha uma borda superior de papel rasgado
  // (com o fio branco do papel) que avança sobre o pé da seção anterior; a rolagem segue normal.
  CAT.T0 = {
    still: true,
    init: function (j) {
      var NS = 'http://www.w3.org/2000/svg', W = 1440, H = 44, base = 30, s = 7, pts = [], x = 0;
      function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
      pts.push([0, base - 6]);
      while (x < W) {
        x += 10 + rnd() * 26;
        var y = base - 4 - rnd() * 14 + Math.sin(x / 170) * 5;
        if (rnd() < .09) { pts.push([x - 2, y]); pts.push([x, y - 12 - rnd() * 10]); pts.push([x + 2, y]); }
        else pts.push([Math.min(x, W), y]);
      }
      var edge = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
      var svg = j.tear = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;left:0;top:' + (-(H - 2)) + 'px;width:100%;height:' + H + 'px;display:block;pointer-events:none;z-index:2';
      var fill = document.createElementNS(NS, 'path');
      fill.setAttribute('d', edge + 'L' + W + ' ' + H + 'L0 ' + H + 'Z'); fill.setAttribute('fill', j.bgIn || BLACK);
      var line = document.createElementNS(NS, 'path');
      line.setAttribute('d', edge); line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#F2F2F2');
      line.setAttribute('stroke-width', '2.2'); line.setAttribute('vector-effect', 'non-scaling-stroke'); line.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(fill); svg.appendChild(line);
      j.inn.appendChild(svg);
    },
    render: function () {},
    kill: function (j) { j.tear && j.tear.remove(); }
  };

  // T10 · a logo assina: a seção sai como no T5 (sobe e escurece), mas a logo ([data-logo]) vai para uma
  // camada acima da seção que entra e viaja, sem sumir, até a marca da seção nova ([data-mark], presa no
  // canto superior esquerdo). Em p = 1 ela chega exatamente sobre a marca, que assume no lugar da cópia.
  CAT.T10 = {
    init: function (j) { j.sig = layer(j, ''); },
    begin: function (j) {
      gsap.set(j.out, { transformOrigin: '50% ' + (j.out.offsetHeight - VH() / 2) + 'px' });
      var src = j.out.querySelector('[data-logo]'), mark = j.inn.querySelector('[data-mark]');
      j.sig.innerHTML = ''; j.clone = null;
      if (!src) return;
      var r = src.getBoundingClientRect(), c = src.cloneNode(true);
      c.removeAttribute('data-logo');
      c.style.position = 'absolute'; c.style.margin = '0';
      c.style.left = r.left + 'px'; c.style.top = r.top + 'px'; c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
      c.style.transformOrigin = '0 0'; c.style.willChange = 'transform';
      j.sig.appendChild(c); j.clone = c; j.src = src; j.r = r; j.mark = mark;
      // destino: onde a marca fica quando a seção nova chega ao topo (ela está presa a top: 0 dentro da seção)
      if (mark) {
        var mr = mark.getBoundingClientRect(), ir = j.inn.getBoundingClientRect();
        j.to = { left: mr.left, top: mr.top - ir.top, width: mr.width };
        mark.style.visibility = 'hidden';
      } else j.to = { left: 24, top: 16, width: r.width * .16 };
      src.style.visibility = 'hidden';
      j.sig.style.zIndex = j.inZ + 5; j.sig.style.display = 'block';
    },
    render: function (j, p) {
      var e = oc(p);
      gsap.set(j.out, { y: -VH() * .08 * e, opacity: 1 - .5 * e, force3D: true });
      if (!j.clone) return;
      var r = j.r, t = j.to, m = io(seg(p, .2, 1)), s = 1 + (t.width / r.width - 1) * m;
      j.clone.style.transform = 'translate3d(' + ((t.left - r.left) * m).toFixed(1) + 'px,' + ((t.top - r.top) * m).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    },
    end: function (j) {
      if (j.src) j.src.style.visibility = '';
      if (j.mark) j.mark.style.visibility = '';
      j.sig.style.display = 'none'; j.sig.innerHTML = ''; j.clone = null;
    },
    kill: function (j) { if (j.src) j.src.style.visibility = ''; if (j.mark) j.mark.style.visibility = ''; j.sig.remove(); }
  };

  // T11 · bastidores: os cards da saída ([data-block]) giram como cartas; o verso de cada um tem a cor da
  // seção que entra. Os versos se alargam até se encostarem e cobrirem a tela, e a seção nova assume por
  // baixo ("por trás das linguagens, quem faz"). Os cards reais giram até 90° e dão lugar às peças do verso.
  CAT.T11 = {
    init: function (j) { j.tl = layer(j, ''); },
    begin: function (j) {
      j.cards = [].slice.call(j.out.querySelectorAll('[data-block]'));
      j.head = j.out.querySelector('[data-head]');
      j.rects = j.cards.map(function (c) { return c.getBoundingClientRect(); });
      j.tl.innerHTML = '';
      j.tiles = j.cards.map(function () {
        var t = document.createElement('div');
        t.style.cssText = 'position:absolute;left:0;top:0;background:' + (j.bgIn || PURPLE) + ';backface-visibility:hidden;will-change:transform';
        j.tl.appendChild(t); return t;
      });
      j.tl.style.zIndex = j.inZ + 5; j.tl.style.display = 'block';
    },
    render: function (j, p) {
      var W = VW(), H = VH(), n = j.cards.length || 1, g = io(seg(p, .56, .84));
      gsap.set(j.inn, { y: -(1 - p) * H });
      j.inn.style.visibility = p < .84 ? 'hidden' : '';
      // avisa a seção nova que ainda está coberta (animações de entrada dela esperam, ex.: molduras caindo)
      if (p < .97) j.inn.setAttribute('data-pd-covered', ''); else j.inn.removeAttribute('data-pd-covered');
      if (j.head) gsap.set(j.head, { opacity: 1 - seg(p, 0, .3), y: -40 * oc(seg(p, 0, .3)) });
      j.cards.forEach(function (c, i) {
        var a = seg(p, .04 + i * .05, .24 + i * .05), b = seg(p, .24 + i * .05, .42 + i * .05);
        c.style.transform = 'perspective(1400px) rotateY(' + (90 * ic(a)).toFixed(2) + 'deg)';
        c.style.visibility = a >= 1 ? 'hidden' : '';
        var r = j.rects[i], t = j.tiles[i], L = function (x, y) { return x + (y - x) * g; };
        t.style.width = L(r.width, W / n + 1).toFixed(1) + 'px';
        t.style.height = L(r.height, H).toFixed(1) + 'px';
        t.style.transform = 'translate3d(' + L(r.left, W * i / n).toFixed(1) + 'px,' + L(r.top, 0).toFixed(1) + 'px,0) perspective(1400px) rotateY(' + (-90 * (1 - oc(b))).toFixed(2) + 'deg)';
        t.style.borderRadius = (22 * (1 - g)).toFixed(1) + 'px';
        t.style.visibility = a >= 1 ? '' : 'hidden';
        t.style.opacity = 1 - seg(p, .9, 1);
      });
    },
    end: function (j) {
      (j.cards || []).forEach(function (c) { c.style.transform = ''; c.style.visibility = ''; });
      if (j.head) gsap.set(j.head, { clearProps: 'opacity,transform' });
      j.inn.style.visibility = ''; j.inn.removeAttribute('data-pd-covered');
      j.tl.style.display = 'none'; j.tl.innerHTML = '';
    },
    kill: function (j) { CAT.T11.end(j); j.tl.remove(); }
  };

  // T14 · empurrão com inércia: a seção que entra chega pela direita empurrando a de saída para a
  // esquerda, as duas coladas. Elas inclinam (skew) conforme a velocidade da rolagem e, quando a rolagem
  // para, voltam retas com uma mola (leve balanço), como se tivessem peso. Curso de 1,6 tela: um
  // espaçador transparente antes da entrada; a saída fica presa (sticky) atrás dele.
  CAT.T14 = {
    k: 1.6,
    init: function (j) {
      var sp = j.spacer = document.createElement('div');
      sp.setAttribute('aria-hidden', 'true'); sp.style.cssText = 'position:relative;pointer-events:none';
      j.inn.parentNode.insertBefore(sp, j.inn);
      j.sizeSp = function () { sp.style.height = Math.round(VH() * (CAT.T14.k - 1)) + 'px'; };
      j.sizeSp(); ScrollTrigger.addEventListener('refreshInit', j.sizeSp);
    },
    range: function (j) { return { trigger: j.spacer, start: 'top bottom', endTrigger: j.inn, end: 'top top' }; },
    begin: function (j) {
      var H = VH();
      gsap.set(j.out, { transformOrigin: '50% ' + (Math.max(0, j.out.offsetHeight - H) + H / 2) + 'px' });
      gsap.set(j.inn, { transformOrigin: '50% ' + (H / 2) + 'px' });
      j.inn.style.boxShadow = '-24px 0 48px rgba(0,0,0,.28)';
      j.sk = 0; j.sv = 0; j.live = true;
      // mola: a inclinação persegue a velocidade da rolagem e volta a zero com um pequeno balanço
      j.tk = function () {
        if (!j.live) return; // o ticker pode disparar uma última vez no mesmo quadro em que a emenda termina
        var v = j.st ? j.st.getVelocity() : 0, target = clamp(-v / 160, -9, 9);
        j.sv = (j.sv + (target - j.sk) * .12) * .78; j.sk += j.sv;
        CAT.T14.draw(j);
      };
      gsap.ticker.add(j.tk);
    },
    render: function (j, p) { j.p = p; CAT.T14.draw(j); },
    draw: function (j) {
      var p = j.p || 0, W = VW(), H = VH(), e = io(p), sk = j.sk || 0;
      gsap.set(j.inn, { y: -(1 - p) * H * CAT.T14.k, x: W * (1 - e), skewX: sk, force3D: true });
      gsap.set(j.out, { x: -W * e, skewX: sk, opacity: 1 - .25 * e, force3D: true });
    },
    end: function (j) { j.live = false; if (j.tk) { gsap.ticker.remove(j.tk); j.tk = null; } },
    kill: function (j) {
      CAT.T14.end(j);
      ScrollTrigger.removeEventListener('refreshInit', j.sizeSp);
      j.spacer.remove();
    }
  };

  // T17 · minimizar: cena de área de trabalho anos 2000 conduzida pela rolagem. A barra de tarefas sobe com
  // um botão por janela ([data-win]) da seção de saída; um cursor de pixel clica no botão de minimizar de
  // cada janela, que encolhe até o botão dela na barra. Surge o botão da seção nova piscando (com balão de
  // aviso); o cursor clica e a seção nova se restaura do botão até a tela cheia, com moldura de janela que
  // some no fim. Curso de 2,4 telas: espaçador transparente antes da entrada; a saída fica presa atrás.
  var TB = 46, MIN0 = .1, MINS = .16;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function io3(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hhmm() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  CAT.T17 = {
    k: 2.4,
    init: function (j) {
      var sp = j.spacer = document.createElement('div');
      sp.setAttribute('aria-hidden', 'true'); sp.style.cssText = 'position:relative;pointer-events:none';
      j.inn.parentNode.insertBefore(sp, j.inn);
      j.sizeSp = function () { sp.style.height = Math.round(VH() * (CAT.T17.k - 1)) + 'px'; };
      j.sizeSp(); ScrollTrigger.addEventListener('refreshInit', j.sizeSp);
      var MONO = "'IBM Plex Mono',monospace";
      // moldura da janela que se restaura (fica sob a barra de tarefas)
      j.fw = layer(j, '');
      j.frame = document.createElement('div');
      j.frame.style.cssText = 'position:absolute;left:0;top:0;border:2px solid #0A0A0A;box-shadow:8px 8px 0 #0A0A0A;pointer-events:none';
      j.bar = document.createElement('div');
      j.bar.style.cssText = 'position:absolute;left:0;right:0;top:0;height:32px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#7CB342;border-bottom:2px solid #0A0A0A;color:#0A0A0A;font:600 12px/1 ' + MONO + ';letter-spacing:.08em;overflow:hidden';
      j.bar.innerHTML = '<span>Atrações</span><span style="display:flex;gap:6px"><span style="width:12px;height:12px;border:2px solid #0A0A0A;background:#FFFFFF"></span><span style="width:12px;height:12px;border:2px solid #0A0A0A;background:#FFFFFF"></span><span style="width:12px;height:12px;border:2px solid #0A0A0A;background:#0A0A0A"></span></span>';
      j.frame.appendChild(j.bar); j.fw.appendChild(j.frame);
      // barra de tarefas
      j.tw = layer(j, '');
      j.task = document.createElement('div');
      j.task.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:' + TB + 'px;background:linear-gradient(#3F7BEA,#2457D6 12%,#2C5FE0 88%,#1D47B8);border-top:2px solid #0A0A0A;box-shadow:inset 0 2px 0 rgba(255,255,255,.25);will-change:transform';
      j.task.innerHTML =
        '<div style="position:absolute;left:0;top:0;bottom:0;width:132px;display:flex;align-items:center;gap:8px;padding:0 14px;background:linear-gradient(#5DBB3F,#3D9A2A 55%,#2F7E21);border-right:2px solid #0A0A0A;border-radius:0 14px 14px 0;color:#FFFFFF;font:700 14px/1 ' + MONO + ';letter-spacing:.04em;text-shadow:1px 1px 0 rgba(0,0,0,.35);box-shadow:inset 0 2px 0 rgba(255,255,255,.3)">' +
          '<img src="assets/selo-15.webp" alt="" style="width:22px;height:auto">iniciar</div>' +
        '<div data-tray style="position:absolute;right:0;top:0;bottom:0;width:110px;display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(#1D9BEF,#1281D8);border-left:2px solid #0A0A0A;color:#FFFFFF;font:600 13px/1 ' + MONO + '">' +
          '<span aria-hidden="true" style="position:relative;width:16px;height:12px"><span style="position:absolute;left:0;bottom:0;width:9px;height:8px;border:2px solid #FFFFFF;border-radius:2px"></span><span style="position:absolute;right:0;top:0;width:9px;height:8px;border:2px solid #FFFFFF;border-radius:2px;background:#1281D8"></span></span>' +
          '<span data-clock></span></div>';
      j.clock = j.task.querySelector('[data-clock]');
      j.tw.appendChild(j.task);
      var names = ['Onde', 'Espaços', 'Como chegar', 'Atrações'];
      j.tb = names.map(function (nm, i) {
        var b = document.createElement('div');
        b.style.cssText = 'position:absolute;display:flex;align-items:center;gap:8px;padding:0 10px;border:2px solid #0A0A0A;border-radius:6px;color:#FFFFFF;font:600 12px/1 ' + MONO + ';white-space:nowrap;overflow:hidden;transition:background-color .12s';
        b.innerHTML = '<span style="flex:none;width:12px;height:12px;border:2px solid #0A0A0A;background:' + (i === 3 ? '#C92A74' : '#7CB342') + '"></span><span style="overflow:hidden;text-overflow:ellipsis">' + nm + '</span>';
        j.task.appendChild(b); return b;
      });
      // balão de aviso, apontando para o botão novo
      j.balloon = document.createElement('div');
      j.balloon.style.cssText = 'position:absolute;bottom:' + (TB + 14) + 'px;width:250px;padding:12px 14px;background:#FFFFE1;color:#0A0A0A;border:2px solid #0A0A0A;border-radius:10px;box-shadow:6px 6px 0 #0A0A0A;font:500 13px/1.4 \'General Sans\',sans-serif;transform-origin:20px 100%';
      j.balloon.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font:700 13px/1 ' + MONO + '"><span>● Atrações</span><span aria-hidden="true">×</span></div>Palestras, workshops e bate-papos. Clique para abrir.' +
        '<span aria-hidden="true" style="position:absolute;left:22px;bottom:-12px;width:20px;height:12px;background:#0A0A0A;clip-path:polygon(0 0,100% 0,0 100%)"></span>' +
        '<span aria-hidden="true" style="position:absolute;left:24px;bottom:-8px;width:15px;height:9px;background:#FFFFE1;clip-path:polygon(0 0,100% 0,0 100%)"></span>';
      j.tw.appendChild(j.balloon);
      // cursor de pixel (seta clássica, ponta no canto superior esquerdo)
      j.cur = document.createElement('div');
      j.cur.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:38px;transform-origin:0 0;will-change:transform;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.25))';
      j.cur.innerHTML = '<svg width="24" height="38" viewBox="0 0 12 19" shape-rendering="crispEdges" aria-hidden="true"><path d="M0 0V16L4 12L7 18L9 17L6 11H11Z" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="1"/></svg>';
      j.tw.appendChild(j.cur);
    },
    range: function (j) { return { trigger: j.spacer, start: 'top bottom', endTrigger: j.inn, end: 'top top' }; },
    begin: function (j) {
      var W = VW(), H = VH();
      j.fw.style.zIndex = j.inZ + 5; j.tw.style.zIndex = j.inZ + 6;
      j.fw.style.display = j.tw.style.display = 'block';
      j.top0 = Math.max(0, j.out.offsetHeight - H);
      j.innH = j.inn.offsetHeight;
      j.clock.textContent = hhmm();
      // janelas da saída e o botão de minimizar (primeiro quadradinho da barra de título)
      j.wins = [].slice.call(j.out.querySelectorAll('[data-win]')).slice(0, 3).map(function (w) {
        var r = w.getBoundingClientRect(), mb = w.querySelector('span[aria-hidden] > span');
        var m = mb ? mb.getBoundingClientRect() : { left: r.right - 40, top: r.top + 12, width: 14, height: 14 };
        return { el: w, mb: mb, mbBg: mb ? mb.style.background : '', x: r.left, y: r.top + j.top0, w: r.width, h: r.height, mx: m.left + m.width / 2, my: m.top + m.height / 2 + j.top0 };
      });
      // geometria da barra: botões à direita do "iniciar", antes da bandeja
      var bw = Math.min(170, (W - 132 - 110 - 24) / 4 - 6);
      j.btn = j.tb.map(function (b, i) {
        var x = 132 + 12 + i * (bw + 6);
        b.style.left = x + 'px'; b.style.top = '5px'; b.style.width = bw + 'px'; b.style.height = (TB - 14) + 'px';
        return { x: x, y: H - TB + 5, w: bw, h: TB - 14 };
      });
      j.balloon.style.left = Math.min(W - 270, j.btn[3].x) + 'px';
      // trajeto do cursor: entra pelo canto, passa por cada botão de minimizar e termina no botão novo
      var b3 = j.btn[3], wp = [{ t: .03, x: W * .82, y: H * .78 }];
      j.wins.forEach(function (w, i) {
        var s = MIN0 + i * MINS;
        wp.push({ t: s + .4 * MINS, x: w.mx - 3, y: w.my - 2 }, { t: s + MINS, x: w.mx - 3, y: w.my - 2 });
      });
      wp.push({ t: .78, x: b3.x + 26, y: b3.y + b3.h / 2 }, { t: .84, x: b3.x + 26, y: b3.y + b3.h / 2 }, { t: .92, x: b3.x + 120, y: H * .7 });
      j.wp = wp;
      j.tk = function () {
        var p = j.p || 0, a = j.tb[3];
        if (p >= .6 && p < .8) a.style.background = Math.floor(performance.now() / 420) % 2 ? '#FF9A2E' : '#3B77E6';
      };
      gsap.ticker.add(j.tk);
    },
    render: function (j, p) {
      j.p = p;
      var W = VW(), H = VH(), pan = j.top0 * io(seg(p, 0, .1));
      gsap.set(j.inn, { y: -(1 - p) * H * CAT.T17.k });
      gsap.set(j.out, { y: pan, force3D: true });
      // barra de tarefas sobe no começo e desce no fim
      j.task.style.transform = 'translate3d(0,' + ((1 - oc(seg(p, .0, .08)) + ic(seg(p, .9, 1))) * (TB + 4)).toFixed(1) + 'px,0)';
      // janelas: clique no minimizar e voo até o botão
      j.wins.forEach(function (w, i) {
        var u = seg(p, MIN0 + i * MINS, MIN0 + (i + 1) * MINS), press = u >= .4, e = io3(seg(u, .5, 1)), b = j.btn[i];
        if (w.mb) w.mb.style.background = press && u < .9 ? '#0A0A0A' : w.mbBg;
        // w.y é a posição com a câmera já deslocada; a janela anda dentro da seção, que está com y = pan
        var x = (b.x - w.x) * e, y = (b.y - (w.y - j.top0 + pan)) * e;
        gsap.set(w.el, { transformOrigin: '0 0', x: x, y: y, scaleX: lerp(1, b.w / w.w, e), scaleY: lerp(1, b.h / w.h, e), opacity: 1 - seg(u, .8, 1), force3D: true });
        j.tb[i].style.background = u < .5 ? '#1A3FA8' : '#3B77E6';
        j.tb[i].style.boxShadow = u < .5 ? 'inset 2px 2px 0 rgba(0,0,0,.35)' : 'inset 0 2px 0 rgba(255,255,255,.25)';
      });
      // botão novo surge e pisca; depois do clique fica pressionado
      var a = j.tb[3], pop = oc(seg(p, .6, .64));
      a.style.opacity = pop; a.style.transform = 'scale(' + (.6 + .4 * pop).toFixed(3) + ')';
      if (p < .6 || p >= .8) a.style.background = p >= .8 ? '#1A3FA8' : '#3B77E6';
      var bl = oc(seg(p, .62, .66)) * (1 - seg(p, .78, .81));
      j.balloon.style.opacity = bl; j.balloon.style.transform = 'scale(' + (.85 + .15 * bl).toFixed(3) + ')';
      // cursor
      var wp = j.wp, k = 0;
      while (k < wp.length - 2 && p > wp[k + 1].t) k++;
      var t = io(seg(p, wp[k].t, wp[k + 1].t)), cx = lerp(wp[k].x, wp[k + 1].x, t), cy = lerp(wp[k].y, wp[k + 1].y, t);
      var pressing = (p >= .78 && p < .82);
      j.wins.forEach(function (w, i) { var u = seg(p, MIN0 + i * MINS, MIN0 + (i + 1) * MINS); if (u >= .4 && u < .5) pressing = true; });
      j.cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) scale(' + (pressing ? .82 : 1) + ')';
      j.cur.style.opacity = seg(p, .03, .07) * (1 - seg(p, .86, .92));
      // restauração: a seção nova cresce do botão até a tela cheia, recortada pela moldura
      var b3 = j.btn[3], r = io3(seg(p, .82, .97));
      if (p < .82) { j.inn.style.visibility = 'hidden'; j.frame.style.display = 'none'; return; }
      j.inn.style.visibility = '';
      var fx = lerp(b3.x, 0, r), fy = lerp(b3.y, 0, r), fw = lerp(b3.w, W, r), fh = lerp(b3.h, H, r), rad = 14 * (1 - r);
      j.inn.style.clipPath = r >= 1 ? '' : 'inset(' + fy.toFixed(1) + 'px ' + (W - fx - fw).toFixed(1) + 'px ' + (j.innH - fy - fh).toFixed(1) + 'px ' + fx.toFixed(1) + 'px round ' + rad.toFixed(1) + 'px)';
      var chrome = 1 - seg(p, .9, .98);
      j.frame.style.display = chrome > 0 ? 'block' : 'none';
      j.frame.style.left = (fx - 2) + 'px'; j.frame.style.top = (fy - 2) + 'px'; j.frame.style.width = (fw + 4) + 'px'; j.frame.style.height = (fh + 4) + 'px';
      j.frame.style.borderRadius = rad + 'px'; j.frame.style.opacity = chrome;
      j.bar.style.height = Math.min(32, fh * .5).toFixed(1) + 'px';
    },
    end: function (j) {
      if (j.tk) { gsap.ticker.remove(j.tk); j.tk = null; }
      (j.wins || []).forEach(function (w) { gsap.set(w.el, { clearProps: 'transform,opacity,transformOrigin' }); if (w.mb) w.mb.style.background = w.mbBg; });
      j.inn.style.visibility = ''; j.inn.style.clipPath = '';
      j.fw.style.display = j.tw.style.display = 'none';
    },
    kill: function (j) {
      CAT.T17.end(j);
      ScrollTrigger.removeEventListener('refreshInit', j.sizeSp);
      j.spacer.remove(); j.fw.remove(); j.tw.remove();
    }
  };

  FX.TRANSITIONS = CAT;

  // Fallbacks responsivos: T6 só no desktop; abaixo de 768px, T3, T6 e T7 viram T5.
  FX.resolveTransition = function (t, c) {
    if (!CAT[t]) return 'T5';
    if (c.mob && (t === 'T6' || t === 'T7' || t === 'T9')) return 'T5';
    if (!c.desk && t === 'T6') return 'T5';
    return t;
  };

  FX.validateJoints = function (list, bgs) {
    var w = [], n = {};
    list.forEach(function (j, i) {
      n[j.transition] = (n[j.transition] || 0) + 1;
      if (!CAT[j.transition]) w.push('transição desconhecida na emenda ' + (i + 1) + ': ' + j.transition);
      if (i && j.transition !== 'T5' && list[i - 1].transition === j.transition) w.push('emendas ' + i + ' e ' + (i + 1) + ' repetem ' + j.transition);
      if (j.transition === 'T8' && same(bgs[j.from - 1], bgs[j.to - 1])) w.push('T8 na emenda ' + (i + 1) + ' liga seções da mesma paleta');
    });
    if ((n.T3 || 0) > 1) w.push('T3 no máximo uma vez (hoje: ' + n.T3 + ')');
    if ((n.T2 || 0) > 2) w.push('T2 no máximo duas vezes (hoje: ' + n.T2 + ')');
    return w;
  };

  // Cria uma emenda. o: { type, out, inn, bgOut, bgIn, layer, prio }
  FX.joint = function (o) {
    var def = CAT[o.type] || CAT.T5, on = false, done = false;
    var sticky = o.type !== 'T6' && !def.still;
    var op = o.out.parentElement, outEl = op && op.classList.contains('pin-spacer') ? op : o.out;
    if (outEl !== o.out) outEl.style.zIndex = o.out.style.zIndex;
    var j = { side: o.side, keepBg: !!o.keepBg, srcOut: o.out, out: outEl, inn: o.inn, bgOut: o.bgOut, bgIn: o.bgIn, layer: o.layer, prio: o.prio,
      outZ: parseInt(o.out.style.zIndex, 10) || 0, inZ: parseInt(o.inn.style.zIndex, 10) || 0 };
    if (def.init) def.init(j);
    // A seção de saída é segurada pelo próprio navegador (position: sticky) quando o pé dela chega ao pé
    // da tela; a de entrada rola por cima em fluxo normal. Nada de compensar posição quadro a quadro.
    function holder(){ var p = j.out.parentElement; return p && p.classList.contains('pin-spacer') ? p : j.out; }
    // GSAP copia o inset do pino para o pin-spacer; bottom/left/right precisam ficar em auto para o sticky
    // obedecer só ao top.
    function unstick(){ var h = holder(); h.style.position = 'relative'; h.style.top = h.style.bottom = h.style.left = h.style.right = ''; if (h !== j.out) h.style.inset = ''; }
    function stick(){
      if (!sticky) return; var h = holder();
      if (h !== j.out) h.style.inset = 'auto';
      h.style.bottom = h.style.left = h.style.right = 'auto';
      h.style.position = 'sticky'; h.style.top = Math.min(0, VH() - h.offsetHeight) + 'px';
    }
    if (sticky) { ScrollTrigger.addEventListener('refreshInit', unstick); ScrollTrigger.addEventListener('refresh', stick); stick(); }
    function begin() {
      if (on || def.still) return; on = true;
      j.out.style.willChange = j.inn.style.willChange = 'transform, opacity, clip-path';
      if (def.begin) def.begin(j);
    }
    function stop() {
      if (!on) return; on = false;
      [j.out, j.inn].forEach(function (el) {
        if (!(el === j.inn && def.keepInn)) gsap.set(el, { clearProps: 'transform' });
        ['will-change', 'clip-path', 'opacity', 'box-shadow', 'transform-origin'].forEach(function (k) { el.style.removeProperty(k); });
      });
      j.out.style.zIndex = j.outZ; j.inn.style.zIndex = j.inZ;
      if (def.end) def.end(j);
    }
    // Coberta por completo, a seção de saída fica transparente para o navegador não pintá-la à toa
    // (continua no documento e focável).
    function covered(v){ if (def.still || v === done) return; done = v; j.out.style.opacity = v && sticky ? '0' : ''; }
    function update(p) {
      if (p <= 0 || p >= 1) { stop(); covered(p >= 1); if (def.rest) def.rest(j, p); return; }
      covered(false); begin(); def.render(j, p);
    }
    var rg = def.range ? def.range(j) : { trigger: j.inn, start: 'top bottom', end: 'top top' };
    j.st = ScrollTrigger.create({
      trigger: rg.trigger, start: rg.start, endTrigger: rg.endTrigger, end: rg.end, refreshPriority: o.prio,
      onUpdate: function (s) { update(s.progress); },
      onToggle: function (s) { if (!s.isActive) stop(); },
      onRefresh: function (s) { update(s.progress); }
    });
    return {
      st: j.st, type: o.type,
      kill: function () {
        j.st.kill(); stop(); covered(false);
        if (sticky) { ScrollTrigger.removeEventListener('refreshInit', unstick); ScrollTrigger.removeEventListener('refresh', stick); unstick(); }
        if (def.kill) def.kill(j);
        if (j.sweep) j.sweep.remove();
        if (j.swap) j.swap.remove();
      }
    };
  };
})();
