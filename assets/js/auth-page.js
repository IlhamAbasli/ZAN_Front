/* ==========================================================================
   auth-page.js — giriş (login.html), qeydiyyat (register.html) və şifrənin
                  bərpası (forgot-password.html) formaları
   --------------------------------------------------------------------------
   Qoşulur:     login.html, register.html, forgot-password.html — forms.js-dən sonra
                (.NET MVC-də: Views/Account/Login.cshtml, Register.cshtml,
                ForgotPassword.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), auth.js (ZAN.auth), forms.js (ZAN.forms)

   Bütün formalar <form action>-dakı ünvana göndərilir (fetch, FormData).
   Şifrənin bərpası addımları və cavab formatı: forgot-password.html-dəki şərh.
   TODO (backend): action="#" olduqca göndəriş imitasiya olunur və istifadəçi
   demo rejimdə "daxil olur" (auth.js → demoSignIn). Backend hazır olanda:
     - action-u dəyişin (MVC: asp-action="Login" / "Register",
       @Html.AntiForgeryToken())
     - uğurda JSON { redirectUrl } qaytarın (və ya boş 200) — skript
       ?returnUrl= və ya account.html ünvanına keçir
     - xətada 4xx + JSON { message, errors: { sahəAdı: "mətn" } } qaytarın
   ========================================================================== */

