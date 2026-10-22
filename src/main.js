import { createApp } from 'vue'
import '@fontsource-variable/nunito'
import './style.css'
import App from './App.vue'
import { confirmDialog } from './composables/useDialog'

createApp(App).mount('#app')

// Service worker (PWA) : mise en cache de l'application, des drapeaux et de la carte
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        confirmDialog({
          title: 'Mise à jour disponible',
          message: 'Une nouvelle version de Banderas est prête.',
          confirmLabel: 'Mettre à jour',
          cancelLabel: 'Plus tard',
        }).then((ok) => ok && updateSW(true))
      },
    })
  })
}
