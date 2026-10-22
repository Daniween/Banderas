import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { useGame } from './useGame'
import { MAP_MAX_FAILURES } from '../lib/quiz'

// Pas de composant hôte : on ignore l'avertissement d'onMounted/onUnmounted
vi.spyOn(console, 'warn').mockImplementation(() => {})

let scope
const setup = (options) => {
  scope = effectScope()
  return scope.run(() => useGame(options))
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  scope?.stop()
  vi.useRealTimers()
})

describe('useGame', () => {
  it('mode survie : une partie complète sur un continent', () => {
    const onFinish = vi.fn()
    const game = setup({ onFinish })
    game.startGame('survival', 'Oceania')

    const total = game.total.value
    expect(total).toBe(14)
    expect(game.gameStatus.value).toBe('playing')

    // Une erreur ne fait pas avancer
    const first = game.currentCountry.value
    expect(game.submitAnswer('pas un pays')).toBe(false)
    expect(game.currentCountry.value).toBe(first)

    vi.advanceTimersByTime(5000)
    while (game.currentCountry.value) {
      expect(game.submitAnswer(game.currentCountry.value.name)).toBe(true)
    }

    expect(game.gameStatus.value).toBe('finished')
    expect(game.score.value).toBe(total)
    expect(game.bestStreak.value).toBe(total)
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish.mock.calls[0][0]).toMatchObject({
      mode: 'survival',
      region: 'Oceania',
      score: total,
      total,
      timeSeconds: 5,
      formattedTime: '00:05',
    })
  })

  it('chaque pays n’apparaît qu’une fois par partie', () => {
    const game = setup()
    game.startGame('capital')
    const seen = new Set()
    while (game.currentCountry.value) {
      seen.add(game.currentCountry.value.code)
      game.skipCountry()
    }
    expect(seen.size).toBe(197)
    expect(game.score.value).toBe(0)
  })

  it('mode capitales : accepte la capitale, pas le pays', () => {
    const game = setup()
    game.startGame('capital')
    const country = game.currentCountry.value
    expect(game.submitAnswer(country.name)).toBe(country.capitals.some((c) => c.fr === country.name))
    if (game.currentCountry.value === country) {
      expect(game.submitAnswer(country.capitals[0].fr)).toBe(true)
      expect(game.score.value).toBe(1)
    }
  })

  it('mode carte : 3 erreurs passent au pays suivant et le marquent en rouge', () => {
    const game = setup()
    game.startGame('map')
    expect(game.total.value).toBe(197) // tous jouables (petits pays en pastille)

    const country = game.currentCountry.value
    for (let i = 0; i < MAP_MAX_FAILURES; i++) game.submitAnswer('XXX')

    expect(game.currentCountry.value).not.toBe(country)
    expect(game.redSessionCountry.value).toBe(country.code)
    expect(game.mapFailures.value).toBe(0)

    // Bonne réponse : le rouge passe en orange
    const next = game.currentCountry.value
    expect(game.submitAnswer(next.code)).toBe(true)
    expect(game.correctSessionCountries.value.has(next.code)).toBe(true)
    expect(game.revealedSessionCountries.value.has(country.code)).toBe(true)
    expect(game.redSessionCountry.value).toBeNull()
  })

  it('mode apprentissage : les pays connus ne reviennent plus', () => {
    const game = setup()
    game.resetProgress()
    game.startGame('learning')
    const learned = new Set()
    for (let i = 0; i < 20; i++) {
      const c = game.currentCountry.value
      expect(learned.has(c.code)).toBe(false)
      game.submitAnswer(c.nameEn)
      learned.add(c.code)
    }
    expect(game.score.value).toBe(20)
    expect(game.knownCountries.value.size).toBe(20)
  })

  it('mode personnalisé : ne joue que la sélection, et refuse une sélection vide', () => {
    const game = setup()
    game.startGame('custom')
    expect(game.gameStatus.value).toBe('menu')

    game.selectedCodes.value = new Set(['FRA', 'JPN'])
    game.startGame('custom')
    expect(game.total.value).toBe(2)
    expect(['FRA', 'JPN']).toContain(game.currentCountry.value.code)
  })
})
