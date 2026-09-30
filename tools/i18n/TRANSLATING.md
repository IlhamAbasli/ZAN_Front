# ZAN Boya — tərcümə qaydaları (lüğətlər: `assets/i18n/<dil>.js`)

Sayt: Azərbaycan boya brendi ZAN Boya-nın onlayn mağazası (boyalar, lak, divar
kağızları, yapışdırıcılar, rəng vizualizatoru, səbət, sifariş, şəxsi kabinet).
Oxucu — ev sahibləri və peşəkar ustalar. Ton: səmimi, qısa, aydın; e-ticarət
interfeysi. Mənbə dil — Azərbaycan dili.

## Yeni mətn əlavə edəndə (iş ardıcıllığı)

1. HTML-ə Azərbaycanca mətn yazın; JS-də dəyişənli mətni `ZAN.t("{n} məhsul", { n })` ilə yığın
   (sabit mətn — məs. `el.textContent = "Səbətə at"` — avtomatik tərcümə olunur).
2. `cd tools/i18n && npm install` (bir dəfə), sonra `npm run extract` → `keys.json` yenilənir.
3. `npm run check` — hansı dildə hansı açarların çatışmadığını göstərir.
4. Çatışmayanları `assets/i18n/<dil>.js`-ə əlavə edin (aşağıdakı qaydalarla), `npm run check` — 0 problem.
5. Brauzerdə yoxlama: `home.html?lang=ru` (dil seçimi yadda qalır; AZ-a qayıtmaq — `?lang=az`).

Tərcümə olunmamalı hissə: HTML-də `translate="no"`.
Ölçü ("3,5 kq", "250 q", "6 rulon") və qiymət ("89,90 ₼") açarsız, avtomatik çevrilir
(i18n.js → measure / money) — lüğətdə yalnız "{n} kq", "{n} q", "{n} l", "{n} rulon" lazımdır.

## Fayl formatı

```js
/* ZAN Boya — English (en). Açar: Azərbaycan mətni (tools/i18n/keys.json). Yoxlama: npm run check */
(window.ZAN_I18N = window.ZAN_I18N || {}).en = {
  "Səbətə at": "Add to cart",
  "{n} məhsul": { "one": "{n} product", "other": "{n} products" },
};
```

- Açar `tools/i18n/keys.json`-dakı `key` ilə **hərfi-hərfinə** eyni olmalıdır.
- Hər açar tərcümə olunur (brend adı kimi dəyişməyənlər də — dəyər açarla eyni olur).
- Yoxlama: `cd tools/i18n && node check.js <dil>` — çatışmayan, artıq, yer tutucu
  və HTML səhvlərini göstərir. Nəticə 0 problem olmalıdır.

## Qaydalar

1. **Yer tutucular** — `{n}`, `{name}`, `{price}`, `{days}` ... dəyişmədən qalır.
2. **HTML teqləri** — açarda `<b>…</b>` varsa, tərcümədə də eyni teqlər olur.
3. **Cəm formaları** (`{n}` saydırsa: "{n} məhsul", "{n} rəng", "{n} simvol"):
   - `ru`: `{ "one", "few", "many", "other" }` — 1 товар / 2 товара / 5 товаров
   - `en`: `{ "one", "other" }`
   - `tr`, `zh`: sadə sətir (sayla isim dəyişmir).
   Sıra nömrələri ("Slayd {n}", "Səhifə {n}", "Şəkil {n}", "Səth {n}") — sadə sətir.
4. **Bütöv cümlələr (HTML-li açarlar).** Mətnin arasında yalnız formatlama teqləri
   (`<em>`, `<b>`, `<small>`, `<a>`) olan cümlələr bütöv açardır:
   `"Mənim <em>hesabım</em>"` → `"My <em>account</em>"`. Teqləri (atributları ilə,
   hərfi-hərfinə) saxlayın, amma cümlədə **istənilən yerə** qoya bilərsiniz — söz
   sırası dilinizə uyğun olsun. `{1}`, `{2}` — JS/server-in yazdığı dəyişkən mətndir
   (ad, tarix, say): teqin içində olduğu kimi qalır.
   Kalkulyator başlığı: `"Nə qədər <em data-pd=\"calc-noun\">{1}</em> lazımdır?"` —
   {1} yerinə isim gəlir (açarlar: "boya", "lak", "vernik", "divar kağızı",
   "yapışdırıcı"); bu isimləri məhz bu cümləyə uyğun formada tərcümə edin
   (ru: "краски", "лака" ...).

5. **Parçalanmış cümlələr** (köhnə üsul — digər teqlər olanda). Mətn düyünləri ayrı-ayrı tərcümə olunur. Cümlənin
   ortasında `<em>`, `<b>`, `<a>` varsa, açarlar cümlənin **parçalarıdır**:
   `"Nə qədər"` + `<em>boya</em>` + `"lazımdır?"`. Hər parçanı elə tərcümə edin ki,
   **birləşəndə** dilinizdə düzgün cümlə alınsın (lazım olsa söz sırasını
   parçalar arasında dəyişin; parça boş qala bilməz — ən azı bir işarə/söz).
   Konteksti görmək üçün `where` sütunundakı faylda mətni axtarın.
