<script setup>
import { onMounted, watch, ref, computed } from 'vue'
import FlagDisplay from './components/FlagDisplay.vue'
import QuizInput from './components/QuizInput.vue'
import ProgressBar from './components/ProgressBar.vue'
import MainMenu from './components/MainMenu.vue'
import CountrySelector from './components/CountrySelector.vue'
import MapDisplay from './components/MapDisplay.vue'
import { useGame } from './composables/useGame'

const { 
  currentCountry, 
  loading, 
  error, 
  score, 
  visitedCount,
  total,
  countries,
  selectedCodes,
  fetchCountries,
  checkAnswer,
  skipCountry,
  revealAnswer,
  resetProgress,
  gameStatus,
  gameMode,
  correctSessionCountries,
  revealedSessionCountries,
  redSessionCountry,
  startGame,
  returnToMenu: baseReturnToMenu,
  showCapitals,
  toggleCapitals,
  finishGame
} = useGame()

const quizInputRef = ref(null)
const showScoreModal = ref(true)
const searchQuery = ref('')

const searchedCountryCode = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return null
  
  const q = searchQuery.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const found = countries.value.find(c => {
    const names = [
      c.name.common,
      c.translations?.fra?.common || '',
      c.cca3
    ].map(n => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    
    return names.some(n => n.includes(q))
  })
  
  return found?.cca3 || null
})

onMounted(() => {
  fetchCountries()
})

const returnToMenu = () => {
  showScoreModal.value = true
  baseReturnToMenu()
}

const handleFinishMap = () => {
  if (confirm('Voulez-vous afficher toutes les réponses et arrêter le chrono ?')) {
    finishGame()
  }
}

// Watch gameStatus to reset modal state
watch(gameStatus, (newStatus) => {
  if (newStatus === 'playing') {
    showScoreModal.value = true
  }
})

const handleCheck = (input, callback) => {
  checkAnswer(input, (success) => {
    if (callback) callback(success)
  })
}

const handleReset = () => {
  resetProgress()
}

const handleSkip = () => {
  skipCountry()
  quizInputRef.value?.clearInput()
}

const handleReveal = () => {
  if (gameMode.value === 'map' && currentCountry.value) {
    // If there was already a red country, it's now old. Move to orange.
    if (redSessionCountry.value) {
      revealedSessionCountries.value.add(redSessionCountry.value)
    }
    redSessionCountry.value = currentCountry.value.cca3
  }
  const answer = revealAnswer()
  alert(`La réponse est : ${answer}`)
  handleSkip()
}
</script>

<template>
  <div :class="['app-container', { 'map-layout': gameMode === 'map', 'is-finished': gameStatus === 'finished' }]">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des drapeaux...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <!-- MAIN MENU -->
    <MainMenu 
      v-else-if="gameStatus === 'menu'" 
      @start="startGame" 
      @select-custom="gameStatus = 'selecting'"
      :showCapitals="showCapitals"
      @toggle-capitals="toggleCapitals"
    />

    <!-- COUNTRY SELECTOR -->
    <CountrySelector 
      v-else-if="gameStatus === 'selecting'" 
      :countries="countries" 
      v-model:selectedCodes="selectedCodes"
      @start="startGame('custom')"
      @back="returnToMenu"
    />

    <!-- GAME FINISHED (Other modes) -->
    <div v-else-if="gameStatus === 'finished' && gameMode !== 'map'" class="celebration">
      <h2>Félicitations !</h2>
      <p>Vous avez terminé cette session.</p>
      <div class="score-display">Score final : {{ score }} / {{ total }}</div>
      <button @click="returnToMenu" class="restart-btn">Retour au Menu</button>
    </div>

    <!-- GAME AREA -->
    <div v-else class="game-area">
      <!-- Modal Score for Map Mode -->
      <div v-if="gameStatus === 'finished' && gameMode === 'map' && showScoreModal" class="modal-overlay">
        <div class="modal-content">
          <h2>Session terminée !</h2>
          <div class="modal-score">Score : {{ score }} / {{ total }}</div>
          <p>Vous pouvez maintenant explorer la carte.</p>
          <div class="modal-actions">
            <button @click="showScoreModal = false" class="modal-explore-btn">Explorer la carte</button>
            <button @click="returnToMenu" class="modal-close-btn">Retour au Menu</button>
          </div>
        </div>
      </div>

      <header>
        <button @click="returnToMenu" class="home-btn" title="Retour au menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>
        <h1>BANDERAS</h1>
        <div class="header-actions">
          <button 
            @click="toggleCapitals" 
            :class="['settings-btn', { active: showCapitals }]" 
            :title="showCapitals ? 'Cacher les capitales' : 'Afficher les capitales'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </button>
          <button @click="handleReset" class="reset-btn" title="Réinitialiser">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          </button>
        </div>
      </header>

      <ProgressBar :score="score" :visited="visitedCount" :total="total" />

      <main v-if="currentCountry || (gameStatus === 'finished' && gameMode === 'map')" :class="{ 'map-mode-main': gameMode === 'map' }">
        <FlagDisplay 
          v-if="currentCountry"
          :flagUrl="currentCountry.flags.svg" 
          :alt="currentCountry.name.common"
          :class="{ 'map-flag': gameMode === 'map' }"
        />        
        
        <div v-if="gameStatus === 'finished' && gameMode === 'map'" class="map-search-container">
          <h3>Rechercher un pays</h3>
          <div class="search-input-wrapper">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Ex: France, Espagne..."
              class="search-input"
            />
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <p v-if="searchQuery && searchQuery.length >= 2 && !searchedCountryCode" class="search-no-result">
            {{ countries.find(c => (c.name.common.toLowerCase().includes(searchQuery.toLowerCase()) || (c.translations?.fra?.common || '').toLowerCase().includes(searchQuery.toLowerCase()))) 
               ? 'Ce pays est trop petit pour être cliquable sur cette carte' 
               : 'Pays non trouvé' }}
          </p>
        </div>

        <h2 v-if="currentCountry && gameMode === 'capital'" class="country-name-hint">
          {{ currentCountry.translations?.fra?.common || currentCountry.name.common }}
        </h2>

        <div v-else-if="currentCountry && showCapitals && currentCountry.capital" class="capital-hint">
          Capitale : <span>{{ currentCountry.capital[0] }}</span>
        </div>
        
        <template v-if="gameMode === 'map'">
          <MapDisplay 
            :currentCountry="currentCountry" 
            :countries="countries"
            :correctSessionCountries="correctSessionCountries"
            :revealedSessionCountries="revealedSessionCountries"
            :redSessionCountry="redSessionCountry"
            :highlightedCountryCode="searchedCountryCode"
            :isFinished="gameStatus === 'finished'"
            @submit="(code) => handleCheck(code)" 
          />
        </template>
        <template v-else>
          <QuizInput ref="quizInputRef" @submit="handleCheck" />
        </template>

        <div v-if="currentCountry" class="skip-container">
          <button @click="handleSkip" class="skip-btn">Passer ce drapeau</button>
          <button @click="handleReveal" class="skip-btn reveal-btn">Voir la réponse</button>
          <button v-if="gameMode === 'map'" @click="handleFinishMap" class="skip-btn finish-btn">Voir toutes les réponses</button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped src="./styles/App.css"></style>
