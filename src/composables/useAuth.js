import { ref, onMounted } from 'vue'
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const user = ref(null)
const loadingAuth = ref(true)

export function useAuth() {

    // Initialise l'utilisateur à la montée de l'app
    onMounted(() => {
        console.log("Initialisation useAuth...");

        // Sécurité : Si Firebase ne répond pas en 3 secondes, on force l'affichage
        const timeout = setTimeout(() => {
            if (loadingAuth.value) {
                console.warn("Timeout Firebase (3s) : Forçage du chargement");
                loadingAuth.value = false;
            }
        }, 3000);

        onAuthStateChanged(auth, async (firebaseUser) => {
            clearTimeout(timeout);
            console.log("Auth state changed:", firebaseUser ? "Connecté" : "Déconnecté");
            if (firebaseUser) {
                if (!firebaseUser.emailVerified && firebaseUser.providerData?.some(p => p.providerId === 'password')) {
                    console.warn("Utilisateur non vérifié, déconnexion forcée");
                    await signOut(auth);
                    user.value = null;
                    loadingAuth.value = false;
                    return;
                }

                try {
                    // Récupère ou crée les infos supplémentaires en base
                    const userRef = doc(db, 'users', firebaseUser.uid)
                    const userSnap = await getDoc(userRef)

                    if (!userSnap.exists()) {
                        const newUser = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            pseudo: firebaseUser.displayName || 'Explorateur',
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp(),
                            stats: { totalGames: 0, highScores: {} }
                        }
                        await setDoc(userRef, newUser)
                        user.value = newUser
                    } else {
                        await updateDoc(userRef, { lastLogin: serverTimestamp() })
                        user.value = userSnap.data()
                    }
                } catch (e) {
                    console.error("Erreur Firestore lors du chargement de l'utilisateur:", e)
                    // On définit tout de même un profil minimum pour ne pas bloquer l'UI
                    user.value = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        pseudo: firebaseUser.displayName || 'Utilisateur'
                    }
                }
            } else {
                user.value = null
            }
            loadingAuth.value = false
        })
    })

    const loginWithGoogle = async () => {
        try {
            await setPersistence(auth, browserLocalPersistence)
            await signInWithPopup(auth, googleProvider)
        } catch (error) {
            console.error("Erreur de connexion Google:", error)
            throw error
        }
    }

    const checkRateLimit = () => {
        const attemptsData = localStorage.getItem('banderas-login-attempts')
        if (attemptsData) {
            const data = JSON.parse(attemptsData)
            const now = Date.now()
            if (data.blockedUntil && now < data.blockedUntil) {
                const minutesLeft = Math.ceil((data.blockedUntil - now) / 60000)
                throw new Error(`Trop de tentatives. Veuillez réessayer dans ${minutesLeft} minutes.`)
            }
            if (data.blockedUntil && now >= data.blockedUntil) {
                localStorage.removeItem('banderas-login-attempts')
            }
        }
    }

    const recordFailedAttempt = () => {
        const attemptsData = localStorage.getItem('banderas-login-attempts')
        const now = Date.now()
        let data = attemptsData ? JSON.parse(attemptsData) : { count: 0, blockedUntil: null }
        if (!data.blockedUntil || now >= data.blockedUntil) {
            data.count += 1
            if (data.count >= 5) {
                data.blockedUntil = now + (5 * 60 * 1000) // 5 minutes
            }
            localStorage.setItem('banderas-login-attempts', JSON.stringify(data))
        }
    }

    const clearLoginAttempts = () => {
        localStorage.removeItem('banderas-login-attempts')
    }

    const loginWithEmail = async (email, password) => {
        checkRateLimit()
        try {
            await setPersistence(auth, browserLocalPersistence)
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            
            // Vérification email pour les comptes classiques (RGPD & sécurité)
            if (!userCredential.user.emailVerified) {
                await signOut(auth)
                throw new Error("Veuillez vérifier votre adresse e-mail avant de vous connecter (un lien vous a été envoyé). Vérifiez vos spams.")
            }
            clearLoginAttempts()
        } catch (error) {
            // Si l'erreur est notre Error custom de checkRateLimit on la throw direct
            if (error.message.includes('Trop de tentatives')) throw error;

            recordFailedAttempt()
            console.error("Erreur de connexion Email:", error)
            throw error
        }
    }

    const registerWithEmail = async (email, password, pseudo) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            auth.languageCode = 'fr';
            const actionCodeSettings = {
                url: window.location.origin, // Return to current origin
                handleCodeInApp: false
            };
            await sendEmailVerification(userCredential.user, actionCodeSettings)

            // Créer le profil initial avec traçage RGPD
            const userRef = doc(db, 'users', userCredential.user.uid)
            const newUser = {
                uid: userCredential.user.uid,
                email: email,
                displayName: pseudo,
                photoURL: `https://ui-avatars.com/api/?name=${pseudo}&background=random`,
                pseudo: pseudo,
                cguAccepted: true,
                cguAcceptedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                stats: { totalGames: 0, highScores: {} }
            }
            await setDoc(userRef, newUser)
            // On déconnecte directement l'utilisateur pour le forcer à valider son email
            await signOut(auth)
            user.value = null

            return userCredential.user
        } catch (error) {
            console.error("Erreur d'inscription:", error)
            throw error
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
            user.value = null
        } catch (error) {
            console.error("Erreur de déconnexion :", error)
        }
    }

    const updatePseudo = async (newPseudo) => {
        if (!user.value) return
        try {
            const userRef = doc(db, 'users', user.value.uid)
            await updateDoc(userRef, { pseudo: newPseudo })
            user.value.pseudo = newPseudo
        } catch (error) {
            console.error("Erreur mise à jour pseudo :", error)
        }
    }

    return {
        user,
        loadingAuth,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updatePseudo
    }
}
