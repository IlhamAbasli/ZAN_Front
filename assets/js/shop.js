/* ==========================================================================
   shop.js — səbət, sevimlilər, mini səbət və məhsul kartı düymələri
   --------------------------------------------------------------------------
   Qoşulur:  hər səhifədə, site.js və auth.js-dən sonra, səhifə skriptindən (home.js,
             shop-page.js ...) əvvəl — header sayğacları və mini səbət hər
             səhifədə işləməlidir (.NET MVC-də: Views/Shared/_Layout.cshtml)
   Asılılıq: site.js (ZAN.notify, ZAN.store, ZAN.escapeHtml), auth.js
             (ZAN.auth — səbət və sevimlilər yalnız daxil olmuş istifadəçi
             üçündür), Bootstrap JS (mini səbət offcanvas-dır)
   Saxlama:  localStorage
               "products" → səbət       [{ id, name, price, image, count, volume, url }]
               "wishlist" → sevimlilər  [{ id, name, price, oldPrice, image, category,
                                         categorySlug, volume, url, inStock }]

   Başqa skriptlər üçün API (window.ZAN):
     ZAN.cart.add(product, count) / setCount(id, count) / remove(id) / clear()
     ZAN.cart.items() / count() / total() / onChange(fn) / MAX_COUNT
     ZAN.wishlist.has(id) / toggle(product, index?) / clear() / items() / onChange(fn)
     ZAN.readProductCard(cardEl)   → kartdan məhsul obyekti
     ZAN.formatPrice(24.9)         → "24,90 ₼"
     ZAN.notifyAddedToCart(product, count)

   Kart düymələri (istənilən səhifədə, .product-card içində):
     [data-action="add-to-cart"]     səbətə at
     [data-action="toggle-wishlist"] sevimlilərə əlavə et / çıxar
   ========================================================================== */

window.ZAN = window.ZAN || {};

