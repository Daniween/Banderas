import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import {
  COUNTRIES,
  SESSION_MODES,
  MAP_MAX_FAILURES,
  shuffle,
  isCorrectAnswer,
  answerFor,
  formatDuration,
  flagUrl,
  preloadImage,
} from '../lib/quiz'
import { readJson, writeJson, remove } from '../lib/storage'

const STORAGE_KEY = 'banderas-known-countries'
const VISITED_KEY = 'banderas-visited-countries'
const SETTINGS_KEY = 'banderas-settings'

const randomItem = (items) => items[Math.floor(Math.random() * items.length)]

/**
 * État et règles du jeu.
 * @param {{ onFinish?: (result: object) => void }} options appelé une fois par partie terminée
 */
export function useGame({ onFinish } = {}) {
  const countries = COUNTRIES

  // Progression persistée (mode apprentissage)
  const savedKnown = readJson(STORAGE_KEY, [])
  const knownCountries = ref(new Set(savedKnown))
  const visitedCountries = ref(new Set(readJson(VISITED_KEY, savedKnown)))
  const showCapitals = ref(!!readJson(SETTINGS_KEY, {}).showCapitals)

  // 'menu' | 'selecting' | 'playing' | 'finished' | 'leaderboard' | 'profile' | 'cgu'
  const gameStatus = ref('menu')
  const gameMode = ref('learning') // 'learning' | 'survival' | 'capital' | 'map' | 'custom'
  const regionFilter = ref(null)

  const currentCountry = shallowRef(null)
  const sessionQueue = shallowRef([])
  const sessionTotal = ref(0)
  const sessionScore = ref(0)
  const streak = ref(0)
  const bestStreak = ref(0)
  const selectedCodes = ref(new Set())

  // Mode carte
  const correctSessionCountries = ref(new Set())
  const revealedSessionCountries = ref(new Set())
  const redSessionCountry = ref(null)
  const mapFailures = ref(0)

  // Prochain pays du mode apprentissage, tiré à l'avance pour précharger son drapeau
  let learningNext = null

  const isSessionMode = computed(() => SESSION_MODES.includes(gameMode.value))

  const pool = computed(() =>
    regionFilter.value ? countries.filter((c) => c.region === regionFilter.value) : countries,
  )

  const score = computed(() => {
    if (isSessionMode.value) return sessionScore.value
    return pool.value.filter((c) => knownCountries.value.has(c.code)).length
  })

  const total = computed(() => (isSessionMode.value ? sessionTotal.value : pool.value.length))

  const visitedCount = computed(() => {
    if (isSessionMode.value) return sessionTotal.value - sessionQueue.value.length
    return pool.value.filter((c) => visitedCountries.value.has(c.code)).length
  })

  // ---------- Chronomètre (basé sur l'horloge : insensible au ralentissement des onglets inactifs) ----------

  const elapsed = ref(0)
  let startedAt = 0
  let timerId = null

  const tick = () => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  }

  const startTimer = () => {
    stopTimer()
    startedAt = Date.now()
    elapsed.value = 0
    timerId = setInterval(tick, 500)
  }

  const stopTimer = () => {
    if (!timerId) return
    clearInterval(timerId)
    timerId = null
    tick()
  }

  const formattedTime = computed(() => formatDuration(elapsed.value))

  // ---------- Protection contre la fermeture accidentelle ----------

  const handleBeforeUnload = (e) => {
    if (gameStatus.value === 'playing') {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    stopTimer()
  })

  // ---------- Déroulement ----------

  const startGame = (mode = 'learning', region = null) => {
    let queue = []
    if (SESSION_MODES.includes(mode)) {
      let candidates = region ? countries.filter((c) => c.region === region) : countries
      if (mode === 'map') candidates = candidates.filter((c) => c.onMap)
      if (mode === 'custom') candidates = candidates.filter((c) => selectedCodes.value.has(c.code))
      queue = shuffle(candidates)
      if (queue.length === 0) return
    }

    gameMode.value = mode
    regionFilter.value = region
    sessionQueue.value = queue
    sessionTotal.value = queue.length
    sessionScore.value = 0
    streak.value = 0
    bestStreak.value = 0
    correctSessionCountries.value = new Set()
    revealedSessionCountries.value = new Set()
    redSessionCountry.value = null
    mapFailures.value = 0
    currentCountry.value = null
    learningNext = null

    visitedCountries.value = new Set()
    remove(VISITED_KEY)

    gameStatus.value = 'playing'
    startTimer()
    pickNextCountry()
  }

  const returnToMenu = () => {
    stopTimer()
    gameStatus.value = 'menu'
    gameMode.value = 'learning'
    regionFilter.value = null
    currentCountry.value = null
    redSessionCountry.value = null
    elapsed.value = 0
  }

  const pickNextCountry = () => {
    mapFailures.value = 0

    if (isSessionMode.value) {
      const [next, ...rest] = sessionQueue.value
      if (!next) return finishGame()
      currentCountry.value = next
      sessionQueue.value = rest
      if (rest[0]) preloadImage(flagUrl(rest[0]))
      return
    }

    const unknown = pool.value.filter((c) => !knownCountries.value.has(c.code))
    if (unknown.length === 0) return finishGame()

    // Évite de reproposer immédiatement le même drapeau quand c'est possible
    const others = unknown.filter((c) => c !== currentCountry.value)
    const candidates = others.length ? others : unknown
    const next = candidates.includes(learningNext) ? learningNext : randomItem(candidates)
    currentCountry.value = next

    const afterNext = unknown.filter((c) => c !== next)
    learningNext = afterNext.length ? randomItem(afterNext) : null
    if (learningNext) preloadImage(flagUrl(learningNext))
  }

  const finishGame = () => {
    if (gameStatus.value !== 'playing') return
    stopTimer()
    gameStatus.value = 'finished'
    currentCountry.value = null
    onFinish?.({
      mode: gameMode.value,
      region: regionFilter.value || 'world',
      score: sessionScore.value,
      total: sessionTotal.value,
      timeSeconds: elapsed.value,
      formattedTime: formattedTime.value,
      bestStreak: bestStreak.value,
    })
  }

  // ---------- Réponses ----------

  const addTo = (setRef, code) => {
    const next = new Set(setRef.value)
    next.add(code)
    setRef.value = next
  }

  const registerVisited = () => {
    if (!currentCountry.value) return
    addTo(visitedCountries, currentCountry.value.code)
    writeJson(VISITED_KEY, [...visitedCountries.value])
  }

  const registerKnown = () => {
    addTo(knownCountries, currentCountry.value.code)
    writeJson(STORAGE_KEY, [...knownCountries.value])
  }

  // Sur la carte, le pays « raté » le plus récent est en rouge, les précédents passent en orange
  const markMissedOnMap = (code) => {
    if (redSessionCountry.value) addTo(revealedSessionCountries, redSessionCountry.value)
    redSessionCountry.value = code
  }

  const onCorrect = () => {
    streak.value++
    bestStreak.value = Math.max(bestStreak.value, streak.value)
  }

  /** Soumet une réponse (texte, ou code pays en mode carte). Renvoie `true` si elle est juste. */
  const submitAnswer = (input) => {
    const country = currentCountry.value
    if (!country) return false

    if (gameMode.value === 'map') {
      if (input === country.code) {
        sessionScore.value++
        onCorrect()
        if (redSessionCountry.value) {
          addTo(revealedSessionCountries, redSessionCountry.value)
          redSessionCountry.value = null
        }
        addTo(correctSessionCountries, country.code)
        pickNextCountry()
        return true
      }
      streak.value = 0
      mapFailures.value++
      if (mapFailures.value >= MAP_MAX_FAILURES) {
        registerVisited()
        markMissedOnMap(country.code)
        pickNextCountry()
      }
      return false
    }

    if (!isCorrectAnswer(country, input, gameMode.value)) {
      streak.value = 0
      registerVisited()
      return false
    }

    onCorrect()
    registerVisited()
    if (gameMode.value === 'learning') {
      registerKnown()
    } else {
      sessionScore.value++
      addTo(correctSessionCountries, country.code)
    }
    pickNextCountry()
    return true
  }

  const skipCountry = () => {
    streak.value = 0
    registerVisited()
    pickNextCountry()
  }

  /** Renvoie la solution du drapeau courant (le joueur passera ensuite au suivant). */
  const revealAnswer = () => {
    const country = currentCountry.value
    if (!country) return ''
    streak.value = 0
    if (gameMode.value === 'map') markMissedOnMap(country.code)
    return answerFor(country, gameMode.value)
  }

  const toggleCapitals = () => {
    showCapitals.value = !showCapitals.value
    writeJson(SETTINGS_KEY, { showCapitals: showCapitals.value })
  }

  const resetProgress = () => {
    knownCountries.value = new Set()
    visitedCountries.value = new Set()
    remove(STORAGE_KEY)
    remove(VISITED_KEY)
    if (gameStatus.value === 'playing') startGame(gameMode.value, regionFilter.value)
  }

  return {
    countries,
    currentCountry,
    knownCountries,
    score,
    total,
    visitedCount,
    streak,
    bestStreak,
    gameStatus,
    gameMode,
    regionFilter,
    selectedCodes,
    correctSessionCountries,
    revealedSessionCountries,
    redSessionCountry,
    showCapitals,
    mapFailures,
    elapsed,
    formattedTime,
    startGame,
    returnToMenu,
    finishGame,
    submitAnswer,
    skipCountry,
    revealAnswer,
    resetProgress,
    toggleCapitals,
  }
}
