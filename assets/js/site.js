/* ==========================================================================
   site.js — bütün səhifələrdə işləyən layout skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     hər səhifədə, <body>-nin sonunda, auth.js və shop.js-dən əvvəl
                (.NET MVC-də: Views/Shared/_Layout.cshtml)
   Asılılıqlar: yoxdur (vanilla JS)
   Namespace:   window.ZAN — shop.js və səhifə skriptlərinin (home.js ...)
                istifadə etdiyi ortaq köməkçilər: prefersReducedMotion,
                escapeHtml, copyText, store (localStorage), notify, headerSearch
   ========================================================================== */

//#region namespace
window.ZAN = window.ZAN || {};

(function (ZAN) {
  "use strict";

  /**
   * Sistemdə "animasiyaları azalt" açıqdırsa true. Bu halda sayt işləməyə
   * davam edir, yalnız böyük hərəkətlər (parallaks, sürüşmə) yumşaldılır.
   */
  ZAN.prefersReducedMotion = function () {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  /**
   * innerHTML-ə yazılan istənilən mətn (məhsul adı, URL parametri, server
   * məlumatı) bundan keçməlidir: & < > " ' → HTML entity.
   */
  ZAN.escapeHtml = function (text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  };

  /**
   * localStorage üçün təhlükəsiz köməkçi: gizli rejimdə və ya bağlı
   * olanda xəta atmır, pozulmuş JSON-da fallback qaytarır.
   *   ZAN.store.get(key, fallback)  → JSON.parse edilmiş dəyər
   *   ZAN.store.set(key, value)     → JSON.stringify edib yazır
   *   ZAN.store.remove(key)
   */
  /**
   * Mətni buferə köçürür → Promise. file:// və http-də Clipboard API
   * bağlıdır — onda gizli textarea + execCommand("copy") işlədilir.
   */
  ZAN.copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        /* köhnə brauzer */
      }
      area.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    });
  };

  ZAN.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* saxlaya bilmiriksə də cari səhifədə vəziyyət qalır */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        /* localStorage bağlıdır */
      }
    },
  };
})(window.ZAN);
//#endregion

