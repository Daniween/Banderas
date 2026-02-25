<script setup>
import { ref } from 'vue'

const props = defineProps({
  showCapitals: Boolean
})
const emit = defineEmits(['start', 'select-custom', 'toggle-capitals'])

const showContinents = ref(false)
const continents = [
  { label: 'Afrique', value: 'Africa' },
  { label: 'Amériques', value: 'Americas' },
  { label: 'Asie', value: 'Asia' },
  { label: 'Europe', value: 'Europe' },
  { label: 'Océanie', value: 'Oceania' }
]

const toggleContinents = () => {
  showContinents.value = !showContinents.value
}
</script>

<template>
  <div class="main-menu">
    <h1 class="title">Banderas Quiz</h1>
    <p class="subtitle">Maîtrisez les 196 drapeaux de l'ONU</p>

    <div class="menu-buttons">
      <button @click="$emit('start', 'learning', null)" class="menu-btn primary">
        <span class="icon">🎓</span> Apprentissage - Aléatoire
      </button>

      <button @click="$emit('start', 'survival', null)" class="menu-btn secondary">
        <span class="icon">⏱️</span> Mode survie one-pass
      </button>

      <button @click="$emit('start', 'capital', null)" class="menu-btn primary capital-mode">
        <span class="icon">🏛️</span> Mode Capitales
      </button>

      <button @click="$emit('start', 'map', null)" class="menu-btn secondary map-mode">
        <span class="icon">🗺️</span> Mode Carte
      </button>

      <button @click="$emit('select-custom')" class="menu-btn primary custom-mode">
        <span class="icon">🎯</span> Entraînement Personnalisé
      </button>

      <div class="continent-section">
        <button @click="toggleContinents" class="menu-btn tertiary">
          <span class="icon">🌍</span> Par Continent
        </button>
        
        <div v-if="showContinents" class="continent-list">
          <button 
            v-for="c in continents" 
            :key="c.value"
            @click="$emit('start', 'survival', c.value)"
            class="continent-btn"
          >
            {{ c.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <label class="toggle-container">
        <input type="checkbox" :checked="showCapitals" @change="$emit('toggle-capitals')">
        <span class="slider"></span>
        <span class="label-text">Afficher les capitales (Aide)</span>
      </label>
    </div>
  </div>
</template>

<style scoped src="../styles/MainMenu.css"></style>
