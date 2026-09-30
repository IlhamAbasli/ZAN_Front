/* ==========================================================================
   product-page.js — məhsul səhifəsinin (product-detail.html) skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     product-detail.html, site.js → auth.js → shop.js-dən sonra
                (.NET MVC-də: Views/Shop/Details.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify, ZAN.store, ZAN.prefersReducedMotion),
                shop.js (ZAN.cart, ZAN.wishlist, ZAN.formatPrice,
                ZAN.notifyAddedToCart), auth.js (ZAN.auth.require),
                product-demo.js (demo: ?id= ilə məhsul məlumatını HTML-ə yazır),
                Swiper (tövsiyə olunan məhsullar karuseli)

   Bütün məlumat HTML-dən oxunur (MVC-də serverdə render olunur):
     #pd-main[data-id, data-unit, data-coverage, data-coats, data-coats-fixed]
     input[name="variant"][data-sku, data-code, data-price, data-old-price,
                           data-amount, data-stock]
   Seçilmiş çəki URL-də saxlanılır — paylaşılan link həmin çəkini açır:
     product-detail.html?id=1&v=10-kq
   Saxlama: localStorage "zan-recent" → son baxılan məhsullar
   ========================================================================== */

(function (ZAN) {
  "use strict";

  const root = document.getElementById("pd-main");
  if (!root) return;

  const reduceMotion = ZAN.prefersReducedMotion();

  //#region köməkçilər
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const setText = (name, text) => $$(`[data-pd="${name}"]`).forEach((el) => (el.textContent = text));
  const cleanText = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  // 3.5 → "3,5"; 12 → "12" (Azərbaycan yazılışı); digər dillərdə brauzerin formatı (en: 3.5)
  const numberFormat = ZAN.i18n.lang !== "az" ? new Intl.NumberFormat(ZAN.i18n.locale, { maximumFractionDigits: 2 }) : null;
  const formatNumber = function (value, digits) {
    const rounded = Number(value.toFixed(digits === undefined ? 1 : digits));
    return numberFormat ? numberFormat.format(rounded) : rounded.toString().replace(".", ",");
  };

  // vahid (kq / rulon) mətnin içində — tərcümə şablonla (ZAN.t)
  const perUnit = (price) =>
    product.unit === "kq" ? ZAN.t("{price} / kq", { price }) : ZAN.t("{price} / rulon", { price });

  // qısa "sıçrayış" animasiyası hər dəfə yenidən başlasın
  function pop(el, className) {
    if (!el || reduceMotion) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "text") node.textContent = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else node.setAttribute(key, value);
    });
    (children || []).forEach((child) => child && node.appendChild(child));
    return node;
  }
  //#endregion

  //#region məhsul
  const product = {
    id: String(root.dataset.id),
    // dildən asılı olmasın: səbətə və sevimlilərə Azərbaycanca ad yazılır
    name: ZAN.i18n.source($("#pd-title")),
    category: ZAN.i18n.source($(".pd-category", root)),
    categorySlug: document.getElementById("main").dataset.category || "",
    image: $(".pd-stage-img", root).getAttribute("src"),
    unit: root.dataset.unit || "kq",
    coverage: Number(root.dataset.coverage) || 0,
    coats: Number(root.dataset.coats) || 1,
    coatsFixed: root.hasAttribute("data-coats-fixed"),
  };

  const variants = $$('input[name="variant"]', root).map(function (input) {
    const d = input.dataset;
    return {
      input,
      label: input.closest(".pd-variant"),
      value: input.value,
      sku: d.sku || `${product.id}-${input.value}`,
      code: d.code || "",
      price: Number(d.price) || 0,
      oldPrice: Number(d.oldPrice) || null,
      amount: Number(d.amount) || 0,
      inStock: d.stock !== "out",
      size: cleanText($(".pd-variant-size", input.closest(".pd-variant"))),
    };
  });

  const unitPrice = (v) => (v.amount ? v.price / v.amount : 0);
  let current = null;
  //#endregion

  //#region çəki seçimi
  // vahid qiyməti (₼/kq) və "Ən sərfəli" nişanı — HTML-də yalnız çəki və qiymət var
  function decorateVariants() {
    const available = variants.filter((v) => v.inStock && v.amount);
    const best =
      available.length > 1 ? available.reduce((a, b) => (unitPrice(b) < unitPrice(a) ? b : a)) : null;

    variants.forEach(function (v) {
      const unitEl = $(".pd-variant-unit", v.label);
      if (unitEl) {
        unitEl.textContent = !v.inStock
          ? "Stokda yoxdur"
          : v.amount
            ? perUnit(ZAN.formatPrice(unitPrice(v)))
            : "";
      }
      v.label.classList.toggle("is-out", !v.inStock);

      const oldTag = $(".pd-variant-tag", v.label);
      if (oldTag) oldTag.remove();
      if (v === best) v.label.appendChild(el("span", { class: "pd-variant-tag", text: "Ən sərfəli" }));
    });
  }

  function selectVariant(v, options) {
    const opts = options || {};
    current = v;
    v.input.checked = true;

    setText("price", ZAN.formatPrice(v.price));
    setText("old-price", v.oldPrice ? ZAN.formatPrice(v.oldPrice) : "");
    setText("save", v.oldPrice ? ZAN.t("{amount} qənaət", { amount: ZAN.formatPrice(v.oldPrice - v.price) }) : "");
    setText("unit-price", v.amount ? perUnit(ZAN.formatPrice(unitPrice(v))) : "");
    setText("variant-label", v.size);
    setText("code", v.code);

    const stock = $('[data-pd="stock"]', root);
    stock.textContent = v.inStock ? "Stokda var" : "Stokda yoxdur";
    stock.classList.toggle("is-out", !v.inStock);
    root.classList.toggle("is-out", !v.inStock);

    $$("[data-pd-add]").forEach(function (button) {
      button.disabled = !v.inStock;
      $("span", button).textContent = v.inStock ? "Səbətə at" : "Stokda yoxdur";
    });
    qtyInput.disabled = !v.inStock;

    if (opts.animate) pop($(".pd-stage-size", root), "is-changed");
    if (opts.updateUrl) writeUrl();
    setQty(getQty());
    updateShareLinks();
  }

  function writeUrl() {
    const params = new URLSearchParams(location.search);
    params.set("id", product.id);
    params.set("v", current.value);
    history.replaceState(null, "", `?${params.toString()}${location.hash}`);
  }

  // başlanğıc çəki: URL (?v=) → HTML-də seçilmiş → stokda olan ilk
  function initialVariant() {
    const fromUrl = new URLSearchParams(location.search).get("v");
    return (
      variants.find((v) => v.value === fromUrl) ||
      variants.find((v) => v.input.checked) ||
      variants.find((v) => v.inStock) ||
      variants[0]
    );
  }

  variants.forEach((v) =>
    v.input.addEventListener("change", () => selectVariant(v, { animate: true, updateUrl: true })),
  );
  //#endregion

  //#region say və səbət
  const qtyInput = $(".pd-qty input", root);
  const qtyDec = $('.pd-qty [data-qty="dec"]', root);
  const qtyInc = $('.pd-qty [data-qty="inc"]', root);
  const totalEl = $('[data-pd="total"]', root);

  const getQty = () => Number(qtyInput.value) || 1;

  function setQty(value) {
    const n = Math.min(99, Math.max(1, parseInt(value, 10) || 1));
    const off = Boolean(current && !current.inStock);
    qtyInput.value = String(n);
    qtyDec.disabled = off || n <= 1;
    qtyInc.disabled = off || n >= 99;
    updateTotal();
  }

  // bir neçə ədəd seçiləndə ümumi məbləğ görünür
  function updateTotal() {
    if (!current) return;
    const n = getQty();
    totalEl.hidden = n < 2;
    if (n < 2) return;
    totalEl.innerHTML = "";
    totalEl.append(
      // açar boşluqsuz saxlanılır (norm) — qalın cəmdən əvvəlki boşluq ayrıca
      ZAN.t("Cəmi: {n} × {price} =", { n, price: ZAN.formatPrice(current.price) }) + " ",
      el("b", { text: ZAN.formatPrice(current.price * n) }),
    );
  }

  $(".pd-qty", root).addEventListener("click", function (e) {
    const button = e.target.closest("[data-qty]");
    if (!button) return;
    setQty(getQty() + (button.dataset.qty === "inc" ? 1 : -1));
  });
  qtyInput.addEventListener("change", () => setQty(qtyInput.value));

  // səbətdə hər çəki ayrı sətirdir (id = sku)
  const cartItem = (v) => ({
    id: v.sku,
    name: product.name,
    price: v.price,
    image: product.image,
    volume: v.size,
    url: `product-detail.html?id=${encodeURIComponent(product.id)}&v=${encodeURIComponent(v.value)}`,
  });

  function addCurrentToCart(button) {
    if (!current || !current.inStock) return;
    if (!ZAN.auth.require("cart")) return;

    const count = getQty();
    const item = cartItem(current);
    ZAN.cart.add(item, count);
    ZAN.notifyAddedToCart(item, count);
    pop(button, "is-added");
  }

  $$("[data-pd-add]").forEach((button) => button.addEventListener("click", () => addCurrentToCart(button)));
  //#endregion

  //#region sevimlilər
  // sevimlilər məhsul səviyyəsindədir (çəkidən asılı deyil) — kataloqdakı kartla eyni id
  const wishButton = $("[data-pd-wish]", root);

  function syncWish() {
    const active = ZAN.wishlist.has(product.id);
    wishButton.setAttribute("aria-pressed", String(active));
    wishButton.setAttribute("aria-label", active ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et");
  }

  wishButton.addEventListener("click", function () {
    if (!ZAN.auth.require("wishlist")) return;
    // sevimlilər səhifəsindəki kart seçilmiş çəkini göstərir
    const added = ZAN.wishlist.toggle({
      id: product.id,
      name: product.name,
      price: current.price,
      oldPrice: current.oldPrice,
      image: product.image,
      category: product.category,
      categorySlug: product.categorySlug,
      volume: current.size,
      url: `product-detail.html?id=${encodeURIComponent(product.id)}&v=${encodeURIComponent(current.value)}`,
      inStock: variants.some((v) => v.inStock),
    });
    ZAN.notify(added ? "success" : "info", product.name, {
      title: added ? "Sevimlilərə əlavə olundu" : "Sevimlilərdən çıxarıldı",
      icon: "heart",
      image: product.image,
    });
  });

  ZAN.wishlist.onChange(syncWish);
  //#endregion

  //#region qalereya
  const stage = $(".pd-stage", root);
  const stageImg = $(".pd-stage-img", root);
  const thumbs = $(".pd-thumbs", root);

  // tək şəkil olanda kiçik şəkillər lazım deyil
  if (thumbs.querySelectorAll("button").length < 2) thumbs.innerHTML = "";

  thumbs.addEventListener("click", function (e) {
    const thumb = e.target.closest("button[data-src]");
    if (!thumb) return;
    stageImg.src = thumb.dataset.src;
    $$("button", thumbs).forEach((b) => b.setAttribute("aria-pressed", String(b === thumb)));
  });

  // böyütmə: yalnız siçan ilə (toxunmalı ekranda səhifənin sürüşməsinə mane olmasın)
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function moveZoom(e) {
    // transform-origin şəklin öz (böyüdülməmiş) ölçüsünə görədir
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left - stageImg.offsetLeft) / stageImg.offsetWidth;
    const y = (e.clientY - rect.top - stageImg.offsetTop) / stageImg.offsetHeight;
    stageImg.style.setProperty("--zoom-x", `${Math.min(100, Math.max(0, x * 100))}%`);
    stageImg.style.setProperty("--zoom-y", `${Math.min(100, Math.max(0, y * 100))}%`);
  }

  stage.addEventListener("pointerenter", function (e) {
    if (!finePointer.matches || e.pointerType !== "mouse") return;
    moveZoom(e);
    stage.classList.add("is-zoomed");
  });
  stage.addEventListener("pointermove", function (e) {
    if (stage.classList.contains("is-zoomed")) moveZoom(e);
  });
  stage.addEventListener("pointerleave", () => stage.classList.remove("is-zoomed"));
  //#endregion

  //#region paylaşma
  // HTML: .pd-share. Linklər seçilmiş çəki ilə (?v=) qurulur.
  const shareBox = $(".pd-share", root);
  const shareToggle = $("[data-share-toggle]", shareBox);
  const shareMenu = $(".pd-share-menu", shareBox);
  const shareInput = $("[data-share-url]", shareBox);
  const nativeShare = $('[data-share="native"]', shareBox);

  function shareUrl() {
    const url = new URL(location.href);
    url.hash = "";
    url.searchParams.set("id", product.id);
    if (current) url.searchParams.set("v", current.value);
    return url.href;
  }

  const shareText = () => `${product.name} — ${current.size}, ${ZAN.formatPrice(current.price)}`;

  function updateShareLinks() {
    if (!current) return;
    const url = encodeURIComponent(shareUrl());
    const text = encodeURIComponent(shareText());
    const links = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    };
    Object.entries(links).forEach(([key, href]) => {
      const link = $(`[data-share="${key}"]`, shareBox);
      if (link) link.href = href;
    });
    shareInput.value = shareUrl();
  }

  function setShareOpen(open) {
    shareMenu.hidden = !open;
    shareToggle.setAttribute("aria-expanded", String(open));
    if (open) updateShareLinks();
  }

  shareToggle.addEventListener("click", () => setShareOpen(shareMenu.hidden));

  document.addEventListener("click", function (e) {
    if (!shareMenu.hidden && !shareBox.contains(e.target)) setShareOpen(false);
  });

  shareBox.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !shareMenu.hidden) {
      setShareOpen(false);
      shareToggle.focus();
    }
  });

  // sosial şəbəkə linki yeni pəncərədə açılır — menyu bağlansın
  $$(".pd-share-grid a", shareBox).forEach((link) => link.addEventListener("click", () => setShareOpen(false)));

  $('[data-share="copy"]', shareBox).addEventListener("click", function () {
    const url = shareUrl();
    const done = () =>
      ZAN.notify("success", "Linki istədiyiniz yerə yapışdıra bilərsiniz.", { title: "Link kopyalandı" });
    const failed = () =>
      ZAN.notify("warning", "Linki sahədən seçib əl ilə kopyalayın.", { title: "Kopyalamaq alınmadı" });

    ZAN.copyText(url).then(done, function () {
      // alınmadısa link sahədə seçili qalsın — əl ilə kopyalamaq asan olsun
      shareInput.select();
      failed();
    });
  });

  // telefonda sistemin paylaşma pəncərəsi (Instagram, Messenger ...)
  if (navigator.share) {
    nativeShare.hidden = false;
    nativeShare.addEventListener("click", function () {
      setShareOpen(false);
      navigator.share({ title: product.name, text: shareText(), url: shareUrl() }).catch(() => {
        /* istifadəçi pəncərəni bağladı */
      });
    });
  }
  //#endregion

  //#region tablar
  // WAI-ARIA tabs: ox düymələri, Home/End; tab dəyişəndə panel dərhal açılır
  const tabs = $$('#pd-details [role="tab"]');

  function activateTab(tab, focus) {
    tabs.forEach(function (t) {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tab.focus();
    // dar ekranda aktiv tab zolaqda görünsün
    tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", () => activateTab(tab, false));
    tab.addEventListener("keydown", function (e) {
      const last = tabs.length - 1;
      const next = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      activateTab(tabs[next], true);
    });
  });
  //#endregion

  //#region kalkulyator
  // lazım olan miqdar = sahə × qat ÷ sərfiyyat (+10% ehtiyat); sonra çəkilərdən
  // ən ucuz kombinasiya seçilir. Stokda olmayan çəkilər nəzərə alınmır.
  const calc = document.getElementById("pd-calc");
  const RESERVE = 1.1;
  const MAX_AREA = 10000;

  /**
   * Ən ucuz qablaşdırma: çəkilər böyükdən kiçiyə yoxlanılır. Kiçik çəkidən
   * özündən bir böyük çəkini əvəz edəcək qədərdən artıq götürülmür — bu, axtarışı
   * kiçik saxlayır (ən çox bir neçə yüz variant).
   * Bərabər qiymətdə daha az qab, sonra daha az artıq miqdar üstündür.
   */
  function cheapestPlan(options, need) {
    const sorted = options.slice().sort((a, b) => b.amount - a.amount);
    let best = null;

    function visit(index, remaining, plan, cost, packs) {
      if (remaining <= 1e-9 || index === sorted.length) {
        if (remaining > 1e-9) return;
        const excess = -remaining;
        if (
          !best ||
          cost < best.cost - 1e-9 ||
          (Math.abs(cost - best.cost) < 1e-9 && (packs < best.packs || (packs === best.packs && excess < best.excess)))
        ) {
          best = { plan: plan.slice(), cost, packs, excess };
        }
        return;
      }

      const v = sorted[index];
      const isLast = index === sorted.length - 1;
      const cap = index === 0 ? remaining : Math.min(remaining, sorted[index - 1].amount);
      const maxCount = Math.ceil(cap / v.amount - 1e-9);
      const from = isLast ? maxCount : 0;

      for (let count = from; count <= maxCount; count++) {
        if (count) plan.push({ variant: v, count });
        visit(index + 1, remaining - count * v.amount, plan, cost + count * v.price, packs + count);
        if (count) plan.pop();
      }
    }

    visit(0, need, [], 0, 0);
    return best;
  }

  if (calc && product.coverage) {
    const form = $(".pd-calc-form", calc);
    const out = (name) => $(`[data-calc="${name}"]`, calc);
    const inputs = {
      area: form.elements.area,
      length: form.elements.length,
      height: form.elements.height,
      openings: form.elements.openings,
    };
    const coatsBox = $("[data-calc-coats]", calc);
    const addButton = out("add");
    let plan = null;

    // qat sayı: məhsulun tövsiyəsi; divar kağızı və yapışdırıcıda seçim yoxdur
    coatsBox.hidden = product.coatsFixed;
    const coatInput = $(`input[name="coats"][value="${product.coats}"]`, calc);
    if (coatInput) coatInput.checked = true;

    const mode = () => form.elements["calc-mode"].value;
    const coats = () => (product.coatsFixed ? product.coats : Number(form.elements.coats.value) || 1);
    const num = (input) => Math.max(0, Number(String(input.value).replace(",", ".")) || 0);

    function readArea() {
      if (mode() === "area") return num(inputs.area);
      return Math.max(0, num(inputs.length) * num(inputs.height) - num(inputs.openings));
    }

    // miqdar: rulon tam ədəddir, kq-da 10-dan az olanda bir onluq rəqəmlə
    function formatNeed(value) {
      if (product.unit !== "kq") return ZAN.t("{n} rulon", { n: Math.ceil(value) });
      if (value < 1) return ZAN.t("{n} q", { n: Math.ceil((value * 1000) / 50) * 50 });
      return ZAN.t("{n} kq", { n: value < 10 ? formatNumber(Math.ceil(value * 10) / 10) : Math.ceil(value) });
    }

    function renderEmpty(message) {
      plan = null;
      out("need").textContent = "—";
      out("sum").textContent = "—";
      const list = out("packs");
      list.innerHTML = "";
      list.appendChild(el("li", { class: "is-empty", text: message }));
      addButton.disabled = true;
    }

    function update() {
      $$(".pd-calc-fields", calc).forEach((box) => (box.hidden = box.dataset.calcMode !== mode()));

      const area = readArea();
      const valid = area > 0 && area <= MAX_AREA;
      const activeInputs = mode() === "area" ? [inputs.area] : [inputs.length, inputs.height];
      activeInputs.forEach((input) => input.setAttribute("aria-invalid", String(!valid && input.value !== "" && num(input) <= 0)));

      out("area").textContent = valid
        ? product.coatsFixed
          ? ZAN.t("{area} m², 10% ehtiyat ilə", { area: formatNumber(area) })
          : ZAN.t("{area} m², {coats} qat, 10% ehtiyat ilə", { area: formatNumber(area), coats: coats() })
        : ZAN.t("Sahə 1–{max} m² arasında olmalıdır", { max: MAX_AREA });

      if (!valid) return renderEmpty("Sahəni daxil edin");

      const need = (area * coats() * RESERVE) / product.coverage;
      out("need").textContent = `≈ ${formatNeed(need)}`;

      const options = variants.filter((v) => v.inStock && v.amount > 0);
      if (!options.length) return renderEmpty("Hazırda stokda yoxdur");

      const result = cheapestPlan(options, need);
      plan = result ? result.plan : null;
      if (!plan) return renderEmpty("Hesablamaq mümkün olmadı");

      const list = out("packs");
      list.innerHTML = "";
      plan.forEach(({ variant, count }) =>
        list.appendChild(
          el("li", {}, [
            document.createTextNode(`${count} × ${variant.size}`),
            el("em", { text: ZAN.formatPrice(variant.price * count) }),
          ]),
        ),
      );
      out("sum").textContent = ZAN.formatPrice(result.cost);
      addButton.disabled = false;
    }

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", (e) => e.preventDefault());

    addButton.addEventListener("click", function () {
      if (!plan || !ZAN.auth.require("cart")) return;
      plan.forEach(({ variant, count }) => ZAN.cart.add(cartItem(variant), count));

      const summary = plan.map(({ variant, count }) => `${count} × ${variant.size}`).join(", ");
      ZAN.notifyAddedToCart({ name: `${product.name} — ${summary}`, image: product.image }, 1);
      pop(addButton, "is-added");
    });

    update();
  } else if (calc) {
    calc.hidden = true;
    $$('a[href="#pd-calc"]').forEach((link) => (link.hidden = true));
  }
  //#endregion

  //#region tövsiyə olunanlar
  // HTML: #region pd-related. Cari məhsul siyahıda olsa belə göstərilmir.
  const related = document.getElementById("pd-related");

  if (related) {
    const ownIds = new Set([product.id].concat(variants.map((v) => v.sku)));
    $$(".product-card", related).forEach(function (card) {
      if (ownIds.has(String(card.dataset.id))) card.closest(".swiper-slide").remove();
    });

    const slides = $$(".swiper-slide", related);
    if (!slides.length) {
      related.hidden = true;
    } else if (window.Swiper) {
      new Swiper($(".pd-related-swiper", related), {
        slidesPerView: 1.2,
        spaceBetween: 16,
        speed: reduceMotion ? 0 : 500,
        grabCursor: true,
        watchOverflow: true,
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: {
          prevSlideMessage: "Əvvəlki məhsullar",
          nextSlideMessage: "Növbəti məhsullar",
        },
        navigation: {
          prevEl: $(".pd-related-prev", related),
          nextEl: $(".pd-related-next", related),
        },
        breakpoints: {
          576: { slidesPerView: 2, spaceBetween: 18 },
          992: { slidesPerView: 3, spaceBetween: 20 },
          1200: { slidesPerView: 4, spaceBetween: 20 },
        },
      });
    }

    // "Hamısına bax" — məhsulun öz kateqoriyası
    const allLink = $(".pd-all", related);
    if (allLink && product.categorySlug) allLink.href = `shop.html?category=${product.categorySlug}`;
  }
  //#endregion

  //#region son baxılanlar
  const RECENT_KEY = "zan-recent";
  const RECENT_MAX = 8;
  const recentBox = document.getElementById("pd-recent");

  function readRecent() {
    const list = ZAN.store.get(RECENT_KEY, []);
    return Array.isArray(list) ? list.filter((item) => item && item.id) : [];
  }

  const writeRecent = (list) => ZAN.store.set(RECENT_KEY, list);

  function rememberProduct() {
    const prices = variants.map((v) => v.price);
    const entry = {
      id: product.id,
      name: product.name,
      category: product.category,
      categorySlug: product.categorySlug,
      image: product.image,
      price: Math.min(...prices),
      multiple: variants.length > 1,
      url: `product-detail.html?id=${encodeURIComponent(product.id)}`,
    };
    const list = [entry].concat(readRecent().filter((item) => String(item.id) !== product.id));
    writeRecent(list.slice(0, RECENT_MAX));
  }

  function renderRecent() {
    if (!recentBox) return;
    const others = readRecent().filter((item) => String(item.id) !== product.id).slice(0, 4);
    recentBox.hidden = others.length === 0;

    const list = $("[data-recent-list]", recentBox);
    list.innerHTML = "";
    others.forEach(function (item) {
      // bir neçə çəki varsa — "12,50 ₼-dən" (dillərdə "from 12.50 ₼")
      const price = item.multiple ? ZAN.t("{price}-dən", { price: ZAN.formatPrice(item.price) }) : ZAN.formatPrice(item.price);
      list.appendChild(
        el("li", {}, [
          el("a", { class: "pd-tint", href: item.url, dataset: { category: item.categorySlug || "" } }, [
            el("span", { class: "pd-recent-img" }, [el("img", { src: item.image, alt: "", loading: "lazy" })]),
            el("span", { class: "pd-recent-info" }, [
              el("small", { text: item.category || "" }),
              el("b", { text: item.name }),
              el("span", { text: price }),
            ]),
          ]),
        ]),
      );
    });
  }

  if (recentBox) {
    $("[data-recent-clear]", recentBox).addEventListener("click", function () {
      writeRecent(readRecent().filter((item) => String(item.id) === product.id));
      renderRecent();
    });
  }
  //#endregion

  //#region aşağı panel
  // Alış düymələri ekrandan yuxarı çıxanda aşağıda qısa panel görünür;
  // footer-in keçidləri görünəndə panel onları örtməsin deyə gizlənir.
  const bar = $("[data-pd-bar]");
  const buyBox = $("[data-pd-buy]", root);
  const footer = $(".footer-grid");

  if (bar && buyBox && "IntersectionObserver" in window) {
    let buyPassed = false;
    let footerVisible = false;
    const barButton = $("[data-pd-add]", bar);

    const sync = function () {
      const show = buyPassed && !footerVisible;
      bar.classList.toggle("is-visible", show);
      bar.setAttribute("aria-hidden", String(!show));
      barButton.tabIndex = show ? 0 : -1;
    };

    new IntersectionObserver(function (entries) {
      const entry = entries[0];
      buyPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    }).observe(buyBox);

    if (footer) {
      new IntersectionObserver(function (entries) {
        footerVisible = entries[0].isIntersecting;
        sync();
      }).observe(footer);
    }
  }
  //#endregion

  //#region init
  decorateVariants();
  selectVariant(initialVariant(), { animate: false, updateUrl: false });
  setQty(1);
  syncWish();
  rememberProduct();
  renderRecent();
  //#endregion
})(window.ZAN);
