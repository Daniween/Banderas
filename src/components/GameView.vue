<script setup>
import { ref, computed, watch, h, nextTick, defineAsyncComponent } from 'vue'
import AppIcon from './AppIcon.vue'
import FlagDisplay from './FlagDisplay.vue'
import QuizInput from './QuizInput.vue'
import ProgressBar from './ProgressBar.vue'
import { MODE_LABELS, MAP_MAX_FAILURES, flagUrl, capitalOf, regionLabel, searchCountry } from '../lib/quiz'
import { confirmDialog } from '../composables/useDialog'

// Leaflet (~150 ko) n'est téléchargé que pour le mode Carte
const MapDisplay = defineAsyncComponent({
  loader: () => import('./MapDisplay.vue'),
  loadingComponent: { render: () => h('div', { class: 'skeleton map-placeholder' }) },
})

const props = defineProps({
  game: { type: Object, required: true },
  user: Object,
  saveState: { type: String, default: 'idle' }, // 'idle' | 'saving' | 'saved' | 'error'
})

const emit = defineEmits(['menu', 'replay'])

const quizInput = ref(null)
const feedback = ref(null)
const announcement = ref('')
const revealedAnswer = ref(null)
const showScoreModal = ref(true)
const searchQuery = ref('')
let feedbackTimer = null

const game = props.game
const isMap = computed(() => game.gameMode === 'map')
const isPlaying = computed(() => game.gameStatus === 'playing')
const isFinished = computed(() => game.gameStatus === 'finished')

const modeTitle = computed(() => {
  const label = MODE_LABELS[game.gameMode]
  return game.regionFilter ? `${label} · ${regionLabel(game.regionFilter)}` : label
})

const country = computed(() => game.currentCountry)
const capitalHint = computed(() =>
  game.showCapitals && game.gameMode !== 'capital' ? capitalOf(country.value) : null,
)
const chancesLeft = computed(() => MAP_MAX_FAILURES - game.mapFailures)

const accuracy = computed(() => (game.total ? Math.round((game.score / game.total) * 100) : 0))

// Nouvelle partie (« Rejouer ») : on repart d'un état d'affichage propre
watch(
  () => game.gameStatus,
  (status) => {
    if (status !== 'playing') return
    searchQuery.value = ''
    showScoreModal.value = true
    revealedAnswer.value = null
  },
)

const searchedCountry = computed(() => searchCountry(game.countries, searchQuery.value))
const searchedCode = computed(() => searchedCountry.value?.code ?? null)

const flash = (ok) => {
  clearTimeout(feedbackTimer)
  feedback.value = ok ? 'correct' : 'wrong'
  announcement.value = ok ? 'Bonne réponse !' : 'Mauvaise réponse'
  feedbackTimer = setTimeout(() => (feedback.value = null), 650)
}

const handleSubmit = (input, callback) => {
  const ok = game.submitAnswer(input)
  callback?.(ok)
  flash(ok)
}

const focusInput = () => nextTick(() => quizInput.value?.focus())

const handleSkip = () => {
  game.skipCountry()
  quizInput.value?.clearInput()
  focusInput()
}

const handleReveal = () => {
  revealedAnswer.value = game.revealAnswer()
}

const closeAnswer = () => {
  revealedAnswer.value = null
  handleSkip()
}

const handleHome = async () => {
  // En apprentissage la progression est sauvegardée en continu : rien à perdre
  // (le pays affiché compte déjà comme « vu » : au moins une réponse = plus d'un pays vu)
  const inProgress = isPlaying.value && game.gameMode !== 'learning' && game.visitedCount > 1
  if (inProgress) {
    const ok = await confirmDialog({
      title: 'Quitter la partie ?',
      message: 'La partie en cours sera perdue.',
      confirmLabel: 'Quitter',
      tone: 'danger',
    })
    if (!ok) return
  }
  emit('menu')
}

