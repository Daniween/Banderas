import { ref, computed, onMounted } from 'vue'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase'

const STORAGE_KEY = 'banderas-known-countries'
const VISITED_KEY = 'banderas-visited-countries'
const SETTINGS_KEY = 'banderas-settings'

export function useGame() {
    const countries = ref([])
    const knownCountries = ref(new Set())
    const visitedCountries = ref(new Set())
    const loading = ref(true)
    const error = ref(null)
    const currentCountry = ref(null)
    const showCapitals = ref(false)
    const mapClickableCodes = ref(new Set())

    const gameMode = ref('learning') // 'learning' | 'survival' | 'capital' | 'custom'
    const regionFilter = ref(null)
    const sessionQueue = ref([])
    const sessionScore = ref(0)
    const gameStatus = ref('menu') // 'menu' | 'playing' | 'finished' | 'selecting'
    const selectedCodes = ref(new Set())
    const correctSessionCountries = ref(new Set())
    const revealedSessionCountries = ref(new Set())
    const redSessionCountry = ref(null)
    const timerSeconds = ref(0)
    let timerInterval = null

    const sessionTotal = ref(0)

    const score = computed(() => {
        if (['survival', 'capital', 'custom', 'map'].includes(gameMode.value)) return sessionScore.value
        return knownCountries.value.size
    })

    const total = computed(() => {
        if (['survival', 'capital', 'custom', 'map'].includes(gameMode.value)) return sessionTotal.value
        if (regionFilter.value) return countries.value.filter(c => c.region === regionFilter.value).length
        return countries.value.length
    })

    const progress = computed(() => {
        if (['survival', 'capital', 'custom', 'map'].includes(gameMode.value)) {
            return sessionTotal.value ? Math.round((sessionScore.value / sessionTotal.value) * 100) : 0
        }
        return total.value ? Math.round((knownCountries.value.size / total.value) * 100) : 0
    })

    const formattedTime = computed(() => {
        const mins = Math.floor(timerSeconds.value / 60)
        const secs = timerSeconds.value % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    })

    const visitedCount = computed(() => {
        if (['survival', 'capital', 'custom', 'map'].includes(gameMode.value)) {
            return sessionTotal.value - sessionQueue.value.length
        }
        return visitedCountries.value.size
    })

    const progressVisited = computed(() => {
        if (['survival', 'capital', 'custom', 'map'].includes(gameMode.value)) {
            // In survival/custom/map, visited is just how many we've gone through (total - remaining)
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

            const savedSettings = localStorage.getItem(SETTINGS_KEY)
            if (savedSettings) {
                const settings = JSON.parse(savedSettings)
                showCapitals.value = !!settings.showCapitals
            }

            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,cca3,unMember,translations,region,capital,latlng')
            const data = await res.json()

            // Filter for 197 countries: UN Members + Observers + Kosovo + Taiwan + GNB (fix for API)
            const extraCodes = ['VAT', 'PSE', 'UNK', 'TWN', 'GNB']
            countries.value = data.filter(c => c.unMember || extraCodes.includes(c.cca3))

            // Fetch Map GeoJSON to know which countries are clickable
            try {
                const mapRes = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
                const mapData = await mapRes.json()
                const codes = new Set()
                const CODE_MAPPING = { 'UNK': 'CS-KM', 'PSE': 'PS' }

                mapData.features.forEach(f => {
                    const id = f.id || f.properties.id || f.properties.iso_a3 || f.properties.ISO_A3 || f.properties.cca3
                    codes.add(id)
                })

                // Add the API codes that map to these GeoJSON codes
                Object.entries(CODE_MAPPING).forEach(([apiCode, geoCode]) => {
                    if (codes.has(geoCode)) codes.add(apiCode)
                })

                mapClickableCodes.value = codes
            } catch (err) {
                console.warn("Could not load Map GeoJSON for filtering:", err)
            }
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
        correctSessionCountries.value = new Set()
        revealedSessionCountries.value = new Set()
        redSessionCountry.value = null
        hasSaved.value = false

        // Timer logic
        resetTimer()
        startTimer()

        // Reset visited for the new session
        visitedCountries.value = new Set()
        localStorage.removeItem(VISITED_KEY)

        let pool = countries.value
        if (region) {
            pool = pool.filter(c => c.region === region)
        }

        if (mode === 'survival' || mode === 'capital' || mode === 'map') {
            if (mode === 'map' && mapClickableCodes.value.size > 0) {
                pool = pool.filter(c => mapClickableCodes.value.has(c.cca3))
            }
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
        redSessionCountry.value = null
        stopTimer()
        timerSeconds.value = 0
    }

    // Choose next country
    const pickNextCountry = () => {
        if (['survival', 'capital', 'custom', 'map'].includes(gameMode.value)) {
            if (sessionQueue.value.length === 0) {
                finishGame()
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

        if (gameMode.value === 'map') {
            if (input === currentCountry.value.cca3) {
                sessionScore.value++

                // Move previous red to orange if it exists
                if (redSessionCountry.value) {
                    const nextRevealed = new Set(revealedSessionCountries.value)
                    nextRevealed.add(redSessionCountry.value)
                    revealedSessionCountries.value = nextRevealed
                    redSessionCountry.value = null
                }

                const nextCorrect = new Set(correctSessionCountries.value)
                nextCorrect.add(currentCountry.value.cca3)
                correctSessionCountries.value = nextCorrect
                if (onResult) onResult(true)
                pickNextCountry()
            } else {
                if (onResult) onResult(false)
                registerVisited()
            }
            return
        }

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
            'COD': ['rd congo', 'rdc'],
            'GBR': ['uk', 'royaume uni', 'angleterre'],
            'USA': ['usa', 'etats unis'],
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
                const nextCorrect = new Set(correctSessionCountries.value)
                nextCorrect.add(currentCountry.value.cca3)
                correctSessionCountries.value = nextCorrect
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

    const toggleCapitals = () => {
        showCapitals.value = !showCapitals.value
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showCapitals: showCapitals.value }))
    }

    const resetProgress = () => {
        if (!confirm('Voulez-vous vraiment réinitialiser votre progression ?')) return
        knownCountries.value = new Set()
        visitedCountries.value = new Set()
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(VISITED_KEY)
        if (gameStatus.value === 'playing') {
            // Restart the current game session (this will reset the timer and score)
            startGame(gameMode.value, regionFilter.value)
        }
    }

    const hasSaved = ref(false)

    const finishGame = async (user = null) => {
        gameStatus.value = 'finished'
        currentCountry.value = null
        stopTimer()

        // Si l'utilisateur est connecté et qu'on n'a pas encore sauvé ce tour
        if (user && user.uid && sessionTotal.value > 0 && !hasSaved.value) {
            console.log("Saving game...", { score: sessionScore.value, time: timerSeconds.value });
            hasSaved.value = true
            try {
                await addDoc(collection(db, 'scores'), {
                    userId: user.uid,
                    pseudo: user.pseudo || user.displayName,
                    mode: gameMode.value,
                    region: regionFilter.value || 'world',
                    score: sessionScore.value,
                    total: sessionTotal.value,
                    timeSeconds: timerSeconds.value,
                    formattedTime: formattedTime.value,
                    timestamp: serverTimestamp()
                })

                // Mettre à jour les stats de l'utilisateur (cumul)
                const userRef = doc(db, 'users', user.uid)
                await updateDoc(userRef, {
                    "stats.totalGames": increment(1),
                    "stats.totalPlayTime": increment(timerSeconds.value)
                })
            } catch (err) {
                console.error("Erreur lors de l'enregistrement du score:", err)
            }
        }
    }

    const startTimer = () => {
        if (timerInterval) clearInterval(timerInterval)
        timerSeconds.value = 0
        timerInterval = setInterval(() => {
            timerSeconds.value++
        }, 1000)
    }

    const stopTimer = () => {
        if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
        }
    }

    const resetTimer = () => {
        stopTimer()
        timerSeconds.value = 0
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
        correctSessionCountries,
        revealedSessionCountries,
        redSessionCountry,
        showCapitals,
        timerSeconds,
        formattedTime,
        fetchCountries,
        checkAnswer,
        skipCountry,
        revealAnswer,
        resetProgress,
        startGame,
        returnToMenu,
        toggleCapitals,
        finishGame
    }
}
