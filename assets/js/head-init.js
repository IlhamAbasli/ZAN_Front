/* ==========================================================================
   head-init.js — ilk rəsmdən əvvəl: saxlanmış mövzu və dil
   --------------------------------------------------------------------------
   Qoşulur:     hər səhifədə, <head>-in içində, CSS-dən sonra — defer / async
                OLMADAN (.NET MVC-də: Views/Shared/_Layout.cshtml → <head>)
   Asılılıqlar: yoxdur

   Səhifə çəkilməzdən əvvəl işləməlidir: <body>-nin sonuna köçürülsə, tünd
   rejim seçilmiş istifadəçi səhifəni bir anlıq işıqlı, başqa dil seçmiş
   istifadəçi isə Azərbaycanca görür.

   1) MÖVZU — localStorage "zan-theme" ("dark" | "light", JSON deyil)
      → <html data-theme>. Düymələr: site.js → #region theme.
   2) DİL — ?lang= (paylaşılan link) → localStorage "zan-lang" → "az".
      → <html lang>, data-lang. Azərbaycan dili HTML-in özündədir; başqa
      dildə lüğət (assets/i18n/<dil>.js) BURADA sinxron yüklənir ki, bütün
      skriptlər (ZAN.t) işə düşəndə hazır olsun. Tərcümə: i18n.js.
      TODO (backend): MVC-də dili server seçir (RequestLocalization) və
      səhifəni tərcümə olunmuş render edir; onda lüğət yalnız JS mətnləri
      üçün lazımdır — _Layout-da <script src="~/assets/i18n/@lang.js">.
   ========================================================================== */

(function () {
  var root = document.documentElement;

  // mövzu
  try {
    var theme = localStorage.getItem("zan-theme");
    if (theme === "dark" || theme === "light") root.setAttribute("data-theme", theme);
  } catch (e) {
    /* localStorage bağlıdırsa sistem seçimi ilə davam edirik */
  }

  // dil
  var LANGS = ["az", "en", "ru", "tr", "zh"];
  var lang = "az";
  try {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    var saved = localStorage.getItem("zan-lang");
    if (LANGS.indexOf(fromUrl) > -1) {
      lang = fromUrl;
      localStorage.setItem("zan-lang", lang);
    } else if (LANGS.indexOf(saved) > -1) {
      lang = saved;
    }
  } catch (e) {
    /* saxlama bağlıdırsa yalnız ?lang= işləyir */
  }

  root.setAttribute("lang", lang);
  root.setAttribute("data-lang", lang);

  if (lang !== "az") {
    // tərcümə bitənə qədər səhifə gizlidir (preloader görünür) — i18n.js açır;
    // lüğət yüklənməsə, 4 saniyədən sonra Azərbaycanca göstərilir
    root.classList.add("i18n-loading");
    setTimeout(function () {
      root.classList.remove("i18n-loading");
    }, 4000);

    // sinxron: parser-in içində, eyni mənbədən — bütün skriptlərdən əvvəl hazırdır
    var base = (document.currentScript && document.currentScript.src) || "";
    var src = base.replace(/js\/head-init\.js(\?.*)?$/, "i18n/" + lang + ".js");
    document.write('<script src="' + src + '"><\/script>');
  }
})();
