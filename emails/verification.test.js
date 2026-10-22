import { describe, it, expect } from 'vitest'
import { verificationEmail } from './verification.js'
import handler from '../api/send-verification.js'

const LINK = 'https://banderas-3a6e0.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc&continueUrl=x'

describe('verificationEmail', () => {
  it('personnalise l’objet, le HTML et le texte avec le pseudo', () => {
    const mail = verificationEmail({ pseudo: 'Daniel', link: LINK, appUrl: 'https://banderas-phi.vercel.app/' })
    expect(mail.subject).toBe('Bienvenue Daniel ! Confirmez votre adresse Banderas')
    expect(mail.html).toContain('Bienvenue Daniel !')
    expect(mail.html).toContain('https://banderas-phi.vercel.app/icon-192.png')
    expect(mail.text).toContain(LINK)
  })

  it('échappe le pseudo et le lien dans le HTML', () => {
    const mail = verificationEmail({ pseudo: '<script>x</script>', link: LINK, appUrl: 'https://a.b' })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('mode=verifyEmail&amp;oobCode=abc')
  })

  it('fonctionne sans pseudo', () => {
    expect(verificationEmail({ link: LINK, appUrl: 'https://a.b' }).subject).toBe('Bienvenue ! Confirmez votre adresse Banderas')
  })
})

describe('api/send-verification', () => {
  const call = async (req) => {
    const res = { statusCode: 0, body: null, headers: {} }
    res.status = (code) => ((res.statusCode = code), res)
    res.json = (body) => ((res.body = body), res)
    res.setHeader = (k, v) => (res.headers[k] = v)
    await handler({ headers: {}, body: {}, ...req }, res)
    return res
  }

  it('refuse les méthodes autres que POST', async () => {
    expect((await call({ method: 'GET' })).statusCode).toBe(405)
  })

  it('répond 501 tant que le service n’est pas configuré (repli côté client)', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_URL
    expect((await call({ method: 'POST' })).statusCode).toBe(501)
  })
})