//#region notify
// Öz bildiriş komponentimiz (toastr əvəzinə). Stil: components/_toast.scss
(function (ZAN) {
  "use strict";

  const DURATION = 1500;
  // düyməli bildiriş ("Geri qaytar", "Səbətə bax") — basmağa vaxt qalsın
  const DURATION_ACTION = 5000;
  const MAX_VISIBLE = 4;
  const SWIPE_CLOSE = 90; // bu qədər px sürüşdürüləndə bağlanır

  const TITLES = {
    success: "Uğurlu",
    error: "Xəta",
    warning: "Diqqət",
    info: "Məlumat",
  };

  // ikonlar 24×24 viewBox-da, rəngi CSS verir (stroke: currentColor)
  const ICONS = {
    success: '<path d="m5 12.5 4.2 4.2L19 7.5"/>',
    error: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',
    warning: '<path d="M12 6.5v7"/><path d="M12 17.5h.01"/>',
    info: '<path d="M12 10.5v7"/><path d="M12 6.5h.01"/>',
    cart: '<path d="M5.5 8.5h13l-1.2 11h-10.6z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    heart:
      '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>',
  };

  let stack = null;

  function getStack() {
    if (!stack) {
      stack = document.createElement("section");
      stack.className = "zan-toasts";
      stack.setAttribute("aria-label", "Bildirişlər");
      document.body.appendChild(stack);
    }
    return stack;
  }

  // mətn həmişə textContent ilə yazılır (məhsul adı HTML-dən oxunur)
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(paths) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  }

  // vaxt zolağının animasiyasını sıfırdan başladır
  function restartTimer(toast) {
    const timer = toast.querySelector(".zan-toast-timer");
    timer.style.animation = "none";
    void timer.offsetWidth;
    timer.style.animation = "";
  }

  // kart çıxır, sonra sarğının hündürlüyü yığılır ki, altdakılar hamarca qalxsın
  function dismiss(toast) {
    if (toast.classList.contains("is-leaving")) return;
    toast.classList.add("is-leaving");

    let collapsed = false;
    const collapse = function () {
      if (collapsed) return;
      collapsed = true;
      toast.style.height = toast.offsetHeight + "px";
      toast.classList.add("is-collapsing");
      void toast.offsetHeight;
      toast.style.height = "0px";
      toast.style.marginBottom = "0px";
      setTimeout(() => toast.remove(), 320);
    };

    const card = toast.querySelector(".zan-toast-card");
    card.addEventListener(
      "animationend",
      (e) => e.target === card && collapse(),
    );
    setTimeout(collapse, 300); // sürüşdürmədə və animasiya olmayanda
  }

  // barmaq və ya siçanla yana sürüşdürüb bağlamaq
  function enableSwipe(toast) {
    const card = toast.querySelector(".zan-toast-card");
    let startX = null;

    card.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("button, a")) return;
      startX = e.clientX;
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener("pointermove", function (e) {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) < 4) return;
      toast.classList.add("is-dragging");
      toast.style.setProperty("--zt-dx", dx + "px");
      toast.style.setProperty(
        "--zt-fade",
        Math.min(Math.abs(dx) / (SWIPE_CLOSE * 2.2), 0.8),
      );
    });

    const release = function (e) {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      toast.classList.remove("is-dragging");

      if (Math.abs(dx) >= SWIPE_CLOSE) {
        toast.style.setProperty("--zt-dx", (dx > 0 ? 1 : -1) * 420 + "px");
        toast.classList.add("is-swiped");
        dismiss(toast);
      } else {
        toast.style.removeProperty("--zt-dx");
      }
    };
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
  }

  /**
   * Bildiriş göstərir.
   *   type:    "success" | "error" | "warning" | "info"
   *   message: əsas mətn
   *   options: {
   *     title:    başlıq (standart: "Uğurlu", "Xəta", "Diqqət", "Məlumat")
   *     icon:     "cart" | "heart" — növün ikonunun əvəzinə
   *     image:    məhsul şəklinin ünvanı (sağda kiçik şəkil)
   *     action:   { label, onClick } — mətnin altında düymə
   *     duration: ms (standart 1500, düyməli bildirişdə 5000)
   *   }
   * Eyni bildiriş artıq görünürsə yenisi yaranmır: ×2, ×3 sayğacı artır.
   */
  ZAN.notify = function (type, message, options) {
    const opts = options || {};
    if (!TITLES[type]) type = "info";

    const root = getStack();
    const title = opts.title || TITLES[type];
    const key = [type, title, message].join("|");

    const twin = Array.from(root.children).find(
      (t) => t.dataset.key === key && !t.classList.contains("is-leaving"),
    );
    if (twin) {
      const count = Number(twin.dataset.count) + 1;
      const badge = twin.querySelector(".zan-toast-count");
      twin.dataset.count = count;
      badge.textContent = "×" + count;
      badge.classList.remove("is-bumped");
      void badge.offsetWidth;
      badge.classList.add("is-bumped");
      restartTimer(twin);
      return twin;
    }

    const toast = el("div", `zan-toast zan-toast-${type}`);
    toast.dataset.key = key;
    toast.dataset.count = 1;
    toast.setAttribute(
      "role",
      type === "error" || type === "warning" ? "alert" : "status",
    );
    toast.style.setProperty(
      "--zt-duration",
      (opts.duration || (opts.action ? DURATION_ACTION : DURATION)) + "ms",
    );

    const card = el("div", "zan-toast-card");
    card.innerHTML =
      '<span class="zan-toast-splash" aria-hidden="true"></span>' +
      `<span class="zan-toast-icon" aria-hidden="true">${svg(ICONS[opts.icon] || ICONS[type])}</span>`;

    const body = el("div", "zan-toast-body");
    const heading = el("p", "zan-toast-title");
    heading.append(el("span", null, title), el("b", "zan-toast-count"));
    body.append(heading);
    if (message) body.append(el("p", "zan-toast-text", message));

    if (opts.action && opts.action.label) {
      const actionBtn = el("button", "zan-toast-action", opts.action.label);
      actionBtn.type = "button";
      actionBtn.addEventListener("click", function () {
        if (typeof opts.action.onClick === "function") opts.action.onClick();
        dismiss(toast);
      });
      body.append(actionBtn);
    }
    card.append(body);

    if (opts.image) {
      const thumb = el("img", "zan-toast-thumb");
      thumb.src = opts.image;
      thumb.alt = "";
      card.append(thumb);
    }

    const closeBtn = el("button", "zan-toast-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Bildirişi bağla");
    closeBtn.innerHTML = svg('<path d="M7 7l10 10M17 7 7 17"/>');
    closeBtn.addEventListener("click", () => dismiss(toast));
    card.append(closeBtn);

    const timer = el("span", "zan-toast-timer");
    timer.setAttribute("aria-hidden", "true");
    timer.addEventListener("animationend", () => dismiss(toast));
    card.append(timer);

    toast.append(card);
    enableSwipe(toast);
    root.prepend(toast); // ən yenisi yuxarıda

    // çox yığılmasın: ən köhnələr bağlanır
    const alive = Array.from(root.children).filter(
      (t) => !t.classList.contains("is-leaving"),
    );
    alive.slice(MAX_VISIBLE).forEach(dismiss);

    return toast;
  };
})(window.ZAN);
//#endregion

