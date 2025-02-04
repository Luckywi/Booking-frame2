import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class EmailCancellationService {
  private static readonly MAIL_COLLECTION = 'contact@fl-ec.fr';

  public static async sendCancellationEmail(appointmentId: string): Promise<void> {
    try {
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      if (!appointmentDoc.exists()) throw new Error('Rendez-vous non trouvé');

      const appointmentData = appointmentDoc.data();
      
      const [businessDoc, serviceDoc, staffDoc] = await Promise.all([
        getDoc(doc(db, 'users', appointmentData.businessId)),
        getDoc(doc(db, 'services', appointmentData.serviceId)),
        getDoc(doc(db, 'staff', appointmentData.staffId))
      ]);

      const businessData = businessDoc.data();
      const businessName = businessData?.businessName || "l'entreprise";
      const firstName = appointmentData.clientName.split(' ')[0];
      const confirmationUrl = `https://booking-frame2.vercel.app/?id=${appointmentData.businessId}`;

      const emailData = {
        to: [appointmentData.clientEmail],
        message: {
          subject: `❌ Annulation de votre rendez-vous chez ${businessName}`,
          html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <style type="text/css">
        @media screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            padding: 10px !important;
          }
          .content {
            padding: 8px !important;
          }
          .button {
            width: 200px !important;
            margin: 0 auto !important;
            font-size: 10px !important;
            padding: 12px 20px !important;
          }
          .detail-row td {
            padding: 5px !important;
            font-size: 12px;
          }
          td {
            padding: 5px !important;
          }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#FFFFFF;">
      <div style="width:100%; min-height:100vh; background-color:#FFFFFF !important; margin:0; padding:0;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#FFFFFF" style="background-color:#FFFFFF !important;">
          <tr>
            <td align="center" style="padding: 20px 0; background-color:#FFFFFF;">
              <table role="presentation" class="container" border="0" cellspacing="0" cellpadding="0" width="600" style="background-color:#FFFFFF; margin:0 auto;">
                <tr>
                  <td style="background-color:#FFFFFF; padding:10px; text-align:center;">
                    <h1 style="margin:0; font-size:24px; line-height:1.5;">Rendez-vous annulé ❌</h1>
                    <p style="margin:0 0 20px; color:#000000;">Bonjour ${firstName},</p>
                    <p style="margin:0 0 20px; color:#000000; text-align:center;">Votre rendez-vous chez ${businessName} a bien été annulé.</p>
                  </td>
                </tr>
                <tr>
                  <td class="content" style="background-color:#FFFFFF; padding:10px;">

                    <!-- Bouton -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin:30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${confirmationUrl}" class="button" style="display:inline-block; padding:14px 30px; background-color:#000000; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:500;">
                            Réserver un nouveau rendez-vous
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-top:30px; border-top:1px solid #eeeeee;">
                      <tr>
                        <td style="padding:20px 0; text-align:center;">
                          <p style="margin:0; font-size:13px; color:#999999;">
                            Cet email est généré automatiquement.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>`,
          text: `
          Rendez-vous annulé ❌

          Bonjour ${firstName},

          Votre rendez-vous chez ${businessName} a bien été annulé.
          
          Vous pouvez à tout moment reprendre rendez-vous :
          ${confirmationUrl}`
        }
      };

      await addDoc(collection(db, this.MAIL_COLLECTION), emailData);
      console.log('Email d\'annulation envoyé avec succès');

    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email d\'annulation:', error);
      throw error;
    }
  }
}