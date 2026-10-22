<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import geoUrl from '../data/world.geo.json?url'

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
let map = null
// Contours des pays + pastilles des petits pays : mêmes styles, mêmes interactions
let countryLayers = []

const countryByCode = computed(() => new Map(props.countries.map((c) => [c.code, c])))

const BASE = { weight: 0.8, opacity: 1, color: '#aab4c9', fillOpacity: 1, fillColor: '#ffffff' }
// Pastille : contour plus marqué pour rester visible sur l'océan comme sur les terres
const POINT_BASE = { ...BASE, weight: 2, color: '#6b7896' }
const POINT_RADIUS = 7
const STYLES = {
  highlight: { fillColor: '#4f6bff', weight: 2.5, color: '#2a3fb8' },
  correct: { fillColor: '#4ade80', color: '#15803d' },
  missed: { fillColor: '#fdba74', color: '#c2410c' },
  last: { fillColor: '#f87171', weight: 2, color: '#b91c1c' },
  hover: { fillColor: '#c7d0ff' },
  click: { fillColor: '#fcd34d' },
}

const stateStyle = (code) => {
  if (code === props.highlightedCountryCode) return STYLES.highlight
  if (props.correctSessionCountries.has(code)) return STYLES.correct
  if (props.isFinished) return STYLES.missed
  if (code === props.redSessionCountry) return STYLES.last
  if (props.revealedSessionCountries.has(code)) return STYLES.missed
  return null
}

const styleOf = (layer) => ({ ...(layer.isPoint ? POINT_BASE : BASE), ...stateStyle(layer.feature.id) })
const restyle = (layer) => layer.setStyle(styleOf(layer))

const isDiscovered = (code) =>
  props.isFinished ||
  props.correctSessionCountries.has(code) ||
  props.revealedSessionCountries.has(code) ||
  code === props.redSessionCountry

const nameOf = (feature) => countryByCode.value.get(feature.id)?.name ?? feature.properties?.name ?? 'Pays inconnu'

function bindCountryEvents(layer) {
  const { feature } = layer
  layer.on({
    mouseover: () => {
      if (isDiscovered(feature.id)) {
        layer.bindTooltip(nameOf(feature), { sticky: true, className: 'map-tooltip' }).openTooltip()
      }
      layer.setStyle(STYLES.hover)
    },
    mouseout: () => {
      layer.unbindTooltip()
      restyle(layer)
    },
    click: (e) => {
      if (props.isFinished) {
        // Sur mobile (pas de survol) : un appui affiche le nom
        layer.bindTooltip(nameOf(feature), { className: 'map-tooltip' }).openTooltip(e.latlng)
        return
      }
      layer.setStyle(STYLES.click)
      setTimeout(() => restyle(layer), 300)
      emit('submit', feature.id)
    },
  })
  countryLayers.push(layer)
}

watch(
  () => [
    props.correctSessionCountries,
    props.revealedSessionCountries,
    props.redSessionCountry,
    props.highlightedCountryCode,
    props.isFinished,
  ],
  () => countryLayers.forEach(restyle),
)

// Zoom sur le pays recherché
watch(
  () => props.highlightedCountryCode,
  (code) => {
    if (!code || !map) return
    const point = countryByCode.value.get(code)?.point
    if (point) return map.flyTo(point, 6, { duration: 1.2 })
    const bounds = L.latLngBounds([])
    countryLayers.filter((l) => l.feature.id === code).forEach((l) => bounds.extend(l.getBounds()))
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 6, duration: 1.2 })
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
    // Rendu Canvas unique (bien plus fluide que SVG) avec une petite marge de clic
    renderer: L.canvas({ tolerance: 3 }),
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

    L.geoJSON(data, {
      style: (feature) => ({ ...BASE, ...stateStyle(feature.id) }),
      onEachFeature: (feature, layer) => bindCountryEvents(layer),
    }).addTo(map)

    // Pastilles ajoutées après les contours : dessinées et cliquables par-dessus
    for (const country of props.countries.filter((c) => c.point)) {
      const marker = L.circleMarker(country.point, { radius: POINT_RADIUS })
      marker.feature = { id: country.code, properties: { name: country.name } }
      marker.isPoint = true
      marker.setStyle(styleOf(marker))
      bindCountryEvents(marker)
      marker.addTo(map)
    }
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
  countryLayers = []
})
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container" role="application" aria-label="Carte du monde : cliquez sur le pays correspondant au drapeau"></div>

    <div v-if="loading" class="map-overlay"><div class="spinner"></div></div>
    <div v-else-if="loadError" class="map-overlay">Impossible de charger la carte. Vérifiez votre connexion.</div>

    <p v-if="!isFinished" class="map-hint">Cliquez sur le pays du drapeau · les plus petits sont des pastilles <span class="dot"></span></p>
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
  border: 2px solid var(--border);
  box-shadow: var(--shadow-md);
  isolation: isolate;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #d7e7fb;
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
  background: rgba(245, 247, 252, 0.7);
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-left: 2px;
  vertical-align: -1px;
  border-radius: 50%;
  border: 2px solid #6b7896;
  background: #fff;
}

.map-hint {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid var(--border);
  color: var(--text-muted);
  font-size: 0.85rem;
  white-space: nowrap;
  pointer-events: none;
}

:deep(.leaflet-container) {
  font-family: var(--font);
  background: #d7e7fb;
}

:deep(.leaflet-bar a) {
  background: var(--bg-elevated);
  color: var(--text);
  border-color: var(--border);
}

:deep(.leaflet-bar a:hover) {
  background: var(--surface-2);
}

:deep(.map-tooltip) {
  background: var(--text);
  border: 2px solid var(--border);
  color: #fff;
  border-radius: var(--radius-sm);
  font-weight: 800;
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
