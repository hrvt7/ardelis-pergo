import devServer from "@hono/vite-dev-server"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import fs from "node:fs"
import { buildStructuredData, getSeoPage, SEO_SITEMAP_PATHS } from "./contracts/seo"

const __dirname = import.meta.dirname

// Statikus robots.txt és sitemap.xml a buildbe (korábban a Kimi Node-szerver
// adta ki őket). Az abszolút URL-ekhez a PUBLIC_SITE_URL kell.
const DEFAULT_SITE = "https://lamelix.vercel.app"
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

/** Az index.html-ből oldalankénti, előre kitöltött fejlécű változat: a keresők és a közösségi előnézet-robotok JavaScript nélkül is a helyes címet látják. */
function prerenderedHead(html: string, pathname: string, origin: string) {
  const page = getSeoPage(pathname)
  const english = page.path === "/en"
  const platform = page.key === "platform"
  const image = `${origin}${platform ? "/assets/lamelix-og.png" : "/assets/ardelis-og.jpg"}`
  const url = `${origin}${page.path === "/" ? "/" : page.path}`
  const meta = [
    `<meta property="og:locale" content="${english ? "en_US" : "hu_HU"}" />`, `<meta property="og:site_name" content="Lamelix" />`, `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`, `<meta property="og:description" content="${esc(page.description)}" />`, `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`, `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(page.title)}" />`, `<meta name="twitter:description" content="${esc(page.description)}" />`, `<meta name="twitter:image" content="${image}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="hu-HU" href="${platform ? `${origin}/` : url}" />`,
    ...(platform ? [`<link rel="alternate" hreflang="en" href="${origin}/en" />`] : []),
    `<link rel="alternate" hreflang="x-default" href="${platform ? `${origin}/` : url}" />`,
  ]
  const graph = buildStructuredData(page.path, origin)
  const ld = graph.length ? `<script type="application/ld+json" data-ardelis-jsonld="true">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>` : ""
  return html
    .replace(/<html lang="[^"]*"/, `<html lang="${english ? "en" : "hu"}"`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${page.robots}" />`)
    .replace("</head>", `    ${meta.join("\n    ")}\n    ${ld}\n  </head>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, page.key === "platform" ? "$&" : `<noscript><h1>${esc(page.title)}</h1><p>${esc(page.description)}</p><p><a href="/">Lamelix – 3D konfigurátor gyártóknak</a></p></noscript>`)
}

function staticSeo(siteUrl: string | undefined): Plugin {
  return {
    name: "static-seo",
    apply: "build",
    closeBundle() {
      const origin = (siteUrl || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : DEFAULT_SITE)).replace(/\/$/, "")
      const dist = path.resolve(__dirname, "dist")
      const indexFile = path.join(dist, "index.html")
      if (!fs.existsSync(indexFile)) return
      const template = fs.readFileSync(indexFile, "utf8")
      for (const pathname of SEO_SITEMAP_PATHS) {
        const html = prerenderedHead(template, pathname, origin)
        if (pathname === "/") fs.writeFileSync(indexFile, html)
        else { fs.mkdirSync(path.join(dist, pathname), { recursive: true }); fs.writeFileSync(path.join(dist, pathname, "index.html"), html) }
      }
    },
    generateBundle() {
      const origin = (siteUrl || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : DEFAULT_SITE)).replace(/\/$/, "")
      const robots = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /embed/\nDisallow: /k/\nDisallow: /ajanlat/\n\nSitemap: ${origin}/sitemap.xml\n`
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots })
      const llms = `# Lamelix\n\n> Saját márkás (white-label) 3D pergola-konfigurátor és ajánlatkérő rendszer pergola- és árnyékolástechnikai gyártóknak: a vevő a gyártó weboldalán 3D-ben tervez, azonnali irányárat lát, a gyártó beárazott ajánlatkérést kap (admin, ármátrix, AR-nézet, fotóba helyezés, QR-kódos terv, PDF). Magyar nyelvű.\n\n## Oldalak\n\n${origin ? `- [Lamelix – gyártóknak](${origin}/): termék, működés, árak, demókérés\n- [Élő demó konfigurátor](${origin}/konfigurator)\n- [Élő termékbemutató (minta gyártói oldal)](${origin}/minta)\n` : "- Lamelix – gyártóknak (/)\n- Élő demó (/konfigurator)\n- Minta gyártói oldal (/minta)\n"}\n## Tudnivalók\n\n- Az árak nettó árak, a 27% áfa ezeken felül fizetendő; a konfigurátorban mutatott irányár tájékoztató jellegű.\n- Kapcsolat: hrvtadam.7@icloud.com\n`
      this.emitFile({ type: "asset", fileName: "llms.txt", source: llms })
      const urls = SEO_SITEMAP_PATHS.map((pathname) => `  <url><loc>${origin}${pathname}</loc></url>`).join("\n")
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  return {
    plugins: [
      // Helyi /api/lead — élesben a Vercel függvény (api/lead.ts) szolgálja ki.
      devServer({ entry: "server/dev.ts", exclude: [/^\/(?!api\/).*$/] }),
      react(),
      staticSeo(env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL),
    ],
    server: { port: 3000 },
    // Előre optimalizált függőségek: különben fejlesztés közben az első AR-megnyitás teljes oldal-újratöltést okozna.
    optimizeDeps: { include: ['qrcode', 'three/addons/exporters/GLTFExporter.js', '@react-three/postprocessing', 'postprocessing'] },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@contracts": path.resolve(__dirname, "./contracts"),
      },
    },
    envDir: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 1800,
      rollupOptions: {
        output: {
          // A 3D-motor külön, hosszan gyorsítótárazható csomagba kerül.
          // A 3D-motor külön, hosszan gyorsítótárazható csomagba kerül. Az utófeldolgozást
          // (postprocessing, n8ao) és az AR-exportert szándékosan NEM soroljuk ide: azokat a
          // Rollup a lustán betöltött SceneEffects / ArDialog csomagba teszi, így mobilon
          // nem töltődnek le. (Kézi besorolásuk körkörös csomagfüggést és üres oldalt okozott.)
          manualChunks(id) {
            if (id.includes("node_modules/three/examples/jsm/exporters")) return undefined
            if (id.includes("node_modules/three/")) return "three"
            if (id.includes("node_modules/@react-three/postprocessing")) return undefined
            if (id.includes("node_modules/@react-three/") || id.includes("node_modules/three-stdlib")) return "r3f"
          },
        },
      },
    },
  }
})
