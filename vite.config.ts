import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const threeIntrinsics = new Set([
  "group", "mesh", "primitive", "points", "fog", "ambientLight",
  "hemisphereLight", "directionalLight", "pointLight", "boxGeometry",
  "planeGeometry", "cylinderGeometry", "sphereGeometry", "coneGeometry",
  "torusGeometry", "ringGeometry", "circleGeometry", "bufferGeometry",
  "bufferAttribute", "meshPhysicalMaterial", "meshStandardMaterial",
  "meshBasicMaterial", "pointsMaterial", "instancedMesh",
])

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr({
      predicate: (node) => {
        const opening = (node as { openingElement?: { name?: { type?: string; name?: string } } }).openingElement
        const name = opening?.name
        return !(name?.type === "JSXIdentifier" && typeof name.name === "string" && threeIntrinsics.has(name.name))
      },
    }), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
