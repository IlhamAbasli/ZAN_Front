/* ==========================================================================
   visualizer-page.js — rəng vizualizatoru (visualizer.html)
   --------------------------------------------------------------------------
   Qoşulur:     visualizer.html, site.js → shop.js → visualizer-data.js-dən sonra
                (.NET MVC-də: Views/Visualizer/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), visualizer-data.js (kataloq, məkanlar)
   Stil:        assets/sass/pages/visualizer/

   Necə işləyir (qısaca):
     1. Hər məkan = əsas şəkil + hər səth üçün boz maska (0..255).
        Hazır məkanlarda maskalar SVG-dən çıxarılır, öz şəklində isə
        istifadəçi "ağıllı seçim" və fırça ilə özü çəkir.
     2. Rəngləmə xətti işıqda (linear RGB) aparılır: pikselin parlaqlığı
        səthin median parlaqlığına bölünür və seçilmiş rəngə vurulur.
        Beləcə səthin "orta" hissəsi rəngin özü kimi görünür, kölgə və
        işıq isə olduğu kimi qalır.
     3. Bütün vəziyyət (rənglər, maskalar) geri/irəli tarixçəsində saxlanır.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  const studio = document.getElementById("vz-studio");
  if (!studio || !ZAN.VZ_SCENES || !ZAN.VZ_FAMILIES) return;

  const notify = typeof ZAN.notify === "function" ? ZAN.notify : function () {};
  const $ = (sel) => studio.querySelector(sel);
  const $$ = (sel) => Array.from(studio.querySelectorAll(sel));

  //#region tərcümə
  // məkan, səth, rəng və ailə adları bir dəfə tərcümə olunur (i18n.js → ZAN.t) —
  // sonra bütün mətnlər (siyahılar, bildirişlər, yüklənən şəkil) hazır adla yığılır
  ZAN.VZ_FAMILIES.forEach(function (fam) {
    fam.name = ZAN.t(fam.name);
    fam.colors.forEach((entry) => (entry[0] = ZAN.t(entry[0])));
  });
  ZAN.VZ_SCENES.forEach(function (scene) {
    scene.name = ZAN.t(scene.name);
    scene.surfaces.forEach((surface) => (surface.name = ZAN.t(surface.name)));
  });
  //#endregion

  //#region rəng riyaziyyatı
  // sRGB ↔ xətti işıq cədvəlləri: piksel döngüsündə Math.pow çağırmamaq üçün
  const TO_LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  const LUT = 4096;
  const TO_SRGB = new Uint8ClampedArray(LUT + 1);
  for (let i = 0; i <= LUT; i++) {
    const l = i / LUT;
    TO_SRGB[i] = Math.round((l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055) * 255);
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // OKLab — insan gözünə uyğun rəng fəzası; uyğun rəng təklifləri bununla seçilir
  function toOklab(lin) {
    const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
    const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
    const s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }
  //#endregion

  //#region kataloq
  const COLORS = [];
  const BY_CODE = new Map();
  const TREND = new Set(ZAN.VZ_TREND || []);

  ZAN.VZ_FAMILIES.forEach(function (fam) {
    fam.colors.forEach(function (entry, i) {
      const rgb = hexToRgb(entry[1]);
      const lin = rgb.map((v) => TO_LIN[v]);
      const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
      const color = {
        code: fam.letter + (fam.start + i),
        name: entry[0],
        hex: entry[1].toUpperCase(),
        rgb: rgb,
        lin: lin,
        lab: toOklab(lin),
        lrv: Math.round(y * 100),
        family: fam.id,
        familyName: fam.name,
      };
      color.trend = TREND.has(color.code);
      COLORS.push(color);
      BY_CODE.set(color.code, color);
    });
  });

  const NEUTRAL_FAMILIES = ["white", "grey", "sand"];

  function nearest(target, used, pool) {
    let best = null;
    let bestD = Infinity;
    pool.forEach(function (c) {
      if (used.has(c.code)) return;
      const d =
        (c.lab[0] - target[0]) ** 2 + (c.lab[1] - target[1]) ** 2 + (c.lab[2] - target[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    });
    return best;
  }

  /**
   * Seçilmiş rəngə uyğun 4 rəng: OKLCh-də çalar dairəsi üzrə fırladılır
   * (yaxın tonlar ±30°, kontrast 180°) və kataloqdakı ən yaxın rəng götürülür.
   * Neytral rənglərdə çalar mənasızdır — orada açıq/tünd cüt və vurğu verilir.
   */
  function pairsFor(color) {
    const L = color.lab[0];
    const a = color.lab[1];
    const b = color.lab[2];
    const C = Math.hypot(a, b);
    const h = Math.atan2(b, a);
    const used = new Set([color.code]);
    const neutrals = COLORS.filter((c) => NEUTRAL_FAMILIES.includes(c.family));
    const out = [];

    function pick(label, target, pool) {
      const match = nearest(target, used, pool || COLORS);
      if (!match) return;
      used.add(match.code);
      out.push({ label: label, color: match });
    }
    function rotate(delta) {
      return [L, C * Math.cos(h + delta), C * Math.sin(h + delta)];
    }

    if (C < 0.035) {
      pick("Açıq cüt", [Math.min(0.97, L + 0.12), a, b], neutrals);
      pick("Tünd cüt", [Math.max(0.3, L - 0.22), a, b], neutrals);
      pick("İsti vurğu", [0.58, 0.08, 0.07]);
      pick("Sərin vurğu", [0.55, -0.05, -0.02]);
    } else {
      pick("Yaxın ton", rotate(0.52));
      pick("Yaxın ton", rotate(-0.52));
      pick("Kontrast", rotate(Math.PI));
      pick("Neytral fon", [0.93, a * 0.15, b * 0.15], neutrals);
    }
    return out;
  }

  function lrvTip(lrv) {
    if (lrv >= 60) return "Açıq ton — işığı yaxşı əks etdirir, kiçik otaqları geniş göstərir.";
    if (lrv >= 30) return "Orta ton — əksər otaqlar üçün balanslı, gündəlik seçim.";
    return "Tünd ton — vurğu divarı və işıqlı, geniş otaqlar üçün idealdır.";
  }
  //#endregion

  //#region seçilmişlər (localStorage)
  const FAV_KEY = "zan-vz-favs";
  // saxlama bağlıdırsa seçilmişlər yalnız bu sessiyada qalır
  const savedFavs = ZAN.store.get(FAV_KEY, []);
  let favs = new Set(Array.isArray(savedFavs) ? savedFavs : []);
  const saveFavs = () => ZAN.store.set(FAV_KEY, Array.from(favs));
  //#endregion

  //#region DOM
  const el = {
    frame: $("[data-vz-frame]"),
    before: $("[data-vz-before]"),
    canvas: $("[data-vz-canvas]"),
    loading: $("[data-vz-loading]"),
    hint: $("[data-vz-hint]"),
    hover: $("[data-vz-hover]"),
    brush: $("[data-vz-brush]"),
    drop: $("[data-vz-drop]"),
    compare: $("[data-vz-compare]"),
    compareRange: $("[data-vz-compare-range]"),
    sceneName: $("[data-vz-scene-name]"),
    sceneMeta: $("[data-vz-scene-meta]"),
    tools: $("[data-vz-phototools]"),
    size: $("[data-vz-size]"),
    sizeOut: $("[data-vz-size-out]"),
    tolerance: $("[data-vz-tolerance]"),
    toleranceOut: $("[data-vz-tolerance-out]"),
    toleranceWrap: $("[data-vz-tolerance-wrap]"),
    surfaces: $("[data-vz-surfaces]"),
    addSurface: $("[data-vz-add-surface]"),
    scenes: $("[data-vz-scenes]"),
    upload: $("[data-vz-upload]"),
    live: $("[data-vz-live]"),
    search: $("[data-vz-search]"),
    filters: $("[data-vz-filters]"),
    grid: $("[data-vz-grid]"),
    count: $("[data-vz-count]"),
    empty: $("[data-vz-empty]"),
    cur: {
      swatch: $("[data-vz-cur-swatch]"),
      name: $("[data-vz-cur-name]"),
      code: $("[data-vz-cur-code]"),
      family: $("[data-vz-cur-family]"),
      hex: $("[data-vz-cur-hex]"),
      rgb: $("[data-vz-cur-rgb]"),
      lrv: $("[data-vz-cur-lrv]"),
      lrvBar: $("[data-vz-cur-lrv-bar]"),
      tip: $("[data-vz-cur-tip]"),
      fav: $("[data-vz-fav]"),
      pairs: $("[data-vz-pairs]"),
      target: $("[data-vz-cur-target]"),
    },
  };
  const actions = {};
  $$("[data-vz-action]").forEach((btn) => (actions[btn.dataset.vzAction] = btn));

  const ctx = el.canvas.getContext("2d");
  const beforeCtx = el.before.getContext("2d");
  //#endregion

  //#region vəziyyət
  const SCENE_W = 1500;
  const SCENE_H = 1000;
  const PHOTO_MAX = 1400;
  const HISTORY_MAX = 40;
  // maska addımları iki tam Uint8Array saxlayır — böyük şəkildə yaddaş dolmasın
  const HISTORY_BYTES_MAX = 48 * 1024 * 1024;
  const MAX_LAYERS = 8;

  const state = {
    mode: "scene", // "scene" | "photo"
    sceneId: null,
    w: 0,
    h: 0,
    base: null, // Uint8ClampedArray RGBA
    smooth: null, // ağıllı seçim üçün yumşaldılmış surət (yalnız şəkil rejimi)
    Y: null, // Float32Array — hər pikselin xətti parlaqlığı
    out: null, // ImageData
    layers: [],
    active: null,
    color: null,
    history: [],
    future: [],
    compare: false,
    tool: "wand",
    flash: null,
  };

  const sceneCache = new Map(); // id → { base, masks }
  const sceneMemory = new Map(); // id → { surfaceId: code }
  let photoSession = null; // { w, h, base, layers, name }
  let layerSeq = 0;
  let hintDismissed = false;
  //#endregion

  //#region səhnə — SVG-dən şəkil və maskalar
  function svgDoc(scene, css) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="' + SCENE_W + '" height="' + SCENE_H + '">' +
      (css ? "<style>" + css + "</style>" : "") +
      scene.art() +
      "</svg>"
    );
  }

  /*
    Maska üçün CSS: hər şey qara, yalnız seçilmiş səth ağ. İşıq-kölgə
    təbəqələri (.shade) gizlənir, çünki onlar səthin bir hissəsidir.
    Səthə 2px ağ haşiyə verilir ki, qonşu səthlər arasında boşluq qalmasın.
  */
  function maskCss(id) {
    const s = '[data-s="' + id + '"]';
    return (
      "*{fill:#000!important;stroke:#000!important;opacity:1!important;fill-opacity:1!important;stroke-opacity:1!important;filter:none!important}" +
      ".shade,.shade *{display:none!important}" +
      '[fill="none"]{fill:none!important}' +
      '[stroke="none"],*:not([stroke]){stroke:none!important}' +
      s + "," + s + " *{fill:#fff!important;stroke:#fff!important;stroke-width:2px!important}"
    );
  }

  function rasterize(svg) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement("canvas");
        c.width = SCENE_W;
        c.height = SCENE_H;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0, SCENE_W, SCENE_H);
        resolve(x.getImageData(0, 0, SCENE_W, SCENE_H).data);
      };
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  function redChannel(rgba) {
    const n = rgba.length / 4;
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = rgba[i * 4];
    return mask;
  }

  async function buildScene(scene) {
    if (sceneCache.has(scene.id)) return sceneCache.get(scene.id);
    const jobs = [rasterize(svgDoc(scene, ""))].concat(
      scene.surfaces.map((s) => rasterize(svgDoc(scene, maskCss(s.id)))),
    );
    const results = await Promise.all(jobs);
    const data = { base: results[0], masks: results.slice(1).map(redChannel) };
    sceneCache.set(scene.id, data);
    return data;
  }

  function sceneById(id) {
    return ZAN.VZ_SCENES.find((s) => s.id === id);
  }
  //#endregion

  //#region mənbə — şəkli və təbəqələri yükləmək
  function setSource(w, h, base, layers) {
    state.w = w;
    state.h = h;
    state.base = base;
    state.layers = layers;
    state.active = layers[0] || null;
    state.history = [];
    state.future = [];
    state.flash = null;

    const n = w * h;
    const Y = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      Y[i] = 0.2126 * TO_LIN[base[p]] + 0.7152 * TO_LIN[base[p + 1]] + 0.0722 * TO_LIN[base[p + 2]];
    }
    state.Y = Y;
    state.smooth = state.mode === "photo" ? boxBlurRgb(base, w, h) : null;

    [el.canvas, el.before].forEach(function (c) {
      c.width = w;
      c.height = h;
    });
    el.frame.style.setProperty("--ar", (w / h).toFixed(4));
    state.out = ctx.createImageData(w, h);
    const beforeImg = beforeCtx.createImageData(w, h);
    beforeImg.data.set(base);
    beforeCtx.putImageData(beforeImg, 0, 0);
  }

  function makeLayer(id, name, mask) {
    return { id: id, name: name, mask: mask, box: computeBox(mask), color: null, yref: null };
  }

  function computeBox(mask) {
    const w = state.w || SCENE_W;
    const h = mask.length / w;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (mask[row + x]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  // hər yükləmənin nömrəsi: ardıcıl kliklərdə (və ya yükləmə gedərkən şəkil
  // seçiləndə) yalnız sonuncu nəticə tətbiq olunur
  let loadSeq = 0;

  async function loadScene(id, paint) {
    const scene = sceneById(id) || ZAN.VZ_SCENES[0];
    const token = ++loadSeq;
    rememberCurrent();
    setLoading(true);
    try {
      const data = await buildScene(scene);
      if (token !== loadSeq) return;
      state.mode = "scene";
      state.sceneId = scene.id;
      // piksel ölçüləri məlum olsun deyə w əvvəlcədən yazılır (computeBox üçün)
      state.w = SCENE_W;
      const layers = scene.surfaces.map((s, i) => makeLayer(s.id, s.name, data.masks[i]));
      setSource(SCENE_W, SCENE_H, data.base, layers);

      const colors = paint || sceneMemory.get(scene.id) || scene.start || {};
      state.layers.forEach(function (layer) {
        const c = BY_CODE.get(colors[layer.id]);
        if (c) layer.color = c;
      });
      afterSourceChange(scene.name, ZAN.t("{n} səth · hazır məkan", { n: scene.surfaces.length }));
    } catch (err) {
      if (token === loadSeq) notify("error", "Məkanı yükləmək alınmadı. Səhifəni yeniləyib yenidən yoxlayın.");
    } finally {
      if (token === loadSeq) setLoading(false);
    }
  }

  function loadPhotoFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      notify("warning", "Yalnız şəkil faylı seçin (JPG, PNG və ya WEBP).", { title: "Fayl uyğun deyil" });
      return;
    }
    setLoading(true);
    const token = ++loadSeq;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      if (token !== loadSeq) {
        URL.revokeObjectURL(url);
        return;
      }
      const k = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      rememberCurrent();
      state.mode = "photo";
      state.sceneId = null;
      state.w = w;
      const first = makeLayer("s1", "Səth 1", new Uint8Array(w * h));
      layerSeq = 1;
      setSource(w, h, x.getImageData(0, 0, w, h).data, [first]);
      photoSession = { w: w, h: h, base: state.base, layers: state.layers, thumb: c.toDataURL("image/jpeg", 0.7) };
      renderScenes();
      setTool("wand");
      afterSourceChange(ZAN.t("Mənim şəklim"), ZAN.t("{w} × {h} px · öz şəkliniz", { w, h }));
      setLoading(false);
      notify("info", "Rəngləmək istədiyiniz divara klikləyin — oxşar rəngli sahə avtomatik seçiləcək.", {
        title: "Şəkil yükləndi",
      });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      if (token !== loadSeq) return;
      setLoading(false);
      notify("error", "Bu şəkli açmaq alınmadı. JPG və ya PNG formatında başqa şəkil seçin.");
    };
    img.src = url;
  }

  function restorePhoto() {
    if (!photoSession) return;
    // gedən məkan yükləməsi bu şəkli əvəz etməsin
    loadSeq++;
    setLoading(false);
    rememberCurrent();
    state.mode = "photo";
    state.sceneId = null;
    state.w = photoSession.w;
    const layers = photoSession.layers;
    setSource(photoSession.w, photoSession.h, photoSession.base, layers);
    afterSourceChange(ZAN.t("Mənim şəklim"), ZAN.t("{w} × {h} px · öz şəkliniz", { w: photoSession.w, h: photoSession.h }));
  }

  // başqa məkana keçəndə rənglər yadda qalır — geri qayıdanda itmir
  function rememberCurrent() {
    if (state.mode === "scene" && state.sceneId) {
      const map = {};
      state.layers.forEach((l) => l.color && (map[l.id] = l.color.code));
      sceneMemory.set(state.sceneId, map);
    }
  }

  function afterSourceChange(name, meta) {
    el.sceneName.textContent = name;
    el.sceneMeta.textContent = meta;
    studio.dataset.mode = state.mode;
    el.tools.hidden = state.mode !== "photo";
    el.addSurface.hidden = state.mode !== "photo";
    setCompare(false);
    renderScenes();
    renderSurfaces();
    syncToolbar();
    syncUrl();
    requestRender();
  }

  function setLoading(on) {
    el.loading.hidden = !on;
    studio.classList.toggle("is-loading", on);
  }
  //#endregion

  //#region rəngləmə — kompozisiya
  let frameReq = 0;
  function requestRender() {
    if (frameReq) return;
    frameReq = requestAnimationFrame(function () {
      frameReq = 0;
      compose(ctx, state.out, false);
    });
  }

  // səthin median parlaqlığı: rəngin "özü" kimi görünəcək işıq səviyyəsi
  function medianY(layer) {
    const bins = new Float64Array(1024);
    const box = layer.box;
    const w = state.w;
    const mask = layer.mask;
    const Y = state.Y;
    let total = 0;
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0, i = y * w + box.x0; x <= box.x1; x++, i++) {
        const a = mask[i];
        if (a < 16) continue;
        bins[Math.min(1023, (Y[i] * 1023) | 0)] += a;
        total += a;
      }
    }
    let acc = 0;
    for (let b = 0; b < 1024; b++) {
      acc += bins[b];
      if (acc >= total / 2) return Math.max(0.02, (b + 0.5) / 1024);
    }
    return 0.5;
  }

  function paintLayer(out, layer) {
    if (layer.yref === null) layer.yref = medianY(layer);
    const inv = 1 / layer.yref;
    const cr = layer.color.lin[0] * LUT;
    const cg = layer.color.lin[1] * LUT;
    const cb = layer.color.lin[2] * LUT;
    const box = layer.box;
    const w = state.w;
    const mask = layer.mask;
    const Y = state.Y;
    const base = state.base;

    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0, i = y * w + box.x0; x <= box.x1; x++, i++) {
        const a = mask[i];
        if (!a) continue;
        let k = Y[i] * inv;
        // parlaq ləkələr rəngi ağartmasın deyə bir az sıxılır
        if (k > 1) k = 1 + (k - 1) * 0.7;
        const p = i * 4;
        const r = TO_SRGB[Math.min(LUT, (cr * k) | 0)];
        const g = TO_SRGB[Math.min(LUT, (cg * k) | 0)];
        const b = TO_SRGB[Math.min(LUT, (cb * k) | 0)];
        if (a === 255) {
          out[p] = r;
          out[p + 1] = g;
          out[p + 2] = b;
        } else {
          const t = a / 255;
          out[p] = base[p] + (r - base[p]) * t;
          out[p + 1] = base[p + 1] + (g - base[p + 1]) * t;
          out[p + 2] = base[p + 2] + (b - base[p + 2]) * t;
        }
      }
    }
  }

  // seçilmiş, amma hələ rənglənməmiş sahəni marka rəngi ilə işarələyir
  function tintLayer(out, layer, strength) {
    const box = layer.box;
    const w = state.w;
    const mask = layer.mask;
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0, i = y * w + box.x0; x <= box.x1; x++, i++) {
        const a = mask[i];
        if (!a) continue;
        const t = (a / 255) * strength;
        // zolaqlı işarə: seçim rəngdən fərqlənsin
        const stripe = ((x + y) >> 3) & 1 ? 1 : 0.6;
        const p = i * 4;
        out[p] = out[p] + (201 - out[p]) * t * stripe;
        out[p + 1] = out[p + 1] + (20 - out[p + 1]) * t * stripe;
        out[p + 2] = out[p + 2] + (44 - out[p + 2]) * t * stripe;
      }
    }
  }

  function compose(targetCtx, image, forExport) {
    if (!state.base) return;
    const out = image.data;
    out.set(state.base);
    state.layers.forEach(function (layer) {
      if (!layer.box) return;
      if (layer.color) paintLayer(out, layer);
      if (forExport) return;
      if (state.flash === layer) tintLayer(out, layer, 0.45);
      else if (!layer.color && state.mode === "photo" && layer === state.active) tintLayer(out, layer, 0.5);
    });
    targetCtx.putImageData(image, 0, 0);
  }

  function flashLayer(layer) {
    state.flash = layer;
    requestRender();
    clearTimeout(flashLayer.timer);
    flashLayer.timer = setTimeout(function () {
      state.flash = null;
      requestRender();
    }, 520);
  }
  //#endregion

  //#region tarixçə — geri / irəli
  // artıq icra olunmuş dəyişikliyi tarixçəyə yazır
  const entryBytes = (e) => (e.type === "mask" ? e.from.length + e.to.length : 0);

  function commit(entry) {
    state.history.push(entry);
    let bytes = state.history.reduce((sum, e) => sum + entryBytes(e), 0);
    while (state.history.length > 1 && (state.history.length > HISTORY_MAX || bytes > HISTORY_BYTES_MAX)) {
      bytes -= entryBytes(state.history.shift());
    }
    state.future.length = 0;
    afterChange();
  }

  function setMask(layer, mask) {
    layer.mask.set(mask);
    layer.box = computeBox(layer.mask);
    layer.yref = null;
  }

  function run(entry, forward) {
    switch (entry.type) {
      case "color":
        entry.layer.color = forward ? entry.to : entry.from;
        break;
      case "colors":
        entry.items.forEach((it) => (it.layer.color = forward ? it.to : it.from));
        break;
      case "mask":
        setMask(entry.layer, forward ? entry.to : entry.from);
        break;
      case "add":
      case "remove": {
        const adding = (entry.type === "add") === forward;
        if (adding) state.layers.splice(entry.index, 0, entry.layer);
        else state.layers.splice(state.layers.indexOf(entry.layer), 1);
        if (!state.layers.includes(state.active)) state.active = state.layers[0] || null;
        if (adding) state.active = entry.layer;
        break;
      }
    }
  }

  // dəyişikliyi icra edib tarixçəyə yazır
  function perform(entry) {
    run(entry, true);
    commit(entry);
  }

  function undo() {
    const entry = state.history.pop();
    if (!entry) return;
    run(entry, false);
    state.future.push(entry);
    afterChange();
    announce("Geri qaytarıldı");
  }

  function redo() {
    const entry = state.future.pop();
    if (!entry) return;
    run(entry, true);
    state.history.push(entry);
    afterChange();
    announce("Təkrarlandı");
  }

  function afterChange() {
    renderSurfaces();
    syncToolbar();
    syncUrl();
    requestRender();
  }
  //#endregion

  //#region rəng tətbiqi
  function applyColor(layer, color) {
    if (!layer || !color) return;
    if (!layer.box) {
      notify("info", "Əvvəlcə şəkildə bu səthin sahəsini seçin: divara klikləyin və ya fırça ilə çəkin.", {
        title: "Səth hələ boşdur",
      });
      return;
    }
    if (layer.color === color) return;
    perform({ type: "color", layer: layer, from: layer.color, to: color });
    announce(layer.name + ": " + color.code + " " + color.name);
  }

  function selectColor(color, apply) {
    if (!color) return;
    state.color = color;
    renderCurrent();
    syncPaletteSelection();
    if (apply && state.active) applyColor(state.active, color);
    else syncUrl();
  }

  function selectLayer(layer, flash) {
    state.active = layer;
    renderSurfaces();
    syncTarget();
    if (flash && layer.box) flashLayer(layer);
    else requestRender();
  }

  function resetColors() {
    const items = state.layers.filter((l) => l.color).map((l) => ({ layer: l, from: l.color, to: null }));
    if (!items.length) return;
    perform({ type: "colors", items: items });
    notify("info", "Bütün səthlər ilkin vəziyyətinə qaytarıldı.", {
      title: "Sıfırlandı",
      action: { label: "Geri al", onClick: undo },
    });
  }
  //#endregion

  //#region ağıllı seçim (şəkil rejimi)
  function boxBlurRgb(src, w, h) {
    const tmp = new Float32Array(w * h * 3);
    const dst = new Uint8ClampedArray(w * h * 3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const p = (y * w + xx) * 4;
          r += src[p];
          g += src[p + 1];
          b += src[p + 2];
          n++;
        }
        const q = (y * w + x) * 3;
        tmp[q] = r / n;
        tmp[q + 1] = g / n;
        tmp[q + 2] = b / n;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          const q = (yy * w + x) * 3;
          r += tmp[q];
          g += tmp[q + 1];
          b += tmp[q + 2];
          n++;
        }
        const q = (y * w + x) * 3;
        dst[q] = r / n;
        dst[q + 1] = g / n;
        dst[q + 2] = b / n;
      }
    }
    return dst;
  }

  /*
    Divarlarda rəng eyni qalır, işıq isə tədricən dəyişir. Ona görə məsafə
    parlaqlıq fərqinə az, rəng çalarına çox həssasdır. Hər piksel həm
    qonşusu ilə (kəskin kənarda dayanır), həm də başlanğıc nöqtə ilə
    (yavaş-yavaş başqa rəngə "sürüşməsin") müqayisə olunur.
  */
  function magicWand(px, py, tolerance) {
    const w = state.w;
    const h = state.h;
    const src = state.smooth;
    const n = w * h;
    const seen = new Uint8Array(n);
    const stack = new Int32Array(n);

    function feat(i) {
      const q = i * 3;
      const L = (src[q] + src[q + 1] + src[q + 2]) / 3;
      return [L, src[q] - L, src[q + 2] - L];
    }
    function dist(f1, f2) {
      return 0.3 * (f1[0] - f2[0]) ** 2 + (f1[1] - f2[1]) ** 2 + (f1[2] - f2[2]) ** 2;
    }

    const seedIdx = py * w + px;
    const seed = feat(seedIdx);
    const localMax = (tolerance * 0.6) ** 2;
    const seedMax = (tolerance * 2.2) ** 2;

    let sp = 0;
    let count = 1;
    let x0 = px, x1 = px, y0 = py, y1 = py;
    seen[seedIdx] = 1;
    stack[sp++] = seedIdx;

    while (sp) {
      const i = stack[--sp];
      const x = i % w;
      const y = (i - x) / w;
      const fi = feat(i);
      for (let k = 0; k < 4; k++) {
        let j;
        if (k === 0) { if (x === 0) continue; j = i - 1; }
        else if (k === 1) { if (x === w - 1) continue; j = i + 1; }
        else if (k === 2) { if (y === 0) continue; j = i - w; }
        else { if (y === h - 1) continue; j = i + w; }
        if (seen[j]) continue;
        const fj = feat(j);
        if (dist(fi, fj) > localMax || dist(seed, fj) > seedMax) continue;
        seen[j] = 1;
        stack[sp++] = j;
        count++;
        const jx = j % w;
        const jy = (j - jx) / w;
        if (jx < x0) x0 = jx;
        if (jx > x1) x1 = jx;
        if (jy < y0) y0 = jy;
        if (jy > y1) y1 = jy;
      }
    }

    return { region: seen, count: count, box: { x0: x0, y0: y0, x1: x1, y1: y1 } };
  }

  // kiçik dəlikləri doldurur (dilate 2 → erode 1) və kənarı yumşaldır
  function refineRegion(region, box) {
    const w = state.w;
    const h = state.h;
    const pad = 4;
    const bx0 = Math.max(0, box.x0 - pad), by0 = Math.max(0, box.y0 - pad);
    const bx1 = Math.min(w - 1, box.x1 + pad), by1 = Math.min(h - 1, box.y1 + pad);
    const bw = bx1 - bx0 + 1;
    const bh = by1 - by0 + 1;

    let cur = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) cur[y * bw + x] = region[(y + by0) * w + x + bx0] ? 255 : 0;
    }

    function morph(srcArr, useMax) {
      const tmp = new Uint8Array(bw * bh);
      const dst = new Uint8Array(bw * bh);
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          let v = srcArr[y * bw + x];
          if (x > 0) v = useMax ? Math.max(v, srcArr[y * bw + x - 1]) : Math.min(v, srcArr[y * bw + x - 1]);
          if (x < bw - 1) v = useMax ? Math.max(v, srcArr[y * bw + x + 1]) : Math.min(v, srcArr[y * bw + x + 1]);
          tmp[y * bw + x] = v;
        }
      }
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          let v = tmp[y * bw + x];
          if (y > 0) v = useMax ? Math.max(v, tmp[(y - 1) * bw + x]) : Math.min(v, tmp[(y - 1) * bw + x]);
          if (y < bh - 1) v = useMax ? Math.max(v, tmp[(y + 1) * bw + x]) : Math.min(v, tmp[(y + 1) * bw + x]);
          dst[y * bw + x] = v;
        }
      }
      return dst;
    }

    cur = morph(morph(cur, true), true);
    cur = morph(cur, false);

    // 3×3 orta qiymət — yumşaq kənar
    const soft = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= bh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= bw) continue;
            s += cur[yy * bw + xx];
            n++;
          }
        }
        soft[y * bw + x] = s / n;
      }
    }
    return { data: soft, x0: bx0, y0: by0, bw: bw, bh: bh };
  }

  function wandAt(p) {
    const layer = state.active;
    if (!layer) return;
    const tol = Number(el.tolerance.value);
    const res = magicWand(p.x, p.y, tol);
    if (res.count < 40) {
      notify("warning", "Bu nöqtədə səth tapılmadı. Dözümlülüyü artırın və ya fırçadan istifadə edin.");
      return;
    }
    const soft = refineRegion(res.region, res.box);
    const before = layer.mask.slice();
    const next = layer.mask.slice();
    const w = state.w;
    for (let y = 0; y < soft.bh; y++) {
      for (let x = 0; x < soft.bw; x++) {
        const i = (y + soft.y0) * w + x + soft.x0;
        const v = soft.data[y * soft.bw + x];
        if (v > next[i]) next[i] = v;
      }
    }
    setMask(layer, next);
    // setMask kopyalayır (layer.mask.set) — next ayrıca kopyalanmır
    commit({ type: "mask", layer: layer, from: before, to: next });

    if (res.count > state.w * state.h * 0.85) {
      notify("warning", "Seçim demək olar ki, bütün şəkli tutdu. Geri alıb dözümlülüyü azaldın.", {
        action: { label: "Geri al", onClick: undo },
      });
    }
    if (!layer.color && state.color) applyColor(layer, state.color);
  }
  //#endregion

  //#region fırça və pozan (şəkil rejimi)
  let stroke = null;

  function brushRadius() {
    const rect = el.canvas.getBoundingClientRect();
    return (Number(el.size.value) / 2) * (state.w / rect.width);
  }

  function stamp(mask, cx, cy, r, add) {
    const w = state.w;
    const h = state.h;
    const inner = r * 0.65;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const v = d <= inner ? 255 : 255 * (1 - (d - inner) / (r - inner));
        const i = y * w + x;
        if (add) {
          if (v > mask[i]) mask[i] = v;
        } else {
          const keep = 255 - v;
          if (keep < mask[i]) mask[i] = keep;
        }
      }
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  function growBox(layer, b) {
    if (!layer.box) layer.box = Object.assign({}, b);
    else {
      layer.box.x0 = Math.min(layer.box.x0, b.x0);
      layer.box.y0 = Math.min(layer.box.y0, b.y0);
      layer.box.x1 = Math.max(layer.box.x1, b.x1);
      layer.box.y1 = Math.max(layer.box.y1, b.y1);
    }
  }

  function strokeTo(p) {
    const layer = state.active;
    const add = state.tool === "brush";
    const r = brushRadius();
    const last = stroke.last || p;
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const steps = Math.max(1, Math.ceil(dist / (r * 0.3)));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const b = stamp(layer.mask, last.x + (p.x - last.x) * t, last.y + (p.y - last.y) * t, r, add);
      if (add) growBox(layer, b);
    }
    stroke.last = p;
    requestRender();
  }

  function beginStroke(p) {
    const layer = state.active;
    if (!layer) return;
    stroke = { layer: layer, before: layer.mask.slice(), last: null };
    strokeTo(p);
  }

  function endStroke() {
    if (!stroke) return;
    const layer = stroke.layer;
    layer.box = computeBox(layer.mask);
    layer.yref = null;
    commit({ type: "mask", layer: layer, from: stroke.before, to: layer.mask.slice() });
    if (state.tool === "brush" && !layer.color && state.color) applyColor(layer, state.color);
    stroke = null;
  }

  function setTool(tool) {
    state.tool = tool;
    const radio = studio.querySelector('input[name="vz-tool"][value="' + tool + '"]');
    if (radio) radio.checked = true;
    el.toleranceWrap.hidden = tool !== "wand";
    studio.dataset.tool = tool;
    el.brush.hidden = true;
  }
  //#endregion

  //#region kətan hadisələri
  function toPx(e) {
    const rect = el.canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * state.w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * state.h);
    return {
      x: Math.max(0, Math.min(state.w - 1, x)),
      y: Math.max(0, Math.min(state.h - 1, y)),
      cx: e.clientX - rect.left,
      cy: e.clientY - rect.top,
    };
  }

  function layerAt(p) {
    const i = p.y * state.w + p.x;
    let best = null;
    let bestV = 110;
    state.layers.forEach(function (l) {
      if (l.mask[i] > bestV) {
        bestV = l.mask[i];
        best = l;
      }
    });
    return best;
  }

  function dismissHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    el.hint.classList.add("is-gone");
  }

  el.canvas.addEventListener("pointermove", function (e) {
    if (!state.base || state.compare) return;
    const p = toPx(e);

    if (state.mode === "scene") {
      const layer = layerAt(p);
      el.canvas.classList.toggle("is-over-surface", !!layer);
      if (layer) {
        el.hover.hidden = false;
        el.hover.textContent = layer.name + (layer.color ? " · " + layer.color.code : "");
        el.hover.style.transform = "translate(" + (p.cx + 16) + "px," + (p.cy + 18) + "px)";
      } else el.hover.hidden = true;
      return;
    }

    if (state.tool !== "wand") {
      const size = Number(el.size.value);
      el.brush.hidden = false;
      el.brush.style.width = el.brush.style.height = size + "px";
      el.brush.style.transform = "translate(" + (p.cx - size / 2) + "px," + (p.cy - size / 2) + "px)";
    }
    if (stroke) strokeTo(p);
  });

  el.canvas.addEventListener("pointerleave", function () {
    el.hover.hidden = true;
    el.brush.hidden = true;
  });

  el.canvas.addEventListener("pointerdown", function (e) {
    if (!state.base || state.compare || e.button > 0) return;
    const p = toPx(e);
    dismissHint();

    if (state.mode === "scene") {
      const layer = layerAt(p);
      if (!layer) return;
      selectLayer(layer, false);
      if (state.color) applyColor(layer, state.color);
      return;
    }

    if (!state.active) {
      notify("info", "Əvvəlcə “Yeni səth” düyməsi ilə səth əlavə edin.");
      return;
    }
    if (state.tool === "wand") {
      setLoading(true);
      // spinner görünsün deyə ağır hesablama növbəti kadra saxlanılır
      requestAnimationFrame(() =>
        setTimeout(function () {
          wandAt(p);
          setLoading(false);
        }, 0),
      );
      return;
    }
    el.canvas.setPointerCapture(e.pointerId);
    beginStroke(p);
  });

  ["pointerup", "pointercancel"].forEach((type) => el.canvas.addEventListener(type, endStroke));

  // şəkli kətana sürüşdürüb buraxmaq
  ["dragenter", "dragover"].forEach(function (type) {
    el.frame.addEventListener(type, function (e) {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      el.drop.hidden = false;
    });
  });
  el.frame.addEventListener("dragleave", function (e) {
    if (!el.frame.contains(e.relatedTarget)) el.drop.hidden = true;
  });
  el.frame.addEventListener("drop", function (e) {
    e.preventDefault();
    el.drop.hidden = true;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadPhotoFile(file);
  });
  //#endregion

  //#region müqayisə (əvvəl / sonra)
  function setCompare(on) {
    state.compare = on;
    studio.classList.toggle("is-compare", on);
    el.compare.hidden = !on;
    actions.compare.setAttribute("aria-pressed", String(on));
    el.hover.hidden = true;
    el.brush.hidden = true;
    syncCompare();
  }

  function syncCompare() {
    const v = Number(el.compareRange.value);
    el.compare.style.setProperty("--pos", v + "%");
    el.canvas.style.clipPath = state.compare ? "inset(0 0 0 " + v + "%)" : "";
  }

  el.compareRange.addEventListener("input", syncCompare);
  //#endregion

  //#region alətlər paneli
  function syncToolbar() {
    actions.undo.disabled = !state.history.length;
    actions.redo.disabled = !state.future.length;
    actions.reset.disabled = !state.layers.some((l) => l.color);
    actions.share.hidden = state.mode !== "scene";
  }

  function syncUrl() {
    if (state.mode !== "scene" || !state.sceneId || !window.history.replaceState) return;
    const params = new URLSearchParams();
    params.set("scene", state.sceneId);
    const paint = state.layers.filter((l) => l.color).map((l) => l.id + "." + l.color.code);
    if (paint.length) params.set("paint", paint.join(","));
    if (state.color) params.set("color", state.color.code);
    try {
      window.history.replaceState(null, "", location.pathname + "?" + params.toString());
    } catch (e) {
      /* bəzi brauzerlər file:// ünvanında buna icazə vermir */
    }
  }

  const copyText = ZAN.copyText;

  function share() {
    syncUrl();
    copyText(location.href).then(
      () => notify("success", "Link kopyalandı — göndərdiyiniz şəxs eyni rəngləri görəcək.", { title: "Paylaşmağa hazırdır" }),
      () => notify("error", "Linki kopyalamaq alınmadı. Ünvan sətrindən əl ilə kopyalayın."),
    );
  }

  // PNG: şəkil + altında istifadə olunan rənglərin siyahısı
  async function download() {
    if (!state.base) return;
    try {
      await document.fonts.ready;
    } catch (e) {
      /* şriftlər yüklənməsə də sistem şrifti ilə davam edirik */
    }
    const w = state.w;
    const h = state.h;
    const used = state.layers.filter((l) => l.color && l.box);
    const scale = w / 1200;
    const pad = Math.round(36 * scale);
    const row = Math.round(46 * scale);
    const cols = w > 900 ? 2 : 1;
    const footer = pad * 2 + Math.round(40 * scale) + Math.ceil(Math.max(used.length, 1) / cols) * row;

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h + footer;
    const x = c.getContext("2d");
    const img = x.createImageData(w, h);
    compose(x, img, true);

    x.fillStyle = "#ffffff";
    x.fillRect(0, h, w, footer);
    x.fillStyle = "#c9142c";
    x.fillRect(0, h, w, Math.max(4, Math.round(6 * scale)));

    x.fillStyle = "#0d1520";
    x.font = "700 " + Math.round(26 * scale) + "px RobotoBold, Roboto, sans-serif";
    x.textBaseline = "top";
    x.fillText(ZAN.t("ZAN Boya · Rəng vizualizatoru"), pad, h + pad);

    x.font = Math.round(20 * scale) + "px Roboto, sans-serif";
    const top = h + pad + Math.round(48 * scale);
    if (!used.length) {
      x.fillStyle = "#55606c";
      x.fillText(ZAN.t("Rəng tətbiq olunmayıb"), pad, top);
    }
    used.forEach(function (l, i) {
      const cx = pad + (i % cols) * ((w - pad * 2) / cols);
      const cy = top + Math.floor(i / cols) * row;
      const r = Math.round(15 * scale);
      x.beginPath();
      x.arc(cx + r, cy + r, r, 0, Math.PI * 2);
      x.fillStyle = l.color.hex;
      x.fill();
      x.strokeStyle = "rgba(13,21,32,.15)";
      x.lineWidth = Math.max(1, scale);
      x.stroke();
      x.fillStyle = "#0d1520";
      x.fillText(l.name + " — " + l.color.code + " " + l.color.name + " (" + l.color.hex + ")", cx + r * 2 + Math.round(14 * scale), cy + r * 0.25);
    });

    c.toBlob(function (blob) {
      if (!blob) {
        notify("error", "Şəkli hazırlamaq alınmadı.");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "zan-vizualizator-" + (state.sceneId || "sekil") + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      notify("success", "Şəkil rənglərin siyahısı ilə birlikdə yükləndi.", { title: "Yükləndi" });
    }, "image/png");
  }

  studio.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-vz-action]");
    if (!btn || btn.disabled) return;
    switch (btn.dataset.vzAction) {
      case "undo":
        undo();
        break;
      case "redo":
        redo();
        break;
      case "compare":
        setCompare(!state.compare);
        break;
      case "reset":
        resetColors();
        break;
      case "share":
        share();
        break;
      case "download":
        download();
        break;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (key === "y" || (key === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  });

  studio.addEventListener("change", function (e) {
    if (e.target.name === "vz-tool") setTool(e.target.value);
  });

  function syncRangeOutputs() {
    el.sizeOut.textContent = el.size.value + " px";
    el.toleranceOut.textContent = el.tolerance.value;
  }
  el.size.addEventListener("input", syncRangeOutputs);
  el.tolerance.addEventListener("input", syncRangeOutputs);

  el.upload.addEventListener("change", function () {
    loadPhotoFile(el.upload.files[0]);
    el.upload.value = "";
  });
  //#endregion

  //#region səthlər siyahısı
  function renderSurfaces() {
    el.surfaces.textContent = "";
    state.layers.forEach(function (layer) {
      const li = document.createElement("li");
      li.className = "vz-surface-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vz-surface";
      btn.setAttribute("aria-pressed", String(layer === state.active));
      if (layer.color) btn.style.setProperty("--sw", layer.color.hex);
      else btn.classList.add("is-empty");

      const sw = document.createElement("span");
      sw.className = "vz-surface-sw";
      sw.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "vz-surface-text";
      const name = document.createElement("b");
      name.textContent = layer.name;
      const sub = document.createElement("small");
      sub.textContent = layer.color
        ? layer.color.code + " · " + layer.color.name
        : state.mode === "photo" && !layer.box
          ? "Sahə seçilməyib"
          : "Rəngsiz";
      text.append(name, sub);
      btn.append(sw, text);
      btn.addEventListener("click", () => selectLayer(layer, true));
      li.append(btn);

      if (layer.color) {
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "vz-surface-mini";
        clear.setAttribute("aria-label", ZAN.t("{name} — rəngi götür", { name: layer.name }));
        clear.title = "Rəngi götür";
        clear.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>';
        clear.addEventListener("click", () =>
          perform({ type: "color", layer: layer, from: layer.color, to: null }),
        );
        li.append(clear);
      }

      if (state.mode === "photo" && state.layers.length > 1) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "vz-surface-mini is-danger";
        del.setAttribute("aria-label", ZAN.t("{name} — səthi sil", { name: layer.name }));
        del.title = "Səthi sil";
        del.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>';
        del.addEventListener("click", function () {
          perform({ type: "remove", layer: layer, index: state.layers.indexOf(layer) });
          announce(ZAN.t("{name} silindi", { name: layer.name }));
        });
        li.append(del);
      }
      el.surfaces.append(li);
    });
    el.addSurface.disabled = state.layers.length >= MAX_LAYERS;
    syncTarget();
  }

  el.addSurface.addEventListener("click", function () {
    if (state.layers.length >= MAX_LAYERS) return;
    layerSeq += 1;
    const layer = makeLayer("s" + layerSeq, ZAN.t("Səth {n}", { n: layerSeq }), new Uint8Array(state.w * state.h));
    perform({ type: "add", layer: layer, index: state.layers.length });
    setTool("wand");
    announce(ZAN.t("{name} əlavə olundu", { name: layer.name }));
  });

  function syncTarget() {
    el.cur.target.textContent = state.active ? state.active.name : "—";
  }
  //#endregion

  //#region məkanlar
  function renderScenes() {
    el.scenes.textContent = "";
    ZAN.VZ_SCENES.forEach(function (scene) {
      el.scenes.append(
        sceneTile(scene.name, sceneThumb(scene), state.mode === "scene" && state.sceneId === scene.id, function () {
          if (state.mode === "scene" && state.sceneId === scene.id) return;
          loadScene(scene.id);
        }),
      );
    });
    if (photoSession) {
      el.scenes.append(
        sceneTile("Mənim şəklim", photoSession.thumb, state.mode === "photo", function () {
          if (state.mode !== "photo") restorePhoto();
        }),
      );
    }
  }

  const thumbCache = new Map();
  function sceneThumb(scene) {
    if (!thumbCache.has(scene.id)) {
      const svg = svgDoc(scene, "").replace('width="' + SCENE_W + '" height="' + SCENE_H + '"', 'width="360" height="240"');
      thumbCache.set(scene.id, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    }
    return thumbCache.get(scene.id);
  }

  function sceneTile(name, src, active, onClick) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vz-scene";
    btn.setAttribute("aria-pressed", String(active));
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.width = 180;
    img.height = 120;
    img.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = name;
    btn.append(img, label);
    btn.addEventListener("click", onClick);
    li.append(btn);
    return li;
  }
  //#endregion

  //#region palitra
  const filterState = { family: "all", query: "" };
  const swatches = new Map(); // code → button

  function buildFilters() {
    const chips = [
      { id: "all", label: "Hamısı" },
      { id: "trend", label: "Trend 2026" },
      { id: "fav", label: "Seçilmişlər" },
    ].concat(ZAN.VZ_FAMILIES.map((f) => ({ id: f.id, label: f.name, dot: f.colors[Math.floor(f.colors.length / 2)][1] })));

    chips.forEach(function (chip) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vz-chip";
      btn.dataset.family = chip.id;
      btn.setAttribute("aria-pressed", String(chip.id === filterState.family));
      if (chip.dot) {
        const dot = document.createElement("i");
        dot.style.background = chip.dot;
        dot.setAttribute("aria-hidden", "true");
        btn.append(dot);
      }
      btn.append(document.createTextNode(chip.label));
      if (chip.id === "fav") {
        const count = document.createElement("span");
        count.className = "vz-chip-count";
        count.dataset.vzFavCount = "";
        btn.append(count);
      }
      el.filters.append(btn);
    });

    el.filters.addEventListener("click", function (e) {
      const btn = e.target.closest(".vz-chip");
      if (!btn) return;
      filterState.family = btn.dataset.family;
      el.filters.querySelectorAll(".vz-chip").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      applyFilter();
    });
  }

  function buildGrid() {
    COLORS.forEach(function (c) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vz-swatch" + (c.lrv < 35 ? " is-dark" : "");
      btn.style.setProperty("--sw", c.hex);
      btn.dataset.code = c.code;
      btn.tabIndex = -1;
      btn.title = c.code + " · " + c.name;
      btn.setAttribute("aria-label", c.code + " " + c.name);
      btn.innerHTML = '<span class="vz-swatch-code">' + c.code + "</span>";
      if (c.trend) btn.insertAdjacentHTML("beforeend", '<span class="vz-swatch-trend" aria-hidden="true"></span>');
      swatches.set(c.code, btn);
      el.grid.append(btn);
    });

    el.grid.addEventListener("click", function (e) {
      const btn = e.target.closest(".vz-swatch");
      if (!btn) return;
      dismissHint();
      selectColor(BY_CODE.get(btn.dataset.code), true);
    });

    // ox düymələri ilə palitrada gəzmək (roving tabindex)
    el.grid.addEventListener("keydown", function (e) {
      const keys = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: "down", ArrowUp: "up", Home: "home", End: "end" };
      if (!(e.key in keys)) return;
      const visible = Array.from(el.grid.children).filter((b) => !b.hidden);
      const idx = visible.indexOf(document.activeElement);
      if (idx < 0) return;
      e.preventDefault();
      const cols = getComputedStyle(el.grid).gridTemplateColumns.split(" ").length;
      const move = keys[e.key];
      let next = idx;
      if (move === "down") next = idx + cols;
      else if (move === "up") next = idx - cols;
      else if (move === "home") next = 0;
      else if (move === "end") next = visible.length - 1;
      else next = idx + move;
      next = Math.max(0, Math.min(visible.length - 1, next));
      visible[idx].tabIndex = -1;
      visible[next].tabIndex = 0;
      visible[next].focus();
    });
  }

  function normalize(s) {
    return s
      .toLocaleLowerCase("az")
      .replace(/ə/g, "e")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/[\s#·-]+/g, "");
  }

  function applyFilter() {
    const q = normalize(filterState.query);
    let shown = 0;
    COLORS.forEach(function (c) {
      let ok = true;
      if (filterState.family === "trend") ok = c.trend;
      else if (filterState.family === "fav") ok = favs.has(c.code);
      else if (filterState.family !== "all") ok = c.family === filterState.family;
      if (ok && q) ok = normalize(c.code + c.name + c.hex).includes(q);
      swatches.get(c.code).hidden = !ok;
      if (ok) shown++;
    });
    el.count.textContent = ZAN.t("{n} rəng", { n: shown });
    el.empty.hidden = shown > 0;
    el.empty.textContent =
      filterState.family === "fav" && !favs.size
        ? "Hələ seçilmiş rəng yoxdur. Bəyəndiyiniz rəngin kartında ürək işarəsinə toxunun."
        : "Axtarışa uyğun rəng tapılmadı.";
    syncPaletteSelection();
  }

  function syncPaletteSelection() {
    let focusable = null;
    swatches.forEach(function (btn, code) {
      const on = state.color && state.color.code === code;
      btn.setAttribute("aria-pressed", String(!!on));
      btn.tabIndex = -1;
      if (on && !btn.hidden) focusable = btn;
    });
    if (!focusable) focusable = Array.from(el.grid.children).find((b) => !b.hidden);
    if (focusable) focusable.tabIndex = 0;
  }

  el.search.addEventListener("input", function () {
    filterState.query = el.search.value;
    applyFilter();
  });
  //#endregion

  //#region seçilmiş rəngin kartı
  function renderCurrent() {
    const c = state.color;
    if (!c) return;
    const cur = el.cur;
    cur.swatch.style.setProperty("--sw", c.hex);
    cur.swatch.classList.toggle("is-dark", c.lrv < 35);
    cur.name.textContent = c.name;
    cur.code.textContent = "ZAN " + c.code;
    cur.family.textContent = c.familyName + (c.trend ? " · Trend 2026" : "");
    cur.hex.textContent = c.hex;
    cur.rgb.textContent = c.rgb.join(", ");
    cur.lrv.textContent = c.lrv;
    cur.lrvBar.style.setProperty("--lrv", c.lrv + "%");
    cur.tip.textContent = lrvTip(c.lrv);
    syncFav();

    cur.pairs.textContent = "";
    pairsFor(c).forEach(function (pair) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vz-pair";
      btn.style.setProperty("--sw", pair.color.hex);
      btn.setAttribute("aria-label", ZAN.t(pair.label) + ": " + pair.color.code + " " + pair.color.name);
      btn.innerHTML =
        '<span class="vz-pair-sw" aria-hidden="true"></span><small></small><b></b>';
      btn.querySelector("small").textContent = pair.label;
      btn.querySelector("b").textContent = pair.color.name;
      btn.addEventListener("click", () => selectColor(pair.color, true));
      li.append(btn);
      cur.pairs.append(li);
    });
  }

  function syncFav() {
    const on = state.color && favs.has(state.color.code);
    el.cur.fav.setAttribute("aria-pressed", String(!!on));
    el.cur.fav.setAttribute("aria-label", on ? "Seçilmişlərdən çıxar" : "Seçilmişlərə əlavə et");
    const counter = studio.querySelector("[data-vz-fav-count]");
    if (counter) counter.textContent = favs.size ? String(favs.size) : "";
  }

  el.cur.fav.addEventListener("click", function () {
    const c = state.color;
    if (!c) return;
    if (favs.has(c.code)) favs.delete(c.code);
    else {
      favs.add(c.code);
      notify("success", ZAN.t("{color} seçilmişlərə əlavə olundu.", { color: c.code + " " + c.name }), { icon: "heart", title: ZAN.t("Yadda saxlandı") });
    }
    saveFavs();
    syncFav();
    if (filterState.family === "fav") applyFilter();
  });
  //#endregion

  //#region elan (ekran oxuyucu)
  function announce(text) {
    el.live.textContent = "";
    requestAnimationFrame(() => (el.live.textContent = text));
  }
  //#endregion

  //#region başlanğıc
  function parseUrl() {
    const params = new URLSearchParams(location.search);
    const out = { scene: params.get("scene"), color: BY_CODE.get((params.get("color") || "").toUpperCase()) };
    const paint = params.get("paint");
    if (paint) {
      out.paint = {};
      paint.split(",").forEach(function (pair) {
        const parts = pair.split(".");
        if (parts.length === 2 && BY_CODE.has(parts[1].toUpperCase())) out.paint[parts[0]] = parts[1].toUpperCase();
      });
    }
    return out;
  }

  buildFilters();
  buildGrid();
  syncRangeOutputs();
  setTool("wand");

  const initial = parseUrl();
  const firstScene = sceneById(initial.scene) || ZAN.VZ_SCENES[0];
  let startPaint = initial.paint;
  // ?color=... ilə gəlinibsə (məs. əsas səhifədən) rəng birinci səthə çəkilir
  if (!startPaint && initial.color) {
    startPaint = {};
    startPaint[firstScene.surfaces[0].id] = initial.color.code;
  }
  const startCode = startPaint && Object.values(startPaint)[0];
  state.color = initial.color || BY_CODE.get(startCode) || BY_CODE.get(Object.values(firstScene.start || {})[0]) || COLORS[0];

  applyFilter();
  renderCurrent();
  loadScene(firstScene.id, startPaint);
  //#endregion
})(window.ZAN);
