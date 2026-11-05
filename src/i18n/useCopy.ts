import { useLang, type Lang } from './lang'
import { PLATFORM_COPY, type PlatformCopy } from './platformCopy'

/** A főoldal szövegei az aktuális nyelven. */
export function useCopy(): { lang: Lang; c: PlatformCopy } {
  const lang = useLang()
  return { lang, c: PLATFORM_COPY[lang] }
}
