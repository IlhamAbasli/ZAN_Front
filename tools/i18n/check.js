/* ==========================================================================
   check.js — lüğətləri keys.json ilə tutuşdurur
   --------------------------------------------------------------------------
   İşlətmək:  npm run check            (bütün dillər)
              node check.js ru         (bir dil)
   Yoxlayır:  çatışmayan açarlar, artıq (köhnəlmiş) açarlar, {yer tutucu}
              uyğunluğu, HTML teqləri (<b>, <em>), cəm formaları.
   Çıxış kodu 1 — problem varsa (CI üçün).
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const DICT_DIR = path.join(ROOT, "assets/i18n");
const LANGS = ["en", "ru", "tr", "zh"];
// cəm formaları: ru — one/few/many/other, en — one/other; tr, zh — sadə sətir
const PLURALS = { en: ["one", "other"], ru: ["one", "few", "many", "other"] };

const keys = JSON.parse(fs.readFileSync(path.join(__dirname, "keys.json"), "utf8")).map((k) => k.key);
const keySet = new Set(keys);

const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
// teqlər atributları ilə birlikdə müqayisə olunur (data-*, href dəyişməməlidir)
const tags = (s) => (String(s).match(/<\/?[a-z][^>]*>/g) || []).sort().join(",");

function load(lang) {
  const file = path.join(DICT_DIR, `${lang}.js`);
  if (!fs.existsSync(file)) return null;
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return (sandbox.window.ZAN_I18N || {})[lang] || {};
}

let failed = false;
const only = process.argv[2];

for (const lang of only ? [only] : LANGS) {
  const dict = load(lang);
  if (!dict) {
    console.log(`\n[${lang}] fayl yoxdur: assets/i18n/${lang}.js`);
    failed = true;
    continue;
  }
  const problems = [];
  const missing = keys.filter((k) => !Object.prototype.hasOwnProperty.call(dict, k));
  const extra = Object.keys(dict).filter((k) => !keySet.has(k));

  for (const [key, value] of Object.entries(dict)) {
    const forms = value && typeof value === "object" ? Object.entries(value) : [["", value]];
    if (value && typeof value === "object") {
      const need = PLURALS[lang];
      if (!need) problems.push(`cəm forması lazım deyil (sadə sətir yazın): ${key}`);
      else need.forEach((f) => !(f in value) && problems.push(`cəm forması "${f}" yoxdur: ${key}`));
    }
    for (const [form, text] of forms) {
      if (typeof text !== "string" || !text.trim()) {
        problems.push(`boş tərcümə${form && ` (${form})`}: ${key}`);
        continue;
      }
      if (placeholders(text) !== placeholders(key)) {
        problems.push(`yer tutucular fərqlidir${form && ` (${form})`}: ${key} → ${text}`);
      }
      if (tags(text) !== tags(key)) problems.push(`HTML teqləri fərqlidir${form && ` (${form})`}: ${key} → ${text}`);
    }
  }

  const ok = !missing.length && !problems.length;
  console.log(
    `\n[${lang}] ${Object.keys(dict).length}/${keys.length} açar · çatışmır: ${missing.length} · artıq: ${extra.length} · problem: ${problems.length}`,
  );
  missing.slice(0, 40).forEach((k) => console.log("  çatışmır:", k));
  if (missing.length > 40) console.log(`  … və daha ${missing.length - 40}`);
  extra.slice(0, 20).forEach((k) => console.log("  artıq:", k));
  problems.slice(0, 40).forEach((p) => console.log("  !", p));
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