6. **Dəyişməyən adlar**: ZAN, ZAN Boya, ZANSİLAN, DivoFix, EkoFix, Best Wall,
   Bestwall, LUX, WhatsApp, Instagram, Facebook, TikTok, YouTube, Telegram,
   məhsul kodları (ZS-025, T506, G708 ...), HEX, RGB, LRV. Məhsul adında brend
   qalır, təsviri hissə tərcümə olunur: "ZANSİLAN silikonlu fasad boyası" →
   "ZANSİLAN silicone facade paint".
7. **Valyuta** ₼ olduğu kimi qalır. **Vahidlər**: kq → kg / кг / kg / kg;
   q → g / г / g / g; l → L / л / L / L; m² dəyişmir; rulon → roll / рулон / rulo / 卷.
   Onluq vergülü dilin qaydasına uyğunlaşdırın (en/zh: 3.5 kg; ru/tr: 3,5 kg).
8. **Şəhərlər** (tanınmış yazılış): Bakı → Baku / Баку / Bakü / 巴库;
   Sumqayıt → Sumgait / Сумгаит / Sumgayıt / 苏姆盖特; Gəncə → Ganja / Гянджа / Gence / 占贾;
   Abşeron → Absheron / Апшерон / Abşeron / 阿普歇伦; Lənkəran → Lankaran / Ленкорань / Lenkeran / 连科兰;
   Şəki → Shaki / Шеки / Şeki / 舍基; Qəbələ → Gabala / Габала / Gabala / 盖贝莱;
   Şamaxı → Shamakhi / Шемаха / Şamahı / 沙马基; Mingəçevir → Mingachevir / Мингечевир / Mingeçevir / 明盖恰乌尔;
   Şirvan → Shirvan / Ширван / Şirvan / 希尔万; Quba → Guba / Губа / Kuba / 库巴 (古巴 — Kuba ölkəsidir, işlətməyin).
9. **İnsan adları** (nümunə: Aysel Məmmədova) və ünvan nümunələri dəyişmir
   (latın/kiril yazılışı ilə transliterasiya məqbuldur: ru — Айсель Мамедова).
   Nümunə e-poçt: ad@numune.az → name@example.com / imya@primer.ru ... (uyğun nümunə).
10. **Böyük/kiçik hərf və durğu işarələri** mənbədəki kimi: başlıq böyük hərflə
   başlayırsa tərcümə də; "·", "—", "–", "…", "₼", "×" saxlanılır.
11. Hüquqi / marketinq iddialarının mənası dəyişmir (heç nə əlavə etmə, atma).

## Terminologiya (bütün dillərdə eyni)

| AZ | EN | RU | TR | 中文 |
|---|---|---|---|---|
| Səbət | Cart | Корзина | Sepet | 购物车 |
| Sevimlilər | Wishlist | Избранное | Favoriler | 收藏夹 |
| Şəxsi kabinet | My account | Личный кабинет | Hesabım | 个人中心 |
| Kataloq | Catalog | Каталог | Katalog | 产品目录 |
| Məhsullar | Products | Продукция | Ürünler | 产品 |
| Su əsaslı boyalar | Water-based paints | Водоэмульсионные краски | Su bazlı boyalar | 水性涂料 |
| Sintetik boyalar | Synthetic paints | Синтетические краски | Sentetik boyalar | 合成涂料 |
| Sellülozik boyalar | Cellulose paints | Нитроцеллюлозные краски | Selülozik boyalar | 硝基涂料 |
| Divar kağızları | Wallpapers | Обои | Duvar kağıtları | 墙纸 |
| Yapışdırıcılar | Adhesives | Клеи | Yapıştırıcılar | 胶粘剂 |
| Rəng vizualizatoru | Color visualizer | Визуализатор цвета | Renk görselleştirici | 色彩可视化工具 |
| ZAN Ustalar Klubu | ZAN Masters Club | Клуб мастеров ZAN | ZAN Ustalar Kulübü | ZAN 工匠俱乐部 |
| usta | craftsman / pro | мастер | usta | 工匠 |
| Qaynar xətt | Hotline | Горячая линия | Çağrı hattı | 热线 |
| Sifarişi rəsmiləşdir | Checkout | Оформить заказ | Siparişi tamamla | 去结算 |
| Stokda var / yoxdur | In stock / Out of stock | В наличии / Нет в наличии | Stokta var / Stokta yok | 有货 / 缺货 |
| qat (boya qatı) | coat | слой | kat | 遍 / 层 |
| Tünd rejim / İşıqlı rejim | Dark mode / Light mode | Тёмная тема / Светлая тема | Koyu mod / Açık mod | 深色模式 / 浅色模式 |
