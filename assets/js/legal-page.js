/* ==========================================================================
   legal-page.js — hüquqi sənəd səhifələri (privacy.html, terms.html)
   --------------------------------------------------------------------------
   Qoşulur:     privacy.html, terms.html — shop.js-dən sonra
                (.NET MVC-də: Views/Legal/*.cshtml → @section Scripts)
   Asılılıqlar: yoxdur
   Stil:        pages/legal/_document.scss

   Mündəricat (<details class="lg-toc">):
     • lg+ ekranda həmişə açıqdır (yığılmır), kiçik ekranda yığılmış başlayır;
     • oxunan bölmənin linki aria-current="true" alır.
   Skript işləməsə də səhifə tam işləyir: mündəricat açıqdır, linklər lövbərdir.
   ========================================================================== */

(function () {
  "use strict";

  const toc = document.querySelector("#legal .lg-toc");
  if (!toc) return;

  //#region açıq / yığılmış
  const desktop = window.matchMedia("(min-width: 992px)");
  const syncOpen = () => (toc.open = desktop.matches);
  syncOpen();
  desktop.addEventListener("change", syncOpen);

  // böyük ekranda başlığa klik mündəricatı bağlamasın
  toc.querySelector("summary").addEventListener("click", function (e) {
    if (desktop.matches) e.preventDefault();
  });

  // kiçik ekranda bölmə seçiləndə siyahı yığılır — mətn görünsün
  toc.addEventListener("click", function (e) {
    if (e.target.closest("a") && !desktop.matches) toc.open = false;
  });
  //#endregion

  //#region aktiv bölmə
  // Aktiv — başlığı yapışqan header-in altındakı xətti keçmiş SONUNCU bölmə
  // (əvvəlki bölmənin quyruğu hələ görünsə də). Səhifənin sonunda — sonuncu bölmə.
  const links = Array.from(toc.querySelectorAll('a[href^="#"]'));
  const sections = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!sections.length) return;

  const headerOffset = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--h-header-sticky")) || 84;

  function setCurrent() {
    const line = headerOffset() + 60;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    let current = atBottom ? sections[sections.length - 1] : null;
    if (!current) sections.forEach((s) => s.getBoundingClientRect().top <= line && (current = s));
    links.forEach((a) =>
      current && a.hash === `#${current.id}` ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"),
    );
  }

  let frame = 0;
  window.addEventListener(
    "scroll",
    function () {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        setCurrent();
      });
    },
    { passive: true },
  );
  window.addEventListener("resize", setCurrent);
  setCurrent();
  //#endregion
})();
