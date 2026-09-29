/* ==========================================================================
   home.js — yalnız əsas səhifənin (home.html) skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     home.html, site.js və shop.js-dən sonra
                (.NET MVC-də: Views/Home/Index.cshtml → @section Scripts)
   Asılılıqlar: jQuery 3, Swiper 14, site.js (window.ZAN)
   ========================================================================== */

$(function () {
  "use strict";

  // Sistemdə "animasiyaları azalt" açıq olsa da slayderlər işləyir: avtopley
  // qalır, yalnız keçid yumşaq fade olur və bir az yavaşlayır. Sönən yeganə
  // şey kursorla hərəkət edən parallaksdır (bax: #region hero-slider sonu).
  const reduceMotion = ZAN.prefersReducedMotion();

  //#region hero-slider
  // HTML: home.html → #region hero-slider
  const heroRoot = document.querySelector("#slider-area");
  const heroEl = heroRoot ? heroRoot.querySelector(".hero-swiper") : null;

  if (heroEl) {
    const heroCounter = heroRoot.querySelector(".hero-count-current");
    const heroTotal = heroRoot.querySelector(".hero-count-total");
    const slideCount = heroEl.querySelectorAll(".swiper-slide").length;
    const htmlEl = document.documentElement;
    // header vurğu rənginin keçidi (bax: syncHeroSlide)
    let accentAnim = null;

    if (heroTotal) {
      heroTotal.textContent = `/${String(slideCount).padStart(2, "0")}`;
    }

    // sayğacı, bölmənin vurğu rəngini və bullet tərəqqisini aktiv slayda uyğunlaşdırır
    const syncHeroSlide = function (swiper) {
      if (heroCounter) {
        heroCounter.textContent = String(swiper.realIndex + 1).padStart(2, "0");
      }

      const activeSlide = swiper.slides[swiper.activeIndex];
      if (activeSlide && activeSlide.dataset.accent) {
        heroRoot.style.setProperty("--hero-accent", activeSlide.dataset.accent);
      }
      // fon rəngləri: _hero.scss → #region slayd mövzuları.
      // <html>-ə də yazılır — header düymə və ikonları eyni rəngə keçir
      // (layout/_header.scss → #region vurğu rəngi)
      if (activeSlide) {
        const heroTheme = activeSlide.dataset.theme || "red";
        const prevTheme = htmlEl.dataset.heroTheme;
        heroRoot.dataset.heroTheme = heroTheme;

        if (prevTheme && prevTheme !== heroTheme && !reduceMotion) {
          // --hdr-accent oklch-də keçir (_header.scss → #region vurğu rəngi):
          // indiki rəng (keçidin ortasında olsa belə) başlanğıc götürülür,
          // yalnız qarışıq faizi animasiya olunur
          const fromColor = getComputedStyle(htmlEl)
            .getPropertyValue("--hdr-accent")
            .trim();
          if (accentAnim) accentAnim.cancel();
          htmlEl.style.setProperty("--hdr-accent-from", fromColor);
          htmlEl.dataset.heroTheme = heroTheme;
          accentAnim = htmlEl.animate(
            { "--hdr-mix": ["0%", "100%"] },
            { duration: 1000, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
          );
        } else {
          htmlEl.dataset.heroTheme = heroTheme;
        }
      }

      // yeni slaydda xətlər sıfırlanır; aktiv xətti autoplayTimeLeft doldurur
      heroRoot.querySelectorAll(".hero-bullet").forEach((bullet) => {
        bullet.style.setProperty("--p", "0");
      });
    };

    new Swiper(heroEl, {
      // loop yerinə rewind: fade/creative effektində vizual fərq yoxdur,
      // amma keçid bitmədən edilən kliklər udulmur
      rewind: true,
      speed: 650,
      grabCursor: true,
      effect: reduceMotion ? "fade" : "creative",
      fadeEffect: { crossFade: true },
      creativeEffect: {
        limitProgress: 2,
        prev: { translate: ["-18%", 0, -220], opacity: 0, scale: 0.92 },
        next: { translate: ["18%", 0, -220], opacity: 0, scale: 0.92 },
      },
      keyboard: { enabled: true },
      a11y: {
        prevSlideMessage: "Əvvəlki slayd",
        nextSlideMessage: "Növbəti slayd",
      },
      autoplay: {
        delay: reduceMotion ? 7000 : 6000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      navigation: { prevEl: ".hero-prev", nextEl: ".hero-next" },
      pagination: {
        el: ".hero-bullets",
        clickable: true,
        bulletClass: "hero-bullet",
        bulletActiveClass: "is-active",
        renderBullet: (index, className) =>
          `<button type="button" class="${className}" aria-label="${
            index + 1
          }-ci slayda keç"><span></span></button>`,
      },
      on: {
        init: syncHeroSlide,
        slideChange: syncHeroSlide,
        // aktiv bullet-in içindəki xətt avtopley vaxtı ilə dolur
        autoplayTimeLeft: function (swiper, time, progress) {
          const activeBullet = heroRoot.querySelector(".hero-bullet.is-active");
          if (activeBullet) {
            activeBullet.style.setProperty("--p", String(1 - progress));
          }
        },
      },
    });

    // parallaks: şəkil kursorun ardınca yüngülcə sürüşür.
    // "Azaldılmış hərəkət" rejimində söndürülür — başgicəllənməyə səbəb ola bilər.
    if (!reduceMotion) {
      heroRoot.addEventListener("pointermove", (event) => {
        const bounds = heroRoot.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;

        heroRoot.style.setProperty("--hero-px", (x * 26).toFixed(2));
        heroRoot.style.setProperty("--hero-py", (y * 18).toFixed(2));
      });

      heroRoot.addEventListener("pointerleave", () => {
        heroRoot.style.setProperty("--hero-px", "0");
        heroRoot.style.setProperty("--hero-py", "0");
      });
    }
  }
  //#endregion

  //#region category-slider
  // HTML: home.html → #region product-categories
  const catEl = document.querySelector(".cat-swiper");

  if (catEl) {
    const catSlideCount = catEl.querySelectorAll(".swiper-slide").length;
    const catMaxPerView = 4;

    // loop rejimi ən azı slidesPerView * 2 slayd tələb edir,
    // slayd sayı azdırsa boş slot yaranmasın deyə rewind işlədirik
    const catCanLoop = catSlideCount >= catMaxPerView * 2;

    new Swiper(catEl, {
      loop: catCanLoop,
      rewind: !catCanLoop,
      speed: 600,
      grabCursor: true,
      slidesPerView: 1.15,
      spaceBetween: 16,
      keyboard: { enabled: true },
      a11y: {
        prevSlideMessage: "Əvvəlki kateqoriyalar",
        nextSlideMessage: "Növbəti kateqoriyalar",
      },
      autoplay: {
        delay: reduceMotion ? 5000 : 3800,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      navigation: { prevEl: ".cat-prev", nextEl: ".cat-next" },
      pagination: { el: ".cat-progress", type: "progressbar" },
      breakpoints: {
        576: { slidesPerView: 2, spaceBetween: 20 },
        768: { slidesPerView: 2.5, spaceBetween: 24 },
        992: { slidesPerView: 3, spaceBetween: 24 },
        1200: { slidesPerView: catMaxPerView, spaceBetween: 26 },
      },
    });
  }
  //#endregion

  //#region product-lines
  // HTML: home.html → #region product-lines
  // ≥992px slaydlar şaquli dəyişir; kiçik ekranda üfüqi — barmaqla şaquli
  // sürüşdürmə səhifənin scroll-unu tutmasın deyə.
  const plRoot = document.querySelector("#product-lines");
  const plEl = plRoot ? plRoot.querySelector(".pl-swiper") : null;

  if (plEl) {
    const plRail = Array.from(plRoot.querySelectorAll(".pl-rail-item"));

    // bölmənin rəngini və naviqasiyanın aktiv xəttini slayda uyğunlaşdırır
    const syncProductLine = function (swiper) {
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (activeSlide && activeSlide.dataset.accent) {
        plRoot.style.setProperty("--pl-accent", activeSlide.dataset.accent);
      }

      plRail.forEach(function (item, index) {
        const isActive = index === swiper.realIndex;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-current", isActive ? "true" : "false");
        item.style.setProperty("--p", "0");
      });
    };

    const plSwiper = new Swiper(plEl, {
      direction: "horizontal",
      breakpoints: { 992: { direction: "vertical" } },
      rewind: true,
      speed: reduceMotion ? 500 : 1000,
      // parallaks: mətn sətirləri və şəkil pillə-pillə gəlir (data-swiper-parallax)
      parallax: !reduceMotion,
      effect: reduceMotion ? "fade" : "slide",
      fadeEffect: { crossFade: true },
      grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: {
        prevSlideMessage: "Əvvəlki məhsul xətti",
        nextSlideMessage: "Növbəti məhsul xətti",
      },
      autoplay: {
        delay: reduceMotion ? 8000 : 6500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      navigation: {
        prevEl: plRoot.querySelector(".pl-prev"),
        nextEl: plRoot.querySelector(".pl-next"),
      },
      on: {
        init: syncProductLine,
        slideChange: syncProductLine,
        // 1 → 3 (rail kliki) və ya 3 → 1 (avtopley) keçidində aradakı slayd ekrandan
        // "sürüşüb keçirdi" — keçid boyu onu gizlədirik, yalnız başlanğıc və son görünür
        slideChangeTransitionStart: function (swiper) {
          const from = swiper.previousIndex;
          const to = swiper.activeIndex;
          swiper.slides.forEach(function (slide, index) {
            const between = index > Math.min(from, to) && index < Math.max(from, to);
            slide.classList.toggle("is-skipped", between);
          });
        },
        slideChangeTransitionEnd: function (swiper) {
          swiper.slides.forEach((slide) => slide.classList.remove("is-skipped"));
        },
        // aktiv xəttin zolağı avtopley vaxtı ilə dolur
        autoplayTimeLeft: function (swiper, time, progress) {
          const activeItem = plRail[swiper.realIndex];
          if (activeItem) activeItem.style.setProperty("--p", String(1 - progress));
        },
      },
    });

    plRail.forEach(function (item, index) {
      item.addEventListener("click", function () {
        plSwiper.slideTo(index);
      });
    });
  }
  //#endregion

  //#region reveal
  // Element ekrana girəndə bir dəfə .is-waiting → .is-inview edir; animasiya
  // CSS-dədir. JS olmadan və "animasiyaları azalt" rejimində element elə
  // əvvəldən son vəziyyətdə görünür (heç bir sinif əlavə olunmur).
  // İstifadə: #subscribe .sub-art (fırça izi), #bestwall .bw-card (rulonlar)
  function revealOnView(el, threshold) {
    if (!el || reduceMotion || !("IntersectionObserver" in window)) return;
    el.classList.add("is-waiting");

    const observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        el.classList.replace("is-waiting", "is-inview");
        observer.disconnect();
      },
      { threshold: threshold },
    );
    observer.observe(el);
  }

  revealOnView(document.querySelector("#bestwall .bw-card"), 0.3);
  //#endregion

  //#region subscribe
  // HTML: home.html → #region subscribe
  const subRoot = document.querySelector("#subscribe");

  if (subRoot) {
    const subForm = subRoot.querySelector(".sub-form");
    const subInput = subForm.querySelector("input[type=email]");
    const subArt = subRoot.querySelector(".sub-art");

    // yoxlama brauzerin öz pəncərəsi ilə yox, ZAN.notify və qırmızı haşiyə ilə
    subForm.addEventListener("submit", function (e) {
      e.preventDefault();
      subInput.value = subInput.value.trim();

      if (!subInput.value || !subInput.checkValidity()) {
        subInput.setAttribute("aria-invalid", "true");
        subForm.classList.remove("is-invalid");
        void subForm.offsetWidth; // silkələnmə hər dəfə yenidən başlasın
        subForm.classList.add("is-invalid");
        ZAN.notify("error", "Ünvanı yoxlayın, məsələn: ad@mail.az", {
          title: "E-poçt ünvanı yanlışdır",
        });
        subInput.focus();
        return;
      }

      // TODO(.NET MVC): ünvanı serverə göndərmək (POST /Newsletter/Subscribe)
      ZAN.notify("success", "Yeni rənglər və endirimlər artıq e-poçtunuza gələcək.", {
        title: "Abunə oldunuz!",
      });
      subForm.reset();
    });

    subInput.addEventListener("input", function () {
      subInput.removeAttribute("aria-invalid");
      subForm.classList.remove("is-invalid");
    });

    // fırça izi bölmə ekrana girəndə sağdan sola "çəkilir"
    revealOnView(subArt, 0.35);
  }
  //#endregion
});
