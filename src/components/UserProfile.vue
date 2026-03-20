<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

const props = defineProps({
  user: Object
})

const emit = defineEmits(['back', 'update-pseudo'])

const newPseudo = ref(props.user?.pseudo || '')
const isEditingPseudo = ref(false)
const personalRecords = ref([])
const loadingStats = ref(true)

const totalTime = ref(0)
const totalGames = ref(0)

const fetchPersonalStats = async () => {
  if (!props.user?.uid) return
  loadingStats.value = true
  try {
    const scoresRef = collection(db, 'scores')
    const q = query(
      scoresRef,
      where('userId', '==', props.user.uid),
      orderBy('timestamp', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const records = []
    let timeSum = 0
    let gamesSum = 0
    
    // Map to keep only the best score for each mode
    const bests = {}

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      gamesSum++
      timeSum += (data.timeSeconds || 0)
      
      const modeKey = data.mode
      if (!bests[modeKey] || data.score > bests[modeKey].score) {
        bests[modeKey] = data
      }
    })
    
    personalRecords.value = Object.values(bests)
    totalTime.value = timeSum || props.user?.stats?.totalPlayTime || 0
    totalGames.value = gamesSum || props.user?.stats?.totalGames || 0
  } catch (err) {
    console.error("Erreur stats:", err)
  } finally {
    loadingStats.value = false
  }
}

const formatDuration = (seconds) => {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

const handleUpdatePseudo = async () => {
  if (newPseudo.value.trim() && newPseudo.value !== props.user.pseudo) {
    await emit('update-pseudo', newPseudo.value)
    isEditingPseudo.value = false
  }
}

onMounted(fetchPersonalStats)
</script>

<template>
  <div class="user-profile-view anim-fade-in">
    <header class="profile-header">
      <button @click="$emit('back')" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <h1>Mon Profil</h1>
      <div style="width: 40px"></div>
    </header>

    <div class="profile-content glass-panel">
      <!-- IDENTITY SECTION -->
      <section class="identity-section">
        <div class="avatar-container">
          <img :src="user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid" alt="Avatar" class="profile-avatar-large">
        </div>

        <div class="pseudo-container">
          <h2 v-if="!isEditingPseudo">{{ user.pseudo }}</h2>
          <div v-else class="edit-field">
            <input v-model="newPseudo" maxlength="20" class="profile-input">
            <button @click="handleUpdatePseudo" class="save-btn small">OK</button>
          </div>
          <button @click="isEditingPseudo = !isEditingPseudo" class="icon-btn-subtle" title="Modifier le pseudo">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
        <p class="user-email">{{ user.email }}</p>
      </section>

      <!-- GLOBAL STATS -->
      <section class="stats-overview">
        <div class="stat-card">
          <span class="stat-value">{{ totalGames }}</span>
          <span class="stat-label">Parties</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ formatDuration(totalTime) }}</span>
          <span class="stat-label">Temps de jeu</span>
        </div>
      </section>

      <!-- BEST RECORDS -->
      <section class="personal-records">
        <h3>Mes Records</h3>
        <div v-if="loadingStats" class="records-loader">Chargement...</div>
        <div v-else-if="personalRecords.length === 0" class="no-records">
          Aucun record enregistré. Jouez une partie !
        </div>
        <div v-else class="records-grid">
          <div v-for="rec in personalRecords" :key="rec.mode" class="record-item">
            <div class="record-icon" :class="rec.mode"></div>
            <div class="record-info">
              <span class="mode-label">{{ rec.mode === 'survival' ? 'Survie' : rec.mode === 'capital' ? 'Capitales' : 'Carte' }}</span>
              <div class="record-values">
                <span class="score">{{ rec.score }}/{{ rec.total }}</span>
                <span class="time">{{ rec.formattedTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <button @click="emit('back')" class="profile-back-btn">Retour au Menu</button>
  </div>
</template>

<style scoped src="../styles/UserProfile.css"></style>

