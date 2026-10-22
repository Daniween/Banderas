// E-mail de bienvenue + validation de l'adresse, aux couleurs de l'application.
// HTML en tableaux et styles en ligne : seule approche fiable dans Gmail, Outlook, etc.

const COLORS = {
  bg: '#f5f7fc',
  card: '#ffffff',
  border: '#e4e8f1',
  text: '#1c2236',
  muted: '#5a6382',
  subtle: '#8c93ab',
  accent: '#4f6bff',
  accentStrong: '#3a52d9',
  accentSoft: '#eaeeff',
}

// Les pastilles des modes de jeu, comme sur l'écran d'accueil
const MODE_DOTS = ['#4f6bff', '#ff5a6a', '#a855f7', '#10b981', '#f97316']

const FONT = "'Nunito', 'Segoe UI', Helvetica, Arial, sans-serif"

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * @param {{ pseudo?: string, link: string, appUrl: string }} params
 * @returns {{ subject: string, html: string, text: string }}
 */
export function verificationEmail({ pseudo, link, appUrl }) {
  const rawName = (pseudo || '').replace(/[\r\n]/g, ' ').trim().slice(0, 20)
  const plainHello = rawName ? `Bienvenue ${rawName} !` : 'Bienvenue !'
  const hello = escapeHtml(plainHello)
  const safeLink = escapeHtml(link)
  const logo = `${appUrl.replace(/\/$/, '')}/icon-192.png`

  const dots = MODE_DOTS.map(
    (c) => `<td style="padding:0 4px;"><div style="width:14px;height:14px;border-radius:5px;background:${c};"></div></td>`,
  ).join('')

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${hello}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;800;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
<div style="display:none;max-height:0;overflow:hidden;">Confirmez votre adresse pour enregistrer vos scores et entrer dans le classement.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Marque -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;"><img src="${logo}" width="36" height="36" alt="" style="display:block;border-radius:10px;"></td>
              <td style="font-family:${FONT};font-size:22px;font-weight:900;color:${COLORS.text};">Banderas</td>
            </tr></table>
          </td>
        </tr>

        <!-- Carte -->
        <tr>
          <td style="background:${COLORS.card};border:2px solid ${COLORS.border};border-bottom-width:6px;border-radius:24px;padding:40px 32px;text-align:center;">
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr>${dots}</tr></table>

            <h1 style="margin:0 0 12px;font-family:${FONT};font-size:30px;line-height:1.2;font-weight:900;color:${COLORS.text};">${hello}</h1>
            <p style="margin:0 0 8px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.muted};">
              Votre compte est presque prêt. Confirmez votre adresse e-mail pour enregistrer vos scores et entrer dans le
              <strong style="color:${COLORS.text};">classement mondial</strong>.
            </p>
            <p style="margin:0 0 32px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.muted};">
              197 drapeaux vous attendent&nbsp;!
            </p>

            <!-- Bouton « en relief » -->
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
              <td style="border-radius:16px;background:${COLORS.accent};border-bottom:4px solid ${COLORS.accentStrong};">
                <a href="${safeLink}" target="_blank" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:17px;font-weight:900;color:#ffffff;text-decoration:none;border-radius:16px;">
                  Confirmer mon adresse
                </a>
              </td>
            </tr></table>

            <p style="margin:32px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${COLORS.subtle};">
              Le bouton ne fonctionne pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:<br>
              <a href="${safeLink}" target="_blank" style="color:${COLORS.accent};word-break:break-all;">${safeLink}</a>
            </p>
          </td>
        </tr>

        <!-- Pied -->
        <tr>
          <td align="center" style="padding:24px 16px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.subtle};">
            Vous recevez cet e-mail car un compte Banderas a été créé avec cette adresse.<br>
            Si ce n'est pas vous, ignorez simplement ce message.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  const text = `${plainHello}

Votre compte Banderas est presque prêt. Confirmez votre adresse e-mail pour enregistrer vos scores et entrer dans le classement mondial :

${link}

Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement ce message.`

  return { subject: `${plainHello} Confirmez votre adresse Banderas`, html, text }
}
