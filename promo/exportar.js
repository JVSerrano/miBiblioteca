// Exporta la animación a MP4: captura fotogramas con Chrome y los une con ffmpeg.
// Uso: node exportar.js   (requiere Chrome y ffmpeg instalados)
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DURACION = 42;
const FPS = 30;
const FRAMES = path.join(__dirname, "frames");
const SALIDA = path.join(__dirname, "mi-biblioteca-1x1.mp4");

(async () => {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES);

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(__dirname, "index.html")).href + "?export&t=0", { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);

  const total = DURACION * FPS;
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.poner(t), i / FPS);
    await page.screenshot({ path: path.join(FRAMES, String(i).padStart(4, "0") + ".png") });
    if (i % 100 === 0) console.log(`fotograma ${i}/${total}`);
  }
  await browser.close();

  execFileSync("ffmpeg", [
    "-y", "-framerate", String(FPS), "-i", path.join(FRAMES, "%04d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart",
    SALIDA,
  ], { stdio: "inherit" });
  console.log("Listo:", SALIDA);
})();
