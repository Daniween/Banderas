// Toute la dépendance à Firebase est isolée ici. Ce module est chargé à la demande
// (import dynamique, cf. ./index.js) pour ne pas alourdir le premier affichage.

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
// Firestore « lite » : requêtes ponctuelles sans temps réel ni cache hors ligne,
// trois fois plus léger que le SDK complet (l'app n'a pas besoin du reste).
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
} from 'firebase/firestore/lite'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
auth.languageCode = 'fr'

const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const LEADERBOARD_SIZE = 10
const LEADERBOARD_TTL = 60_000
const leaderboardCache = new Map()

// Pendant une inscription, le compte est connecté mais pas encore vérifié :
// le listener ne doit pas le déconnecter avant que le profil soit écrit.
let registering = false

// Les règles Firestore limitent le pseudo à 20 caractères (un nom Google peut être plus long)
const PSEUDO_MAX = 20
const clampPseudo = (value) => (value || 'Explorateur').trim().slice(0, PSEUDO_MAX)

const avatarFor = (pseudo) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(pseudo)}&background=random`

const isUnverifiedPasswordUser = (u) =>
  !u.emailVerified && u.providerData?.some((p) => p.providerId === 'password')

/** Notifie `callback(profil | null)` à chaque changement de session. Renvoie la fonction de désabonnement. */
export function watchUser(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) return callback(null)
    if (registering) return
    if (isUnverifiedPasswordUser(firebaseUser)) {
      await signOut(auth)
      return callback(null)
    }

    const fallback = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      pseudo: clampPseudo(firebaseUser.displayName),
    }

    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        callback(snap.data())
        updateDoc(userRef, { lastLogin: serverTimestamp() }).catch(() => {})
      } else {
        const profile = {
          ...fallback,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          stats: { totalGames: 0, totalPlayTime: 0 },
        }
        await setDoc(userRef, profile)
        callback(profile)
      }
    } catch (err) {
      console.error('Chargement du profil impossible :', err)
      // Profil minimal pour ne pas bloquer l'interface
      callback(fallback)
    }
  })
}

export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence)
  await signInWithPopup(auth, googleProvider)
}

export async function loginWithEmail(email, password) {
  await setPersistence(auth, browserLocalPersistence)
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  if (!user.emailVerified) {
    await signOut(auth)
    const err = new Error('Veuillez valider votre adresse e-mail avant de vous connecter (pensez à vérifier vos spams).')
    err.code = 'app/email-not-verified'
    throw err
  }
}

export async function registerWithEmail(email, password, pseudo) {
  registering = true
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email,
      displayName: pseudo,
      photoURL: avatarFor(pseudo),
      pseudo,
      cguAccepted: true,
      cguAcceptedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      stats: { totalGames: 0, totalPlayTime: 0 },
    })
    await sendEmailVerification(user, { url: window.location.origin, handleCodeInApp: false })
  } finally {
    // On déconnecte pour forcer la validation de l'e-mail
    await signOut(auth).catch(() => {})
    registering = false
  }
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export function logout() {
  return signOut(auth)
}

export function updatePseudo(uid, pseudo) {
  return updateDoc(doc(db, 'users', uid), { pseudo })
}

export async function saveScore(user, result) {
  await addDoc(collection(db, 'scores'), {
    userId: user.uid,
    pseudo: clampPseudo(user.pseudo || user.displayName),
    mode: result.mode,
    region: result.region || 'world',
    score: result.score,
    total: result.total,
    timeSeconds: result.timeSeconds,
    formattedTime: result.formattedTime,
    timestamp: serverTimestamp(),
  })
  leaderboardCache.delete(result.mode)
  // Statistiques cumulées : secondaires, un échec ne doit pas faire croire que le score est perdu
  await updateDoc(doc(db, 'users', user.uid), {
    'stats.totalGames': increment(1),
    'stats.totalPlayTime': increment(result.timeSeconds),
  }).catch((err) => console.warn('Mise à jour des statistiques impossible :', err))
}

/**
 * Top 10 mondial d'un mode (parties sur le monde entier uniquement : un 14/14 en Océanie
 * ne doit pas concurrencer un 197/197). Mis en cache 1 min en mémoire.
 */
export async function fetchLeaderboard(mode, { force = false } = {}) {
  const cached = leaderboardCache.get(mode)
  if (!force && cached && Date.now() - cached.at < LEADERBOARD_TTL) return cached.rows

  const q = query(
    collection(db, 'scores'),
    where('mode', '==', mode),
    orderBy('score', 'desc'),
    orderBy('timeSeconds', 'asc'),
    limit(LEADERBOARD_SIZE * 5),
  )
  const snap = await getDocs(q)
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => (s.region ?? 'world') === 'world' && s.score > 0)
    .slice(0, LEADERBOARD_SIZE)

  leaderboardCache.set(mode, { at: Date.now(), rows })
  return rows
}

export async function fetchUserScores(uid) {
  const q = query(collection(db, 'scores'), where('userId', '==', uid), orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data())
}
