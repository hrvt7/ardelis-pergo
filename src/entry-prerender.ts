// Build-idejű előrenderelés (npm run build első lépése: vite build --ssr). A nyitóoldal (/ és /en) első képernyőjét –
// fejléc, héró, „Hét lépés” – kész HTML-ként írjuk a dist/index.html-be, így a látogató a JavaScript letöltése előtt
// is a valódi oldalt látja; a böngésző ezt hidratálja (src/main.tsx). A lenti szakaszok a böngészőben épülnek fel.
// (JSX nélkül, hogy a tesztek típusellenőrzése is közvetlenül importálhassa.)
import { createElement, StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import AppShell from './AppShell'

export function render(url: string): string {
  return renderToString(createElement(StrictMode, null, createElement(StaticRouter, { location: url }, createElement(AppShell))))
}
