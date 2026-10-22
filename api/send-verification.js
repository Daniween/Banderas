// Fonction serverless Vercel : envoie l'e-mail de bienvenue / validation aux couleurs de Banderas.
//
// Appelée par le client juste après l'inscription, avec le jeton Firebase de l'utilisateur :
// on ne peut donc demander un e-mail que pour son propre compte, et seulement s'il n'est pas encore validé.
//
// Variables d'environnement (Vercel > Settings > Environment Variables) :
//   FIREBASE_SERVICE_ACCOUNT  JSON du compte de service Firebase (Paramètres du projet > Comptes de service)
//   MAIL_FROM                 expéditeur, ex. « Banderas <banderas.quiz@gmail.com> »
//   APP_URL                   URL publique de l'app, ex. https://banderas-phi.vercel.app (facultatif)
// et l'un des deux modes d'envoi :
//   SMTP_URL                  ex. smtps://adresse%40gmail.com:motdepasseapplication@smtp.gmail.com:465
//   RESEND_API_KEY            clé API Resend (https://resend.com), nécessite un domaine vérifié

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import nodemailer from 'nodemailer'
import { verificationEmail } from '../emails/verification.js'

function adminAuth() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
  }
  return getAuth()
}

async function sendMail(message) {
  if (process.env.SMTP_URL) {
    await nodemailer.createTransport(process.env.SMTP_URL).sendMail(message)
    return
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
  if (!response.ok) throw new Error(`Resend ${response.status} : ${await response.text()}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  // Non configuré : le client se rabat sur l'e-mail standard de Firebase
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !(process.env.SMTP_URL || process.env.RESEND_API_KEY)) {
    return res.status(501).json({ error: 'not-configured' })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'unauthenticated' })

  let user
  try {
    const auth = adminAuth()
    const { uid } = await auth.verifyIdToken(token)
    user = await auth.getUser(uid)
  } catch {
    return res.status(401).json({ error: 'invalid-token' })
  }

  if (!user.email) return res.status(400).json({ error: 'no-email' })
  if (user.emailVerified) return res.status(409).json({ error: 'already-verified' })

  const appUrl = process.env.APP_URL || req.headers.origin || 'https://banderas-phi.vercel.app'

  try {
    // L'URL de retour doit appartenir aux domaines autorisés de Firebase Authentication
    const link = await getAuth().generateEmailVerificationLink(user.email, { url: appUrl })
    const pseudo = typeof req.body?.pseudo === 'string' ? req.body.pseudo : ''
    const { subject, html, text } = verificationEmail({ pseudo, link, appUrl })

    await sendMail({
      from: process.env.MAIL_FROM || 'Banderas <onboarding@resend.dev>',
      to: user.email,
      subject,
      html,
      text,
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("Envoi de l'e-mail de validation impossible :", err)
    return res.status(502).json({ error: 'send-failed' })
  }
}