(function (ZAN) {
  "use strict";

  //#region storage
  const STORAGE_KEYS = {
    cart: "products",
    wishlist: "wishlist",
  };

  // siyahı deyilsə (pozulub) boş siyahı
  function readStored(key) {
    const value = ZAN.store.get(key, []);
    return Array.isArray(value) ? value : [];
  }

  const writeStored = ZAN.store.set;

  // köhnə yazılarda id rəqəm idi — hamısı sətirə çevrilir
  const normalize = (list) =>
    list
      .filter((item) => item && item.id != null)
      .map((item) =>
        Object.assign({}, item, {
          id: String(item.id),
          price: Number(item.price) || 0,
          // səbət sətrində say; sevimlilərdə count yoxdur
          ...(item.count !== undefined && { count: Math.max(1, parseInt(item.count, 10) || 1) }),
        }),
      );
  //#endregion

  //#region helpers
  // Azərbaycan yazılışı: 1 234,50 ₼ (brauzerin az-AZ formatı hər yerdə eyni deyil).
  // Digər dillərdə brauzerin formatı: 1,234.50 ₼ (en, zh), 1.234,50 ₼ (tr), 1 234,50 ₼ (ru)
  const priceFormat =
    ZAN.i18n && ZAN.i18n.lang !== "az" && typeof Intl === "object"
      ? new Intl.NumberFormat(ZAN.i18n.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  ZAN.formatPrice = function (value) {
    const amount = Number(value) || 0;
    if (priceFormat) return `${priceFormat.format(amount)} ₼`;
    const [whole, cents] = amount.toFixed(2).split(".");
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${cents} ₼`;
  };

  // məhsul adları HTML-dən oxunur — mini səbətə yazılanda təhlükəsiz olsun
  const escapeHtml = ZAN.escapeHtml;

  /**
   * Məhsul kartından məlumat oxuyur. Görünən mətn (ad, kateqoriya, şəkil)
   * HTML-dən, hesablama üçün dəyərlər data-* atributlarından gəlir.
   */
  ZAN.readProductCard = function (card) {
    // mətn dildən asılı olmasın: səbətə / sevimlilərə Azərbaycanca yazılır,
    // göstərəndə yenidən tərcümə olunur (i18n.js → ZAN.i18n.source)
    const text = (selector) => {
      const el = card.querySelector(selector);
      return el ? ZAN.i18n.source(el) : "";
    };
    const image = card.querySelector(".pc-image img");
    const link = card.querySelector(".pc-name a");

    return {
      id: String(card.dataset.id),
      name: text(".pc-name"),
      category: text(".pc-category"),
      categorySlug: card.dataset.category || "",
      description: text(".pc-desc"),
      price: Number(card.dataset.price) || 0,
      oldPrice: Number(card.dataset.oldPrice) || null,
      volume: card.dataset.volume || "",
      image: image ? image.getAttribute("src") : "",
      gallery: card.dataset.gallery ? card.dataset.gallery.split("|") : [],
      url: link ? link.getAttribute("href") : "#",
      inStock: card.dataset.stock !== "out",
      isNew: card.dataset.new === "true",
    };
  };
  //#endregion

  //#region cart
  let cart = normalize(readStored(STORAGE_KEYS.cart));
  const cartListeners = [];
  const MAX_COUNT = 99;

  function commitCart() {
    writeStored(STORAGE_KEYS.cart, cart);
    cartListeners.forEach((fn) => fn(cart.slice()));
  }

  ZAN.cart = {
    MAX_COUNT: MAX_COUNT,
    items: () => cart.slice(),
    count: () => cart.reduce((sum, item) => sum + item.count, 0),
    total: () => cart.reduce((sum, item) => sum + item.price * item.count, 0),

    add(product, count) {
      const amount = Math.max(1, parseInt(count, 10) || 1);
      const existing = cart.find((item) => item.id === String(product.id));

      if (existing) {
        existing.count = Math.min(MAX_COUNT, existing.count + amount);
      } else {
        cart.push({
          id: String(product.id),
          name: product.name,
          price: Number(product.price) || 0,
          image: product.image,
          volume: product.volume || "",
          url: product.url || "",
          count: Math.min(MAX_COUNT, amount),
        });
      }
      commitCart();
    },

    // sifariş qəbul olunanda (checkout-page.js)
    clear() {
      cart = [];
      commitCart();
    },

    setCount(id, count) {
      const item = cart.find((entry) => entry.id === String(id));
      if (!item) return;
      item.count = Math.min(MAX_COUNT, Math.max(1, parseInt(count, 10) || 1));
      commitCart();
    },

    remove(id) {
      const removed = cart.find((item) => item.id === String(id));
      cart = cart.filter((item) => item.id !== String(id));
      commitCart();
      return removed || null;
    },

    onChange(fn) {
      cartListeners.push(fn);
    },
  };
  //#endregion

  //#region wishlist
  let wishlist = normalize(readStored(STORAGE_KEYS.wishlist));
  const wishlistListeners = [];

  // sevimlilər səhifəsində kart çəkmək üçün lazım olan sahələr (wishlist-page.js)
  function wishEntry(product) {
    return {
      id: String(product.id),
      name: product.name,
      price: Number(product.price) || 0,
      oldPrice: Number(product.oldPrice) || null,
      image: product.image,
      category: product.category || "",
      categorySlug: product.categorySlug || "",
      volume: product.volume || "",
      url: product.url || "",
      inStock: product.inStock !== false,
    };
  }

  function commitWishlist() {
    writeStored(STORAGE_KEYS.wishlist, wishlist);
    wishlistListeners.forEach((fn) => fn(wishlist.slice()));
  }

  ZAN.wishlist = {
    items: () => wishlist.slice(),
    has: (id) => wishlist.some((item) => item.id === String(id)),

    // true — əlavə olundu, false — çıxarıldı.
    // index — "Geri qaytar"da məhsul əvvəlki yerinə qayıtsın deyə
    toggle(product, index) {
      const id = String(product.id);
      const added = !ZAN.wishlist.has(id);

      if (added) {
        wishlist = wishlist.slice();
        const at = Number.isInteger(index) ? Math.min(index, wishlist.length) : wishlist.length;
        wishlist.splice(at, 0, wishEntry(product));
      } else {
        wishlist = wishlist.filter((item) => item.id !== id);
      }
      commitWishlist();
      return added;
    },

    clear() {
      wishlist = [];
      commitWishlist();
    },

    onChange(fn) {
      wishlistListeners.push(fn);
    },
  };
  //#endregion

  //#region notifications
  ZAN.notifyAddedToCart = function (product, count) {
    ZAN.notify("success", count > 1 ? ZAN.t("{n} əd. — {name}", { n: count, name: ZAN.t(product.name) }) : ZAN.t(product.name), {
      title: "Səbətə əlavə olundu",
      icon: "cart",
      image: product.image,
      action: { label: "Səbətə bax", onClick: openMiniCart },
    });
  };

  function notifyOutOfStock(product) {
    ZAN.notify("warning", ZAN.t("{name} hazırda anbarda yoxdur", { name: ZAN.t(product.name) }), {
      title: "Stokda yoxdur",
      image: product.image,
    });
  }
  //#endregion

  //#region header-counters
  function renderCounters() {
    const cartCount = String(ZAN.cart.count());
    const wishCount = String(wishlist.length);
    document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = cartCount));
    document.querySelectorAll(".wishlist-count").forEach((el) => (el.textContent = wishCount));
  }
  //#endregion

  //#region mini-cart
  // HTML: #region mini-cart (hər səhifədə). Stil: components/_mini-cart.scss
  const miniCart = document.getElementById("mini-cart");

  function openMiniCart() {
    if (miniCart && window.bootstrap) {
      bootstrap.Offcanvas.getOrCreateInstance(miniCart).show();
    }
  }

  const ICON_TRASH =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  function renderMiniCart() {
    if (!miniCart) return;

    // siyahı yenidən çəkilir — fokus panelin içində qalsın (Esc, Tab işləsin)
    const focused = miniCart.contains(document.activeElement) ? document.activeElement : null;
    const focusItem = focused && focused.closest(".mc-item");
    const focusKey = focusItem ? [focusItem.dataset.id, focused.dataset.mc] : null;

    miniCart.classList.toggle("is-empty", cart.length === 0);
    miniCart.querySelector(".mc-count").textContent = String(ZAN.cart.count());
    miniCart.querySelector(".mc-total-value").textContent = ZAN.formatPrice(ZAN.cart.total());

    miniCart.querySelector(".mc-list").innerHTML = cart
      .map((item) => {
        // ad Azərbaycanca saxlanılır — göstərəndə tərcümə olunur
        const name = escapeHtml(ZAN.t(item.name));
        return `
        <li class="mc-item" data-id="${escapeHtml(item.id)}">
          <span class="mc-thumb"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" /></span>
          <div class="mc-info">
            <p class="mc-name">${name}</p>
            <span class="mc-unit">${ZAN.formatPrice(item.price)}${item.volume ? " · " + escapeHtml(ZAN.t(item.volume)) : ""}</span>
            <div class="mc-line">
              <div class="qty" role="group" aria-label="${escapeHtml(ZAN.t("{name} — say", { name: ZAN.t(item.name) }))}">
                <button type="button" data-mc="dec" aria-label="Azalt" ${item.count <= 1 ? "disabled" : ""}>−</button>
                <input type="number" inputmode="numeric" min="1" max="${MAX_COUNT}" value="${item.count}" data-mc="set" aria-label="Say" />
                <button type="button" data-mc="inc" aria-label="Artır" ${item.count >= MAX_COUNT ? "disabled" : ""}>+</button>
              </div>
              <span class="mc-line-total">${ZAN.formatPrice(item.price * item.count)}</span>
            </div>
          </div>
          <button type="button" class="mc-remove" data-mc="remove" aria-label="${escapeHtml(ZAN.t("{name} — səbətdən sil", { name: ZAN.t(item.name) }))}">${ICON_TRASH}</button>
        </li>`;
      })
      .join("");

    if (focusKey) {
      const item = miniCart.querySelector(`.mc-item[data-id="${CSS.escape(focusKey[0])}"]`);
      const target = item && item.querySelector(`[data-mc="${focusKey[1]}"]:not(:disabled)`);
      (target || (item && item.querySelector("[data-mc='set']")) || miniCart.querySelector(".mc-close")).focus();
    }
  }

  if (miniCart) {
    miniCart.addEventListener("click", function (e) {
      const button = e.target.closest("[data-mc]");
      if (!button || button.tagName !== "BUTTON") return;

      const id = button.closest(".mc-item").dataset.id;
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;

      if (button.dataset.mc === "inc") ZAN.cart.setCount(id, item.count + 1);
      if (button.dataset.mc === "dec") ZAN.cart.setCount(id, item.count - 1);

      if (button.dataset.mc === "remove") {
        const removed = ZAN.cart.remove(id);
        ZAN.notify("info", removed.name, {
          title: "Səbətdən silindi",
          icon: "cart",
          image: removed.image,
          action: { label: "Geri qaytar", onClick: () => ZAN.cart.add(removed, removed.count) },
        });
      }
    });

    miniCart.addEventListener("change", function (e) {
      if (e.target.dataset.mc !== "set") return;
      ZAN.cart.setCount(e.target.closest(".mc-item").dataset.id, e.target.value);
    });
  }

  // header-dəki (adi, sabit və mobil) səbət düymələri paneli açır;
  // qonağa isə "daxil olun" pəncərəsi göstərilir (auth.js)
  document.addEventListener("click", function (e) {
    const trigger = e.target.closest(".cart");
    if (!trigger || !miniCart) return;
    e.preventDefault();
    if (!ZAN.auth.require("cart")) return;
    openMiniCart();
  });
  //#endregion

  //#region card-actions
  // kartdakı sevimli düymələri vəziyyətə uyğun (aria-pressed + etiket)
  function syncWishButtons() {
    document.querySelectorAll(".product-card").forEach(function (card) {
      const button = card.querySelector('[data-action="toggle-wishlist"]');
      if (!button) return;
      const active = ZAN.wishlist.has(card.dataset.id);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et");
    });
  }

  // stokda olmayan kartların səbət düyməsi bağlıdır
  document.querySelectorAll('.product-card[data-stock="out"] [data-action="add-to-cart"]').forEach((b) => {
    b.disabled = true;
    b.setAttribute("aria-label", "Stokda yoxdur");
  });

  document.addEventListener("click", function (e) {
    const addButton = e.target.closest('[data-action="add-to-cart"]');
    const wishButton = e.target.closest('[data-action="toggle-wishlist"]');
    const card = (addButton || wishButton) && (addButton || wishButton).closest(".product-card");
    if (!card) return;

    e.preventDefault();
    // səbət və sevimlilər yalnız qeydiyyatdan keçmiş istifadəçi üçündür
    if (!ZAN.auth.require(addButton ? "cart" : "wishlist")) return;

    const product = ZAN.readProductCard(card);

    if (addButton) {
      if (!product.inStock) {
        notifyOutOfStock(product);
        return;
      }
      ZAN.cart.add(product, 1);
      ZAN.notifyAddedToCart(product, 1);

      // qısa "təsdiq" animasiyası
      addButton.classList.remove("is-added");
      void addButton.offsetWidth;
      addButton.classList.add("is-added");
      return;
    }

    // çıxarılanda saxlanmış yazı "Geri qaytar" üçün lazımdır
    const savedIndex = ZAN.wishlist.items().findIndex((item) => item.id === product.id);
    const saved = ZAN.wishlist.items()[savedIndex];
    const added = ZAN.wishlist.toggle(product);
    ZAN.notify(added ? "success" : "info", product.name, {
      title: added ? "Sevimlilərə əlavə olundu" : "Sevimlilərdən çıxarıldı",
      icon: "heart",
      image: product.image,
      action: added
        ? null
        : {
            label: "Geri qaytar",
            onClick: () => ZAN.wishlist.has(product.id) || ZAN.wishlist.toggle(saved || product, savedIndex),
          },
    });
  });
  //#endregion

  //#region cross-tab
  // başqa vərəqdə səbət / sevimlilər dəyişəndə bu vərəq də yenilənir
  // (storage hadisəsi yalnız digər vərəqlərə gəlir; key=null — hamısı silinib)
  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEYS.cart || e.key === null) {
      cart = normalize(readStored(STORAGE_KEYS.cart));
      cartListeners.forEach((fn) => fn(cart.slice()));
    }
    if (e.key === STORAGE_KEYS.wishlist || e.key === null) {
      wishlist = normalize(readStored(STORAGE_KEYS.wishlist));
      wishlistListeners.forEach((fn) => fn(wishlist.slice()));
    }
  });
  //#endregion

  //#region init
  ZAN.cart.onChange(function () {
    renderCounters();
    renderMiniCart();
  });
  ZAN.wishlist.onChange(function () {
    renderCounters();
    syncWishButtons();
  });

  renderCounters();
  renderMiniCart();
  syncWishButtons();
  //#endregion
})(window.ZAN);
