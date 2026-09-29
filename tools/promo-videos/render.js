/*
  ZAN promo videolarının render-i: səhnəni başsız brauzerdə kadr-kadr çəkir, ffmpeg ilə MP4 yığır.

  npm install
  python sound.py a1 out/a1.wav                                   # səs (numpy, scipy)
  node render.js a1 --samples 6 --audio out/a1.wav --out out/zan-brand.mp4
  node render.js m1 --samples 6 --out out/zan-mission.mp4
  python sound.py m4 out/m4.wav
  node render.js m4 --samples 6 --audio out/m4.wav --out out/zan-film.mp4
  node render.js a1 --poster 5.5 --out out/zan-brand-poster.jpg  # poster
  node render.js a1 --sheet 1,3,6.5,12 --cols 2                   # yoxlama üçün kadr vərəqi

  Səhnə: <name>.html (bu qovluqda). /assets/* layihənin assets qovluğundan verilir.
  Canlı baxış: npx serve ../.. → /tools/promo-videos/a1.html (?t=6.5 — bir kadr)
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
let puppeteer;
const ffmpeg = require("ffmpeg-static");

const REPO = process.env.ZAN_REPO || path.resolve(__dirname, "../..");
// Chromium əsaslı istənilən brauzer olar (Chrome, Edge)
const BROWSER = process.env.ZAN_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const args = process.argv.slice(2);
const name = args[0];
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };

const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  const file = u.startsWith("/assets/") ? path.join(REPO, u) : path.join(__dirname, u);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

(async () => {
  puppeteer = (await import("puppeteer-core")).default;
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await puppeteer.launch({
    executablePath: BROWSER,
    headless: "new",
    args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11", "--enable-unsafe-swiftshader", "--disable-background-timer-throttling", "--force-color-profile=srgb"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[page]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(`http://localhost:${port}/${name}.html`);
  await page.waitForFunction("window.__ready === true", { timeout: 120000 });
  const dur = await page.evaluate("window.__duration");
  const fps = await page.evaluate("window.__fps");
  const save = (dataUrl, file) => fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));

  if (opt("sheet")) {
    const times = opt("sheet").split(",").map(Number);
    const t0 = Date.now();
    const d = await page.evaluate((t, c, w) => window.__sheet(t, c, w), times, +opt("cols", 3), +opt("w", 640));
    const out = opt("out", path.join(__dirname, "out", `${name}-sheet.jpg`));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    save(d, out);
    console.log("sheet", out, ((Date.now() - t0) / times.length).toFixed(0) + "ms/frame");
  } else if (opt("poster")) {
    const f = Math.round(+opt("poster") * fps);
    const d = await page.evaluate((f) => window.__render(f, 1, 0.9), f);
    save(d, opt("out"));
    console.log("poster", opt("out"));
  } else {
    const samples = +opt("samples", 3);
    const f0 = Math.round(+opt("from", 0) * fps), f1 = Math.round(+opt("to", dur) * fps);
    const out = opt("out", path.join(__dirname, "out", `${name}.mp4`));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const audio = opt("audio");
    const ff = spawn(ffmpeg, [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      ...(audio ? ["-i", audio] : []),
      "-c:v", "libx264", "-preset", "slow", "-crf", opt("crf", "22"), "-pix_fmt", "yuv420p",
      "-profile:v", "high", "-movflags", "+faststart",
      ...(audio ? ["-c:a", "aac", "-b:a", "160k", "-shortest"] : ["-an"]),
      out,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const d = await page.evaluate((f, s) => window.__render(f, s, 0.95), f, samples);
      const buf = Buffer.from(d.split(",")[1], "base64");
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if ((f - f0) % 30 === 0) {
        const el = (Date.now() - t0) / 1000, done = f - f0 + 1;
        process.stdout.write(`frame ${f}/${f1}  ${(el / done * 1000).toFixed(0)}ms/f  eta ${((f1 - f) * el / done).toFixed(0)}s\n`);
      }
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    console.log("done", out, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
