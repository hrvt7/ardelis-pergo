/**
 * A kamera-átmenet állapota a jelenet és az utófeldolgozás között (képkockánként írva, React-állapot nélkül).
 * `p`: az átmenet haladása 0–1 (0, ha nincs mozgás); `focus`: a kamera és a célpont távolsága méterben.
 */
export const cameraMotion = { p: 0, focus: 10 }
