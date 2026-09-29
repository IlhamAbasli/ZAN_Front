/* ==========================================================================
   auth.js — istifadəçinin giriş vəziyyəti və "daxil olun" pəncərəsi
   --------------------------------------------------------------------------
   Qoşulur:     hər səhifədə, site.js-dən sonra, shop.js-dən ƏVVƏL — shop.js
                səbət və sevimlilər düymələrində ZAN.auth.require() çağırır
                (.NET MVC-də: Views/Shared/_Layout.cshtml)
   Asılılıqlar: site.js (ZAN.notify — girişdən sonrakı bildiriş üçün)
   Stil:        components/_auth-gate.scss

   GİRİŞ VƏZİYYƏTİ HARADAN GƏLİR
     1) Server: <body data-auth="user"> və ya <body data-auth="guest">.
        Backend hazır olanda _Layout.cshtml bu atributu yazır, istifadəçi
        məlumatları isə data-user-* atributlarından oxunur:
          <body data-auth="user"
                data-user-name="Ad Soyad"
                data-user-phone="+994 50 123 45 67"
                data-user-email="ad@numune.az">
     2) Demo (atribut yoxdursa): localStorage "zan-demo-user" (profil) və
        "zan-demo-session" (daxil olub-olmaması). login.html və register.html
        formaları action="#" olduqca buraya yazır ki, axın backend-siz də
        yoxlanıla bilsin: qeydiyyat → çıxış → həmin nömrə ilə yenidən giriş.
        TODO (backend): data-auth yazılandan sonra demo rejim öz-özünə sönür.

   Başqa skriptlər üçün API (window.ZAN.auth):
     ZAN.auth.isLoggedIn()          → true / false
     ZAN.auth.user()                → { name, phone, email } və ya null
     ZAN.auth.require("cart")       → daxil olubsa true; olmayıbsa pəncərə
                                      açır və false qaytarır
                                      ("cart" | "wishlist" | "account")
     ZAN.auth.loginUrl() / registerUrl()  → cari səhifəyə qayıtmaq üçün
                                      ?returnUrl= əlavə olunmuş ünvan
     ZAN.auth.safeReturnUrl(value)  → yalnız saytdaxili nisbi ünvanı buraxır
     ZAN.auth.demoSignIn(user) / demoProfile() / signOut()
                                    → yalnız demo rejim üçün
   ========================================================================== */

window.ZAN = window.ZAN || {};

