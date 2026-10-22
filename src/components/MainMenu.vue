<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { REGIONS } from '../lib/quiz'

const props = defineProps({
  user: Object,
  loadingAuth: Boolean,
  showCapitals: Boolean,
  knownCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 197 },
})

const emit = defineEmits([
  'start',
  'select-custom',
  'toggle-capitals',
  'login',
  'logout',
  'show-leaderboard',
  'show-profile',
])

const showContinents = ref(false)

const progressPct = computed(() => (props.totalCount ? Math.round((props.knownCount / props.totalCount) * 100) : 0))

const avatar = computed(
  () => props.user?.photoURL || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(props.user?.uid ?? '')}`,
)

const MODES = [
  { id: 'survival', icon: 'zap', title: 'Survie', desc: 'Les 197 drapeaux, un seul passage.', color: 'var(--mode-survival)' },
  { id: 'capital', icon: 'building', title: 'Capitales', desc: 'Trouvez la capitale de chaque pays.', color: 'var(--mode-capital)' },
  { id: 'map', icon: 'map', title: 'Carte', desc: 'Placez chaque drapeau sur la carte.', color: 'var(--mode-map)' },
  { id: 'custom', icon: 'sliders', title: 'Personnalisé', desc: 'Entraînez-vous sur votre sélection.', color: 'var(--mode-custom)' },
]

const onMode = (id) => (id === 'custom' ? emit('select-custom') : emit('start', id, null))
</script>

<template>
  <div class="page menu">
    <!-- Barre supérieure -->
    <nav class="topbar" aria-label="Compte">
      <div class="brand">
        <img src="/favicon.svg" alt="" width="32" height="32" />
        <span>Banderas</span>
      </div>

      <div v-if="loadingAuth" class="skeleton account-skeleton" aria-label="Chargement du compte"></div>
      <div v-else-if="user" class="account">
        <button class="account-chip" @click="emit('show-profile')" title="Mon profil">
          <img :src="avatar" alt="" width="30" height="30" referrerpolicy="no-referrer" />
          <span>{{ user.pseudo }}</span>
        </button>
        <button class="icon-btn" @click="emit('logout')" title="Se déconnecter" aria-label="Se déconnecter">
          <AppIcon name="logout" :size="18" />
        </button>
      </div>
      <button v-else class="btn btn--sm" @click="emit('login')">
        <AppIcon name="user" :size="18" /> Connexion
      </button>
    </nav>

    <!-- En-tête -->
    <header class="hero">
      <h1>Maîtrisez les <span class="gradient-text">197 drapeaux</span> du monde</h1>
      <p>Membres de l'ONU, observateurs, Kosovo et Taïwan.</p>
    </header>

    <!-- Apprentissage (mode principal) -->
    <button class="learn-card" @click="emit('start', 'learning', null)">
      <span class="mode-icon" style="--c: var(--mode-learning)"><AppIcon name="book" :size="26" /></span>
      <span class="learn-body">
        <span class="learn-title">{{ knownCount ? "Continuer l'apprentissage" : "Commencer l'apprentissage" }}</span>
        <span class="learn-desc">Les drapeaux reviennent jusqu'à ce que vous les connaissiez tous.</span>
        <span class="learn-progress" :aria-label="`${knownCount} drapeaux appris sur ${totalCount}`">
          <span class="learn-bar"><span :style="{ width: progressPct + '%' }"></span></span>
          <span class="learn-count">{{ knownCount }} / {{ totalCount }}</span>
        </span>
      </span>
      <AppIcon name="arrow-right" class="chev" />
    </button>

    <!-- Autres modes -->
    <section class="modes" aria-label="Modes de jeu">
      <button v-for="m in MODES" :key="m.id" class="mode-card" :style="{ '--c': m.color }" @click="onMode(m.id)">
        <span class="mode-icon"><AppIcon :name="m.icon" :size="22" /></span>
        <span class="mode-title">{{ m.title }}</span>
        <span class="mode-desc">{{ m.desc }}</span>
      </button>

      <div class="mode-card continent-card" :class="{ open: showContinents }" style="--c: var(--mode-continent)">
        <button
          class="continent-toggle"
          :aria-expanded="showContinents"
          aria-controls="continent-list"
          @click="showContinents = !showContinents"
        >
          <span class="mode-icon"><AppIcon name="globe" :size="22" /></span>
          <span class="continent-text">
            <span class="mode-title">Par continent</span>
            <span class="mode-desc">Mode survie sur une région du monde.</span>
          </span>
          <AppIcon name="chevron" class="chev" />
        </button>
        <div v-if="showContinents" id="continent-list" class="continent-list">
          <button v-for="r in REGIONS" :key="r.value" class="btn btn--sm" @click="emit('start', 'survival', r.value)">
            {{ r.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Actions secondaires -->
    <section class="secondary">
      <button class="btn btn--block" @click="emit('show-leaderboard')">
        <AppIcon name="trophy" :size="18" style="color: var(--warning)" /> Classement mondial
      </button>

      <label class="switch">
        <input type="checkbox" role="switch" :checked="showCapitals" @change="emit('toggle-capitals')" />
        <span class="switch-track" aria-hidden="true"></span>
        <span>Afficher la capitale en indice</span>
      </label>
    </section>
  </div>
</template>

<style scoped>
.menu {
  max-width: 760px;
  gap: 1.5rem;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-height: 42px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}

.brand img {
  border-radius: 9px;
}

.account-skeleton {
  width: 140px;
  height: 42px;
  border-radius: var(--radius-full);
}

.account {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: fade-in 0.3s;
}

.account-chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: 44px;
  padding: 0 0.95rem 0 0.35rem;
  border-radius: var(--radius-full);
  border: 2px solid var(--border);
  background: var(--surface);
  font-weight: 800;
  box-shadow: 0 3px 0 var(--border-strong);
  transition: background-color 0.15s;
}

.account-chip:hover {
  background: var(--surface-2);
}

.account-chip img {
  border-radius: 50%;
  background: var(--surface-3);
}

.account-chip span {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero {
  text-align: center;
  padding: clamp(0.5rem, 4vw, 2rem) 0 0.5rem;
}

.hero h1 {
  font-size: clamp(2.1rem, 7.5vw, 3.4rem);
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.gradient-text {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero p {
  margin-top: 0.75rem;
  color: var(--text-muted);
}

/* Pastille d'icône pleine, à la couleur du mode */
.mode-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  color: #fff;
  background: var(--c);
  box-shadow: 0 3px 0 color-mix(in srgb, var(--c) 70%, #000);
}

.learn-card,
.mode-card {
  position: relative;
  text-align: left;
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  background: var(--surface);
  box-shadow: var(--lift) var(--border-strong);
  transition: border-color 0.15s, transform 0.2s var(--ease-bounce), box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.mode-card:not(.continent-card):hover {
  transform: translateY(-3px);
  border-color: var(--c);
  box-shadow: 0 7px 0 var(--c);
}

.mode-card:not(.continent-card):active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--c);
}

/* Carte principale : grand aplat de couleur */
.learn-card {
  --c: var(--mode-learning);
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1.4rem 1.5rem;
  color: #fff;
  background: var(--accent-gradient);
  border-color: transparent;
  box-shadow: 0 6px 0 var(--accent-strong);
}

.learn-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 9px 0 var(--accent-strong);
}

.learn-card:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 var(--accent-strong);
}

.learn-card .mode-icon {
  width: 60px;
  height: 60px;
  color: var(--accent);
  background: #fff;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.12);
}

.learn-card .learn-desc,
.learn-card .learn-count,
.learn-card .chev {
  color: rgba(255, 255, 255, 0.85);
}

.learn-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.learn-title {
  font-size: 1.3rem;
  font-weight: 900;
}

.learn-desc,
.mode-desc {
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.35;
}

.learn-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.learn-bar {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--surface-3);
  overflow: hidden;
}

.learn-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  transition: width 0.6s var(--ease-out);
}

.learn-card .learn-bar {
  background: rgba(255, 255, 255, 0.28);
}

.learn-count {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.chev {
  flex-shrink: 0;
  color: var(--text-subtle);
  transition: transform 0.25s var(--ease-out), color 0.2s;
}

.learn-card:hover .chev {
  transform: translateX(3px);
  color: #fff;
}

.modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.15rem;
}

.mode-title {
  font-size: 1.1rem;
  font-weight: 900;
  margin-top: 0.25rem;
}

.continent-card {
  grid-column: 1 / -1;
  padding: 0;
}

.continent-toggle {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1.15rem;
  border: none;
  background: none;
  text-align: left;
  border-radius: inherit;
}

.continent-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.continent-card.open .chev {
  transform: rotate(90deg);
}

.continent-toggle:hover .chev {
  color: var(--text);
}

.continent-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  padding: 0 1.15rem 1.15rem;
  animation: fade-up 0.3s var(--ease-out);
}

.secondary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding-top: 0.5rem;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  cursor: pointer;
  user-select: none;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--surface-3);
  border: 1px solid var(--border-strong);
  transition: background-color 0.25s;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s var(--ease-out);
}

.switch input:checked + .switch-track {
  background: var(--accent);
  border-color: var(--accent);
}

.switch input:checked + .switch-track::after {
  transform: translateX(20px);
}

.switch input:focus-visible + .switch-track {
  box-shadow: var(--focus-ring);
}

@media (max-width: 520px) {
  .modes {
    grid-template-columns: 1fr;
  }

  .mode-card:not(.continent-card) .mode-title {
    margin-top: 0;
  }

  .mode-card:not(.continent-card) {
    display: grid;
    align-items: center;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 1rem;
    row-gap: 0.1rem;
  }

  .mode-card:not(.continent-card) .mode-icon {
    grid-row: 1 / span 2;
  }

  .learn-card {
    padding: 1.1rem;
    gap: 0.9rem;
  }

  .learn-card .chev {
    display: none;
  }
}
</style>
