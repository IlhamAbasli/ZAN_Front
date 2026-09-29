/* ==========================================================================
   lib.js — ZAN promo videoları üçün kiçik motion toolkit
   Hər şey Canvas 2D + WebGL2 ilə çəkilir və tamamilə zamana bağlıdır:
   draw(ctx, t) eyni t üçün həmişə eyni kadrı verir → kadr-kadr render.
   ========================================================================== */
(function () {
  "use strict";
  const W = 1920, H = 1080;
  const Z = (window.Z = { W, H });

  //#region riyaziyyat, easing
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  Z.clamp = clamp;
  Z.lerp = (a, b, t) => a + (b - a) * t;
  Z.p = (t, a, b) => clamp((t - a) / (b - a));
  Z.smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const E = (Z.E = {
    lin: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: (t) => t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t) => { const s = 1.70158, c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
    outBackSoft: (t) => { const s = 1.05, c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outSine: (t) => Math.sin((t * Math.PI) / 2),
    outElastic: (t) => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  });
  Z.tw = (t, a, b, e = E.outCubic) => e(Z.p(t, a, b));
  //#endregion

  //#region rəng
  Z.hex = (h) => {
    if (Array.isArray(h)) return h;
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  Z.rgba = (c, a = 1) => { c = Z.hex(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  Z.mixc = (a, b, t) => { a = Z.hex(a); b = Z.hex(b); return a.map((v, i) => v + (b[i] - v) * t); };
  // k < 1 tündləşdirir, k > 1 ağa doğru açır
  Z.shade = (c, k) => { c = Z.hex(c); return k <= 1 ? c.map((v) => v * k) : c.map((v) => v + (255 - v) * (k - 1)); };
  //#endregion

  //#region təsadüf və küy (deterministik)
  Z.rng = (seed) => {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const h1 = (i, s) => {
    let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul((s | 0) + 0x165667b1, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 12;
    return (h >>> 0) / 4294967296;
  };
  Z.noise = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return Z.lerp(h1(i, seed), h1(i + 1, seed), u) * 2 - 1;
  };
  //#endregion

  //#region canvas bufferləri
  Z.buf = (w = W, h = H) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return { c, x: c.getContext("2d") };
  };
  Z.clear = (b) => {
    const x = b.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.filter = "none";
    x.shadowColor = "transparent"; x.shadowBlur = 0;
    x.clearRect(0, 0, b.c.width, b.c.height);
  };
  const named = {};
  Z.named = (name, w = W, h = H) => named[name] || (named[name] = Z.buf(w, h));
  //#endregion

  //#region şəkillər, məhsul spraytları
  Z.img = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("img " + src));
    i.src = src;
  });

  // şəffaf kənarları kəsib lazımi hündürlüyə endirir
  Z.sprite = async (src, maxH = 1000) => {
    const im = await Z.img(src);
    const t = Z.buf(im.width, im.height);
    t.x.drawImage(im, 0, 0);
    const d = t.x.getImageData(0, 0, im.width, im.height).data;
    let x0 = im.width, y0 = im.height, x1 = 0, y1 = 0;
    for (let y = 0; y < im.height; y += 2)
      for (let x = 0; x < im.width; x += 2)
        if (d[(y * im.width + x) * 4 + 3] > 12) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    const bw = x1 - x0 + 2, bh = y1 - y0 + 2, s = Math.min(1, maxH / bh);
    const o = Z.buf(Math.round(bw * s), Math.round(bh * s));
    o.x.imageSmoothingQuality = "high";
    o.x.drawImage(im, x0, y0, bw, bh, 0, 0, o.c.width, o.c.height);
    const spr = o.c;
    // döşəmədə əks: altdan kəsilmiş, çevrilmiş, aşağı doğru sönən
    const rh = Math.round(spr.height * 0.42);
    const r = Z.buf(spr.width, rh);
    r.x.save(); r.x.translate(0, rh); r.x.scale(1, -1);
    r.x.drawImage(spr, 0, spr.height - rh, spr.width, rh, 0, 0, spr.width, rh);
    r.x.restore();
    r.x.globalCompositeOperation = "destination-in";
    const g = r.x.createLinearGradient(0, 0, 0, rh);
    g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(0.55, "rgba(0,0,0,.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
    r.x.fillStyle = g; r.x.fillRect(0, 0, spr.width, rh);
    return { c: spr, w: spr.width, h: spr.height, refl: r.c, sheen: Z.buf(spr.width, spr.height) };
  };

  /*
    Məhsulu alt-mərkəz nöqtəsinə görə çəkir.
    o: { x, y (döşəmə), h (hündürlük), rot, alpha, sheen (0..1, <0 yox), refl, shadow, bright }
  */
  Z.product = (ctx, pr, o) => {
    const s = o.h / pr.h, w = pr.w * s, h = o.h;
    const alpha = o.alpha ?? 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    // kontakt kölgəsi
    if (o.shadow !== 0) {
      const sh = o.shadow ?? 0.55;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, w * 0.62);
      g.addColorStop(0, `rgba(0,0,0,${sh})`); g.addColorStop(0.6, `rgba(0,0,0,${sh * 0.3})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save(); ctx.translate(o.x, o.y); ctx.scale(1, 0.14); ctx.translate(-o.x, -o.y);
      ctx.fillStyle = g; ctx.fillRect(o.x - w, o.y - w, w * 2, w * 2);
      ctx.restore();
    }
    // əks
    const rot = o.rot || 0;
    const refl = (o.refl ?? 0.8) * clamp(1 - Math.abs(rot) / 0.12);
    if (refl > 0) {
      ctx.save(); ctx.globalAlpha *= refl;
      ctx.drawImage(pr.refl, o.x - w / 2, o.y + 2, w, pr.refl.height * s);
      ctx.restore();
    }
    ctx.translate(o.x, o.y - h / 2);
    if (rot) ctx.rotate(rot);
    if (o.bright != null && o.bright !== 1) ctx.filter = `brightness(${o.bright})`;
    if (o.drop) { ctx.shadowColor = o.drop[0]; ctx.shadowBlur = o.drop[1]; ctx.shadowOffsetY = o.drop[2]; }
    ctx.drawImage(pr.c, -w / 2, -h / 2, w, h);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.filter = "none";
    // parıltı zolağı: yalnız qutunun üstündə, diaqonal keçir
    if (o.sheen != null && o.sheen > 0 && o.sheen < 1) {
      const b = pr.sheen; Z.clear(b);
      b.x.drawImage(pr.c, 0, 0);
      b.x.globalCompositeOperation = "source-atop";
      const cx = Z.lerp(-pr.w * 0.6, pr.w * 1.6, o.sheen);
      const g = b.x.createLinearGradient(cx - pr.w * 0.28, 0, cx + pr.w * 0.28, pr.h * 0.35);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.45, "rgba(255,255,255,.55)");
      g.addColorStop(0.5, "rgba(255,255,255,.8)"); g.addColorStop(0.55, "rgba(255,255,255,.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      b.x.fillStyle = g; b.x.fillRect(0, 0, pr.w, pr.h);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha *= o.sheenAmt ?? 0.75;
      ctx.drawImage(b.c, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  };
  //#endregion

  //#region yollar (bezier) və fırça zolağı
  // pts: [p0, c1, c2, p1, c3, c4, p2, ...] — kub bezierlər zənciri; uzunluğa görə bərabər nümunələnir
  Z.path = (pts, n = 220) => {
    const raw = [];
    for (let s = 0; s + 3 < pts.length; s += 3) {
      const [a, b, c, d] = [pts[s], pts[s + 1], pts[s + 2], pts[s + 3]];
      for (let i = 0; i <= 120; i++) {
        if (s > 0 && i === 0) continue;
        const t = i / 120, m = 1 - t;
        raw.push([
          m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0],
          m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1],
        ]);
      }
    }
    const len = [0];
    for (let i = 1; i < raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    const total = len[len.length - 1], out = [];
    let j = 0;
    for (let i = 0; i <= n; i++) {
      const L = (i / n) * total;
      while (j < len.length - 2 && len[j + 1] < L) j++;
      const f = (L - len[j]) / (len[j + 1] - len[j] || 1);
      out.push({ x: Z.lerp(raw[j][0], raw[j + 1][0], f), y: Z.lerp(raw[j][1], raw[j + 1][1], f) });
    }
    for (let i = 0; i <= n; i++) {
      const a = out[Math.max(0, i - 1)], b = out[Math.min(n, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      out[i].nx = -dy / l; out[i].ny = dx / l;
    }
    return { s: out, n, total };
  };

  /*
    Fırça zolağı — ayrı-ayrı tüklərdən (bristle) ibarət.
    o: { to (0..1 fırçanın başı), from, width, bristles, seed, color | white, alpha,
         dry (quru uclar), wobble, shade, lw (tük qalınlığı əmsalı), gloss }
  */
  Z.bristles = (ctx, path, o) => {
    const S = path.s, N = path.n;
    const to = clamp(o.to ?? 1), from = o.from ?? 0;
    if (to <= from) return;
    const B = o.bristles ?? 56, width = o.width ?? 200, dry = o.dry ?? 0.12;
    const rnd = Z.rng(o.seed ?? 1);
    const base = o.color ? Z.hex(o.color) : [255, 255, 255];
    const shadeAmt = o.shade ?? 0.28, lwK = o.lw ?? 2.2, wob = o.wobble ?? 3;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let b = 0; b < B; b++) {
      const v = (b / (B - 1)) * 2 - 1 + (rnd() - 0.5) * (2 / B);
      const lw = (width / B) * (lwK + rnd() * 1.2);
      const u0 = from + rnd() * dry * 0.6;
      const lift = 1 - rnd() * dry;             // fırça qalxanda tüklər müxtəlif yerdə bitir
      const head = to - rnd() * (o.headJ ?? 0.012); // hərəkətdə baş demək olar düzdür
      const u1 = Math.min(head, lift);
      if (u1 <= u0) continue;
      const k = 1 - rnd() * shadeAmt;
      const a = (o.alpha ?? 1) * (0.62 + rnd() * 0.38);
      const col = base.map((c) => c * k);
      ctx.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      const i0 = Math.floor(u0 * N), i1 = Math.ceil(u1 * N);
      const seed = b * 13 + (o.seed ?? 1) * 7;
      for (let i = i0; i <= i1; i++) {
        const u = i / N, pt = S[i];
        // təzyiq: başlanğıcda sürətlə açılır, sonda bir az daralır
        const press = Z.smooth(0, 0.07, u) * 0.35 + 0.65 - 0.3 * Z.smooth(0.78, 1, u) * Math.abs(v);
        const off = (v * width) / 2 * press + Z.noise(u * 9 + b * 3.1, seed) * wob;
        const x = pt.x + pt.nx * off, y = pt.y + pt.ny * off;
        i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // yaş parıltı: bir neçə nazik açıq tük
    if (o.gloss) {
      const g = Z.rng((o.seed ?? 1) + 999);
      ctx.globalCompositeOperation = o.glossOp || "source-over";
      for (let k = 0; k < 7; k++) {
        const v = -0.75 + g() * 0.5 + (k % 2 ? 0.9 : 0);
        const u0 = from + g() * 0.2, u1 = Math.min(to, u0 + 0.25 + g() * 0.5);
        if (u1 <= u0) continue;
        ctx.strokeStyle = `rgba(255,255,255,${o.gloss * (0.3 + g() * 0.7)})`;
        ctx.lineWidth = 1 + g() * 2.5;
        ctx.beginPath();
        for (let i = Math.floor(u0 * N); i <= Math.ceil(u1 * N); i++) {
          const pt = S[i], off = (v * width) / 2 * 0.9;
          const x = pt.x + pt.nx * off, y = pt.y + pt.ny * off;
          i === Math.floor(u0 * N) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // göy qurşağı / qradiyent fırça: ağ tüklər → source-atop qradiyent → kölgə ilə səhnəyə
  Z.brushGrad = (ctx, path, o, stops, dir) => {
    const b = Z.named("brushgrad"); Z.clear(b);
    Z.bristles(b.x, path, { ...o, color: "#ffffff", shade: 0, gloss: 0 });
    b.x.globalCompositeOperation = "source-atop";
    const d = dir || [0, 0, W, 0];
    const g = b.x.createLinearGradient(d[0], d[1], d[2], d[3]);
    stops.forEach(([s, c]) => g.addColorStop(s, c));
    b.x.fillStyle = g; b.x.fillRect(0, 0, W, H);
    // tük izləri: tünd və açıq zolaqlar
    Z.bristles(b.x, path, { ...o, bristles: Math.round((o.bristles ?? 56) * 0.45), seed: (o.seed ?? 1) + 50, color: "#000000", alpha: 0.16, lw: 0.8, shade: 0, gloss: 0 });
    Z.bristles(b.x, path, { ...o, bristles: Math.round((o.bristles ?? 56) * 0.3), seed: (o.seed ?? 1) + 90, color: "#ffffff", alpha: 0.2, lw: 0.7, shade: 0, gloss: 0 });
    if (o.gloss) Z.bristles(b.x, path, { ...o, bristles: 0, gloss: o.gloss });
    b.x.globalCompositeOperation = "source-over";
    ctx.save();
    if (o.shadow) { ctx.shadowColor = `rgba(0,0,0,${o.shadow})`; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; }
    ctx.globalAlpha *= o.opacity ?? 1;
    ctx.drawImage(b.c, 0, 0);
    ctx.restore();
  };

  /*
    Boya ilə açılan keçid: növbəti səhnə böyük fırça zolaqları ilə "rənglənərək" görünür.
    drawNext(ctx) növbəti səhnəni çəkir; p 0..1.
  */
  const wipePaths = {};
  Z.wipe = (ctx, drawNext, p, o = {}) => {
    if (p <= 0) return;
    if (p >= 1) { drawNext(ctx); return; }
    const sb = Z.named("wipeScene"), mb = Z.named("wipeMask");
    Z.clear(sb); drawNext(sb.x);
    Z.clear(mb);
    const seed = o.seed ?? 3, dir = o.dir ?? 1, rows = o.rows ?? 3, tilt = o.tilt ?? -70;
    const key = seed + ":" + dir + ":" + rows + ":" + tilt;
    if (!wipePaths[key]) {
      const r = Z.rng(seed), arr = [];
      for (let k = 0; k < rows; k++) {
        const y = -40 + (k * (H + 80)) / (rows - 1);
        const x0 = dir > 0 ? -260 : W + 260, x1 = dir > 0 ? W + 420 : -420;
        const bend = (r() - 0.5) * 120;
        arr.push(Z.path([[x0, y - tilt], [Z.lerp(x0, x1, 0.33), y - tilt * 0.3 + bend], [Z.lerp(x0, x1, 0.66), y + tilt * 0.3 - bend], [x1, y + tilt]]));
      }
      wipePaths[key] = arr;
    }
    const paths = wipePaths[key], stag = o.stagger ?? 0.1, dur = 1 - stag * (rows - 1);
    const width = ((H + 80) / (rows - 1)) * 1.3;
    paths.forEach((pa, k) => {
      const kk = o.order === "center" ? Math.abs(k - (rows - 1) / 2) : k;
      const pk = E.inOutQuad(Z.p(p, kk * stag, kk * stag + dur));
      if (pk <= 0) return;
      Z.bristles(mb.x, pa, { to: pk, width, bristles: 90, seed: seed * 10 + k, dry: 0.05, lw: 2.6, shade: 0, wobble: 7, headJ: 0.006 });
    });
    sb.x.globalCompositeOperation = "destination-in";
    sb.x.drawImage(mb.c, 0, 0);
    sb.x.globalCompositeOperation = "source-over";
    // fırçanın başında növbəti səhnənin rəngində yaş boya zolağı
    if (o.color) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      paths.forEach((pa, k) => {
        const kk = o.order === "center" ? Math.abs(k - (rows - 1) / 2) : k;
        const pk = E.inOutQuad(Z.p(p, kk * stag, kk * stag + dur));
        if (pk <= 0) return;
        Z.bristles(ctx, pa, { to: Math.min(1, pk + 0.04), from: Math.max(0, pk - 0.22), width: width * 1.03, bristles: 90, seed: seed * 10 + k + 5, dry: 0.08, lw: 2.2, shade: 0.4, wobble: 7, color: o.color, gloss: 0.5, headJ: 0.008 });
      });
      ctx.restore();
    }
    // kənarda yüngül kölgə — boya qatının qalınlığı hiss olunsun
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetX = 10 * dir; ctx.shadowOffsetY = 6;
    ctx.drawImage(sb.c, 0, 0);
    ctx.restore();
  };
  //#endregion

  //#region tipoqrafiya
  Z.FONT_TITLE = "ZanTitle";
  Z.FONT_BODY = "ZanBody";
  Z.f = (size, kind = "title", weight = 400) =>
    kind === "title" ? `${size}px ${Z.FONT_TITLE}` : `${weight} ${size}px ${Z.FONT_BODY}`;

  Z.text = (ctx, str, x, y, o = {}) => {
    const a = o.alpha ?? 1;
    if (a <= 0) return;
    ctx.save();
    ctx.font = o.font;
    ctx.fillStyle = o.color || "#fff";
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = o.base || "alphabetic";
    ctx.letterSpacing = (o.ls || 0) + "px";
    ctx.globalAlpha *= a;
    if (o.blur > 0.3) ctx.filter = `blur(${o.blur}px)`;
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur ?? 30; ctx.shadowOffsetY = o.shadowY ?? 6; }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lineWidth || 2; ctx.strokeText(str, x, y); }
    else ctx.fillText(str, x, y);
    ctx.restore();
  };

  Z.measure = (ctx, str, font, ls = 0) => {
    ctx.save(); ctx.font = font; ctx.letterSpacing = ls + "px";
    const w = ctx.measureText(str).width; ctx.restore(); return w;
  };

  Z.wrap = (ctx, str, maxW, font, ls = 0) => {
    const words = str.split(" "), lines = [];
    let cur = "";
    words.forEach((w) => {
      const t = cur ? cur + " " + w : w;
      if (Z.measure(ctx, t, font, ls) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  };

  // maska içindən yuxarı qalxan sətir (p: 0..1 easing edilmiş)
  Z.lineUp = (ctx, str, x, y, p, o) => {
    if (p <= 0) return;
    const size = o.size, w = Z.measure(ctx, str, o.font, o.ls);
    const left = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
    ctx.save();
    ctx.beginPath(); ctx.rect(left - 40, y - size * 1.08, w + 80, size * 1.4); ctx.clip();
    Z.text(ctx, str, x, y + (1 - p) * size * 1.25, o);
    ctx.restore();
  };

  /*
    Söz-söz görünmə. parts: sətir və ya [{w, color}] massivi.
    o: { font, size, color, align, t0, stagger, dur, rise, blur, ls, alpha, ease }
  */
  Z.words = (ctx, parts, x, y, t, o) => {
    if (typeof parts === "string") parts = parts.split(" ").map((w) => ({ w }));
    const ls = o.ls || 0;
    const sp = Z.measure(ctx, " ", o.font, ls);
    const ws = parts.map((p) => Z.measure(ctx, p.w, o.font, ls));
    const total = ws.reduce((a, b) => a + b, 0) + sp * (parts.length - 1);
    let cx = o.align === "center" ? x - total / 2 : o.align === "right" ? x - total : x;
    const st = o.stagger ?? 0.06, dur = o.dur ?? 0.7, ease = o.ease || E.outCubic;
    parts.forEach((p, i) => {
      const q = ease(Z.p(t, o.t0 + i * st, o.t0 + i * st + dur));
      if (q > 0)
        Z.text(ctx, p.w, cx, y + (1 - q) * (o.rise ?? 28), {
          font: o.font, ls, color: p.color || o.color, align: "left",
          alpha: q * (o.alpha ?? 1), blur: (1 - q) * (o.blur ?? 10), shadow: o.shadow, shadowBlur: o.shadowBlur,
        });
      cx += ws[i] + sp;
    });
    return total;
  };

  // hərf-hərf görünmə (kerning prefiks ölçüsü ilə saxlanılır)
  Z.chars = (ctx, str, x, y, t, o) => {
    const ls = o.ls || 0, total = Z.measure(ctx, str, o.font, ls);
    const left = o.align === "center" ? x - total / 2 : o.align === "right" ? x - total : x;
    const st = o.stagger ?? 0.03, dur = o.dur ?? 0.6, ease = o.ease || E.outCubic;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === " ") continue;
      const q = ease(Z.p(t, o.t0 + i * st, o.t0 + i * st + dur));
      if (q <= 0) continue;
      const px = left + Z.measure(ctx, str.slice(0, i), o.font, ls);
      ctx.save();
      const cw = Z.measure(ctx, ch, o.font, 0);
      ctx.translate(px + cw / 2, y);
      const sc = Z.lerp(o.scaleFrom ?? 1, 1, q);
      ctx.scale(sc, sc);
      Z.text(ctx, ch, -cw / 2, (1 - q) * (o.rise ?? 40), { font: o.font, color: o.color, alpha: q * (o.alpha ?? 1), blur: (1 - q) * (o.blur ?? 12), shadow: o.shadow, shadowBlur: o.shadowBlur });
      ctx.restore();
    }
    return total;
  };

  // kiçik başlıq: qızılı xətt + böyük hərflər (saytdakı .ab-eyebrow ilə eyni dil)
  Z.eyebrow = (ctx, str, x, y, p, o = {}) => {
    if (p <= 0) return;
    const lineW = o.lineW ?? 46, font = Z.f(o.size ?? 19, "body", 700), ls = o.ls ?? 5;
    const q1 = E.outExpo(clamp(p / 0.6)), q2 = E.outCubic(clamp((p - 0.25) / 0.75));
    const w = Z.measure(ctx, str, font, ls);
    const total = lineW + 18 + w + (o.center ? lineW + 18 : 0);
    const left = o.center ? x - total / 2 : x;
    ctx.save();
    const g = ctx.createLinearGradient(left, 0, left + lineW, 0);
    g.addColorStop(0, o.c1 || "#f2cf6b"); g.addColorStop(1, o.c2 || "#ff4d67");
    ctx.fillStyle = g; ctx.globalAlpha *= o.alpha ?? 1;
    ctx.fillRect(left, y - 7, lineW * q1, 2);
    if (o.center) {
      const g2 = ctx.createLinearGradient(left + total - lineW, 0, left + total, 0);
      g2.addColorStop(0, o.c2 || "#ff4d67"); g2.addColorStop(1, o.c1 || "#f2cf6b");
      ctx.fillStyle = g2; ctx.fillRect(left + total - lineW * q1, y - 7, lineW * q1, 2);
    }
    ctx.restore();
    Z.text(ctx, str, left + lineW + 18 + (1 - q2) * -14, y, { font, ls, color: o.color || "rgba(255,255,255,.78)", alpha: q2 * (o.alpha ?? 1) });
  };
  //#endregion

  //#region fon effektləri
  Z.vignette = (ctx, amt = 0.55, cx = W / 2, cy = H / 2, r0 = 0.35, color = "0,0,0") => {
    const g = ctx.createRadialGradient(cx, cy, H * r0, cx, cy, W * 0.78);
    g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${amt})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };

  Z.glow = (ctx, x, y, r, color, a = 0.5, op = "screen") => {
    ctx.save();
    ctx.globalCompositeOperation = op;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Z.rgba(color, a)); g.addColorStop(0.45, Z.rgba(color, a * 0.35)); g.addColorStop(1, Z.rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };

  // parlaq boya damcısı (dairə + işıq)
  Z.drop = (ctx, x, y, r, color, a = 1) => {
    if (r <= 0.3 || a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const c = Z.hex(color);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, Z.rgba(Z.shade(c, 1.45))); g.addColorStop(0.35, Z.rgba(c)); g.addColorStop(1, Z.rgba(Z.shade(c, 0.55)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  let grain = null;
  const grainInit = () => {
    grain = [];
    for (let k = 0; k < 6; k++) {
      const b = Z.buf(256, 256), id = b.x.createImageData(256, 256), r = Z.rng(k * 77 + 5);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 128 + (r() + r() - 1) * 110;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
      }
      b.x.putImageData(id, 0, 0);
      grain.push(b.c);
    }
  };
  Z.grain = (ctx, frame, amt) => {
    const f = Math.round(frame);
    ctx.save();
    ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = amt;
    ctx.fillStyle = ctx.createPattern(grain[f % 6], "repeat");
    ctx.translate((f * 53) % 256, (f * 97) % 256);
    ctx.fillRect(-256, -256, W + 512, H + 512);
    ctx.restore();
  };
  //#endregion

  //#region maye boya (WebGL2 şeyder)
  const VS = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const FS = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform vec2 uRes; uniform vec3 uTo; uniform vec2 uPan;
  uniform float uScale, uWarp, uBump, uSpec, uShine, uMode, uBands, uEdge, uSolidAmt, uSwirl, uSwirlK, uGloss;
  uniform int uOct; uniform float uGain;
  uniform vec2 uSwirlC; uniform vec3 uC[4]; uniform vec3 uPal[8]; uniform int uPalN; uniform vec3 uSolid; uniform vec3 uLight;
  vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
  float gn(vec3 p){ vec3 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i),f), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
  float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<8;i++){ if(i>=uOct) break; s+=a*gn(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=uGain; } return s; }
  float field(vec2 p, out vec2 q, out vec2 r){
    q = vec2(fbm(vec3(p + uTo.xy, uTo.z)), fbm(vec3(p + vec2(5.2,1.3) - uTo.xy*.7, uTo.z + 2.1)));
    r = vec2(fbm(vec3(p + uWarp*q + vec2(1.7,9.2), uTo.z*1.3 + 4.2)), fbm(vec3(p + uWarp*q + vec2(8.3,2.8), uTo.z*1.3 + 6.4)));
    return fbm(vec3(p + uWarp*r, uTo.z*.6 + 8.1));
  }
  vec3 pal(float x){
    float n = float(uPalN); x = fract(x)*n; int i = int(floor(x)); float f = fract(x);
    f = smoothstep(.5-uEdge, .5+uEdge, f); int j = i+1; if(j>=uPalN) j=0;
    return mix(uPal[i], uPal[j], f);
  }
  vec2 sw(vec2 uv){ vec2 d = uv-uSwirlC; float r = length(d); float a = uSwirl*exp(-r*r*uSwirlK);
    float c=cos(a), s=sin(a); return uSwirlC + mat2(c,-s,s,c)*d; }
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    uv = sw(uv);
    vec2 p = uv*uScale + uPan;
    vec2 q, r; float f = field(p, q, r);
    float e = 2.0/uRes.y*uScale;
    vec2 q2, r2; float fx = field(p+vec2(e,0.), q2, r2); float fy = field(p+vec2(0.,e), q2, r2);
    vec3 n = normalize(vec3(-(fx-f)/e*uBump, -(fy-f)/e*uBump, 1.));
    vec3 col;
    if(uMode < .5){
      col = mix(uC[0], uC[1], smoothstep(-.35,.45,f));
      col = mix(col, uC[2], smoothstep(.15,1.05,length(q))*.85);
      col = mix(col, uC[3], smoothstep(.45,1.25,r.x+.55)*.55);
    } else {
      col = pal(f*uBands + length(r)*.9 + q.x*.4);
    }
    col = mix(col, uSolid, uSolidAmt);
    vec3 L = normalize(uLight);
    float diff = .74 + .38*dot(n, L);
    vec3 h = normalize(L + vec3(0,0,1));
    float spec = pow(max(dot(n,h),0.), uShine)*uSpec + pow(max(dot(n,h),0.), uShine*.18)*uGloss;
    o = vec4(col*diff + spec, 1.);
  }`;

  Z.Liquid = class {
    constructor(w = 960, h = 540) {
      const c = (this.c = document.createElement("canvas"));
      c.width = w; c.height = h;
      const gl = (this.gl = c.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false }));
      if (!gl) throw new Error("WebGL2 yoxdur");
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const pr = (this.pr = gl.createProgram());
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      ["uRes","uTo","uPan","uScale","uWarp","uBump","uSpec","uShine","uMode","uBands","uEdge","uSolidAmt","uSwirl","uSwirlK","uSwirlC","uC","uPal","uPalN","uSolid","uLight","uGloss","uOct","uGain"]
        .forEach((n) => (this.u[n] = gl.getUniformLocation(pr, n)));
      gl.viewport(0, 0, w, h);
    }
    render(o) {
      const gl = this.gl, u = this.u;
      const col = (h) => Z.hex(h).map((v) => v / 255);
      gl.uniform2f(u.uRes, this.c.width, this.c.height);
      gl.uniform3fv(u.uTo, o.to || [0, 0, 0]);
      gl.uniform2fv(u.uPan, o.pan || [0, 0]);
      gl.uniform1f(u.uScale, o.scale ?? 1.6);
      gl.uniform1f(u.uWarp, o.warp ?? 3.5);
      gl.uniform1f(u.uBump, o.bump ?? 0.6);
      gl.uniform1f(u.uSpec, o.spec ?? 0.4);
      gl.uniform1f(u.uShine, o.shine ?? 60);
      gl.uniform1f(u.uGloss, o.gloss ?? 0.08);
      gl.uniform1i(u.uOct, o.oct ?? 4);
      gl.uniform1f(u.uGain, o.gain ?? 0.45);
      gl.uniform1f(u.uMode, o.mode ?? 0);
      gl.uniform1f(u.uBands, o.bands ?? 2);
      gl.uniform1f(u.uEdge, o.edge ?? 0.18);
      gl.uniform1f(u.uSolidAmt, o.solidAmt ?? 0);
      gl.uniform3fv(u.uSolid, col(o.solid || "#000"));
      gl.uniform1f(u.uSwirl, o.swirl ?? 0);
      gl.uniform1f(u.uSwirlK, o.swirlK ?? 3);
      gl.uniform2fv(u.uSwirlC, o.swirlC || [0, 0]);
      gl.uniform3fv(u.uLight, o.light || [-0.5, 0.6, 0.65]);
      const c4 = (o.c || ["#000", "#333", "#777", "#fff"]).flatMap(col);
      gl.uniform3fv(u.uC, new Float32Array(c4));
      const pal = (o.pal || ["#000", "#fff"]).slice(0, 8);
      const pf = new Float32Array(24); pal.forEach((h, i) => pf.set(col(h), i * 3));
      gl.uniform3fv(u.uPal, pf);
      gl.uniform1i(u.uPalN, pal.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return this.c;
    }
  };
  //#endregion

  //#region render harness
  /*
    cfg: { duration, fps, draw(ctx, t), init(), grain, poster }
    window.__render(frame, fps, samples) → JPEG dataURL (motion blur: samples > 1)
  */
  Z.run = async (cfg) => {
    document.body.style.cssText = "margin:0;background:#000;overflow:hidden";
    const main = Z.buf(), sub = Z.buf();
    main.c.style.cssText = "display:block;width:100vw;max-width:100%;height:auto";
    document.body.appendChild(main.c);
    await Promise.all([document.fonts.load(`100px ${Z.FONT_TITLE}`), document.fonts.load(`400 100px ${Z.FONT_BODY}`), document.fonts.load(`700 100px ${Z.FONT_BODY}`)]);
    grainInit();
    if (cfg.init) await cfg.init();
    const fps = cfg.fps || 30;
    const frameAt = (frame, samples = 1, shutter = 0.5) => {
      if (samples <= 1) { Z.clear(main); cfg.draw(main.x, frame / fps, frame); }
      else {
        for (let s = 0; s < samples; s++) {
          const f = frame + (s / (samples - 1) - 0.5) * shutter;
          const t = cfg.loop ? f / fps : Math.max(0, Math.min(cfg.duration - 1e-4, f / fps)); // dövrdə blur başa keçir
          Z.clear(sub); cfg.draw(sub.x, t, f);
          main.x.globalAlpha = 1 / (s + 1);
          main.x.drawImage(sub.c, 0, 0);
        }
        main.x.globalAlpha = 1;
      }
      if (cfg.grain !== 0) Z.grain(main.x, frame, cfg.grain ?? 0.07);
    };
    window.__duration = cfg.duration;
    window.__fps = fps;
    window.__render = (frame, samples = 1, q = 0.95) => { frameAt(frame, samples); return main.c.toDataURL("image/jpeg", q); };
    // test üçün: bir neçə anı bir vərəqdə göstər
    window.__sheet = (times, cols = 3, w = 640) => {
      const h = Math.round((w * H) / W), rows = Math.ceil(times.length / cols);
      const sh = Z.buf(cols * w, rows * h);
      times.forEach((t, i) => {
        frameAt(t * fps, 1);
        const x = (i % cols) * w, y = Math.floor(i / cols) * h;
        sh.x.drawImage(main.c, x, y, w, h);
        sh.x.fillStyle = "rgba(0,0,0,.6)"; sh.x.fillRect(x, y, 70, 24);
        sh.x.fillStyle = "#fff"; sh.x.font = "16px monospace"; sh.x.fillText(t.toFixed(2) + "s", x + 6, y + 17);
        sh.x.strokeStyle = "#000"; sh.x.strokeRect(x, y, w, h);
      });
      return sh.c.toDataURL("image/jpeg", 0.85);
    };
    window.__ready = true;
    const q = new URLSearchParams(location.search);
    if (q.has("t")) frameAt(parseFloat(q.get("t")) * fps);
    else if (!navigator.webdriver) {
      const t0 = performance.now();
      const loop = () => { frameAt((((performance.now() - t0) / 1000) % cfg.duration) * fps); requestAnimationFrame(loop); };
      loop();
    }
  };
  //#endregion
})();
