import devServer from "@hono/vite-dev-server"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { SEO_SITEMAP_PATHS } from "./contracts/seo"

const __dirname = import.meta.dirname

// Statikus robots.txt és sitemap.xml a buildbe (korábban a Kimi Node-szerver
// adta ki őket). Az abszolút URL-ekhez a PUBLIC_SITE_URL kell.
function staticSeo(siteUrl: string | undefined): Plugin {
  return {
    name: "static-seo",
    apply: "build",
    generateBundle() {
      const origin = (siteUrl || "").replace(/\/$/, "")
      const robots = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /embed/\nDisallow: /k/\n${origin ? `\nSitemap: ${origin}/sitemap.xml\n` : ""}`
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots })
      const llms = `# Lamelix\n\n> White-label 3D pergola-konfigurátor és lead rendszer pergola- és outdoor-gyártóknak: a vevő a gyártó weboldalán 3D-ben tervez, azonnali irányárat lát, a gyártó beárazott érdeklődőt kap (admin, ármátrix, QR-kódos terv, PDF). Magyar nyelvű.\n\n## Oldalak\n\n${origin ? `- [Lamelix – gyártóknak](${origin}/): termék, működés, árak, demókérés\n- [Élő demó konfigurátor](${origin}/k/demo)\n- [Minta gyártói oldal (ARDELIS)](${origin}/ardelis)\n` : "- Lamelix – gyártóknak (/)\n- Élő demó (/k/demo)\n- Minta gyártói oldal (/ardelis)\n"}\n## Tudnivalók\n\n- Az árak nettó árak, +27% ÁFA; a konfigurátorban mutatott irányár tájékoztató jellegű.\n- Kapcsolat: hrvtadam.7@icloud.com\n`
      this.emitFile({ type: "asset", fileName: "llms.txt", source: llms })
      if (!origin) return
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