const handleReset = async () => {
  const learning = game.gameMode === 'learning'
  const ok = await confirmDialog({
    title: learning ? 'Réinitialiser la progression ?' : 'Recommencer la partie ?',
    message: learning
      ? 'Tous les drapeaux appris seront oubliés. Cette action est irréversible.'
      : 'Le score et le chronomètre repartiront de zéro.',
    confirmLabel: learning ? 'Réinitialiser' : 'Recommencer',
    tone: 'danger',
  })
  if (!ok) return
  game.resetProgress()
  focusInput()
}

const handleFinishMap = async () => {
  const ok = await confirmDialog({
    title: 'Terminer la partie ?',
    message: 'Toutes les réponses seront affichées sur la carte et le chronomètre sera arrêté.',
    confirmLabel: 'Voir les réponses',
  })
  if (ok) game.finishGame()
}
</script>

<template>
  <div :class="['game', { 'game--map': isMap }]">
    <!-- En-tête -->
    <header class="game-header">
      <button class="icon-btn" @click="handleHome" title="Retour au menu" aria-label="Retour au menu">
        <AppIcon name="home" />
      </button>

      <div class="game-title">
        <h1>{{ modeTitle }}</h1>
        <div class="game-meta">
          <span class="badge" :title="isPlaying ? 'Temps écoulé' : 'Temps total'">
            <AppIcon name="clock" :size="14" /> {{ game.formattedTime }}
          </span>
          <span v-if="game.streak >= 2" class="badge streak" title="Série de bonnes réponses">
            <AppIcon name="flame" :size="14" /> {{ game.streak }}
          </span>
        </div>
      </div>

      <div class="header-actions">
        <button
          v-if="isPlaying && game.gameMode !== 'capital'"
          class="icon-btn"
          :aria-pressed="game.showCapitals"
          :title="game.showCapitals ? 'Masquer la capitale' : 'Afficher la capitale en indice'"
          aria-label="Indice : capitale"
          @click="game.toggleCapitals()"
        >
          <AppIcon name="pin" :size="19" />
        </button>
        <button
          v-if="isPlaying"
          class="icon-btn"
          :title="game.gameMode === 'learning' ? 'Réinitialiser la progression' : 'Recommencer'"
          :aria-label="game.gameMode === 'learning' ? 'Réinitialiser la progression' : 'Recommencer'"
          @click="handleReset"
        >
          <AppIcon name="refresh" :size="19" />
        </button>
      </div>
    </header>

    <ProgressBar :score="game.score" :visited="game.visitedCount" :total="game.total" />

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <!-- Écran de fin (hors mode carte) -->
    <section v-if="isFinished && !isMap" class="card results">
      <span class="results-icon"><AppIcon name="trophy" :size="34" /></span>
      <h2>{{ game.gameMode === 'learning' ? 'Bravo, tout est appris !' : 'Partie terminée !' }}</h2>
      <p class="results-score"><strong>{{ game.score }}</strong> / {{ game.total }}</p>
      <dl class="stats">
        <div>
          <dt>Temps</dt>
          <dd>{{ game.formattedTime }}</dd>
        </div>
        <div>
          <dt>Réussite</dt>
          <dd>{{ accuracy }} %</dd>
        </div>
        <div>
          <dt>Meilleure série</dt>
          <dd>{{ game.bestStreak }}</dd>
        </div>
      </dl>
      <p v-if="saveState === 'saved'" class="save-hint ok"><AppIcon name="check" :size="16" /> Score enregistré sur votre compte</p>
      <p v-else-if="saveState === 'saving'" class="save-hint">Enregistrement du score…</p>
      <p v-else-if="saveState === 'error'" class="save-hint err">Le score n'a pas pu être enregistré.</p>
      <p v-else-if="!user && game.gameMode !== 'learning'" class="save-hint">Connectez-vous pour enregistrer vos scores.</p>
      <div class="results-actions">
        <button class="btn btn--primary btn--lg" @click="emit('replay')"><AppIcon name="refresh" :size="18" /> Rejouer</button>
        <button class="btn btn--lg" @click="emit('menu')">Menu</button>
      </div>
    </section>

    <!-- Zone de jeu -->
    <main v-else-if="country || (isFinished && isMap)" class="play">
      <aside class="play-side">
        <FlagDisplay v-if="country" :flag-url="flagUrl(country)" :feedback="feedback" :compact="isMap" />

        <h2 v-if="country && game.gameMode === 'capital'" class="country-name">{{ country.name }}</h2>
        <p v-else-if="capitalHint" class="hint">Capitale : <strong>{{ capitalHint }}</strong></p>

        <div v-if="isMap && isPlaying" class="chances" :aria-label="`${chancesLeft} essais restants`">
          <span>Essais restants</span>
          <span class="hearts">
            <AppIcon v-for="i in MAP_MAX_FAILURES" :key="i" name="heart" :size="18" :class="{ lost: i > chancesLeft }" />
          </span>
        </div>

        <div v-if="isMap && isFinished" class="card map-search">
          <label for="map-search" class="search-label">Rechercher un pays sur la carte</label>
          <div class="input-icon">
            <AppIcon name="search" :size="18" />
            <input id="map-search" v-model="searchQuery" class="input" type="search" placeholder="Ex : France, Pérou…" autocomplete="off" />
          </div>
          <p v-if="searchQuery.length >= 2 && !searchedCode" class="search-empty">
            Aucun pays trouvé.
          </p>
          <button class="btn btn--block" @click="showScoreModal = true">Voir mon score</button>
        </div>

        <QuizInput
          v-if="!isMap && country"
          ref="quizInput"
          :placeholder="game.gameMode === 'capital' ? 'Nom de la capitale…' : 'Nom du pays…'"
          @submit="handleSubmit"
        />

        <div v-if="country" class="play-actions">
          <button class="btn" @click="handleSkip"><AppIcon name="skip" :size="16" /> Passer</button>
          <button class="btn" @click="handleReveal"><AppIcon name="eye" :size="16" /> Réponse</button>
          <button v-if="isMap" class="btn finish" @click="handleFinishMap"><AppIcon name="flag" :size="16" /> Terminer</button>
        </div>
      </aside>

      <MapDisplay
        v-if="isMap"
        class="play-map"
        :countries="game.countries"
        :correct-session-countries="game.correctSessionCountries"
        :revealed-session-countries="game.revealedSessionCountries"
        :red-session-country="game.redSessionCountry"
        :highlighted-country-code="searchedCode"
        :is-finished="isFinished"
        @submit="(code) => flash(game.submitAnswer(code))"
      />
    </main>

    <!-- Réponse révélée -->
    <Teleport to="body">
      <div v-if="revealedAnswer" class="modal-backdrop" @click.self="closeAnswer" @keydown.esc="closeAnswer">
        <div class="modal answer-modal" role="dialog" aria-modal="true" aria-labelledby="answer-title">
          <p id="answer-title" class="answer-label">La bonne réponse était</p>
          <p class="answer-text">{{ revealedAnswer }}</p>
          <div class="modal-actions">
            <button class="btn btn--primary btn--lg" autofocus @vue:mounted="({ el }) => el.focus()" @click="closeAnswer">
              Continuer <AppIcon name="arrow-right" :size="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- Score final du mode carte -->
      <div v-if="isMap && isFinished && showScoreModal" class="modal-backdrop" @click.self="showScoreModal = false">
        <div class="modal answer-modal" role="dialog" aria-modal="true" aria-labelledby="map-score-title">
          <h2 id="map-score-title" class="modal-title">Partie terminée !</h2>
          <p class="results-score"><strong>{{ game.score }}</strong> / {{ game.total }}</p>
          <p class="modal-text">Temps : {{ game.formattedTime }} · Meilleure série : {{ game.bestStreak }}</p>
          <p v-if="saveState === 'saved'" class="save-hint ok"><AppIcon name="check" :size="16" /> Score enregistré</p>
          <div class="modal-actions">
            <button class="btn" @click="showScoreModal = false">Explorer la carte</button>
            <button class="btn btn--primary" @click="emit('replay')">Rejouer</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.game {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: clamp(0.75rem, 3vw, 1.5rem);
  padding-top: max(clamp(0.75rem, 3vw, 1.5rem), env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: fade-up 0.4s var(--ease-out);
}

.game-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: 2px solid var(--border);
}

