/* ==========================================================================
   soon-page.js — "Sayt hazırlanır" şablonu
   --------------------------------------------------------------------------
   Qoşulur:     hazırda heç bir səhifə — HTML: templates/soon-main.html;
                hazır olmayan səhifədə shop.js-dən sonra
                (.NET MVC-də: Views/Shared/ComingSoon.cshtml → @section Scripts)
   Asılılıqlar: yoxdur

   "Geri qayıt" ([data-back]) — ziyarətçi saytın başqa səhifəsindən gəlibsə
   brauzer tarixçəsində bir addım geri gedir; birbaşa açılıbsa href-dəki
   ünvana (əsas səhifə) keçir.
   ========================================================================== */

(function () {
  "use strict";

  //#region back
  function cameFromThisSite() {
    try {
      return Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  document.querySelectorAll("[data-back]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      if (!cameFromThisSite() || window.history.length < 2) return;
      e.preventDefault();
      window.history.back();
    });
  });
  //#endregion
})();
