/* ==========================================================================
   account-page.js — "Şəxsi kabinet → Mənim hesabım" (account.html)
   --------------------------------------------------------------------------
   Qoşulur:     account.html, forms.js-dən sonra
                (.NET MVC-də: Views/Account/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), auth.js (ZAN.auth), forms.js (ZAN.forms)

   TODO (backend):
     - Səhifə [Authorize] olmalıdır; qonaq serverdə login-ə yönləndirilir.
       Demo rejimdə bunu aşağıdakı "guard" edir.
     - İstifadəçi məlumatları ([data-user-field]) serverdə yazılır. Demo
       rejimdə skript onları ZAN.auth.user()-dən doldurur.
     - Klub müraciətinin vəziyyəti: #club[data-club-status="none|pending|member"]
       serverdə yazılır. Demo rejimdə localStorage "zan-demo-club".
     - Formaların action-u: şifrə → asp-action="ChangePassword",
       klub → asp-action="ClubApply", çıxış → asp-action="Logout".
       Xətada 4xx + JSON { message, errors: { sahəAdı: "mətn" } }.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region guard
  if (!ZAN.auth.isLoggedIn()) {
    window.location.replace(ZAN.auth.loginUrl());
    return;
  }
  const user = ZAN.auth.user();
  //#endregion

  //#region user-fields
  // ad-soyadın baş hərfləri avatar üçün: "Aysel Məmmədova" → "AM"
  function initials(name) {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toLocaleUpperCase("az"))
        .join("") || "Z"
    );
  }

  const values = {
    name: user.name,
    firstName: (user.name || "").split(" ")[0],
    phone: user.phone,
    email: user.email,
    initials: initials(user.name || ""),
  };

  if (ZAN.auth.isDemo) {
    document.querySelectorAll("[data-user-field]").forEach(function (el) {
      const value = values[el.dataset.userField];
      if (value) el.textContent = value;
    });
    document.querySelectorAll("a[data-user-href]").forEach(function (el) {
      const value = values[el.dataset.userHref];
      if (!value) return;
      el.href = el.dataset.userHref === "email" ? `mailto:${value}` : `tel:${value.replace(/[^\d+]/g, "")}`;
    });
  }
  //#endregion

  //#region helpers
  const showFormError = ZAN.forms.showError;
  const handleServerError = ZAN.forms.handleError;

  // "28 sentyabr 2026" — brauzerlərin az-AZ formatı hər yerdə eyni deyil
  const MONTHS = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
  ];
  // digər dillərdə brauzerin formatı ("28 September 2026", "28 сентября 2026 г.")
  function formatDate(date) {
    if (ZAN.i18n.lang !== "az") {
      return new Intl.DateTimeFormat(ZAN.i18n.locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
    }
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  //#endregion

  //#region password
  // HTML: #region acc-password → #password-form
  const passwordForm = document.getElementById("password-form");

  if (passwordForm) {
    const rules = ZAN.forms.rules;
    const newRule = rules.password();
    const validator = ZAN.forms.bind(passwordForm, {
      currentPassword: rules.required("Hazırkı şifrənizi yazın."),
      newPassword: function (input, form) {
        const error = newRule(input);
        if (error) return error;
        return input.value === form.elements.currentPassword.value
          ? "Yeni şifrə hazırkı şifrədən fərqli olmalıdır."
          : "";
      },
      newPasswordConfirm: rules.match("newPassword", "Yeni şifrələr üst-üstə düşmür."),
    });
    const submitBtn = passwordForm.querySelector(".zf-submit");
    const meter = passwordForm.querySelector(".zf-strength");

    passwordForm.elements.newPassword.addEventListener("input", function () {
      if (passwordForm.elements.newPasswordConfirm.value) validator.check("newPasswordConfirm");
    });

    passwordForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(passwordForm, "");
      if (!validator.validate()) return;

      ZAN.forms.setLoading(submitBtn, true);
      ZAN.forms
        .submit(passwordForm)
        .then(function () {
          passwordForm.reset();
          validator.clear();
          if (meter) {
            meter.dataset.level = "0";
            meter.querySelector(".zf-strength-label").textContent = "";
          }
          // göstərilmiş şifrələr yenidən gizlənsin
          passwordForm.querySelectorAll("[data-password-toggle][aria-pressed='true']").forEach((b) => b.click());
          ZAN.notify("success", "Növbəti girişdə yeni şifrədən istifadə edin.", {
            title: "Şifrə dəyişdirildi",
          });
        })
        .catch(function (error) {
          handleServerError(passwordForm, validator, error, "Şifrə dəyişdirilmədi. Hazırkı şifrəni yoxlayın.");
        })
        .finally(() => ZAN.forms.setLoading(submitBtn, false));
    });
  }
  //#endregion

  //#region club
  // HTML: #region acc-club. Vəziyyətə görə yalnız bir panel görünür:
  //   none → tanıtım + müraciət forması, pending → baxılır, member → üzvsünüz
  const club = document.getElementById("club");
  const CLUB_KEY = "zan-demo-club";

  function setClubStatus(status) {
    club.dataset.clubStatus = status;
    club.querySelectorAll("[data-club-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.clubPanel !== status;
    });
    document.querySelectorAll("[data-club-badge]").forEach(function (badge) {
      badge.dataset.clubBadge = status;
      badge.hidden = status === "none";
      badge.textContent = status === "member" ? "Klub üzvü" : "Müraciət baxılır";
    });
  }

  function readDemoClub() {
    const saved = ZAN.store.get(CLUB_KEY, null);
    return saved && saved.status ? saved : null;
  }

  if (club) {
    const demoClub = ZAN.auth.isDemo ? readDemoClub() : null;
    setClubStatus((demoClub && demoClub.status) || club.dataset.clubStatus || "none");

    if (demoClub && demoClub.date) {
      const dateEl = club.querySelector("[data-club-date]");
      if (dateEl) dateEl.textContent = demoClub.date;
    }
  }

  const clubForm = document.getElementById("club-form");

  if (clubForm) {
    const rules = ZAN.forms.rules;
    const validator = ZAN.forms.bind(clubForm, {
      fullName: rules.fullName(),
      phone: rules.phone(),
      city: rules.required("Şəhər və ya rayonu seçin."),
      specialties: rules.someChecked("Ən azı bir ixtisas seçin."),
      experience: rules.someChecked("İş təcrübənizi seçin."),
      portfolio: function (input) {
        const value = input.value.trim();
        if (!value) return "";
        return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/i.test(value) || /^@[\w.]{2,}$/.test(value)
          ? ""
          : "Link və ya @istifadəçi_adı yazın.";
      },
      consent: rules.checked("Müraciət üçün razılığınızı təsdiqləyin."),
    });
    const submitBtn = clubForm.querySelector(".zf-submit");

    // hesabdakı məlumatlar formaya əvvəlcədən yazılır
    if (!clubForm.elements.fullName.value && user.name) clubForm.elements.fullName.value = user.name;
    if (!clubForm.elements.phone.value && user.phone) {
      clubForm.elements.phone.value = ZAN.forms.formatPhone(user.phone);
    }

    // "Haqqınızda" sayğacı
    const about = clubForm.elements.about;
    const counter = clubForm.querySelector("[data-count]");
    const counterWrap = counter && counter.parentElement;
    const ABOUT_MAX = Number(about.getAttribute("maxlength")) || 500;
    const updateCounter = function () {
      counter.textContent = about.value.length;
      counterWrap.classList.toggle("is-near", about.value.length >= ABOUT_MAX * 0.9);
    };
    about.addEventListener("input", updateCounter);
    updateCounter();

    clubForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(clubForm, "");
      if (!validator.validate()) return;
      if (clubForm.elements.website.value) return; // spam tələsi

      ZAN.forms.setLoading(submitBtn, true);
      ZAN.forms
        .submit(clubForm)
        .then(function () {
          const date = formatDate(new Date());
          if (ZAN.auth.isDemo) ZAN.store.set(CLUB_KEY, { status: "pending", date: date });
          const dateEl = club.querySelector("[data-club-date]");
          if (dateEl) dateEl.textContent = date;

          setClubStatus("pending");
          const pending = club.querySelector('[data-club-panel="pending"]');
          pending.focus();
          pending.scrollIntoView({ behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth", block: "center" });
          ZAN.notify("success", "Müraciətinizə baxılandan sonra sizinlə əlaqə saxlayacağıq.", {
            title: "Müraciət göndərildi",
          });
        })
        .catch(function (error) {
          handleServerError(clubForm, validator, error, "Müraciət göndərilmədi. Bir az sonra yenidən cəhd edin.");
        })
        .finally(() => ZAN.forms.setLoading(submitBtn, false));
    });
  }

  // "Müraciət et" düyməsi formaya aparır və ilk sahəyə fokus verir.
  // Formun özünə yox, kartına sürüşdürülür: kartın başlığı görünür və
  // .acc-card-ın scroll-margin-top-u sabit header-in altında boşluq saxlayır.
  document.querySelectorAll("[data-club-start]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!clubForm) return;
      const target = clubForm.closest(".acc-card") || clubForm;
      target.scrollIntoView({ behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      setTimeout(() => clubForm.elements.city.focus({ preventScroll: true }), 350);
    });
  });
  //#endregion

  //#region logout
  // TODO (backend): action="#" olduqca çıxış yalnız demo rejimdə işləyir;
  // real action verildikdə forma adi POST kimi göndərilir
  document.querySelectorAll("form[data-logout]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      const action = form.getAttribute("action");
      if (action && action !== "#") return;
      event.preventDefault();
      ZAN.auth.signOut();
      window.location.href = "home.html";
    });
  });
  //#endregion

  //#region section-nav
  // yan menyuda hazırda ekranda olan bölmə işarələnir
  const navLinks = Array.from(document.querySelectorAll(".acc-subnav a[href^='#']"));
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const visible = new Set();
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
        const active = sections.find((section) => visible.has(section));
        if (!active) return;
        navLinks.forEach(function (link) {
          const isActive = link.getAttribute("href") === "#" + active.id;
          link.classList.toggle("is-active", isActive);
          if (isActive) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
  }
  //#endregion
})(window.ZAN);
