<script setup>
import { ref } from 'vue'

const props = defineProps({
  user: Object,
  authError: String,
  loadingAuth: Boolean
})

const emit = defineEmits(['login-google', 'login-email', 'register-email', 'close', 'update-pseudo', 'show-cgu'])

const authMode = ref('login') // 'login' | 'register'
const email = ref('')
const password = ref('')
const registerPseudo = ref('')
const handleEmailAuth = () => {
  if (authMode.value === 'login') {
    emit('login-email', email.value, password.value)
  } else {
    emit('register-email', email.value, password.value, registerPseudo.value)
  }
}
</script>

<template>
  <div class="auth-modal-overlay" @click.self="$emit('close')">
    <div class="auth-modal-content glass-panel">
      <button class="close-modal-btn" @click="$emit('close')">×</button>
      
      <div class="auth-header">
        <h2>{{ authMode === 'login' ? 'Connexion' : 'Inscription' }}</h2>
        <p>{{ authMode === 'login' ? 'Heureux de vous revoir !' : 'Rejoignez la communauté Banderas' }}</p>
      </div>

      <div class="auth-body">
        <button @click="$emit('login-google')" class="auth-btn google">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10s10-4.48 10-10A10 10 0 0 0 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path><circle cx="12" cy="10" r="3"></circle><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path></svg>
          Continuer avec Google
        </button>

        <div class="divider">
          <span>OU</span>
        </div>

        <form @submit.prevent="handleEmailAuth" class="email-form">
          <input v-model="email" type="email" placeholder="Email" required class="auth-input">
          <input v-model="password" type="password" placeholder="Mot de passe" required class="auth-input">
          <input v-if="authMode === 'register'" v-model="registerPseudo" type="text" placeholder="Pseudo" maxlength="20" required class="auth-input">
          
          <div v-if="authMode === 'register'" class="cgu-checkbox-container">
            <input type="checkbox" id="cgu-checkbox" required class="cgu-checkbox">
            <label for="cgu-checkbox" class="cgu-label">
              J'accepte les <a href="#" @click.prevent="$emit('show-cgu')" class="cgu-link">CGU et Politique de Confidentialité</a>
            </label>
          </div>

          <p v-if="authError" class="auth-error">{{ authError }}</p>

          <button type="submit" class="auth-submit-btn">
            {{ authMode === 'login' ? 'Se connecter' : "S'inscrire" }}
          </button>
        </form>
      </div>

      <div class="auth-footer">
        <p>
          {{ authMode === 'login' ? "Pas encore membre ?" : "Déjà inscrit ?" }}
          <button @click="authMode = authMode === 'login' ? 'register' : 'login'" class="switch-btn">
            {{ authMode === 'login' ? "S'inscrire" : "Se connecter" }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style>
.auth-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  animation: fadeIn 0.3s ease-out;
}

.auth-modal-content {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 3.5rem 3rem;
  border-radius: 32px;
  width: 90%;
  max-width: 440px;
  position: relative;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 100px rgba(79, 172, 254, 0.1);
  animation: modalEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.close-modal-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: rgba(255, 255, 255, 0.4);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.close-modal-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: rotate(90deg);
}

.auth-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.auth-header h2 {
  font-size: 2.2rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.5rem;
  letter-spacing: -1px;
}

.auth-header p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
}

.auth-btn.google {
  width: 100%;
  padding: 1rem;
  background: white;
  color: #1a73e8;
  border: none;
  border-radius: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.auth-btn.google:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.divider {
  margin: 1.8rem 0;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

.email-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-input {
  width: 100%;
  padding: 1.1rem 1.4rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box;
}

.auth-input:focus {
  border-color: #4facfe;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 4px rgba(79, 172, 254, 0.1);
}

.auth-submit-btn {
  width: 100%;
  padding: 1.1rem;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

.auth-submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(79, 172, 254, 0.35);
}

.cgu-checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
  text-align: left;
}

.cgu-checkbox {
  margin-top: 0.25rem;
  accent-color: #4facfe;
  cursor: pointer;
}

.cgu-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  line-height: 1.4;
  cursor: pointer;
}

.cgu-link {
  color: #4facfe;
  text-decoration: underline;
  transition: color 0.3s;
}

.cgu-link:hover {
  color: #00f2fe;
}

.auth-error {
  color: #ff4d4d;
  font-size: 0.85rem;
  text-align: center;
  background: rgba(255, 77, 77, 0.1);
  padding: 0.8rem;
  border-radius: 10px;
}

.auth-footer {
  margin-top: 2.5rem;
  text-align: center;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
}

.switch-btn {
  background: none;
  border: none;
  color: #4facfe;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  margin-left: 0.4rem;
  transition: color 0.3s;
}

.switch-btn:hover {
  color: #00f2fe;
}

@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
