import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'banderas-known-countries'

export function useGame() {
    const countries = ref([])
    const knownCountries = ref(new Set())
    const loading = ref(true)
    const error = ref(null)
    const currentCountry = ref(null)

    const gameMode = ref('learning') // 'learning' | 'survival'
    const regionFilter = ref(null)
    const sessionQueue = ref([])
    const sessionScore = ref(0)
    const gameStatus = ref('menu') // 'menu' | 'playing' | 'finished'

    const sessionTotal = ref(0)

    const score = computed(() => {
        if (gameMode.value === 'survival') return sessionScore.value
        return knownCountries.value.size
    })

    const total = computed(() => {
        if (gameMode.value === 'survival') return sessionTotal.value
        if (regionFilter.value) return countries.value.filter(c => c.region === regionFilter.value).length
        return countries.value.length
    })

    const progress = computed(() => {
        if (gameMode.value === 'survival') {
            return sessionTotal.value ? Math.round((sessionScore.value / sessionTotal.value) * 100) : 0
        }
        return total.value ? Math.round((knownCountries.value.size / total.value) * 100) : 0
    })

    // Fetch DATA
    const fetchCountries = async () => {
        loading.value = true
        try {
            const savedKnown = localStorage.getItem(STORAGE_KEY)
            if (savedKnown) {
                knownCountries.value = new Set(JSON.parse(savedKnown))
            }

            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,cca3,unMember,translations,region')
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

        let pool = countries.value
        if (region) {
            pool = pool.filter(c => c.region === region)
        }

        if (mode === 'survival') {
            // Shuffle pool
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
        if (gameMode.value === 'survival') {
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
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
        const guess = normalize(input)

        const names = [
            currentCountry.value.name.common,
            currentCountry.value.name.official,
            ...(currentCountry.value.altSpellings || []),
            ...(currentCountry.value.translations?.fra ? [currentCountry.value.translations.fra.common, currentCountry.value.translations.fra.official] : [])
        ].map(normalize)

        if (names.includes(guess)) {
            if (gameMode.value === 'learning') {
                registerCorrect()
                if (onResult) onResult(true)
            } else {
                sessionScore.value++
                if (onResult) onResult(true)
                pickNextCountry()
            }
            return
        }

        if (onResult) onResult(false)
    }

    const skipCountry = () => {
        pickNextCountry()
    }

    const revealAnswer = () => {
        return currentCountry.value ? currentCountry.value.name.common : ''
    }

    const registerCorrect = () => {
        knownCountries.value.add(currentCountry.value.cca3)
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...knownCountries.value]))
        pickNextCountry()
    }

    const resetProgress = () => {
        if (!confirm('Voulez-vous vraiment réinitialiser votre progression ?')) return
        knownCountries.value.clear()
        localStorage.removeItem(STORAGE_KEY)
        if (gameStatus.value === 'playing') pickNextCountry()
    }

    return {
        countries,
        currentCountry,
        knownCountries,
        loading,
        error,
        score,
        total,
        progress,
        gameStatus,
        gameMode,
        fetchCountries,
        checkAnswer,
        skipCountry,
        revealAnswer,
        resetProgress,
        startGame,
        returnToMenu
    }
}
