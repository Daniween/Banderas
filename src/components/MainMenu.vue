<script setup>
import { ref, watch } from 'vue'
import Leaderboard from './Leaderboard.vue'
import AuthModal from './AuthModal.vue'

const props = defineProps({
  showCapitals: Boolean,
  user: Object,
  loadingAuth: Boolean
})
const emit = defineEmits(['start', 'select-custom', 'toggle-capitals', 'login', 'login-email', 'register-email', 'logout', 'update-pseudo', 'show-leaderboard', 'show-profile'])

const showContinents = ref(false)
const continents = [
  { label: 'Afrique', value: 'Africa' },
  { label: 'Amériques', value: 'Americas' },
  { label: 'Asie', value: 'Asia' },
  { label: 'Europe', value: 'Europe' },
  { label: 'Océanie', value: 'Oceania' }
]

const toggleContinents = () => {
  showContinents.value = !showContinents.value
}



// Auth Form State
const authMode = ref('none') // 'none' | 'login' | 'register'
const email = ref('')
const password = ref('')
const registerPseudo = ref('')
const authError = ref('')

const handleEmailAuth = async () => {
  authError.value = ''
  try {
    if (authMode.value === 'login') {
      await emit('login-email', email.value, password.value)
    } else {
      await emit('register-email', email.value, password.value, registerPseudo.value)
      alert("Inscription réussie ! Un email de vérification a été envoyé.")
    }
    authMode.value = 'none'
    showAuthModal.value = false // Ferme la modale manuellement après succès e-mail
  } catch (err) {
    authError.value = "Erreur: " + (err.message || "Échec de l'opération")
  }
}

const showAuthModal = ref(false)

// Fermer la modale automatiquement quand l'utilisateur est connecté
watch(() => props.user, (newUser) => {
  if (newUser && showAuthModal.value) {
    showAuthModal.value = false
  }
})
</script>

<template>
  <div class="main-menu">
    <h1 class="title">Banderas</h1>
    <p class="subtitle">Maîtrisez les 197 drapeaux de l'ONU</p>

    <!-- TOP-RIGHT AUTH CORNER -->
    <div class="auth-corner">
      <div v-if="loadingAuth" class="auth-loader">...</div>
      
      <div v-else-if="user" class="user-profile-compact">
        <div class="user-meta" @click="$emit('show-profile')">
          <img :src="user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid" alt="Avatar" class="user-avatar-mini">
          <span class="user-pseudo-mini">{{ user.pseudo }}</span>
        </div>
        <button @click="$emit('logout')" class="logout-icon-btn" title="Déconnexion">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>

      <button v-else @click="showAuthModal = true" class="login-corner-btn">
        Connexion
      </button>
    </div>

    <!-- AUTH MODAL -->
    <AuthModal 
      v-if="showAuthModal" 
      :authError="authError"
      @close="showAuthModal = false"
      @login-google="$emit('login')"
      @login-email="(e, p) => $emit('login-email', e, p)"
      @register-email="(e, p, ps) => $emit('register-email', e, p, ps)"
    />

    <div class="menu-buttons">
      <button @click="$emit('start', 'learning', null)" class="menu-btn primary">
        Apprentissage - Aléatoire
      </button>

      <button @click="$emit('start', 'survival', null)" class="menu-btn secondary">
        Mode survie one-pass
      </button>

      <button @click="$emit('start', 'capital', null)" class="menu-btn primary capital-mode">
        Mode Capitales
      </button>

      <button @click="$emit('start', 'map', null)" class="menu-btn map-mode">
        Mode Carte
      </button>

      <button @click="$emit('select-custom')" class="menu-btn primary custom-mode">
        Entraînement Personnalisé
      </button>

      <div class="continent-section">
        <button @click="toggleContinents" class="menu-btn tertiary">
          Par Continent
        </button>
        
        <div v-if="showContinents" class="continent-list">
          <button 
            v-for="c in continents" 
            :key="c.value"
            @click="$emit('start', 'survival', c.value)"
            class="continent-btn"
          >
            {{ c.label }}
          </button>
        </div>
      </div>

      <!-- LEADERBOARD TRIGGER -->
      <button @click="$emit('show-leaderboard')" class="menu-btn tertiary ranking-btn">
        Afficher le classement mondial
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2z"></path><path d="M12 16l4-4-4-4"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
      </button>
    </div>

    <div class="settings-footer">
      <label class="toggle-container">
        <input type="checkbox" :checked="showCapitals" @change="$emit('toggle-capitals')">
        <span class="slider"></span>
        <span class="label-text">Afficher les capitales</span>
      </label>
    </div>
  </div>
</template>

<style src="../styles/MainMenu.css"></style>
