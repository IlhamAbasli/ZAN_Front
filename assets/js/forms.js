/* ==========================================================================
   forms.js — giriş, qeydiyyat və kabinet formalarının ortaq köməkçiləri
   --------------------------------------------------------------------------
   Qoşulur:     login.html, register.html, forgot-password.html, account.html,
                checkout.html — shop.js-dən sonra,
                səhifə skriptindən (auth-page.js, account-page.js, checkout-page.js) əvvəl
                (.NET MVC-də: həmin view-ların @section Scripts bölməsində)
   Asılılıqlar: yoxdur (yalnız window.ZAN)
   Stil:        components/_form-field.scss (.zf-* sinifləri)

   HTML qaydaları
     sahənin xətası   <p class="zf-error" data-error-for="password"></p>
     şifrəni göstər   <button type="button" data-password-toggle> (.zf-password içində)
     güc göstəricisi  <div class="zf-strength" data-strength-for="reg-password">
     telefon maskası  <input data-phone-mask> — "50 123 45 67" kimi yazılır,
                      önündə sabit "+994" (.zf-phone) olur

   API (window.ZAN.forms):
     ZAN.forms.bind(form, rules)   → { validate(), clear() }
     ZAN.forms.rules.*             → hazır yoxlamalar (required, email, phone ...)
     ZAN.forms.submit(form)        → Promise; action="#" olduqca imitasiya
     ZAN.forms.setLoading(button, bool)
     ZAN.forms.showError(form, text)          → .zf-alert (boş mətn gizlədir)
     ZAN.forms.handleError(form, validator, error, fallback) → server xətası
     ZAN.forms.fullPhone(input)    → "+994501234567"
   ========================================================================== */

window.ZAN = window.ZAN || {};

