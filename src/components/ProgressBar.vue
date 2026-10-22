<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: Number,
  visited: Number,
  total: Number,
})

const pct = (n) => (props.total ? Math.min(100, (n / props.total) * 100) : 0)
const scorePct = computed(() => pct(props.score))
const visitedPct = computed(() => pct(props.visited))
</script>

<template>
  <div class="progress">
    <div class="progress-info">
      <span>Progression</span>
      <span class="score"><strong>{{ score }}</strong> / {{ total }}</span>
    </div>
    <div
      class="bar"
      role="progressbar"
      :aria-valuenow="score"
      aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="`${score} bonnes réponses sur ${total}`"
    >
      <div class="fill visited" :style="{ transform: `scaleX(${visitedPct / 100})` }"></div>
      <div class="fill correct" :style="{ transform: `scaleX(${scorePct / 100})` }"></div>
    </div>
  </div>
</template>

<style scoped>
.progress {
  width: 100%;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.45rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

.score {
  font-variant-numeric: tabular-nums;
}

.score strong {
  color: var(--text);
}

.bar {
  position: relative;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  overflow: hidden;
}

/* transform plutôt que width : animé par le compositeur, sans recalcul de mise en page */
.fill {
  position: absolute;
  inset: 0;
  transform-origin: left;
  border-radius: inherit;
  transition: transform 0.6s var(--ease-out);
}

.visited {
  background: var(--surface-3);
}

.correct {
  background: var(--accent-gradient);
}
</style>
