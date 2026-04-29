// Exporterar de fem OJS-graferna i observable-rapport.html som SVG.
// Kör: node export-svg.mjs

import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportUrl = process.env.REPORT_URL || "http://localhost:8765/observable-rapport.html";
const outDir = resolve(__dirname, "svg-export");

const charts = [
  { id: "befolkning-halland-folkmangd",          label: "Befolkningsutveckling — Hallands län (Folkmängd)" },
  { id: "aldersstruktur-halland-antal",          label: "Åldersstrukturer — Hallands län (Antal)" },
  { id: "fodda-doda-halland",                    label: "Födda och döda — Hallands län" },
  { id: "inrikes-flyttningar-halland",           label: "Inrikes flyttningar — Hallands län" },
  { id: "utrikes-flyttningar-halland",           label: "Utrikes flyttningar — Hallands län" },
];

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

  console.log(`Öppnar ${reportUrl} i headless Chrome...`);
  await page.goto(reportUrl, { waitUntil: "networkidle" });

  // Vänta tills alla OJS-grafer är renderade. Plot.plot() lägger sina SVG i
  // figure.plot-chart eller figure (utan klass) inuti plot-container/plot-chart-block.
  console.log("Väntar på att graferna ska renderas...");
  await page.waitForFunction(() => {
    const figs = document.querySelectorAll(".plot-container svg");
    return figs.length >= 5;
  }, null, { timeout: 60000 });

  // Ge OJS lite extra tid att stabilisera (label-collision iterationer m.m.)
  await page.waitForTimeout(2000);

  // Hämta alla SVG i ordning. Varje plot-container innehåller exakt en chart-svg
  // (och ev. en select/radio-svg som vi filtrerar bort).
  const svgs = await page.evaluate(() => {
    const containers = Array.from(document.querySelectorAll(".plot-container"));
    return containers.map((c) => {
      // Plotens egna SVG har xmlns="http://www.w3.org/2000/svg" i en figure
      // och är klart större än kontroll-SVG. Plocka ut den största inne i denna container.
      const allSvgs = Array.from(c.querySelectorAll("svg"));
      const chartSvg = allSvgs
        .filter((s) => {
          // Skippa pilen i select-dropdown (~9px) och liknande små
          const rect = s.getBoundingClientRect();
          return rect.width > 200 && rect.height > 100;
        })
        .sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return rb.width * rb.height - ra.width * ra.height;
        })[0];
      if (!chartSvg) return null;

      // Säkerställ att xmlns är satt
      if (!chartSvg.getAttribute("xmlns")) {
        chartSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      // Stand-alone SVG: lägg till XML-deklaration vid serialisering
      return new XMLSerializer().serializeToString(chartSvg);
    });
  });

  console.log(`Hittade ${svgs.filter(Boolean).length} grafer.`);

  let saved = 0;
  for (let i = 0; i < charts.length; i++) {
    const meta = charts[i];
    const svg = svgs[i];
    if (!svg) {
      console.warn(`  ⚠ ${meta.id}: ingen graf hittades`);
      continue;
    }
    const outPath = resolve(outDir, `${meta.id}.svg`);
    const xmlDecl = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
    await writeFile(outPath, xmlDecl + svg, "utf8");
    console.log(`  ✓ ${meta.id}.svg`);
    saved++;
  }

  await browser.close();
  console.log(`\nKlart. Sparade ${saved} SVG-filer i:\n  ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
