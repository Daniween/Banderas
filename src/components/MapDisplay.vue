<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  currentCountry: Object,
  countries: Array,
  correctSessionCountries: {
    type: Object,
    default: () => new Set()
  },
  revealedSessionCountries: {
    type: Object,
    default: () => new Set()
  },
  redSessionCountry: String,
  highlightedCountryCode: String,
  isFinished: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const mapContainer = ref(null)
const geoCodes = ref(new Set())
let map = null
let geojsonLayer = null

// Map codes that differ between API (REST Countries) and GeoJSON
const CODE_MAPPING = {
  'UNK': 'CS-KM', // Kosovo
  'PSE': 'PS',    // Palestine (Some GeoJSON use 'PS', others 'PSE')
}

// Helper to get consistent code for comparison
const getNormalizedCode = (feature) => {
  const code = feature.id || feature.properties.id || feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.cca3 || feature.properties.CCA3
  // Reverse lookup: find if this GeoJSON code corresponds to an API code we use
  for (const [apiCode, geoCode] of Object.entries(CODE_MAPPING)) {
    if (code === geoCode) return apiCode
  }
  return code
}

const GEOJSON_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'

const nonClickableCountries = computed(() => {
  if (!props.countries || !geoCodes.value.size) return []
  return props.countries
    .filter(c => !geoCodes.value.has(c.cca3))
    .map(c => c.translations?.fra?.common || c.name.common)
    .sort((a, b) => a.localeCompare(b))
})

const getCountryStyle = (feature) => {
  const code = getNormalizedCode(feature)
  if (code === props.highlightedCountryCode) {
    return {
      fillColor: '#2ecc71', // Vert émeraude brillant
      fillOpacity: 0.9,
      weight: 3,
      color: '#ffffff',
      dashArray: ''
    }
  }

  if (props.isFinished) {
    if (props.correctSessionCountries.has(code)) {
      return {
        fillColor: '#27ae60', // Vert (trouvé)
        fillOpacity: 0.6,
        weight: 1,
        color: '#ffffff'
      }
    } else {
      return {
        fillColor: '#e67e22', // Orange (non trouvé)
        fillOpacity: 0.6,
        weight: 1,
        color: '#ffffff'
      }
    }
  }

  if (code === props.redSessionCountry) {
    return {
      fillColor: '#e74c3c', // Rouge
      fillOpacity: 0.8,
      weight: 2,
      color: '#ffffff'
    }
  }

  if (props.correctSessionCountries.has(code)) {
    return {
      fillColor: '#27ae60', // Vert
      fillOpacity: 0.6,
      weight: 1,
      color: '#ffffff'
    }
  }
  
  if (props.revealedSessionCountries.has(code)) {
    return {
      fillColor: '#e67e22', // Orange
      fillOpacity: 0.6,
      weight: 1,
      color: '#ffffff'
    }
  }

  return {
    fillColor: '#ffffff',
    weight: 1,
    opacity: 1,
    color: '#666',
    fillOpacity: 0.1
  }
}

// Watch for changes in discovered countries to update the map
watch([
  () => props.correctSessionCountries, 
  () => props.revealedSessionCountries,
  () => props.redSessionCountry,
  () => props.highlightedCountryCode,
  () => props.isFinished
], () => {
  if (geojsonLayer) {
    geojsonLayer.setStyle(getCountryStyle)
  }
}, { deep: true })

// Auto-zoom and pan to highlighted country
watch(() => props.highlightedCountryCode, (newCode) => {
  if (!newCode || !geojsonLayer || !map) return

  geojsonLayer.eachLayer(layer => {
    const feature = layer.feature
    const code = getNormalizedCode(feature)
    
    if (code === newCode) {
      const bounds = layer.getBounds()
      map.flyToBounds(bounds, {
        padding: [100, 100],
        maxZoom: 6,
        duration: 1.5
      })
    }
  })
})

onMounted(async () => {
  map = L.map(mapContainer.value, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  }).addTo(map)

  try {
    const response = await fetch(GEOJSON_URL)
    const data = await response.json()

    // Collect all available codes in the GeoJSON
    const codes = new Set()
    data.features.forEach(f => codes.add(getNormalizedCode(f)))
    geoCodes.value = codes

    geojsonLayer = L.geoJSON(data, {
      style: getCountryStyle,
      onEachFeature: (feature, layer) => {
        const propsData = feature.properties
        const code = getNormalizedCode(feature)
        
        // Find French name from API data
        const countryData = (props.countries || []).find(c => c.cca3 === code)
        const countryName = countryData?.translations?.fra?.common || propsData.name || propsData.NAME || 'Pays inconnu'
        
        layer.on({
          mouseover: (e) => {
            const l = e.target
            
            // Show tooltip ALWAYS if finished, otherwise only if discovered
            if (props.isFinished || props.correctSessionCountries.has(code) || props.revealedSessionCountries.has(code) || code === props.redSessionCountry) {
              l.bindTooltip(countryName, { sticky: true, className: 'map-tooltip' }).openTooltip()
            }

            l.setStyle({
              fillOpacity: 0.5,
              fillColor: '#4facfe'
            })
          },
          mouseout: (e) => {
            const l = e.target
            l.unbindTooltip()
            geojsonLayer.resetStyle(l)
          },
          click: (e) => {
            if (props.isFinished) return

            const code = getNormalizedCode(feature)
            
            // Visual feedback
            const l = e.target
            l.setStyle({ fillColor: '#f1c40f', fillOpacity: 0.8 })
            setTimeout(() => {
              if (geojsonLayer) geojsonLayer.resetStyle(l)
            }, 300)

            emit('submit', code)
          }
        })
      }
    }).addTo(map)
  } catch (e) {
    console.error('Failed to load map data:', e)
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})

// Focus or highlight could be added here if needed
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <div class="map-hint">Cliquez sur le pays correspondant au drapeau</div>
    
    <!-- Info Note for non-clickable countries -->
    <div class="map-info-note" v-if="nonClickableCountries.length > 0">
      <div class="info-icon" title="Pourquoi certains pays ne sont pas cliquables ?">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <div class="info-tooltip">
        <h4>{{ nonClickableCountries.length }} pays non cliquables</h4>
        <p>Ces pays sont trop petits pour la carte actuelle (amélioration en cours) :</p>
        <div class="countries-list">
          {{ nonClickableCountries.join(', ') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../styles/MapDisplay.css"></style>
