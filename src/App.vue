<script setup>
import { onMounted, watch, ref } from 'vue'
import FlagDisplay from './components/FlagDisplay.vue'
import QuizInput from './components/QuizInput.vue'
import ProgressBar from './components/ProgressBar.vue'
import MainMenu from './components/MainMenu.vue'
import CountrySelector from './components/CountrySelector.vue'
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
  startGame,
  returnToMenu
} = useGame()

const quizInputRef = ref(null)

onMounted(() => {
  fetchCountries()
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
  const answer = revealAnswer()
  alert(`La réponse est : ${answer}`)
  handleSkip()
}
</script>

<template>
  <div class="app-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des drapeaux...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <!-- MAIN MENU -->
    <MainMenu v-else-if="gameStatus === 'menu'" @start="startGame" @select-custom="gameStatus = 'selecting'" />

    <!-- COUNTRY SELECTOR -->
    <CountrySelector 
      v-else-if="gameStatus === 'selecting'" 
      :countries="countries" 
      v-model:selectedCodes="selectedCodes"
      @start="startGame('custom')"
      @back="returnToMenu"
    />

    <!-- GAME FINISHED -->
    <div v-else-if="gameStatus === 'finished'" class="celebration">
      <h2>Félicitations !</h2>
      <p>Vous avez terminé cette session.</p>
      <div class="score-display">Score final : {{ score }} / {{ total }}</div>
      <button @click="returnToMenu" class="restart-btn">Retour au Menu</button>
    </div>

    <!-- GAME PLAYING -->
    <div v-else class="game-area">
      <header>
        <button @click="returnToMenu" class="home-btn" title="Retour au menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>
        <h1>BANDERAS</h1>
        <button @click="handleReset" class="reset-btn" title="Réinitialiser">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        </button>
      </header>

      <ProgressBar :score="score" :visited="visitedCount" :total="total" />

      <main v-if="currentCountry">
        <FlagDisplay 
          :flagUrl="currentCountry.flags.svg" 
          :alt="currentCountry.name.common"
        />        
        
        <h2 v-if="gameMode === 'capital'" class="country-name-hint">
          {{ currentCountry.translations?.fra?.common || currentCountry.name.common }}
        </h2>
        
        <QuizInput ref="quizInputRef" @submit="handleCheck" />

        <div class="skip-container">
          <button @click="handleSkip" class="skip-btn">Passer ce drapeau</button>
          <button @click="handleReveal" class="skip-btn reveal-btn">Voir la réponse</button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped src="./styles/App.css"></style>
