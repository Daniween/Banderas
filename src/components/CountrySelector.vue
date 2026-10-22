<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { REGIONS, normalize, flagUrl } from '../lib/quiz'

const props = defineProps({
  countries: Array,
  selectedCodes: Set,
})

const emit = defineEmits(['start', 'back', 'update:selectedCodes'])

const search = ref('')
const region = ref(null)

const filteredCountries = computed(() => {
  const q = normalize(search.value)
  return props.countries.filter(
    (c) =>
      (!region.value || c.region === region.value) &&
      (!q || normalize(c.name).includes(q) || normalize(c.nameEn).includes(q)),
  )
})

const update = (mutate) => {
  const next = new Set(props.selectedCodes)
  mutate(next)
  emit('update:selectedCodes', next)
}

const toggleCountry = (code) => update((s) => (s.has(code) ? s.delete(code) : s.add(code)))
const selectVisible = () => update((s) => filteredCountries.value.forEach((c) => s.add(c.code)))
const deselectVisible = () => update((s) => filteredCountries.value.forEach((c) => s.delete(c.code)))
</script>

<template>
  <div class="page selector">
    <header class="page-header">
      <button class="icon-btn" @click="emit('back')" aria-label="Retour au menu" title="Retour">
        <AppIcon name="arrow-left" />
      </button>
      <h1>Entraînement personnalisé</h1>
      <div class="page-header-spacer"></div>
    </header>

    <div class="controls">
      <div class="input-icon">
        <AppIcon name="search" :size="18" />
        <input v-model="search" type="search" class="input" placeholder="Rechercher un pays…" aria-label="Rechercher un pays" />
      </div>

      <div class="chips" role="group" aria-label="Filtrer par continent">
        <button :class="['chip', { active: !region }]" :aria-pressed="!region" @click="region = null">Tous</button>
        <button
          v-for="r in REGIONS"
          :key="r.value"
          :class="['chip', { active: region === r.value }]"
          :aria-pressed="region === r.value"
          @click="region = r.value"
        >
          {{ r.label }}
        </button>
      </div>

      <div class="bulk">
        <span class="count">{{ selectedCodes.size }} sélectionné{{ selectedCodes.size > 1 ? 's' : '' }}</span>
        <div class="bulk-actions">
          <button class="btn btn--sm" @click="selectVisible">Tout cocher</button>
          <button class="btn btn--sm btn--ghost" @click="deselectVisible" :disabled="!selectedCodes.size">Tout décocher</button>
        </div>
      </div>
    </div>

    <ul class="grid" aria-label="Pays">
      <li v-for="country in filteredCountries" :key="country.code">
        <button
          :class="['country', { selected: selectedCodes.has(country.code) }]"
          :aria-pressed="selectedCodes.has(country.code)"
          @click="toggleCountry(country.code)"
        >
          <img
            :src="flagUrl(country, 80)"
            :srcset="`${flagUrl(country, 80)} 1x, ${flagUrl(country, 160)} 2x`"
            alt=""
            width="40"
            height="27"
            loading="lazy"
            decoding="async"
          />
          <span class="name">{{ country.name }}</span>
          <span class="check" aria-hidden="true"><AppIcon v-if="selectedCodes.has(country.code)" name="check" :size="14" :stroke-width="3" /></span>
        </button>
      </li>
      <li v-if="!filteredCountries.length" class="empty">Aucun pays ne correspond à votre recherche.</li>
    </ul>

    <footer class="start-bar">
      <button class="btn btn--primary btn--lg btn--block" :disabled="!selectedCodes.size" @click="emit('start')">
        Commencer l'entraînement ({{ selectedCodes.size }})
      </button>
    </footer>
  </div>
</template>

<style scoped>
.selector {
  max-width: 900px;
  padding-bottom: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.chips {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.chip {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0.35rem 0.9rem;
  border-radius: var(--radius-full);
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 800;
  font-size: 0.9rem;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

.chip:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.chip.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.bulk {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.count {
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.bulk-actions {
  display: flex;
  gap: 0.4rem;
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.5rem;
}

.country {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  text-align: left;
  transition: background-color 0.15s, border-color 0.15s;
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
}

.country:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.country.selected {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.country img {
  width: 40px;
  height: 27px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: var(--surface-3);
}

.name {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.25;
  min-width: 0;
}

.check {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1.5px solid var(--border-strong);
  color: #fff;
  transition: background-color 0.15s, border-color 0.15s;
}

.selected .check {
  background: var(--accent);
  border-color: var(--accent);
}

.empty {
  grid-column: 1 / -1;
  padding: 2rem;
  text-align: center;
  color: var(--text-subtle);
}

.start-bar {
  position: sticky;
  bottom: 0;
  margin: 0 calc(-1 * clamp(1rem, 4vw, 2rem));
  padding: 1rem clamp(1rem, 4vw, 2rem);
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}
</style>
