// Kézi tinta-vonal: finom zaj-alapú elmozdítás, amitől a kódból rajzolt SVG tollrajznak hat, nem steril vektornak.
// A paraméterek a line-art-animation könyvtár inkDefs() szűrőjéből (github.com/JDhruv14/line-art-animation, MIT),
// a mi vonalvastagságunkhoz igazítva. Egyszer kerül az oldalra, a jelenetek a `filter: url(#lx-ink)` CSS-sel használják.
export default function InkDefs() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
    <defs>
      <filter id="lx-ink" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={1} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={0.9} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation={0.15} />
      </filter>
    </defs>
  </svg>
}
