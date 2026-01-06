<script setup>
defineProps({
  flagUrl: String,
  alt: String
})
</script>

<template>
  <div class="flag-container">
    <img :src="flagUrl" :alt="alt" class="flag-img" />
  </div>
</template>

<style scoped src="../styles/FlagDisplay.css"></style>
