(function(){
  var FX = window.PapoFX = window.PapoFX || {};
  FX.state = FX.state || {};
  if (FX.state.reduced === undefined) FX.state.reduced = false;
  if (FX.state.curtainUp === undefined) FX.state.curtainUp = true;
  FX._z = FX._z || 10;
  FX.isReduced = function(){ return !!FX.state.reduced; };
  FX.isTouch = function(){ return matchMedia('(hover: none), (pointer: coarse)').matches; };
  FX.isMobile = function(){ return innerWidth < 760; };

  FX.onReveal = function(cb){
    if (FX.state.curtainUp) { var dc = gsap.delayedCall(0, cb); return function(){ dc.kill(); }; }
    var h = function(){ window.removeEventListener('papo:revealed', h); cb(); };
    window.addEventListener('papo:revealed', h);
    return function(){ window.removeEventListener('papo:revealed', h); };
  };

  FX.hideReveals = function(el){
    var els = el.querySelectorAll('[data-reveal]');
    if (els.length) gsap.set(els, { opacity: 0, y: FX.isReduced() ? 0 : 28 });
  };
  FX.reveal = function(el){
    var els = [].slice.call(el.querySelectorAll('[data-reveal]'));
    if (!els.length) return;
    var red = FX.isReduced();
    ScrollTrigger.batch(els, { start: 'top 92%', once: true, onEnter: function(b){
      gsap.to(b, { opacity: 1, y: 0, duration: red ? .5 : .9, ease: 'power3.out', stagger: red ? 0 : .09, overwrite: true });
    }});
  };
  FX.float = function(el){
    if (FX.isReduced()) return;
    var m = FX.isMobile() ? .5 : 1;
    var tw = [].slice.call(el.querySelectorAll('[data-float]')).map(function(n, i){
      var a = (parseFloat(n.getAttribute('data-float')) || 8) * m;
      n.style.willChange = 'transform';
      return gsap.to(n, { y: '+=' + a, rotation: (i % 2 ? 1 : -1) * a * .15, duration: 2.4 + (i % 5) * .45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .18 });
    });
    if (tw.length) ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: function(s){ tw.forEach(function(t){ s.isActive ? t.resume() : t.pause(); }); } });
  };

  FX.drag = function(el, o){
    o = o || {};
    var h = o.handle ? (el.querySelector(o.handle) || el) : el, id = null, sx, sy, ox, oy;
    function pos(){ return [gsap.getProperty(el, 'x'), gsap.getProperty(el, 'y')]; }
    function down(e){
      if (o.ignore && e.target.closest && e.target.closest(o.ignore)) return;
      if (e.button > 0) return;
      id = e.pointerId; try { h.setPointerCapture(id); } catch(_){}
      sx = e.clientX; sy = e.clientY; var p = pos(); ox = p[0]; oy = p[1];
      el.style.zIndex = ++FX._z; o.onStart && o.onStart(el); e.preventDefault();
    }
    function move(e){ if (e.pointerId !== id) return; gsap.set(el, { x: ox + e.clientX - sx, y: oy + e.clientY - sy }); }
    function up(e){ if (e.pointerId !== id) return; id = null; var p = pos(); o.onEnd && o.onEnd(el, p[0], p[1]); }
    function key(e){
      var d = e.shiftKey ? 40 : 12;
      var k = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
      if (!k || e.target !== (o.keyTarget || h)) return;
      e.preventDefault(); gsap.set(el, { x: '+=' + k[0], y: '+=' + k[1] }); el.style.zIndex = ++FX._z;
      var p = pos(); o.onEnd && o.onEnd(el, p[0], p[1]);
    }
    var kt = o.keyTarget || h;
    h.style.touchAction = 'none';
    h.addEventListener('pointerdown', down); h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    kt.addEventListener('keydown', key);
    return function(){
      h.removeEventListener('pointerdown', down); h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
      kt.removeEventListener('keydown', key);
    };
  };

  FX.magnetic = function(el, s){
    s = s || .4;
    if (FX.isTouch() || FX.isReduced()) return function(){};
    var xt = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), yt = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
    function mv(e){
      var r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < Math.max(r.width, r.height) * .9) { xt(dx * s); yt(dy * s); } else { xt(0); yt(0); }
    }
    window.addEventListener('mousemove', mv, { passive: true });
    return function(){ window.removeEventListener('mousemove', mv); };
  };

  FX.noise = function(){
    if (FX._noise) return FX._noise;
    var s = 200, c = document.createElement('canvas'); c.width = c.height = s;
    var x = c.getContext('2d'), d = x.createImageData(s, s);
    for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255 | 0; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255; }
    x.putImageData(d, 0, 0);
    return (FX._noise = c.toDataURL());
  };

  // Kinetic grid (hero background): warps toward the pointer, ripples on click. Driven by gsap.ticker,
  // idles when nothing moves, pauses off-screen, static when reduced. Kept low-contrast behind type.
  FX.kineticGrid = function(canvas, host, o){
    o = o || {};
    var red = !!o.reduced, ctx = canvas.getContext('2d');
    var CELL = 64, INF = 240, WARP = 18, LERP = .08, WAVE = 55;
    var BASE = [255,255,255,.075], ACT = [235,240,107,.5];
    var W = 0, H = 0, dpr = 1, dirty = true, vis = true, str = 0, strT = 0;
    var m = { x: -9999, y: -9999 }, tg = { x: -9999, y: -9999 }, rip = [];
    function mix(a, b, t){ return 'rgba(' + Math.round(a[0]+(b[0]-a[0])*t) + ',' + Math.round(a[1]+(b[1]-a[1])*t) + ',' + Math.round(a[2]+(b[2]-a[2])*t) + ',' + (a[3]+(b[3]-a[3])*t).toFixed(3) + ')'; }
    function size(){
      W = host.clientWidth; H = host.clientHeight; dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true; if (red) draw(0);
    }
    function local(e){
      var r = host.getBoundingClientRect(), sx = W / (r.width || 1), sy = H / (r.height || 1);
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }
    function move(e){ var p = local(e); if (m.x < -9000) { m.x = p.x; m.y = p.y; } tg.x = p.x; tg.y = p.y; strT = 1; }
    function leave(){ strT = 0; }
    function click(e){ var p = local(e); rip.push({ x: p.x, y: p.y, r: 0, op: 1, born: performance.now() }); }
    function warp(gx, gy, c, r, cols, rows){
      var pin = Math.min(c / 1.5, (cols - 1 - c) / 1.5, 1) * Math.min(r / 1.5, (rows - 1 - r) / 1.5, 1);
      pin = pin * pin;
      var dx = gx - m.x, dy = gy - m.y, d = Math.sqrt(dx*dx + dy*dy);
      var pr = Math.max(0, 1 - d / INF) * pin * str, rx = 0, ry = 0;
      for (var i = 0; i < rip.length; i++) {
        var q = rip[i], qx = gx - q.x, qy = gy - q.y, qd = Math.sqrt(qx*qx + qy*qy), df = qd - q.r;
        if (Math.abs(df) < WAVE) {
          var s = (1 - Math.abs(df) / WAVE) * q.op * 12 * pin, a = Math.atan2(qy, qx), sg = df < 0 ? 1 : -1;
          rx += Math.cos(a) * s * sg; ry += Math.sin(a) * s * sg;
        }
      }
      if (d < INF && d > 0 && pin > 0 && str > 0) {
        var t = d / INF, e = (1 - t) * (1 - t) * Math.min(1, d / 60), w = e * WARP * pin * str, an = Math.atan2(dy, dx);
        return [gx - Math.cos(an) * w + rx, gy - Math.sin(an) * w + ry, pr];
      }
      return [gx + rx, gy + ry, pr];
    }
    function draw(now){
      ctx.clearRect(0, 0, W, H);
      for (var i = rip.length - 1; i >= 0; i--) {
        var age = (now - rip[i].born) / 1000; rip[i].r = Math.max(0, age * 380); rip[i].op = Math.max(0, 1 - age * 1.2);
        if (rip[i].op <= 0) rip.splice(i, 1);
      }
      var cols = Math.max(2, Math.ceil(W / CELL)) + 1, rows = Math.max(2, Math.ceil(H / CELL)) + 1;
      var cw = W / (cols - 1), ch = H / (rows - 1), P = [];
      for (var r = 0; r < rows; r++) { P[r] = []; for (var c = 0; c < cols; c++) P[r][c] = warp(c * cw, r * ch, c, r, cols, rows); }
      // inactive lines and nodes go out in one path each; only lit ones are stroked individually
      var hot = [];
      ctx.beginPath();
      function seg(a, b){
        var v = (a[2] + b[2]) / 2;
        if (v < .01) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } else hot.push(a, b, v);
      }
      for (r = 0; r < rows; r++) for (c = 0; c < cols - 1; c++) seg(P[r][c], P[r][c + 1]);
      for (c = 0; c < cols; c++) for (r = 0; r < rows - 1; r++) seg(P[r][c], P[r + 1][c]);
      ctx.strokeStyle = mix(BASE, ACT, 0); ctx.lineWidth = .8; ctx.stroke();
      for (i = 0; i < hot.length; i += 3) {
        var v = hot[i + 2], t = v * v * (3 - 2 * v);
        ctx.beginPath(); ctx.moveTo(hot[i][0], hot[i][1]); ctx.lineTo(hot[i + 1][0], hot[i + 1][1]);
        ctx.strokeStyle = mix(BASE, ACT, t); ctx.lineWidth = .8 + .5 * t; ctx.stroke();
      }
      var hn = [];
      ctx.beginPath();
      for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
        var p = P[r][c];
        if (p[2] < .01) { ctx.moveTo(p[0] + 1.4, p[1]); ctx.arc(p[0], p[1], 1.4, 0, 6.2832); } else hn.push(p);
      }
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      for (i = 0; i < hn.length; i++) {
        var q = hn[i], tq = q[2] * q[2] * (3 - 2 * q[2]);
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.4 + 1.4 * tq, 0, 6.2832);
        ctx.fillStyle = mix([255,255,255,.14], [235,240,107,.8], tq); ctx.fill();
      }
      for (i = 0; i < rip.length; i++) {
        ctx.beginPath(); ctx.arc(rip[i].x, rip[i].y, rip[i].r, 0, 6.2832);
        ctx.strokeStyle = 'rgba(235,240,107,' + (rip[i].op * .22).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    function tick(){
      if (!vis) return;
      var still = Math.abs(tg.x - m.x) < .1 && Math.abs(tg.y - m.y) < .1 && Math.abs(strT - str) < .002;
      if (still && !rip.length && !dirty) return;
      m.x += (tg.x - m.x) * LERP; m.y += (tg.y - m.y) * LERP; str += (strT - str) * .06;
      dirty = false; draw(performance.now());
    }
    var ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    ro ? ro.observe(host) : window.addEventListener('resize', size);
    size();
    if (red) { draw(0); return function(){ ro ? ro.disconnect() : window.removeEventListener('resize', size); }; }
    var io = window.IntersectionObserver ? new IntersectionObserver(function(es){ vis = es[0].isIntersecting; dirty = true; }) : null;
    io && io.observe(host);
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    host.addEventListener('click', click);
    gsap.ticker.add(tick);
    return function(){
      gsap.ticker.remove(tick); io && io.disconnect();
      ro ? ro.disconnect() : window.removeEventListener('resize', size);
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('click', click);
    };
  };

  // Perspective grid: WebGL floor receding to a horizon, scrolling toward the viewer. Paints its own ground
  // color so ground + lines can be retinted together via set(bg, line, alpha). Pauses off-screen.
  FX.perspectiveGrid = function(canvas, host, o){
    o = o || {};
    var red = !!o.reduced, horizon = o.horizon == null ? .42 : o.horizon;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = '#extension GL_OES_standard_derivatives : enable\nprecision mediump float;' +
      'uniform vec2 uRes;uniform float uT;uniform vec3 uBg;uniform vec3 uLn;uniform float uA;uniform float uH;uniform float uMx;' +
      'void main(){vec2 uv=gl_FragCoord.xy/uRes;float hy=1.-uH;float y=hy-uv.y;vec3 c=uBg;' +
      'float glow=exp(-abs(uv.y-hy)*38.)*.22;' +
      'if(y>0.){float asp=uRes.x/uRes.y;float z=.32/y;float x=(uv.x-.5+uMx*.04)*asp*z;' +
      'vec2 g=vec2(x*1.6,z*1.6+uT);vec2 d=abs(fract(g-.5)-.5)/max(fwidth(g),vec2(1e-4));' +
      'float l=1.-min(min(d.x,d.y),1.);float fade=smoothstep(0.,.3,y)*(1.-smoothstep(.55,1.,y)*.35);' +
      'c=mix(c,uLn,l*fade*uA);}' +
      'c=mix(c,uLn,glow*uA);gl_FragColor=vec4(c,1.);}';
    function sh(t, s){ var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uRes','uT','uBg','uLn','uA','uH','uMx'].forEach(function(n){ U[n] = gl.getUniformLocation(pr, n); });
    function rgb(h){ h = h.replace('#', ''); return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255]; }
    var b0 = rgb(o.bg || '#0A0A0A'), l0 = rgb(o.line || '#FFFFFF');
    var C = { br: b0[0], bg: b0[1], bb: b0[2], lr: l0[0], lg: l0[1], lb: l0[2], a: o.alpha == null ? .16 : o.alpha, sp: 1 };
    var t = 0, ex = 0, mx = 0, tmx = 0, vis = true, last = 0, W = 0, H = 0;
    function size(){
      var d = Math.min(window.innerWidth < 768 ? 1 : 1.25, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(host.clientWidth * d)); H = Math.max(1, Math.round(host.clientHeight * d));
      canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); draw();
    }
    function draw(){
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uT, t); gl.uniform1f(U.uH, horizon); gl.uniform1f(U.uMx, mx);
      gl.uniform3f(U.uBg, C.br, C.bg, C.bb); gl.uniform3f(U.uLn, C.lr, C.lg, C.lb); gl.uniform1f(U.uA, C.a);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // Relógio compartilhado entre todas as grades: duas seções com a mesma grade mostram exatamente o
    // mesmo quadro, então a troca entre elas não aparece.
    function tick(time){
      var dt = Math.min(.05, time - (last || time)); last = time;
      var ck = FX._gclock || (FX._gclock = { t: 0, at: -1 });
      if (ck.at !== time) { ck.at = time; if (!red) ck.t += dt * .32; }
      if (!red) ex += dt * .32 * (C.sp - 1);
      t = ck.t + ex;
      if (!vis) return;
      mx += (tmx - mx) * .06;
      draw();
    }
    function move(e){ tmx = (e.clientX / (window.innerWidth || 1) - .5) * 2; }
    var ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    ro ? ro.observe(host) : window.addEventListener('resize', size);
    var io = window.IntersectionObserver ? new IntersectionObserver(function(es){ vis = es[0].isIntersecting; }) : null;
    io && io.observe(host);
    if (!red) window.addEventListener('pointermove', move, { passive: true });
    gsap.ticker.add(tick);
    size();
    return {
      set: function(bgHex, lineHex, alpha, speed){
        var b = rgb(bgHex), l = rgb(lineHex);
        gsap.to(C, { br: b[0], bg: b[1], bb: b[2], lr: l[0], lg: l[1], lb: l[2], a: alpha, sp: speed || 1, duration: red ? 0 : .55, ease: 'power2.out', overwrite: true });
      },
      kill: function(){
        gsap.ticker.remove(tick); gsap.killTweensOf(C); io && io.disconnect();
        ro ? ro.disconnect() : window.removeEventListener('resize', size);
        window.removeEventListener('pointermove', move);
        var lx = gl.getExtension('WEBGL_lose_context'); lx && lx.loseContext();
      }
    };
  };

  // Section lifecycle: hide reveals under the intro curtain, run the section's signature once it lifts.
  // No refresh here: the shell refreshes ScrollTrigger once, after all sections and joints exist.
  FX.page = function(ref, run){
    var ctx = null, off = null, t = null, extra = [];
    function start(){
      var el = ref.current;
      if (!el || !window.gsap || !window.ScrollTrigger) { t = setTimeout(start, 40); return; }
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(function(){ FX.hideReveals(el); }, el);
      off = FX.onReveal(function(){
        if (!ctx) return;
        ctx.add(function(){
          var c = run(el, FX.isReduced());
          if (typeof c === 'function') extra.push(c);
          FX.reveal(el); FX.float(el);
        });
      });
    }
    function kill(){
      clearTimeout(t); off && off(); off = null;
      extra.forEach(function(f){ try { f(); } catch(e){} }); extra = [];
      if (ctx) { ctx.revert(); ctx = null; }
    }
    start();
    return { kill: kill, restart: function(){ kill(); start(); } };
  };
})();
