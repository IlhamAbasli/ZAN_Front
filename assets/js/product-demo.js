/* ==========================================================================
   product-demo.js — məhsul səhifəsi üçün DEMO məlumat (yalnız frontend demosu)
   --------------------------------------------------------------------------
   TODO (backend): MVC-də bu fayl QOŞULMUR. Səhifə serverdə məhsula görə
   render olunur (Views/Shop/Details.cshtml), product-page.js isə hər şeyi
   HTML-dən oxuyur.

   Demo rejimdə product-detail.html statik olaraq ZANSİLAN (id=5) üçün yazılıb.
   Bu skript URL-dəki ?id=-yə görə həmin HTML-i başqa məhsulun məlumatı ilə
   doldurur — kataloqdakı istənilən kartdan gələndə düzgün məhsul açılsın.
   product-page.js-dən ƏVVƏL qoşulur.

   Çəkilər və qiymətlər ZAN / DivoFix / EkoFix kataloqundandır (qiymət +10%).
   TODO (texnoloq): təsvirlər və texniki göstəricilər nümunədir — təsdiqlənməlidir.
   Kataloqdakı kartın qiyməti/həcmi (shop.html) burada DEFAULT_VARIANT-ın
   seçdiyi çəki ilə eyni saxlanılır.
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

    // PVA və bağlayıcılar — kalkulyator yoxdur (coverage: 0)
    yapisdiricilar: {
      label: "Yapışdırıcılar",
      unit: "kq",
      coverage: 0,
      coats: 1,
      coatsFixed: true,
      noun: "yapışdırıcı",
      paint: false,
      facts: [
        ["drop", "Əsas", "PVA dispersiya"],
        ["clock", "Bərkimə", "1–2 saat"],
        ["layers", "Durulaşdırma", "Su ilə"],
        ["shield", "Uyğundur", "Taxta, kağız, beton"],
      ],
      specs: [
        ["Əsas", "Polivinilasetat (PVA) dispersiyası"],
        ["Görünüş", "Ağ, quruyanda şəffaf"],
        ["Bərkimə", "1–2 saat, tam 24 saat"],
        ["Durulaşdırma", "Su ilə"],
        ["Tətbiq", "Fırça, valik, şpatel"],
        ["Tətbiq temperaturu", "+5 °C … +30 °C"],
        ["Saxlama", "+5 °C … +30 °C, şaxtadan qoruyun"],
        ["Yararlılıq müddəti", "12 ay"],
      ],
      steps: [
        ["Səthi hazırlayın", "Yapışdırılan səthlər təmiz, quru və yağsız olmalıdır."],
        ["Qarışdırın", "Yapışdırıcını istifadədən əvvəl yaxşıca qarışdırın."],
        ["Çəkin", "Fırça və ya valiklə səthlərdən birinə nazik, bərabər qat çəkin."],
        ["Sıxın", "Hissələri birləşdirib 10–15 dəqiqə sıxılı saxlayın; tam bərkimə 24 saat."],
      ],
      note: "Şaxtadan qoruyun — donmuş yapışdırıcı xassəsini itirir. Alətləri işdən dərhal sonra su ilə yuyun.",
    },
  };
  //#endregion

  //#region məhsullar
  // Hər tip — eyni xəttin bütün brendlərdə ortaq təsviri (fasad, antipas, tiner ...).
  // Məhsulun öz sahələri tipinkini, tipinkilər kateqoriyanınkını əvəz edir.
  //   specs: obyekt — kateqoriyanın siyahısına əlavə/dəyişiklik (null — sətri çıxarır),
  //          massiv — siyahını tam əvəz edir (məs. tinerlər)
  //   coverage: 0 — kalkulyator göstərilmir
  const TYPES = {
    fasad: {
      category: "su-esasli-boyalar",
      coverage: 6,
      lead: "Xarici divarlar üçün akril əsaslı, yağışa, günəşə və şaxtaya davamlı fasad boyası.",
      about: [
        "Akril dispersiya əsasında hazırlanmış fasad boyası. Səthdə elastik, nəfəs alan təbəqə yaradır: yağış suyunu keçirmir, divarın içindəki nəmi isə çölə buraxır.",
        "UV şüalarına davamlı tərkibi sayəsində rəngi uzun müddət solmur. Kataloq üzrə istənilən çalara rənglənə bilər.",
      ],
      features: [
        "Yağışa və şaxtaya davamlıdır",
        "UV şüalarında solmur",
        "Nəfəs alan səth yaradır",
        "Su ilə durulaşdırılır",
      ],
      areas: ["Fasadlar", "Sement suvaq", "Beton", "Kərpic", "Qazbeton"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 6 m² / kq"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Qatlar arası", "4–6 saat"],
        ["home", "İstifadə", "Xarici işlər"],
      ],
      specs: {
        "Sərfiyyat": "150–180 q/m² (bir qat) — ≈ 6 m²/kq",
        Quruma: "Toxunuşa 1 saat, qatlar arası 4–6 saat, tam 24 saat",
      },
      steps: [
        [
          "Səthi hazırlayın",
          "Tozdan, yağdan və qopan köhnə boyadan təmizləyin, çatları doldurun. Yeni suvaq ən azı 28 gün qurumalıdır.",
        ],
        ["Astar çəkin", "Məsaməli səthlərə dərin nüfuz edən su əsaslı astar çəkin və 4 saat gözləyin."],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% su əlavə edin."],
        ["Çəkin", "Valik, fırça və ya pulverizatorla 2 qat çəkin; qatlar arası 4–6 saat gözləyin."],
      ],
      note: "Yağışlı havada, birbaşa günəş altında və +5 °C-dən aşağı temperaturda işləməyin. Alətləri işdən sonra su ilə yuyun.",
    },
    plastik: {
      category: "su-esasli-boyalar",
      lead: "Daxili divarlar üçün su əsaslı, iysiz və silinə bilən akril boya.",
      about: [
        "Daxili divar və tavanlar üçün su əsaslı akril boya. İysizdir, tez quruyur və təmir edilən otaqdan dərhal istifadə etməyə imkan verir.",
        "Qurumuş səth nəm parça ilə silinə bilər — mətbəx, dəhliz və uşaq otaqları üçün praktik seçimdir.",
      ],
      features: ["İysiz, ekoloji təmiz", "Nəm parça ilə silinə bilir", "Yüksək örtücülük", "Nəfəs alan səth"],
      areas: ["Divarlar", "Tavanlar", "Gips-karton", "Suvaq", "Beton"],
    },
    plus: {
      category: "su-esasli-boyalar",
      lead: "Ləkələrə davamlı, yuyula bilən ipək-mat daxili divar boyası.",
      about: [
        "ZANPLUS yüksək keyfiyyətli akril dispersiya əsasında hazırlanmış daxili divar boyasıdır. Qurumuş səth sıx və hamar olur — ləkələr dərinə hopmur, nəm parça və yumşaq yuyucu ilə asanlıqla silinir.",
        "Gündəlik istifadəyə ən çox məruz qalan yerlər — mətbəx, dəhliz, uşaq otaqları və ictimai binalar üçün tövsiyə olunur.",
      ],
      features: [
        "Yuyula bilir, ləkə tutmur",
        "Sürtünməyə davamlıdır",
        "Yüksək örtücülük",
        "İysizdir, su ilə durulaşdırılır",
      ],
      areas: ["Mətbəx", "Dəhliz", "Uşaq otağı", "Ofislər", "Gips-karton"],
      specs: {
        "Səth görünüşü": "İpək-mat",
      },
    },
    kontakt: {
      category: "su-esasli-boyalar",
      noun: "astar",
      paint: false,
      coverage: 3,
      coats: 1,
      coatsFixed: true,
      lead: "Hamar beton səthlərdə suvağın və şpatlyovkanın yapışmasını təmin edən kvars qumlu astar.",
      about: [
        "ZANKONTAKT tərkibində kvars qumu olan bağlayıcı astardır. Hamar və az məsaməli səthlərdə kələ-kötür, möhkəm təbəqə yaradır və növbəti qatın — suvaq, şpatlyovka və ya kafel yapışqanının — səthə möhkəm yapışmasını təmin edir.",
        "Monolit beton, beton tavan plitələri və gips-karton kimi çətin səthlər üçün idealdır.",
      ],
      features: [
        "Suvağın yapışmasını artırır",
        "Kvars qumlu, kələ-kötür səth",
        "Daxili və xarici işlər üçün",
        "Tez quruyur, iysizdir",
      ],
      areas: ["Monolit beton", "Beton tavanlar", "Gips-karton", "Hamar səthlər"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 3 m² / kq"],
        ["layers", "Qat sayı", "1 qat"],
        ["clock", "Quruma", "3–4 saat"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Əsas": "Akril dispersiya, kvars qumu",
        "Səth görünüşü": "Kələ-kötür",
        "Rəng": null,
        "Sərfiyyat": "250–350 q/m² — ≈ 3 m²/kq",
        "Qat sayı": "1 qat",
        Quruma: "3–4 saat; növbəti qat 12 saatdan sonra",
        "Durulaşdırma": "Durulaşdırılmır",
      },
      steps: [
        ["Səthi hazırlayın", "Tozdan, yağdan və qopan hissələrdən təmizləyin; səth quru olmalıdır."],
        ["Qarışdırın", "Astarı qabda yaxşıca qarışdırın ki, kvars qumu bərabər paylansın."],
        ["Çəkin", "Fırça və ya valiklə bir qat, bərabər çəkin."],
        ["Gözləyin", "Suvaq və ya şpatlyovkanı astar tam quruduqdan, 12 saatdan sonra çəkin."],
      ],
      note: "+5 °C-dən aşağı temperaturda işləməyin, şaxtadan qoruyun. Alətləri işdən sonra su ilə yuyun.",
    },
    silan: {
      category: "su-esasli-boyalar",
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
        Quruma: "Toxunuşa 1 saat, qatlar arası 4–6 saat, tam 24 saat",
      },
      steps: [
        [
          "Səthi hazırlayın",
          "Tozdan, yağdan və qopan köhnə boyadan təmizləyin, çatları doldurun. Yeni suvaq ən azı 28 gün qurumalıdır.",
        ],
        ["Astar çəkin", "Məsaməli səthlərə dərin nüfuz edən su əsaslı astar çəkin və 4 saat gözləyin."],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% su əlavə edin."],
        ["Çəkin", "Valik, fırça və ya pulverizatorla 2 qat çəkin; qatlar arası 4–6 saat gözləyin."],
      ],
      note: "Yağışlı havada, birbaşa günəş altında və +5 °C-dən aşağı temperaturda işləməyin. Alətləri işdən sonra su ilə yuyun.",
    },
    macun: {
      category: "su-esasli-boyalar",
      noun: "macun",
      paint: false,
      coverage: 0.6,
      coats: 1,
      coatsFixed: true,
      lead: "Fasad və daxili divarlarda çat və qüsurları düzəldən, istifadəyə hazır akril macun.",
      about: [
        "İstifadəyə hazır akril əsaslı macun. Suvaqdakı çatları, çuxurları və kiçik qüsurları doldurur, boyadan əvvəl səthi hamarlayır.",
        "Quruduqdan sonra çatlamır, asan zımparalanır və üzərinə istənilən su əsaslı boya çəkilə bilər.",
      ],
      features: ["İstifadəyə hazırdır", "Çatlamır, çökmür", "Asan zımparalanır", "Daxili və xarici işlər üçün"],
      areas: ["Fasadlar", "Suvaq", "Beton", "Gips-karton"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 1,6 kq / m² (1 mm)"],
        ["layers", "Qat qalınlığı", "1 mm-ə qədər"],
        ["clock", "Quruma", "4–6 saat"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Əsas": "Akril dispersiya, mineral doldurucular",
        "Səth görünüşü": null,
        "Rəng": "Ağ",
        "Sərfiyyat": "≈ 1,6 kq/m² (1 mm qat)",
        "Qat sayı": "Hər qat 1 mm-ə qədər",
        Quruma: "4–6 saat (1 mm qat), tam 24 saat",
        "Durulaşdırma": "Durulaşdırılmır",
      },
      steps: [
        ["Səthi hazırlayın", "Tozdan, yağdan və qopan hissələrdən təmizləyin, məsaməli səthə astar çəkin."],
        ["Qarışdırın", "Macunu qabda yaxşıca qarışdırın — istifadəyə hazırdır."],
        ["Çəkin", "Polad şpatellə nazik qatlarla çəkin; hər qat 1 mm-dən qalın olmasın."],
        ["Zımparalayın", "Tam quruduqdan sonra zımparalayın, tozunu alıb boyaya keçin."],
      ],
      note: "+5 °C-dən aşağı temperaturda işləməyin, şaxtadan qoruyun. Alətləri işdən sonra su ilə yuyun.",
    },
    astar: {
      category: "su-esasli-boyalar",
      noun: "astar",
      paint: false,
      coverage: 8,
      coats: 1,
      coatsFixed: true,
      lead: "Boyadan əvvəl səthi möhkəmləndirən və hopmanı azaldan silikonlu, dərin nüfuz edən astar.",
      about: [
        "ZANASTAR silikon və akril əsaslı astardır. Səthin dərinliyinə hopur, tozlanan suvağı möhkəmləndirir və hopmanı bərabərləşdirir — boya daha az sərf olunur və ləkəsiz yatır.",
        "Xüsusilə silikon və akril fasad boyalarının altına tövsiyə olunur; səthi nəmdən qoruyur.",
      ],
      features: ["Dərin nüfuz edir", "Boya sərfiyyatını azaldır", "Səthi möhkəmləndirir", "Nəmə qarşı qoruyur"],
      areas: ["Fasadlar", "Sement suvaq", "Beton", "Gips-karton", "Kərpic"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 8 m² / kq"],
        ["layers", "Qat sayı", "1 qat"],
        ["clock", "Quruma", "2–4 saat"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Əsas": "Silikon, akril dispersiya",
        "Səth görünüşü": null,
        "Rəng": null,
        "Sərfiyyat": "100–150 q/m² — ≈ 8 m²/kq",
        "Qat sayı": "1 qat",
        Quruma: "2–4 saat; boya 4 saatdan sonra",
      },
      steps: [
        ["Səthi hazırlayın", "Tozdan, yağdan və qopan hissələrdən təmizləyin, çatları doldurun."],
        ["Qarışdırın", "Astarı yaxşıca qarışdırın, lazım olsa 10%-ə qədər su əlavə edin."],
        ["Çəkin", "Fırça və ya valiklə bir qat, bərabər çəkin."],
        ["Boyaya keçin", "Boyanı astar tam quruduqdan, 4 saatdan sonra çəkin."],
      ],
      note: "+5 °C-dən aşağı temperaturda işləməyin, şaxtadan qoruyun. Alətləri işdən sonra su ilə yuyun.",
    },
    tavan: {
      category: "su-esasli-boyalar",
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
      specs: {
        "Rəng": "Qar kimi ağ",
      },
    },
    das: {
      category: "su-esasli-boyalar",
      noun: "qoruyucu",
      paint: false,
      coverage: 4,
      coats: 1,
      coatsFixed: true,
      lead: "Təbii və süni daşı, kərpici və betonu sudan qoruyan rəngsiz hidrofob hopdurma.",
      about: [
        "Su əsaslı silikon hopdurma. Səthin məsamələrinə hopur və suyu itələyən görünməz qoruyucu təbəqə yaradır; daşın təbii görünüşünü və rəngini dəyişmir.",
        "Yağış suyunun, duzların və şaxtanın dağıdıcı təsirinin qarşısını alır, mamır və kif əmələ gəlməsini azaldır, səthi çirklənmədən qoruyur.",
      ],
      features: [
        "Suyu itələyir, buxarı keçirir",
        "Görünüşü dəyişmir",
        "Şaxtadan və duzlanmadan qoruyur",
        "Mamır və kifin qarşısını alır",
      ],
      areas: ["Təbii daş", "Süni daş", "Kərpic", "Beton", "Səki daşları"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 4 m² / litr"],
        ["layers", "Qat sayı", "1–2 qat"],
        ["clock", "Quruma", "4–6 saat"],
        ["home", "İstifadə", "Xarici işlər"],
      ],
      specs: {
        "Əsas": "Su əsaslı silikon emulsiyası",
        "Səth görünüşü": "Rəngsiz, görünüşü dəyişmir",
        "Rəng": null,
        "Sərfiyyat": "0,2–0,3 litr/m² — ≈ 4 m²/litr",
        "Qat sayı": "1–2 qat (yaş üstündən)",
        Quruma: "Toxunuşa 4–6 saat, tam təsir 24 saat",
        "Durulaşdırma": "Durulaşdırılmır",
      },
      steps: [
        ["Səthi hazırlayın", "Səth təmiz, quru və çatsız olmalıdır; köhnə çirki və mamırı təmizləyin."],
        ["Çəkin", "Fırça, valik və ya çiləyici ilə səthə doyunca çəkin."],
        ["Təkrarlayın", "Çox hopan səthlərə birinci qat qurumamış ikinci qatı çəkin."],
        ["Qoruyun", "İlk 24 saat səthi yağışdan qoruyun."],
      ],
      note: "Yağışlı havada və +5 °C-dən aşağı temperaturda işləməyin. Şüşə və bitkilərin üzərinə düşməsindən qoruyun.",
    },
    pva: {
      category: "yapisdiricilar",
      lead: "Taxta, kağız, karton və tikinti işləri üçün universal PVA yapışdırıcı.",
      about: [
        "Polivinilasetat (PVA) əsaslı universal yapışdırıcı. Taxta, faner, MDF, kağız, karton və parçanı möhkəm yapışdırır; quruduqdan sonra şəffaf olur.",
        "Tikintidə astar kimi, həmçinin sement və gips qarışıqlarına əlavə kimi istifadə olunur — onların yapışmasını və elastikliyini artırır.",
      ],
      features: ["Möhkəm yapışdırır", "Quruyanda şəffaf olur", "Su ilə durulaşdırılır", "İysizdir"],
      areas: ["Taxta", "Kağız və karton", "Parça", "Sement qarışıqları"],
    },
    "super-pva": {
      category: "yapisdiricilar",
      lead: "Gücləndirilmiş tərkibli, yüksək möhkəmlikli universal PVA yapışdırıcı.",
      about: [
        "Gücləndirilmiş polivinilasetat (PVA) tərkibli universal yapışdırıcı. Adi PVA-ya nisbətən daha möhkəm və nəmə daha davamlı birləşmə yaradır.",
        "Tikintidə astar kimi, həmçinin sement və gips qarışıqlarına əlavə kimi istifadə olunur — onların yapışmasını və elastikliyini artırır.",
      ],
      features: ["Yüksək yapışma gücü", "Nəmə davamlı birləşmə", "Quruyanda şəffaf olur", "Su ilə durulaşdırılır"],
      areas: ["Taxta", "Kağız və karton", "Parça", "Sement qarışıqları"],
    },
    binder: {
      category: "yapisdiricilar",
      lead: "Astar və sement qarışıqlarının yapışmasını və möhkəmliyini artıran akril bağlayıcı.",
      about: [
        "Akril dispersiya əsasında hazırlanmış universal bağlayıcı. Su ilə durulaşdırılaraq astar kimi çəkilir: tozlanan səthi möhkəmləndirir və hopmanı azaldır.",
        "Sement, suvaq və şpatlyovka qarışıqlarına əlavə edildikdə onların yapışmasını, elastikliyini və suya davamlılığını artırır.",
      ],
      features: ["Səthi möhkəmləndirir", "Hopmanı azaldır", "Qarışıqları gücləndirir", "Su ilə durulaşdırılır"],
      areas: ["Suvaq", "Beton", "Gips-karton", "Sement qarışıqları"],
      facts: [
        ["drop", "Əsas", "Akril dispersiya"],
        ["clock", "Quruma", "2–3 saat"],
        ["layers", "Durulaşdırma", "Su ilə"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Əsas": "Akril dispersiya",
        "Görünüş": "Ağ, quruyanda şəffaf",
        "Bərkimə": null,
        Quruma: "2–3 saat, tam 24 saat",
      },
      steps: [
        ["Səthi hazırlayın", "Tozdan, yağdan və qopan hissələrdən təmizləyin."],
        ["Durulaşdırın", "Astar kimi istifadə üçün su ilə durulaşdırın və yaxşıca qarışdırın."],
        ["Çəkin", "Fırça və ya valiklə bərabər qat çəkin."],
        ["Gözləyin", "Növbəti işə 2–3 saatdan sonra başlayın."],
      ],
    },
    "sintetik-parlaq": {
      category: "sintetik-boyalar",
      lead: "Daxili və xarici işlər üçün asan çəkilən, parlaq və davamlı sintetik emal.",
      about: [
        "Daxili və xarici işlər üçün universal sintetik emal. Metal, taxta və suvaqlı səthlərdə parlaq, möhkəm və yuyula bilən örtük yaradır.",
        "Atmosfer təsirlərinə davamlıdır, çəkilişi asandır və geniş rəng palitrasında təqdim olunur.",
      ],
      features: ["Parlaq, hamar səth", "Daxili və xarici işlər üçün", "Yuyula bilir", "Yüksək örtücülük"],
      areas: ["Metal", "Taxta", "Suvaq", "Qapılar", "Mebel"],
      specs: {
        "Rəng": "Ağ, boz, qara, yaşıl, mavi, qırmızı, bordo, krem",
      },
    },
    pol: {
      category: "sintetik-boyalar",
      coverage: 10,
      lead: "Taxta və beton döşəmələr üçün aşınmaya davamlı, parlaq sintetik boya.",
      about: [
        "Döşəmələr üçün xüsusi hazırlanmış alkid əsaslı sintetik boya. Sərt, parlaq və aşınmaya davamlı təbəqə yaradır, gündəlik gediş-gəlişə tab gətirir.",
        "Taxta və beton döşəmələri nəmdən və çirkdən qoruyur, asanlıqla silinir.",
      ],
      features: ["Aşınmaya davamlıdır", "Parlaq, hamar səth", "Asan silinir", "Nəmdən qoruyur"],
      areas: ["Taxta döşəmə", "Beton döşəmə", "Pilləkənlər", "Eyvan və terraslar"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 10 m² / litr"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Toxunuşa quruma", "6–8 saat"],
        ["home", "İstifadə", "Döşəmələr"],
      ],
      specs: {
        "Sərfiyyat": "≈ 10 m²/l (bir qat)",
        Quruma: "Toxunuşa 6–8 saat, gəzmək üçün 24 saat, tam 7 gün",
      },
    },
    antipas: {
      category: "sintetik-boyalar",
      coverage: 10,
      lead: "Metalı pasdan qoruyan, astar və son qat kimi çəkilən sintetik boya.",
      about: [
        "Alkid əsaslı, tərkibində pasa qarşı piqmentlər olan sintetik boya. Metalda korroziyanın qarşısını alır və səthə möhkəm yapışır.",
        "Həm astar, həm də son qat kimi çəkilə bilər; hasar, darvaza, boru və metal konstruksiyalar üçün idealdır.",
      ],
      features: [
        "Pasa qarşı qoruyur",
        "Astar və son qat kimi",
        "Atmosfer təsirlərinə davamlıdır",
        "Metala möhkəm yapışır",
      ],
      areas: ["Metal konstruksiyalar", "Hasarlar", "Darvazalar", "Borular", "Damlar"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 10 m² / kq"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Toxunuşa quruma", "4–6 saat"],
        ["home", "İstifadə", "Metal səthlər"],
      ],
      specs: {
        "Səth görünüşü": "Yarımmat",
        "Rəng": "Ağ, boz, qara, mavi, bordo",
        "Sərfiyyat": "90–110 q/m² (bir qat) — ≈ 10 m²/kq",
      },
      steps: [
        [
          "Səthi hazırlayın",
          "Pası, qopan boyanı və yağ ləkələrini təmizləyin, səthi zımparalayıb tozunu alın.",
        ],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% uayt-spirit əlavə edin."],
        ["Çəkin", "Fırça, valik və ya pulverizatorla birinci qatı çəkin."],
        ["İkinci qat", "24 saatdan sonra ikinci qatı çəkin."],
      ],
    },
    "parket-laki": {
      category: "sintetik-boyalar",
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
        Quruma: "Toxunuşa 6–8 saat, gəzmək üçün 24 saat, tam 7 gün",
      },
    },
    "sintetik-mat": {
      category: "sintetik-boyalar",
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
      specs: {
        "Səth görünüşü": "Mat",
      },
    },
    supermat: {
      category: "sintetik-boyalar",
      lead: "Dərin mat, məxmər görünüşlü səth yaradan yüksək örtücülüklü sintetik boya.",
      about: [
        "Supermat işığı tam udan, dərin mat səth yaradan alkid əsaslı boyadır. Səthdəki kiçik qüsurları və nahamarlıqları gizlədir.",
        "Yüksək örtücülüyü və atmosfer təsirlərinə davamlılığı sayəsində daxili və xarici işlərdə metal, taxta və suvaq üçün uyğundur.",
      ],
      features: ["Dərin mat səth", "Qüsurları gizlədir", "Yüksək örtücülük", "Daxili və xarici işlər üçün"],
      areas: ["Metal", "Taxta", "Suvaq", "Qapılar", "Radiatorlar"],
      specs: {
        "Səth görünüşü": "Dərin mat",
      },
    },
    lux: {
      category: "sintetik-boyalar",
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
    },
    rapid: {
      category: "sintetik-boyalar",
      noun: "astar",
      paint: false,
      coverage: 9,
      coats: 1,
      coatsFixed: true,
      lead: "Metal və taxta üçün tez quruyan, pasa qarşı qoruyan sintetik astar boya.",
      about: [
        "Rapid alkid əsaslı, tez quruyan astar boyadır. Metal və taxtaya möhkəm yapışır, son qat boyanın yapışmasını yaxşılaşdırır və onun ömrünü uzadır.",
        "Tərkibindəki pasa qarşı piqmentlər metalı korroziyadan qoruyur; qısa quruma müddəti sayəsində iş ara vermədən davam edir.",
      ],
      features: ["Tez quruyur", "Pasa qarşı qoruyur", "Son qatın yapışmasını artırır", "Asan zımparalanır"],
      areas: ["Metal", "Taxta", "Metal konstruksiyalar", "Qapı və pəncərələr"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 9 m² / kq"],
        ["layers", "Qat sayı", "1 qat"],
        ["clock", "Toxunuşa quruma", "30–60 dəqiqə"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Səth görünüşü": "Mat",
        "Sərfiyyat": "100–120 q/m² — ≈ 9 m²/kq",
        "Qat sayı": "1 qat",
        Quruma: "Toxunuşa 30–60 dəqiqə; son qat 4 saatdan sonra",
      },
      steps: [
        ["Səthi hazırlayın", "Pası, köhnə boyanı və yağ ləkələrini təmizləyin, səthi zımparalayın."],
        ["Qarışdırın", "Astarı yaxşıca qarışdırın, lazım olsa 5–10% uayt-spirit əlavə edin."],
        ["Çəkin", "Fırça, valik və ya pulverizatorla nazik, bərabər qat çəkin."],
        ["Son qat", "4 saatdan sonra sintetik boya ilə son qatı çəkin."],
      ],
    },
    "yol-cizgi": {
      category: "sintetik-boyalar",
      paint: false,
      coverage: 2,
      coats: 1,
      lead: "Asfalt və betonda yol nişanlanması üçün tez quruyan, aşınmaya davamlı boya.",
      about: [
        "Yolların, dayanacaqların və sənaye ərazilərinin nişanlanması üçün xüsusi boya. Asfalt və betona möhkəm yapışır, tez quruyur və qısa müddətdə hərəkətə açılmağa imkan verir.",
        "Aşınmaya, suya və günəş şüalarına davamlıdır — xətlər uzun müddət aydın qalır.",
      ],
      features: [
        "Tez quruyur",
        "Aşınmaya davamlıdır",
        "Asfalt və betona möhkəm yapışır",
        "Atmosfer təsirlərinə davamlıdır",
      ],
      areas: ["Asfalt", "Beton", "Dayanacaqlar", "Anbar və sexlər", "İdman meydançaları"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 2 m² / kq"],
        ["layers", "Qat sayı", "1–2 qat"],
        ["clock", "Quruma", "15–30 dəqiqə"],
        ["home", "İstifadə", "Yol və meydançalar"],
      ],
      specs: {
        "Əsas": "Sintetik qatran",
        "Səth görünüşü": "Mat",
        "Sərfiyyat": "400–600 q/m² — ≈ 2 m²/kq",
        "Qat sayı": "1–2 qat",
        Quruma: "Toxunuşa 15–30 dəqiqə, hərəkətə 1 saatdan sonra",
        "Durulaşdırma": "Sintetik tiner, 5–10%",
      },
      steps: [
        ["Səthi hazırlayın", "Asfalt və ya beton quru, tozsuz və yağsız olmalıdır."],
        ["İşarələyin", "Xəttin sərhədlərini şablon və ya lentlə qeyd edin."],
        ["Qarışdırın", "Boyanı yaxşıca qarışdırın, lazım olsa 5–10% tiner əlavə edin."],
        ["Çəkin", "Valik, fırça və ya xətt çəkən maşınla bərabər qat çəkin."],
      ],
    },
    aluminium: {
      category: "sintetik-boyalar",
      paint: false,
      coverage: 12,
      lead: "Metal səthlərə gümüşü parıltı verən, korroziyadan qoruyan alüminium boya.",
      about: [
        "Alüminium tozu əsasında hazırlanmış gümüşü sintetik boya. Metal səthdə parlaq, metal görünüşlü qoruyucu təbəqə yaradır.",
        "Günəş şüalarını əks etdirir və metalı korroziyadan qoruyur — borular, çənlər, hasarlar və dam örtükləri üçün uyğundur.",
      ],
      features: ["Gümüşü metal parıltı", "Korroziyadan qoruyur", "Günəş şüalarını əks etdirir", "Yüksək örtücülük"],
      areas: ["Metal", "Borular", "Çənlər", "Hasarlar", "Dam örtükləri"],
      facts: [
        ["roller", "Sərfiyyat", "≈ 12 m² / litr"],
        ["layers", "Qat sayı", "1–2 qat"],
        ["clock", "Toxunuşa quruma", "1–2 saat"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Əsas": "Alkid qatranı, alüminium tozu",
        "Səth görünüşü": "Gümüşü, metal parıltılı",
        "Sərfiyyat": "≈ 12 m²/l (bir qat)",
        "Qat sayı": "1–2 qat",
        Quruma: "Toxunuşa 1–2 saat, tam 24 saat",
      },
    },
    "sintetik-tiner": {
      category: "sintetik-boyalar",
      noun: "tiner",
      paint: false,
      coverage: 0,
      lead: "Sintetik boya, lak və emalları durulaşdırmaq, alətləri təmizləmək üçün həlledici.",
      about: [
        "Alkid əsaslı sintetik boya, lak və emallar üçün həlledici. Boyanı lazımi qatılığa gətirir, onun axıcılığını və səthə bərabər yatmasını yaxşılaşdırır.",
        "Fırça, valik və pulverizatorun təmizlənməsi, səthin yağdan təmizlənməsi üçün də istifadə olunur.",
      ],
      features: [
        "Boyanı bərabər durulaşdırır",
        "Alətləri təmizləyir",
        "Səthi yağdan təmizləyir",
        "Sintetik boya və laklarla uyğundur",
      ],
      areas: ["Sintetik boyalar", "Laklar", "Emallar", "Alətlərin təmizlənməsi"],
      facts: [
        ["drop", "Təyinat", "Durulaşdırma"],
        ["layers", "Nisbət", "5–10%"],
        ["brush", "Təmizləmə", "Alətlər üçün"],
        ["shield", "Uyğundur", "Sintetik boyalar"],
      ],
      specs: [
        ["Təyinat", "Sintetik boya, lak və emalların durulaşdırılması"],
        ["Durulaşdırma nisbəti", "Boyanın çəkisinə görə 5–10%"],
        ["Tətbiq", "Alətlərin və səthin təmizlənməsi"],
        ["Saxlama", "Sərin yerdə, ağzı bağlı, oddan uzaq"],
        ["Yararlılıq müddəti", "36 ay"],
      ],
      steps: [
        ["Qarışdırın", "Boyanı açıb yaxşıca qarışdırın."],
        ["Əlavə edin", "Tineri hissə-hissə, qarışdıraraq əlavə edin — adətən 5–10% kifayətdir."],
        ["Yoxlayın", "Qatılığı fırça və ya pulverizator üçün uyğun olana qədər gətirin."],
        ["Təmizləyin", "İşdən sonra alətləri tinerlə yuyun."],
      ],
      note: "Tez alışan mayedir: yalnız yaxşı havalandırılan yerdə, açıq oddan uzaq işləyin. Uşaqların əli çatmayan yerdə saxlayın.",
    },
    "sellulozik-dolgu": {
      category: "sellulozik-boyalar",
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
    },
    "sellulozik-parlaq": {
      category: "sellulozik-boyalar",
      lead: "Mebel və taxta işləri üçün tez quruyan, hamar və parlaq sellülozik boya.",
      about: [
        "Mebel və taxta işləri üçün tez quruyan sellülozik boya. Hamar, parlaq və möhkəm səth yaradır.",
        "Pulverizatorla çəkildikdə zavod keyfiyyətində örtük alınır; növbəti qatı 20–30 dəqiqədən sonra çəkmək olar.",
      ],
      features: ["15–20 dəqiqəyə quruyur", "Hamar, parlaq səth", "Cızılmaya davamlıdır", "Pulverizator üçün ideal"],
      areas: ["Mebel", "MDF", "Taxta", "Qapılar"],
      specs: {
        "Rəng": "Ağ, boz, qara, yaşıl, mavi, qırmızı, bordo, krem",
      },
    },
    "sellulozik-tiner": {
      category: "sellulozik-boyalar",
      noun: "tiner",
      paint: false,
      coverage: 0,
      lead: "Sellülozik boya, lak və vernikləri durulaşdırmaq, alətləri təmizləmək üçün həlledici.",
      about: [
        "Nitrosellüloza əsaslı boya, lak və verniklər üçün həlledici. Materialı pulverizator üçün lazımi qatılığa gətirir, hamar və axıntısız səth almağa kömək edir.",
        "Pulverizatorun, fırçanın və digər alətlərin təmizlənməsi üçün də istifadə olunur.",
      ],
      features: [
        "Tez buxarlanır",
        "Hamar səth almağa kömək edir",
        "Alətləri təmizləyir",
        "Sellülozik materiallarla uyğundur",
      ],
      areas: ["Sellülozik boyalar", "Laklar", "Verniklər", "Alətlərin təmizlənməsi"],
      facts: [
        ["drop", "Təyinat", "Durulaşdırma"],
        ["layers", "Nisbət", "10–20%"],
        ["brush", "Təmizləmə", "Alətlər üçün"],
        ["shield", "Uyğundur", "Sellülozik boyalar"],
      ],
      specs: [
        ["Təyinat", "Sellülozik boya, lak və verniklərin durulaşdırılması"],
        ["Durulaşdırma nisbəti", "Pulverizator üçün 10–20%"],
        ["Tətbiq", "Alətlərin təmizlənməsi"],
        ["Saxlama", "Sərin yerdə, ağzı bağlı, oddan uzaq"],
        ["Yararlılıq müddəti", "36 ay"],
      ],
      steps: [
        ["Qarışdırın", "Boyanı və ya laki açıb yaxşıca qarışdırın."],
        ["Əlavə edin", "Tineri hissə-hissə əlavə edin — pulverizator üçün 10–20%."],
        ["Yoxlayın", "Kiçik sahədə sınayın, lazım olsa nisbəti dəqiqləşdirin."],
        ["Təmizləyin", "İşdən dərhal sonra alətləri tinerlə yuyun."],
      ],
      note: "Tez alışan mayedir: yalnız yaxşı havalandırılan yerdə, açıq oddan uzaq işləyin. Uşaqların əli çatmayan yerdə saxlayın.",
    },
  };

  // Qiymət = kataloq qiyməti + 10% (TODO (marketinq): təsdiqlənməlidir).
  // variants: [artikul, ölçü, miqdar (vahidlə), qiymət, köhnə qiymət | null, stok "in" | "out"]
  //   Kataloq kartında (shop.html) siyahının ortasındakı çəki göstərilir — DEFAULT_VARIANT.
  // image: null olan məhsulların şəkli hələ yoxdur — placeholder.svg (TODO (dizayn))
  const PRODUCTS = {
    1: {
      brand: "ZAN",
      type: "fasad",
      name: "ZANFASAD akril fasad boyası",
      image: "./assets/images/products/zan-fasad.webp",
      variants: [
        ["ZAN-001", "3,5 kq", 3.5, 12.65],
        ["ZAN-002", "10 kq", 10, 33.55],
        ["ZAN-003", "25 kq", 25, 80.63],
      ],
    },
    2: {
      brand: "ZAN",
      type: "plastik",
      name: "ZANPLASTİK akril divar boyası",
      image: "./assets/images/products/zan-plastik.webp",
      variants: [
        ["ZAN-004", "3,5 kq", 3.5, 10.45],
        ["ZAN-005", "10 kq", 10, 27.5],
        ["ZAN-006", "25 kq", 25, 64.24],
      ],
    },
    3: {
      brand: "ZAN",
      type: "plus",
      name: "ZANPLUS silinə bilən plastik boya",
      image: "./assets/images/products/zan-plus.webp",
      variants: [
        ["ZAN-007", "3,5 kq", 3.5, 15.07],
        ["ZAN-008", "10 kq", 10, 40.92],
        ["ZAN-009", "25 kq", 25, 90.64],
      ],
    },
    4: {
      brand: "ZAN",
      type: "kontakt",
      name: "ZANKONTAKT bağlayıcı beton astar",
      image: "./assets/images/products/zan-kontakt.webp",
      variants: [
        ["ZAN-010", "5 kq", 5, 11.44],
        ["ZAN-011", "10 kq", 10, 22.66],
        ["ZAN-012", "20 kq", 20, 49.61],
      ],
    },
    5: {
      brand: "ZAN",
      type: "silan",
      name: "ZANSİLAN silikonlu fasad boyası",
      image: "./assets/images/products/zan-silan.webp",
      variants: [
        ["ZAN-013", "3,5 kq", 3.5, 20.24],
        ["ZAN-014", "10 kq", 10, 55.33],
        ["ZAN-015", "25 kq", 25, 130.57],
      ],
    },
    6: {
      brand: "ZAN",
      type: "macun",
      name: "ZANMACUN akril fasad macunu",
      image: "./assets/images/products/zan-macun.webp",
      variants: [
        ["ZAN-016", "4,5 kq", 4.5, 10.56],
        ["ZAN-017", "10 kq", 10, 21.78],
        ["ZAN-018", "25 kq", 25, 49.39],
      ],
    },
    7: {
      brand: "ZAN",
      type: "astar",
      name: "ZANASTAR silikonlu astar",
      image: "./assets/images/products/zan-astar.webp",
      variants: [
        ["ZAN-019", "3,5 kq", 3.5, 10.56],
        ["ZAN-020", "10 kq", 10, 30.69],
        ["ZAN-021", "16 kq", 16, 48.4],
      ],
    },
    8: {
      brand: "ZAN",
      type: "tavan",
      name: "ZANTAVAN tavan boyası",
      image: "./assets/images/products/zan-tavan.webp",
      variants: [
        ["ZAN-022", "3,5 kq", 3.5, 8.36],
        ["ZAN-023", "10 kq", 10, 20.9],
        ["ZAN-024", "25 kq", 25, 48.95],
      ],
    },
    9: {
      brand: "ZAN",
      type: "pva",
      name: "ZAN Universal PVA yapışdırıcı",
      image: "./assets/images/products/zan-universal-pva.webp",
      variants: [
        ["ZAN-025", "1 kq", 1, 5.83],
        ["ZAN-026", "3 kq", 3, 15.4],
        ["ZAN-027", "9 kq", 9, 47.19],
        ["ZAN-028", "25 kq", 25, 113.08],
      ],
    },
    10: {
      brand: "ZAN",
      type: "super-pva",
      name: "ZAN Super Universal PVA yapışdırıcı",
      image: "./assets/images/products/zan-super-universal-pva.webp",
      variants: [
        ["ZAN-029", "0,9 kq", 0.9, 5.72],
        ["ZAN-030", "2,5 kq", 2.5, 13.97],
        ["ZAN-031", "7 kq", 7, 41.03],
        ["ZAN-032", "18 kq", 18, 91.74],
        ["ZAN-033", "25 kq", 25, 118.14],
      ],
    },
    11: {
      brand: "ZAN",
      type: "das",
      name: "ZAN daş qoruyucu",
      image: "./assets/images/products/zan-das-qoruyucu.webp",
      unit: "l",
      variants: [
        ["ZAN-034", "5 l", 5, 29.81],
        ["ZAN-035", "10 l", 10, 58.41],
      ],
    },
    12: {
      brand: "ZAN",
      type: "sintetik-parlaq",
      name: "ZAN sintetik parlaq boya",
      image: "./assets/images/products/zan-sintetik-parlaq.webp",
      variants: [
        ["ZAN-050", "0,75 kq", 0.75, 9.24],
        ["ZAN-051", "2,5 kq", 2.5, 24.86],
        ["ZAN-052", "17 kq", 17, 151.69],
      ],
    },
    13: {
      brand: "ZAN",
      type: "antipas",
      name: "ZAN sintetik antipas boya",
      image: "./assets/images/products/zan-sintetik-antipas.webp",
      variants: [
        ["ZAN-056", "1 kq", 1, 5.83],
        ["ZAN-057", "4 kq", 4, 18.26],
        ["ZAN-058", "25 kq", 25, 105.6],
      ],
    },
    14: {
      brand: "ZAN",
      type: "parket-laki",
      name: "ZAN sintetik parlaq parket lakı",
      image: "./assets/images/products/zan-parket-laki.webp",
      variants: [
        ["ZAN-059", "0,75 kq", 0.75, 7.37],
        ["ZAN-060", "2,5 kq", 2.5, 21.12],
        ["ZAN-061", "12,5 kq", 12.5, 106.7],
      ],
    },
    15: {
      brand: "ZAN",
      type: "sellulozik-dolgu",
      name: "ZAN sellülozik dolğu vernik",
      image: "./assets/images/products/zan-sellulozik-dolgu.webp",
      variants: [
        ["ZAN-062", "0,75 kq", 0.75, 7.81],
        ["ZAN-063", "2,5 kq", 2.5, 23.21],
        ["ZAN-064", "12 kq", 12, 105.38],
      ],
    },
    16: {
      brand: "ZAN",
      type: "lux",
      name: "ZAN LUX parlaq boya",
      image: "./assets/images/products/zan-lux-parlaq.webp",
      variants: [
        ["ZAN-065", "0,75 kq", 0.75, 9.57],
        ["ZAN-066", "3,5 kq", 3.5, 33.33],
        ["ZAN-067", "17 kq", 17, 158.73],
      ],
    },
    17: {
      brand: "ZAN",
      type: "sintetik-mat",
      name: "ZAN sintetik mat boya",
      image: "./assets/images/products/zan-sintetik-mat.webp",
      variants: [
        ["ZAN-068", "1 kq", 1, 7.04],
        ["ZAN-069", "4 kq", 4, 22.33],
        ["ZAN-070", "25 kq", 25, 135.08],
      ],
    },
    18: {
      brand: "ZAN",
      type: "supermat",
      name: "ZAN supermat boya",
      image: "./assets/images/products/zan-supermat.webp",
      variants: [
        ["ZAN-071", "1 kq", 1, 7.7],
        ["ZAN-072", "4,5 kq", 4.5, 29.92],
        ["ZAN-073", "25 kq", 25, 143.44],
      ],
    },
    19: {
      brand: "ZAN",
      type: "rapid",
      name: "ZAN Rapid astar boya",
      image: "./assets/images/products/zan-rapid-astar.webp",
      variants: [
        ["ZAN-074", "2 kq", 2, 11.22],
        ["ZAN-075", "4 kq", 4, 21.12],
        ["ZAN-076", "12 kq", 12, 63.36],
      ],
    },
    20: {
      brand: "ZAN",
      type: "yol-cizgi",
      name: "ZAN yol cizgi boyası",
      image: "./assets/images/products/zan-yol-cizgi.webp",
      variants: [
        ["ZAN-077", "20 kq", 20, 148.17],
        ["ZAN-078", "25 kq", 25, 185.24],
      ],
    },
    21: {
      brand: "ZAN",
      type: "aluminium",
      name: "ZAN alüminium boya",
      image: "./assets/images/products/zan-aluminium.webp",
      unit: "l",
      variants: [
        ["ZAN-079", "0,25 l", 0.25, 4.4],
        ["ZAN-080", "0,75 l", 0.75, 7.7],
        ["ZAN-081", "2,5 l", 2.5, 25.74],
      ],
    },
    22: {
      brand: "ZAN",
      type: "sellulozik-parlaq",
      name: "ZAN sellülozik parlaq boya",
      image: "./assets/images/products/zan-sellulozik-parlaq.webp",
      variants: [
        ["ZAN-082", "0,75 kq", 0.75, 9.57],
        ["ZAN-083", "2,5 kq", 2.5, 28.49],
        ["ZAN-084", "12 kq", 12, 124.3],
      ],
    },
    23: {
      brand: "ZAN",
      type: "sellulozik-tiner",
      name: "ZAN sellülozik tiner",
      image: "./assets/images/products/zan-sellulozik-tiner.webp",
      unit: "l",
      variants: [
        ["ZAN-085", "0,75 l", 0.75, 5.06],
        ["ZAN-086", "3,75 l", 3.75, 18.7],
      ],
    },
    24: {
      brand: "ZAN",
      type: "sintetik-tiner",
      name: "ZAN sintetik tiner",
      image: "./assets/images/products/placeholder.svg",
      unit: "l",
      variants: [
        ["ZAN-087", "0,5 l", 0.5, 2.09],
        ["ZAN-088", "1 l", 1, 3.74],
        ["ZAN-089", "2,5 l", 2.5, 8.91],
      ],
    },
    25: {
      brand: "DivoFix",
      type: "fasad",
      name: "DivoFix Fasad akril boya",
      image: "./assets/images/products/divofix-fasad.webp",
      variants: [
        ["DF-050", "3,5 kq", 3.5, 6.49],
        ["DF-051", "10 kq", 10, 16.28],
        ["DF-052", "25 kq", 25, 37.62],
      ],
    },
    26: {
      brand: "DivoFix",
      type: "plastik",
      name: "DivoFix Plastik akril boya",
      image: "./assets/images/products/divofix-plastik.webp",
      variants: [
        ["DF-053", "3,5 kq", 3.5, 6.16],
        ["DF-054", "10 kq", 10, 15.73],
        ["DF-055", "25 kq", 25, 36.3],
      ],
    },
    27: {
      brand: "DivoFix",
      type: "sintetik-parlaq",
      name: "DivoFix sintetik parlaq boya",
      image: "./assets/images/products/placeholder.svg",
      unit: "l",
      facts: [
        ["roller", "Sərfiyyat", "≈ 11 m² / litr"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Toxunuşa quruma", "4–6 saat"],
        ["home", "İstifadə", "Daxili və xarici"],
      ],
      specs: {
        "Sərfiyyat": "≈ 11 m²/l (bir qat)",
      },
      variants: [
        ["DF-064", "0,85 l", 0.85, 5.83],
        ["DF-065", "2,5 l", 2.5, 17.38],
        ["DF-066", "15 l", 15, 97.02],
      ],
    },
    28: {
      brand: "DivoFix",
      type: "pol",
      name: "DivoFix sintetik pol boyası",
      image: "./assets/images/products/placeholder.svg",
      unit: "l",
      variants: [
        ["DF-067", "0,85 l", 0.85, 5.83],
        ["DF-068", "2,5 l", 2.5, 17.38],
        ["DF-069", "15 l", 15, 97.02],
      ],
    },
    29: {
      brand: "DivoFix",
      type: "parket-laki",
      name: "DivoFix parlaq parket lakı",
      image: "./assets/images/products/divofix-parket-laki.webp",
      unit: "l",
      facts: [
        ["roller", "Sərfiyyat", "≈ 12 m² / litr"],
        ["layers", "Qat sayı", "2–3 qat"],
        ["clock", "Toxunuşa quruma", "6–8 saat"],
        ["home", "İstifadə", "Parket, taxta döşəmə"],
      ],
      specs: {
        "Sərfiyyat": "≈ 12 m²/l (bir qat)",
      },
      variants: [
        ["DF-070", "0,8 l", 0.8, 5.83],
        ["DF-071", "2,3 l", 2.3, 16.39],
        ["DF-072", "10 l", 10, 69.85],
      ],
    },
    30: {
      brand: "DivoFix",
      type: "antipas",
      name: "DivoFix sintetik antipas boya",
      image: "./assets/images/products/divofix-sintetik-antipas.webp",
      unit: "l",
      facts: [
        ["roller", "Sərfiyyat", "≈ 10 m² / litr"],
        ["layers", "Qat sayı", "2 qat"],
        ["clock", "Toxunuşa quruma", "4–6 saat"],
        ["home", "İstifadə", "Metal səthlər"],
      ],
      specs: {
        "Sərfiyyat": "≈ 10 m²/l (bir qat)",
      },
      variants: [
        ["DF-073", "0,85 l", 0.85, 4.79],
        ["DF-074", "2,5 l", 2.5, 14.96],
        ["DF-075", "15 l", 15, 85.36],
      ],
    },
    31: {
      brand: "DivoFix",
      type: "sintetik-mat",
      name: "DivoFix sintetik mat boya",
      image: "./assets/images/products/divofix-sintetik-mat.webp",
      variants: [
        ["DF-076", "1 kq", 1, 5.28],
        ["DF-077", "4 kq", 4, 15.18],
        ["DF-078", "25 kq", 25, 86.79],
      ],
    },
    32: {
      brand: "DivoFix",
      type: "sellulozik-dolgu",
      name: "DivoFix sellülozik dolğu vernik",
      image: "./assets/images/products/divofix-sellulozik-dolgu.webp",
      unit: "l",
      facts: [
        ["roller", "Sərfiyyat", "≈ 10 m² / litr"],
        ["layers", "Qat sayı", "1–2 qat"],
        ["clock", "Zımparaya hazır", "30–40 dəqiqə"],
        ["home", "İstifadə", "Taxta və mebel"],
      ],
      specs: {
        "Sərfiyyat": "≈ 10 m²/l (bir qat)",
      },
      variants: [
        ["DF-079", "0,75 l", 0.75, 6.93],
        ["DF-080", "2,5 l", 2.5, 19.47],
        ["DF-081", "12 l", 12, 80.52],
      ],
    },
    33: {
      brand: "DivoFix",
      type: "sellulozik-tiner",
      name: "DivoFix sellülozik tiner",
      image: "./assets/images/products/divofix-sellulozik-tiner.webp",
      variants: [
        ["DF-082", "0,75 kq", 0.75, 5.23],
        ["DF-083", "3 kq", 3, 16.94],
      ],
    },
    34: {
      brand: "DivoFix",
      type: "sellulozik-parlaq",
      name: "DivoFix sellülozik parlaq boya",
      image: "./assets/images/products/divofix-sellulozik-parlaq.webp",
      variants: [
        ["DF-064", "0,75 kq", 0.75, 7.92],
        ["DF-065", "2,5 kq", 2.5, 21.56],
        ["DF-066", "12 kq", 12, 106.15],
      ],
    },
    35: {
      brand: "EkoFix",
      type: "fasad",
      name: "EkoFix Fasad akril boya",
      image: "./assets/images/products/ekofix-fasad.webp",
      variants: [
        ["EF-001", "3 kq", 3, 4.95],
        ["EF-002", "8 kq", 8, 13.53],
        ["EF-003", "20 kq", 20, 28.82],
      ],
    },
    36: {
      brand: "EkoFix",
      type: "plastik",
      name: "EkoFix Plastik akril boya",
      image: "./assets/images/products/ekofix-plastik.webp",
      variants: [
        ["EF-004", "3 kq", 3, 4.73],
        ["EF-005", "8 kq", 8, 13.09],
        ["EF-006", "20 kq", 20, 28.27],
      ],
    },
    37: {
      brand: "EkoFix",
      type: "pva",
      name: "EkoFix PVA yapışdırıcı",
      image: "./assets/images/products/placeholder.svg",
      unit: "l",
      variants: [
        ["EF-007", "0,75 l", 0.75, 1.49],
        ["EF-008", "2,5 l", 2.5, 4.51],
      ],
    },
    38: {
      brand: "EkoFix",
      type: "binder",
      name: "EkoFix Binder akril bağlayıcı",
      image: "./assets/images/products/placeholder.svg",
      unit: "l",
      variants: [
        ["EF-009", "1 l", 1, 2.04],
        ["EF-010", "4 l", 4, 4.29],
        ["EF-011", "10 l", 10, 15.29],
      ],
    },
    39: {
      brand: "EkoFix",
      type: "sintetik-parlaq",
      name: "EkoFix sintetik parlaq boya",
      image: "./assets/images/products/ekofix-sintetik-parlaq.webp",
      variants: [
        ["EF-012", "0,85 kq", 0.85, 5.39],
        ["EF-013", "2,5 kq", 2.5, 14.08],
        ["EF-014", "16 kq", 16, 73.37],
      ],
    },
    40: {
      brand: "EkoFix",
      type: "antipas",
      name: "EkoFix antipas boya",
      image: "./assets/images/products/ekofix-antipas.webp",
      variants: [
        ["EF-018", "0,9 kq", 0.9, 4.29],
        ["EF-019", "3 kq", 3, 11.55],
        ["EF-020", "16 kq", 16, 43.56],
      ],
    },
    41: {
      brand: "EkoFix",
      type: "parket-laki",
      name: "EkoFix sintetik parlaq parket lakı",
      image: "./assets/images/products/ekofix-parket-laki.webp",
      variants: [
        ["EF-021", "0,75 kq", 0.75, 5.39],
        ["EF-022", "2 kq", 2, 14.74],
        ["EF-023", "9 kq", 9, 64.68],
      ],
    },
    42: {
      brand: "EkoFix",
      type: "sintetik-mat",
      name: "EkoFix sintetik mat boya",
      image: "./assets/images/products/ekofix-sintetik-mat.webp",
      variants: [
        ["EF-024", "1 kq", 1, 4.95],
        ["EF-025", "3 kq", 3, 11.66],
        ["EF-026", "15 kq", 15, 73.04],
      ],
    },
    43: {
      brand: "EkoFix",
      type: "sellulozik-dolgu",
      name: "EkoFix sellülozik dolğu vernik",
      image: "./assets/images/products/ekofix-sellulozik-dolgu.webp",
      variants: [
        ["EF-027", "0,75 kq", 0.75, 6.71],
        ["EF-028", "2 kq", 2, 16.83],
        ["EF-029", "9 kq", 9, 74.58],
      ],
    },
    44: {
      brand: "EkoFix",
      type: "sellulozik-tiner",
      name: "EkoFix sellülozik tiner",
      image: "./assets/images/products/ekofix-sellulozik-tiner.webp",
      unit: "l",
      variants: [
        ["EF-030", "2,5 l", 2.5, 13.09],
        ["EF-031", "9 l", 9, 38.94],
      ],
    },
  };
  //#endregion

  //#region göstərmə
  const BRANDS = { ZAN: "zan", DivoFix: "divofix", EkoFix: "ekofix" };
  // kataloq kartında göstərilən çəki: siyahının ortası (cüt sayda — kiçik olanı)
  const DEFAULT_VARIANT = (list) => list[Math.floor((list.length - 1) / 2)];

  // məhsul + tip + kateqoriya → tam məlumat (tip boş sahələri doldurur)
  function resolve(key) {
    const product = PRODUCTS[key];
    const type = TYPES[product.type] || {};
    const merged = Object.assign({}, type, product);
    // specs: tipin obyektini məhsulunku tamamlayır (massiv — tam əvəz)
    if (!Array.isArray(product.specs) && !Array.isArray(type.specs)) {
      merged.specs = Object.assign({}, type.specs, product.specs);
    }
    merged.cat = CATEGORIES[merged.category];
    merged.image = merged.image || "./assets/images/products/placeholder.svg";
    return merged;
  }
  const pick = (data, field) => (data[field] !== undefined ? data[field] : data.cat[field]);

  const id = new URLSearchParams(location.search).get("id");
  // ?id=constructor kimi dəyərlər prototipdən gəlməsin
  const root = document.getElementById("pd-main");
  if (!Object.prototype.hasOwnProperty.call(PRODUCTS, id) || !root) return;
  const data = resolve(id);

  const cat = data.cat;
  const unit = data.unit || cat.unit;
  const main = document.getElementById("main");
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const fields = (name) => $$(`[data-pd="${name}"]`);
  const esc = ZAN.escapeHtml;
  const slug = (size) => size.toLowerCase().replace(",", "-").replace(/\s+/g, "-");
  const svg = (name) => `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.layers}</svg>`;

  const variants = data.variants.map(([code, size, amount, value, oldPrice, stock]) => ({
    code,
    size,
    amount,
    price: value,
    oldPrice: oldPrice || null,
    stock: stock || "in",
    value: slug(size),
  }));
  const defaultVariant = DEFAULT_VARIANT(variants);
  // kataloqdakı kartın data-id-si default çəkinin sku-sudur
  variants.forEach((v) => (v.sku = v === defaultVariant ? String(id) : `${id}-${v.value}`));

  // kateqoriya, ölçü vahidi, kalkulyator
  main.dataset.category = data.category;
  root.dataset.id = String(id);
  root.dataset.unit = unit;
  root.dataset.coverage = String(pick(data, "coverage"));
  root.dataset.coats = String(pick(data, "coats"));
  root.toggleAttribute("data-coats-fixed", Boolean(pick(data, "coatsFixed")));
  document.title = `${data.name} — ZAN Boya`;

  // mətnlər
  fields("name").forEach((el) => (el.textContent = data.name));
  fields("category").forEach((el) => (el.textContent = cat.label));
  fields("category-link").forEach((el) => (el.href = `shop.html?category=${data.category}`));
  fields("lead").forEach((el) => (el.textContent = data.lead));
  fields("calc-noun").forEach((el) => (el.textContent = pick(data, "noun")));
  fields("variant-title").forEach((el) => (el.textContent = unit === "kq" ? "Çəki" : unit === "l" ? "Həcm" : "Qablaşdırma"));
  fields("image").forEach(function (img) {
    img.src = data.image;
    if (img.alt) img.alt = data.name;
  });

  // "Rəngi sınayın" yalnız boyalar üçün
  fields("visualizer").forEach((el) => (el.hidden = !pick(data, "paint")));

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
        <span class="pd-variant-price">${ZAN.formatPrice(v.price)}</span>
        <small class="pd-variant-unit"></small>
      </label>`,
    )
    .join("");

  // əsas göstəricilər
  $('[data-pd="facts"]').innerHTML = pick(data, "facts")
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

  // texniki göstəricilər: kateqoriya + məhsulun öz dəyərləri (null — sətir çıxarılır),
  // massiv verilibsə siyahı tam onunla əvəz olunur; sonda qablaşdırma
  let specs;
  if (Array.isArray(data.specs)) {
    specs = data.specs.slice();
  } else {
    const own = data.specs || {};
    specs = cat.specs.map(([label, value]) => [label, label in own ? own[label] : value]);
    Object.entries(own).forEach(([label, value]) => {
      if (!specs.some(([l]) => l === label)) specs.splice(1, 0, [label, value]);
    });
    specs = specs.filter(([, value]) => value !== null);
  }
  // ölçülər ayrı-ayrı çevrilir ("3,5 kq" → "3,5 кг"); bütöv sətir lüğətdə yoxdur
  specs.push(["Qablaşdırma", variants.map((v) => ZAN.t(v.size)).join(" · ")]);
  $('[data-pd="specs"]').innerHTML = specs
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("");

  // istifadə qaydası
  $('[data-pd="steps"]').innerHTML = pick(data, "steps")
    .map(([title, text]) => `<li><b>${esc(title)}</b>${esc(text)}</li>`)
    .join("");
  const note = $('[data-pd="note"] span');
  if (note) note.textContent = pick(data, "note");

  // tövsiyə olunanlar: əvvəlcə digər brendlərin eyni məhsulu (analoqlar), sonra eyni
  // kateqoriya, eyni brend. Kartlar kataloqdakı kimidir (shop.html → #region catalog),
  // sürətli baxışsız; səbət və sevimlilər düymələri shop.js ilə işləyir.
  const RELATED_MAX = 8;
  const wrapper = $("#pd-related .swiper-wrapper");
  if (wrapper) {
    const score = (p) => (p.type === data.type ? 4 : 0) + (p.category === data.category ? 2 : 0) + (p.brand === data.brand ? 1 : 0);
    wrapper.innerHTML = Object.keys(PRODUCTS)
      .filter((key) => key !== String(id))
      .map((key, index) => ({ key, index, p: resolve(key) }))
      .map((item) => Object.assign(item, { score: score(item.p) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, RELATED_MAX)
      .map(({ key, p }) => `<div class="swiper-slide">${relatedCard(key, p)}</div>`)
      .join("");
  }

  function relatedCard(key, p) {
    const v = DEFAULT_VARIANT(p.variants);
    const [, size, , price] = v;
    const url = `product-detail.html?id=${encodeURIComponent(key)}`;
    return `
      <article class="product-card" data-id="${esc(key)}" data-category="${esc(p.category)}"
        data-brand="${BRANDS[p.brand] || ""}" data-price="${price}" data-stock="in" data-volume="${esc(size)}">
        <div class="pc-media">
          <button type="button" class="pc-icon-btn pc-wish" data-action="toggle-wishlist" aria-pressed="false" aria-label="Sevimlilərə əlavə et">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
          </button>
          <a class="pc-image" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(p.image)}" alt="" loading="lazy" /></a>
        </div>
        <div class="pc-body">
          <span class="pc-category">${esc(p.cat.label)}</span>
          <h3 class="pc-name"><a href="${url}">${esc(p.name)}</a></h3>
          <p class="pc-desc">${esc(p.lead)}</p>
          <div class="pc-meta"><span class="pc-chip">${esc(size)}</span></div>
          <div class="pc-foot">
            <p class="pc-price"><b>${ZAN.formatPrice(price)}</b></p>
            <button type="button" class="pc-cart" data-action="add-to-cart" aria-label="Səbətə at">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 8.5h13l-1.2 11h-10.6z" /><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" /></svg>
              <span>Səbətə at</span>
            </button>
          </div>
        </div>
      </article>`;
  }
  //#endregion
})();
