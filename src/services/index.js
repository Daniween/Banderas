// Point d'entrée paresseux vers Firebase : le SDK (~400 ko) n'est téléchargé
// qu'après le premier affichage, ou dès qu'une fonctionnalité en a besoin.

let backendPromise = null

export function loadBackend() {
  backendPromise ??= import('./backend.js')
  return backendPromise
}

/** Messages d'erreur Firebase traduits pour l'utilisateur. `null` = erreur à ignorer silencieusement. */
export function authErrorMessage(err) {
  switch (err?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/popup-blocked':
      return 'La fenêtre de connexion a été bloquée par le navigateur. Autorisez les pop-ups puis réessayez.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Identifiant ou mot de passe incorrect.'
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.'
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cette adresse e-mail.'
    case 'auth/weak-password':
      return 'Mot de passe trop faible (6 caractères minimum).'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Par sécurité, le compte est temporairement bloqué : réessayez plus tard ou réinitialisez votre mot de passe.'
    case 'auth/network-request-failed':
      return 'Connexion réseau impossible. Vérifiez votre connexion internet.'
    default:
      return err?.message || "Une erreur est survenue. Veuillez réessayer."
  }
}
