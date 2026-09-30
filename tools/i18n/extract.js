/* ==========================================================================
   extract.js — tərcümə olunacaq bütün Azərbaycan mətnlərini yığır
   --------------------------------------------------------------------------
   İşlətmək:  cd tools/i18n && npm install && npm run extract
   Nəticə:    tools/i18n/keys.json — [{ key, where: ["home.html", "shop.js" ...] }]

   Mənbələr (açar = mətnin özü, boşluqlar bir boşluğa endirilir):
     1) *.html  — mətn düyünləri, placeholder / aria-label / alt / title /
                  data-watermark, <title> (" — " ilə hissələrə bölünür),
                  meta description / og:title / og:description
     2) assets/js/*.js — ZAN.t("...") açarları və mətnə oxşayan sətirlər;
                  HTML parçalarının içindəki mətn də (template literal-lar)
     3) demo məlumat — product-demo.js, visualizer-data.js (ad, təsvir ...)
   translate="no" olan elementlər (və içindəkilər) atlanır.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");
const { parse } = require("node-html-parser");

const ROOT = path.resolve(__dirname, "../..");
const ATTRS = ["placeholder", "aria-label", "alt", "title", "data-watermark"];
const AZ_LETTER = /[əöüğışçƏÖÜĞİŞÇ]/;
// sayda / tərcümədə dəyişkən tərkib: yalnız rəqəm, simvol, brend kodları atılır
const HAS_WORD = /\p{L}{2,}/u;

// avtomatik tapılmayan açarlar: dəyişəndən oxunanlar (contact-page.js DAY_NAMES,
// i18n.js "Dil") və kalkulyator başlığındakı isimlər (product-demo.js → noun:
// "Nə qədər <em>{1}</em> lazımdır?" — dillərdə bu cümləyə uyğun formada)
// i18n.js → measure(): ölçü şablonları ("3,5 kq" → "{n} kq")
const EXTRA = ["bazar", "Dil", "boya", "lak", "vernik", "divar kağızı", "yapışdırıcı", "{n} kq", "{n} q", "{n} l", "{n} rulon"];

const keys = new Map();
const norm = (text) => String(text).replace(/\s+/g, " ").trim();

// force — ZAN.t açarı: qısa olsa da ("{n} q") mütləq açardır
function add(text, where, force) {
  const key = norm(text);
  if (!key || (!force && (!HAS_WORD.test(key) || /^#[0-9a-f]{3,8}$/i.test(key)))) return;
  if (!keys.has(key)) keys.set(key, new Set());
  keys.get(key).add(where);
}

//#region HTML
// Bütöv cümlə — i18n.js → isRich / serialize ilə EYNİ qayda (açarlar üst-üstə düşməlidir):
// mətnin arasında yalnız formatlama teqləri; data-* teqin mətni → {1}, {2} ...
const INLINE = new Set(["em", "b", "strong", "small", "a", "br", "sup", "sub", "u", "mark"]);
const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const tagOf = (node) => (node.rawTagName || "").toLowerCase();

function isRich(el) {
  let inline = false;
  let text = false;
  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      if (/\p{L}/u.test(child.text)) text = true;
    } else if (child.nodeType === 1) {
      if (!INLINE.has(tagOf(child)) || child.childNodes.some((c) => c.nodeType !== 3)) return false;
      inline = true;
    }
  }
  return inline && text;
}

function serialize(el) {
  let out = "";
  let slot = 0;
  el.childNodes.forEach(function (child) {
    if (child.nodeType === 3) {
      out += escText(child.text);
    } else if (child.nodeType === 1) {
      const tag = tagOf(child);
      const list = Object.entries(child.attributes);
      const attrs = list.map(([n, v]) => (v === "" ? ` ${n}` : ` ${n}="${escAttr(v)}"`)).join("");
      const inner = list.some(([n]) => n.startsWith("data-")) ? `{${++slot}}` : escText(child.text);
      out += tag === "br" ? `<br${attrs}>` : `<${tag}${attrs}>${inner}</${tag}>`;
    }
  });
  return out;
}

function walkHtml(node, where, skip) {
  if (node.nodeType === 3) {
    if (!skip) add(node.text, where);
    return;
  }
  if (node.nodeType !== 1 && node.nodeType !== undefined) return;
  const tag = tagOf(node);
  if (["script", "style", "noscript", "code"].includes(tag)) return;
  const off = skip || (node.getAttribute && node.getAttribute("translate") === "no");
  if (node.getAttribute && !off) {
    ATTRS.forEach((a) => {
      const v = node.getAttribute(a);
      if (v) add(v, where);
    });
    // bütöv cümlə — içindəki parçalar ayrıca açar olmur
    if (node.nodeType === 1 && isRich(node)) {
      add(serialize(node), where);
      return;
    }
  }
  (node.childNodes || []).forEach((child) => walkHtml(child, where, off));
}

function fromHtmlFile(file) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const doc = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false } });
  const title = doc.querySelector("title");
  if (title) title.text.split(" — ").forEach((part) => add(part, file));
  doc
    .querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')
    .forEach((m) => add(m.getAttribute("content"), file));
  const body = doc.querySelector("body");
  if (body) walkHtml(body, file, false);
}

// JS-dəki HTML parçası: <b>...</b> mətnləri və atributlar
function fromHtmlFragment(fragment, where) {
  walkHtml(parse(fragment, { comment: false }), where, false);
}
//#endregion

//#region JS
// kod sözləri: klaviatura düymələri, Intl həftə günləri, fayl tipləri
const CODE_WORDS = new Set(["Escape", "Enter", "Tab", "Files", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "use strict"]);

// mətnə oxşayırmı? (selector, sinif adı, URL, CSS dəyəri, açar söz deyil)
function looksLikeText(s, isData) {
  if (!HAS_WORD.test(s.replace(/\b(px|em|rem|ms|deg|vh|vw)\b/g, ""))) return false;
  if (CODE_WORDS.has(s) || s.includes("@") || /sans-serif/.test(s)) return false;
  if (/^(https?:|mailto:|tel:|\.\/|#|\.|\[|data:|\()/.test(s)) return false;
  if (/^(inset|cubic-bezier|translate|rotate|scale|rgba?|var)\(/.test(s) || /[a-z]\.[a-z]/.test(s)) return false;
  if (/[{}]/.test(s) && !/\{\w+\}/.test(s)) return false;
  if (AZ_LETTER.test(s)) return true;
  // ASCII: böyük hərflə başlayan söz (Tavan, Kataloq) və ya bir neçə söz
  if (/^[A-Z][a-z]+$/.test(s)) return true;
  if (/\s/.test(s) && /^[\p{L}\d\s.,:;!?—–()'"«»“”%/×·+-]+$/u.test(s)) return isData || /[A-Z]/.test(s);
  return false;
}

function fromJsFile(file, isData) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script" });
  const where = path.basename(file);
  const MARK = "\u0001"; // template-in ${…} yeri

  const take = function (s) {
    if (typeof s !== "string") return;
    if (s.includes("<") && s.includes(">")) {
      // HTML parçası — yalnız görünən mətn və atributlar; ${…} olan hissələr
      // onsuz da ZAN.t ilə yığılır
      const before = keys.size;
      fromHtmlFragment(s, where);
      Array.from(keys.keys())
        .slice(before)
        .forEach((k) => k.includes(MARK) && keys.delete(k));
    } else if (!s.includes(MARK) && looksLikeText(norm(s), isData)) {
      add(s, where);
    }
  };

  // 1) ZAN.t("açar") arqumentləri — nə olursa olsun açardır
  const tArgs = new Set();
  walk.simple(ast, {
    CallExpression(node) {
      const callee = node.callee;
      const arg = node.arguments[0];
      if (callee.type === "MemberExpression" && callee.property.name === "t" && arg && arg.type === "Literal") {
        tArgs.add(arg);
        add(arg.value, where, true);
      }
    },
  });

  // 2) qalan sətirlər; template literal bütöv götürülür (HTML-i parçalanmasın)
  walk.simple(ast, {
    Literal(node) {
      if (!tArgs.has(node)) take(node.value);
    },
    TemplateLiteral(node) {
      take(node.quasis.map((q) => q.value.cooked).join(MARK));
    },
  });
}
//#endregion

//#region işə sal
fs.readdirSync(ROOT)
  .filter((f) => f.endsWith(".html"))
  .forEach(fromHtmlFile);

const JS_DIR = "assets/js";
const DATA = ["product-demo.js", "visualizer-data.js"];
const SKIP_JS = ["i18n.js", "head-init.js"];
fs.readdirSync(path.join(ROOT, JS_DIR))
  .filter((f) => f.endsWith(".js") && !SKIP_JS.includes(f))
  .forEach((f) => fromJsFile(path.join(JS_DIR, f), DATA.includes(f)));

EXTRA.forEach((k) => add(k, "extract.js (EXTRA)", true));

const out = Array.from(keys.entries())
  .map(([key, where]) => ({ key, where: Array.from(where).sort() }))
  .sort((a, b) => a.key.localeCompare(b.key, "az"));

fs.writeFileSync(path.join(__dirname, "keys.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`${out.length} açar → tools/i18n/keys.json`);
//#endregion
