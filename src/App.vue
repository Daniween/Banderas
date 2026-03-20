<script setup>
import { onMounted, watch, ref, computed } from 'vue'
import FlagDisplay from './components/FlagDisplay.vue'
import QuizInput from './components/QuizInput.vue'
import ProgressBar from './components/ProgressBar.vue'
import MainMenu from './components/MainMenu.vue'
import CountrySelector from './components/CountrySelector.vue'
import MapDisplay from './components/MapDisplay.vue'
import { useGame } from './composables/useGame'
import { useAuth } from './composables/useAuth'
import Leaderboard from './components/Leaderboard.vue'
import UserProfile from './components/UserProfile.vue'
import CguPage from './components/CguPage.vue'

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
  mapFailures,
  startGame,
  returnToMenu: baseReturnToMenu,
  showCapitals,
  toggleCapitals,
  finishGame,
  formattedTime
} = useGame()

const { user, loginWithGoogle, loginWithEmail, registerWithEmail, logout, updatePseudo, updateProfilePhoto, loadingAuth } = useAuth()

const appAuthError = ref('')

const handleLoginEmail = async (email, password) => {
  appAuthError.value = ''
  try {
    await loginWithEmail(email, password)
  } catch (err) {
    if (err.message && err.message.includes('Trop de tentatives')) {
      appAuthError.value = err.message
    } else if (err.code === 'auth/too-many-requests') {
      appAuthError.value = "Trop de tentatives échouées. Par sécurité, ce compte a été temporairement bloqué par le serveur. Veuillez réessayer plus tard ou réinitialiser votre mot de passe."
    } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      appAuthError.value = "Identifiant ou mot de passe incorrect."
    } else {
      appAuthError.value = "Erreur: " + (err.message || "Échec de l'opération")
    }
  }
}

const handleRegisterEmail = async (email, password, pseudo) => {
  appAuthError.value = ''
  try {
    await registerWithEmail(email, password, pseudo)
  } catch (err) {
    appAuthError.value = "Erreur: " + (err.message || "Échec de l'inscription")
  }
}

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

const handleFinishMap = async () => {
  if (confirm('Voulez-vous afficher toutes les réponses et arrêter le chrono ?')) {
    await finishGame(user.value)
  }
}

// Watch gameStatus pour sauvegarder le score automatiquement et gérer la modale
watch(gameStatus, (newStatus) => {
  if (newStatus === 'finished') {
    // On appelle finishGame avec l'utilisateur pour enregistrer le score
    finishGame(user.value)
  }
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
      :user="user"
      :loadingAuth="loadingAuth"
      :authError="appAuthError"
      @login="loginWithGoogle"
      @login-email="handleLoginEmail"
      @register-email="handleRegisterEmail"
      @logout="logout"
      @update-pseudo="updatePseudo"
      @show-leaderboard="gameStatus = 'leaderboard'"
      @show-profile="gameStatus = 'profile'"
      @show-cgu="gameStatus = 'cgu'"
    />

    <!-- LEADERBOARD VIEW -->
    <div v-else-if="gameStatus === 'leaderboard'" class="dedicated-leaderboard-view">
      <header>
        <button @click="gameStatus = 'menu'" class="home-btn" title="Retour au menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>
        <h1>CLASSEMENT MONDIAL</h1>
        <div style="width: 38px;"></div> <!-- Spacer -->
      </header>
      
      <div class="leaderboard-container glass-panel">
        <div class="lb-tabs-dedicated">
          <button @click="searchQuery = 'survival'" :class="{ active: searchQuery === 'survival' || !['capital', 'map'].includes(searchQuery) }">Survie</button>
          <button @click="searchQuery = 'capital'" :class="{ active: searchQuery === 'capital' }">Capitales</button>
          <button @click="searchQuery = 'map'" :class="{ active: searchQuery === 'map' }">Carte</button>
        </div>
        
        <Leaderboard :mode="['survival', 'capital', 'map'].includes(searchQuery) ? searchQuery : 'survival'" :key="searchQuery" />
      </div>

      <button @click="gameStatus = 'menu'" class="back-menu-btn">Retour au Menu</button>
    </div>

    <!-- USER PROFILE VIEW -->
    <UserProfile 
      v-else-if="gameStatus === 'profile'"
      :user="user"
      @back="gameStatus = 'menu'"
      @update-pseudo="updatePseudo"
      @update-photo="updateProfilePhoto"
    />

    <!-- CGU PAGE VIEW -->
    <CguPage
      v-else-if="gameStatus === 'cgu'"
      @back="gameStatus = 'menu'"
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
      <div class="time-display">Temps total : {{ formattedTime }}</div>
      <p v-if="user" class="saved-hint">Score enregistré sur votre compte !</p>
      <button @click="returnToMenu" class="restart-btn">Retour au Menu</button>
    </div>

    <!-- GAME AREA -->
    <div v-else class="game-area">
      <!-- Modal Score for Map Mode -->
      <div v-if="gameStatus === 'finished' && gameMode === 'map' && showScoreModal" class="modal-overlay">
        <div class="modal-content">
          <h2>Session terminée !</h2>
          <div class="modal-score">Score : {{ score }} / {{ total }}</div>
          <div class="modal-time">Temps : {{ formattedTime }}</div>
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
        <div class="header-title-area">
          <h1>BANDERAS</h1>
          <div v-if="gameStatus === 'playing'" class="timer-pill">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {{ formattedTime }}
          </div>
        </div>
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

        <div v-if="gameMode === 'map' && gameStatus !== 'finished'" class="map-chances-indicator">
          Chances restantes : <strong>{{ 3 - mapFailures }}</strong>
        </div>
        
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

    <!-- GLOBAL FOOTER -->
    <footer v-if="['menu', 'cgu', 'leaderboard', 'profile'].includes(gameStatus)" class="app-footer">
      <p>
        © 2026 Banderas. Tous droits réservés. - 
        <button @click="gameStatus = 'cgu'" class="cgu-link-footer">Conditions d'Utilisation & Confidentialité</button>
      </p>
    </footer>
  </div>
</template>

<style scoped src="./styles/App.css"></style>
<style scoped>
.app-footer {
  text-align: center;
  padding: 1.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin-top: auto;
  width: 100%;
}
.cgu-link-footer {
  background: none;
  border: none;
  color: #4facfe;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: inherit;
  transition: color 0.3s;
}
.cgu-link-footer:hover {
  color: #00f2fe;
}
</style>
