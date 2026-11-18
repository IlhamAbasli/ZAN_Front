/* ==========================================================================
   wallpapers-page.js — divar kağızı səhifələrinin skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     wallpapers.html və wallpaper-catalog.html, wallpaper-data.js-dən sonra
                (.NET MVC-də: Views/Wallpapers/*.cshtml → @section Scripts)
   Asılılıqlar: wallpaper-data.js (window.ZAN_WALLPAPERS), site.js (ZAN.notify,
                ZAN.escapeHtml), auth.js (ZAN.auth), shop.js (ZAN.wishlist, ZAN.formatPrice,
                kartdakı "Sevimlilər" düyməsi)

   Divar kağızları onlayn satılmır — səbətə atmaq yoxdur, yalnız sevimlilər
   (sevimlilər səhifəsində də: wishlist-page.js → canBuy).

   Bölmələr:
     overview — wallpapers.html: kataloq kartlarında dizayn sayı və qiymət
     catalog  — wallpaper-catalog.html?c=<slug>: başlıq, dizayn kartları, kod axtarışı
     viewer   — dizaynın böyük baxışı (<dialog>), #<kod> ilə birbaşa açılır
   ========================================================================== */

(function (ZAN) {
  "use strict";

  const CATALOGS = window.ZAN_WALLPAPERS || [];
  if (!CATALOGS.length) return;

  const IMAGE_DIR = "./assets/images/wallpapers/";
  const UNIT = "1 rulon";
  const bySlug = (slug) => CATALOGS.find((c) => c.slug === slug);
  const imageOf = (catalog, code, small) => `${IMAGE_DIR}${catalog.slug}/${code}${small ? "-sm" : ""}.webp`;
  const pageUrl = (catalog, code) => `wallpaper-catalog.html?c=${catalog.slug}${code ? "#" + code : ""}`;
  const esc = ZAN.escapeHtml;

  //#region overview
  // HTML: wallpapers.html → [data-wp-count="<slug>"], [data-wp-price="<slug>"]
  document.querySelectorAll("[data-wp-count]").forEach(function (el) {
    const catalog = bySlug(el.dataset.wpCount);
    if (!catalog || !catalog.designs.length) return;
    el.textContent = ZAN.t("{n} dizayn", { n: catalog.designs.length });
    el.hidden = false;
  });
  document.querySelectorAll("[data-wp-price]").forEach(function (el) {
    const catalog = bySlug(el.dataset.wpPrice);
    if (catalog) el.textContent = ZAN.formatPrice(catalog.price);
  });
  //#endregion

  //#region catalog
  const grid = document.getElementById("wc-grid");
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const catalog = bySlug(params.get("c")) || CATALOGS[0];
  const productName = (code) => `${catalog.name} · ${code}`;

  // başlıq
  document.querySelectorAll("[data-wc-name]").forEach((el) => (el.textContent = catalog.name));
  document.querySelectorAll("[data-wc-price]").forEach((el) => (el.textContent = ZAN.formatPrice(catalog.price)));
  document.querySelectorAll("[data-wc-count]").forEach((el) => (el.textContent = String(catalog.designs.length)));
  // "Divar kağızı kataloqu — ZAN Boya" → "Simple — Divar kağızı kataloqu — ZAN Boya"
  document.title = `${catalog.name} — ${document.title}`;
  const cover = document.querySelector("[data-wc-cover]");
  if (cover && catalog.cover) cover.src = catalog.cover;
  if (catalog.color) document.getElementById("wc-hero").style.setProperty("--wc", catalog.color);

  // kataloqlar arası keçid
  const tabs = document.querySelector("[data-wc-tabs]");
  if (tabs && CATALOGS.length > 1) {
    tabs.innerHTML = CATALOGS.map(
      (c) =>
        `<a class="wch-tab" href="${pageUrl(c)}" style="--c: ${esc(c.color || "")}" translate="no" ${c === catalog ? 'aria-current="page"' : ""}><i aria-hidden="true"></i>${esc(c.name)}</a>`,
    ).join("");
  }

  // dizayn kartları — ümumi məhsul kartı (components/_product-card.scss).
  // Divar kağızları onlayn satılmır: "Səbətə at" yoxdur, yalnız sevimlilər
  // (düyməni shop.js data-action="toggle-wishlist" ilə özü idarə edir)
  const ICON_HEART =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  const ICON_ZOOM =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';

  const price = ZAN.formatPrice(catalog.price);

  grid.innerHTML = catalog.designs
    .map(function (code, index) {
      const url = pageUrl(catalog, code);
      return `
        <article class="product-card wc-card" data-id="wp-${esc(catalog.slug)}-${esc(code)}" data-code="${esc(code)}"
          data-index="${index}" data-category="divar-kagizlari" data-brand="${esc(catalog.brand)}"
          data-price="${catalog.price}" data-stock="in" data-volume="${UNIT}">
          <div class="pc-media">
            <button type="button" class="pc-icon-btn pc-wish" data-action="toggle-wishlist" aria-pressed="false" aria-label="Sevimlilərə əlavə et">${ICON_HEART}</button>
            <a class="pc-image" href="${url}" data-action="wc-view" tabindex="-1" aria-hidden="true">
              <img src="${imageOf(catalog, code, true)}" alt="" loading="lazy" decoding="async" width="640" height="386" />
            </a>
            <button type="button" class="pc-quick" data-action="wc-view">${ICON_ZOOM}Böyüt</button>
          </div>
          <div class="pc-body">
            <span class="pc-category">Divar kağızları</span>
            <h3 class="pc-name" translate="no"><a href="${url}" data-action="wc-view">${esc(productName(code))}</a></h3>
            <div class="pc-meta"><span class="pc-chip">${UNIT}</span></div>
            <div class="pc-foot">
              <p class="pc-price"><b>${price}</b> <span>/ rulon</span></p>
            </div>
          </div>
        </article>`;
    })
    .join("");

  const cards = Array.from(grid.querySelectorAll(".wc-card"));

  // sevimlilər düymələrinin vəziyyəti (shop.js yalnız səhifə yüklənəndə olan kartları
  // yoxlayır). Böyük baxışdakı düymə də buradan yenilənir (viewer → syncViewerWish)
  let syncViewerWish = function () {};
  const syncWish = function () {
    cards.forEach(function (card) {
      const on = ZAN.wishlist.has(card.dataset.id);
      const button = card.querySelector(".pc-wish");
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", on ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et");
    });
    syncViewerWish();
  };
  syncWish();
  ZAN.wishlist.onChange(syncWish);
  //#endregion

  //#region search
  // koda görə: "112", "044112", "zn 2201" — boşluq və hərf fərqi nəzərə alınmır
  const input = document.getElementById("wc-find");
  const result = document.querySelector("[data-wc-result]");
  const empty = document.querySelector(".wcd-empty");
  const fold = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

  const filter = function () {
    const query = fold(input.value);
    let shown = 0;
    cards.forEach(function (card) {
      const hit = !query || fold(card.dataset.code).includes(query);
      card.hidden = !hit;
      if (hit) shown++;
    });
    empty.hidden = shown > 0;
    result.textContent = query
      ? ZAN.t("{n} dizayn tapıldı", { n: shown })
      : ZAN.t("{n} dizayn", { n: catalog.designs.length });
  };

  input.addEventListener("input", filter);
  empty.querySelector(".wcd-reset").addEventListener("click", function () {
    input.value = "";
    filter();
    input.focus();
  });
  filter();
  //#endregion

  //#region viewer
  // HTML: #region wc-viewer. Ox düymələri / klaviatura oxları ilə növbəti dizayn,
  // Esc və ya fona klik — bağlanır. Ünvan #<kod> olur (paylaşıla bilər).
  const viewer = document.querySelector(".wc-viewer");
  const vImage = viewer.querySelector("[data-wcv-image]");
  const vCode = viewer.querySelector(".wcv-code");
  let current = -1;

  viewer.querySelector("[data-wcv-catalog]").textContent = catalog.name;
  viewer.querySelector("[data-wcv-price]").textContent = price;

  // yalnız axtarışda görünən kartlar arasında gəzir
  const visible = () => cards.filter((card) => !card.hidden);

  const show = function (index) {
    const code = catalog.designs[index];
    if (code === undefined) return;
    current = index;
    vImage.classList.add("is-loading");
    vImage.onload = () => vImage.classList.remove("is-loading");
    vImage.src = imageOf(catalog, code, false);
    vImage.alt = `${catalog.name} ${code}`;
    vCode.textContent = code;
    syncViewerWish();

    const list = visible();
    const pos = list.findIndex((card) => Number(card.dataset.index) === index);
    viewer.querySelector("[data-wcv-position]").textContent = pos >= 0 ? `${pos + 1} / ${list.length}` : "";
    viewer.querySelectorAll(".wcv-nav").forEach((b) => (b.hidden = list.length < 2));

    if (window.location.hash !== `#${code}`) history.replaceState(null, "", `#${code}`);
    // növbəti şəkli əvvəlcədən yüklə
    const next = list[(pos + 1) % list.length];
    if (next) new Image().src = imageOf(catalog, next.dataset.code, false);
  };

  const open = function (index) {
    show(index);
    if (!viewer.open) viewer.showModal();
  };

  const step = function (dir) {
    const list = visible();
    if (list.length < 2) return;
    const pos = list.findIndex((card) => Number(card.dataset.index) === current);
    const next = list[(pos + dir + list.length) % list.length];
    show(Number(next.dataset.index));
  };

  grid.addEventListener("click", function (e) {
    const trigger = e.target.closest('[data-action="wc-view"]');
    if (!trigger) return;
    e.preventDefault();
    open(Number(trigger.closest(".wc-card").dataset.index));
  });

  viewer.querySelector(".wcv-prev").addEventListener("click", () => step(-1));
  viewer.querySelector(".wcv-next").addEventListener("click", () => step(1));
  viewer.querySelector(".wcv-close").addEventListener("click", () => viewer.close());
  // fona (dialoqun özünə) klik
  viewer.addEventListener("click", (e) => e.target === viewer && viewer.close());
  viewer.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  viewer.addEventListener("close", function () {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    // baxılan kartı görünən et və fokusu ona qaytar
    const card = cards[current];
    if (card) {
      card.scrollIntoView({ block: "nearest" });
      card.querySelector(".pc-name a").focus({ preventScroll: true });
    }
  });

  // böyük baxışda sevimlilər — kartdakı düymə ilə eyni məntiq (shop.js → card-actions)
  const vWish = viewer.querySelector(".wcv-wish");
  const vWishLabel = vWish.querySelector("span");

  syncViewerWish = function () {
    const card = cards[current];
    const on = !!card && ZAN.wishlist.has(card.dataset.id);
    vWish.setAttribute("aria-pressed", String(on));
    vWishLabel.textContent = on ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et";
  };

  vWish.addEventListener("click", function () {
    const card = cards[current];
    if (!card || !ZAN.auth.require("wishlist")) return;
    const product = ZAN.readProductCard(card);
    const added = ZAN.wishlist.toggle(product);
    ZAN.notify(added ? "success" : "info", product.name, {
      title: added ? "Sevimlilərə əlavə olundu" : "Sevimlilərdən çıxarıldı",
      icon: "heart",
      image: product.image,
    });
  });

  // wallpaper-catalog.html?c=simple#044112 — həmin dizayn açılır
  const fromHash = catalog.designs.indexOf(decodeURIComponent(window.location.hash.slice(1)));
  if (fromHash >= 0) {
    cards[fromHash].scrollIntoView({ block: "center" });
    open(fromHash);
  }
  //#endregion
})(window.ZAN);
