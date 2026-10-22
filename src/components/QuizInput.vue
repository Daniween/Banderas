<script setup>
import { ref, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps({
  disabled: Boolean,
  placeholder: { type: String, default: 'Nom du pays…' },
})

const emit = defineEmits(['submit'])
const inputValue = ref('')
const inputEl = ref(null)
const isShake = ref(false)

const onSubmit = () => {
  if (!inputValue.value.trim()) return
  emit('submit', inputValue.value, (success) => {
    if (success) inputValue.value = ''
    else triggerShake()
  })
}

const triggerShake = () => {
  isShake.value = true
  setTimeout(() => (isShake.value = false), 450)
}

const clearInput = () => (inputValue.value = '')
const focus = () => inputEl.value?.focus({ preventScroll: true })

onMounted(focus)

defineExpose({ clearInput, focus })
</script>

<template>
  <form class="quiz-input" :class="{ shake: isShake }" @submit.prevent="onSubmit">
    <label for="answer" class="sr-only">Votre réponse</label>
    <input
      id="answer"
      ref="inputEl"
      v-model="inputValue"
      class="input"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      enterkeyhint="go"
    />
    <button type="submit" class="btn btn--primary" :disabled="disabled || !inputValue.trim()">
      <AppIcon name="check" :size="18" />
      <span class="label">Valider</span>
    </button>
  </form>
</template>

<style scoped>
.quiz-input {
  display: flex;
  gap: 0.6rem;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.input {
  flex: 1;
  min-height: 54px;
  font-size: 1.1rem;
}

.btn {
  min-height: 54px;
}

.shake .input {
  border-color: var(--danger);
  background: var(--danger-soft);
  animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@media (max-width: 420px) {
  .label {
    display: none;
  }

  .btn {
    width: 54px;
    padding: 0;
  }
}
</style>
