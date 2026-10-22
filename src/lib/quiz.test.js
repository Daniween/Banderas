import { describe, it, expect } from 'vitest'
import {
  COUNTRIES,
  normalize,
  shuffle,
  isCorrectAnswer,
  answerFor,
  searchCountry,
  formatDuration,
  flagUrl,
} from './quiz'

const byCode = (code) => COUNTRIES.find((c) => c.code === code)

describe('données pays', () => {
  it('contient les 197 pays, sans doublon', () => {
    expect(COUNTRIES).toHaveLength(197)
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(197)
  })

  it('chaque pays a un nom, un code drapeau et une région', () => {
    for (const c of COUNTRIES) {
      expect(c.name, c.code).toBeTruthy()
      expect(c.iso2, c.code).toMatch(/^[a-z]{2}$/)
      expect(c.region, c.code).toBeTruthy()
      expect(c.aliases.length, c.code).toBeGreaterThan(0)
    }
  })

  it('inclut les cas particuliers (Kosovo, Taïwan, Palestine, Vatican)', () => {
    for (const code of ['UNK', 'TWN', 'PSE', 'VAT']) expect(byCode(code), code).toBeDefined()
  })

  it('la plupart des pays sont présents sur la carte', () => {
    expect(COUNTRIES.filter((c) => c.onMap).length).toBeGreaterThan(160)
  })
})

describe('normalize', () => {
  it('supprime accents, casse et ponctuation', () => {
    expect(normalize("  Côte d'Ivoire ")).toBe('cote d ivoire')
    expect(normalize('ÉTATS-UNIS')).toBe('etats unis')
    expect(normalize(undefined)).toBe('')
  })
})

describe('isCorrectAnswer', () => {
  const france = byCode('FRA')
  const uk = byCode('GBR')

  it('accepte les noms français et anglais, sans tenir compte des accents', () => {
    expect(isCorrectAnswer(france, 'France', 'learning')).toBe(true)
    expect(isCorrectAnswer(uk, 'royaume-uni', 'survival')).toBe(true)
    expect(isCorrectAnswer(uk, 'United Kingdom', 'survival')).toBe(true)
    expect(isCorrectAnswer(byCode('USA'), 'États-Unis', 'survival')).toBe(true)
  })

  it('accepte les alias usuels', () => {
    expect(isCorrectAnswer(uk, 'Angleterre', 'survival')).toBe(true)
    expect(isCorrectAnswer(byCode('COD'), 'RDC', 'survival')).toBe(true)
    expect(isCorrectAnswer(byCode('CIV'), "Côte d'Ivoire", 'survival')).toBe(true)
  })

  it('refuse les mauvaises réponses et les codes ISO à 2 lettres', () => {
    expect(isCorrectAnswer(france, 'Allemagne', 'learning')).toBe(false)
    expect(isCorrectAnswer(france, 'FR', 'learning')).toBe(false)
    expect(isCorrectAnswer(france, '   ', 'learning')).toBe(false)
  })

  it('en mode capitales, accepte le nom français ou anglais de la capitale', () => {
    expect(isCorrectAnswer(uk, 'Londres', 'capital')).toBe(true)
    expect(isCorrectAnswer(uk, 'london', 'capital')).toBe(true)
    expect(isCorrectAnswer(byCode('CHN'), 'Pekin', 'capital')).toBe(true)
    expect(isCorrectAnswer(uk, 'Royaume-Uni', 'capital')).toBe(false)
  })

  it('accepte toutes les capitales des pays qui en ont plusieurs', () => {
    const southAfrica = byCode('ZAF')
    expect(isCorrectAnswer(southAfrica, 'Pretoria', 'capital')).toBe(true)
    expect(isCorrectAnswer(southAfrica, 'Le Cap', 'capital')).toBe(true)
  })
})

describe('answerFor', () => {
  it('donne le nom français, ou les capitales en mode capitales', () => {
    expect(answerFor(byCode('DEU'), 'survival')).toBe('Allemagne')
    expect(answerFor(byCode('GBR'), 'capital')).toBe('Londres')
    expect(answerFor(byCode('ZAF'), 'capital')).toBe('Pretoria / Bloemfontein / Le Cap')
  })
})

describe('shuffle', () => {
  it('conserve tous les éléments sans modifier le tableau source', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const out = shuffle(items)
    expect(out).not.toBe(items)
    expect([...out].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('est déterministe avec un générateur fourni', () => {
    const rng = () => 0
    expect(shuffle([1, 2, 3, 4], rng)).toEqual([2, 3, 4, 1])
  })
})

describe('searchCountry', () => {
  it('trouve un pays par nom français, anglais ou code', () => {
    expect(searchCountry(COUNTRIES, 'espa')?.code).toBe('ESP')
    expect(searchCountry(COUNTRIES, 'Germany')?.code).toBe('DEU')
    expect(searchCountry(COUNTRIES, 'jpn')?.code).toBe('JPN')
    expect(searchCountry(COUNTRIES, 'x')).toBeNull()
    expect(searchCountry(COUNTRIES, 'zzzz')).toBeNull()
  })
})

describe('utilitaires', () => {
  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(75)).toBe('01:15')
    expect(formatDuration(3600)).toBe('60:00')
  })

  it('flagUrl', () => {
    expect(flagUrl(byCode('FRA'))).toBe('https://flagcdn.com/fr.svg')
    expect(flagUrl(byCode('UNK'), 80)).toBe('https://flagcdn.com/w80/xk.png')
  })
})
