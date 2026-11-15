// A bejárás bemenete: a DOM-os joystick és a billentyűzet ide ír, a 3D jelenet kameravezérlője innen olvas.
// Egyszerű, közös állapot (mint a sceneRegistry): nincs React-újrarajzolás minden ujjmozdulatra.

export const walkInput = {
  /** Joystick: x jobbra (+), y előre (+), −1…1. */
  stickX: 0,
  stickY: 0,
  /** Lenyomott billentyűk (kisbetűs `event.key`). */
  keys: new Set<string>(),
  /** A jelenet újrarajzolásának kérése (a vezérlő állítja be; igény szerinti renderelésnél kell). */
  wake: () => {},
}

export function setStick(x: number, y: number) {
  walkInput.stickX = x
  walkInput.stickY = y
  walkInput.wake()
}

export function resetWalkInput() {
  walkInput.stickX = 0
  walkInput.stickY = 0
  walkInput.keys.clear()
}

/** A bemenetből számolt mozgásirány a néző saját rendszerében: [jobbra, előre, fordulás], mindegyik −1…1. */
export function walkIntent(input: Pick<typeof walkInput, 'stickX' | 'stickY' | 'keys'>): [number, number, number] {
  const keys = input.keys
  const forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
  const strafe = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0)
  const turn = (keys.has('arrowleft') || keys.has('q') ? 1 : 0) - (keys.has('arrowright') || keys.has('e') ? 1 : 0)
  const x = Math.max(-1, Math.min(1, strafe + input.stickX))
  const y = Math.max(-1, Math.min(1, forward + input.stickY))
  return [x, y, turn]
}
