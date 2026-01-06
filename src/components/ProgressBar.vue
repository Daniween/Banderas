<script setup>
defineProps({
  score: Number,
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
      <div class="bar-fill" :style="{ width: (total ? (score / total * 100) : 0) + '%' }"></div>
    </div>
  </div>
</template>

<style scoped src="../styles/ProgressBar.css"></style>
