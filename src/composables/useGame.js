import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'banderas-known-countries'
const VISITED_KEY = 'banderas-visited-countries'

export function useGame() {
    const countries = ref([])
    const knownCountries = ref(new Set())
    const visitedCountries = ref(new Set())
    const loading = ref(true)
    const error = ref(null)
    const currentCountry = ref(null)

    const gameMode = ref('learning') // 'learning' | 'survival'
    const regionFilter = ref(null)
    const sessionQueue = ref([])
    const sessionScore = ref(0)
    const gameStatus = ref('menu') // 'menu' | 'playing' | 'finished' | 'selecting'
    const selectedCodes = ref(new Set())

    const sessionTotal = ref(0)

    const score = computed(() => {
        if (['survival', 'capital', 'custom'].includes(gameMode.value)) return sessionScore.value
        return knownCountries.value.size
    })

    const total = computed(() => {
        if (['survival', 'capital', 'custom'].includes(gameMode.value)) return sessionTotal.value
        if (regionFilter.value) return countries.value.filter(c => c.region === regionFilter.value).length
        return countries.value.length
    })

    const progress = computed(() => {
        if (['survival', 'capital', 'custom'].includes(gameMode.value)) {
            return sessionTotal.value ? Math.round((sessionScore.value / sessionTotal.value) * 100) : 0
        }
        return total.value ? Math.round((knownCountries.value.size / total.value) * 100) : 0
    })

    const visitedCount = computed(() => {
        if (['survival', 'capital', 'custom'].includes(gameMode.value)) {
            return sessionTotal.value - sessionQueue.value.length
        }
        return visitedCountries.value.size
    })

    const progressVisited = computed(() => {
        if (['survival', 'capital', 'custom'].includes(gameMode.value)) {
            // In survival/custom, visited is just how many we've gone through (total - remaining)
            const played = sessionTotal.value - sessionQueue.value.length
            return sessionTotal.value ? Math.round((played / sessionTotal.value) * 100) : 0
        }
        return total.value ? Math.round((visitedCountries.value.size / total.value) * 100) : 0
    })

    // Fetch DATA
    const fetchCountries = async () => {
        loading.value = true
        try {
            const savedKnown = localStorage.getItem(STORAGE_KEY)
            if (savedKnown) {
                knownCountries.value = new Set(JSON.parse(savedKnown))
            }

            const savedVisited = localStorage.getItem(VISITED_KEY)
            if (savedVisited) {
                visitedCountries.value = new Set(JSON.parse(savedVisited))
            } else {
                // Backwards compatibility: if no visited history, assume known are visited
                visitedCountries.value = new Set(JSON.parse(savedKnown || '[]'))
            }

            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,cca3,unMember,translations,region,capital')
            const data = await res.json()

            // Filter for 196 countries: UN Members + Observers + Kosovo + Taiwan
            const extraCodes = ['VAT', 'PSE', 'UNK', 'TWN']
            countries.value = data.filter(c => c.unMember || extraCodes.includes(c.cca3))
        } catch (e) {
            error.value = "Failed to load countries. Please refresh."
            console.error(e)
        } finally {
            loading.value = false
        }
    }

    const startGame = (mode = 'learning', region = null) => {
        gameMode.value = mode
        regionFilter.value = region
        gameStatus.value = 'playing'
        sessionScore.value = 0

        // Reset visited for the new session
        visitedCountries.value = new Set()
        localStorage.removeItem(VISITED_KEY)

        let pool = countries.value
        if (region) {
            pool = pool.filter(c => c.region === region)
        }

        if (mode === 'survival' || mode === 'capital') {
            // Shuffle pool
            sessionQueue.value = [...pool].sort(() => Math.random() - 0.5)
            sessionTotal.value = sessionQueue.value.length
        } else if (mode === 'custom') {
            pool = pool.filter(c => selectedCodes.value.has(c.cca3))
            sessionQueue.value = [...pool].sort(() => Math.random() - 0.5)
            sessionTotal.value = sessionQueue.value.length
        }

        pickNextCountry()
    }

    const returnToMenu = () => {
        gameStatus.value = 'menu'
        currentCountry.value = null
    }

    // Choose next country
    const pickNextCountry = () => {
        if (['survival', 'capital', 'custom'].includes(gameMode.value)) {
            if (sessionQueue.value.length === 0) {
                gameStatus.value = 'finished'
                currentCountry.value = null
                return
            }
            currentCountry.value = sessionQueue.value.shift()
            return
        }

        // Learning Mode logic
        let pool = countries.value
        if (regionFilter.value) {
            pool = pool.filter(c => c.region === regionFilter.value)
        }

        const unknown = pool.filter(c => !knownCountries.value.has(c.cca3))
        if (unknown.length === 0) {
            gameStatus.value = 'finished'
            currentCountry.value = null
            return
        }
        // Random pick
        const randomIndex = Math.floor(Math.random() * unknown.length)
        currentCountry.value = unknown[randomIndex]
    }

    const checkAnswer = (input, onResult) => {
        if (!currentCountry.value) return

        // Normalize input and names
        const normalize = (str) => {
            if (!str) return ""
            return str
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remove accents
                .toLowerCase()
                .replace(/[^a-z0-9]/g, " ") // Replace non-alphanumeric with spaces
                .replace(/\s+/g, " ")       // Collapse spaces
                .trim()
        }

        const guess = normalize(input)

        const customAliases = {
            'COD': ['congo', 'rdc', 'zaire'],
            'GBR': ['uk', 'gb', 'royaume uni', 'angleterre'],
            'USA': ['usa', 'etats unis', 'us'],
            'ARE': ['uae', 'emirats arabes unis'],
            'CAF': ['rca', 'republique centrafricaine']
        }

        const countryCode = currentCountry.value.cca3
        const aliases = customAliases[countryCode] || []

        const names = [
            currentCountry.value.name.common,
            currentCountry.value.name.official,
            ...(currentCountry.value.altSpellings || []),
            ...(currentCountry.value.translations?.fra ? [currentCountry.value.translations.fra.common, currentCountry.value.translations.fra.official] : []),
            ...aliases
        ].map(normalize)

        if (gameMode.value === 'capital') {
            const capitals = (currentCountry.value.capital || []).map(normalize)
            if (capitals.includes(guess)) {
                sessionScore.value++
                registerVisited()
                if (onResult) onResult(true)
                pickNextCountry()
                return
            }
        } else if (names.includes(guess)) {
            if (gameMode.value === 'learning') {
                registerCorrect()
                registerVisited()
                if (onResult) onResult(true)
            } else {
                sessionScore.value++
                if (onResult) onResult(true)
                pickNextCountry()
            }
            return
        }

        if (onResult) onResult(false)
        registerVisited()
    }

    const skipCountry = () => {
        registerVisited()
        pickNextCountry()
    }

    const revealAnswer = () => {
        if (!currentCountry.value) return ''
        if (gameMode.value === 'capital') {
            return (currentCountry.value.capital || [])[0] || 'N/A'
        }
        return currentCountry.value.translations?.fra?.common || currentCountry.value.name.common
    }

    const registerCorrect = () => {
        const nextSet = new Set(knownCountries.value)
        nextSet.add(currentCountry.value.cca3)
        knownCountries.value = nextSet
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...knownCountries.value]))
        pickNextCountry()
    }

    const registerVisited = () => {
        if (!currentCountry.value) return
        const nextSet = new Set(visitedCountries.value)
        nextSet.add(currentCountry.value.cca3)
        visitedCountries.value = nextSet
        localStorage.setItem(VISITED_KEY, JSON.stringify([...visitedCountries.value]))
    }

    const resetProgress = () => {
        if (!confirm('Voulez-vous vraiment réinitialiser votre progression ?')) return
        knownCountries.value = new Set()
        visitedCountries.value = new Set()
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(VISITED_KEY)
        if (gameStatus.value === 'playing') {
            if (gameMode.value === 'survival' || gameMode.value === 'capital' || gameMode.value === 'custom') {
                startGame(gameMode.value, regionFilter.value)
            } else {
                pickNextCountry()
            }
        }
    }

    return {
        countries,
        currentCountry,
        knownCountries,
        visitedCountries,
        loading,
        error,
        score,
        total,
        progress,
        visitedCount,
        progressVisited,
        gameStatus,
        gameMode,
        selectedCodes,
        fetchCountries,
        checkAnswer,
        skipCountry,
        revealAnswer,
        resetProgress,
        startGame,
        returnToMenu
    }
}
