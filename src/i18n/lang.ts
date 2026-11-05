// Nyelvi környezet a nyilvános (B2B) oldalhoz: a nyelvet az útvonal adja (/ = magyar, /en = angol).
import { createContext, useContext } from 'react'

export type Lang = 'hu' | 'en'
export const LANGS: readonly Lang[] = ['hu', 'en']

const LangContext = createContext<Lang>('hu')
export const LangProvider = LangContext.Provider
export const useLang = () => useContext(LangContext)

/** A főoldal elérési útja az adott nyelven. */
export const homePath = (lang: Lang) => (lang === 'en' ? '/en' : '/')
