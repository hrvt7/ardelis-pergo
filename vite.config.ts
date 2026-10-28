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
          manualChunks(id) {
            if (id.includes("node_modules/three/")) return "three"
            if (id.includes("node_modules/@react-three/") || id.includes("node_modules/three-stdlib") || id.includes("node_modules/postprocessing")) return "r3f"
          },
        },
      },
    },
  }
})
