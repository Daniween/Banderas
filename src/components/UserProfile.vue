<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

const props = defineProps({
  user: Object
})

const emit = defineEmits(['back', 'update-pseudo', 'update-photo'])

const newPseudo = ref(props.user?.pseudo || '')
const newPhotoURL = ref(props.user?.photoURL || '')
const isEditingPseudo = ref(false)
const isEditingPhoto = ref(false)
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

const handleUpdatePhoto = async () => {
  if (newPhotoURL.value.trim() && newPhotoURL.value !== props.user.photoURL) {
    await emit('update-photo', newPhotoURL.value)
    isEditingPhoto.value = false
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
          <button @click="isEditingPhoto = !isEditingPhoto" class="edit-photo-btn" title="Modifier la photo">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
        </div>

        <div v-if="isEditingPhoto" class="edit-field anim-slide-down">
          <input v-model="newPhotoURL" placeholder="URL de l'image..." class="profile-input">
          <button @click="handleUpdatePhoto" class="save-btn small">OK</button>
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

<style scoped>
.user-profile-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
}

.profile-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.profile-header h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0;
}

.back-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.15);
}

.profile-content {
    width: 100%;
    padding: 2.5rem;
    margin-bottom: 2rem;
}

.identity-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2.5rem;
    text-align: center;
}

.avatar-container {
    position: relative;
    margin-bottom: 1.5rem;
}

.profile-avatar-large {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid #4facfe;
    padding: 3px;
    background: rgba(255, 255, 255, 0.05);
}

.edit-photo-btn {
    position: absolute;
    bottom: 0;
    right: 0;
    background: #4facfe;
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.pseudo-container {
    display: flex;
    align-items: center;
    gap: 0.8rem;
}

.pseudo-container h2 {
    font-size: 1.8rem;
    margin: 0;
}

.user-email {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.9rem;
    margin-top: 0.3rem;
}

.edit-field {
    display: flex;
    gap: 10px;
    margin: 0.5rem 0;
}

.profile-input {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    padding: 0.4rem 1rem;
    outline: none;
    width: 200px;
}

.save-btn.small {
    background: #2ecc71;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 1rem;
    cursor: pointer;
    font-weight: 600;
}

.stats-overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
}

.stat-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: #4facfe;
}

.stat-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.4);
}

.personal-records h3 {
    font-size: 1.1rem;
    color: white;
    margin-bottom: 1.2rem;
    text-align: left;
}

.records-grid {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.record-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.record-icon {
    width: 10px;
    height: 40px;
    border-radius: 4px;
}

.record-icon.survival { background: #4facfe; }
.record-icon.capital { background: #f093fb; }
.record-icon.map { background: #43e97b; }

.record-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mode-label {
    font-weight: 700;
}

.record-values {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.record-values .score {
    font-weight: 800;
    color: white;
}

.record-values .time {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
}

.profile-back-btn {
    padding: 1rem 2.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.icon-btn-subtle {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    padding: 5px;
}

.icon-btn-subtle:hover {
    color: white;
}

.anim-fade-in { animation: fadeIn 0.5s ease-out; }
.anim-slide-down { animation: slideDown 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
</style>
