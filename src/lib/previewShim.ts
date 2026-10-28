// Előnézeti buildben betölti a bináris fájlok fetch-átirányítását; máshol üres.
if (import.meta.env.VITE_BINARY_SHIM === '1') await import('./binaryShim')
export {}
