<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  flagUrl: String,
  alt: { type: String, default: 'Drapeau à deviner' },
  feedback: { type: String, default: null }, // 'correct' | 'wrong' | null
  compact: Boolean,
})

const loaded = ref(false)
watch(
  () => props.flagUrl,
  () => (loaded.value = false),
)
</script>

<template>
  <figure :class="['flag', { compact, [`flag--${feedback}`]: feedback }]">
    <div v-if="!loaded" class="skeleton flag-skeleton" aria-hidden="true"></div>
    <img
      :key="flagUrl"
      :src="flagUrl"
      :alt="alt"
      width="600"
      height="400"
      fetchpriority="high"
      decoding="async"
      draggable="false"
      :class="{ visible: loaded }"
      @load="loaded = true"
      @error="loaded = true"
    />
  </figure>
</template>

<style scoped>
.flag {
  position: relative;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  padding: clamp(0.6rem, 2.5vw, 1rem);
  aspect-ratio: 3 / 2;
  border-radius: var(--radius-xl);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.flag.compact {
  max-width: 100%;
  border-radius: var(--radius-lg);
}

.flag img,
.flag-skeleton {
  position: absolute;
  inset: clamp(0.6rem, 2.5vw, 1rem);
  width: calc(100% - 2 * clamp(0.6rem, 2.5vw, 1rem));
  height: calc(100% - 2 * clamp(0.6rem, 2.5vw, 1rem));
}

.flag img {
  object-fit: contain;
  user-select: none;
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 0.25s, transform 0.35s var(--ease-out);
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.35));
}

.flag img.visible {
  opacity: 1;
  transform: scale(1);
}

.flag--correct {
  border-color: rgba(52, 211, 153, 0.6);
  box-shadow: 0 0 0 4px var(--success-soft), var(--shadow-md);
}

.flag--wrong {
  border-color: rgba(248, 113, 113, 0.6);
  box-shadow: 0 0 0 4px var(--danger-soft), var(--shadow-md);
  animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
</style>
