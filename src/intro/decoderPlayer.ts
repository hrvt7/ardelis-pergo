// A nyitó videó lejátszása hardveres dekóderrel (WebCodecs VideoDecoder) vászonra, <video> elem nélkül.
// Akkor kell, ha a rendszer tiltja a videók automatikus lejátszását (iOS energiatakarékos mód, „Videók automatikus
// lejátszása” ki): erre a tiltás nem vonatkozik, és – szemben az animált képpel, amit pl. az iPhone 14 Pro (A16)
// szoftveresen bont ki – ugyanúgy a hardveres H.264-dekóder dolgozik, mint a videónál, így nem szaggat.
// A minták helye a fájlban előre kiszámolt index (public/assets/intro/lamelix-intro.json), MP4-bontó nem kell.

export interface IntroIndex {
  codec: string
  width: number
  height: number
  durationUs: number
  /** avcC (AVCDecoderConfigurationRecord), base64. */
  description: string
  /** [pozíció a fájlban, méret, megjelenítési idő µs, kulcskocka 1/0] – dekódolási sorrendben. */
  samples: [number, number, number, number][]
}

interface DecoderLike {
  configure(config: unknown): void
  decode(chunk: unknown): void
  flush(): Promise<void>
  close(): void
  readonly decodeQueueSize: number
  readonly state: string
}
interface FrameLike { readonly timestamp: number; close(): void }
interface WebCodecsGlobal {
  VideoDecoder: { new (init: { output: (frame: FrameLike) => void; error: (error: unknown) => void }): DecoderLike; isConfigSupported(config: unknown): Promise<{ supported?: boolean }> }
  EncodedVideoChunk: new (init: { type: 'key' | 'delta'; timestamp: number; data: Uint8Array }) => unknown
}

const base64Bytes = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

export interface DecoderPlayback {
  /** Az első képkocka kirajzolva (a lejátszás elindult). */
  started: Promise<void>
  /** Az utolsó képkocka is kirajzolva (a vászon a zárókockán áll). */
  ended: Promise<void>
  stop(): void
}

/**
 * Lejátszás indítása a megadott vásznon. null, ha a böngésző nem tudja (nincs WebCodecs, vagy nem támogatja ezt a
 * kodekprofilt) – ilyenkor a hívó a következő tartalékra lép.
 */
export async function playWithDecoder(canvas: HTMLCanvasElement, videoUrl: string, indexUrl: string): Promise<DecoderPlayback | null> {
  const api = globalThis as unknown as Partial<WebCodecsGlobal>
  const Decoder = api.VideoDecoder
  const Chunk = api.EncodedVideoChunk
  if (!Decoder || !Chunk || typeof requestAnimationFrame !== 'function') return null
  const [index, buffer] = await Promise.all([
    fetch(indexUrl).then((response) => { if (!response.ok) throw new Error(`index ${response.status}`); return response.json() as Promise<IntroIndex> }),
    fetch(videoUrl).then((response) => { if (!response.ok) throw new Error(`video ${response.status}`); return response.arrayBuffer() }),
  ])
  const config = { codec: index.codec, codedWidth: index.width, codedHeight: index.height, description: base64Bytes(index.description), optimizeForLatency: true }
  const support = await Decoder.isConfigSupported(config).catch(() => ({ supported: false }))
  if (!support.supported) return null
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return null
  canvas.width = index.width
  canvas.height = index.height

  const queue: FrameLike[] = []
  let failed: unknown = null
  const decoder = new Decoder({ output: (frame) => queue.push(frame), error: (error) => { failed = error } })
  decoder.configure(config)
  const samples = index.samples
  let next = 0
  let flushed = false
  /** Legfeljebb néhány kocka előre: a dekóder nem várakoztat, a memória kicsi marad (a kockákat zárni kell). */
  const feed = () => {
    while (next < samples.length && decoder.decodeQueueSize < 3 && queue.length < 4) {
      const [offset, size, timestamp, key] = samples[next++]
      decoder.decode(new Chunk({ type: key ? 'key' : 'delta', timestamp, data: new Uint8Array(buffer, offset, size) }))
    }
    if (next >= samples.length && !flushed) { flushed = true; void decoder.flush().catch(() => undefined) }
  }

  let resolveStarted!: () => void
  let resolveEnded!: () => void
  let rejectStarted!: (error: unknown) => void
  const started = new Promise<void>((resolve, reject) => { resolveStarted = resolve; rejectStarted = reject })
  const ended = new Promise<void>((resolve) => { resolveEnded = resolve })
  let stopped = false
  let clockStart = 0
  let lastDrawn = -1
  let raf = 0
  const finish = () => { stopped = true; cancelAnimationFrame(raf); queue.splice(0).forEach((frame) => frame.close()); if (decoder.state !== 'closed') decoder.close() }

  const tick = (now: number) => {
    if (stopped) return
    if (failed) { finish(); rejectStarted(failed); resolveEnded(); return }
    feed()
    if (queue.length) {
      if (!clockStart) { clockStart = now - queue[0].timestamp / 1000; resolveStarted() }
      const position = (now - clockStart) * 1000
      // A soron következő kockák közül a mostani időponthoz tartozó legutolsó; a régebbieket eldobjuk.
      while (queue.length > 1 && queue[1].timestamp <= position) queue.shift()!.close()
      const frame = queue[0]
      if (frame.timestamp !== lastDrawn && frame.timestamp <= position + 8000) {
        context.drawImage(frame as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height)
        lastDrawn = frame.timestamp
      }
      const last = next >= samples.length && flushed && queue.length === 1 && decoder.decodeQueueSize === 0
      if (last && position >= frame.timestamp) { finish(); resolveEnded(); return }
    } else if (clockStart && next >= samples.length && flushed && decoder.decodeQueueSize === 0 && (now - clockStart) * 1000 >= index.durationUs) {
      finish(); resolveEnded(); return
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return { started, ended, stop: finish }
}