(function (ZAN) {
  "use strict";

  //#region state
  const DEMO_KEY = "zan-demo-user";
  const SESSION_KEY = "zan-demo-session";
  const body = document.body;
  const serverState = body.dataset.auth; // "user" | "guest" | undefined

  function readDemoProfile() {
    try {
      const value = JSON.parse(localStorage.getItem(DEMO_KEY));
      if (value && typeof value === "object") return value;
    } catch (e) {
      /* localStorage bağlıdır və ya məlumat pozulub */
    }
    return null;
  }

  function readServerUser() {
    return {
      name: body.dataset.userName || "",
      phone: body.dataset.userPhone || "",
      email: body.dataset.userEmail || "",
    };
  }

  const isDemo = serverState !== "user" && serverState !== "guest";
  function readDemoSession() {
    try {
      return localStorage.getItem(SESSION_KEY) === "1" ? readDemoProfile() : null;
    } catch (e) {
      return null;
    }
  }

  let currentUser = isDemo ? readDemoSession() : serverState === "user" ? readServerUser() : null;
  //#endregion

  //#region urls
  const LOGIN_PAGE = "login.html";
  const REGISTER_PAGE = "register.html";
  const ACCOUNT_PAGE = "account.html";

  // açıq yönləndirmə olmasın: yalnız "shop.html?x=1" kimi nisbi ünvanlar
  function safeReturnUrl(value) {
    if (!value) return "";
    const url = String(value).trim();
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\\)/i.test(url)) return "";
    if (!/^[\w\-./?=&%#]+$/.test(url)) return "";
    return url;
  }

  function currentPage() {
    const path = window.location.pathname.split("/").pop() || "home.html";
    return path + window.location.search;
  }

  function withReturn(page) {
    const back = currentPage();
    // giriş səhifəsindən yenidən özünə qayıtmağın mənası yoxdur
    if (/^(login|register)\.html/.test(back)) return page;
    return `${page}?returnUrl=${encodeURIComponent(back)}`;
  }
  //#endregion

  //#region gate-dialog
  // Qonaq səbət / sevimlilər düyməsinə basanda açılır. Pəncərə ilk ehtiyac
  // olanda yaranır — daxil olmuş istifadəçinin səhifəsinə heç nə əlavə olunmur.
  const REASONS = {
    cart: {
      icon: '<path d="M5.5 8.5h13l-1.2 11h-10.6z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
      title: "Səbət üçün hesabınıza daxil olun",
      text: "Məhsulları səbətə əlavə etmək və sifariş vermək üçün hesabınıza daxil olun və ya qeydiyyatdan keçin.",
    },
    wishlist: {
      icon: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>',
      title: "Sevimlilər üçün hesabınıza daxil olun",
      text: "Bəyəndiyiniz boyaları yadda saxlamaq üçün hesabınıza daxil olun və ya qeydiyyatdan keçin.",
    },
    account: {
      icon: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5"/>',
      title: "Hesabınıza daxil olun",
      text: "Bu bölmə yalnız qeydiyyatdan keçmiş istifadəçilər üçündür.",
    },
  };

  let gate = null;
  let gateTrigger = null;

  function buildGate() {
    const dialog = document.createElement("dialog");
    dialog.className = "auth-gate";
    dialog.setAttribute("aria-labelledby", "auth-gate-title");
    dialog.setAttribute("aria-describedby", "auth-gate-text");
    dialog.innerHTML = `
      <div class="ag-card">
        <button type="button" class="ag-close" aria-label="Pəncərəni bağla">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <span class="ag-icon" aria-hidden="true"><svg viewBox="0 0 24 24"></svg></span>
        <h2 class="ag-title" id="auth-gate-title"></h2>
        <p class="ag-text" id="auth-gate-text"></p>
        <div class="ag-actions">
          <a class="ag-btn" data-gate-login href="${LOGIN_PAGE}">Daxil ol</a>
          <a class="ag-btn is-ghost" data-gate-register href="${REGISTER_PAGE}">Qeydiyyatdan keç</a>
        </div>
        <p class="ag-note">Qeydiyyat bir dəqiqə çəkir — yalnız telefon, e-poçt və şifrə.</p>
      </div>`;

    dialog.querySelector(".ag-close").addEventListener("click", () => dialog.close());

    // kartın kənarına (arxa fona) klik pəncərəni bağlayır
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      body.classList.remove("has-auth-gate");
      if (gateTrigger && document.contains(gateTrigger)) gateTrigger.focus();
      gateTrigger = null;
    });

    body.appendChild(dialog);
    return dialog;
  }

  function openGate(reason) {
    const copy = REASONS[reason] || REASONS.account;
    gate = gate || buildGate();

    gate.querySelector(".ag-icon svg").innerHTML = copy.icon;
    gate.querySelector(".ag-title").textContent = copy.title;
    gate.querySelector(".ag-text").textContent = copy.text;
    gate.querySelector("[data-gate-login]").href = withReturn(LOGIN_PAGE);
    gate.querySelector("[data-gate-register]").href = withReturn(REGISTER_PAGE);

    gateTrigger = document.activeElement;

    // mini səbət və ya məhsul pəncərəsi açıqdırsa üst-üstə düşməsinlər
    document.querySelectorAll(".offcanvas.show, .modal.show").forEach(function (el) {
      if (!window.bootstrap) return;
      const Ctor = el.classList.contains("modal") ? bootstrap.Modal : bootstrap.Offcanvas;
      const instance = Ctor.getInstance(el);
      if (instance) instance.hide();
    });

    if (typeof gate.showModal === "function") {
      if (!gate.open) gate.showModal();
      body.classList.add("has-auth-gate");
      gate.querySelector("[data-gate-login]").focus();
    } else {
      // <dialog> dəstəklənmirsə birbaşa giriş səhifəsinə
      window.location.href = withReturn(LOGIN_PAGE);
    }
  }
  //#endregion

  //#region api
  ZAN.auth = {
    isDemo: isDemo,
    isLoggedIn: () => Boolean(currentUser),
    user: () => (currentUser ? Object.assign({}, currentUser) : null),

    require(reason) {
      if (currentUser) return true;
      openGate(reason);
      return false;
    },

    loginUrl: () => withReturn(LOGIN_PAGE),
    registerUrl: () => withReturn(REGISTER_PAGE),
    accountUrl: () => ACCOUNT_PAGE,
    safeReturnUrl: safeReturnUrl,

    // TODO (backend): real girişdə istifadəçi server tərəfindən yazılır
    demoSignIn(user) {
      currentUser = {
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      };
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(currentUser));
        localStorage.setItem(SESSION_KEY, "1");
      } catch (e) {
        /* saxlaya bilmiriksə də cari səhifədə vəziyyət qalır */
      }
    },

    // qeydiyyatda saxlanmış profil (çıxışdan sonra da qalır)
    demoProfile: readDemoProfile,

    // TODO (backend): real çıxış serverdə olur (POST /Account/Logout)
    signOut() {
      currentUser = null;
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {
        /* localStorage bağlıdır */
      }
    },
  };
  //#endregion

  //#region header-account
  // header və mobil menyudakı "Şəxsi kabinet" linkləri: qonaq → giriş,
  // daxil olmuş istifadəçi → kabinet. HTML: [data-account-link]
  document.querySelectorAll("[data-account-link]").forEach(function (link) {
    if (currentUser) {
      link.setAttribute("href", ACCOUNT_PAGE);
      link.classList.add("is-signed-in");
      if (/(^|\/)account\.html$/.test(window.location.pathname)) {
        link.setAttribute("aria-current", "page");
      }
    } else {
      link.setAttribute("href", withReturn(LOGIN_PAGE));
    }
  });

  // giriş / qeydiyyatdan sonrakı ilk səhifədə bildiriş (auth-page.js yazır)
  (function welcome() {
    let kind = null;
    try {
      kind = sessionStorage.getItem("zan-welcome");
      sessionStorage.removeItem("zan-welcome");
    } catch (e) {
      return;
    }
    if (!kind || !currentUser || typeof ZAN.notify !== "function") return;

    const firstName = (currentUser.name || "").split(" ")[0];
    ZAN.notify(
      "success",
      kind === "register"
        ? "Artıq məhsulları səbətə və sevimlilərə əlavə edə bilərsiniz."
        : firstName
          ? `Xoş gördük, ${firstName}!`
          : "Xoş gördük!",
      { title: kind === "register" ? "Qeydiyyat tamamlandı" : "Hesabınıza daxil oldunuz" },
    );
  })();

  // qonaq header-dəki sevimlilər linkinə basanda da pəncərə açılır
  document.addEventListener("click", function (e) {
    const link = e.target.closest("a.wishlist, .mobile-quick-links a[href^='wishlist']");
    if (!link || currentUser) return;
    e.preventDefault();
    openGate("wishlist");
  });
  //#endregion
})(window.ZAN);
