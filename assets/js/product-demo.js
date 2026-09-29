/* ==========================================================================
   product-demo.js — məhsul səhifəsi üçün DEMO məlumat (yalnız frontend demosu)
   --------------------------------------------------------------------------
   TODO (backend): MVC-də bu fayl QOŞULMUR. Səhifə serverdə məhsula görə
   render olunur (Views/Shop/Details.cshtml), product-page.js isə hər şeyi
   HTML-dən oxuyur.

   Demo rejimdə product-detail.html statik olaraq ZANSİLAN (id=1) üçün yazılıb.
   Bu skript URL-dəki ?id=-yə görə həmin HTML-i başqa məhsulun məlumatı ilə
   doldurur — kataloqdakı istənilən kartdan gələndə düzgün məhsul açılsın.
   product-page.js-dən ƏVVƏL qoşulur.

   TODO (texnoloq, marketinq): çəkilər, qiymətlər və texniki göstəricilər
   nümunədir — təsdiqlənməlidir. Kataloqdakı kartın qiyməti/həcmi (shop.html)
   burada default: true olan çəki ilə eyni saxlanılır.
   ========================================================================== */

(function () {
  "use strict";

  //#region ikonlar (əsas göstəricilər zolağı üçün, 24×24)
  const ICONS = {
    roller:
      '<rect x="3" y="4" width="14" height="6" rx="2"/><path d="M17 7h3v5h-8v3"/><rect x="10.5" y="15" width="3" height="6" rx="1"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    home: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
    ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4"/>',
    area: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
    shield: '<path d="M12 3 19 6v5c0 4.4-2.9 8.3-7 10-4.1-1.7-7-5.6-7-10V6z"/><path d="m9 12 2 2 4-4"/>',
    brush:
      '<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L11 15.8 8.2 13z"/><path d="M7 14c-2 0-3.5 1.5-3.5 3.5 0 1.2-.5 2.3-1.5 3 3 .5 7-.5 7-4.5z"/>',
  };
  //#endregion

  //#region kateqoriyalar — ortaq göstəricilər
  const CATEGORIES = {
    "sintetik-boyalar": {
      label: "Sintetik boyalar",
      unit: "kq",
      coverage: 11,
      coats: 2,
      noun: "boya",
      paint: true,
      facts: [
        ["roller", "Sərfiyyat", "≈ 11 m² / kq"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Toxunuşa quruma", "4–6 saat"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: [
        ["Əsas", "Alkid qatranı"],
        ["Səth görünüşü", "Parlaq"],
        ["Sərfiyyat", "80–100 q/m² (bir qat) — ≈ 11 m²/kq"],
        ["Qat sayı", "2 qat"],
        ["Quruma", "Toxunuşa 4–6 saat, tam 24 saat"],
        ["Durulaşdırma", "Uayt-spirit, 5–10%"],
        ["Tətbiq", "Fırça, valik, pulverizator"],
        ["Tətbiq temperaturu", "+5 °C … +30 °C"],
        ["Saxlama", "Quru, sərin yerdə, ağzı bağlı"],
        ["Yararlılıq müddəti", "36 ay"],
      ],
      steps: [
        ["Səthi hazırlayın", "Pas, köhnə boya və yağ ləkələrini təmizləyin, səthi zımparalayıb tozunu alın."],
        ["Astar çəkin", "Metal səthlərə pasa qarşı astar, taxtaya isə dolğu astar çəkin."],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% uayt-spirit əlavə edin."],
        ["Çəkin", "Nazik qatlarla 2 qat çəkin; ikinci qatı 24 saatdan sonra çəkin."],
      ],
      note: "Yaxşı havalandırılan yerdə işləyin, açıq oddan uzaq saxlayın. Alətləri uayt-spirit ilə təmizləyin.",
    },

    "sellulozik-boyalar": {
      label: "Sellülozik boyalar",
      unit: "kq",
      coverage: 9,
      coats: 2,
      noun: "boya",
      paint: true,
      facts: [
        ["roller", "Sərfiyyat", "≈ 9 m² / kq"],
        ["layers", "Qat sayı", "2–3 qat"],
        ["clock", "Toxunuşa quruma", "15–20 dəqiqə"],
        ["home", "İstifadə", "Taxta və mebel"],
      ],
      specs: [
        ["Əsas", "Nitrosellüloza"],
        ["Səth görünüşü", "Parlaq"],
        ["Sərfiyyat", "100–120 q/m² (bir qat) — ≈ 9 m²/kq"],
        ["Qat sayı", "2–3 qat"],
        ["Quruma", "Toxunuşa 15–20 dəqiqə, tam 2 saat"],
        ["Durulaşdırma", "Sellülozik tiner, 10–20%"],
        ["Tətbiq", "Pulverizator (tövsiyə olunur), fırça"],
        ["Tətbiq temperaturu", "+10 °C … +30 °C"],
        ["Yararlılıq müddəti", "24 ay"],
      ],
      steps: [
        ["Səthi hazırlayın", "Taxtanı 180–240 dənəli zımpara ilə hamarlayın, tozunu tam təmizləyin."],
        ["Dolğu çəkin", "Məsamələri doldurmaq üçün sellülozik dolğu vernik çəkin və zımparalayın."],
        ["Durulaşdırın", "Pulverizator üçün 10–20% sellülozik tiner əlavə edib qarışdırın."],
        ["Çəkin", "Nazik qatlarla 2–3 qat çəkin; qatlar arası 20–30 dəqiqə gözləyin."],
      ],
      note: "Tərkibində həlledici var: yalnız yaxşı havalandırılan yerdə, qoruyucu maska ilə işləyin.",
    },

    "su-esasli-boyalar": {
      label: "Su əsaslı boyalar",
      unit: "kq",
      coverage: 7,
      coats: 2,
      noun: "boya",
      paint: true,
      facts: [
        ["roller", "Sərfiyyat", "≈ 7 m² / kq"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Qatlar arası", "2–4 saat"],
        ["home", "İstifadə", "Daxili işlər"],
      ],
      specs: [
        ["Əsas", "Akril dispersiya"],
        ["Səth görünüşü", "Mat"],
        ["Rəng", "Ağ, kataloq üzrə rənglənir"],
        ["Sərfiyyat", "130–150 q/m² (bir qat) — ≈ 7 m²/kq"],
        ["Qat sayı", "2 qat"],
        ["Quruma", "Toxunuşa 1 saat, qatlar arası 2–4 saat, tam 24 saat"],
        ["Durulaşdırma", "Su ilə, 5–10%"],
        ["Tətbiq temperaturu", "+5 °C … +35 °C"],
        ["Saxlama", "+5 °C … +30 °C, şaxtadan qoruyun"],
        ["Yararlılıq müddəti", "24 ay"],
      ],
      steps: [
        ["Səthi hazırlayın", "Tozdan, yağdan və qopan köhnə boyadan təmizləyin, çatları şpatlyovka ilə doldurun."],
        ["Astar çəkin", "Məsaməli səthlərə su əsaslı astar çəkin və 2–4 saat gözləyin."],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% su əlavə edin."],
        ["Çəkin", "Valik və ya fırça ilə 2 qat çəkin; qatlar arası 2–4 saat gözləyin."],
      ],
      note: "+5 °C-dən aşağı temperaturda işləməyin, boyanı şaxtadan qoruyun. Alətləri işdən sonra su ilə yuyun.",
    },

    "divar-kagizlari": {
      label: "Divar kağızları",
      unit: "rulon",
      coverage: 5.3,
      coats: 1,
      coatsFixed: true,
      noun: "divar kağızı",
      paint: false,
      facts: [
        ["ruler", "Rulon ölçüsü", "10,05 × 0,53 m"],
        ["area", "Bir rulon", "≈ 5,3 m²"],
        ["layers", "Əsas", "Flizelin"],
        ["drop", "Baxım", "Yuyula bilir"],
      ],
      specs: [
        ["Rulon ölçüsü", "10,05 × 0,53 m"],
        ["Bir rulonun sahəsi", "≈ 5,3 m²"],
        ["Əsas", "Flizelin"],
        ["Üz qatı", "Vinil"],
        ["Naxış uyğunlaşdırma", "64 sm, düz"],
        ["Yapışdırma", "Yapışdırıcı divara çəkilir"],
        ["Baxım", "Nəm parça ilə silinə bilər"],
        ["İşığa davamlılıq", "Yüksək"],
      ],
      steps: [
        ["Divarı hazırlayın", "Divar quru, hamar və təmiz olmalıdır; köhnə kağızı və qopan boyanı təmizləyin."],
        ["Astar çəkin", "Məsaməli divara yapışdırıcının duru məhlulu ilə astar çəkin və qurumasını gözləyin."],
        ["Kəsin", "Zolaqları hündürlükdən 5–10 sm uzun kəsin, naxışı uyğunlaşdırın."],
        ["Yapışdırın", "Yapışdırıcını divara çəkin, zolağı qoyub mərkəzdən kənarlara hamarlayın."],
      ],
      note: "İş zamanı və 48 saat sonra otaqda cərəyan yaratmayın — kağız bərabər qurusun.",
    },

    yapisdiricilar: {
      label: "Yapışdırıcılar",
      unit: "kq",
      coverage: 110,
      coats: 1,
      coatsFixed: true,
      noun: "yapışdırıcı",
      paint: false,
      facts: [
        ["roller", "Sərfiyyat", "250 q ≈ 25–30 m²"],
        ["drop", "Həll etmə", "5–7 l su / 250 q"],
        ["clock", "Hazır olur", "10–15 dəqiqəyə"],
        ["shield", "Uyğundur", "Kağız, vinil, flizelin"],
      ],
      specs: [
        ["Əsas", "Modifikasiya olunmuş nişasta, metilsellüloza"],
        ["Sərfiyyat", "250 q ≈ 25–30 m²"],
        ["Həll etmə", "250 q — 5–7 litr soyuq su"],
        ["Hazır olma", "10–15 dəqiqə"],
        ["Hazır məhlulun ömrü", "10 gün (ağzı bağlı qabda)"],
        ["Uyğun kağızlar", "Kağız, vinil, flizelin, tekstil"],
        ["Antiseptik", "Kif və göbələyə qarşı qoruyucu əlavə ilə"],
        ["Yararlılıq müddəti", "36 ay"],
      ],
      steps: [
        ["Suyu hazırlayın", "Qaba soyuq su tökün və qarışdırarkən huni əmələ gətirin."],
        ["Tozu əlavə edin", "Tozu yavaş-yavaş, fasiləsiz qarışdıraraq tökün — topalanmasın."],
        ["Gözləyin", "10–15 dəqiqə saxlayın və yenidən qarışdırın."],
        ["Tətbiq edin", "Yapışdırıcını fırça və ya valiklə divara və ya kağıza bərabər çəkin."],
      ],
      note: "Hazır məhlulu uşaqların əli çatmayan yerdə saxlayın. Alətləri ilıq su ilə yuyun.",
    },
  };
  //#endregion

  //#region məhsullar
  // variants: [ölçü, miqdar (vahidlə), qiymət, köhnə qiymət | null, stok, default]
  // facts, specs, steps, note, coverage, coats, noun, paint — kateqoriyanınkını əvəz edir
  const PRODUCTS = {
    1: {
      name: "ZANSİLAN silikonlu fasad boyası",
      category: "su-esasli-boyalar",
      image: "./assets/images/silan.png",
      code: "ZS",
      isNew: true,
      coverage: 6,
      lead: "Silikon əsaslı, suyu itələyən və nəfəs alan fasad boyası — yağışa və çirklənməyə davamlı.",
      about: [
        "ZANSİLAN silikon qatranı əsasında hazırlanmış fasad boyasıdır. Səthdə nəfəs alan qoruyucu təbəqə yaradır: yağış suyu divara hopmur, divarın içindəki nəm isə rahatlıqla çölə çıxır. Bu, suvağın çatlamasının, kif və göbələyin qarşısını alır.",
        "Mat, məxmər görünüşlü səth yaradır, çirki özünə çəkmir və yağışla özü-özünü təmizləyir. Kataloq üzrə istənilən çalara rənglənə bilər.",
      ],
      features: [
        "Suyu itələyir, buxarı keçirir",
        "UV şüalarına və solmağa davamlıdır",
        "Kif və göbələyə qarşı qoruyur",
        "İysizdir, su ilə durulaşdırılır",
      ],
      areas: ["Fasadlar", "Beton", "Sement suvaq", "Kərpic", "Qazbeton"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 6 m² / kq"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Qatlar arası", "4–6 saat"],
        ["home", "İstifadə", "Xarici işlər"],
      ],
      specs: {
        "Əsas": "Silikon qatranı, akril dispersiya",
        "Sərfiyyat": "150–180 q/m² (bir qat) — ≈ 6 m²/kq",
        "Quruma": "Toxunuşa 1 saat, qatlar arası 4–6 saat, tam 24 saat",
      },
      steps: [
        ["Səthi hazırlayın", "Tozdan, yağdan və qopan köhnə boyadan təmizləyin, çatları doldurun. Yeni suvaq ən azı 28 gün qurumalıdır."],
        ["Astar çəkin", "Məsaməli səthlərə dərin nüfuz edən su əsaslı astar çəkin və 4 saat gözləyin."],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% su əlavə edin."],
        ["Çəkin", "Valik, fırça və ya pulverizatorla 2 qat çəkin; qatlar arası 4–6 saat gözləyin."],
      ],
      note: "Yağışlı havada, birbaşa günəş altında və +5 °C-dən aşağı temperaturda işləməyin. Alətləri işdən sonra su ilə yuyun.",
      variants: [
        ["3,5 kq", 3.5, 15.9],
        ["10 kq", 10, 39.9],
        ["25 kq", 25, 89.9, null, "in", true],
      ],
    },

    2: {
      name: "LUX parlaq boya",
      category: "sintetik-boyalar",
      image: "./assets/images/lux parlaq.png",
      code: "LX",
      lead: "Metal və taxta səthlər üçün yüksək parlaqlıqlı, uzunömürlü sintetik boya.",
      about: [
        "LUX — yüksək parlaqlıqlı alkid əsaslı sintetik boyadır. Metal, taxta və əvvəllər boyanmış səthlərdə güzgü kimi hamar, davamlı təbəqə yaradır.",
        "Nəmə, temperatur dəyişmələrinə və məişət yuyucularına davamlıdır — qapı, pəncərə, radiator, hasar və darvazalar üçün idealdır.",
      ],
      features: [
        "Güzgü kimi parlaq səth",
        "Nəmə və korroziyaya davamlıdır",
        "Yuyula bilir, rəngi uzun müddət solmur",
        "Asan çəkilir, axmır",
      ],
      areas: ["Metal", "Taxta", "Qapı və pəncərələr", "Radiatorlar", "Hasarlar"],
      variants: [
        ["0,75 kq", 0.75, 8.9],
        ["3,5 kq", 3.5, 34.5, 39.9, "in", true],
        ["10 kq", 10, 94.9],
      ],
    },

    3: {
      name: "Sintetik parlaq boya",
      category: "sintetik-boyalar",
      image: "./assets/images/sin parlaq boya.png",
      code: "SP",
      lead: "Daxili və xarici işlər üçün asan çəkilən, parlaq və davamlı sintetik emal.",
      about: [
        "Daxili və xarici işlər üçün universal sintetik emal. Metal, taxta və suvaqlı səthlərdə parlaq, möhkəm və yuyula bilən örtük yaradır.",
        "Atmosfer təsirlərinə davamlıdır, çəkilişi asandır və geniş rəng palitrasında təqdim olunur.",
      ],
      features: ["Parlaq, hamar səth", "Daxili və xarici işlər üçün", "Yuyula bilir", "Yüksək örtücülük"],
      areas: ["Metal", "Taxta", "Suvaq", "Qapılar", "Mebel"],
      variants: [
        ["0,75 kq", 0.75, 7.5],
        ["2,5 kq", 2.5, 27.9, null, "in", true],
        ["10 kq", 10, 99.9],
      ],
    },

    4: {
      name: "Sintetik parlaq parket lakı",
      category: "sintetik-boyalar",
      image: "./assets/images/sintetik parlaq lak.png",
      code: "PL",
      noun: "lak",
      paint: false,
      coverage: 12,
      lead: "Parket və taxta döşəmələr üçün aşınmaya davamlı, şəffaf parlaq lak.",
      about: [
        "Parket və taxta döşəmələr üçün şəffaf, parlaq sintetik lak. Taxtanın təbii naxışını üzə çıxarır və onu aşınmadan, nəmdən, ləkələrdən qoruyur.",
        "Sərt və elastik təbəqə yaradır — gündəlik gediş-gəlişə və mebelin sürüşdürülməsinə davamlıdır.",
      ],
      features: [
        "Aşınmaya yüksək davamlılıq",
        "Taxtanın naxışını qabardır",
        "Nəmə və ləkələrə qarşı qoruyur",
        "Zamanla saralmır",
      ],
      areas: ["Parket", "Taxta döşəmə", "Pilləkənlər", "Taxta mebel"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 12 m² / kq"],
        ["layers", "Qat sayı", "2–3 qat"],
        ["clock", "Toxunuşa quruma", "6–8 saat"],
        ["home", "İstifadə", "Parket, taxta döşəmə"],
      ],
      specs: {
        "Əsas": "Alkid-uretan qatranı",
        "Səth görünüşü": "Parlaq, şəffaf",
        "Sərfiyyat": "80–100 q/m² (bir qat) — ≈ 12 m²/kq",
        "Qat sayı": "2–3 qat",
        "Quruma": "Toxunuşa 6–8 saat, gəzmək üçün 24 saat, tam 7 gün",
      },
      variants: [
        ["0,75 kq", 0.75, 14.9, null, "in", true],
        ["2,5 kq", 2.5, 44.9],
      ],
    },

    5: {
      name: "Sellülozik dolğu vernik",
      category: "sellulozik-boyalar",
      image: "./assets/images/zan dolgu vernik.png",
      code: "DV",
      noun: "vernik",
      paint: false,
      coverage: 10,
      coats: 1,
      lead: "Taxtanın məsamələrini dolduran, tez quruyan və asan zımparalanan astar vernik.",
      about: [
        "Sellülozik boyalar və laklardan əvvəl çəkilən dolğu (astar) vernik. Taxtanın məsamələrini doldurur, səthi hamarlayır və son qatın sərfiyyatını azaldır.",
        "Çox tez quruyur və asan zımparalanır — mebel istehsalında iş prosesini sürətləndirir.",
      ],
      features: [
        "Məsamələri doldurur",
        "15–20 dəqiqəyə quruyur",
        "Asan zımparalanır",
        "Son qatın sərfiyyatını azaldır",
      ],
      areas: ["Mebel", "MDF", "Taxta panellər", "Qapılar"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 10 m² / kq"],
        ["layers", "Qat sayı", "1–2 qat"],
        ["clock", "Zımparaya hazır", "30–40 dəqiqə"],
        ["home", "İstifadə", "Taxta və mebel"],
      ],
      specs: {
        "Səth görünüşü": "Yarımmat, şəffaf",
        "Sərfiyyat": "90–110 q/m² — ≈ 10 m²/kq",
        "Qat sayı": "1–2 qat",
      },
      variants: [
        ["0,75 kq", 0.75, 8.9, null, "out"],
        ["2,5 kq", 2.5, 24.9, null, "out", true],
      ],
    },

    6: {
      name: "Sintetik mat boya",
      category: "sintetik-boyalar",
      image: "./assets/images/slider-1.png",
      code: "SM",
      isNew: true,
      lead: "Göz yormayan mat səth yaradan, yüksək örtücülüklü sintetik boya.",
      about: [
        "Göz yormayan, işığı əks etdirməyən mat səth yaradan alkid əsaslı boya. Səthdəki kiçik qüsurları gizlədir.",
        "Yüksək örtücülüyü sayəsində çox vaxt iki qat kifayət edir; metal və taxta üçün uyğundur.",
      ],
      features: [
        "Əks etdirməyən mat səth",
        "Kiçik qüsurları gizlədir",
        "Yüksək örtücülük",
        "Atmosfer təsirlərinə davamlıdır",
      ],
      areas: ["Metal", "Taxta", "Qapılar", "Hasarlar", "Radiatorlar"],
      specs: { "Səth görünüşü": "Mat" },
      variants: [
        ["0,75 kq", 0.75, 7.9],
        ["2,5 kq", 2.5, 26.5, null, "in", true],
        ["10 kq", 10, 94.9],
      ],
    },

    7: {
      name: "Sellülozik parlaq boya",
      category: "sellulozik-boyalar",
      image: "./assets/images/slider-2.png",
      code: "SLP",
      lead: "Mebel və taxta işləri üçün tez quruyan, hamar və parlaq sellülozik boya.",
      about: [
        "Mebel və taxta işləri üçün tez quruyan sellülozik boya. Hamar, parlaq və möhkəm səth yaradır.",
        "Pulverizatorla çəkildikdə zavod keyfiyyətində örtük alınır; növbəti qatı 20–30 dəqiqədən sonra çəkmək olar.",
      ],
      features: ["15–20 dəqiqəyə quruyur", "Hamar, parlaq səth", "Cızılmaya davamlıdır", "Pulverizator üçün ideal"],
      areas: ["Mebel", "MDF", "Taxta", "Qapılar"],
      variants: [
        ["0,75 kq", 0.75, 9.9],
        ["2,5 kq", 2.5, 29.9, 34.9, "in", true],
      ],
    },

    8: {
      name: "DivoFix parlaq boya",
      category: "sellulozik-boyalar",
      image: "./assets/images/slider-img-2.png",
      code: "DF",
      lead: "Divarlara parlaqlıq qaytaran, sürətli quruyan və UV şüalarına davamlı boya.",
      about: [
        "DivoFix — səthlərə parlaqlıq qaytaran, sürətli quruyan sellülozik boya. UV şüalarına davamlı tərkibi sayəsində rəngi uzun müddət solmur.",
        "Həm yeni, həm də əvvəllər boyanmış səthlərin təzələnməsi üçün uyğundur.",
      ],
      features: ["UV şüalarına davamlıdır", "Tez quruyur", "Parlaqlığı uzun müddət qoruyur", "Təmir işləri üçün uyğundur"],
      areas: ["Divarlar", "Mebel", "Taxta", "Metal"],
      variants: [
        ["0,75 kq", 0.75, 10.5],
        ["2,5 kq", 2.5, 31.5, null, "in", true],
      ],
    },

    9: {
      name: "ZANPLASTİK akril boya",
      category: "su-esasli-boyalar",
      image: "./assets/images/slider-img-1.png",
      code: "ZP",
      lead: "Daxili divarlar üçün su əsaslı, iysiz və silinə bilən akril boya.",
      about: [
        "Daxili divar və tavanlar üçün su əsaslı akril boya. İysizdir, tez quruyur və təmir edilən otaqdan dərhal istifadə etməyə imkan verir.",
        "Qurumuş səth nəm parça ilə silinə bilər — mətbəx, dəhliz və uşaq otaqları üçün praktik seçimdir.",
      ],
      features: ["İysiz, ekoloji təmiz", "Nəm parça ilə silinə bilir", "Yüksək örtücülük", "Nəfəs alan səth"],
      areas: ["Divarlar", "Tavanlar", "Gips-karton", "Suvaq", "Beton"],
      variants: [
        ["3,5 kq", 3.5, 13.9],
        ["10 kq", 10, 34.9],
        ["20 kq", 20, 64.9, null, "in", true],
      ],
    },

    10: {
      name: "ZANTAVAN tavan boyası",
      category: "su-esasli-boyalar",
      image: "./assets/images/slider-5.png",
      code: "ZT",
      lead: "Tavanlar üçün ağ, yüksək örtücülüklü və sıçramayan su əsaslı boya.",
      about: [
        "Tavanlar üçün xüsusi hazırlanmış, qar kimi ağ su əsaslı boya. Qatılaşdırılmış tərkibi sayəsində sıçramır və damcılamır.",
        "Yüksək örtücülüyü ilə kiçik qüsurları gizlədir, işığı bərabər yayan mat səth yaradır.",
      ],
      features: ["Sıçramır, damcılamır", "Qar kimi ağ", "Mat, işığı bərabər yayır", "İysizdir"],
      areas: ["Tavanlar", "Gips-karton", "Suvaq", "Beton"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 7 m² / kq"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Qatlar arası", "2–4 saat"],
        ["home", "İstifadə", "Tavanlar"],
      ],
      specs: { "Rəng": "Qar kimi ağ" },
      variants: [
        ["10 kq", 10, 23.9, null, "out"],
        ["25 kq", 25, 54.9, 59.9, "in", true],
      ],
    },

    11: {
      name: "Premium divar kağızı",
      category: "divar-kagizlari",
      image: "./assets/images/slider-4.png",
      code: "PW",
      isNew: true,
      lead: "Zəngin naxışlı, yuyula bilən premium divar kağızı kolleksiyası.",
      about: [
        "Zəngin naxışlı premium divar kağızı kolleksiyası. Flizelin əsası sayəsində asan yapışdırılır, divarda qabarmır və büzülmür.",
        "Vinil üz qatı səthi nəmdən və çirkdən qoruyur — nəm parça ilə silinə bilər.",
      ],
      features: [
        "Flizelin əsas — asan yapışdırılır",
        "Yuyula bilir",
        "İşıqda solmur",
        "Kiçik divar qüsurlarını gizlədir",
      ],
      areas: ["Qonaq otağı", "Yataq otağı", "Dəhliz", "Ofis"],
      variants: [
        ["1 rulon", 1, 45, null, "in", true],
        ["3 rulon", 3, 129],
        ["6 rulon", 6, 249],
      ],
    },

    12: {
      name: "Universal divar kağızı yapışdırıcısı",
      category: "yapisdiricilar",
      image: "./assets/images/slider-3.png",
      code: "UY",
      lead: "Kağız, vinil və flizelin divar kağızları üçün asan həll olunan yapışdırıcı.",
      about: [
        "Kağız, vinil və flizelin divar kağızları üçün universal yapışdırıcı. Suda asanlıqla, topalanmadan həll olur.",
        "Tərkibindəki antiseptik əlavə divarı kif və göbələkdən qoruyur; kağızı yapışdırdıqdan sonra da yerini düzəltmək mümkündür.",
      ],
      features: ["Topalanmadan həll olur", "Kif və göbələyə qarşı qoruyur", "Ləkə buraxmır", "Bütün kağız növləri üçün"],
      areas: ["Kağız", "Vinil", "Flizelin", "Tekstil"],
      variants: [
        ["250 q", 0.25, 7.9, 9.5, "in", true],
        ["500 q", 0.5, 13.9],
        ["1 kq", 1, 24.9],
      ],
    },
  };
  //#endregion

  //#region göstərmə
  const id = new URLSearchParams(location.search).get("id");
  const data = PRODUCTS[id];
  const root = document.getElementById("pd-main");
  if (!data || !root) return;

  const cat = CATEGORIES[data.category];
  const main = document.getElementById("main");
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const fields = (name) => $$(`[data-pd="${name}"]`);
  const esc = (text) => String(text).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const price = (value) => `${value.toFixed(2).replace(".", ",")} ₼`;
  const slug = (size) => size.toLowerCase().replace(",", "-").replace(/\s+/g, "-");
  const svg = (name) => `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.layers}</svg>`;

  const variants = data.variants.map(([size, amount, value, oldPrice, stock, isDefault]) => ({
    size,
    amount,
    price: value,
    oldPrice: oldPrice || null,
    stock: stock || "in",
    isDefault: Boolean(isDefault),
    value: slug(size),
    // kataloqdakı kartın data-id-si default çəkinin sku-sudur
    sku: isDefault ? String(id) : `${id}-${slug(size)}`,
    // artikul: ZS-025 (25 kq), UY-050 (500 q)
    code: `${data.code}-${String(amount >= 1 ? Math.floor(amount) : Math.round(amount * 100)).padStart(3, "0")}`,
  }));
  const defaultVariant = variants.find((v) => v.isDefault) || variants[0];

  // kateqoriya, ölçü vahidi, kalkulyator
  main.dataset.category = data.category;
  root.dataset.id = String(id);
  root.dataset.unit = cat.unit;
  root.dataset.coverage = String(data.coverage || cat.coverage);
  root.dataset.coats = String(data.coats || cat.coats);
  root.toggleAttribute("data-coats-fixed", Boolean(cat.coatsFixed));
  document.title = `${data.name} — ZAN Boya`;

  // mətnlər
  fields("name").forEach((el) => (el.textContent = data.name));
  fields("category").forEach((el) => (el.textContent = cat.label));
  fields("category-link").forEach((el) => (el.href = `shop.html?category=${data.category}`));
  fields("lead").forEach((el) => (el.textContent = data.lead));
  fields("calc-noun").forEach((el) => (el.textContent = data.noun || cat.noun));
  fields("variant-title").forEach((el) => (el.textContent = cat.unit === "kq" ? "Çəki" : "Qablaşdırma"));
  fields("image").forEach(function (img) {
    img.src = data.image;
    if (img.alt) img.alt = data.name;
  });

  // "Rəngi sınayın" yalnız boyalar üçün
  const isPaint = data.paint === undefined ? cat.paint : data.paint;
  fields("visualizer").forEach((el) => (el.hidden = !isPaint));

  // nişanlar: kataloqdakı kart kimi (endirim — default çəkiyə görə)
  const badges = [];
  if (variants.every((v) => v.stock === "out")) badges.push('<span class="pc-badge is-out">Stokda yoxdur</span>');
  else if (defaultVariant.oldPrice) {
    const percent = Math.round((1 - defaultVariant.price / defaultVariant.oldPrice) * 100);
    badges.push(`<span class="pc-badge is-sale">−${percent}%</span>`);
  }
  if (data.isNew) badges.push('<span class="pc-badge is-new">Yeni</span>');
  fields("badges").forEach((el) => (el.innerHTML = badges.join("")));

  // çəkilər
  $('[data-pd="variants"]').innerHTML = variants
    .map(
      (v) => `
      <label class="pd-variant">
        <input type="radio" name="variant" value="${esc(v.value)}" data-sku="${esc(v.sku)}" data-code="${esc(v.code)}"
          data-price="${v.price}"${v.oldPrice ? ` data-old-price="${v.oldPrice}"` : ""} data-amount="${v.amount}"
          data-stock="${v.stock}"${v === defaultVariant ? " checked" : ""} />
        <span class="pd-variant-size">${esc(v.size)}</span>
        <span class="pd-variant-price">${price(v.price)}</span>
        <small class="pd-variant-unit"></small>
      </label>`,
    )
    .join("");

  // əsas göstəricilər
  $('[data-pd="facts"]').innerHTML = (data.facts || cat.facts)
    .map(
      ([icon, label, value]) => `
      <li>
        <span class="pd-fact-icon" aria-hidden="true">${svg(icon)}</span>
        <small>${esc(label)}</small>
        <b>${esc(value)}</b>
      </li>`,
    )
    .join("");

  // təsvir
  $('[data-pd="about"]').innerHTML = data.about.map((p) => `<p>${esc(p)}</p>`).join("");
  $('[data-pd="features"]').innerHTML = data.features.map((f) => `<li>${esc(f)}</li>`).join("");
  $('[data-pd="areas"]').innerHTML = data.areas.map((a) => `<li>${esc(a)}</li>`).join("");

  // texniki göstəricilər: kateqoriya + məhsulun öz dəyərləri, sonda qablaşdırma
  const specs = cat.specs.map(([label, value]) => [label, (data.specs && data.specs[label]) || value]);
  Object.entries(data.specs || {}).forEach(([label, value]) => {
    if (!specs.some(([l]) => l === label)) specs.splice(1, 0, [label, value]);
  });
  specs.push(["Qablaşdırma", variants.map((v) => v.size).join(" · ")]);
  $('[data-pd="specs"]').innerHTML = specs
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("");

  // istifadə qaydası
  $('[data-pd="steps"]').innerHTML = (data.steps || cat.steps)
    .map(([title, text]) => `<li><b>${esc(title)}</b>${esc(text)}</li>`)
    .join("");
  const note = $('[data-pd="note"] span');
  if (note) note.textContent = data.note || cat.note;

  // tövsiyə olunanlar: əvvəlcə birlikdə lazım olanlar (divar kağızı ↔ yapışdırıcı),
  // sonra eyni kateqoriya (cari məhsulu product-page.js çıxarır)
  const COMPLEMENTS = {
    "divar-kagizlari": "yapisdiricilar",
    yapisdiricilar: "divar-kagizlari",
  };
  const score = (category) => (category === COMPLEMENTS[data.category] ? 2 : category === data.category ? 1 : 0);
  const wrapper = $("#pd-related .swiper-wrapper");
  if (wrapper) {
    $$(".swiper-slide", wrapper)
      .map((slide, index) => ({ slide, index, score: score($(".product-card", slide).dataset.category) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .forEach(({ slide }) => wrapper.appendChild(slide));
  }
  //#endregion
})();
