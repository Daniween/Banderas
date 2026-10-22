// Accès à localStorage tolérant aux erreurs (navigation privée, quota, JSON corrompu...)

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Stockage indisponible : la progression ne sera simplement pas persistée
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // idem
  }
}