(function (ZAN) {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const returnUrl = ZAN.auth.safeReturnUrl(params.get("returnUrl"));

  // artıq daxil olubsa giriş / qeydiyyat formasının mənası yoxdur
  if (ZAN.auth.isLoggedIn()) {
    window.location.replace(returnUrl || ZAN.auth.accountUrl());
    return;
  }

  //#region return-links
  // "Qeydiyyatdan keçin" ↔ "Daxil olun" keçidləri returnUrl-i itirməsin
  if (returnUrl) {
    document.querySelectorAll("[data-keep-return]").forEach(function (link) {
      const url = new URL(link.getAttribute("href"), window.location.href);
      url.searchParams.set("returnUrl", returnUrl);
      link.setAttribute("href", url.pathname.split("/").pop() + url.search);
    });
  }

  // səbət / sevimlilərdən gəlibsə qısa izah göstərilir
  const notice = document.querySelector("[data-return-notice]");
  if (notice && returnUrl) notice.hidden = false;
  //#endregion

  //#region helpers
  const showFormError = ZAN.forms.showError;
  const handleServerError = ZAN.forms.handleError;

  // növbəti səhifədə bildiriş üçün (auth.js → welcome)
  function flagWelcome(kind) {
    try {
      sessionStorage.setItem("zan-welcome", kind);
    } catch (e) {
      /* bildiriş göstərilməsə də olar */
    }
  }

  function goNext(data) {
    const target = ZAN.auth.safeReturnUrl(data && data.redirectUrl) || returnUrl || ZAN.auth.accountUrl();
    window.location.href = target;
  }
  //#endregion

  //#region login
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    const rules = ZAN.forms.rules;
    const validator = ZAN.forms.bind(loginForm, {
      login: rules.login(),
      password: rules.required("Şifrənizi yazın."),
    });
    const submitBtn = loginForm.querySelector(".zf-submit");

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(loginForm, "");
      if (!validator.validate()) return;

      ZAN.forms.setLoading(submitBtn, true);
      ZAN.forms
        .submit(loginForm)
        .then(function (data) {
          if (ZAN.auth.isDemo) demoLogin(loginForm.elements.login.value.trim());
          flagWelcome("login");
          goNext(data);
        })
        .catch(function (error) {
          ZAN.forms.setLoading(submitBtn, false);
          handleServerError(loginForm, validator, error, "Telefon / e-poçt və ya şifrə yanlışdır.");
          loginForm.elements.password.select();
        });
    });
  }

  // demo: qeydiyyatdan keçmiş profil varsa onunla, yoxsa nümunə məlumatla
  function demoLogin(identifier) {
    const profile = ZAN.auth.demoProfile() || {};
    const isEmail = identifier.includes("@");
    const phoneDigits = identifier.replace(/\D/g, "").slice(-9);
    const matches =
      (isEmail && profile.email === identifier) ||
      (!isEmail && profile.phone && profile.phone.replace(/\D/g, "").endsWith(phoneDigits));

    ZAN.auth.demoSignIn(
      matches
        ? profile
        : {
            name: "ZAN istifadəçisi",
            phone: isEmail ? "+994 50 123 45 67" : "+994 " + ZAN.forms.formatPhone(phoneDigits),
            email: isEmail ? identifier : "istifadeci@numune.az",
          },
    );
  }
  //#endregion

  //#region register
  const registerForm = document.getElementById("register-form");

  if (registerForm) {
    const rules = ZAN.forms.rules;
    const validator = ZAN.forms.bind(registerForm, {
      name: rules.fullName(),
      phone: rules.phone(),
      email: rules.email(),
      password: rules.password(),
      passwordConfirm: rules.match("password"),
    });
    const submitBtn = registerForm.querySelector(".zf-submit");

    // şifrə dəyişəndə təkrar sahəsi artıq doldurulubsa yenidən yoxlanır
    registerForm.elements.password.addEventListener("input", function () {
      if (registerForm.elements.passwordConfirm.value) validator.check("passwordConfirm");
    });

    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(registerForm, "");
      if (!validator.validate()) return;

      // spam tələsi doludursa bot-dur — heç nə etmirik
      if (registerForm.elements.website.value) return;

      ZAN.forms.setLoading(submitBtn, true);
      ZAN.forms
        .submit(registerForm)
        .then(function (data) {
          if (ZAN.auth.isDemo) {
            ZAN.auth.demoSignIn({
              name: registerForm.elements.name.value.trim(),
              phone: "+994 " + registerForm.elements.phone.value.trim(),
              email: registerForm.elements.email.value.trim(),
            });
          }
          flagWelcome("register");
          goNext(data);
        })
        .catch(function (error) {
          ZAN.forms.setLoading(submitBtn, false);
          handleServerError(
            registerForm,
            validator,
            error,
            "Qeydiyyat alınmadı. Bir az sonra yenidən cəhd edin.",
          );
        });
    });
  }
  //#endregion

  //#region forgot
  // Şifrənin bərpası (forgot-password.html): request → verify → reset → done.
  // Hər addım öz formasıdır; backend cavabları HTML-dəki şərhdə yazılıb.
  const requestForm = document.getElementById("forgot-request-form");

  if (requestForm) {
    const rules = ZAN.forms.rules;
    const verifyForm = document.getElementById("forgot-verify-form");
    const resetForm = document.getElementById("forgot-reset-form");
    const title = document.getElementById("auth-title");
    const progress = document.querySelector("[data-forgot-progress]");
    const progressLabel = document.querySelector("[data-forgot-progress-label]");
    const footer = document.querySelector("[data-forgot-footer]");
    const resendButton = verifyForm.querySelector("[data-forgot-resend]");
    const codeInput = verifyForm.elements.code;

    const STEPS = {
      request: { index: 1, label: "Addım 1 / 3 — hesabınızı tapaq" },
      verify: { index: 2, label: "Addım 2 / 3 — təsdiq kodu" },
      reset: { index: 3, label: "Addım 3 / 3 — yeni şifrə" },
      done: { index: 4, label: "Hazırdır" },
    };
    const RESEND_SECONDS = 60;
    const CODE_LENGTH = 6;
    const digitsOf = (value) => String(value).replace(/\D/g, "");

    // addımı göstərir və fokusu onun ilk sahəsinə keçirir
    function showStep(name) {
      document.querySelectorAll("[data-forgot-step]").forEach(function (panel) {
        panel.hidden = panel.dataset.forgotStep !== name;
      });
      progress.dataset.step = String(STEPS[name].index);
      progressLabel.textContent = STEPS[name].label;
      // sonda "Şifrəni bərpa edin" əvəzinə panelin öz başlığı ("Şifrəniz yeniləndi")
      title.hidden = name === "done";
      if (footer) footer.hidden = name === "done";

      const panel = document.querySelector(`[data-forgot-step="${name}"]`);
      const field = panel.querySelector("input:not([type='hidden'])");
      (field || panel).focus();
      progress.scrollIntoView({ block: "nearest", behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth" });
    }

    // kodun getdiyi ünvan server bilmirsə: "+994 50 *** ** 67", "a***@numune.az"
    function maskTarget(value) {
      if (value.includes("@")) {
        const [name, domain] = value.split("@");
        return `${name.slice(0, 1)}***@${domain}`;
      }
      const d = digitsOf(value).slice(-9);
      return `+994 ${d.slice(0, 2)} *** ** ${d.slice(7, 9)}`;
    }

    //#region forgot: geri sayım
    let resendTimer = null;

    function startResendTimer() {
      let left = RESEND_SECONDS;
      clearInterval(resendTimer);
      resendButton.disabled = true;

      const tick = function () {
        if (left <= 0) {
          clearInterval(resendTimer);
          resendButton.disabled = false;
          resendButton.textContent = "Yenidən göndər";
          return;
        }
        const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        resendButton.textContent = ZAN.t("Yenidən göndər ({time})", { time });
        left--;
      };
      tick();
      resendTimer = setInterval(tick, 1000);
    }
    //#endregion

    //#region forgot: 1 — kod istəmək
    const requestValidator = ZAN.forms.bind(requestForm, { login: rules.login() });
    const requestBtn = requestForm.querySelector(".zf-submit");

    function sendCode() {
      return ZAN.forms.submit(requestForm).then(function (data) {
        const login = requestForm.elements.login.value.trim();
        verifyForm.elements.login.value = login;
        document.querySelector("[data-forgot-target]").textContent =
          (data && data.target) || maskTarget(login);
        startResendTimer();
      });
    }

    requestForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(requestForm, "");
      if (!requestValidator.validate()) return;

      ZAN.forms.setLoading(requestBtn, true);
      sendCode()
        .then(function () {
          ZAN.forms.setLoading(requestBtn, false);
          codeInput.value = "";
          verifyValidator.clear();
          showFormError(verifyForm, "");
          showStep("verify");
        })
        .catch(function (error) {
          ZAN.forms.setLoading(requestBtn, false);
          handleServerError(requestForm, requestValidator, error, "Kodu göndərmək alınmadı. Bir az sonra yenidən cəhd edin.");
        });
    });
    //#endregion

    //#region forgot: 2 — kodu təsdiqləmək
    const verifyValidator = ZAN.forms.bind(verifyForm, {
      code: function (input) {
        const value = digitsOf(input.value);
        if (!value) return "Təsdiq kodunu yazın.";
        return value.length === CODE_LENGTH ? "" : ZAN.t("Kod {n} rəqəmdən ibarətdir.", { n: CODE_LENGTH });
      },
    });
    const verifyBtn = verifyForm.querySelector(".zf-submit");

    // yalnız rəqəm; 6 rəqəm yığılan kimi (və ya yapışdırılanda) özü göndərilir
    codeInput.addEventListener("input", function () {
      const clean = digitsOf(codeInput.value).slice(0, CODE_LENGTH);
      if (clean !== codeInput.value) codeInput.value = clean;
      if (clean.length === CODE_LENGTH && !verifyBtn.disabled) verifyForm.requestSubmit(verifyBtn);
    });

    verifyForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(verifyForm, "");
      if (!verifyValidator.validate()) return;

      ZAN.forms.setLoading(verifyBtn, true);
      ZAN.forms
        .submit(verifyForm)
        .then(function (data) {
          ZAN.forms.setLoading(verifyBtn, false);
          clearInterval(resendTimer);
          resetForm.elements.resetToken.value = (data && data.resetToken) || "";
          showStep("reset");
        })
        .catch(function (error) {
          ZAN.forms.setLoading(verifyBtn, false);
          handleServerError(verifyForm, verifyValidator, error, "Kodu yoxlamaq alınmadı. Bir az sonra yenidən cəhd edin.");
          codeInput.select();
        });
    });

    resendButton.addEventListener("click", function () {
      resendButton.disabled = true;
      showFormError(verifyForm, "");
      sendCode()
        .then(function () {
          ZAN.notify("success", "Yeni təsdiq kodu göndərildi.", { title: "Kod göndərildi" });
          codeInput.focus();
        })
        .catch(function (error) {
          resendButton.disabled = false;
          handleServerError(verifyForm, verifyValidator, error, "Kodu göndərmək alınmadı. Bir az sonra yenidən cəhd edin.");
        });
    });

    // telefon / e-poçtu dəyişmək — 1-ci addıma qayıdış
    verifyForm.querySelector("[data-forgot-back]").addEventListener("click", function () {
      clearInterval(resendTimer);
      showStep("request");
      requestForm.elements.login.select();
    });
    //#endregion

    //#region forgot: 3 — yeni şifrə
    const resetValidator = ZAN.forms.bind(resetForm, {
      password: rules.password(),
      passwordConfirm: rules.match("password"),
    });
    const resetBtn = resetForm.querySelector(".zf-submit");

    resetForm.elements.password.addEventListener("input", function () {
      if (resetForm.elements.passwordConfirm.value) resetValidator.check("passwordConfirm");
    });

    resetForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showFormError(resetForm, "");
      if (!resetValidator.validate()) return;

      ZAN.forms.setLoading(resetBtn, true);
      ZAN.forms
        .submit(resetForm)
        .then(function () {
          ZAN.forms.setLoading(resetBtn, false);
          // şifrələr səhifədə qalmasın
          resetForm.reset();
          showStep("done");
        })
        .catch(function (error) {
          ZAN.forms.setLoading(resetBtn, false);
          handleServerError(resetForm, resetValidator, error, "Şifrəni yeniləmək alınmadı. Bir az sonra yenidən cəhd edin.");
        });
    });
    //#endregion
  }
  //#endregion
})(window.ZAN);
