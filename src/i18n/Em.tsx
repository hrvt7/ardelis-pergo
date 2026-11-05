import type { Em as EmParts } from './platformCopy'

/** Címsor kiemeléssel: [előtte, <em>kiemelt</em>, utána]. */
export function Em({ parts }: { parts: EmParts }) {
  return <>{parts[0]}<em>{parts[1]}</em>{parts[2]}</>
}
