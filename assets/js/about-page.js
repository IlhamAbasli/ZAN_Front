/* ==========================================================================
   about-page.js — "Haqqımızda" səhifələri (about.html, mission.html)
   --------------------------------------------------------------------------
   Qoşulur:     about.html və mission.html, shop.js-dən sonra
                (.NET MVC-də: Views/About/Index.cshtml, Mission.cshtml →
                @section Scripts)
   Asılılıqlar: site.js (ZAN.prefersReducedMotion)

   Yalnız görünəndə yumşaq açılma: [data-reveal] elementi ekrana girəndə
   .is-waiting → .is-inview olur (stil: pages/about/_base.scss).
   Gecikmə: style="--d: .1s". JS olmadan hər şey elə əvvəldən görünür.

   Videolar: <video data-autoplay> ekrana girəndə səssiz oynayır, çıxanda
   dayanır. İstifadəçi özü dayandırıbsa, yenidən başlatmırıq.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region reveal
  (function () {
    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!items.length || ZAN.prefersReducedMotion() || !("IntersectionObserver" in window)) return;

    // yalnız ekranın altında qalanlar gizlədilir — ilk baxışda görünən məzmun sayrışmasın
    const fold = window.innerHeight * 0.92;
    const pending = items.filter((el) => el.getBoundingClientRect().top > fold);
    pending.forEach((el) => el.classList.add("is-waiting"));

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.replace("is-waiting", "is-inview");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    pending.forEach((el) => observer.observe(el));
  })();
  //#endregion

  //#region videolar
  // "Animasiyaları azalt" rejimində avtomatik oynatmırıq — poster və idarəetmə düymələri qalır
  (function () {
    const videos = Array.from(document.querySelectorAll("video[data-autoplay]"));
    if (!videos.length || ZAN.prefersReducedMotion() || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const video = entry.target;
          if (entry.isIntersecting) {
            if (video.dataset.userPaused) return;
            const playing = video.play();
            if (playing) playing.catch(function () {}); // brauzer icazə verməsə poster qalır
          } else if (!video.paused) {
            video.dataset.autoPause = "1";
            video.pause();
          }
        });
      },
      { threshold: 0.35 },
    );

    videos.forEach(function (video) {
      video.addEventListener("pause", function () {
        if (video.dataset.autoPause) delete video.dataset.autoPause;
        else video.dataset.userPaused = "1";
      });
      video.addEventListener("play", function () {
        delete video.dataset.userPaused;
      });
    });

    // video səhifə yüklənəndən sonra başlayır: hero-dakı video ilk ekranda
    // görünür və dərhal oynasa, bir neçə MB-lıq yükləmə səhifənin qalanı ilə
    // yarışar və "load" hadisəsini (preloader-i) gecikdirər
    const start = () => videos.forEach((video) => observer.observe(video));
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  })();
  //#endregion
})(window.ZAN);
