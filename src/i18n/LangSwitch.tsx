import { Link, useLocation } from 'react-router'
import { homePath, LANGS, type Lang } from './lang'
import { useCopy } from './useCopy'

/** HU / EN váltó: az útvonal a nyelv (/ és /en), a horgony (#arak stb.) megmarad. */
export default function LangSwitch() {
  const { lang, c } = useCopy()
  const { hash } = useLocation()
  return <div className="pf-lang" role="group" aria-label={c.nav.langAria}>
    {LANGS.map((item: Lang) => <Link key={item} to={`${homePath(item)}${hash}`} hrefLang={item} lang={item} className={item === lang ? 'is-on' : ''} aria-current={item === lang ? 'true' : undefined} title={c.nav.langName[item]} onClick={() => { try { localStorage.setItem('lamelix-lang', item) } catch { /* nem kritikus */ } }}>{item.toUpperCase()}</Link>)}
  </div>
}
