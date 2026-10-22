<script setup>
import { ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { loadBackend } from '../services'
import { RANKED_MODES, MODE_LABELS } from '../lib/quiz'

const props = defineProps({
  user: Object,
})

const emit = defineEmits(['back'])

const mode = ref('survival')
const scores = ref([])
const loading = ref(true)
const error = ref(false)

const MEDALS = ['#fbbf24', '#cbd5e1', '#d97706']

const fetchScores = async (force = false) => {
  const requested = mode.value
  loading.value = true
  error.value = false
  try {
    const { fetchLeaderboard } = await loadBackend()
    const rows = await fetchLeaderboard(requested, { force })
    if (requested === mode.value) scores.value = rows
  } catch (err) {
    console.error('Chargement du classement impossible :', err)
    if (requested === mode.value) error.value = true
  } finally {
    if (requested === mode.value) loading.value = false
  }
}

watch(mode, () => fetchScores(), { immediate: true })
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" @click="emit('back')" aria-label="Retour au menu" title="Retour">
        <AppIcon name="arrow-left" />
      </button>
      <h1>Classement mondial</h1>
      <button class="icon-btn" @click="fetchScores(true)" :disabled="loading" aria-label="Actualiser" title="Actualiser">
        <AppIcon name="refresh" :size="18" />
      </button>
    </header>

    <div class="segmented" role="tablist" aria-label="Mode de jeu">
      <button
        v-for="m in RANKED_MODES"
        :key="m"
        role="tab"
        :aria-selected="mode === m"
        @click="mode = m"
      >
        {{ MODE_LABELS[m] }}
      </button>
    </div>

    <section class="card board" role="tabpanel" :aria-busy="loading">
      <p class="board-caption">Top 10 · parties sur le monde entier · départage au temps</p>

      <ol v-if="loading" class="rows">
        <li v-for="i in 6" :key="i" class="skeleton row-skeleton"></li>
      </ol>

      <p v-else-if="error" class="empty">
        Impossible de charger le classement.
        <button class="link-btn" @click="fetchScores(true)">Réessayer</button>
      </p>

      <p v-else-if="!scores.length" class="empty">Aucun score pour le moment. Soyez le premier !</p>

      <ol v-else class="rows">
        <li
          v-for="(s, index) in scores"
          :key="s.id"
          :class="['row', { podium: index < 3, me: user && s.userId === user.uid }]"
        >
          <span class="rank" :style="index < 3 ? { '--medal': MEDALS[index] } : null">{{ index + 1 }}</span>
          <span class="pseudo">{{ s.pseudo }}</span>
          <span class="points">{{ s.score }}<small>/{{ s.total }}</small></span>
          <span class="time">{{ s.formattedTime }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.board {
  padding: clamp(0.75rem, 3vw, 1.25rem);
}

.board-caption {
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-subtle);
  margin-bottom: 1rem;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.row {
  display: grid;
  grid-template-columns: 36px 1fr auto 64px;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  background: var(--surface);
  font-variant-numeric: tabular-nums;
  animation: fade-up 0.35s var(--ease-out) both;
}

.row-skeleton {
  height: 48px;
  border-radius: var(--radius-md);
}

.podium {
  background: var(--surface-2);
}

.me {
  outline: 1.5px solid rgba(79, 172, 254, 0.6);
  background: var(--accent-soft);
}

.rank {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.podium .rank {
  color: #111827;
  background: var(--medal);
}

.pseudo {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points {
  font-weight: 700;
}

.points small {
  color: var(--text-subtle);
  font-weight: 500;
}

.time {
  text-align: right;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
