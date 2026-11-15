/* ==========================================================================
   promo.js — kampaniya və endirim broşürləri (açılış pəncərəsi)
   --------------------------------------------------------------------------
   Qoşulur:     site.js → auth.js → shop.js-dən sonra, səhifə skriptindən əvvəl.
                Alış prosesində (səbət, sifariş, giriş) qoşulmur — müştərinin
                diqqəti yayınmasın. (.NET MVC-də: Views/Shared/_Layout.cshtml,
                həmin səhifələrdə ViewData["NoPromo"] ilə söndürülür)
   Asılılıqlar: site.js (ZAN.store, ZAN.escapeHtml, ZAN.prefersReducedMotion),
                i18n.js (ZAN.t, ZAN.i18n)
   Stil:        components/_promo.scss

   Necə işləyir
     • Sayt açılanda (preloader-dən sonra) aktiv kampaniyalar pəncərədə göstərilir.
       Bir neçə broşür varsa — sürüşdürülən slayder (oxlar, nöqtələr, klaviatura,
       barmaqla). Slaydlar AUTOPLAY_MS-dən bir özü dəyişir (aktiv nöqtə dolan
       zolaqdır); siçan üstündə, barmaq ekranda olanda və "fasilə" düyməsi ilə
       dayanır. "Animasiyaları azalt" açıq olan cihazlarda avtomatik keçid yoxdur.
     • "Sayt açılanda" — sayta hər giriş: ünvan yazılanda, xarici linkdən
       (Google, Instagram ...) gələndə, yeni vərəqdə, səhifə yeniləndikdə.
       Sayt daxilində bir səhifədən digərinə keçəndə yenidən açılmır.
     • Sol-aşağıdakı "Kampaniyalar" düyməsi pəncərəni istənilən vaxt açır.
     • ?promo=1 — pəncərəni məcburi açır (yoxlamaq, linklə paylaşmaq üçün).

   YENİ BROŞÜR ƏLAVƏ ETMƏK — aşağıdakı CAMPAIGNS siyahısına bir obyekt:
     id       unikal ad (latın hərfləri, tire)
     image    poster: A4 dik (≈ 1240 × 1754 px), .webp; assets/images/campaigns/
     images   (istəyə görə) başqa dil üçün poster: { ru: "...", en: "..." }
     alt      posterdəki əsas mətn (ekran oxuyucular və axtarış üçün)
     title    pəncərənin altındakı başlıq
     tag      başlığın üstündəki kiçik yazı (məs. "Ustalar üçün")
     start    göstərilməyə başlayır, "YYYY-MM-DD" (istəyə görə)
     end      son gün, daxil olmaqla, "YYYY-MM-DD" (istəyə görə) — keçəndə gizlənir
     actions  düymələr: [{ label, href, primary }]; xarici link yeni vərəqdə açılır
   Siyahını boşaltmaq (və ya hamısının vaxtı keçmək) pəncərəni və düyməni söndürür.

   TODO (backend): siyahı admin paneldən gəlsin — səhifəyə
     <script type="application/json" id="promo-data">[ ... ]</script>
   yazmaq kifayətdir (eyni sahələrlə); varsa CAMPAIGNS əvəzinə o oxunur.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region kampaniyalar
  const CAMPAIGNS = [
    {
      id: "her-mehsulda-3-manat",
      image: "./assets/images/campaigns/her-mehsulda-3-manat.webp",
      alt: "Hər məhsulda 3 manat — ustama hədiyyə! Bonuslar yalnız 25 və 10 kq vedrələrdə: 25 kq — 3 AZN, 10 kq — 2 AZN.",
      tag: "Ustama hədiyyə",
      title: "Hər məhsulda 3 manata qədər bonus — 25 və 10 kq vedrələrdə",
      start: "",
      end: "",
      actions: [
        { label: "Məhsullara bax", href: "shop.html?brand=zan&category=su-esasli-boyalar,yapisdiricilar", primary: true },
        { label: "WhatsApp ilə yazın", href: "https://wa.me/994512441449" },
      ],
    },
    {
      id: "ustalar-klubu-etiket",
      image: "./assets/images/campaigns/ustalar-klubu-etiket.webp",
      alt: "Divar kağızı etiketini topla, bonusunu qazan! 20 etiket — 5 AZN, 50 etiket — 15 AZN, 100 etiket — 40 AZN, 200 etiket — 100 AZN.",
      tag: "Ustalar üçün xüsusi kampaniya",
      title: "Divar kağızı etiketini topla, bonusunu qazan!",
      start: "",
      end: "",
      actions: [
        { label: "WhatsApp qrupuna qoşul", href: "https://wa.me/994512441449", primary: true },
        { label: "Ustalar Klubu", href: "account.html#club" },
      ],
    },
  ];
  //#endregion

  //#region ayarlar
  // preloader gizləndikdən sonra bir az gözləyirik ki, səhifə görünsün
  const OPEN_DELAY = 1400;
  // avtomatik keçid: hər posterdə neçə millisaniyə qalır
  const AUTOPLAY_MS = 6000;
  //#endregion

  //#region məlumat
  function readCampaigns() {
    const el = document.getElementById("promo-data");
    if (el) {
      try {
        const list = JSON.parse(el.textContent);
        if (Array.isArray(list)) return list;
      } catch (e) {
        /* pozulmuş JSON — daxili siyahı işlədilir */
      }
    }
    return CAMPAIGNS;
  }

  // "YYYY-MM-DD" → yerli günün başlanğıcı (saat qurşağı sürüşməsin)
  function day(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  function isActive(c, now) {
    if (!c || !c.id || !c.image) return false;
    const start = day(c.start);
    const end = day(c.end);
    if (start && now < start) return false;
    if (end && now >= new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)) return false;
    return true;
  }

  const campaigns = readCampaigns().filter((c) => isActive(c, new Date()));
  if (!campaigns.length || document.body.hasAttribute("data-no-promo")) return;

  const esc = ZAN.escapeHtml;
  const lang = (ZAN.i18n && ZAN.i18n.lang) || "az";
  const locale = (ZAN.i18n && ZAN.i18n.locale) || "az-AZ";
  const posterOf = (c) => (c.images && c.images[lang]) || c.image;
  const isExternal = (href) => /^https?:\/\//i.test(href) && !href.startsWith(location.origin);
  //#endregion

  //#region görünmə qaydası
  // sayta giriş: yeniləmə, birbaşa açılış və ya başqa saytdan gəliş.
  // Saytın öz səhifəsindən keçid (referrer — eyni origin) giriş sayılmır.
  function shouldAutoOpen() {
    if (new URLSearchParams(location.search).get("promo") === "1") return true;
    const nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    if (nav && nav.type === "reload") return true;
    if (!document.referrer) return true;
    try {
      return new URL(document.referrer).origin !== location.origin;
    } catch (e) {
      return true;
    }
  }
  //#endregion

  //#region pəncərə
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  const ICON_GIFT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v7.5h14v-7.5M12 8.5V20"/><path d="M12 8.5S10.8 4 8.4 4C6.9 4 6 5 6 6.2 6 7.6 7.4 8.5 9 8.5zM12 8.5S13.2 4 15.6 4C17.1 4 18 5 18 6.2c0 1.4-1.4 2.3-3 2.3z"/></svg>';

  const multiple = campaigns.length > 1;
  // "animasiyaları azalt" açıqdırsa slaydlar özü dəyişmir
  const autoplay = multiple && !ZAN.prefersReducedMotion();
  let dialog = null;
  let track = null;
  let launcher = null;
  let current = 0;
  let trigger = null;

  // avtomatik keçidin fasilə səbəbləri (hover, touch, focus, hidden, user)
  const holds = new Set();
  function hold(reason, on) {
    on ? holds.add(reason) : holds.delete(reason);
    if (dialog) dialog.classList.toggle("is-paused", holds.size > 0);
  }

  // bitmə tarixi — dilin formatında ("31 dekabr", "December 31").
  // Bəzi brauzerlərdə az-AZ ay adları yoxdur ("M12 31") — Azərbaycanca özümüz yazırıq
  const AZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
  function untilText(c) {
    const end = day(c.end);
    if (!end) return "";
    let date = `${end.getDate()} ${AZ_MONTHS[end.getMonth()]}`;
    if (lang !== "az") {
      try {
        date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(end);
      } catch (e) {
        /* Azərbaycanca qalır */
      }
    }
    return ZAN.t("{date} tarixinədək", { date });
  }

  // Hər slayd — poster + öz başlığı və düymələri. Mətn posterlə birlikdə sürüşür,
  // heç vaxt dəyişdirilmir: keçid zamanı pəncərənin hündürlüyü tullanmır.
  function slideHtml(c, i) {
    const until = untilText(c);
    const tag =
      c.tag || until
        ? `<p class="pm-tag">${c.tag ? `<span>${esc(c.tag)}</span>` : ""}${until ? `<span class="pm-until">${esc(until)}</span>` : ""}</p>`
        : "";
    const actions = (c.actions || [])
      .filter((a) => a && a.label && a.href)
      .map(
        (a) =>
          `<a class="pm-btn${a.primary ? " is-primary" : ""}" href="${esc(a.href)}"${
            isExternal(a.href) ? ' target="_blank" rel="noopener"' : ""
          }>${esc(a.label)}</a>`,
      )
      .join("");
    // bütün posterlər əvvəlcədən yüklənir — sürüşəndə şəkil "gec gəlməsin"
    return `
      <div class="pm-slide" role="group" aria-label="${i + 1} / ${campaigns.length}">
        <div class="pm-poster">
          <img src="${esc(posterOf(c))}" alt="${esc(c.alt || c.title || "")}" width="590" height="835" decoding="async" />
        </div>
        <div class="pm-foot">
          ${tag}
          <h2 class="pm-title" id="promo-title-${i}">${esc(c.title || "")}</h2>
          ${actions ? `<div class="pm-actions">${actions}</div>` : ""}
        </div>
      </div>`;
  }

  function buildDialog() {
    const el = document.createElement("dialog");
    el.className = "promo";
    el.classList.toggle("is-autoplay", autoplay);
    el.style.setProperty("--pm-interval", `${AUTOPLAY_MS}ms`);

    const controls = multiple
      ? `<div class="pm-controls">
          <div class="pm-dots">${campaigns
            .map(
              (c, i) =>
                `<button type="button" class="pm-dot" data-go="${i}" aria-label="${esc(ZAN.t("Kampaniya {n}", { n: i + 1 }))}"><span class="pm-dot-fill"></span></button>`,
            )
            .join("")}</div>
          ${autoplay ? `<button type="button" class="pm-play" aria-label="Avtomatik keçidi dayandır">${ICON_PAUSE}</button>` : ""}
        </div>`
      : "";

    el.innerHTML = `
      <div class="pm-card">
        <button type="button" class="pm-close" aria-label="Pəncərəni bağla">${ICON_CLOSE}</button>
        <div class="pm-viewport">
          <div class="pm-track">${campaigns.map(slideHtml).join("")}</div>
          ${
            multiple
              ? `<button type="button" class="pm-nav is-prev" data-step="-1" aria-label="Əvvəlki kampaniya">${ICON_PREV}</button>
                 <button type="button" class="pm-nav is-next" data-step="1" aria-label="Növbəti kampaniya">${ICON_NEXT}</button>`
              : ""
          }
        </div>
        ${controls}
      </div>`;

    el.querySelector(".pm-close").addEventListener("click", () => el.close());
    // posterin kənarına (arxa fona) klik pəncərəni bağlayır
    el.addEventListener("click", (e) => {
      if (e.target === el) el.close();
    });
    el.addEventListener("close", function () {
      document.body.classList.remove("has-promo");
      if (launcher) launcher.hidden = false;
      if (trigger && document.contains(trigger)) trigger.focus();
      trigger = null;
      // növbəti açılışda köhnə hover/toxunuş fasiləsi qalmasın ("fasilə" düyməsi qalır)
      ["hover", "touch", "focus"].forEach((reason) => hold(reason, false));
    });

    track = el.querySelector(".pm-track");
    document.body.appendChild(el);
    dialog = el;
    if (multiple) bindSlider();
    return el;
  }

  // aktiv slayd: nöqtə, ekran oxuyucu və Tab yalnız onda
  function setActive(index) {
    current = index;
    dialog.setAttribute("aria-labelledby", `promo-title-${index}`);
    dialog.querySelectorAll(".pm-slide").forEach(function (slide, i) {
      const active = i === index;
      slide.setAttribute("aria-hidden", String(!active));
      slide.querySelectorAll("a,button").forEach((el) => (el.tabIndex = active ? 0 : -1));
    });
    dialog.querySelectorAll(".pm-dot").forEach(function (dot, i) {
      dot.setAttribute("aria-current", String(i === index));
      // zolaq hər slaydda sıfırdan dolsun
      if (i === index) restartFill(dot.firstElementChild);
    });
  }

  function restartFill(fill) {
    fill.style.animation = "none";
    void fill.offsetWidth;
    fill.style.animation = "";
  }

  function open(fromUser) {
    // başqa pəncərə (giriş, sürətli baxış) və ya menyu açıqdırsa üstünə çıxmırıq
    if (!fromUser && document.querySelector("dialog[open], .modal.show, .offcanvas.show")) return;
    if (typeof dialog.showModal !== "function" || dialog.open) return;

    trigger = fromUser ? document.activeElement : null;
    dialog.showModal();
    track.scrollLeft = 0;
    setActive(0);
    document.body.classList.add("has-promo");
    if (launcher) launcher.hidden = true;
    // fokus bağla düyməsində — Enter/Esc ilə dərhal bağlanır
    dialog.querySelector(".pm-close").focus();
  }
  //#endregion

  //#region slayder
  // Sürüşmə — brauzerin öz scroll-snap-ı (barmaqla, trackpad-la təbii işləyir).
  // Aktiv slayd yalnız sürüşmə DAYANANDA hesablanır; keçid zamanı heç nə dəyişmir.
  function bindSlider() {
    dialog.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => go(current + Number(b.dataset.step))));
    dialog.querySelector(".pm-dots").addEventListener("click", function (e) {
      const dot = e.target.closest("[data-go]");
      if (dot) go(Number(dot.dataset.go));
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") go(current + 1);
      if (e.key === "ArrowLeft") go(current - 1);
    });

    let settleTimer = 0;
    const settle = function () {
      clearTimeout(settleTimer);
      const index = Math.round(track.scrollLeft / track.clientWidth);
      if (index !== current && campaigns[index]) setActive(index);
    };
    track.addEventListener(
      "scroll",
      function () {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, 140);
      },
      { passive: true },
    );
    if ("onscrollend" in window) track.addEventListener("scrollend", settle);

    if (autoplay) bindAutoplay();
  }

  // slayda keçid (dövri: sonuncudan sonra birinci)
  function go(index) {
    const count = campaigns.length;
    const next = ((index % count) + count) % count;
    track.scrollTo({ left: next * track.clientWidth, behavior: ZAN.prefersReducedMotion() ? "auto" : "smooth" });
    setActive(next);
  }

  // Avtomatik keçid: saat — aktiv nöqtənin dolma animasiyasıdır (CSS, --pm-interval).
  // Dolub qurtaranda növbəti slayd; fasilədə animasiya da dayanır (animation-play-state).
  // Dayanır: siçan posterin üstündə, barmaq ekranda, klaviatura fokusu düymələrdə,
  // vərəq gizli olanda və "fasilə" düyməsi ilə.
  function bindAutoplay() {
    dialog.querySelector(".pm-dots").addEventListener("animationend", function (e) {
      if (e.animationName === "pm-progress" && dialog.open) go(current + 1);
    });

    const card = dialog.querySelector(".pm-card");
    card.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && hold("hover", true));
    card.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && hold("hover", false));
    // touchend barmaq qalxanda gəlir (pointercancel isə sürüşmə başlayan kimi)
    track.addEventListener("touchstart", () => hold("touch", true), { passive: true });
    ["touchend", "touchcancel"].forEach((type) => track.addEventListener(type, () => hold("touch", false), { passive: true }));
    card.addEventListener("focusin", function (e) {
      hold("focus", e.target.matches(":focus-visible") && !e.target.matches(".pm-close"));
    });
    card.addEventListener("focusout", () => hold("focus", false));
    document.addEventListener("visibilitychange", () => hold("hidden", document.hidden));

    const playButton = dialog.querySelector(".pm-play");
    playButton.addEventListener("click", function () {
      const paused = !holds.has("user");
      hold("user", paused);
      playButton.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
      playButton.setAttribute("aria-label", paused ? ZAN.t("Avtomatik keçidi davam etdir") : ZAN.t("Avtomatik keçidi dayandır"));
    });
  }
  //#endregion

  //#region "Kampaniyalar" düyməsi
  function buildLauncher() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promo-launcher";
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML = `${ICON_GIFT}<span class="promo-launcher-text">Kampaniyalar</span>${
      multiple ? `<span class="promo-launcher-count" aria-hidden="true">${campaigns.length}</span>` : ""
    }`;
    button.addEventListener("click", () => open(true));
    document.body.appendChild(button);
    return button;
  }
  //#endregion

  //#region işə sal
  // pəncərə əvvəlcədən qurulur — poster açılana qədər yüklənsin
  dialog = buildDialog();
  // <dialog> dəstəklənmirsə (çox köhnə brauzer) heç nə göstərilmir
  if (typeof dialog.showModal !== "function") return;
  launcher = buildLauncher();
  // köhnə versiyanın "24 saat göstərmə" qeydi artıq işlənmir
  ZAN.store.remove("zan-promo");

  if (shouldAutoOpen()) {
    const start = () => setTimeout(() => open(false), OPEN_DELAY);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }

  ZAN.promo = { open: () => open(true) };
  //#endregion
})(window.ZAN);
