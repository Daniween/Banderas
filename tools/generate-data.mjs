// Génère les données statiques embarquées dans l'application :
//  - src/data/countries.json : les 197 pays du quiz (noms FR/EN, alias, capitales FR/EN, région...)
//  - src/data/world.geo.json : les contours des pays pour le mode Carte (allégé)
//
// Sources :
//  - mledoze/countries (ODbL) : la base dont dérivait l'API RestCountries
//  - Wikidata (CC0) : noms français des capitales
//  - johan/world.geo.json (Unlicense) : contours des pays
//
// Usage : npm run data

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUT_DIR = new URL('../src/data/', import.meta.url)

const COUNTRIES_URL = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json'
const GEOJSON_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
const WIKIDATA_URL = 'https://query.wikidata.org/sparql'

// Membres de l'ONU + observateurs + Kosovo + Taïwan (+ Guinée-Bissau, mal renseignée à une époque)
const EXTRA_CODES = ['VAT', 'PSE', 'UNK', 'TWN', 'GNB']

// Codes qui diffèrent entre mledoze (cca3) et le GeoJSON
const GEO_CODE_MAPPING = { 'CS-KM': 'UNK', PS: 'PSE' }

// Zones sans code dans le GeoJSON, rattachées au pays reconnu par l'ONU
const GEO_NAME_MAPPING = { Somaliland: 'SOM', 'Northern Cyprus': 'CYP' }

// En dessous de cette emprise (en degrés²), un pays est trop petit pour être cliqué
// à l'échelle du monde : il reçoit une pastille ronde en plus de son contour.
const TINY_AREA = 1.5

// Alias usuels acceptés en plus des noms officiels
const CUSTOM_ALIASES = {
  COD: ['rd congo', 'rdc', 'congo kinshasa'],
  COG: ['congo brazzaville'],
  GBR: ['uk', 'royaume uni', 'angleterre', 'grande bretagne'],
  USA: ['usa', 'etats unis', 'etats unis d amerique', 'amerique'],
  ARE: ['uae', 'eau', 'emirats arabes unis', 'emirats'],
  CAF: ['rca', 'centrafrique', 'republique centrafricaine'],
  CZE: ['tchequie', 'republique tcheque'],
  MKD: ['macedoine'],
  NLD: ['hollande'],
  CIV: ['cote d ivoire', 'ivory coast'],
  PRK: ['coree du nord'],
  KOR: ['coree du sud'],
  MMR: ['birmanie'],
  SWZ: ['swaziland'],
  TLS: ['timor oriental'],
  VAT: ['vatican'],
}

// Capitales sans correspondance Wikidata (ou dont le libellé FR mérite d'être forcé)
const CAPITAL_FR_OVERRIDES = {
  Pristina: 'Pristina',
  'Ulan Bator': 'Oulan-Bator',
  Oslo: 'Oslo',
  "Sana'a": 'Sanaa',
}

async function getJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

const normalize = (str) =>
  str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

async function fetchFrenchCapitals() {
  const query = `SELECT ?iso ?fr ?en WHERE {
    ?c wdt:P298 ?iso . ?c p:P36 ?st . ?st ps:P36 ?cap .
    FILTER NOT EXISTS { ?st pq:P582 ?end }
    OPTIONAL { ?cap rdfs:label ?fr FILTER(lang(?fr) = "fr") }
    OPTIONAL { ?cap rdfs:label ?en FILTER(lang(?en) = "en") }
  }`
  const url = `${WIKIDATA_URL}?query=${encodeURIComponent(query)}`
  const data = await getJson(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'BanderasQuiz-datagen/1.0' },
  })
  // iso -> [{ fr, en }]
  const byIso = {}
  for (const b of data.results.bindings) {
    if (!b.fr) continue
    ;(byIso[b.iso.value] ??= []).push({ fr: b.fr.value, en: b.en?.value ?? '' })
  }
  return byIso
}

