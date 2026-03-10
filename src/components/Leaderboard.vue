<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { db } from '../firebase'

const props = defineProps({
  mode: {
    type: String,
    default: 'survival'
  }
})

const scores = ref([])
const loading = ref(true)

const fetchScores = async () => {
  loading.value = true
  try {
    const scoresRef = collection(db, 'scores')
    const q = query(
      scoresRef, 
      where('mode', '==', props.mode),
      orderBy('score', 'desc'),
      orderBy('timeSeconds', 'asc'),
      limit(10)
    )
    
    const querySnapshot = await getDocs(q)
    const results = []
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() })
    })
    scores.value = results
  } catch (err) {
    console.error("Erreur chargement scores:", err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchScores)
</script>

<template>
  <div class="leaderboard">
    <h3>Top 10 - {{ mode === 'map' ? 'Mode Carte' : mode === 'survival' ? 'Survie' : 'Capitales' }}</h3>
    
    <div v-if="loading" class="lb-loader">Chargement...</div>
    
    <div v-else-if="scores.length === 0" class="no-scores">
      Aucun score pour le moment. Soyez le premier !
    </div>
    
    <div v-else class="scores-list">
      <div v-for="(s, index) in scores" :key="s.id" class="score-row" :class="{ 'top-three': index < 3 }">
        <span class="rank">{{ index + 1 }}</span>
        <span class="pseudo">{{ s.pseudo }}</span>
        <span class="points">{{ s.score }}/{{ s.total }}</span>
        <span class="time">{{ s.formattedTime }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  margin-top: 2rem;
}

h3 {
  margin-bottom: 1.5rem;
  text-align: center;
  color: #4facfe;
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.scores-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.score-row {
  display: grid;
  grid-template-columns: 30px 1fr 80px 70px;
  align-items: center;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.top-three {
  background: rgba(79, 172, 254, 0.1);
  border: 1px solid rgba(79, 172, 254, 0.2);
  color: white;
}

.rank {
  font-weight: 800;
  color: #4facfe;
}

.pseudo {
  font-weight: 600;
  padding-left: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.points {
  text-align: right;
  font-weight: 700;
}

.time {
  text-align: right;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

.lb-loader, .no-scores {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}
</style>
