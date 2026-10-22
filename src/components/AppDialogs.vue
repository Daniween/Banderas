<script setup>
import { nextTick, watch, ref } from 'vue'
import { useDialogState } from '../composables/useDialog'
import AppIcon from './AppIcon.vue'

const { dialog, toasts } = useDialogState()
const confirmBtn = ref(null)

// Focus sur le bouton principal à l'ouverture (Entrée valide, Échap annule)
watch(dialog, async (d) => {
  if (!d) return
  await nextTick()
  confirmBtn.value?.focus()
})

const close = (value) => dialog.value?.resolve(value)
</script>

<template>
  <Teleport to="body">
    <div v-if="dialog" class="modal-backdrop" @click.self="close(false)" @keydown.esc="close(false)">
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-text">
        <h2 id="dialog-title" class="modal-title">{{ dialog.title }}</h2>
        <p v-if="dialog.message" id="dialog-text" class="modal-text">{{ dialog.message }}</p>
        <div class="modal-actions">
          <button v-if="dialog.cancelLabel" class="btn" @click="close(false)">{{ dialog.cancelLabel }}</button>
          <button
            ref="confirmBtn"
            :class="['btn', dialog.tone === 'danger' ? 'btn--danger' : 'btn--primary']"
            @click="close(true)"
          >
            {{ dialog.confirmLabel }}
          </button>
        </div>
      </div>
    </div>

    <div class="toasts" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" :class="['toast', `toast--${t.tone}`]" role="status">
          <AppIcon :name="t.tone === 'success' ? 'check' : t.tone === 'error' ? 'x' : 'info'" :size="18" />
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 4000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: min(92vw, 420px);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.1rem;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-md);
  font-weight: 500;
  font-size: 0.95rem;
}

.toast--success svg {
  color: var(--success);
}

.toast--error svg {
  color: var(--danger);
}

.toast--info svg {
  color: var(--accent);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s, transform 0.25s var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
