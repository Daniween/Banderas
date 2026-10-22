<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  authError: String,
  busy: Boolean,
})

const emit = defineEmits(['close', 'login-google', 'login-email', 'register-email', 'reset-password', 'show-cgu', 'clear-error'])

const authMode = ref('login') // 'login' | 'register' | 'reset'
const email = ref('')
const password = ref('')
const pseudo = ref('')
const cguAccepted = ref(false)
const emailInput = ref(null)

const TITLES = {
  login: ['Connexion', 'Heureux de vous revoir !'],
  register: ['Inscription', 'Enregistrez vos scores et entrez dans le classement.'],
  reset: ['Mot de passe oublié', 'Recevez un lien de réinitialisation par e-mail.'],
}

const title = computed(() => TITLES[authMode.value])

const submitLabel = computed(
  () => ({ login: 'Se connecter', register: 'Créer mon compte', reset: 'Envoyer le lien' })[authMode.value],
)

const switchMode = (mode) => {
  authMode.value = mode
  emit('clear-error')
}

const submit = () => {
  if (authMode.value === 'login') emit('login-email', email.value, password.value)
  else if (authMode.value === 'register') emit('register-email', email.value, password.value, pseudo.value)
  else emit('reset-password', email.value)
}

onMounted(async () => {
  await nextTick()
  emailInput.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
      <div class="modal auth" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="icon-btn close" @click="emit('close')" aria-label="Fermer">
          <AppIcon name="x" :size="18" />
        </button>

        <header class="auth-header">
          <h2 id="auth-title" class="modal-title">{{ title[0] }}</h2>
          <p class="modal-text">{{ title[1] }}</p>
        </header>

        <template v-if="authMode !== 'reset'">
          <button class="btn btn--block google" :disabled="busy" @click="emit('login-google')">
            <AppIcon name="google" :size="20" /> Continuer avec Google
          </button>
          <div class="divider"><span>ou par e-mail</span></div>
        </template>

        <form class="auth-form" @submit.prevent="submit">
          <label class="field">
            <span>Adresse e-mail</span>
            <input ref="emailInput" v-model="email" type="email" class="input" autocomplete="email" required />
          </label>

          <label v-if="authMode !== 'reset'" class="field">
            <span class="field-row">
              Mot de passe
              <button v-if="authMode === 'login'" type="button" class="link-btn small" @click="switchMode('reset')">
                Oublié ?
              </button>
            </span>
            <input
              v-model="password"
              type="password"
              class="input"
              :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
              :minlength="authMode === 'register' ? 6 : undefined"
              required
            />
          </label>

          <template v-if="authMode === 'register'">
            <label class="field">
              <span>Pseudo <small>(visible dans le classement)</small></span>
              <input v-model="pseudo" type="text" class="input" maxlength="20" autocomplete="nickname" required />
            </label>

            <label class="cgu">
              <input v-model="cguAccepted" type="checkbox" required />
              <span>
                J'accepte les
                <button type="button" class="link-btn" @click="emit('show-cgu')">CGU et la politique de confidentialité</button>
              </span>
            </label>
          </template>

          <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>

          <button type="submit" class="btn btn--primary btn--block btn--lg" :disabled="busy">
            <span v-if="busy" class="mini-spinner" aria-hidden="true"></span>
            {{ submitLabel }}
          </button>
        </form>

        <footer class="auth-footer">
          <template v-if="authMode === 'login'">
            Pas encore de compte ? <button class="link-btn" @click="switchMode('register')">S'inscrire</button>
          </template>
          <template v-else-if="authMode === 'register'">
            Déjà inscrit ? <button class="link-btn" @click="switchMode('login')">Se connecter</button>
          </template>
          <template v-else>
            <button class="link-btn" @click="switchMode('login')">Retour à la connexion</button>
          </template>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.auth {
  max-width: 420px;
}

.close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
}

.auth-header {
  margin-bottom: 1.5rem;
  padding-right: 2rem;
}

.google {
  --btn-bg: #fff;
  --btn-color: #1f2937;
  --btn-border: transparent;
}

.google:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: transparent;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin: 1.25rem 0;
  color: var(--text-subtle);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
}

.field small {
  color: var(--text-subtle);
  font-weight: 400;
}

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.small {
  font-size: 0.85rem;
}

.cgu {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.45;
  cursor: pointer;
}

.cgu input {
  margin-top: 0.2rem;
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.auth-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #fecaca;
  font-size: 0.9rem;
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

.auth-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.92rem;
  color: var(--text-muted);
}
</style>
