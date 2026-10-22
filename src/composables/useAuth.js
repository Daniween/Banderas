import { ref } from 'vue'
import { loadBackend, authErrorMessage } from '../services'
import { readJson, writeJson, remove } from '../lib/storage'

// État partagé par toute l'application
const user = ref(null)
const loadingAuth = ref(true)
const authError = ref('')
const authBusy = ref(false)

const ATTEMPTS_KEY = 'banderas-login-attempts'
const MAX_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000

let started = false

/** Démarre l'écoute de la session Firebase, sans bloquer le premier affichage. */
export function initAuth() {
  if (started) return
  started = true

  // Si Firebase ne répond pas, on n'affiche pas un chargement infini
  const failsafe = setTimeout(() => (loadingAuth.value = false), 5000)

  const start = () =>
    loadBackend()
      .then(({ watchUser }) =>
        watchUser((profile) => {
          clearTimeout(failsafe)
          user.value = profile
          loadingAuth.value = false
        }),
      )
      .catch((err) => {
        console.error('Firebase indisponible :', err)
        loadingAuth.value = false
      })

  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 })
  else setTimeout(start, 200)
}

// Limitation côté client des tentatives de connexion par e-mail (en plus de celle de Firebase)
function checkRateLimit() {
  const data = readJson(ATTEMPTS_KEY, null)
  if (!data?.blockedUntil) return
  const left = data.blockedUntil - Date.now()
  if (left > 0) {
    throw Object.assign(new Error(`Trop de tentatives. Réessayez dans ${Math.ceil(left / 60000)} min.`), {
      code: 'app/rate-limited',
    })
  }
  remove(ATTEMPTS_KEY)
}

function recordFailedAttempt() {
  const data = readJson(ATTEMPTS_KEY, { count: 0, blockedUntil: null })
  data.count += 1
  if (data.count >= MAX_ATTEMPTS) data.blockedUntil = Date.now() + LOCK_MS
  writeJson(ATTEMPTS_KEY, data)
}

/** Exécute une action d'authentification en gérant l'état « occupé » et les messages d'erreur. */
async function run(action) {
  authError.value = ''
  authBusy.value = true
  try {
    await action(await loadBackend())
    return true
  } catch (err) {
    const message = authErrorMessage(err)
    if (message) authError.value = message
    return false
  } finally {
    authBusy.value = false
  }
}

export function useAuth() {
  const loginWithGoogle = () => run((b) => b.loginWithGoogle())

  const loginWithEmail = (email, password) =>
    run(async (b) => {
      checkRateLimit()
      try {
        await b.loginWithEmail(email, password)
        remove(ATTEMPTS_KEY)
      } catch (err) {
        if (err.code !== 'app/email-not-verified') recordFailedAttempt()
        throw err
      }
    })

  const registerWithEmail = (email, password, pseudo) =>
    run((b) => b.registerWithEmail(email, password, pseudo.trim()))

  const resetPassword = (email) => run((b) => b.resetPassword(email))

  const logout = () => run((b) => b.logout()).then(() => (user.value = null))

  const updatePseudo = async (pseudo) => {
    const clean = pseudo.trim().slice(0, 20)
    if (!user.value || !clean) return false
    const ok = await run((b) => b.updatePseudo(user.value.uid, clean))
    if (ok) user.value = { ...user.value, pseudo: clean }
    return ok
  }

  const clearAuthError = () => (authError.value = '')

  return {
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
  }
}
