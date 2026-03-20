<script setup>
const emit = defineEmits(['back'])
</script>

<template>
  <div class="cgu-page glass-panel">
    <button class="back-btn" @click="$emit('back')">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      Retour
    </button>
    <div class="cgu-content">
      <h1>Conditions Générales d'Utilisation et Politique de Confidentialité (RGPD)</h1>
      <p>Dernière mise à jour : 20 Mars 2026</p>

      <h2>1. Objet de l'application</h2>
      <p>Banderas est une application ludique d'apprentissage des drapeaux et capitales du monde. L'utilisation de cette application implique l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation.</p>

      <h2>2. Collecte et protection des données (RGPD)</h2>
      <p>Dans le cadre du Règlement Général sur la Protection des Données, nous vous informons que Banderas collecte un minimum de données :</p>
      <ul>
        <li><strong>Données d'authentification :</strong> Adresse e-mail ou compte Google utilisé pour la connexion.</li>
        <li><strong>Données de profil :</strong> Le pseudonyme que vous choisissez pour apparaître dans les classements.</li>
        <li><strong>Données de jeu :</strong> Vos scores, temps de jeu et statistiques sur les différents modes.</li>
      </ul>
      <p><strong>Strict usage interne :</strong> Ces informations sont <u>strictement et uniquement</u> utilisées pour le fonctionnement du jeu (sauvegarde de la progression et affichage dans le classement mondial). <strong>Aucune donnée n'est revendue, partagée à des tiers ou réutilisée à des fins commerciales ou publicitaires.</strong></p>
      
      <h2>3. Vos droits</h2>
      <p>Conformément à la réglementation européenne, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Vous pouvez modifier votre pseudonyme depuis les paramètres de votre profil dans l'application.</p>

      <h2>4. Cookies et technologies similaires</h2>
      <p>Banderas utilise uniquement les technologies (comme le stockage local ou les cookies de session pour l'authentification Firebase) strictement nécessaires au maintien de votre connexion, à la sécurité et à la sauvegarde de votre progression en cours. Aucun cookie de pistage ou marketing n'est utilisé.</p>

      <h2>5. Propriété intellectuelle</h2>
      <p>L'ensemble des éléments constituant l'application Banderas (code, interface, charte graphique) sont protégés par le droit d'auteur. Les drapeaux et données géographiques proviennent de sources publiques.</p>

      <h2>6. Acceptation des conditions</h2>
      <p>Lors de votre inscription, en cochant la case dédiée, vous reconnaissez avoir pris connaissance des présentes CGU de Banderas et en accepter les termes.</p>
    </div>
  </div>
</template>

<style scoped src="../styles/CguPage.css"></style>
