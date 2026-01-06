<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: Boolean
})

const emit = defineEmits(['submit'])
const inputValue = ref('')
const isShake = ref(false)

const onSubmit = () => {
  if (!inputValue.value.trim()) return
  
  emit('submit', inputValue.value, (success) => {
    if (success) {
      inputValue.value = ''
    } else {
      triggerShake()
    }
  })
}

const triggerShake = () => {
  isShake.value = true
  setTimeout(() => isShake.value = false, 500)
}

const clearInput = () => {
  inputValue.value = ''
}

defineExpose({ clearInput })
</script>

<template>
  <div class="input-wrapper">
    <input 
      v-model="inputValue" 
      @keyup.enter="onSubmit"
      type="text" 
      placeholder="Nom du pays..."
      :disabled="disabled"
      :class="{ shake: isShake }"
      autofocus
    />
    <button @click="onSubmit" :disabled="disabled || !inputValue">
      Valider
    </button>
  </div>
</template>

<style scoped src="../styles/QuizInput.css"></style>
