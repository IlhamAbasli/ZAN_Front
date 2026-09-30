/* ==========================================================================
   cart-page.js — səbət səhifəsi (cart.html)
   --------------------------------------------------------------------------
   Qoşulur:     cart.html, site.js → auth.js → shop.js-dən sonra
                (.NET MVC-də: Views/Cart/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), auth.js (ZAN.auth), shop.js (ZAN.cart,
                ZAN.formatPrice)
   Stil:        pages/order/_layout.scss, pages/order/_cart.scss

   Səbət shop.js-də saxlanılır (localStorage "products"); bu skript yalnız
   onu göstərir və dəyişir. Mini səbətdə edilən dəyişiklik də burada dərhal
   görünür (ZAN.cart.onChange).
   TODO (backend): səbət serverə köçəndə sətirlər və rəqəmlər serverdə
   render oluna bilər — HTML quruluşu (.ct-item) eyni qalmalıdır.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region guard
  // səbət yalnız daxil olmuş istifadəçi üçündür (shop.js → ZAN.auth.require)
  if (!ZAN.auth.isLoggedIn()) {
    window.location.replace(ZAN.auth.loginUrl());
    return;
  }
  //#endregion

  const view = document.querySelector("[data-cart-view]");
  const empty = document.querySelector("[data-cart-empty]");
  const list = document.querySelector("[data-cart-list]");
  if (!view || !list) return;

  const MAX_COUNT = ZAN.cart.MAX_COUNT;

  //#region helpers
  const escapeHtml = ZAN.escapeHtml;

  const countLabel = (count) => ZAN.t("{n} əd.", { n: count });

  const ICON_TRASH =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
  //#endregion

  //#region render
  function itemHtml(item) {
    // məhsul adı səbətdə Azərbaycanca saxlanılır — göstərəndə tərcümə olunur
    const name = escapeHtml(ZAN.t(item.name));
    // köhnə yazılarda url yoxdur — onda ad sadə mətn olur
    const url = item.url ? escapeHtml(item.url) : "";
    const title = url ? `<a class="ct-name" href="${url}">${name}</a>` : `<p class="ct-name">${name}</p>`;
    const thumb = `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />`;

    return `
      <li class="ct-item" data-id="${escapeHtml(item.id)}">
        ${url ? `<a class="ct-thumb" href="${url}" tabindex="-1" aria-hidden="true">${thumb}</a>` : `<span class="ct-thumb">${thumb}</span>`}
        <div class="ct-info">
          ${title}
          <div class="ct-meta">
            ${item.volume ? `<span class="ct-volume">${escapeHtml(ZAN.t(item.volume))}</span>` : ""}
            <span>${ZAN.t("{price} / əd.", { price: ZAN.formatPrice(item.price) })}</span>
          </div>
        </div>
        <div class="qty qty-lg ct-qty" role="group" aria-label="${escapeHtml(ZAN.t("{name} — say", { name: ZAN.t(item.name) }))}">
          <button type="button" data-ct="dec" aria-label="Azalt" ${item.count <= 1 ? "disabled" : ""}>−</button>
          <input type="number" inputmode="numeric" min="1" max="${MAX_COUNT}" value="${item.count}" data-ct="set" aria-label="Say" />
          <button type="button" data-ct="inc" aria-label="Artır" ${item.count >= MAX_COUNT ? "disabled" : ""}>+</button>
        </div>
        <b class="ct-total">${ZAN.formatPrice(item.price * item.count)}</b>
        <button type="button" class="ct-remove" data-ct="remove" aria-label="${escapeHtml(ZAN.t("{name} — səbətdən sil", { name: ZAN.t(item.name) }))}">${ICON_TRASH}</button>
      </li>`;
  }

  function setSum(name, text) {
    document.querySelectorAll(`[data-sum="${name}"]`).forEach((el) => (el.textContent = text));
  }

  function render() {
    const items = ZAN.cart.items();
    const isEmpty = items.length === 0;
    const hadFocus = view.contains(document.activeElement);

    // siyahı yenidən çəkilir — fokus eyni sətirdə qalsın (klaviatura ilə işləyəndə)
    const focused = list.contains(document.activeElement) ? document.activeElement : null;
    const focusItem = focused && focused.closest(".ct-item");
    const focusKey = focusItem ? [focusItem.dataset.id, focused.dataset.ct] : null;

    list.innerHTML = items.map(itemHtml).join("");
    setSum("count", countLabel(ZAN.cart.count()));
    setSum("subtotal", ZAN.formatPrice(ZAN.cart.total()));
    setSum("total", ZAN.formatPrice(ZAN.cart.total()));

    view.hidden = isEmpty;
    if (empty) empty.hidden = !isEmpty;

    // son məhsul silindi — fokus boş səbət blokuna keçir
    if (isEmpty) {
      if (hadFocus && empty) empty.focus();
      return;
    }

    if (focusKey) {
      const item = list.querySelector(`.ct-item[data-id="${CSS.escape(focusKey[0])}"]`);
      const target = item && item.querySelector(`[data-ct="${focusKey[1]}"]:not(:disabled)`);
      const fallback = item ? item.querySelector('[data-ct="set"]') : list.querySelector('[data-ct="remove"]');
      (target || fallback || document.getElementById("ct-title")).focus({ preventScroll: true });
    }
  }
  //#endregion

  //#region actions
  function removeItem(id) {
    const removed = ZAN.cart.remove(id);
    if (!removed) return;
    ZAN.notify("info", removed.name, {
      title: "Səbətdən silindi",
      icon: "cart",
      image: removed.image,
      action: { label: "Geri qaytar", onClick: () => ZAN.cart.add(removed, removed.count) },
    });
  }

  list.addEventListener("click", function (e) {
    const button = e.target.closest("button[data-ct]");
    if (!button) return;

    const id = button.closest(".ct-item").dataset.id;
    const item = ZAN.cart.items().find((entry) => entry.id === id);
    if (!item) return;

    if (button.dataset.ct === "inc") ZAN.cart.setCount(id, item.count + 1);
    if (button.dataset.ct === "dec") ZAN.cart.setCount(id, item.count - 1);
    if (button.dataset.ct === "remove") removeItem(id);
  });

  // say əl ilə yazılanda: sahədən çıxanda və ya Enter-də
  list.addEventListener("change", function (e) {
    if (e.target.dataset.ct !== "set") return;
    ZAN.cart.setCount(e.target.closest(".ct-item").dataset.id, e.target.value);
  });

  // hamısını silmək — bildirişdən geri qaytarmaq olur
  const clearButton = document.querySelector("[data-cart-clear]");
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      const snapshot = ZAN.cart.items();
      if (!snapshot.length) return;
      ZAN.cart.clear();
      ZAN.notify("info", ZAN.t("{n} məhsul silindi", { n: snapshot.length }), {
        title: "Səbət təmizləndi",
        icon: "cart",
        action: {
          label: "Geri qaytar",
          onClick: () => snapshot.forEach((item) => ZAN.cart.add(item, item.count)),
        },
      });
    });
  }
  //#endregion

  //#region init
  ZAN.cart.onChange(render);
  render();
  //#endregion
})(window.ZAN);
