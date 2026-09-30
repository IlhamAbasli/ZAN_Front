/* ==========================================================================
   i18n.js — saytın tərcüməsi (AZ · EN · RU · TR · 中文)
   --------------------------------------------------------------------------
   Qoşulur:     hər səhifədə, <body>-nin sonunda, BİRİNCİ öz skriptimiz kimi
                (site.js-dən əvvəl — hamı ZAN.t-dən istifadə edə bilsin)
                (.NET MVC-də: Views/Shared/_Layout.cshtml)
   Asılılıqlar: head-init.js (dili seçir və lüğəti yükləyir)
   Lüğətlər:    assets/i18n/<dil>.js → window.ZAN_I18N[<dil>] = { "AZ mətni": "tərcümə" }

   NECƏ İŞLƏYİR
     Açar — Azərbaycan mətninin özüdür (boşluqlar bir boşluğa endirilir):
       "Səbətə at": "Add to cart"
     ASP.NET Core-un IStringLocalizer-i də eyni prinsiplə işləyir:
     @Localizer["Səbətə at"] — lüğəti .resx-ə köçürmək kifayətdir.

     1) Səhifə yüklənəndə bütün mətn düyünləri və atributlar (placeholder,
        aria-label, alt, title, data-watermark) lüğətdə axtarılır.
     2) Sonradan JS-in əlavə etdiyi məzmun (səbət, bildirişlər, xətalar)
        MutationObserver ilə avtomatik tərcümə olunur.
     3) İçində dəyişən olan mətnlər JS-də ZAN.t ilə yığılır:
          ZAN.t("{n} məhsul", { n: 3 })
        Lüğətdə cəm formaları (rus dili üçün vacibdir):
          "{n} məhsul": { "one": "{n} товар", "few": "{n} товара", "many": "{n} товаров", "other": "{n} товара" }
     4) Mətnin arasında yalnız <em>/<b>/<small>/<a> olan cümlə bütöv açardır:
          "Mənim <em>hesabım</em>" → "My <em>account</em>" (söz sırası sərbəst)
     5) Ölçü ("3,5 kq") və qiymət ("89,90 ₼") açarsız — dilin formatında.
     Tərcümə olunmamalı hissə: translate="no" (loqo, telefon, kodlar).
     Lüğətdə olmayan mətn olduğu kimi (Azərbaycanca) qalır.
     Açarların siyahısı və yoxlama: tools/i18n (extract.js, check.js, TRANSLATING.md).

   API (window.ZAN):
     ZAN.t(key, vars)              → tərcümə (və ya açarın özü)
     ZAN.i18n.lang / locale        → "en" / "en-US"
     ZAN.i18n.set(lang)            → dili dəyişir (səhifə yenidən yüklənir)
     ZAN.i18n.source(el)           → elementin Azərbaycanca mətni (tərcümədən əvvəlki)
     ZAN.i18n.translate(root)      → əl ilə tərcümə (adətən lazım deyil)
   ========================================================================== */

window.ZAN = window.ZAN || {};

