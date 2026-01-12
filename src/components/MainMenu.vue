<script setup>
import { ref } from 'vue'

const emit = defineEmits(['start'])

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
        <span class="icon">🎓</span> Apprentissage (Aléatoire)
      </button>

      <button @click="$emit('start', 'survival', null)" class="menu-btn secondary">
        <span class="icon">⏱️</span> Mode one-pass (Survie)
      </button>

      <button @click="$emit('start', 'capital', null)" class="menu-btn primary capital-mode">
        <span class="icon">🏛️</span> Mode Capitales
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
  </div>
</template>

<style scoped src="../styles/MainMenu.css"></style>
