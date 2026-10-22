<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'
import { loadBackend } from '../services'
import { MODE_LABELS, regionLabel } from '../lib/quiz'

const props = defineProps({
  user: { type: Object, required: true },
  knownCount: Number,
  totalCount: Number,
})

const emit = defineEmits(['back', 'update-pseudo'])

const newPseudo = ref(props.user.pseudo || '')
const isEditingPseudo = ref(false)
const pseudoInput = ref(null)
const records = ref([])
const loadingStats = ref(true)
const totalTime = ref(props.user.stats?.totalPlayTime ?? 0)
const totalGames = ref(props.user.stats?.totalGames ?? 0)

const avatar = computed(
  () => props.user.photoURL || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(props.user.uid)}`,
)

const MODE_ICONS = { survival: 'zap', capital: 'building', map: 'map', custom: 'sliders' }
const MODE_COLORS = {
  survival: 'var(--mode-survival)',
  capital: 'var(--mode-capital)',
  map: 'var(--mode-map)',
  custom: 'var(--mode-custom)',
}

const fetchPersonalStats = async () => {
  loadingStats.value = true
  try {
    const { fetchUserScores } = await loadBackend()
    const scores = await fetchUserScores(props.user.uid)

    // Meilleur score par mode et par région (à score égal, le plus rapide)
    const bests = new Map()
    for (const s of scores) {
      const key = `${s.mode}:${s.region ?? 'world'}`
      const best = bests.get(key)
      if (!best || s.score > best.score || (s.score === best.score && s.timeSeconds < best.timeSeconds)) {
        bests.set(key, s)
      }
    }
    const isWorld = (s) => Number((s.region ?? 'world') === 'world')
    records.value = [...bests.values()].sort((a, b) => isWorld(b) - isWorld(a))
    if (scores.length) {
      totalGames.value = scores.length
      totalTime.value = scores.reduce((sum, s) => sum + (s.timeSeconds || 0), 0)
    }
  } catch (err) {
    console.error('Chargement des statistiques impossible :', err)
  } finally {
    loadingStats.value = false
  }
}

const formatPlayTime = (seconds) => {
  if (!seconds) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  if (m > 0) return `${m} min`
  return `${seconds} s`
}

const startEditing = async () => {
  newPseudo.value = props.user.pseudo || ''
  isEditingPseudo.value = true
  await nextTick()
  pseudoInput.value?.select()
}

const savePseudo = () => {
  const value = newPseudo.value.trim()
  if (value && value !== props.user.pseudo) emit('update-pseudo', value)
  isEditingPseudo.value = false
}

onMounted(fetchPersonalStats)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" @click="emit('back')" aria-label="Retour au menu" title="Retour">
        <AppIcon name="arrow-left" />
      </button>
      <h1>Mon profil</h1>
      <div class="page-header-spacer"></div>
    </header>

    <section class="card identity">
      <img :src="avatar" alt="" class="avatar" width="88" height="88" referrerpolicy="no-referrer" />

      <form v-if="isEditingPseudo" class="pseudo-edit" @submit.prevent="savePseudo" @keydown.esc="isEditingPseudo = false">
        <label for="pseudo" class="sr-only">Nouveau pseudo</label>
        <input id="pseudo" ref="pseudoInput" v-model="newPseudo" class="input" maxlength="20" required />
        <button type="submit" class="btn btn--primary">OK</button>
        <button type="button" class="btn btn--ghost" @click="isEditingPseudo = false">Annuler</button>
      </form>
      <div v-else class="pseudo">
        <h2>{{ user.pseudo }}</h2>
        <button class="icon-btn small" @click="startEditing" aria-label="Modifier le pseudo" title="Modifier le pseudo">
          <AppIcon name="edit" :size="16" />
        </button>
      </div>
      <p class="email">{{ user.email }}</p>
    </section>

    <section class="stats" aria-label="Statistiques">
      <div class="card stat">
        <span class="stat-value">{{ totalGames }}</span>
        <span class="stat-label">Parties</span>
      </div>
      <div class="card stat">
        <span class="stat-value">{{ formatPlayTime(totalTime) }}</span>
        <span class="stat-label">Temps de jeu</span>
      </div>
      <div class="card stat">
        <span class="stat-value">{{ knownCount }}<small>/{{ totalCount }}</small></span>
        <span class="stat-label">Drapeaux appris</span>
      </div>
    </section>

    <section class="card">
      <h3 class="section-title">Mes records</h3>
      <div v-if="loadingStats" class="records">
        <div v-for="i in 3" :key="i" class="skeleton record-skeleton"></div>
      </div>
      <p v-else-if="!records.length" class="empty">Aucun record pour l'instant. Lancez une partie !</p>
      <ul v-else class="records">
        <li v-for="rec in records" :key="`${rec.mode}:${rec.region}`" class="record" :style="{ '--c': MODE_COLORS[rec.mode] }">
          <span class="record-icon"><AppIcon :name="MODE_ICONS[rec.mode] ?? 'flag'" :size="20" /></span>
          <span class="record-info">
            <span class="record-mode">{{ MODE_LABELS[rec.mode] ?? rec.mode }}</span>
            <span class="record-region">{{ regionLabel(rec.region) }}</span>
          </span>
          <span class="record-values">
            <strong>{{ rec.score }}/{{ rec.total }}</strong>
            <span>{{ rec.formattedTime }}</span>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
}

.avatar {
  border-radius: 50%;
  border: 3px solid var(--border-strong);
  background: var(--surface-3);
  margin-bottom: 0.4rem;
}

.pseudo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pseudo h2 {
  font-size: 1.6rem;
  font-weight: 800;
}

.icon-btn.small {
  width: 34px;
  height: 34px;
}

.pseudo-edit {
  display: flex;
  gap: 0.4rem;
  width: 100%;
  max-width: 380px;
}

.email {
  color: var(--text-subtle);
  font-size: 0.92rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 1rem 0.5rem;
  text-align: center;
}

.stat-value {
  font-size: clamp(1.15rem, 4vw, 1.5rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stat-value small {
  font-size: 0.7em;
  color: var(--text-subtle);
  font-weight: 600;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.records {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.record-skeleton {
  height: 62px;
  border-radius: var(--radius-md);
}

.record {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
}

.record-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  color: var(--c, var(--accent));
  background: color-mix(in srgb, var(--c, var(--accent)) 15%, transparent);
}

.record-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.record-mode {
  font-weight: 700;
}

.record-region {
  font-size: 0.85rem;
  color: var(--text-subtle);
}

.record-values {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-variant-numeric: tabular-nums;
}

.record-values span {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 420px) {
  .stats {
    gap: 0.5rem;
  }
}
</style>
