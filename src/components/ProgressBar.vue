<script setup>
defineProps({
  score: Number,
  visited: Number,
  total: Number
})
</script>

<template>
  <div class="progress-container">
    <div class="progress-info">
      <span>Progression</span>
      <span class="score">{{ score }} / {{ total }}</span>
    </div>
    <div class="bar-bg">
      <!-- Visited Bar (Background/Lower layer) -->
      <div class="bar-fill visited" :style="{ width: (total ? (visited / total * 100) : 0) + '%' }"></div>
      <!-- Score Bar (Top layer) -->
      <div class="bar-fill score" :style="{ width: (total ? (score / total * 100) : 0) + '%' }"></div>
    </div>
  </div>
</template>

<style scoped src="../styles/ProgressBar.css"></style>