.game-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}

.game-title h1 {
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.game-meta {
  display: flex;
  gap: 0.4rem;
}

.game-meta .badge {
  padding: 0.15rem 0.6rem;
  font-size: 0.8rem;
  color: var(--accent);
  background: var(--accent-soft);
}

.streak {
  color: #c2410c !important;
  background: var(--warning-soft) !important;
  animation: pop 0.35s var(--ease-bounce);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.play {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.play-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.country-name {
  text-align: center;
  font-size: clamp(1.5rem, 5vw, 2rem);
}

.hint {
  text-align: center;
  color: var(--text-muted);
}

.hint strong {
  color: var(--accent);
}

.play-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.play-actions .btn {
  --btn-color: var(--text-muted);
}

.play-actions .btn:hover {
  color: var(--text);
}

.play-actions .finish {
  --btn-color: #b45309;
}

.chances {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 2px solid var(--border);
  color: var(--text-muted);
  font-size: 0.92rem;
}

.hearts {
  display: flex;
  gap: 0.3rem;
  color: var(--danger);
}

.hearts svg {
  fill: currentColor;
  transition: opacity 0.3s, transform 0.3s;
}

.hearts .lost {
  opacity: 0.2;
  fill: none;
  transform: scale(0.85);
}

.map-search {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.search-label {
  font-weight: 600;
}

.search-empty {
  font-size: 0.88rem;
  color: var(--warning);
}

/* ---------- Résultats ---------- */

.results {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: clamp(1.5rem, 6vw, 2.75rem);
  animation: modal-in 0.45s var(--ease-out);
}

.results-icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: var(--warning);
  background: var(--warning-soft);
  box-shadow: 0 4px 0 #f3d38a;
}

.results h2 {
  font-size: clamp(1.7rem, 5vw, 2.2rem);
}

.results-score {
  font-size: 1.4rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.results-score strong {
  font-size: clamp(3rem, 12vw, 4.2rem);
  font-weight: 900;
  color: var(--accent);
  letter-spacing: -0.03em;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  width: 100%;
  max-width: 420px;
  margin: 0.5rem 0;
}

.stats div {
  padding: 0.75rem 0.5rem;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 2px solid var(--border);
}

.stats dt {
  font-size: 0.78rem;
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stats dd {
  margin: 0.15rem 0 0;
  font-size: 1.25rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.save-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  color: var(--text-muted);
}

.save-hint.ok {
  color: var(--success);
}

.save-hint.err {
  color: var(--danger);
}

.results-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

/* ---------- Modales ---------- */

.answer-modal {
  text-align: center;
}

.answer-label {
  color: var(--text-muted);
}

.answer-text {
  margin: 0.5rem 0 0;
  font-size: clamp(1.9rem, 7vw, 2.5rem);
  font-weight: 900;
  color: var(--accent);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

/* ---------- Mode carte ---------- */

.game--map {
  max-width: none;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.game--map .play {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
}

.game--map .play-side {
  overflow-y: auto;
}

.game--map .play-actions {
  flex-direction: column;
  margin-top: auto;
}

.game--map .play-actions .btn {
  width: 100%;
}

.play-map,
:deep(.map-placeholder) {
  min-height: 0;
  height: 100%;
  border-radius: var(--radius-lg);
}

@media (max-width: 760px) {
  .game--map .play {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .game--map .play-side {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 0.6rem;
    overflow: visible;
  }

  .game--map .play-side > :not(.flag):not(.chances) {
    grid-column: 1 / -1;
  }

  .game--map .play-actions {
    flex-direction: row;
    margin-top: 0;
  }

  .game--map .play-actions .btn {
    flex: 1;
    width: auto;
    min-height: 40px;
    padding: 0.4rem 0.6rem;
    font-size: 0.88rem;
  }

  .game--map .chances {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .game--map .map-search {
    padding: 0.75rem;
  }
}
</style>
