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
  border: 2px solid var(--border);
  box-shadow: var(--lift) var(--border-strong);
  transition: border-color 0.2s, box-shadow 0.2s;
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
  filter: drop-shadow(0 2px 6px rgba(28, 34, 54, 0.18));
}

.flag img.visible {
  opacity: 1;
  transform: scale(1);
}

.flag--correct {
  border-color: var(--success);
  box-shadow: var(--lift) var(--success), 0 0 0 6px var(--success-soft);
  animation: pop 0.35s var(--ease-bounce);
}

.flag--wrong {
  border-color: var(--danger);
  box-shadow: var(--lift) var(--danger), 0 0 0 6px var(--danger-soft);
  animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
</style>