(function (ZAN) {
  "use strict";

  //#region dil
  const root = document.documentElement;
  const LANGS = {
    az: { label: "AZ", flag: "AZ", locale: "az-AZ" },
    en: { label: "EN", flag: "EN", locale: "en-US" },
    ru: { label: "RU", flag: "RU", locale: "ru-RU" },
    tr: { label: "TR", flag: "TR", locale: "tr-TR" },
    zh: { label: "CN", flag: "CN", locale: "zh-CN" },
  };
  const STORAGE_KEY = "zan-lang";

  const lang = LANGS[root.getAttribute("lang")] ? root.getAttribute("lang") : "az";
  const locale = LANGS[lang].locale;
  // Azərbaycan dilində lüğət yoxdur — mətn HTML-in özündədir
  const dict = lang === "az" ? null : (window.ZAN_I18N && window.ZAN_I18N[lang]) || {};
  //#endregion

  //#region t
  const norm = (text) => String(text).replace(/\s+/g, " ").trim();
  const has = (key) => Boolean(dict) && Object.prototype.hasOwnProperty.call(dict, key);
  const plurals = typeof Intl === "object" && Intl.PluralRules ? new Intl.PluralRules(locale) : null;

  function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
  }

  /**
   * Tərcümə: açar Azərbaycan mətnidir. vars — {ad} yer tutucuları.
   * Lüğətdəki dəyər obyektdirsə, vars.n-ə görə cəm forması seçilir.
   */
  function t(key, vars) {
    const k = norm(key);
    if (!has(k)) {
      // lüğətdə yoxdur — ölçüdürsə ("3,5 kq") şablonla, yoxsa mənbə mətn
      const measured = dict && !vars ? measure(k) : null;
      return measured !== null ? measured : fill(key, vars);
    }
    let message = dict[k];
    if (message && typeof message === "object") {
      // cəm forması həqiqi saya görə: vars.count (formatlanmış {n} "3,5" ola bilər)
      const n = vars && (vars.count !== undefined ? vars.count : vars.n);
      const category = plurals && n !== undefined ? plurals.select(Number(n)) : "other";
      message = message[category] || message.other || key;
    }
    return fill(message, vars);
  }
  //#endregion

  //#region DOM tərcüməsi
  const ATTRS = ["placeholder", "aria-label", "alt", "title", "data-watermark"];
  const SKIP = "script, style, noscript, code, [translate='no']";

  /*
    Bütöv cümlə: mətnin arasında yalnız formatlama teqləri varsa
    ("Mənim <em>hesabım</em>", "Salam, <b data-user-field>…</b>!"), cümlə
    parça-parça yox, bütöv tərcümə olunur — söz sırası dildən-dilə dəyişir.
    Açar — elementin içi (teqlər atributları ilə, boşluqlar sıxılmış);
    tools/i18n/extract.js eyni qaydaya görə yığır (serialize ilə eyni).
    data-* atributlu teqin mətni dəyişkəndir (JS / server yazır: ad, tarix,
    say) — açarda {1}, {2} ... olur, tətbiq edəndə cari mətn yerinə qoyulur:
      "Salam, <b data-user-field=\"firstName\">{1}</b>! …"
  */
  const INLINE = new Set(["EM", "B", "STRONG", "SMALL", "A", "BR", "SUP", "SUB", "U", "MARK"]);
  const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  function isRich(el) {
    let inline = false;
    let text = false;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        if (/\p{L}/u.test(child.nodeValue)) text = true;
      } else if (child.nodeType === 1) {
        if (!INLINE.has(child.tagName) || Array.from(child.childNodes).some((c) => c.nodeType !== 3)) return false;
        inline = true;
      }
    }
    return inline && text;
  }

  // → { key, slots: [dəyişkən mətnlər] }
  function serialize(el) {
    let out = "";
    const slots = [];
    el.childNodes.forEach(function (child) {
      if (child.nodeType === 3) {
        out += escText(child.nodeValue);
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        const list = Array.from(child.attributes);
        const attrs = list.map((a) => (a.value === "" ? ` ${a.name}` : ` ${a.name}="${escAttr(a.value)}"`)).join("");
        const dynamic = list.some((a) => a.name.startsWith("data-"));
        let inner = escText(child.textContent);
        if (dynamic) {
          slots.push(child.textContent);
          inner = `{${slots.length}}`;
        }
        out += tag === "br" ? `<br${attrs}>` : `<${tag}${attrs}>${inner}</${tag}>`;
      }
    });
    return { key: norm(out), slots: slots };
  }

  // tərcümə olunmuş düyünlərin orijinalı (source) və bizim yazdığımız dəyər —
  // observer öz dəyişikliyimizi yenidən emal etməsin
  const sourceText = new WeakMap();
  const written = new WeakMap();
  const sourceAttrs = new WeakMap();

  /*
    Ölçü: "3,5 kq", "250 q", "0,75 l", "6 rulon" — hər dəyər üçün ayrıca açar
    yazmamaq üçün "{n} kq" şablonu ilə, rəqəm dilin formatında (en: 3.5 kg).
  */
  const MEASURE = /^(\d+(?:[.,]\d+)?)\s?(kq|q|l|rulon)$/;
  const numberFormat = typeof Intl === "object" ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }) : null;

  function measure(text) {
    const m = MEASURE.exec(text);
    if (!m || !has(`{n} ${m[2]}`)) return null;
    const n = Number(m[1].replace(",", "."));
    return t(`{n} ${m[2]}`, { n: numberFormat ? numberFormat.format(n) : m[1], count: n });
  }

  // HTML-də yazılmış qiymət ("1 234,50 ₼") — dilin formatında (shop.js → ZAN.formatPrice ilə eyni)
  const MONEY = /^(\d{1,3}(?: \d{3})*),(\d{2}) ₼$/;
  const moneyFormat =
    typeof Intl === "object" ? new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

  function money(text) {
    const m = MONEY.exec(text);
    if (!m || !moneyFormat) return null;
    return `${moneyFormat.format(Number(m[1].replace(/ /g, "") + "." + m[2]))} ₼`;
  }

  // sabit mətn: tərcümədə {n} kimi yer tutucu yoxdur
  const lookup = (key) =>
    has(key) && typeof dict[key] === "string" ? dict[key] : dict ? measure(key) ?? money(key) : null;

  function translateTextNode(node) {
    const raw = node.nodeValue;
    // hərfsiz mətn yalnız qiymətdirsə ("89,90 ₼") emal olunur
    if (!raw || written.get(node) === raw || !(/\p{L}/u.test(raw) || raw.includes("₼"))) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return;

    const value = lookup(norm(raw));
    if (value === null) return;
    const out = raw.match(/^\s*/)[0] + value + raw.match(/\s*$/)[0];
    sourceText.set(node, raw);
    written.set(node, out);
    node.nodeValue = out;
  }

  function translateAttr(el, name) {
    const raw = el.getAttribute(name);
    if (!raw || !/\p{L}/u.test(raw) || el.closest(SKIP)) return;
    const done = sourceAttrs.get(el) || {};
    if (done[name] && done[name].out === raw) return;
    const value = lookup(norm(raw));
    if (value === null) return;
    done[name] = { src: raw, out: value };
    sourceAttrs.set(el, done);
    el.setAttribute(name, value);
  }

  // bütöv tərcümə olunmuş cümlələr (bir dəfə)
  const richDone = new WeakSet();

  function translateRich(el) {
    if (richDone.has(el) || el.closest(SKIP) || !isRich(el)) return;
    const { key, slots } = serialize(el);
    const value = lookup(key);
    if (value === null) return; // lüğətdə yoxdursa — parça-parça (mətn düyünləri)
    richDone.add(el);
    // lüğət bizimdir — etibarlı HTML (yalnız formatlama teqləri); dəyişkən mətn escape olunur
    // dəyişkən mətn lüğətdə varsa (məs. kalkulyatorda "boya") — o da tərcümə olunur
    el.innerHTML = value.replace(/\{(\d+)\}/g, function (m, i) {
      const text = slots[i - 1] || "";
      return escText(lookup(norm(text)) ?? text);
    });
  }

  function translate(scope) {
    if (!dict) return;
    const base = scope || document.body;
    if (base.nodeType === 3) {
      translateTextNode(base);
      return;
    }
    translateRich(base);
    base.querySelectorAll("*").forEach(translateRich);

    const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);

    const selector = ATTRS.map((a) => `[${a}]`).join(",");
    const elements = base.matches && base.matches(selector) ? [base] : [];
    base.querySelectorAll(selector).forEach((el) => elements.push(el));
    elements.forEach((el) => ATTRS.forEach((a) => el.hasAttribute(a) && translateAttr(el, a)));
  }

  // "Məhsul adı — ZAN Boya": hissə-hissə tərcümə
  function translateTitle() {
    const parts = document.title.split(" — ");
    const out = parts.map((part) => lookup(norm(part)) || part).join(" — ");
    if (out !== document.title) document.title = out;
  }

  function translateMeta() {
    document
      .querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')
      .forEach(function (meta) {
        const value = lookup(norm(meta.content));
        if (value !== null) meta.content = value;
      });
  }

  /** Elementin Azərbaycanca (tərcümədən əvvəlki) mətni — səbətə yazmaq üçün */
  function source(el) {
    if (!el) return "";
    if (!dict) return norm(el.textContent);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let text = "";
    let node;
    while ((node = walker.nextNode())) {
      text += written.get(node) === node.nodeValue ? sourceText.get(node) : node.nodeValue;
    }
    return norm(text);
  }
  //#endregion

  //#region dil seçimi
  function set(next) {
    if (!LANGS[next]) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      /* saxlaya bilmiriksə ?lang= ilə davam edir */
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang") || next !== lang) url.searchParams.set("lang", next);
    if (next === "az") url.searchParams.delete("lang");
    window.location.href = url.href;
  }

  // header (düymə + menyu) və mobil menyudakı dil seçimləri
  function syncSwitchers() {
    const current = LANGS[lang];

    document.querySelectorAll('[aria-controls="language-menu"]').forEach(function (button) {
      const label = Array.from(button.childNodes).find((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (label) label.nodeValue = label.nodeValue.replace(/\S+/, current.label);
      const flag = button.querySelector("img");
      if (flag) flag.src = flag.getAttribute("src").replace(/[A-Z]{2}\.png$/, `${current.flag}.png`);
      button.setAttribute("aria-label", `${t("Dil")}: ${current.label}`);
    });

    document.querySelectorAll("#language-menu a[hreflang]").forEach(function (link) {
      link.closest("li").hidden = link.getAttribute("hreflang") === lang;
    });

    document.querySelectorAll(".mobile-lang-options a[hreflang]").forEach(function (link) {
      const active = link.getAttribute("hreflang") === lang;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  document.addEventListener("click", function (e) {
    const link = e.target.closest("#language-menu a[hreflang], .mobile-lang-options a[hreflang]");
    if (!link) return;
    e.preventDefault();
    set(link.getAttribute("hreflang"));
  });
  //#endregion

  //#region init
  ZAN.t = t;
  ZAN.i18n = {
    lang: lang,
    locale: locale,
    languages: Object.keys(LANGS),
    t: t,
    set: set,
    source: source,
    translate: translate,
  };

  syncSwitchers();

  if (dict) {
    translate(document.body);
    translateTitle();
    translateMeta();

    // sonradan əlavə olunan / dəyişən məzmun
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => (n.nodeType === 1 || n.nodeType === 3) && translate(n));
        } else if (m.type === "characterData") {
          translateTextNode(m.target);
        } else if (m.type === "attributes") {
          translateAttr(m.target, m.attributeName);
        }
      });
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    const title = document.querySelector("title");
    if (title) new MutationObserver(translateTitle).observe(title, { childList: true, characterData: true, subtree: true });
  }

  // tərcümə bitdi — gizlədilmiş səhifə görünür (head-init.js → i18n-loading)
  root.classList.remove("i18n-loading");
  //#endregion
})(window.ZAN);
