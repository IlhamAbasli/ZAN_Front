/* ==========================================================================
   wishlist-page.js — sevimlilər səhifəsi (wishlist.html)
   --------------------------------------------------------------------------
   Qoşulur:     wishlist.html, site.js → auth.js → shop.js-dən sonra
                (.NET MVC-də: Views/Wishlist/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), auth.js (ZAN.auth), shop.js (ZAN.wishlist,
                ZAN.cart, ZAN.formatPrice)
   Stil:        pages/wishlist/_list.scss, kart — components/_product-card.scss

   Sevimlilər shop.js-də saxlanılır (localStorage "wishlist"). Kartlar
   kataloqdakı <article class="product-card"> ilə eyni quruluşdadır, ona görə
   "Səbətə at" və ürək düyməsi shop.js-in ümumi işləyicisi ilə işləyir;
   ürəyə basanda məhsul siyahıdan çıxır (bildirişdə "Geri qaytar" var).
   TODO (backend): sevimlilər serverə köçəndə kartlar serverdə render oluna
   bilər — onda render()-ə ehtiyac qalmır, yalnız boş vəziyyət və düymələr.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region guard
  // sevimlilər yalnız daxil olmuş istifadəçi üçündür (shop.js → ZAN.auth.require)
  if (!ZAN.auth.isLoggedIn()) {
    window.location.replace(ZAN.auth.loginUrl());
    return;
  }
  //#endregion

  const view = document.querySelector("[data-wishlist-view]");
  const empty = document.querySelector("[data-wishlist-empty]");
  const grid = document.querySelector("[data-wishlist-grid]");
  if (!view || !grid) return;

  const addAllButton = document.querySelector("[data-wl-add-all]");
  const clearButton = document.querySelector("[data-wl-clear]");

  //#region helpers
  const escapeHtml = ZAN.escapeHtml;

  // köhnə yazılarda link yoxdur — məhsul səhifəsi id ilə açılır
  const productUrl = (item) => item.url || `product-detail.html?id=${encodeURIComponent(item.id)}`;

  // köhnə yazılarda stok məlumatı yoxdur — stokda sayılır
  const wishItems = () =>
    ZAN.wishlist.items().map((item) => Object.assign({}, item, { inStock: item.inStock !== false }));

  const setText = (name, text) =>
    document.querySelectorAll(`[data-wl="${name}"]`).forEach((el) => (el.textContent = text));

  const ICON_HEART =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  const ICON_CART =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 8.5h13l-1.2 11h-10.6z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/></svg>';
  //#endregion

  //#region render
  // kataloq kartı ilə eyni HTML (shop.html → #region catalog), sürətli baxışsız
  function cardHtml(item) {
    // ad Azərbaycanca saxlanılır — göstərəndə tərcümə olunur
    const name = escapeHtml(ZAN.t(item.name));
    const url = escapeHtml(productUrl(item));
    const onSale = item.oldPrice && item.oldPrice > item.price;
    const discount = onSale ? Math.round((1 - item.price / item.oldPrice) * 100) : 0;

    const badges = [
      onSale ? `<span class="pc-badge is-sale">−${discount}%</span>` : "",
      item.inStock ? "" : '<span class="pc-badge is-out">Stokda yoxdur</span>',
    ].join("");

    return `
      <article
        class="product-card"
        data-id="${escapeHtml(item.id)}"
        data-category="${escapeHtml(item.categorySlug || "")}"
        data-price="${item.price}"
        ${onSale ? `data-old-price="${item.oldPrice}"` : ""}
        data-stock="${item.inStock ? "in" : "out"}"
        data-volume="${escapeHtml(item.volume || "")}"
      >
        <div class="pc-media">
          ${badges ? `<div class="pc-badges">${badges}</div>` : ""}
          <button type="button" class="pc-icon-btn pc-wish" data-action="toggle-wishlist" aria-pressed="true" aria-label="Sevimlilərdən çıxar">${ICON_HEART}</button>
          <a class="pc-image" href="${url}" tabindex="-1" aria-hidden="true">
            <img src="${escapeHtml(item.image)}" alt="" loading="lazy" />
          </a>
        </div>
        <div class="pc-body">
          ${item.category ? `<span class="pc-category">${escapeHtml(item.category)}</span>` : ""}
          <h3 class="pc-name"><a href="${url}">${name}</a></h3>
          ${item.volume ? `<div class="pc-meta"><span class="pc-chip">${escapeHtml(ZAN.t(item.volume))}</span></div>` : ""}
          <div class="pc-foot">
            <p class="pc-price">${onSale ? `<s>${ZAN.formatPrice(item.oldPrice)}</s>` : ""}<b>${ZAN.formatPrice(item.price)}</b></p>
            <button type="button" class="pc-cart" data-action="add-to-cart" ${item.inStock ? 'aria-label="Səbətə at"' : 'aria-label="Stokda yoxdur" disabled'}>${ICON_CART}<span>Səbətə at</span></button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const items = wishItems();
    const isEmpty = items.length === 0;
    const hadFocus = view.contains(document.activeElement);
    const outCount = items.filter((item) => !item.inStock).length;

    // silinən kartın yerinə növbətisinə fokus (klaviatura ilə işləyəndə)
    const focusedCard = document.activeElement && document.activeElement.closest(".product-card");
    const focusIndex = focusedCard ? Array.from(grid.children).indexOf(focusedCard) : -1;

    grid.innerHTML = items.map(cardHtml).join("");

    setText("count", ZAN.t("{n} məhsul", { n: items.length }));
    setText("note", outCount ? ZAN.t("{n} məhsul hazırda stokda yoxdur", { n: outCount }) : "");
    if (addAllButton) addAllButton.disabled = items.length === outCount;

    view.hidden = isEmpty;
    if (empty) empty.hidden = !isEmpty;

    if (isEmpty) {
      if (hadFocus && empty) empty.focus();
      return;
    }

    if (focusIndex >= 0) {
      const card = grid.children[Math.min(focusIndex, grid.children.length - 1)];
      card.querySelector('[data-action="toggle-wishlist"]').focus({ preventScroll: true });
    }
  }
  //#endregion

  //#region actions
  // stokda olanların hamısı 1 ədəd səbətə; artıq səbətdədirsə sayı artır
  if (addAllButton) {
    addAllButton.addEventListener("click", function () {
      const available = wishItems().filter((item) => item.inStock);
      if (!available.length) return;

      available.forEach((item) => ZAN.cart.add(Object.assign({}, item, { url: productUrl(item) }), 1));
      ZAN.notify("success", ZAN.t("{n} məhsul səbətə əlavə olundu", { n: available.length }), {
        title: "Səbətə əlavə olundu",
        icon: "cart",
        action: { label: "Səbətə keç", onClick: () => (window.location.href = "cart.html") },
      });
    });
  }

  // hamısını silmək — bildirişdən geri qaytarmaq olur
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      const snapshot = ZAN.wishlist.items();
      if (!snapshot.length) return;
      ZAN.wishlist.clear();
      ZAN.notify("info", ZAN.t("{n} məhsul silindi", { n: snapshot.length }), {
        title: "Sevimlilər təmizləndi",
        icon: "heart",
        action: {
          label: "Geri qaytar",
          onClick: () => snapshot.forEach((item) => ZAN.wishlist.has(item.id) || ZAN.wishlist.toggle(item)),
        },
      });
    });
  }
  //#endregion

  //#region init
  ZAN.wishlist.onChange(render);
  render();
  //#endregion
})(window.ZAN);
