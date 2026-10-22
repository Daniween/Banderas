<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import geoUrl from '../data/world.geo.json?url'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  countries: { type: Array, default: () => [] },
  correctSessionCountries: { type: Set, default: () => new Set() },
  revealedSessionCountries: { type: Set, default: () => new Set() },
  redSessionCountry: String,
  highlightedCountryCode: String,
  isFinished: Boolean,
})

const emit = defineEmits(['submit'])

const mapContainer = ref(null)
const loading = ref(true)
const loadError = ref(false)
const showInfo = ref(false)
let map = null
let geojsonLayer = null

const countryByCode = computed(() => new Map(props.countries.map((c) => [c.code, c])))

const nonClickableCountries = computed(() =>
  props.countries
    .filter((c) => !c.onMap)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b, 'fr')),
)

const BASE = { weight: 0.8, opacity: 1, color: 'rgba(148, 163, 214, 0.45)', fillOpacity: 1, fillColor: '#222b48' }
const STYLES = {
  highlight: { fillColor: '#4facfe', weight: 2.5, color: '#ffffff' },
  correct: { fillColor: '#1f9d74', color: 'rgba(255,255,255,0.7)' },
  missed: { fillColor: '#c2662a', color: 'rgba(255,255,255,0.7)' },
  last: { fillColor: '#dc4a4a', weight: 2, color: '#ffffff' },
  hover: { fillColor: '#3b6fb0' },
  click: { fillColor: '#fbbf24' },
}

const getCountryStyle = (feature) => {
  const code = feature.id
  if (code === props.highlightedCountryCode) return { ...BASE, ...STYLES.highlight }
  if (props.correctSessionCountries.has(code)) return { ...BASE, ...STYLES.correct }
  if (props.isFinished) return { ...BASE, ...STYLES.missed }
  if (code === props.redSessionCountry) return { ...BASE, ...STYLES.last }
  if (props.revealedSessionCountries.has(code)) return { ...BASE, ...STYLES.missed }
  return BASE
}

const isDiscovered = (code) =>
  props.isFinished ||
  props.correctSessionCountries.has(code) ||
  props.revealedSessionCountries.has(code) ||
  code === props.redSessionCountry

const nameOf = (feature) => countryByCode.value.get(feature.id)?.name ?? feature.properties?.name ?? 'Pays inconnu'

watch(
  () => [
    props.correctSessionCountries,
    props.revealedSessionCountries,
    props.redSessionCountry,
    props.highlightedCountryCode,
    props.isFinished,
  ],
  () => geojsonLayer?.setStyle(getCountryStyle),
)

// Zoom sur le pays recherché
watch(
  () => props.highlightedCountryCode,
  (code) => {
    if (!code || !geojsonLayer || !map) return
    geojsonLayer.eachLayer((layer) => {
      if (layer.feature.id === code) {
        map.flyToBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 6, duration: 1.2 })
      }
    })
  },
)

onMounted(async () => {
  // Pas de fond de carte tuilé : les contours suffisent pour le quiz (un fond avec
  // libellés donnerait les réponses), et la carte reste instantanée et hors ligne.
  map = L.map(mapContainer.value, {
    center: [20, 0],
    zoom: 2,
    minZoom: 1,
    maxZoom: 8,
    maxBounds: [
      [-85, -190],
      [85, 190],
    ],
    maxBoundsViscosity: 1.0,
    preferCanvas: true, // rendu Canvas : bien plus fluide que SVG pour ~180 polygones
    zoomSnap: 0.5,
    attributionControl: false,
  })

  // Ajuste le zoom initial à la taille du conteneur (mobile comme desktop)
  map.fitBounds([
    [-50, -160],
    [75, 175],
  ])

  try {
    const data = await (await fetch(geoUrl)).json()
    if (!map) return

    geojsonLayer = L.geoJSON(data, {
      style: getCountryStyle,
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: (e) => {
            if (isDiscovered(feature.id)) {
              e.target.bindTooltip(nameOf(feature), { sticky: true, className: 'map-tooltip' }).openTooltip()
            }
            e.target.setStyle(STYLES.hover)
          },
          mouseout: (e) => {
            e.target.unbindTooltip()
            geojsonLayer.resetStyle(e.target)
          },
          click: (e) => {
            if (props.isFinished) {
              // Sur mobile (pas de survol) : un appui affiche le nom
              e.target.bindTooltip(nameOf(feature), { className: 'map-tooltip' }).openTooltip(e.latlng)
              return
            }
            e.target.setStyle(STYLES.click)
            setTimeout(() => geojsonLayer?.resetStyle(e.target), 300)
            emit('submit', feature.id)
          },
        })
      },
    }).addTo(map)
  } catch (err) {
    console.error('Chargement de la carte impossible :', err)
    loadError.value = true
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  map?.remove()
  map = null
  geojsonLayer = null
})
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container" role="application" aria-label="Carte du monde : cliquez sur le pays correspondant au drapeau"></div>

    <div v-if="loading" class="map-overlay"><div class="spinner"></div></div>
    <div v-else-if="loadError" class="map-overlay">Impossible de charger la carte. Vérifiez votre connexion.</div>

    <p v-if="!isFinished" class="map-hint">Cliquez sur le pays correspondant au drapeau</p>

    <div v-if="nonClickableCountries.length" class="map-info">
      <button
        class="icon-btn info-btn"
        :aria-expanded="showInfo"
        aria-controls="map-info-panel"
        aria-label="Pays absents de la carte"
        @click="showInfo = !showInfo"
      >
        <AppIcon name="info" :size="20" />
      </button>
      <div v-if="showInfo" id="map-info-panel" class="info-panel">
        <h4>{{ nonClickableCountries.length }} pays absents de la carte</h4>
        <p>Trop petits pour cette carte, ils sont exclus du mode Carte :</p>
        <p class="countries-list">{{ nonClickableCountries.join(', ') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  isolation: isolate;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #0c1430;
}

.map-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  background: rgba(11, 16, 32, 0.6);
}

.map-hint {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-full);
  background: rgba(11, 16, 32, 0.75);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.85rem;
  white-space: nowrap;
  pointer-events: none;
}

.map-info {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.info-btn {
  background: rgba(11, 16, 32, 0.8);
}

.info-panel {
  width: min(320px, calc(100vw - 4rem));
  padding: 1.1rem 1.2rem;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg);
  animation: fade-up 0.25s var(--ease-out);
}

.info-panel h4 {
  color: var(--accent);
  margin-bottom: 0.4rem;
}

.info-panel p {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.countries-list {
  margin-top: 0.5rem;
  max-height: 180px;
  overflow-y: auto;
  color: var(--text) !important;
  line-height: 1.6;
}

:deep(.leaflet-container) {
  font-family: var(--font);
  background: #0c1430;
}

:deep(.leaflet-bar a) {
  background: var(--bg-elevated);
  color: var(--text);
  border-color: var(--border);
}

:deep(.leaflet-bar a:hover) {
  background: #1b2547;
}

:deep(.map-tooltip) {
  background: rgba(11, 16, 32, 0.92);
  border: 1px solid var(--border-strong);
  color: var(--text);
  border-radius: var(--radius-sm);
  font-weight: 600;
  box-shadow: var(--shadow-md);
}

:deep(.map-tooltip::before) {
  display: none;
}

@media (max-width: 640px) {
  .map-hint {
    display: none;
  }
}
</style>