(function (ZAN) {
  "use strict";

  //#region rules
  // Hər qayda (input, form) → xəta mətni və ya "" qaytarır
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PASSWORD_MIN = 8;

  const digits = (value) => String(value).replace(/\D/g, "");

  const rules = {
    required(message) {
      return (input) => (input.value.trim() ? "" : message);
    },

    email(options) {
      const opts = options || {};
      return function (input) {
        const value = input.value.trim();
        if (!value) return opts.optional ? "" : "E-poçt ünvanınızı yazın.";
        return EMAIL_RE.test(value) ? "" : "E-poçt ünvanı düzgün deyil, məsələn: ad@numune.az";
      };
    },

    // +994-dən sonrakı 9 rəqəm (operator kodu + nömrə)
    phone() {
      return function (input) {
        const value = digits(input.value);
        if (!value) return "Telefon nömrənizi yazın.";
        return value.length === 9 ? "" : "Nömrə 9 rəqəmdən ibarət olmalıdır, məsələn: 50 123 45 67";
      };
    },

    // giriş: telefon və ya e-poçt
    login() {
      return function (input) {
        const value = input.value.trim();
        if (!value) return "Telefon nömrənizi və ya e-poçtunuzu yazın.";
        if (value.includes("@")) return EMAIL_RE.test(value) ? "" : "E-poçt ünvanı düzgün deyil.";
        const count = digits(value).length;
        return count >= 9 && count <= 12 && /^[+\d\s()-]+$/.test(value)
          ? ""
          : "Telefon nömrəsini düzgün yazın, məsələn: 050 123 45 67";
      };
    },

    // yeni şifrə: ən azı 8 simvol, hərf və rəqəm
    password() {
      return function (input) {
        const value = input.value;
        if (!value) return "Şifrə yazın.";
        if (value.length < PASSWORD_MIN) return ZAN.t("Şifrə ən azı {n} simvol olmalıdır.", { n: PASSWORD_MIN });
        if (!/\p{L}/u.test(value) || !/\d/.test(value)) return "Şifrədə həm hərf, həm rəqəm olmalıdır.";
        return "";
      };
    },

    // təkrar sahəsi: formadakı başqa sahə ilə eyni olmalıdır
    match(otherName, message) {
      return function (input, form) {
        if (!input.value) return "Şifrəni təkrar yazın.";
        return input.value === form.elements[otherName].value ? "" : message || "Şifrələr üst-üstə düşmür.";
      };
    },

    // eyni ada malik checkbox / radio qrupundan ən azı biri seçilməlidir
    someChecked(message) {
      return function (input, form) {
        const group = form.querySelectorAll(`input[name="${input.name}"]`);
        return Array.from(group).some((el) => el.checked) ? "" : message;
      };
    },

    checked(message) {
      return (input) => (input.checked ? "" : message);
    },

    // ad və soyad: qeydiyyat, kabinet (klub), sifariş
    fullName() {
      return function (input) {
        const value = input.value.trim();
        if (!value) return "Adınızı və soyadınızı yazın.";
        return value.length < 3 ? "Ad və soyad ən azı 3 hərfdən ibarət olmalıdır." : "";
      };
    },
  };
  //#endregion

  //#region bind
  function fieldOf(form, name) {
    const field = form.elements[name];
    // checkbox qrupu RadioNodeList qaytarır — ilk elementi götürürük
    return field && typeof field.length === "number" && !field.tagName ? field[0] : field;
  }

  /**
   * Formaya yoxlama bağlayır. rules: { sahəAdı: qayda }.
   * Sahədən çıxanda yoxlanır; xəta görünürsə yazdıqca təzələnir.
   */
  function bind(form, fieldRules) {
    const names = Object.keys(fieldRules);

    function show(name, error) {
      const target = form.querySelector(`[data-error-for="${name}"]`);
      if (target) target.textContent = error;
      form.querySelectorAll(`[name="${name}"]`).forEach(function (el) {
        el.setAttribute("aria-invalid", error ? "true" : "false");
      });
    }

    function check(name) {
      const input = fieldOf(form, name);
      if (!input) return true;
      const error = fieldRules[name](input, form);
      show(name, error);
      return !error;
    }

    names.forEach(function (name) {
      form.querySelectorAll(`[name="${name}"]`).forEach(function (input) {
        const live = function () {
          if (input.getAttribute("aria-invalid") === "true") check(name);
        };
        // checkbox / radio seçiləndə dərhal, mətn sahəsi isə çıxanda yoxlanır
        const checkable = input.type === "checkbox" || input.type === "radio";
        input.addEventListener("blur", function () {
          if (!checkable && input.value.trim()) check(name);
        });
        input.addEventListener("input", live);
        input.addEventListener("change", checkable ? () => check(name) : live);
      });
    });

    return {
      // hamısını yoxlayır; ilk səhv sahəyə fokus verir
      validate() {
        const invalid = names.filter((name) => !check(name));
        if (invalid.length) fieldOf(form, invalid[0]).focus();
        return invalid.length === 0;
      },
      clear() {
        names.forEach((name) => show(name, ""));
        form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
      },
      check: check,
      show: show,
    };
  }
  //#endregion

  //#region errors
  // formanın başındakı ümumi xəta (.zf-alert > span); boş mətn — gizlədir
  function showError(form, message) {
    const alert = form.querySelector(".zf-alert");
    if (!alert) return;
    alert.querySelector("span").textContent = message;
    alert.hidden = !message;
  }

  // server xətası (4xx + { message, errors }): sahə xətaları altlarına,
  // ümumi mətn formanın başına
  function handleError(form, validator, error, fallback) {
    const data = (error && error.data) || {};
    if (data.errors) {
      Object.keys(data.errors).forEach((name) => validator.show(name, data.errors[name]));
    }
    showError(form, data.message || fallback);
  }
  //#endregion

  //#region submit
  function setLoading(button, loading) {
    if (!button) return;
    button.classList.toggle("is-loading", loading);
    button.disabled = loading;
    button.setAttribute("aria-busy", String(loading));
  }

  // "Geri" ilə keşdən (bfcache) qayıdanda göndərilmiş formanın düyməsi
  // fırlanmaqda və bağlı qalmasın
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    document.querySelectorAll(".zf-submit.is-loading").forEach((button) => setLoading(button, false));
  });

  /**
   * Formanı <form action>-dakı ünvana göndərir (fetch, FormData).
   * TODO (backend): action="#" olduqca göndəriş imitasiya olunur — backend
   * hazır olanda yalnız HTML-də action-u dəyişmək kifayətdir.
   * Server JSON qaytarırsa (məs. { redirectUrl }) Promise onunla həll olunur.
   */
  function submit(form) {
    const endpoint = form.getAttribute("action");

    if (!endpoint || endpoint === "#") {
      return new Promise((resolve) => setTimeout(() => resolve({}), 900));
    }

    // maskalı telefon serverə tam şəkildə gedir: "50 123 45 67" → "+994501234567"
    const body = new FormData(form);
    form.querySelectorAll("input[data-phone-mask]").forEach(function (input) {
      if (input.name && input.value) body.set(input.name, ZAN.forms.fullPhone(input));
    });

    return fetch(endpoint, {
      method: (form.getAttribute("method") || "post").toUpperCase(),
      body: body,
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      credentials: "same-origin",
    }).then(function (response) {
      const type = response.headers.get("Content-Type") || "";
      const parse = type.includes("json") ? response.json() : Promise.resolve({});
      return parse.then(function (data) {
        if (!response.ok) {
          const error = new Error(data.message || `HTTP ${response.status}`);
          error.data = data;
          throw error;
        }
        return data;
      });
    });
  }
  //#endregion

  //#region password-toggle
  // .zf-password içindəki düymə şifrəni göstərir / gizlədir
  const EYE =
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_OFF =
    '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.7C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';

  document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
    const input = button.closest(".zf-password").querySelector("input");
    const icon = button.querySelector("svg");

    const sync = function () {
      const visible = input.type === "text";
      button.setAttribute("aria-pressed", String(visible));
      button.setAttribute("aria-label", visible ? "Şifrəni gizlət" : "Şifrəni göstər");
      icon.innerHTML = visible ? EYE_OFF : EYE;
    };

    button.addEventListener("click", function () {
      input.type = input.type === "password" ? "text" : "password";
      sync();
      input.focus();
    });
    sync();
  });
  //#endregion

  //#region strength
  // 0..4 bal: uzunluq, böyük-kiçik hərf, rəqəm, simvol
  const LEVELS = ["", "Zəif", "Orta", "Yaxşı", "Güclü"];

  function strength(value) {
    if (!value) return 0;
    let score = 0;
    if (value.length >= PASSWORD_MIN) score++;
    if (value.length >= 12) score++;
    if (/[a-zəöüğışç]/.test(value) && /[A-ZƏÖÜĞIŞÇ]/.test(value)) score++;
    if (/\d/.test(value) && /[^\p{L}\d]/u.test(value)) score++;
    // qısa şifrə nə qədər "rəngarəng" olsa da zəif sayılır
    return value.length < PASSWORD_MIN ? 1 : Math.max(1, Math.min(4, score));
  }

  document.querySelectorAll("[data-strength-for]").forEach(function (meter) {
    const input = document.getElementById(meter.dataset.strengthFor);
    const label = meter.querySelector(".zf-strength-label");
    if (!input) return;

    input.addEventListener("input", function () {
      const level = strength(input.value);
      meter.dataset.level = String(level);
      label.textContent = LEVELS[level];
    });
  });
  //#endregion

  //#region phone-mask
  // "501234567" → "50 123 45 67"; əvvəldəki 0 və yapışdırılmış 994 atılır.
  // 994 yalnız nömrə 9 rəqəmdən uzun olanda atılır: "99 4.." (099) də ola bilər
  function formatPhone(value) {
    let d = digits(value);
    if (d.length > 9 && d.startsWith("994")) d = d.slice(3);
    if (d.startsWith("0")) d = d.slice(1);
    d = d.slice(0, 9);
    return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
  }

  document.querySelectorAll("input[data-phone-mask]").forEach(function (input) {
    input.addEventListener("input", function () {
      const atEnd = input.selectionStart === input.value.length;
      input.value = formatPhone(input.value);
      if (atEnd) input.setSelectionRange(input.value.length, input.value.length);
    });
    if (input.value) input.value = formatPhone(input.value);
  });
  //#endregion

  ZAN.forms = {
    rules: rules,
    bind: bind,
    submit: submit,
    setLoading: setLoading,
    showError: showError,
    handleError: handleError,
    strength: strength,
    formatPhone: formatPhone,
    fullPhone: (input) => "+994" + digits(input.value),
  };
})(window.ZAN);
