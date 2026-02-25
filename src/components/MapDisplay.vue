<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
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
  redSessionCountry: String
})

const emit = defineEmits(['submit'])

const mapContainer = ref(null)
let map = null
let geojsonLayer = null

const GEOJSON_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'

const getCountryStyle = (feature) => {
  const code = feature.id || feature.properties.id || feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.cca3 || feature.properties.CCA3
  
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
  () => props.redSessionCountry
], () => {
  if (geojsonLayer) {
    geojsonLayer.setStyle(getCountryStyle)
  }
}, { deep: true })

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

    geojsonLayer = L.geoJSON(data, {
      style: getCountryStyle,
      onEachFeature: (feature, layer) => {
        const propsData = feature.properties
        const code = feature.id || propsData.id || propsData.iso_a3 || propsData.ISO_A3 || propsData.cca3 || propsData.CCA3
        
        // Find French name from API data
        const countryData = (props.countries || []).find(c => c.cca3 === code)
        const countryName = countryData?.translations?.fra?.common || propsData.name || propsData.NAME || 'Pays inconnu'
        
        layer.on({
          mouseover: (e) => {
            const l = e.target
            
            // Show tooltip ONLY if country is discovered (correct, revealed or red)
            if (props.correctSessionCountries.has(code) || props.revealedSessionCountries.has(code) || code === props.redSessionCountry) {
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
            const code = feature.id || propsData.id || propsData.iso_a3 || propsData.ISO_A3 || propsData.cca3 || propsData.CCA3
            
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
  </div>
</template>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.map-container {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
}

.map-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

:deep(.map-tooltip) {
  background: rgba(0, 0, 0, 0.8);
  border: none;
  color: white;
  border-radius: 4px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

:deep(.map-tooltip::before) {
  display: none;
}
</style>
