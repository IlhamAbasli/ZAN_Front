/* ==========================================================================
   checkout-page.js — sifarişin rəsmiləşdirilməsi (checkout.html)
   --------------------------------------------------------------------------
   Qoşulur:     checkout.html, forms.js-dən sonra
                (.NET MVC-də: Views/Checkout/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), auth.js (ZAN.auth), shop.js (ZAN.cart,
                ZAN.formatPrice), forms.js (ZAN.forms)
   Stil:        pages/order/_layout.scss, pages/order/_checkout.scss
   Saxlama:     localStorage "zan-checkout-address" → son çatdırılma ünvanı
                ({ city, address }) — növbəti sifarişdə forma özü dolur

   Axın: səbət boşdursa cart.html-ə qayıdılır → forma yoxlanır → göndərilir
   (ZAN.forms.submit) → uğurda səbət təmizlənir və "Sifariş qəbul olundu"
   göstərilir. Onlayn ödənişdə server { redirectUrl } qaytarır və ziyarətçi
   ödəniş səhifəsinə keçir.
   TODO (backend): formanın action-u və cavab formatı — checkout.html-də
   #region order-dakı şərhə baxın.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region guard
  if (!ZAN.auth.isLoggedIn()) {
    window.location.replace(ZAN.auth.loginUrl());
    return;
  }

  const CART_PAGE = "cart.html";
  if (ZAN.cart.count() === 0) {
    window.location.replace(CART_PAGE);
    return;
  }
  //#endregion

  const form = document.getElementById("checkout-form");
  const view = document.querySelector("[data-checkout-view]");
  const done = document.querySelector("[data-checkout-done]");
  if (!form || !view) return;

  const fields = form.elements;
  const submitBtn = document.querySelector('button[form="checkout-form"]');
  const itemsList = document.querySelector("[data-checkout-items]");
  const deliveryInfo = document.querySelector("[data-delivery-info]");
  const companyFields = form.querySelector("[data-company-fields]");

  const ADDRESS_KEY = "zan-checkout-address";
  const PAYMENT_LABELS = {
    cash: "Nağd — kuryerə",
    card: "Kartla — kuryerə",
    online: "Onlayn kartla",
    transfer: "Köçürmə (hüquqi şəxs)",
  };

  // sifariş qəbul olunandan sonra səbət təmizlənir — onda cart.html-ə qayıtmırıq
  let placed = false;

  //#region helpers
  const escapeHtml = ZAN.escapeHtml;

  const digits = (value) => String(value).replace(/\D/g, "");

  function setSum(name, text, state) {
    document.querySelectorAll(`[data-sum="${name}"]`).forEach(function (el) {
      el.textContent = text;
      if (state !== undefined) {
        el.classList.toggle("is-note", state === "note");
        el.classList.toggle("is-muted", state === "muted");
      }
    });
  }

  // xəta formanın başındadır, göndər düyməsi isə yan paneldə — xətaya sürüşdürürük
  function scrollToAlert() {
    const alert = form.querySelector(".zf-alert");
    if (!alert.hidden) alert.scrollIntoView({ block: "center", behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth" });
  }

  function readSavedAddress() {
    const value = ZAN.store.get(ADDRESS_KEY, null);
    return value && typeof value === "object" ? value : null;
  }

  const saveAddress = (city, address) => ZAN.store.set(ADDRESS_KEY, { city, address });
  //#endregion

  //#region prefill
  // yalnız boş sahələr doldurulur — server value yazıbsa ona toxunulmur
  function prefill(name, value) {
    const input = fields[name];
    if (input && value && !input.value) input.value = value;
  }

  const user = ZAN.auth.user() || {};
  prefill("name", user.name);
  prefill("phone", user.phone ? ZAN.forms.formatPhone(user.phone) : "");
  prefill("email", user.email);

  const saved = readSavedAddress();
  if (saved) {
    const hasCity = Array.from(fields.city.options).some((opt) => opt.value && opt.value === saved.city);
    if (hasCity && !fields.city.value) fields.city.value = saved.city;
    prefill("address", saved.address);
  }
  //#endregion

  //#region delivery
  // seçilmiş şəhərin müddəti və qiyməti (checkout.html → option[data-days, data-fee])
  function selectedCity() {
    const option = fields.city.options[fields.city.selectedIndex];
    return option && option.value ? option : null;
  }

  // null — şəhər hələ seçilməyib
  function deliveryFee() {
    const option = selectedCity();
    return option ? Number(option.dataset.fee) || 0 : null;
  }

  function renderDelivery() {
    const option = selectedCity();
    const fee = deliveryFee();

    if (deliveryInfo) {
      deliveryInfo.hidden = !option;
      if (option) {
        deliveryInfo.querySelector("span").innerHTML =
          ZAN.t("Çatdırılma <b>{days} iş günü</b> ərzində", { days: escapeHtml(option.dataset.days || "") }) +
          " · " +
          `<b>${fee ? ZAN.formatPrice(fee) : ZAN.t("pulsuz")}</b>`;
      }
    }

    if (fee === null) setSum("delivery", "Şəhəri seçin", "muted");
    else if (fee === 0) setSum("delivery", "Pulsuz", "note");
    else setSum("delivery", ZAN.formatPrice(fee), "");
  }
  //#endregion

  //#region summary
  function itemHtml(item) {
    return `
      <li class="co-item">
        <span class="co-item-thumb">
          <img src="${escapeHtml(item.image)}" alt="" loading="lazy" />
          <i aria-hidden="true">${item.count}</i>
        </span>
        <div>
          <p class="co-item-name">${escapeHtml(ZAN.t(item.name))}</p>
          <span class="co-item-meta">${item.volume ? escapeHtml(ZAN.t(item.volume)) + " · " : ""}${item.count} × ${ZAN.formatPrice(item.price)}</span>
        </div>
        <b class="co-item-total">${ZAN.formatPrice(item.price * item.count)}</b>
      </li>`;
  }

  const orderTotal = () => ZAN.cart.total() + (deliveryFee() || 0);

  function render() {
    if (placed) return;

    const items = ZAN.cart.items();
    // mini səbətdən hamısı silindisə sifariş etməyə bir şey qalmır
    if (!items.length) {
      window.location.replace(CART_PAGE);
      return;
    }

    itemsList.innerHTML = items.map(itemHtml).join("");
    setSum("count", ZAN.t("{n} əd.", { n: ZAN.cart.count() }));
    setSum("subtotal", ZAN.formatPrice(ZAN.cart.total()));
    setSum("total", ZAN.formatPrice(orderTotal()));
    renderDelivery();
  }

  fields.city.addEventListener("change", render);
  //#endregion

  //#region payment
  // köçürmədə şirkət adı və VÖEN tələb olunur
  const isTransfer = () => fields.payment.value === "transfer";

  function syncPayment() {
    const transfer = isTransfer();
    companyFields.hidden = !transfer;
    fields.companyName.required = transfer;
    fields.taxId.required = transfer;
    if (!transfer) {
      validator.show("companyName", "");
      validator.show("taxId", "");
    }
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "payment") syncPayment();
  });

  // VÖEN yalnız rəqəmdir
  fields.taxId.addEventListener("input", function () {
    const clean = digits(fields.taxId.value).slice(0, 10);
    if (clean !== fields.taxId.value) fields.taxId.value = clean;
  });
  //#endregion

  //#region validation
  const rules = ZAN.forms.rules;
  const validator = ZAN.forms.bind(form, {
    name: rules.fullName(),
    phone: rules.phone(),
    email: rules.email({ optional: true }),
    city: rules.required("Şəhər və ya rayonu seçin."),
    address: function (input) {
      const value = input.value.trim();
      if (!value) return "Çatdırılma ünvanını yazın.";
      return value.length < 5 ? "Ünvanı ətraflı yazın: küçə, bina, mənzil." : "";
    },
    payment: rules.someChecked("Ödəniş üsulunu seçin."),
    companyName: function (input) {
      if (!isTransfer()) return "";
      return input.value.trim() ? "" : "Şirkətin adını yazın.";
    },
    taxId: function (input) {
      if (!isTransfer()) return "";
      const value = digits(input.value);
      if (!value) return "VÖEN-i yazın.";
      return value.length === 10 ? "" : "VÖEN 10 rəqəmdən ibarət olmalıdır.";
    },
  });
  //#endregion

  //#region done
  // demo rejimdə server nömrə qaytarmır — tarixdən qısa nömrə düzəldirik
  const demoOrderNumber = () => "ZAN-" + String(Date.now()).slice(-6);

  function setDone(name, text) {
    const el = done.querySelector(`[data-done="${name}"]`);
    if (el) el.textContent = text;
  }

  function showDone(orderNumber) {
    const city = fields.city.value;
    const address = fields.address.value.trim();

    placed = true;
    setDone("number", orderNumber);
    setDone("total", ZAN.formatPrice(orderTotal()));
    setDone("address", `${city}, ${address}`);
    setDone("payment", PAYMENT_LABELS[fields.payment.value] || "—");

    saveAddress(city, address);
    ZAN.cart.clear();

    // addımlar: 2-ci keçildi, 3-cü cari
    const current = document.querySelector('.oh-steps [data-step="checkout"]');
    const last = document.querySelector('.oh-steps [data-step="done"]');
    if (current && last) {
      current.removeAttribute("aria-current");
      current.classList.add("is-done");
      last.setAttribute("aria-current", "step");
    }

    view.hidden = true;
    done.hidden = false;
    window.scrollTo({ top: 0, behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth" });
    done.focus({ preventScroll: true });
  }
  //#endregion

  //#region submit
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    ZAN.forms.showError(form, "");
    if (!validator.validate()) return;

    // spam tələsi doludursa bot-dur — heç nə etmirik
    if (fields.website.value) return;

    const items = ZAN.cart.items();
    if (!items.length) {
      window.location.replace(CART_PAGE);
      return;
    }
    // qiymət göndərilmir — server özü hesablayır
    fields.items.value = JSON.stringify(items.map((item) => ({ id: item.id, count: item.count })));

    ZAN.forms.setLoading(submitBtn, true);
    ZAN.forms
      .submit(form)
      .then(function (data) {
        const result = data || {};
        // onlayn ödəniş: bankın ödəniş səhifəsinə
        if (result.redirectUrl) {
          placed = true;
          ZAN.cart.clear();
          window.location.href = result.redirectUrl;
          return;
        }
        ZAN.forms.setLoading(submitBtn, false);
        showDone(result.orderNumber || demoOrderNumber());
      })
      .catch(function (error) {
        ZAN.forms.setLoading(submitBtn, false);
        ZAN.forms.handleError(form, validator, error, "Sifarişi göndərmək alınmadı. Bir az sonra yenidən cəhd edin.");
        scrollToAlert();
      });
  });
  //#endregion

  //#region init
  ZAN.cart.onChange(render);
  syncPayment();
  render();
  view.hidden = false;
  //#endregion
})(window.ZAN);
