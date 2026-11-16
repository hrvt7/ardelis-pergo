// GYIK beszélgetésként: a kérdések pill-csipek (mint a tanácsadó választói), a kiválasztott válasz buborékként
// érkezik, a kérdés mellett. Harmonika helyett: egy pillantással látszik minden kérdés, és mindig van válasz.
import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Mail } from 'lucide-react'
import { useCopy } from '@/i18n/useCopy'
import { Em } from '@/i18n/Em'

export default function FaqChat({ email, demoPath }: { email: string; demoPath: string }) {
  const { c: copy } = useCopy()
  const c = copy.faq
  const [open, setOpen] = useState(0)
  const item = c.items[open]
  return <div className="lx-faq">
    <div className="lx-faq-head" data-pf-item>
      <p className="lx-eyebrow">{c.eyebrow}</p>
      <h2 id="gyik-title"><Em parts={c.title} /></h2>
      <p className="lx-sub">{c.sub}</p>
    </div>
    <div className="lx-faq-chips" role="tablist" aria-label={copy.v2.faqPick} data-pf-item>
      {c.items.map((entry, index) => <button key={entry.q} type="button" role="tab" id={`faq-tab-${index}`} aria-selected={index === open} aria-controls="faq-answer" className={index === open ? 'is-on' : ''} onClick={() => setOpen(index)}>{entry.q}</button>)}
    </div>
    <div className="lx-faq-thread" data-pf-item>
      <p className="lx-faq-q" aria-hidden="true">{item.q}</p>
      <div className="lx-faq-a" id="faq-answer" role="tabpanel" aria-labelledby={`faq-tab-${open}`} key={open}>
        <span className="lx-faq-mark" aria-hidden="true">L</span>
        <p>{item.a}</p>
      </div>
      <div className="lx-faq-more">
        <a href={`mailto:${email}`}><Mail size={16} />{c.contactTitle} {email}</a>
        <Link to={demoPath}>{c.openDemo} <ArrowUpRight size={16} /></Link>
      </div>
    </div>
  </div>
}
