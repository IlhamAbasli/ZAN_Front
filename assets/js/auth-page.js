/* ==========================================================================
   auth-page.js — giriş (login.html) və qeydiyyat (register.html) formaları
   --------------------------------------------------------------------------
   Qoşulur:     login.html və register.html, forms.js-dən sonra
                (.NET MVC-də: Views/Account/Login.cshtml, Register.cshtml →
                @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), auth.js (ZAN.auth), forms.js (ZAN.forms)

   Hər iki forma <form action>-dakı ünvana göndərilir (fetch, FormData).
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
  function showFormError(form, message) {
    const alert = form.querySelector(".zf-alert");
    if (!alert) return;
    alert.querySelector("span").textContent = message;
    alert.hidden = !message;
  }

  // server xətası: sahə xətaları altlarına, ümumi mətn formanın başına
  function handleServerError(form, validator, error, fallback) {
    const data = (error && error.data) || {};
    if (data.errors) {
      Object.keys(data.errors).forEach((name) => validator.show(name, data.errors[name]));
    }
    showFormError(form, data.message || fallback);
  }

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
      name: function (input) {
        const value = input.value.trim();
        if (!value) return "Adınızı və soyadınızı yazın.";
        return value.length < 3 ? "Ad və soyad ən azı 3 hərfdən ibarət olmalıdır." : "";
      },
      phone: rules.phone(),
      email: rules.email(),
      password: rules.password(),
      passwordConfirm: rules.match("password"),
      terms: rules.checked("Qeydiyyat üçün şərtlərlə razılaşın."),
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
})(window.ZAN);
