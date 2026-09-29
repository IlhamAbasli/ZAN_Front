/* ==========================================================================
   visualizer-data.js — rəng vizualizatorunun datası (visualizer.html)
   --------------------------------------------------------------------------
   Qoşulur:  visualizer.html, visualizer-page.js-dən ƏVVƏL
   Verir:    ZAN.VZ_FAMILIES, ZAN.VZ_TREND, ZAN.VZ_SCENES

   Rəng kodu = ailənin hərfi + sıra nömrəsi (məs. G704 → yaşıllar, 4-cü).
   TODO(.NET MVC): kataloq serverdən JSON kimi gəlməlidir (GET /Colors) —
   format eynidir: { id, letter, name, colors: [[ad, hex], ...] }.

   Məkanlar vektor illüstrasiyadır (viewBox 0 0 1200 800). Rənglənən hər
   səth data-s="<id>" atributu daşıyır; maskalar bu atributdan avtomatik
   çıxarılır (visualizer-page.js → #region səhnə). Qaydalar:
     • .shade — işıq/kölgə təbəqəsi: şəkildə görünür, maskaya düşmür
     • səthin önündə çəkilən hər şey (mebel, pəncərə) maskanı avtomatik kəsir
     • data-s qrupunun içində fill="none" element olmamalıdır
   ========================================================================== */

window.ZAN = window.ZAN || {};

