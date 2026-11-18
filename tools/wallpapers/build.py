"""
build.py — divar kağızı dizaynlarını sayt üçün hazırlayır
--------------------------------------------------------------------------
İşlətmək (layihə kökündən):  python tools/wallpapers/build.py
Lazımdır:                     Python 3 + Pillow (pip install pillow)

Nə edir:
  1) catalogs.json-dakı hər kataloq üçün source qovluğundakı şəkilləri oxuyur
     (jpg, jpeg, png, webp). Fayl adı = dizayn kodu: "044112.jpg" → 044112.
  2) Sayt üçün iki ölçü yazır (orijinallar çox böyükdür — 10–30 MB):
       assets/images/wallpapers/<slug>/<kod>.webp     — böyük baxış (1600 px)
       assets/images/wallpapers/<slug>/<kod>-sm.webp  — kart (640 px)
     Hazır və orijinaldan yeni olan fayl yenidən yazılmır.
  3) assets/js/wallpaper-data.js — kataloqlar, qiymətlər və kodlar (səhifələr
     buradan oxuyur). Bu fayl avtomatik yaradılır, əl ilə dəyişməyin.
  Orijinalı silinmiş dizaynın WebP faylları da silinir.

Yeni dizayn: şəkli kataloqun qovluğuna atın → skripti işə salın.
Yeni kataloq: catalogs.json-a əlavə edin → skripti işə salın → kataloqun adını
  lüğətlərə əlavə edin (cd tools/i18n && npm run extract && npm run check).
Orijinal qovluqlar (assets/*_dizaynlar/) .gitignore-dadır — serverə getmir.
"""
import json
import os
import re
import sys

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None  # bəzi orijinallar 12 000+ px-dir

# Windows konsolu (cp1252) Azərbaycan hərflərini çap edə bilmir
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG = os.path.join(os.path.dirname(__file__), "catalogs.json")
OUT_IMAGES = os.path.join(ROOT, "assets", "images", "wallpapers")
OUT_DATA = os.path.join(ROOT, "assets", "js", "wallpaper-data.js")

SIZES = [("", 1600, 82), ("-sm", 640, 78)]  # (şəkilçi, en, keyfiyyət)
EXTS = (".jpg", ".jpeg", ".png", ".webp")
CODE_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def natural_key(code):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", code)]


def convert(src, slug, code):
    """Hər ölçünü yazır; nəticədə yazılan faylların sayını qaytarır."""
    targets = [(os.path.join(OUT_IMAGES, slug, f"{code}{suffix}.webp"), width, q) for suffix, width, q in SIZES]
    src_time = os.path.getmtime(src)
    todo = [t for t in targets if not os.path.exists(t[0]) or os.path.getmtime(t[0]) < src_time]
    if not todo:
        return 0

    with Image.open(src) as im:
        # JPEG-i açanda kiçildilmiş oxu — 12 000 px şəkil saniyələrlə yox, dərhal açılır
        im.draft("RGB", (todo[0][1] * 2, todo[0][1] * 2))
        im = ImageOps.exif_transpose(im).convert("RGB")
        for path, width, quality in todo:
            out = im.copy()
            if out.width > width:
                out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
            out.save(path, "WEBP", quality=quality, method=6)
    return len(todo)


def main():
    with open(CONFIG, encoding="utf-8") as f:
        catalogs = json.load(f)["catalogs"]

    data = []
    for cat in catalogs:
        slug = cat["slug"]
        src_dir = os.path.join(ROOT, cat["source"])
        if not os.path.isdir(src_dir):
            sys.exit(f"[{slug}] qovluq tapılmadı: {cat['source']}")
        os.makedirs(os.path.join(OUT_IMAGES, slug), exist_ok=True)

        codes, written = [], 0
        for name in os.listdir(src_dir):
            base, ext = os.path.splitext(name)
            if ext.lower() not in EXTS:
                continue
            if not CODE_RE.match(base):
                print(f"  [{slug}] ötürüldü (adda boşluq / xüsusi simvol var): {name}")
                continue
            if base in codes:
                print(f"  [{slug}] təkrar kod ötürüldü: {name}")
                continue
            codes.append(base)
            written += convert(os.path.join(src_dir, name), slug, base)

        codes.sort(key=natural_key)

        # orijinalı silinmiş dizaynların WebP-lərini təmizlə
        removed = 0
        for name in os.listdir(os.path.join(OUT_IMAGES, slug)):
            code = re.sub(r"(-sm)?\.webp$", "", name)
            if name.endswith(".webp") and code not in codes:
                os.remove(os.path.join(OUT_IMAGES, slug, name))
                removed += 1

        print(f"[{slug}] {len(codes)} dizayn · yazıldı: {written} fayl · silindi: {removed}")
        data.append(
            {
                "slug": slug,
                "name": cat["name"],
                "brand": cat.get("brand", "zan"),
                "price": cat["price"],
                "color": cat.get("color", ""),
                "cover": cat.get("cover", ""),
                "designs": codes,
            }
        )

    body = json.dumps(data, ensure_ascii=False, indent=2)
    with open(OUT_DATA, "w", encoding="utf-8", newline="\n") as f:
        f.write(
            "/* ==========================================================================\n"
            "   wallpaper-data.js — divar kağızı kataloqları və dizayn kodları\n"
            "   --------------------------------------------------------------------------\n"
            "   AVTOMATİK YARADILIR: python tools/wallpapers/build.py (tools/wallpapers/catalogs.json)\n"
            "   Əl ilə dəyişməyin — növbəti işə salmada üzərinə yazılır.\n"
            "   Şəkillər: assets/images/wallpapers/<slug>/<kod>.webp və <kod>-sm.webp\n"
            "   ========================================================================== */\n\n"
            f"window.ZAN_WALLPAPERS = {body};\n"
        )
    print(f"→ {os.path.relpath(OUT_DATA, ROOT)}")


if __name__ == "__main__":
    main()