function frenchCapital(cca3, capitalEn, wikidata) {
  if (CAPITAL_FR_OVERRIDES[capitalEn]) return CAPITAL_FR_OVERRIDES[capitalEn]
  const candidates = wikidata[cca3] ?? []
  const target = normalize(capitalEn)
  const match =
    candidates.find((c) => normalize(c.en) === target) ??
    candidates.find((c) => normalize(c.en).includes(target) || target.includes(normalize(c.en)))
  return match?.fr ?? null
}

const rawGeoCode = (f) => f.id || f.properties?.id || f.properties?.iso_a3
const geoCode = (f) => GEO_NAME_MAPPING[f.properties?.name] ?? GEO_CODE_MAPPING[rawGeoCode(f)] ?? rawGeoCode(f)

/** Emprise (degrés²) de chaque pays du GeoJSON, toutes parties confondues. */
function areasByCode(features) {
  const boxes = {}
  const visit = (coords, box) => {
    if (typeof coords[0] === 'number') {
      box[0] = Math.min(box[0], coords[0])
      box[1] = Math.min(box[1], coords[1])
      box[2] = Math.max(box[2], coords[0])
      box[3] = Math.max(box[3], coords[1])
    } else coords.forEach((c) => visit(c, box))
  }
  for (const f of features) {
    const box = (boxes[geoCode(f)] ??= [Infinity, Infinity, -Infinity, -Infinity])
    visit(f.geometry.coordinates, box)
  }
  return Object.fromEntries(Object.entries(boxes).map(([code, b]) => [code, (b[2] - b[0]) * (b[3] - b[1])]))
}

async function main() {
  console.log('Téléchargement des sources...')
  const [all, geo, wikidata] = await Promise.all([
    getJson(COUNTRIES_URL),
    getJson(GEOJSON_URL),
    fetchFrenchCapitals(),
  ])

  const areas = areasByCode(geo.features)
  const missingCapitals = []

  const countries = all
    .filter((c) => c.unMember || EXTRA_CODES.includes(c.cca3))
    .map((c) => {
      const fr = c.translations.fra ?? { common: c.name.common, official: c.name.official }
      const capitals = (c.capital ?? []).map((en) => {
        const frName = frenchCapital(c.cca3, en, wikidata)
        if (!frName) missingCapitals.push(`${c.cca3}: ${en}`)
        return { fr: frName ?? en, en }
      })

      // Noms acceptés comme réponse (normalisés, dédoublonnés).
      // Les codes ISO à 2 lettres des altSpellings sont exclus : trop faciles.
      const aliases = [
        c.name.common,
        c.name.official,
        fr.common,
        fr.official,
        ...(c.altSpellings ?? []).filter((s) => !/^[A-Z]{2}$/.test(s)),
        ...(CUSTOM_ALIASES[c.cca3] ?? []),
      ]

      return {
        code: c.cca3,
        iso2: c.cca2.toLowerCase(),
        name: fr.common,
        nameEn: c.name.common,
        region: c.region,
        capitals,
        aliases: [...new Set(aliases.map(normalize).filter(Boolean))],
        // Pastille cliquable pour les pays absents de la carte ou trop petits
        ...(!(areas[c.cca3] >= TINY_AREA) && { point: c.latlng.map((n) => Math.round(n * 100) / 100) }),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  // GeoJSON allégé : on ne garde que le code (normalisé) et le nom de chaque pays
  const slimGeo = {
    type: 'FeatureCollection',
    features: geo.features.map((f) => ({
      type: 'Feature',
      id: geoCode(f),
      properties: { name: f.properties?.name },
      geometry: f.geometry,
    })),
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(new URL('countries.json', OUT_DIR), JSON.stringify(countries, null, 1) + '\n')
  await writeFile(new URL('world.geo.json', OUT_DIR), JSON.stringify(slimGeo))

  console.log(`${countries.length} pays écrits dans ${fileURLToPath(OUT_DIR)}`)
  const points = countries.filter((c) => c.point)
  console.log(`${points.length} pays représentés par une pastille : ${points.map((c) => c.code).join(', ')}`)
  if (missingCapitals.length) {
    console.warn(`Capitales sans nom français (nom anglais conservé) :\n  ${missingCapitals.join('\n  ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
