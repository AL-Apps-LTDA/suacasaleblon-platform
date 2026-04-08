import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookingEmailData {
  guestName: string
  guestEmail: string
  propertyCode: string
  propertyName?: string
  checkin: string
  checkout: string
  totalValue: number
  paidAmount: number
  paymentMethod: string
  couponCode?: string
  couponDiscount?: number
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}

function nightsCount(checkin: string, checkout: string): number {
  const a = new Date(checkin)
  const b = new Date(checkout)
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}
export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  const nights = nightsCount(data.checkin, data.checkout)
  const whatsappLink = 'https://wa.me/5521995360322'

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center;">
          <img src="https://suacasaleblon.com/images/logo.png" alt="Sua Casa Leblon" width="48" style="max-width:48px;border-radius:8px;" />
          <h1 style="color:#ffffff;font-size:22px;margin:12px 0 0;font-weight:600;">Sua Casa Leblon</h1>
          <p style="color:#c8b88a;margin:8px 0 0;font-size:14px;letter-spacing:1px;">RESERVA CONFIRMADA ✓</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:18px;color:#1a3a2a;margin:0 0 8px;">Olá, <strong>${data.guestName}</strong>!</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
            Sua reserva foi confirmada com sucesso. Estamos preparando tudo para recebê-lo(a) em Leblon!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;border:1px solid #e8e3da;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Detalhes da Reserva</p>              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;" width="40%">Apartamento</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a3a2a;font-weight:600;">${data.propertyName || data.propertyCode}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Check-in</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a3a2a;font-weight:600;">${formatDate(data.checkin)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Check-out</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a3a2a;font-weight:600;">${formatDate(data.checkout)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Noites</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a3a2a;font-weight:600;">${nights}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Pagamento</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a3a2a;font-weight:600;">${data.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}</td>
                </tr>
                ${data.couponCode ? `
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Cupom</td>
                  <td style="padding:6px 0;font-size:14px;color:#2a7d4f;font-weight:600;">${data.couponCode} (-R$ ${data.couponDiscount?.toFixed(2)})</td>
                </tr>` : ''}                <tr>
                  <td colspan="2" style="border-top:1px solid #e8e3da;padding-top:10px;margin-top:10px;"></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:16px;color:#1a3a2a;font-weight:700;">Total Pago</td>
                  <td style="padding:6px 0;font-size:16px;color:#1a3a2a;font-weight:700;">R$ ${data.paidAmount.toFixed(2)}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
            Nos dias que antecedem o check-in, entraremos em contato pelo WhatsApp com as instruções de acesso, código do prédio e informações úteis sobre a região.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 24px;">
              <a href="${whatsappLink}" style="display:inline-block;background:#25d366;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                💬 Falar conosco pelo WhatsApp
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f5f3ef;padding:20px 40px;text-align:center;">
          <p style="font-size:12px;color:#999;margin:0;">
            Sua Casa Leblon — Hospedagem Premium em Leblon, Rio de Janeiro<br/>
            <a href="https://suacasaleblon.com" style="color:#1a3a2a;">suacasaleblon.com</a> · <a href="${whatsappLink}" style="color:#1a3a2a;">WhatsApp</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  try {
    const { data: result, error } = await resend.emails.send({
      from: 'Sua Casa Leblon <reservas@send.suacasaleblon.com>',
      to: data.guestEmail,
      subject: `Reserva Confirmada — ${data.propertyName || data.propertyCode} · ${formatDate(data.checkin)}`,
      html,
    })
    if (error) {
      console.error('Email send error:', error)
      return { ok: false, error: error.message }
    }
    console.log(`📧 Confirmation email sent to ${data.guestEmail} (id: ${result?.id})`)
    return { ok: true, id: result?.id }
  } catch (err: any) {
    console.error('Email send exception:', err)
    return { ok: false, error: err.message }
  }
}

export async function sendBookingNotificationToDiego(data: BookingEmailData) {
  try {
    await resend.emails.send({
      from: 'Sua Casa Leblon <sistema@send.suacasaleblon.com>',
      to: 'ditavares@gmail.com',
      subject: `💰 Nova Reserva Direta! ${data.guestName} — ${data.propertyCode}`,
      html: `
        <h2>Nova reserva pelo site!</h2>
        <p><strong>Hóspede:</strong> ${data.guestName} (${data.guestEmail})</p>        <p><strong>Apartamento:</strong> ${data.propertyCode}</p>
        <p><strong>Check-in:</strong> ${data.checkin} → <strong>Check-out:</strong> ${data.checkout}</p>
        <p><strong>Valor pago:</strong> R$ ${data.paidAmount.toFixed(2)} (${data.paymentMethod})</p>
        ${data.couponCode ? `<p><strong>Cupom:</strong> ${data.couponCode} (-R$${data.couponDiscount?.toFixed(2)})</p>` : ''}
      `,
    })
  } catch (err: any) {
    console.error('Diego notification email error:', err)
  }
}