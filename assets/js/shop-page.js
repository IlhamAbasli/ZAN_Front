/* ==========================================================================
   shop-page.js — yalnız məhsullar səhifəsinin (shop.html) skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     shop.html, site.js → auth.js → shop.js-dən sonra
                (.NET MVC-də: Views/Shop/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.escapeHtml, ZAN.store, ZAN.headerSearch),
                shop.js (ZAN.cart, ZAN.wishlist, ZAN.readProductCard,
                ZAN.formatPrice), auth.js, Bootstrap JS (modal, offcanvas)

   Kartlar HTML-dədir (MVC-də serverdə render olunur); bu skript onları
   yalnız süzür, sıralayır və səhifələyir. Vəziyyət URL-də saxlanılır:
     shop.html?category=sintetik-boyalar,yapisdiricilar&q=lak&min=10&max=50
              &status=sale,in-stock&sort=price-asc&page=2
   Footer, header axtarışı və əsas səhifədəki linklər elə bu parametrlərlə gəlir.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  const area = document.getElementById("shop-area");
  if (!area) return;

  const reduceMotion = ZAN.prefersReducedMotion();
  const esc = ZAN.escapeHtml;
  const PER_PAGE = 9;

  //#region elementlər
  const grid = area.querySelector(".catalog-grid");
  const cards = Array.from(grid.querySelectorAll(".product-card"));
  const filters = document.getElementById("shop-filters");
  const searchInput = filters.querySelector("#sf-search");
  const categoryInputs = Array.from(filters.querySelectorAll('input[name="category"]'));
  const statusInputs = Array.from(filters.querySelectorAll('input[name="status"]'));
  const rangeBox = filters.querySelector(".sf-range");
  const rangeMin = filters.querySelector("#sf-range-min");
  const rangeMax = filters.querySelector("#sf-range-max");
  const priceMin = filters.querySelector("#sf-price-min");
  const priceMax = filters.querySelector("#sf-price-max");
  const resetButton = filters.querySelector(".sf-reset");
  const applyButton = filters.querySelector(".sf-apply");
  const heroCats = Array.from(document.querySelectorAll("#shop-hero .sh-cat"));
  const resultText = area.querySelector(".st-result");
  const filterCount = area.querySelector(".st-filter-count");
  const sortSelect = area.querySelector("#st-sort");
  const viewButtons = Array.from(area.querySelectorAll(".st-view button"));
  const chipsBox = area.querySelector(".st-chips");
  const emptyBox = area.querySelector(".catalog-empty");
  const pagesNav = area.querySelector(".catalog-pages");
  const toolbar = area.querySelector(".shop-toolbar");

  // HTML-dəki sıra "Tövsiyə olunan" sıralamasıdır
  cards.forEach((card, index) => (card.dataset.order = String(index)));
  //#endregion

  //#region vəziyyət
  const products = cards.map((card) => ({ card, data: ZAN.readProductCard(card) }));
  const prices = products.map((p) => p.data.price);
  const PRICE_FLOOR = Math.floor(Math.min(...prices));
  const PRICE_CEIL = Math.ceil(Math.max(...prices));

  const state = {
    q: "",
    categories: new Set(),
    status: new Set(),
    min: PRICE_FLOOR,
    max: PRICE_CEIL,
    sort: "default",
    page: 1,
  };

  const STATUS_LABELS = { "in-stock": "Stokda var", sale: "Endirimdə", new: "Yeni" };
  const categoryLabel = (slug) => {
    const input = categoryInputs.find((i) => i.value === slug);
    return input ? input.closest(".sf-check").querySelector(".sf-check-text").textContent.trim() : slug;
  };

  function readUrl() {
    const params = new URLSearchParams(location.search);
    const list = (key) => (params.get(key) || "").split(",").filter(Boolean);
    const known = (values, inputs) => values.filter((v) => inputs.some((i) => i.value === v));

    state.q = (params.get("q") || "").trim();
    state.categories = new Set(known(list("category"), categoryInputs));
    state.status = new Set(known(list("status"), statusInputs));
    state.min = clampPrice(Number(params.get("min")) || PRICE_FLOOR);
    state.max = clampPrice(Number(params.get("max")) || PRICE_CEIL);
    if (state.min > state.max) [state.min, state.max] = [state.max, state.min];
    // dəyər seçicidə yazılmır — ?sort=" kimi parametr querySelector-u sındırmasın
    const sort = params.get("sort");
    state.sort = Array.from(sortSelect.options).some((o) => o.value === sort) ? sort : "default";
    state.page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  }

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.categories.size) params.set("category", [...state.categories].join(","));
    if (state.q) params.set("q", state.q);
    if (state.min > PRICE_FLOOR) params.set("min", String(state.min));
    if (state.max < PRICE_CEIL) params.set("max", String(state.max));
    if (state.status.size) params.set("status", [...state.status].join(","));
    if (state.sort !== "default") params.set("sort", state.sort);
    if (state.page > 1) params.set("page", String(state.page));

    const query = params.toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
  }

  const clampPrice = (value) => Math.min(PRICE_CEIL, Math.max(PRICE_FLOOR, Math.round(value)));

  function activeFilterCount() {
    return (
      state.categories.size +
      state.status.size +
      (state.q ? 1 : 0) +
      (state.min > PRICE_FLOOR || state.max < PRICE_CEIL ? 1 : 0)
    );
  }
  //#endregion

  //#region süzmə və sıralama
  // axtarışda Azərbaycan hərfləri və böyük/kiçik hərf fərq etməsin
  const normalizeText = (text) =>
    text
      .toLocaleLowerCase("az")
      .replace(/ə/g, "e")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ç/g, "c")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g");

  function matches(p) {
    const d = p.data;
    if (state.categories.size && !state.categories.has(d.categorySlug)) return false;
    if (d.price < state.min || d.price > state.max) return false;
    if (state.status.has("in-stock") && !d.inStock) return false;
    if (state.status.has("sale") && !d.oldPrice) return false;
    if (state.status.has("new") && !d.isNew) return false;
    if (state.q) {
      const haystack = normalizeText(`${d.name} ${d.category} ${d.description} ${d.volume}`);
      if (!normalizeText(state.q).split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    return true;
  }

  const SORTERS = {
    default: (a, b) => a.card.dataset.order - b.card.dataset.order,
    "price-asc": (a, b) => a.data.price - b.data.price,
    "price-desc": (a, b) => b.data.price - a.data.price,
    name: (a, b) => a.data.name.localeCompare(b.data.name, ZAN.i18n.locale),
    new: (a, b) => b.data.isNew - a.data.isNew || a.card.dataset.order - b.card.dataset.order,
  };
  //#endregion

  //#region göstərmə
  function render(options) {
    const animate = options && options.animate && !reduceMotion;

    const found = products.filter(matches).sort(SORTERS[state.sort]);
    const pageCount = Math.max(1, Math.ceil(found.length / PER_PAGE));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * PER_PAGE;
    const visible = new Set(found.slice(start, start + PER_PAGE));

    // DOM-da sıra da dəyişir — klaviatura ilə gəzəndə sıra ekrandakı kimidir
    found.forEach((p) => grid.appendChild(p.card));
    products.forEach((p) => {
      const show = visible.has(p);
      p.card.hidden = !show;
      p.card.classList.remove("is-entering");
    });

    // animasiyanın yenidən başlaması üçün bir dəfə reflow kifayətdir
    // (hər kart üçün ayrıca offsetWidth oxumaq layout-u N dəfə hesablatdırır)
    if (animate) {
      const shown = [...visible];
      shown.forEach((p, i) => p.card.style.setProperty("--i", String(i)));
      void grid.offsetWidth;
      shown.forEach((p) => p.card.classList.add("is-entering"));
    }

    emptyBox.hidden = found.length > 0;
    resultText.innerHTML = found.length
      ? ZAN.t("<b>{total}</b> məhsuldan <b>{from}–{to}</b> göstərilir", { total: found.length, from: start + 1, to: start + visible.size })
      : "Uyğun məhsul yoxdur";

    renderPages(pageCount);
    renderChips();
    syncControls(found.length);
    writeUrl();
  }

  function renderPages(pageCount) {
    if (pageCount <= 1) {
      pagesNav.innerHTML = "";
      return;
    }
    const arrow = (d) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

    let html = `<ul><li><button type="button" data-page="${state.page - 1}" aria-label="Əvvəlki səhifə" ${
      state.page === 1 ? "disabled" : ""
    }>${arrow("M15 5l-7 7 7 7")}</button></li>`;
    for (let n = 1; n <= pageCount; n++) {
      html += `<li><button type="button" data-page="${n}" aria-label="${ZAN.t("Səhifə {n}", { n })}" ${
        n === state.page ? 'aria-current="page"' : ""
      }>${n}</button></li>`;
    }
    html += `<li><button type="button" data-page="${state.page + 1}" aria-label="Növbəti səhifə" ${
      state.page === pageCount ? "disabled" : ""
    }>${arrow("M9 5l7 7-7 7")}</button></li></ul>`;
    pagesNav.innerHTML = html;
  }

  // aktiv filtrlər zolağı: hər etiket klikləyəndə öz filtrini silir
  function renderChips() {
    const chips = [];
    state.categories.forEach((slug) => chips.push({ type: "category", value: slug, label: categoryLabel(slug) }));
    if (state.q) chips.push({ type: "q", label: `“${state.q}”` });
    if (state.min > PRICE_FLOOR || state.max < PRICE_CEIL) {
      chips.push({ type: "price", label: `${state.min}–${state.max} ₼` });
    }
    state.status.forEach((value) => chips.push({ type: "status", value, label: STATUS_LABELS[value] }));

    chipsBox.innerHTML = chips
      .map(
        (c) =>
          // label URL-dən gəlir (?q=) — mütləq escape olunur
          `<button type="button" class="st-chip" data-chip="${c.type}" data-value="${esc(c.value || "")}" aria-label="${esc(ZAN.t("Filtri sil: {label}", { label: ZAN.t(c.label) }))}">${esc(c.label)}</button>`,
      )
      .join("");
    if (chips.length > 1) {
      chipsBox.insertAdjacentHTML("beforeend", '<button type="button" class="st-chip is-clear" data-chip="all">Hamısını təmizlə</button>');
    }
  }

  // formadakı idarəetmələri vəziyyətə uyğunlaşdırır (URL-dən gələndə də)
  function syncControls(foundCount) {
    if (document.activeElement !== searchInput) searchInput.value = state.q;
    syncHeaderSearch();
    categoryInputs.forEach((i) => (i.checked = state.categories.has(i.value)));
    statusInputs.forEach((i) => (i.checked = state.status.has(i.value)));
    sortSelect.value = state.sort;
    syncPrice();

    heroCats.forEach((button) => {
      const slug = button.dataset.category;
      const pressed = slug ? state.categories.size === 1 && state.categories.has(slug) : state.categories.size === 0;
      button.setAttribute("aria-pressed", String(pressed));
    });

    const count = activeFilterCount();
    filterCount.textContent = count ? String(count) : "";
    resetButton.disabled = count === 0;
    if (applyButton) applyButton.textContent = foundCount ? ZAN.t("{n} məhsulu göstər", { n: foundCount }) : ZAN.t("Nəticə yoxdur");
  }

  function syncPrice() {
    rangeMin.value = String(state.min);
    rangeMax.value = String(state.max);
    if (document.activeElement !== priceMin) priceMin.value = String(state.min);
    if (document.activeElement !== priceMax) priceMax.value = String(state.max);
    const span = PRICE_CEIL - PRICE_FLOOR || 1;
    rangeBox.style.setProperty("--from", `${((state.min - PRICE_FLOOR) / span) * 100}%`);
    rangeBox.style.setProperty("--to", `${((state.max - PRICE_FLOOR) / span) * 100}%`);
  }

  // səhifə və ya filtr dəyişəndə kataloqun başına qayıdır (yalnız lazım olsa)
  function scrollToCatalog() {
    const top = toolbar.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--h-header-sticky")) || 84;
      window.scrollTo({ top: window.scrollY + top - offset - 16, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  // filtr dəyişəndə həmişə 1-ci səhifəyə qayıdırıq
  function update() {
    state.page = 1;
    render({ animate: true });
  }
  //#endregion

  //#region filtrlər
  let searchTimer = 0;
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput.value.trim();
      update();
    }, 220);
  });
  // filtr forması heç vaxt göndərilmir — hər şey dərhal tətbiq olunur (səhifə yenilənməsin)
  searchInput.closest("form").addEventListener("submit", (e) => e.preventDefault());

  categoryInputs.forEach((input) =>
    input.addEventListener("change", function () {
      input.checked ? state.categories.add(input.value) : state.categories.delete(input.value);
      update();
    }),
  );

  statusInputs.forEach((input) =>
    input.addEventListener("change", function () {
      input.checked ? state.status.add(input.value) : state.status.delete(input.value);
      update();
    }),
  );

  // qiymət: sürgülər canlı, rəqəm sahələri dəyişəndə (blur/Enter)
  [rangeMin, rangeMax].forEach((input) => {
    input.min = rangeMin.min = rangeMax.min = String(PRICE_FLOOR);
    input.max = String(PRICE_CEIL);
    input.addEventListener("input", function () {
      let lo = Number(rangeMin.value);
      let hi = Number(rangeMax.value);
      if (lo > hi) input === rangeMin ? (lo = hi) : (hi = lo);
      state.min = lo;
      state.max = hi;
      syncPrice();
    });
    input.addEventListener("change", update);
  });

  [priceMin, priceMax].forEach((input) =>
    input.addEventListener("change", function () {
      let lo = clampPrice(Number(priceMin.value) || PRICE_FLOOR);
      let hi = clampPrice(Number(priceMax.value) || PRICE_CEIL);
      if (lo > hi) [lo, hi] = [hi, lo];
      state.min = lo;
      state.max = hi;
      update();
    }),
  );

  function resetAll() {
    state.q = "";
    state.categories.clear();
    state.status.clear();
    state.min = PRICE_FLOOR;
    state.max = PRICE_CEIL;
    searchInput.value = "";
    update();
  }

  resetButton.addEventListener("click", resetAll);
  emptyBox.querySelector("button").addEventListener("click", resetAll);

  // başlıqdakı kateqoriya düymələri: yalnız həmin kateqoriya (və ya hamısı)
  heroCats.forEach((button) =>
    button.addEventListener("click", function () {
      state.categories.clear();
      if (button.dataset.category) state.categories.add(button.dataset.category);
      update();
      scrollToCatalog();
    }),
  );

  chipsBox.addEventListener("click", function (e) {
    const chip = e.target.closest(".st-chip");
    if (!chip) return;
    const { chip: type, value } = chip.dataset;

    if (type === "all") return resetAll();
    if (type === "category") state.categories.delete(value);
    if (type === "status") state.status.delete(value);
    if (type === "q") state.q = "";
    if (type === "price") {
      state.min = PRICE_FLOOR;
      state.max = PRICE_CEIL;
    }
    update();
  });

  // hər kateqoriyada neçə məhsul var (sabit)
  categoryInputs.forEach((input) => {
    const counter = input.closest(".sf-check").querySelector(".sf-count");
    if (counter) counter.textContent = String(products.filter((p) => p.data.categorySlug === input.value).length);
  });
  //#endregion

  //#region yapışqan filtr paneli
  // lg+ ekranda panel sabit header-in altına yapışır, daxili scroll-u yoxdur.
  //   1) Sığırsa — header-in altında sabit durur.
  //   2) Sığmırsa — əvvəlcə siyahılar addım-addım qısalır (ən azı ~2.5 element).
  //   3) Yenə sığmırsa — iki istiqamətli yapışma: aşağı sürüşəndə panel alt
  //      kənarı ekranın altına çatanda dayanır, yuxarı sürüşən kimi qayıdıb
  //      başlığı header-in altında dayanır (başlıq ilişib qalmır).
  const desktopQuery = window.matchMedia("(min-width: 992px)");
  const stickyHeader = document.getElementById("header-sticky");
  const GAP = 20;
  const LIST_MAX = 204; // 5.5 element — _filters.scss-dəki standart dəyər
  const LIST_MIN = 90; //  ~2.5 element
  const LIST_STEP = 8;

  let topMax = 0; //     başlıq header-in düz altında
  let topMin = 0; //     alt kənar ekranın altında
  let currentTop = 0;
  let lastScrollY = window.scrollY;
  let followsScroll = false;

  function updateStickyTop() {
    filters.style.removeProperty("--sf-list-max");
    followsScroll = false;

    if (!desktopQuery.matches) {
      filters.style.removeProperty("--sf-top");
      return;
    }

    // sabit header-in real hündürlüyü (gizli olsa da ölçüsü var)
    const headerHeight =
      (stickyHeader && stickyHeader.offsetHeight) ||
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--h-header-sticky")) ||
      84;
    topMax = headerHeight + GAP;
    const available = window.innerHeight - topMax - GAP;

    let listMax = LIST_MAX;
    while (filters.offsetHeight > available && listMax > LIST_MIN) {
      listMax = Math.max(LIST_MIN, listMax - LIST_STEP);
      filters.style.setProperty("--sf-list-max", `${listMax}px`);
    }

    if (filters.offsetHeight > available) {
      // ən qısa siyahı ilə də sığmır: siyahılar əvvəlki uzunluğuna qayıdır,
      // panel isə sürüşmə istiqamətinə görə hərəkət edir
      filters.style.removeProperty("--sf-list-max");
      followsScroll = true;
      topMin = window.innerHeight - filters.offsetHeight - GAP;
      currentTop = Math.min(topMax, Math.max(topMin, currentTop || topMax));
    } else {
      currentTop = topMax;
    }
    filters.style.setProperty("--sf-top", `${currentTop}px`);
  }

  let scrollFrame = 0;
  window.addEventListener(
    "scroll",
    function () {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(function () {
        scrollFrame = 0;
        const y = window.scrollY;
        const delta = y - lastScrollY;
        lastScrollY = y;
        if (!followsScroll || !delta) return;

        currentTop = Math.min(topMax, Math.max(topMin, currentTop - delta));
        filters.style.setProperty("--sf-top", `${currentTop}px`);
      });
    },
    { passive: true },
  );

  // uzun siyahılarda alt kənardakı "davamı var" kölgəsi
  function updateListFade(list) {
    const scrollable = list.scrollHeight > list.clientHeight + 1;
    list.classList.toggle("is-scrollable", scrollable);
    list.classList.toggle("is-end", !scrollable || list.scrollTop + list.clientHeight >= list.scrollHeight - 2);
  }

  const lists = Array.from(filters.querySelectorAll(".sf-checks"));
  lists.forEach((list) => list.addEventListener("scroll", () => updateListFade(list), { passive: true }));

  function refreshFilterLayout() {
    updateStickyTop();
    lists.forEach(updateListFade);
  }

  new ResizeObserver(refreshFilterLayout).observe(filters);
  // siyahıya element sonradan əlavə olunanda (məs. backend AJAX ilə) kölgə yenilənsin
  const listObserver = new MutationObserver(refreshFilterLayout);
  lists.forEach((list) => listObserver.observe(list, { childList: true }));
  window.addEventListener("resize", refreshFilterLayout);
  desktopQuery.addEventListener("change", refreshFilterLayout);
  //#endregion

  //#region header axtarışı
  // Başqa səhifədə header axtarışı shop.html?q=...&category=... açır (site.js →
  // header-search). Bu səhifədə isə səhifə yenilənmir: söz və kateqoriya
  // kataloqa tətbiq olunur, header forması filtrlərlə eyni vəziyyətdə qalır.
  function syncHeaderSearch() {
    if (ZAN.headerSearch) ZAN.headerSearch.set(state.q, [...state.categories]);
  }

  document.addEventListener("zan:search", function (e) {
    e.preventDefault();
    const { form, q, category } = e.detail;

    state.q = q;
    // category === null — formada kateqoriya seçimi yoxdur (mobil axtarış):
    // sol paneldəki kateqoriya filtrləri olduğu kimi qalır
    if (category !== null) {
      const isKnown = categoryInputs.some((input) => input.value === category);
      state.categories = new Set(category && isKnown ? [category] : []);
    }

    const input = form.querySelector('input[name="q"]');
    if (input) input.blur();

    // mobil menyudan axtarılıbsa menyu bağlansın ki, nəticə görünsün
    const menu = form.closest(".mobile-menu, #mobile-menu");
    if (menu) {
      const closeButton = menu.querySelector(".menu-close-btn");
      if (closeButton) closeButton.click();
    }

    update();
    scrollToCatalog();
  });
  //#endregion

  //#region sıralama, görünüş, səhifələmə
  sortSelect.addEventListener("change", function () {
    state.sort = sortSelect.value;
    update();
  });

  const VIEW_KEY = "zan-shop-view";
  function setView(view, save) {
    grid.classList.toggle("is-list", view === "list");
    viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    if (save) {
      try {
        localStorage.setItem(VIEW_KEY, view);
      } catch (e) {
        /* seçim yadda qalmasa da işləyir */
      }
    }
  }

  viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view, true)));

  try {
    setView(localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid", false);
  } catch (e) {
    setView("grid", false);
  }

  pagesNav.addEventListener("click", function (e) {
    const button = e.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    render({ animate: true });
    scrollToCatalog();
  });
  //#endregion

  //#region sürətli baxış
  // Bütün kartlar üçün tək modal (#quick-view); məlumat kartdan oxunur.
  const modalEl = document.getElementById("quick-view");
  const modal = modalEl && window.bootstrap ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
  let current = null;

  if (modal) {
    const qv = (selector) => modalEl.querySelector(selector);
    const qtyInput = qv(".qv-qty input");
    const stageImg = qv(".qv-stage img");

    function setQty(value) {
      const n = Math.min(99, Math.max(1, parseInt(value, 10) || 1));
      qtyInput.value = String(n);
      qv('.qv-qty [data-qty="dec"]').disabled = n <= 1;
    }

    function syncWish() {
      const active = current && ZAN.wishlist.has(current.id);
      const button = qv(".qv-wish");
      button.setAttribute("aria-pressed", String(!!active));
      button.setAttribute("aria-label", active ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et");
    }

    function openQuickView(card) {
      const d = ZAN.readProductCard(card);
      current = d;
      modalEl.dataset.category = d.categorySlug;

      stageImg.src = d.image;
      stageImg.alt = d.name;
      qv(".qv-category").textContent = d.category;
      qv(".qv-title").textContent = d.name;
      qv(".qv-desc").textContent = d.description;
      qv(".qv-price b").textContent = ZAN.formatPrice(d.price);
      qv(".qv-price s").textContent = d.oldPrice ? ZAN.formatPrice(d.oldPrice) : "";
      qv(".qv-save").textContent = d.oldPrice ? ZAN.t("{amount} qənaət", { amount: ZAN.formatPrice(d.oldPrice - d.price) }) : "";
      qv(".qv-meta").innerHTML = d.volume ? `<span class="pc-chip">${esc(d.volume)}</span>` : "";
      qv(".qv-more").href = d.url;

      const stock = qv(".qv-stock");
      stock.textContent = d.inStock ? "Stokda var" : "Stokda yoxdur";
      stock.classList.toggle("is-out", !d.inStock);
      qv(".qv-add").disabled = !d.inStock;

      // kartdakı nişanları (endirim, yeni) köçürürük
      const badges = card.querySelector(".pc-badges");
      qv(".qv-badges").innerHTML = badges ? badges.innerHTML : "";

      // əlavə şəkillər: kartda data-gallery="a.png|b.png"
      const images = [d.image].concat(d.gallery);
      qv(".qv-thumbs").innerHTML =
        images.length > 1
          ? images
              .map(
                (src, i) =>
                  `<button type="button" data-src="${esc(src)}" aria-pressed="${i === 0}" aria-label="${ZAN.t("Şəkil {n}", { n: i + 1 })}"><img src="${esc(src)}" alt="" /></button>`,
              )
              .join("")
          : "";

      setQty(1);
      syncWish();
      modal.show();
    }

    grid.addEventListener("click", function (e) {
      const trigger = e.target.closest('[data-action="quick-view"]');
      if (!trigger) return;
      e.preventDefault();
      openQuickView(trigger.closest(".product-card"));
    });

    qv(".qv-thumbs").addEventListener("click", function (e) {
      const thumb = e.target.closest("button[data-src]");
      if (!thumb) return;
      stageImg.src = thumb.dataset.src;
      qv(".qv-thumbs")
        .querySelectorAll("button")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === thumb)));
    });

    qv(".qv-qty").addEventListener("click", function (e) {
      const button = e.target.closest("[data-qty]");
      if (!button) return;
      setQty(Number(qtyInput.value) + (button.dataset.qty === "inc" ? 1 : -1));
    });
    qtyInput.addEventListener("change", () => setQty(qtyInput.value));

    qv(".qv-add").addEventListener("click", function () {
      if (!current || !current.inStock) return;
      if (!ZAN.auth.require("cart")) return;
      const count = Number(qtyInput.value);
      ZAN.cart.add(current, count);
      modal.hide();
      ZAN.notifyAddedToCart(current, count);
    });

    qv(".qv-wish").addEventListener("click", function () {
      if (!current) return;
      if (!ZAN.auth.require("wishlist")) return;
      const added = ZAN.wishlist.toggle(current);
      ZAN.notify(added ? "success" : "info", current.name, {
        title: added ? "Sevimlilərə əlavə olundu" : "Sevimlilərdən çıxarıldı",
        icon: "heart",
        image: current.image,
      });
    });

    ZAN.wishlist.onChange(syncWish);
  }
  //#endregion

  //#region init
  readUrl();
  render({ animate: false });
  //#endregion
})(window.ZAN);
