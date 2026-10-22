import COUNTRIES from '../data/countries.json'

export { COUNTRIES }

/** Modes joués sur une file de pays tirée au début de la partie (score de session). */
export const SESSION_MODES = ['survival', 'capital', 'custom', 'map']

/** Modes qui alimentent le classement mondial. */
export const RANKED_MODES = ['survival', 'capital', 'map']

export const MODE_LABELS = {
  learning: 'Apprentissage',
  survival: 'Survie',
  capital: 'Capitales',
  map: 'Carte',
  custom: 'Personnalisé',
}

export const REGIONS = [
  { value: 'Africa', label: 'Afrique' },
  { value: 'Americas', label: 'Amériques' },
  { value: 'Asia', label: 'Asie' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Oceania', label: 'Océanie' },
]

export const regionLabel = (value) => REGIONS.find((r) => r.value === value)?.label ?? 'Monde'

export const MAP_MAX_FAILURES = 3

/** Minuscule, sans accents ni ponctuation : « Côte d'Ivoire » -> « cote d ivoire ». */
export function normalize(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Mélange de Fisher-Yates (le tri aléatoire `sort(() => Math.random() - 0.5)` est biaisé). */
export function shuffle(items, random = Math.random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Vérifie une réponse saisie : nom du pays (FR/EN/alias) ou capitale (FR/EN) selon le mode. */
export function isCorrectAnswer(country, input, mode) {
  const guess = normalize(input)
  if (!country || !guess) return false
  if (mode === 'capital') {
    return country.capitals.some((c) => normalize(c.fr) === guess || normalize(c.en) === guess)
  }
  return country.aliases.includes(guess)
}

/** Réponse à afficher quand le joueur demande la solution. */
export function answerFor(country, mode) {
  if (!country) return ''
  if (mode === 'capital') {
    return country.capitals.map((c) => c.fr).join(' / ') || '—'
  }
  return country.name
}

export const capitalOf = (country) => country?.capitals[0]?.fr ?? null

export const flagUrl = (country, width) =>
  width ? `https://flagcdn.com/w${width}/${country.iso2}.png` : `https://flagcdn.com/${country.iso2}.svg`

/** Recherche tolérante d'un pays par nom (FR/EN) ou code. */
export function searchCountry(countries, query) {
  const q = normalize(query)
  if (q.length < 2) return null
  return (
    countries.find((c) => c.code.toLowerCase() === q) ??
    countries.find((c) => normalize(c.name).startsWith(q) || normalize(c.nameEn).startsWith(q)) ??
    countries.find((c) => normalize(c.name).includes(q) || c.aliases.some((a) => a.includes(q))) ??
    null
  )
}

export function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Précharge une image (drapeau suivant) pour un affichage instantané. */
export function preloadImage(src) {
  if (typeof Image === 'undefined' || !src) return
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}
