import { ref, shallowRef } from 'vue'

// Remplace window.alert / window.confirm par des dialogues intégrés à l'interface.

const dialog = shallowRef(null)
const toasts = ref([])
let toastId = 0

/**
 * Ouvre une boîte de confirmation. Résout `true` si l'utilisateur confirme.
 * @param {{ title: string, message?: string, confirmLabel?: string, cancelLabel?: string | null, tone?: 'default' | 'danger' }} options
 */
export function confirmDialog(options) {
  return new Promise((resolve) => {
    dialog.value = {
      confirmLabel: 'Confirmer',
      cancelLabel: 'Annuler',
      tone: 'default',
      ...options,
      resolve: (value) => {
        dialog.value = null
        resolve(value)
      },
    }
  })
}

/** Message d'information avec un seul bouton. */
export function infoDialog(options) {
  return confirmDialog({ confirmLabel: 'Compris', cancelLabel: null, ...options })
}

/** Notification éphémère. */
export function showToast(message, tone = 'info', duration = 3500) {
  const id = ++toastId
  toasts.value = [...toasts.value, { id, message, tone }]
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

export function useDialogState() {
  return { dialog, toasts }
}
