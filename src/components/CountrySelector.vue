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

<style scoped src="../styles/CountrySelector.css"></style>