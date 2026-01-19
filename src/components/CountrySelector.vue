<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  countries: Array,
  selectedCodes: Set
})

const emit = defineEmits(['start', 'back', 'update:selectedCodes'])

const search = ref('')

const filteredCountries = computed(() => {
  if (!search.value) return props.countries
  const s = search.value.toLowerCase()
  return props.countries.filter(c => 
    c.name.common.toLowerCase().includes(s) || 
    (c.translations?.fra?.common && c.translations.fra.common.toLowerCase().includes(s))
  )
})

const toggleCountry = (code) => {
  const nextSet = new Set(props.selectedCodes)
  if (nextSet.has(code)) {
    nextSet.delete(code)
  } else {
    nextSet.add(code)
  }
  emit('update:selectedCodes', nextSet)
}

const selectAll = () => {
    const nextSet = new Set(props.countries.map(c => c.cca3))
    emit('update:selectedCodes', nextSet)
}

const deselectAll = () => {
    emit('update:selectedCodes', new Set())
}

const handleStart = () => {
    if (props.selectedCodes.size === 0) {
        alert('Veuillez sélectionner au moins un pays.')
        return
    }
    emit('start')
}
</script>

<template>
  <div class="country-selector">
    <header class="selector-header">
      <button @click="$emit('back')" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Retour
      </button>
      <h2>Sélectionnez vos pays</h2>
      <div class="selection-count">{{ selectedCodes.size }} sélectionné(s)</div>
    </header>

    <div class="controls">
      <input 
        v-model="search" 
        type="text" 
        placeholder="Rechercher un pays..." 
        class="search-input"
      >
      <div class="bulk-actions">
        <button @click="selectAll" class="action-btn">Tout sélectionner</button>
        <button @click="deselectAll" class="action-btn">Tout désélectionner</button>
      </div>
    </div>

    <div class="countries-grid">
      <div 
        v-for="country in filteredCountries" 
        :key="country.cca3"
        class="country-card"
        :class="{ selected: selectedCodes.has(country.cca3) }"
        @click="toggleCountry(country.cca3)"
      >
        <img :src="country.flags.svg" :alt="country.name.common" class="mini-flag">
        <span class="country-name">{{ country.translations?.fra?.common || country.name.common }}</span>
        <div class="checkbox">
          <svg v-if="selectedCodes.has(country.cca3)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      </div>
    </div>

    <footer class="selector-footer">
      <button @click="handleStart" class="start-btn" :disabled="selectedCodes.size === 0">
        Commencer l'entraînement ({{ selectedCodes.size }})
      </button>
    </footer>
  </div>
</template>

<style scoped>
.country-selector {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a202c;
  color: white;
  padding: 1rem;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.back-btn {
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  transition: color 0.2s;
}

.back-btn:hover {
  color: white;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
}

.bulk-actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #a0aec0;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.countries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  flex-grow: 1;
}

/* Custom Scrollbar */
.countries-grid::-webkit-scrollbar {
  width: 6px;
}
.countries-grid::-webkit-scrollbar-track {
  background: transparent;
}
.countries-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.country-card {
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid transparent;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s;
  position: relative;
}

.country-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.country-card.selected {
  background: rgba(66, 153, 225, 0.1);
  border-color: #4299e1;
}

.mini-flag {
  width: 32px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
}

.country-name {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4299e1;
}

.country-card.selected .checkbox {
  border-color: #4299e1;
  background: rgba(66, 153, 225, 0.1);
}

.selector-footer {
  padding-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.start-btn {
  background: #22c55e;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
}

.start-btn:hover:not(:disabled) {
  background: #16a34a;
  transform: translateY(-2px);
}

.start-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.5;
}
</style>
