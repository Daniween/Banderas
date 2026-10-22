<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import MainMenu from './components/MainMenu.vue'
import GameView from './components/GameView.vue'
import AppDialogs from './components/AppDialogs.vue'
import { useGame } from './composables/useGame'
import { useAuth, initAuth } from './composables/useAuth'
import { confirmDialog, infoDialog, showToast } from './composables/useDialog'
import { loadBackend } from './services'

// Vues secondaires chargées à la demande
const CountrySelector = defineAsyncComponent(() => import('./components/CountrySelector.vue'))
const Leaderboard = defineAsyncComponent(() => import('./components/Leaderboard.vue'))
const UserProfile = defineAsyncComponent(() => import('./components/UserProfile.vue'))
const CguPage = defineAsyncComponent(() => import('./components/CguPage.vue'))
const AuthModal = defineAsyncComponent(() => import('./components/AuthModal.vue'))

const {
  user,
  loadingAuth,
  authError,
  authBusy,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logout,
  updatePseudo,
  clearAuthError,
} = useAuth()

const saveState = ref('idle')

async function saveResult(result) {
  saveState.value = 'idle'
  if (!user.value || result.mode === 'learning' || !result.total) return
  saveState.value = 'saving'
  try {
    const { saveScore } = await loadBackend()
    await saveScore(user.value, result)
    saveState.value = 'saved'
  } catch (err) {
    console.error("Enregistrement du score impossible :", err)
    saveState.value = 'error'
  }
}

const game = reactive(useGame({ onFinish: saveResult }))

const status = computed(() => game.gameStatus)
const inGame = computed(() => ['playing', 'finished'].includes(status.value))

// ---------- Navigation (avec prise en charge du bouton « retour » du navigateur) ----------

const goTo = (view) => (game.gameStatus = view)

const goMenu = () => {
  game.returnToMenu()
  if (history.state?.banderas) history.back()
}

const startGame = (mode, region = null) => game.startGame(mode, region)

const replay = () => {
  if (game.gameMode === 'learning') game.resetProgress()
  game.startGame(game.gameMode, game.regionFilter)
}

watch(status, (next, prev) => {
  if (prev === 'menu' && next !== 'menu') history.pushState({ banderas: true }, '')
  window.scrollTo({ top: 0 })
})

const onPopState = async () => {
  if (status.value === 'menu') return
  if (status.value === 'playing' && game.gameMode !== 'learning' && game.visitedCount > 1) {
    history.pushState({ banderas: true }, '')
    const ok = await confirmDialog({ title: 'Quitter la partie ?', message: 'La partie en cours sera perdue.', confirmLabel: 'Quitter', tone: 'danger' })
    if (ok) goMenu()
    return
  }
  game.returnToMenu()
}

onMounted(() => {
  initAuth()
  window.addEventListener('popstate', onPopState)
})
onUnmounted(() => window.removeEventListener('popstate', onPopState))

// ---------- Authentification ----------

const showAuth = ref(false)

const openAuth = () => {
  clearAuthError()
  showAuth.value = true
}

watch(user, (u, previous) => {
  if (u && showAuth.value) {
    showAuth.value = false
    showToast(`Bienvenue ${u.pseudo} !`, 'success')
  }
  if (!u && previous && ['profile'].includes(status.value)) goMenu()
})

const handleRegister = async (email, password, pseudo) => {
  if (await registerWithEmail(email, password, pseudo)) {
    showAuth.value = false
    infoDialog({
      title: 'Vérifiez vos e-mails',
      message: `Un lien de confirmation a été envoyé à ${email}. Cliquez dessus pour activer votre compte (pensez à regarder dans les spams).`,
    })
  }
}

const handleResetPassword = async (email) => {
  if (await resetPassword(email)) {
    showAuth.value = false
    infoDialog({ title: 'E-mail envoyé', message: `Si un compte existe pour ${email}, vous recevrez un lien pour choisir un nouveau mot de passe.` })
  }
}

const handleLogout = async () => {
  await logout()
  showToast('Vous êtes déconnecté.')
}

const handleUpdatePseudo = async (pseudo) => {
  if (await updatePseudo(pseudo)) showToast('Pseudo mis à jour.', 'success')
  else showToast('Impossible de modifier le pseudo.', 'error')
}

const showCguFromAuth = () => {
  showAuth.value = false
  goTo('cgu')
}
</script>

<template>
  <MainMenu
    v-if="status === 'menu'"
    :user="user"
    :loading-auth="loadingAuth"
    :show-capitals="game.showCapitals"
    :known-count="game.knownCountries.size"
    :total-count="game.countries.length"
    @start="startGame"
    @select-custom="goTo('selecting')"
    @toggle-capitals="game.toggleCapitals()"
    @login="openAuth"
    @logout="handleLogout"
    @show-leaderboard="goTo('leaderboard')"
    @show-profile="goTo('profile')"
  />

  <Leaderboard v-else-if="status === 'leaderboard'" :user="user" @back="goMenu" />

  <UserProfile
    v-else-if="status === 'profile' && user"
    :user="user"
    :known-count="game.knownCountries.size"
    :total-count="game.countries.length"
    @back="goMenu"
    @update-pseudo="handleUpdatePseudo"
  />

  <CguPage v-else-if="status === 'cgu'" @back="goMenu" />

  <CountrySelector
    v-else-if="status === 'selecting'"
    :countries="game.countries"
    v-model:selected-codes="game.selectedCodes"
    @start="startGame('custom')"
    @back="goMenu"
  />

  <GameView v-else-if="inGame" :game="game" :user="user" :save-state="saveState" @menu="goMenu" @replay="replay" />

  <footer v-if="['menu', 'leaderboard', 'profile', 'cgu'].includes(status)" class="app-footer">
    <span>© 2026 Banderas</span>
    <span aria-hidden="true">·</span>
    <button v-if="status !== 'cgu'" class="link-btn" @click="goTo('cgu')">Conditions d'utilisation & confidentialité</button>
    <span v-else>Conditions d'utilisation & confidentialité</span>
  </footer>

  <AuthModal
    v-if="showAuth"
    :auth-error="authError"
    :busy="authBusy"
    @close="showAuth = false"
    @login-google="loginWithGoogle"
    @login-email="loginWithEmail"
    @register-email="handleRegister"
    @reset-password="handleResetPassword"
    @show-cgu="showCguFromAuth"
    @clear-error="clearAuthError"
  />

  <AppDialogs />
</template>

<style scoped>
.app-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 0.6rem;
  margin-top: auto;
  padding: 1.5rem 1rem;
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
  color: var(--text-subtle);
  font-size: 0.85rem;
}

.app-footer .link-btn {
  font-weight: 500;
  color: var(--text-muted);
}

.app-footer .link-btn:hover {
  color: var(--text);
}
</style>
