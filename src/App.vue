<script setup>
import { onMounted, watch, ref } from 'vue'
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
  toggleCapitals
} = useGame()

const quizInputRef = ref(null)
const showScoreModal = ref(true)

onMounted(() => {
  fetchCountries()
})

const returnToMenu = () => {
  showScoreModal.value = true
  baseReturnToMenu()
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
  <div :class="['app-container', { 'map-layout': gameMode === 'map' }]">
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
              <path d="M3 21h18" /><path d="M3 7v1a3 3 0 0 0 6 0V7" /><path d="M9 17H4a1 1 0 0 1-1-1V7" /><path d="M15 17h5a1 1 0 0 0 1-1V7" /><path d="M15 7v1a3 3 0 0 1 6 0V7" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /><path d="M9 7h6v10H9z" />
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
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped src="./styles/App.css"></style>