//#region preloader
// DOM hazır olmasını gözləmədən işə düşür: səhifə yüklənən kimi gizlənməlidir.
(function () {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  // qısa yüklənmədə preloader "sayrışmasın"
  const MIN_VISIBLE = 450;
  // şəkil və ya şrift ilişsə belə səhifə açıq qalsın
  const MAX_VISIBLE = 4000;
  const startedAt = Date.now();
  let isHidden = false;

  function hidePreloader() {
    if (isHidden) return;
    isHidden = true;
    preloader.classList.add("is-hidden");
  }

  function hideAfterMinimum() {
    setTimeout(
      hidePreloader,
      Math.max(0, MIN_VISIBLE - (Date.now() - startedAt)),
    );
  }

  if (document.readyState === "complete") {
    hideAfterMinimum();
  } else {
    window.addEventListener("load", hideAfterMinimum);
  }

  setTimeout(hidePreloader, MAX_VISIBLE);
})();
//#endregion

//#region header-search
// Header axtarışı: söz (q) və kateqoriya (category) adi GET forması kimi
// <form action>-dakı ünvana göndərilir:
//   shop.html?q=lak&category=sintetik-boyalar
// Boş sahələr URL-ə düşmür. Kateqoriya "Bütün kateqoriyalar"dırsa yalnız q gedir.
//
// Backend (MVC): action → asp-controller="Shop" asp-action="Index",
//   public IActionResult Index(string q, string category) — category slug-dır.
//   Cari kateqoriyanı göstərmək üçün server uyğun radio-ya `checked` yazır;
//   düymənin mətni səhifə açılanda ondan götürülür.
//
// Səhifə axtarışı özü icra etmək istəyirsə (shop.html — səhifə yenilənmədən)
// document-də "zan:search" hadisəsini dinləyib preventDefault() çağırır:
//   e.detail = { form, q, category }  category: "" — hamısı, "slug" — bir kateqoriya,
//   null — formada kateqoriya seçimi yoxdur və ya heç biri seçilməyib
// DOM hazır olmasını gözləmir: shop-page.js ZAN.headerSearch-ü dərhal işlədir.
(function (ZAN) {
  "use strict";

  const forms = Array.from(document.querySelectorAll("form.search-area, form.mobile-search"));
  const DEFAULT_LABEL = "Kateqoriyalar";

  const radios = (form) => Array.from(form.querySelectorAll('input[type="radio"][name="category"]'));
  const queryInput = (form) => form.querySelector('input[name="q"]');

  // düymədə seçilmiş kateqoriyanın adı görünür
  function setLabel(form, text, filtered) {
    const label = form.querySelector("[data-search-category-label]");
    if (!label) return;
    const selector = label.closest(".selector");

    label.textContent = text;
    selector.classList.toggle("is-filtered", filtered);
    if (filtered) {
      selector.setAttribute("aria-label", ZAN.t("Kateqoriya: {name}", { name: text }));
    } else {
      selector.removeAttribute("aria-label");
    }
  }

  function labelFromRadios(form) {
    const checked = radios(form).find((r) => r.checked);
    if (checked && checked.value) {
      setLabel(form, checked.nextElementSibling.textContent.trim(), true);
    } else {
      setLabel(form, DEFAULT_LABEL, false);
    }
  }

  function closeMenu(form) {
    const toggle = form.querySelector(".selector[aria-controls]");
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", "false");
    const menu = document.getElementById(toggle.getAttribute("aria-controls"));
    if (menu) menu.classList.remove("is-open");
  }

  // boş dəyərlər atılır: "?q=&category=" əvəzinə təmiz ünvan
  function readForm(form) {
    const params = new URLSearchParams();
    new FormData(form).forEach(function (value, key) {
      const text = String(value).trim();
      if (text) params.append(key, text);
    });
    return params;
  }

  forms.forEach(function (form) {
    labelFromRadios(form);

    form.addEventListener("change", function (e) {
      if (e.target.name === "category") labelFromRadios(form);
    });

    // siçanla seçiləndə menyu bağlanır və fokus axtarış sahəsinə qayıdır.
    // Klaviaturada oxlarla gəzmək menyunu bağlamır (o zaman click-in hədəfi
    // radio-nun özüdür) — seçib Enter basmaq axtarışı başladır.
    form.addEventListener("click", function (e) {
      const option = e.target.closest(".search-cat");
      if (!option || e.target.matches("input")) return;
      setTimeout(function () {
        closeMenu(form);
        const input = queryInput(form);
        if (input) input.focus();
      }, 0);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      closeMenu(form);

      const params = readForm(form);
      const group = radios(form);
      const checked = group.find((r) => r.checked);
      const detail = {
        form: form,
        q: params.get("q") || "",
        // heç biri seçilməyibsə (shop.html-də bir neçə kateqoriya süzülür) — null
        category: group.length && checked ? checked.value : null,
      };

      // səhifə axtarışı özü icra etdi (məs. shop-page.js) — keçid lazım deyil
      const event = new CustomEvent("zan:search", { cancelable: true, detail: detail });
      if (!document.dispatchEvent(event)) return;

      const url = new URL(form.action || window.location.href, window.location.href);
      url.search = params.toString();
      window.location.href = url.href;
    });
  });

  ZAN.headerSearch = {
    forms: forms,

    /**
     * Səhifənin vəziyyətini header formalarına köçürür (shop.html filtrləri).
     *   categories: [] — hamısı, ["slug"] — bir kateqoriya,
     *               bir neçəsi — heç biri seçilmir, düymədə "N kateqoriya"
     */
    set(q, categories) {
      const list = categories || [];

      forms.forEach(function (form) {
        const input = queryInput(form);
        if (input && document.activeElement !== input && input.value !== q) {
          input.value = q;
          // placeholder animasiyası dayansın (dəyər varkən mənasızdır)
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        const group = radios(form);
        if (!group.length) return;

        if (list.length > 1) {
          group.forEach((r) => (r.checked = false));
          setLabel(form, `${list.length} kateqoriya`, true);
          return;
        }
        const target = group.find((r) => r.value === (list[0] || "")) || group.find((r) => !r.value);
        if (target) target.checked = true;
        labelFromRadios(form);
      });
    },
  };
})(window.ZAN);
//#endregion

// layout: header, mövzu, scroll, mobil menyu, footer. Skript <body>-nin sonunda
// qoşulur — DOM artıq hazırdır, ayrıca "ready" gözləmək lazım deyil.
(function (ZAN) {
  "use strict";

  //#region search-placeholder
  // Axtarış sahəsinin placeholder-i yazılıb-silinən animasiya ilə dəyişir.
  const searchInput = document.getElementById("product-search");
  // hərf-hərf yazılır — tərcümə əvvəlcədən (observer yarımçıq mətni tanımır)
  const placeholders = [
    "Məhsul axtarışı...",
    "Su əsaslı boya axtarın...",
    "Sintetik boya axtarın...",
    "Sellülozik boya axtarın...",
  ].map((text) => ZAN.t(text));
  let placeholderIndex = 0;
  let characterIndex = 0;
  let isDeleting = false;
  let placeholderTypingActive = true;

  function typePlaceholder() {
    // istifadəçi yazmağa başlayanda animasiya ona mane olmasın
    if (!placeholderTypingActive) return;

    const currentPlaceholder = placeholders[placeholderIndex];
    const visibleText = isDeleting
      ? currentPlaceholder.slice(0, characterIndex - 1)
      : currentPlaceholder.slice(0, characterIndex + 1);

    searchInput.setAttribute("placeholder", visibleText);
    characterIndex += isDeleting ? -1 : 1;

    let typingDelay = isDeleting ? 45 : 80;

    if (!isDeleting && characterIndex === currentPlaceholder.length) {
      isDeleting = true;
      typingDelay = 1500;
    } else if (isDeleting && characterIndex === 0) {
      isDeleting = false;
      placeholderIndex = (placeholderIndex + 1) % placeholders.length;
      typingDelay = 400;
    }

    setTimeout(typePlaceholder, typingDelay);
  }

  if (searchInput) {
    const stopTyping = function () {
      placeholderTypingActive = false;
      searchInput.setAttribute("placeholder", placeholders[0]);
    };
    searchInput.addEventListener("focus", stopTyping);
    searchInput.addEventListener("input", stopTyping);

    typePlaceholder();
  }
  //#endregion

  //#region theme
  // Mövzu <html data-theme> atributu ilə idarə olunur. Seçim localStorage-də
  // saxlanılır; seçim yoxdursa sistemin prefers-color-scheme dəyəri işləyir.
  // İlk rəsmdən əvvəl tətbiqi: head-init.js (<head>-də qoşulur)
  // (açar adı eyni olmalıdır; dəyər JSON deyil, sadə "dark" / "light").
  const THEME_KEY = "zan-theme";
  const themeRoot = document.documentElement;
  const themeToggles = document.querySelectorAll(".theme-toggle");
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function storedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "dark" || saved === "light" ? saved : null;
    } catch (e) {
      return null;
    }
  }

  function activeTheme() {
    const attr = themeRoot.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return darkQuery.matches ? "dark" : "light";
  }

  // düymənin mətni növbəti addımı bildirir; dar ekranda mətn gizləndiyi üçün
  // eyni ifadə aria-label kimi də yazılır
  function syncThemeToggles() {
    const label = ZAN.t(activeTheme() === "dark" ? "İşıqlı rejim" : "Tünd rejim");

    themeToggles.forEach(function (toggle) {
      toggle.setAttribute("aria-label", label);
      const text = toggle.querySelector(".theme-toggle-label");
      if (text) text.textContent = label;
    });
  }

  syncThemeToggles();

  themeToggles.forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      const next = activeTheme() === "dark" ? "light" : "dark";

      themeRoot.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* saxlaya bilmiriksə də cari sessiyada mövzu işləyir */
      }
      syncThemeToggles();
    });
  });

  // istifadəçi əl ilə seçim etməyibsə, sistem rejimi dəyişəndə də uyğunlaşırıq
  if (typeof darkQuery.addEventListener === "function") {
    darkQuery.addEventListener("change", function () {
      if (!storedTheme()) syncThemeToggles();
    });
  }
  //#endregion

  //#region header-disclosures
  // data-disclosure atributu olan hər düymə aria-controls ilə göstərdiyi
  // paneli açıb-örtür: dil seçimi, axtarış kateqoriyaları və kataloq
  const disclosures = Array.from(document.querySelectorAll("[data-disclosure]"));
  const panelOf = (toggle) => document.getElementById(toggle.getAttribute("aria-controls"));

  function setDisclosure(toggle, open) {
    toggle.setAttribute("aria-expanded", String(open));
    const panel = panelOf(toggle);
    if (panel) panel.classList.toggle("is-open", open);
  }

  function closeAllDisclosures(except) {
    disclosures.forEach(function (toggle) {
      if (toggle !== except) setDisclosure(toggle, false);
    });
  }

  disclosures.forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      closeAllDisclosures(toggle);
      setDisclosure(toggle, !isOpen);
    });
  });

  // panelin kənarına klik onu bağlayır
  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-disclosure], .menu, .categories")) closeAllDisclosures();
  });
  //#endregion

  //#region empty-links
  // href="#" — hələ ünvanı olmayan linklər (sosial şəbəkələr, dil seçimi):
  // klikdə səhifə yuxarı sıçramasın. JS sonradan href yazırsa (paylaşma) — təsirsizdir.
  document.addEventListener("click", function (e) {
    if (e.target.closest('a[href="#"]')) e.preventDefault();
  });
  //#endregion

  //#region scroll-state
  // yuxarı qalxma düyməsi və sabit header eyni scroll hadisəsindən idarə olunur
  const backToTop = document.getElementById("button");
  const headerSticky = document.getElementById("header-sticky");
  let scrollTicking = false;

  // yuxarı qalxma düyməsinin kənarındakı halqa oxunma tərəqqisini göstərir
  const progressBar = document.querySelector("#button .scroll-progress-bar");
  let progressLength = 0;

  if (progressBar) {
    progressLength =
      typeof progressBar.getTotalLength === "function"
        ? progressBar.getTotalLength()
        : 2 * Math.PI * Number(progressBar.getAttribute("r"));

    progressBar.style.strokeDasharray = String(progressLength);
    progressBar.style.strokeDashoffset = String(progressLength);
  }

  function syncScrollState() {
    // əvvəl oxuyuruq, sonra yazırıq — sinif dəyişikliyindən sonra ölçü
    // oxunsa brauzer hər kadrda layout-u yenidən hesablamalı olur
    const offset = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;

    if (backToTop) backToTop.classList.toggle("show", offset > 300);
    if (headerSticky) headerSticky.classList.toggle("show", offset > 200);
    if (progressBar) {
      const ratio = scrollable > 0 ? Math.min(offset / scrollable, 1) : 0;
      progressBar.style.strokeDashoffset = String(progressLength * (1 - ratio));
    }
    scrollTicking = false;
  }

  // hər scroll hadisəsində DOM-a toxunmamaq üçün rAF-a yığırıq
  function requestScrollSync() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(syncScrollState);
  }

  window.addEventListener("scroll", requestScrollSync, { passive: true });
  window.addEventListener("resize", requestScrollSync);
  syncScrollState();

  if (backToTop) {
    backToTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth" });
    });
  }
  //#endregion

  //#region mobile-menu
  const mobileMenu = document.getElementById("mobile-menu");
  const menuTriggers = document.querySelectorAll(".bars");
  const menuBackdrop = document.querySelector(".menu-backdrop");
  let lastMenuTrigger = null;

  const isMenuOpen = () => Boolean(mobileMenu && mobileMenu.classList.contains("is-open"));
  const setTriggers = (open) => menuTriggers.forEach((t) => t.setAttribute("aria-expanded", String(open)));

  function openMobileMenu(trigger) {
    lastMenuTrigger = trigger || null;
    mobileMenu.classList.add("is-open");
    setTriggers(true);
    document.body.classList.add("has-menu-open");

    // fokus menyunun içinə keçsin ki, klaviatura ilə idarə oluna bilsin.
    // panel bu an hələ visibility:hidden sayılır, ona görə növbəti kadrı gözləyirik
    requestAnimationFrame(function () {
      const close = mobileMenu.querySelector(".menu-close-btn");
      if (close) close.focus();
    });
  }

  function closeMobileMenu() {
    if (!isMenuOpen()) return;

    mobileMenu.classList.remove("is-open");
    setTriggers(false);
    document.body.classList.remove("has-menu-open");
    closeAllDisclosures();

    if (lastMenuTrigger) {
      lastMenuTrigger.focus();
      lastMenuTrigger = null;
    }
  }

  if (mobileMenu) {
    menuTriggers.forEach((trigger) => trigger.addEventListener("click", () => openMobileMenu(trigger)));

    const closeButton = mobileMenu.querySelector(".menu-close-btn");
    if (closeButton) closeButton.addEventListener("click", closeMobileMenu);
    if (menuBackdrop) menuBackdrop.addEventListener("click", closeMobileMenu);
    mobileMenu
      .querySelectorAll(".main-nav a, .categories a")
      .forEach((link) => link.addEventListener("click", closeMobileMenu));

    // menyu modal dialoqdur (aria-modal="true"): Tab fokusu onun içində saxlayır
    mobileMenu.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        mobileMenu.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Esc: əvvəl açıq panel bağlanır (fokus onun düyməsinə qayıdır), sonra menyu
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;

    const open = disclosures.find((toggle) => toggle.getAttribute("aria-expanded") === "true");
    if (open) {
      const panel = panelOf(open);
      const focusInside =
        open.contains(document.activeElement) || Boolean(panel && panel.contains(document.activeElement));
      closeAllDisclosures();
      if (focusInside) open.focus();
      return;
    }
    closeMobileMenu();
  });
  //#endregion

  //#region footer-year
  // footer-dəki il hər il əl ilə dəyişdirilməsin
  document.querySelectorAll("[data-current-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  //#endregion

  //#region footer-wave
  // footer ekrana girəndə boya zolağı soldan sağa bir dəfə "çəkilir".
  // JS olmadan və "animasiyaları azalt" rejimində zolaq elə əvvəldən görünür.
  // Ekrandan kənarda dalğanın sonsuz "nəfəs alma" animasiyaları dayanır (.is-paused).
  // Stil: layout/_footer.scss → #region boya dalğası
  const footerWave = document.querySelector(".footer-wave");

  if (footerWave && "IntersectionObserver" in window) {
    const reveal = !ZAN.prefersReducedMotion();
    if (reveal) footerWave.classList.add("is-waiting");
    footerWave.classList.add("is-paused");

    new IntersectionObserver(
      function (entries) {
        const entry = entries[0];
        footerWave.classList.toggle("is-paused", !entry.isIntersecting);
        if (reveal && entry.intersectionRatio >= 0.6) {
          footerWave.classList.replace("is-waiting", "is-inview");
        }
      },
      { threshold: [0, 0.6] },
    ).observe(footerWave);
  }
  //#endregion

  //#region logo-3d
  // loqo kursorun ardınca yüngülcə əyilir (stil: _header.scss → "3D loqo")
  document.querySelectorAll(".logo a").forEach((logo) => {
    logo.addEventListener("pointermove", (event) => {
      const bounds = logo.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      const image = logo.querySelector("img");

      image.style.setProperty("--logo-rotate-y", `${x * 18}deg`);
      image.style.setProperty("--logo-rotate-x", `${y * -18}deg`);
      image.style.setProperty("--logo-x", `${x * 5}px`);
      image.style.setProperty("--logo-y", `${y * 5}px`);
    });

    logo.addEventListener("pointerleave", () => {
      const image = logo.querySelector("img");
      image.style.removeProperty("--logo-rotate-x");
      image.style.removeProperty("--logo-rotate-y");
      image.style.removeProperty("--logo-x");
      image.style.removeProperty("--logo-y");
    });
  });
  //#endregion

  //#region cursor-ring
  // Valik kursorunu əhatə edən ağ çevrə: kursorun arxasınca gecikmə ilə gəlir
  // və dayananda valiki "tamamlayır". Kursor şəkli CSS-dədir, çevrə yalnız
  // siçanı olan cihazlarda yaradılır. Stil: base/_cursor.scss → valik çevrəsi
  //
  // Vəziyyət elementin öz kursorundan oxunur (ayrıca seçici siyahısı yoxdur):
  //   --cursor-pointer (damlalı valik) → .is-hover
  //   valik olmayan kursor (yazı, not-allowed, grab) → .is-hidden
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    // çevrənin mərkəzi valikin ortasıdır: hotspot (4, 8), ikonun mərkəzi (15, 17)
    const OFFSET_X = 11;
    const OFFSET_Y = 9;
    // hər kadrda qalan məsafənin nə qədəri qət olunur; 1 — gecikmə yoxdur
    const FOLLOW = ZAN.prefersReducedMotion() ? 1 : 0.2;

    let targetX = 0;
    let targetY = 0;
    let ringX = 0;
    let ringY = 0;
    let frame = 0;
    let lastTime = 0;
    let placed = false;

    const renderRing = function (time) {
      // kadr tezliyindən asılı olmasın: 60 və 144 Hz ekranda eyni sürət
      const elapsed = lastTime ? Math.min(64, time - lastTime) : 16.7;
      const step = 1 - Math.pow(1 - FOLLOW, elapsed / 16.7);
      lastTime = time;

      ringX += (targetX - ringX) * step;
      ringY += (targetY - ringY) * step;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

      // çevrə yerinə çatanda dövr dayanır — boş yerə kadr çəkilmir
      if (Math.abs(targetX - ringX) < 0.1 && Math.abs(targetY - ringY) < 0.1) {
        frame = 0;
        lastTime = 0;
        return;
      }
      frame = requestAnimationFrame(renderRing);
    };

    const syncRingState = function (element) {
      const cursor =
        element && element.nodeType === 1 ? getComputedStyle(element).cursor : "";
      ring.classList.toggle("is-hidden", cursor.indexOf("cursor-roller") === -1);
      ring.classList.toggle("is-hover", cursor.indexOf("cursor-roller-active") !== -1);
    };

    const hideRing = function () {
      ring.classList.remove("is-visible", "is-down");
      placed = false;
    };

    document.addEventListener(
      "pointermove",
      function (e) {
        if (e.pointerType !== "mouse") return;
        targetX = e.clientX + OFFSET_X;
        targetY = e.clientY + OFFSET_Y;

        // ilk hərəkətdə (və pəncərəyə qayıdanda) küncdən uçub gəlməsin
        if (!placed) {
          ringX = targetX;
          ringY = targetY;
          placed = true;
          syncRingState(e.target);
        }
        ring.classList.add("is-visible");
        if (!frame) frame = requestAnimationFrame(renderRing);
      },
      { passive: true },
    );

    document.addEventListener("pointerover", function (e) {
      if (e.pointerType === "mouse") syncRingState(e.target);
    });

    document.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") ring.classList.add("is-down");
    });

    // klikdən sonra element söndürülə bilər (məs. "Səbətə at") — vəziyyət yenilənsin
    document.addEventListener("pointerup", function (e) {
      ring.classList.remove("is-down");
      syncRingState(e.target);
    });

    // siçan pəncərədən çıxanda çevrə gizlənir
    document.addEventListener("pointerout", function (e) {
      if (!e.relatedTarget) hideRing();
    });
    window.addEventListener("blur", hideRing);
  }
  //#endregion
})(window.ZAN);
