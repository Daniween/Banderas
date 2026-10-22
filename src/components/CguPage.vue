<script setup>
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['back'])
</script>

<template>
  <div class="page">
    <header class="page-header">
      <button class="icon-btn" @click="emit('back')" aria-label="Retour" title="Retour">
        <AppIcon name="arrow-left" />
      </button>
      <h1>Conditions d'utilisation</h1>
      <div class="page-header-spacer"></div>
    </header>

    <article class="card cgu">
      <h2>Conditions Générales d'Utilisation et Politique de Confidentialité (RGPD)</h2>
      <p class="updated">Dernière mise à jour : 22 octobre 2026</p>

      <h3>1. Objet de l'application</h3>
      <p>Banderas est une application ludique d'apprentissage des drapeaux et capitales du monde. L'utilisation de cette application implique l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation.</p>

      <h3>2. Collecte et protection des données (RGPD)</h3>
      <p>Dans le cadre du Règlement Général sur la Protection des Données, nous vous informons que Banderas collecte un minimum de données :</p>
      <ul>
        <li><strong>Données d'authentification :</strong> adresse e-mail ou compte Google utilisé pour la connexion.</li>
        <li><strong>Données de profil :</strong> le pseudonyme que vous choisissez pour apparaître dans les classements.</li>
        <li><strong>Données de jeu :</strong> vos scores, temps de jeu et statistiques sur les différents modes.</li>
      </ul>
      <p><strong>Strict usage interne :</strong> ces informations sont <u>strictement et uniquement</u> utilisées pour le fonctionnement du jeu (sauvegarde de la progression et affichage dans le classement mondial). <strong>Aucune donnée n'est revendue, partagée à des tiers ou réutilisée à des fins commerciales ou publicitaires.</strong></p>

      <h3>3. Vos droits</h3>
      <p>Conformément à la réglementation européenne, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Vous pouvez modifier votre pseudonyme depuis votre profil dans l'application.</p>

      <h3>4. Cookies, stockage local et cache</h3>
      <p>Banderas utilise uniquement les technologies strictement nécessaires au maintien de votre connexion (stockage de session Firebase), à la sécurité et à la sauvegarde de votre progression (stockage local du navigateur). L'application met également en cache ses fichiers et les drapeaux sur votre appareil afin de se charger plus vite et de fonctionner hors ligne. Aucun cookie de pistage ou marketing n'est utilisé.</p>

      <h3>5. Propriété intellectuelle et sources</h3>
      <p>L'ensemble des éléments constituant l'application Banderas (code, interface, charte graphique) sont protégés par le droit d'auteur. Les drapeaux et données géographiques proviennent de sources publiques : <a href="https://github.com/mledoze/countries" target="_blank" rel="noopener">mledoze/countries</a> (ODbL), <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>, <a href="https://flagcdn.com" target="_blank" rel="noopener">Flagpedia</a> et <a href="https://github.com/johan/world.geo.json" target="_blank" rel="noopener">world.geo.json</a>.</p>

      <h3>6. Acceptation des conditions</h3>
      <p>Lors de votre inscription, en cochant la case dédiée, vous reconnaissez avoir pris connaissance des présentes CGU de Banderas et en accepter les termes.</p>
    </article>
  </div>
</template>

<style scoped>
.cgu {
  line-height: 1.7;
  color: var(--text-muted);
}

.cgu h2 {
  font-size: clamp(1.2rem, 4vw, 1.5rem);
  color: var(--text);
}

.updated {
  margin: 0.5rem 0 1.5rem;
  font-size: 0.88rem;
  color: var(--text-subtle);
}

.cgu h3 {
  margin: 1.75rem 0 0.6rem;
  font-size: 1.1rem;
  color: var(--text);
}

.cgu p + p {
  margin-top: 0.75rem;
}

.cgu ul {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
}

.cgu li + li {
  margin-top: 0.35rem;
}

.cgu strong {
  color: var(--text);
}
</style>