(function (ZAN) {
  "use strict";

  //#region rəng ailələri
  ZAN.VZ_FAMILIES = [
    {
      id: "white",
      letter: "W",
      start: 101,
      name: "Ağ tonlar",
      colors: [
        ["Qar dənəsi", "#F7F6F2"],
        ["Pambıq", "#F3F0E8"],
        ["Süd köpüyü", "#F1EDE3"],
        ["Mərmər tozu", "#EDEDEA"],
        ["Fil sümüyü", "#EFE8D8"],
        ["Səhər dumanı", "#E9ECEC"],
        ["Badam çiçəyi", "#F2E9E4"],
        ["Kətan", "#EAE3D5"],
        ["Qaymaq", "#F4EBD3"],
        ["Ay işığı", "#E8EAF0"],
      ],
    },
    {
      id: "grey",
      letter: "N",
      start: 201,
      name: "Boz tonlar",
      colors: [
        ["Şuşa dumanı", "#D9DAD7"],
        ["Gümüş söyüd", "#C9CCC6"],
        ["Çay daşı", "#B8B6AF"],
        ["Qobustan daşı", "#A7A195"],
        ["Beton", "#9A9C9B"],
        ["Qurğuşun", "#7D8185"],
        ["Qranit", "#6B6B68"],
        ["Tüstü", "#5E6368"],
        ["Qrafit", "#43474B"],
        ["Gecə asfaltı", "#2F3236"],
      ],
    },
    {
      id: "sand",
      letter: "S",
      start: 301,
      name: "Bej və qum",
      colors: [
        ["Qum təpəsi", "#E6D8C0"],
        ["Halva", "#DCC7A5"],
        ["Badam", "#D8C3A5"],
        ["Kətan toxuması", "#CDBFA8"],
        ["Abşeron sahili", "#D4BE94"],
        ["Dəvə yunu", "#C3A57C"],
        ["Qoz qabığı", "#B39A7A"],
        ["Səhra küləyi", "#C9B08E"],
        ["Taxıl", "#D9C08A"],
        ["Gil", "#B89A7E"],
      ],
    },
    {
      id: "red",
      letter: "R",
      start: 401,
      name: "Qırmızı və çəhrayı",
      colors: [
        ["Qızılgül ləçəyi", "#F0D5D2"],
        ["Pudra", "#E8C6C1"],
        ["Şaftalı çiçəyi", "#E9B8A8"],
        ["Mərcan", "#E07B6A"],
        ["Nar çiçəyi", "#D96A6A"],
        ["ZAN qırmızısı", "#C9142C"],
        ["Nar dənəsi", "#A8243A"],
        ["Albalı", "#8A2232"],
        ["Şərab", "#6C1F2B"],
        ["Qarağat", "#5B2233"],
      ],
    },
    {
      id: "orange",
      letter: "T",
      start: 501,
      name: "Narıncı və terrakota",
      colors: [
        ["Şaftalı", "#F5B993"],
        ["Ərik", "#F2C49B"],
        ["Mandarin", "#F0A263"],
        ["Qızıl payız", "#D98545"],
        ["Zəfəran", "#E48B2E"],
        ["Terrakota", "#C0673E"],
        ["Mis", "#B86B3F"],
        ["Kərpic", "#A9533A"],
        ["Darçın", "#9C5A3C"],
        ["Pas", "#8B4A2F"],
      ],
    },
    {
      id: "yellow",
      letter: "Y",
      start: 601,
      name: "Sarı tonlar",
      colors: [
        ["Limon kremi", "#F6EBB5"],
        ["Vanil", "#F3E3B5"],
        ["Buğda zəmisi", "#E5C77F"],
        ["Günəbaxan", "#F2C94C"],
        ["Bal", "#E3AE45"],
        ["Qızıl qum", "#D9B36C"],
        ["Kəhraba", "#D8962B"],
        ["Hardal", "#C99A2E"],
        ["Oxra", "#BF8C3A"],
        ["Zeytun yağı", "#C2B25A"],
      ],
    },
    {
      id: "green",
      letter: "G",
      start: 701,
      name: "Yaşıl tonlar",
      colors: [
        ["Nanə", "#D5E5D5"],
        ["Fıstıq", "#BCCB8F"],
        ["Adaçayı", "#B5C3A8"],
        ["Evkalipt", "#8FA89A"],
        ["Zeytun budağı", "#8C9366"],
        ["Firuzə", "#48A39A"],
        ["Mamır", "#6C7A4B"],
        ["Göygöl", "#4F7F73"],
        ["Meşə kölgəsi", "#3E5B4A"],
        ["Qafqaz meşəsi", "#2F4A3A"],
      ],
    },
    {
      id: "blue",
      letter: "B",
      start: 801,
      name: "Mavi tonlar",
      colors: [
        ["Buz", "#DDE8EE"],
        ["Səma", "#BCD3E3"],
        ["Dumanlı dəniz", "#8FA9B5"],
        ["Polad mavisi", "#6F8797"],
        ["Xəzər dalğası", "#5E8FA8"],
        ["Dəniz fırtınası", "#3F6A80"],
        ["Kobalt", "#2E5AA6"],
        ["İndiqo", "#2E4A6B"],
        ["Lacivərd", "#243B63"],
        ["Gecə mavisi", "#1F3350"],
      ],
    },
    {
      id: "violet",
      letter: "V",
      start: 901,
      name: "Bənövşəyi tonlar",
      colors: [
        ["Səhər şəfəqi", "#D9C3D4"],
        ["Lavanda", "#D8D0E6"],
        ["Yasəmən", "#C3B3D6"],
        ["Toz gülü", "#B79AA6"],
        ["Süsən", "#A89BC9"],
        ["Bənövşə", "#8E7AB0"],
        ["Əncir", "#7A5570"],
        ["Gavalı", "#6A4A6E"],
        ["Böyürtkən", "#4E3350"],
        ["Badımcan", "#4A2C40"],
      ],
    },
    {
      id: "brown",
      letter: "K",
      start: 101,
      name: "Qəhvəyi tonlar",
      colors: [
        ["Südlü qəhvə", "#B39A83"],
        ["Karamel", "#B07A4A"],
        ["Fındıq", "#A0785A"],
        ["Palıd", "#9B7B5B"],
        ["Qoz ağacı", "#8A6446"],
        ["Tütün yarpağı", "#7D5E3C"],
        ["Şabalıd", "#7A4B34"],
        ["Kakao", "#6B4A3A"],
        ["Qəhvə dənəsi", "#4B3328"],
        ["Tünd şokolad", "#3D2A22"],
      ],
    },
  ];

  // "Trend 2026" filtri — mövsümün seçilmiş rəngləri
  ZAN.VZ_TREND = ["G708", "T506", "B805", "S305", "R407", "V904", "G703", "K102", "N204", "Y605"];
  //#endregion

  //#region köməkçilər — perspektivli döşəmə xətləri
  // vp: qaçış nöqtəsi; xətt arxa divarın alt kənarından (y = back) çıxıb
  // şəklin aşağı kənarına (y = 800) qədər uzanır.
  function floorRays(vp, back, x0, x1, step, stroke, opacity) {
    let d = "";
    for (let x = x0; x <= x1; x += step) {
      const xf = vp[0] + ((x - vp[0]) * (800 - vp[1])) / (back - vp[1]);
      d += "M" + x + " " + back + "L" + xf.toFixed(1) + " 800";
    }
    return (
      '<path d="' + d + '" stroke="' + stroke + '" stroke-width="2" stroke-opacity="' + opacity + '" fill="none"/>'
    );
  }

  // dərinlik üzrə üfüqi xətlər (plitə sıraları)
  function floorRows(vp, back, count, step, stroke, opacity) {
    let d = "";
    for (let k = 1; k <= count; k++) {
      const y = vp[1] + (back - vp[1]) / (1 - step * k);
      if (y > 800) break;
      d += "M0 " + y.toFixed(1) + "H1200";
    }
    return (
      '<path d="' + d + '" stroke="' + stroke + '" stroke-width="2" stroke-opacity="' + opacity + '" fill="none"/>'
    );
  }

  // divarın künc kölgələri (ambient occlusion) üçün qradiyentlər
  const AO_DEFS =
    '<linearGradient id="ao-l" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ao-r" x1="1" x2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ao-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ao-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<filter id="blur-l" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>' +
    '<filter id="blur-s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>';

  function aoBox(x, y, w, h) {
    return (
      '<rect x="' + x + '" y="' + y + '" width="36" height="' + h + '" fill="url(#ao-l)"/>' +
      '<rect x="' + (x + w - 36) + '" y="' + y + '" width="36" height="' + h + '" fill="url(#ao-r)"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" fill="url(#ao-t)"/>' +
      '<rect x="' + x + '" y="' + (y + h - 24) + '" width="' + w + '" height="24" fill="url(#ao-b)"/>'
    );
  }

  // rənglənən səthlərin ilkin (astar) rəngi — alqoritm yalnız parlaqlığı götürür
  const PRIMER = "#e7e3db";
  const PRIMER_CEIL = "#efece6";
  //#endregion

  //#region məkan: qonaq otağı
  // qaçış nöqtəsi (600, 360); arxa divar 230..970 × 110..590
  const living = {
    id: "living",
    name: "Qonaq otağı",
    surfaces: [
      { id: "back", name: "Arxa divar" },
      { id: "left", name: "Sol divar" },
      { id: "right", name: "Sağ divar" },
      { id: "ceiling", name: "Tavan" },
    ],
    start: { back: "G708" },
    art: function () {
      const CEIL = "M0 -60H1200V-45L970 110H230L0 -45Z";
      const LEFT = "M0 -45L230 110V590L0 733Z";
      const RIGHT = "M1200 -45L970 110V590L1200 733Z";
      return (
        "<defs>" +
        AO_DEFS +
        '<linearGradient id="lv-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="lv-left" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".04"/></linearGradient>' +
        '<linearGradient id="lv-right" x1="1" x2="0"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>' +
        '<radialGradient id="lv-sun" cx=".22" cy=".38" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="lv-lamp"><stop offset="0" stop-color="#fff1cf" stop-opacity=".6"/><stop offset="1" stop-color="#fff1cf" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="lv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cfeb"/><stop offset="1" stop-color="#eaf4fa"/></linearGradient>' +
        '<linearGradient id="lv-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#94643f"/><stop offset="1" stop-color="#c38e60"/></linearGradient>' +
        '<linearGradient id="lv-sofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a667d"/><stop offset="1" stop-color="#3a4457"/></linearGradient>' +
        '<linearGradient id="lv-door" x1="0" x2="1"><stop offset="0" stop-color="#7a5439"/><stop offset="1" stop-color="#9a714f"/></linearGradient>' +
        "</defs>" +
        // səthlər
        '<path data-s="ceiling" fill="' + PRIMER_CEIL + '" d="' + CEIL + '"/>' +
        '<path data-s="left" fill="' + PRIMER + '" d="' + LEFT + '"/>' +
        '<path data-s="right" fill="' + PRIMER + '" d="' + RIGHT + '"/>' +
        '<path data-s="back" fill="' + PRIMER + '" d="M230 110H970V590H230Z"/>' +
        // işıq və kölgə
        '<g class="shade">' +
        '<path fill="url(#lv-ceil)" d="' + CEIL + '"/>' +
        '<path fill="url(#lv-left)" d="' + LEFT + '"/>' +
        '<path fill="url(#lv-right)" d="' + RIGHT + '"/>' +
        '<rect x="230" y="110" width="740" height="480" fill="url(#lv-sun)"/>' +
        aoBox(230, 110, 740, 480) +
        '<rect x="455" y="232" width="320" height="160" fill="#000" opacity=".25" filter="url(#blur-s)"/>' +
        '<ellipse cx="600" cy="560" rx="310" ry="70" fill="#000" opacity=".28" filter="url(#blur-l)"/>' +
        '<circle cx="900" cy="300" r="200" fill="url(#lv-lamp)"/>' +
        "</g>" +
        // döşəmə
        '<path fill="url(#lv-floor)" d="M0 733L230 590H970L1200 733V800H0Z"/>' +
        floorRays([600, 360], 590, 230, 970, 46, "#5e3d25", 0.35) +
        '<path d="M110 700L300 632L480 690L260 790Z" fill="#fff" opacity=".1"/>' +
        // plintuslar
        '<rect x="230" y="578" width="740" height="12" fill="#f4f2ee"/>' +
        '<path d="M0 713L230 578V590L0 733Z" fill="#eceae5"/>' +
        '<path d="M1200 713L970 578V590L1200 733Z" fill="#eceae5"/>' +
        // pəncərə (sol divar)
        '<path d="M60 135L180 185V430L60 450Z" fill="url(#lv-sky)"/>' +
        '<path d="M60 360Q95 330 128 352T180 350V430L60 450Z" fill="#8fb38a" opacity=".7"/>' +
        '<path d="M60 135L180 185V430L60 450Z" fill="none" stroke="#f7f5f0" stroke-width="10" stroke-linejoin="round"/>' +
        '<path d="M120 160V440M60 293L180 308" stroke="#f7f5f0" stroke-width="6" fill="none"/>' +
        '<path d="M48 452L188 432L198 440L48 468Z" fill="#f7f5f0"/>' +
        // qapı (sağ divar)
        '<path d="M1008 270L1132 242V691L1008 614Z" fill="#f4f2ee"/>' +
        '<path d="M1020 283L1120 265V683L1020 621Z" fill="url(#lv-door)"/>' +
        '<path d="M1034 305L1106 293V455L1034 452ZM1034 480L1106 485V650L1034 606Z" fill="#000" opacity=".12"/>' +
        '<circle cx="1106" cy="470" r="6" fill="#e2c98f"/>' +
        // xalça
        '<path d="M375 640H825L930 770H270Z" fill="#8f3a3e"/>' +
        '<path d="M395 650H805L893 760H307Z" fill="none" stroke="#ecd9b8" stroke-width="3" opacity=".75"/>' +
        '<path d="M470 690H730M430 725H770" stroke="#ecd9b8" stroke-width="2" opacity=".35" fill="none"/>' +
        // tablo
        '<rect x="440" y="215" width="320" height="160" fill="#2a2522"/>' +
        '<rect x="452" y="227" width="296" height="136" fill="#f4f1ea"/>' +
        '<circle cx="545" cy="282" r="30" fill="#c9142c" opacity=".85"/>' +
        '<path d="M452 363V330Q520 285 590 322T748 305V363Z" fill="#2f5a55"/>' +
        '<path d="M452 363V345Q560 318 650 344T748 338V363Z" fill="#d9b36c"/>' +
        // divan
        '<ellipse class="shade" cx="600" cy="628" rx="300" ry="20" fill="#000" opacity=".38" filter="url(#blur-s)"/>' +
        '<rect x="385" y="430" width="430" height="110" rx="26" fill="url(#lv-sofa)"/>' +
        '<rect x="370" y="505" width="460" height="98" rx="18" fill="#465166"/>' +
        '<rect x="412" y="508" width="185" height="32" rx="12" fill="#56627a"/>' +
        '<rect x="603" y="508" width="185" height="32" rx="12" fill="#56627a"/>' +
        '<rect x="350" y="468" width="62" height="142" rx="22" fill="#3d4759"/>' +
        '<rect x="788" y="468" width="62" height="142" rx="22" fill="#3d4759"/>' +
        '<rect x="370" y="610" width="10" height="16" fill="#2a2522"/><rect x="820" y="610" width="10" height="16" fill="#2a2522"/>' +
        '<rect x="420" y="452" width="92" height="72" rx="18" fill="#d9b36c" transform="rotate(-8 466 488)"/>' +
        '<rect x="688" y="452" width="92" height="72" rx="18" fill="#efe9dd" transform="rotate(7 734 488)"/>' +
        '<rect x="520" y="462" width="72" height="58" rx="16" fill="#c9142c" opacity=".9" transform="rotate(-3 556 491)"/>' +
        // torşer
        '<ellipse cx="900" cy="624" rx="34" ry="8" fill="#2a2522"/>' +
        '<path d="M900 330V622" stroke="#2a2522" stroke-width="5" fill="none"/>' +
        '<path d="M856 332L870 270H930L944 332Z" fill="#f3e5c6"/>' +
        // bitki
        '<ellipse class="shade" cx="292" cy="632" rx="46" ry="9" fill="#000" opacity=".3" filter="url(#blur-s)"/>' +
        '<g fill="#3f6b4b"><ellipse cx="270" cy="470" rx="16" ry="58" transform="rotate(-24 270 470)"/><ellipse cx="315" cy="462" rx="16" ry="60" transform="rotate(22 315 462)"/></g>' +
        '<g fill="#568a62"><ellipse cx="292" cy="450" rx="15" ry="66"/><ellipse cx="252" cy="512" rx="13" ry="44" transform="rotate(-50 252 512)"/><ellipse cx="334" cy="508" rx="13" ry="44" transform="rotate(50 334 508)"/></g>' +
        '<path d="M258 548H326L316 630H268Z" fill="#b8643f"/>' +
        '<path d="M258 548H326V560H258Z" fill="#a0532f"/>'
      );
    },
  };
  //#endregion

  //#region məkan: yataq otağı
  // qaçış nöqtəsi (480, 370); arxa divar 120..860 × 110..610
  const bedroom = {
    id: "bedroom",
    name: "Yataq otağı",
    surfaces: [
      { id: "back", name: "Arxa divar" },
      { id: "panel", name: "Divar paneli" },
      { id: "side", name: "Yan divarlar" },
      { id: "ceiling", name: "Tavan" },
    ],
    start: { back: "V904", panel: "W105" },
    art: function () {
      const CEIL = "M0 -130H1200V-123L860 110H120L0 23Z";
      const LEFT = "M0 23L120 110V610L0 690Z";
      const RIGHT = "M1200 -123L860 110V610L1200 825Z";
      let panels = "";
      for (let x = 140; x < 840; x += 120) {
        panels +=
          '<rect x="' + x + '" y="422" width="100" height="164" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>' +
          '<rect x="' + (x + 2) + '" y="424" width="100" height="164" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>';
      }
      return (
        "<defs>" +
        AO_DEFS +
        '<linearGradient id="bd-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="bd-left" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>' +
        '<linearGradient id="bd-right" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>' +
        '<radialGradient id="bd-sun" cx=".85" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="bd-lamp"><stop offset="0" stop-color="#ffe9bf" stop-opacity=".62"/><stop offset="1" stop-color="#ffe9bf" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c9a0"/><stop offset=".55" stop-color="#f3dcc2"/><stop offset="1" stop-color="#dfe9ef"/></linearGradient>' +
        '<linearGradient id="bd-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b48d66"/><stop offset="1" stop-color="#d4b089"/></linearGradient>' +
        '<linearGradient id="bd-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8f95"/><stop offset="1" stop-color="#5f7076"/></linearGradient>' +
        "</defs>" +
        '<path data-s="ceiling" fill="' + PRIMER_CEIL + '" d="' + CEIL + '"/>' +
        '<g data-s="side"><path fill="' + PRIMER + '" d="' + LEFT + '"/><path fill="' + PRIMER + '" d="' + RIGHT + '"/></g>' +
        '<path data-s="back" fill="' + PRIMER + '" d="M120 110H860V390H120Z"/>' +
        '<path data-s="panel" fill="' + PRIMER + '" d="M120 400H860V610H120Z"/>' +
        '<g class="shade">' +
        '<path fill="url(#bd-ceil)" d="' + CEIL + '"/>' +
        '<path fill="url(#bd-left)" d="' + LEFT + '"/>' +
        '<path fill="url(#bd-right)" d="' + RIGHT + '"/>' +
        '<rect x="120" y="110" width="740" height="500" fill="url(#bd-sun)"/>' +
        aoBox(120, 110, 740, 500) +
        panels +
        '<rect x="120" y="402" width="740" height="10" fill="#000" opacity=".1"/>' +
        '<rect x="300" y="315" width="400" height="240" rx="18" fill="#000" opacity=".3" filter="url(#blur-l)"/>' +
        '<circle cx="217" cy="455" r="150" fill="url(#bd-lamp)"/>' +
        '<circle cx="763" cy="455" r="150" fill="url(#bd-lamp)"/>' +
        '<path d="M960 136L1110 63V519L960 484Z" fill="#fff" opacity=".12" filter="url(#blur-l)"/>' +
        "</g>" +
        // karniz
        '<rect x="120" y="388" width="740" height="14" fill="#f4f2ee"/>' +
        '<rect x="120" y="386" width="740" height="3" fill="#fff"/>' +
        // döşəmə
        '<path fill="url(#bd-floor)" d="M0 690L120 610H860L1200 825V830H0Z"/>' +
        floorRays([480, 370], 610, 120, 860, 40, "#7e5a38", 0.3) +
        '<rect x="120" y="598" width="740" height="12" fill="#f4f2ee"/>' +
        // pəncərə və pərdə (sağ divar)
        '<path d="M960 136L1110 63V519L960 484Z" fill="url(#bd-sky)"/>' +
        '<path d="M960 420Q1010 395 1060 420T1110 430V519L960 484Z" fill="#9aa9a0" opacity=".55"/>' +
        '<path d="M960 136L1110 63V519L960 484Z" fill="none" stroke="#f7f5f0" stroke-width="10" stroke-linejoin="round"/>' +
        '<path d="M1035 100V502M960 310L1110 291" stroke="#f7f5f0" stroke-width="6" fill="none"/>' +
        '<path d="M1118 50L1168 26Q1180 400 1172 842L1124 810Q1134 420 1118 50Z" fill="#efe6d8"/>' +
        '<path d="M1134 60Q1146 420 1138 816M1152 46Q1162 420 1156 828" stroke="#000" stroke-opacity=".08" stroke-width="5" fill="none"/>' +
        // tablolar
        '<rect x="340" y="178" width="84" height="104" fill="#2a2522"/><rect x="347" y="185" width="70" height="90" fill="#f4f1ea"/>' +
        '<path d="M352 262L372 228L388 248L398 236L412 262Z" fill="#4f7f73"/><circle cx="398" cy="208" r="8" fill="#e3ae45"/>' +
        '<rect x="448" y="166" width="104" height="128" fill="#2a2522"/><rect x="455" y="173" width="90" height="114" fill="#f4f1ea"/>' +
        '<path d="M470 270Q500 190 530 270" fill="none" stroke="#c0673e" stroke-width="6"/><circle cx="500" cy="220" r="12" fill="#2e4a6b"/>' +
        '<rect x="576" y="178" width="84" height="104" fill="#2a2522"/><rect x="583" y="185" width="70" height="90" fill="#f4f1ea"/>' +
        '<rect x="596" y="200" width="44" height="60" fill="#b79aa6"/><rect x="608" y="214" width="20" height="46" fill="#6a4a6e"/>' +
        // tumbalar və lampalar
        '<rect x="168" y="516" width="100" height="12" rx="3" fill="#a07a58"/>' +
        '<rect x="172" y="528" width="92" height="84" fill="#8b6a4f"/>' +
        '<rect x="180" y="540" width="76" height="30" fill="#000" opacity=".1"/><circle cx="218" cy="555" r="4" fill="#e2c98f"/>' +
        '<rect x="712" y="516" width="100" height="12" rx="3" fill="#a07a58"/>' +
        '<rect x="716" y="528" width="92" height="84" fill="#8b6a4f"/>' +
        '<rect x="724" y="540" width="76" height="30" fill="#000" opacity=".1"/><circle cx="762" cy="555" r="4" fill="#e2c98f"/>' +
        '<path d="M208 516L212 478H222L226 516Z" fill="#d7cfc2"/><path d="M186 480L196 432H238L248 480Z" fill="#f6ead0"/>' +
        '<path d="M754 516L758 478H768L772 516Z" fill="#d7cfc2"/><path d="M732 480L742 432H784L794 480Z" fill="#f6ead0"/>' +
        // çarpayı
        '<rect x="290" y="300" width="400" height="245" rx="20" fill="url(#bd-head)"/>' +
        '<g fill="#000" opacity=".16"><circle cx="360" cy="350" r="5"/><circle cx="440" cy="350" r="5"/><circle cx="520" cy="350" r="5"/><circle cx="600" cy="350" r="5"/><circle cx="400" cy="400" r="5"/><circle cx="480" cy="400" r="5"/><circle cx="560" cy="400" r="5"/><circle cx="640" cy="400" r="5"/></g>' +
        '<path d="M300 520H680L907 690H96Z" fill="#f2efe9"/>' +
        '<path d="M96 690H907V762H96Z" fill="#e2ddd3"/>' +
        '<path d="M96 762H907V780H96Z" fill="#7d5d44"/>' +
        '<path class="shade" d="M300 520H680L700 540H280Z" fill="#000" opacity=".08"/>' +
        '<rect x="326" y="466" width="148" height="72" rx="24" fill="#fbfaf7"/>' +
        '<rect x="506" y="466" width="148" height="72" rx="24" fill="#fbfaf7"/>' +
        '<rect x="444" y="492" width="92" height="58" rx="18" fill="#d9b36c"/>' +
        '<path d="M174 625H821L907 690H96Z" fill="#b5654a"/>' +
        '<path d="M96 690H907V742Q500 752 96 742Z" fill="#9e553d"/>' +
        '<path class="shade" d="M174 625H821L830 634H165Z" fill="#000" opacity=".12"/>'
      );
    },
  };
  //#endregion

  //#region məkan: mətbəx
  // qaçış nöqtəsi (620, 380); arxa divar 200..1000 × 90..620
  const kitchen = {
    id: "kitchen",
    name: "Mətbəx",
    surfaces: [
      { id: "back", name: "Arxa divar" },
      { id: "cabinets", name: "Mətbəx dolabları" },
      { id: "side", name: "Yan divarlar" },
      { id: "ceiling", name: "Tavan" },
    ],
    start: { cabinets: "G703" },
    art: function () {
      const CEIL = "M0 -70H1200V-63L1000 90H200L0 -48Z";
      const LEFT = "M0 -48L200 90V620L0 734Z";
      const RIGHT = "M1200 -63L1000 90V620L1200 746Z";
      let gaps = "";
      [335, 470, 605, 740, 865].forEach(function (x) {
        gaps += '<rect x="' + x + '" y="470" width="4" height="170" fill="#000" opacity=".22"/>';
      });
      let handles = "";
      [262, 400, 537, 672, 803].forEach(function (x) {
        handles += '<rect x="' + (x - 22) + '" y="490" width="44" height="5" rx="2" fill="#b8bcc0"/>';
      });
      return (
        "<defs>" +
        AO_DEFS +
        '<pattern id="kt-tile" width="48" height="16" patternUnits="userSpaceOnUse"><rect width="48" height="16" fill="#f3f1ec"/><path d="M0 .5H48M24 0V8M0 8.5H48M0 8V16M48 8V16" stroke="#d2cdc3" stroke-width="1.4"/></pattern>' +
        '<linearGradient id="kt-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="kt-left" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>' +
        '<linearGradient id="kt-right" x1="1" x2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".04"/></linearGradient>' +
        '<radialGradient id="kt-sun" cx=".66" cy=".42" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="kt-lamp"><stop offset="0" stop-color="#fff0cc" stop-opacity=".5"/><stop offset="1" stop-color="#fff0cc" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="kt-cab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>' +
        '<linearGradient id="kt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fcbe9"/><stop offset="1" stop-color="#e5f2f9"/></linearGradient>' +
        '<linearGradient id="kt-oven" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4046"/><stop offset="1" stop-color="#1c2024"/></linearGradient>' +
        "</defs>" +
        '<path data-s="ceiling" fill="' + PRIMER_CEIL + '" d="' + CEIL + '"/>' +
        '<g data-s="side"><path fill="' + PRIMER + '" d="' + LEFT + '"/><path fill="' + PRIMER + '" d="' + RIGHT + '"/></g>' +
        '<path data-s="back" fill="' + PRIMER + '" d="M200 90H1000V620H200Z"/>' +
        '<g class="shade">' +
        '<path fill="url(#kt-ceil)" d="' + CEIL + '"/>' +
        '<path fill="url(#kt-left)" d="' + LEFT + '"/>' +
        '<path fill="url(#kt-right)" d="' + RIGHT + '"/>' +
        '<rect x="200" y="90" width="800" height="530" fill="url(#kt-sun)"/>' +
        aoBox(200, 90, 800, 530) +
        '<circle cx="420" cy="200" r="150" fill="url(#kt-lamp)"/>' +
        '<circle cx="780" cy="200" r="150" fill="url(#kt-lamp)"/>' +
        '<rect x="222" y="138" width="256" height="210" fill="#000" opacity=".22" filter="url(#blur-s)"/>' +
        "</g>" +
        // döşəmə
        '<path fill="#d9d3c8" d="M0 734L200 620H1000L1200 746V800H0Z"/>' +
        floorRays([620, 380], 620, 200, 1000, 80, "#a39b8e", 0.55) +
        floorRows([620, 380], 620, 3, 0.15, "#a39b8e", 0.55) +
        '<rect class="shade" x="160" y="648" width="880" height="40" fill="#000" opacity=".18" filter="url(#blur-s)"/>' +
        // saat (sol divar)
        '<ellipse cx="100" cy="250" rx="30" ry="44" fill="#fbfaf7" stroke="#2a2522" stroke-width="5"/>' +
        '<path d="M100 250V222M100 250L116 262" stroke="#2a2522" stroke-width="4" stroke-linecap="round" fill="none"/>' +
        // tablo (sağ divar)
        '<path d="M1060 167L1150 123V345L1060 351Z" fill="#2a2522"/>' +
        '<path d="M1068 176L1142 140V337L1068 342Z" fill="#f4f1ea"/>' +
        '<path d="M1080 300Q1100 250 1130 290V330L1080 334Z" fill="#c0673e"/><circle cx="1112" cy="205" r="14" fill="#e3ae45"/>' +
        // pəncərə
        '<rect x="600" y="150" width="260" height="220" fill="url(#kt-sky)"/>' +
        '<path d="M600 300Q670 250 740 290T860 280V370H600Z" fill="#86ad7d" opacity=".75"/>' +
        '<path d="M600 330Q700 300 790 330T860 325V370H600Z" fill="#5f8a5a" opacity=".8"/>' +
        '<rect x="600" y="150" width="260" height="220" fill="none" stroke="#f7f5f0" stroke-width="12"/>' +
        '<path d="M730 150V370" stroke="#f7f5f0" stroke-width="8" fill="none"/>' +
        // fartuk (plitə)
        '<rect x="200" y="378" width="800" height="70" fill="url(#kt-tile)"/>' +
        '<rect x="588" y="368" width="284" height="12" fill="#f7f5f0"/>' +
        // rəflər
        '<rect x="880" y="222" width="112" height="10" fill="#9b7b5b"/><rect x="880" y="302" width="112" height="10" fill="#9b7b5b"/>' +
        '<rect class="shade" x="880" y="232" width="112" height="14" fill="#000" opacity=".15" filter="url(#blur-s)"/>' +
        '<rect x="894" y="186" width="24" height="36" rx="5" fill="#dfe6e8"/><rect x="926" y="178" width="26" height="44" rx="5" fill="#c9d5d8"/><circle cx="972" cy="206" r="16" fill="#c0673e"/>' +
        '<path d="M890 302Q915 262 940 302Z" fill="#f4f1ea"/><rect x="950" y="270" width="30" height="32" rx="4" fill="#e3ae45"/>' +
        // yuxarı dolablar
        '<g data-s="cabinets" fill="' + PRIMER + '">' +
        '<rect x="215" y="130" width="124" height="200"/>' +
        '<rect x="343" y="130" width="124" height="200"/>' +
        '<rect x="188" y="470" width="824" height="170"/>' +
        "</g>" +
        '<g class="shade">' +
        '<rect x="215" y="130" width="252" height="200" fill="url(#kt-cab)"/>' +
        '<rect x="188" y="470" width="824" height="170" fill="url(#kt-cab)"/>' +
        '<rect x="339" y="130" width="4" height="200" fill="#000" opacity=".22"/>' +
        '<rect x="229" y="144" width="96" height="172" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="3"/>' +
        '<rect x="357" y="144" width="96" height="172" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="3"/>' +
        gaps +
        "</g>" +
        '<rect x="324" y="290" width="5" height="30" rx="2" fill="#b8bcc0"/><rect x="351" y="290" width="5" height="30" rx="2" fill="#b8bcc0"/>' +
        handles +
        // tezgah
        '<path d="M196 446H1004L1014 470H186Z" fill="#2f3438"/>' +
        '<path d="M196 446H1004V449H196Z" fill="#5a6168"/>' +
        '<rect x="188" y="640" width="824" height="16" fill="#23272b"/>' +
        // soba
        '<rect x="875" y="478" width="128" height="156" rx="4" fill="url(#kt-oven)"/>' +
        '<rect x="889" y="520" width="100" height="92" rx="4" fill="#0f1215" opacity=".7"/>' +
        '<rect x="895" y="494" width="88" height="6" rx="3" fill="#b8bcc0"/>' +
        // kran və tezgah üstü
        '<path d="M735 446V404Q735 390 750 390H760" stroke="#b8bcc0" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<path d="M262 446H318L312 410H268Z" fill="#b8643f"/>' +
        '<g fill="#4f7f55"><ellipse cx="290" cy="392" rx="10" ry="26" transform="rotate(-25 290 392)"/><ellipse cx="302" cy="386" rx="10" ry="28" transform="rotate(20 302 386)"/><ellipse cx="284" cy="400" rx="8" ry="20" transform="rotate(-60 284 400)"/></g>' +
        '<path d="M480 446Q480 418 520 418T560 446Z" fill="#e9e5dc"/><circle cx="508" cy="416" r="11" fill="#f2c94c"/><circle cx="528" cy="414" r="11" fill="#e3ae45"/>' +
        // asma lampalar
        '<path d="M420 -10V150M780 -10V150" stroke="#2a2522" stroke-width="3" fill="none"/>' +
        '<path d="M384 180Q384 146 420 146T456 180Z" fill="#2a2522"/><ellipse cx="420" cy="181" rx="22" ry="5" fill="#fff4d6"/>' +
        '<path d="M744 180Q744 146 780 146T816 180Z" fill="#2a2522"/><ellipse cx="780" cy="181" rx="22" ry="5" fill="#fff4d6"/>'
      );
    },
  };
  //#endregion

  //#region məkan: ev fasadı
  // perspektivsiz ön görünüş; günəş soldan düşür
  const facade = {
    id: "facade",
    name: "Ev fasadı",
    surfaces: [
      { id: "wall", name: "Fasad" },
      { id: "trim", name: "Çərçivə və karniz" },
      { id: "door", name: "Qapılar" },
      { id: "fence", name: "Hasar" },
    ],
    start: { wall: "S305", door: "B808" },
    art: function () {
      // pəncərə: çərçivə (trim) + şüşə
      const WINDOWS = [
        [330, 350, 100, 120],
        [550, 350, 100, 120],
        [770, 350, 100, 120],
        [330, 520, 100, 120],
        [770, 520, 100, 120],
      ];
      let frames = "";
      let glass = "";
      WINDOWS.forEach(function (w) {
        const x = w[0], y = w[1], ww = w[2], hh = w[3];
        frames +=
          '<path fill-rule="evenodd" d="M' + (x - 12) + " " + (y - 12) + "h" + (ww + 24) + "v" + (hh + 24) + "h-" + (ww + 24) + "Z" +
          "M" + x + " " + y + "v" + hh + "h" + ww + "v-" + hh + 'Z"/>' +
          '<rect x="' + (x + ww / 2 - 4) + '" y="' + y + '" width="8" height="' + hh + '"/>' +
          '<rect x="' + x + '" y="' + (y + hh * 0.42) + '" width="' + ww + '" height="7"/>' +
          '<rect x="' + (x - 20) + '" y="' + (y + hh + 10) + '" width="' + (ww + 40) + '" height="10"/>';
        glass +=
          '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="url(#fc-glass)"/>' +
          '<path d="M' + (x + 10) + " " + (y + hh) + "L" + (x + ww * 0.7) + " " + y + "H" + (x + ww * 0.85) + "L" + (x + 26) + " " + (y + hh) + 'Z" fill="#fff" opacity=".18"/>';
      });
      let pickets = "";
      for (let x = 6; x < 236; x += 26) {
        pickets += '<path d="M' + x + " 740V604L" + (x + 8) + " 590L" + (x + 16) + " 604V740Z" + '"/>';
      }
      for (let x = 1154; x < 1200; x += 26) {
        pickets += '<path d="M' + x + " 740V604L" + (x + 8) + " 590L" + (x + 16) + " 604V740Z" + '"/>';
      }
      let tiles = "";
      for (let y = 175; y < 312; y += 18) tiles += "M200 " + y + "H1000";
      let garage = "";
      for (let y = 522; y < 680; y += 26) garage += '<rect x="975" y="' + y + '" width="140" height="3" fill="#000" opacity=".14"/>';
      return (
        "<defs>" +
        '<linearGradient id="fc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc0e6"/><stop offset="1" stop-color="#e3f0f8"/></linearGradient>' +
        '<linearGradient id="fc-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8db462"/><stop offset="1" stop-color="#5f8a3e"/></linearGradient>' +
        '<linearGradient id="fc-sun" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>' +
        '<linearGradient id="fc-eave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="fc-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ebdd3"/><stop offset="1" stop-color="#4f6f86"/></linearGradient>' +
        '<linearGradient id="fc-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e433a"/><stop offset="1" stop-color="#553129"/></linearGradient>' +
        '<filter id="blur-s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>' +
        '<clipPath id="fc-roof-clip"><path d="M225 312L330 150H870L975 312Z"/></clipPath>' +
        "</defs>" +
        '<rect width="1200" height="800" fill="url(#fc-sky)"/>' +
        '<g fill="#fff" opacity=".85"><ellipse cx="200" cy="120" rx="80" ry="24"/><ellipse cx="250" cy="104" rx="50" ry="26"/><ellipse cx="1000" cy="90" rx="90" ry="22"/><ellipse cx="1060" cy="76" rx="48" ry="22"/></g>' +
        '<path d="M0 560Q200 470 420 530T820 510T1200 540V700H0Z" fill="#a9bfae" opacity=".7"/>' +
        '<rect y="660" width="1200" height="140" fill="url(#fc-grass)"/>' +
        // ağac
        '<rect x="96" y="380" width="18" height="300" fill="#6b4a3a"/>' +
        '<g fill="#4f7a45"><circle cx="105" cy="330" r="70"/><circle cx="60" cy="380" r="50"/><circle cx="150" cy="385" r="52"/></g>' +
        '<g fill="#5f8c52"><circle cx="90" cy="300" r="42"/><circle cx="135" cy="345" r="38"/></g>' +
        // fasad
        '<path data-s="wall" fill="' + PRIMER + '" d="M250 312H950V440H1140V680H250Z"/>' +
        '<g class="shade">' +
        '<path fill="url(#fc-sun)" d="M250 312H950V440H1140V680H250Z"/>' +
        '<rect x="250" y="326" width="700" height="34" fill="url(#fc-eave)"/>' +
        '<rect x="950" y="442" width="190" height="26" fill="url(#fc-eave)"/>' +
        '<rect x="950" y="440" width="26" height="240" fill="#000" opacity=".08"/>' +
        "</g>" +
        // dam
        '<path d="M225 312L330 150H870L975 312Z" fill="url(#fc-roof)"/>' +
        '<path clip-path="url(#fc-roof-clip)" d="' + tiles + '" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/>' +
        '<rect x="760" y="112" width="44" height="70" fill="#9c5a3c"/><rect x="754" y="104" width="56" height="12" fill="#6b4a3a"/>' +
        // çərçivələr, karniz
        glass +
        '<g data-s="trim" fill="' + PRIMER + '">' +
        frames +
        '<rect x="212" y="310" width="776" height="16"/>' +
        '<rect x="940" y="428" width="212" height="14"/>' +
        '<path fill-rule="evenodd" d="M545 505H655V680H545ZM557 517V680H643V517Z"/>' +
        "</g>" +
        '<g class="shade">' +
        '<rect x="212" y="326" width="776" height="6" fill="#000" opacity=".18"/>' +
        '<rect x="940" y="442" width="212" height="5" fill="#000" opacity=".18"/>' +
        "</g>" +
        // sokol
        '<rect x="250" y="652" width="890" height="28" fill="#9b958b"/>' +
        '<path d="M250 652H1140" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/>' +
        // qapılar
        '<g data-s="door" fill="' + PRIMER + '">' +
        '<rect x="557" y="517" width="86" height="163"/>' +
        '<rect x="975" y="500" width="140" height="180"/>' +
        "</g>" +
        '<g class="shade">' +
        '<rect x="557" y="517" width="86" height="163" fill="url(#fc-sun)"/>' +
        '<rect x="569" y="532" width="62" height="54" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>' +
        '<rect x="569" y="602" width="62" height="64" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>' +
        garage +
        '<rect x="975" y="500" width="140" height="18" fill="#000" opacity=".12"/>' +
        "</g>" +
        '<circle cx="631" cy="600" r="5" fill="#d8c08a"/>' +
        // qapı üstü, pilləkən, fənər
        '<path d="M536 505H664L652 486H548Z" fill="#553129"/>' +
        '<rect x="540" y="680" width="120" height="12" fill="#c4bcaf"/><rect x="528" y="692" width="144" height="12" fill="#b3aa9c"/>' +
        '<path d="M528 704H672L720 800H480Z" fill="#cfc7b9"/>' +
        '<rect x="672" y="548" width="14" height="24" rx="3" fill="#2a2522"/><rect x="675" y="552" width="8" height="14" fill="#ffe7a8"/>' +
        // kollar
        '<g class="shade"><ellipse cx="390" cy="700" rx="140" ry="12" fill="#000" opacity=".2" filter="url(#blur-s)"/><ellipse cx="820" cy="700" rx="130" ry="12" fill="#000" opacity=".2" filter="url(#blur-s)"/></g>' +
        '<g fill="#3f6b3c"><ellipse cx="300" cy="672" rx="52" ry="36"/><ellipse cx="380" cy="662" rx="62" ry="44"/><ellipse cx="470" cy="676" rx="50" ry="32"/><ellipse cx="740" cy="674" rx="52" ry="34"/><ellipse cx="820" cy="662" rx="60" ry="44"/><ellipse cx="900" cy="676" rx="46" ry="30"/></g>' +
        '<g fill="#56874c"><ellipse cx="370" cy="648" rx="36" ry="22"/><ellipse cx="810" cy="648" rx="34" ry="22"/><ellipse cx="290" cy="660" rx="24" ry="16"/></g>' +
        // hasar
        '<g data-s="fence" fill="' + PRIMER + '">' +
        pickets +
        '<rect x="0" y="630" width="240" height="12"/><rect x="0" y="700" width="240" height="12"/>' +
        '<rect x="1150" y="630" width="50" height="12"/><rect x="1150" y="700" width="50" height="12"/>' +
        "</g>" +
        '<g class="shade"><rect x="0" y="642" width="240" height="6" fill="#000" opacity=".15"/><rect x="0" y="712" width="240" height="6" fill="#000" opacity=".15"/></g>'
      );
    },
  };
  //#endregion

  ZAN.VZ_SCENES = [living, bedroom, kitchen, facade];
})(window.ZAN);
