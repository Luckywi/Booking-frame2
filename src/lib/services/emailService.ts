import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class EmailService {
  private static readonly MAIL_COLLECTION = 'contact@fl-ec.fr';

  public static async sendConfirmationEmail(appointmentId: string): Promise<void> {
    try {
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      if (!appointmentDoc.exists()) throw new Error('Rendez-vous non trouvé');

      const appointmentData = appointmentDoc.data();
      if (appointmentData.emailConfirmationSent) {
        console.log('Email déjà envoyé');
        return;
      }
      
      const [businessDoc, serviceDoc, staffDoc] = await Promise.all([
        getDoc(doc(db, 'users', appointmentData.businessId)),
        getDoc(doc(db, 'services', appointmentData.serviceId)),
        getDoc(doc(db, 'staff', appointmentData.staffId))
      ]);

      const businessData = businessDoc.data();
      const serviceData = serviceDoc.data();
      const staffData = staffDoc.data();
      const businessName = businessData?.businessName || "l'entreprise";
      const firstName = appointmentData.clientName.split(' ')[0];
      const confirmationUrl = `https://booking-frame2.vercel.app/confirmation/${appointmentId}`;

      const emailData = {
        to: [appointmentData.clientEmail],
        message: {
          subject: `🗓️ Confirmation de votre rendez-vous chez ${businessName}`,
          html: `
       <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
              padding: 15px !important;
            }
            .button {
              width: 200px !important;
              margin: 0 auto !important;
              font-size: 14px !important;
              padding: 12px 20px !important;
            }
            .detail-row td {
              padding: 10px 15px !important;
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
                    <td style="background-color:#FFFFFF; padding:20px; text-align:center;">
                      <h1 style="margin:0; font-size:24px; line-height:1.5;">Réservation confirmée ✨</h1>
                    </td>
                  </tr>
                  <tr>
                    <td class="content" style="background-color:#FFFFFF; padding:40px;">
                      <p style="margin:0 0 20px; color:#000000;">Bonjour ${firstName},</p>
                      <p style="margin:0 0 20px; color:#000000;">Votre rendez-vous chez ${businessName} est confirmé !</p>
       
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#f8f8f8; border-radius:8px; margin:20px 0;">
                        <tr>
                          <td style="padding:20px;">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                              <tr class="detail-row">
                                <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                      <td style="color:#666666; font-weight:600;">Service</td>
                                      <td style="text-align:right; color:#000000;">${serviceData?.title}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr class="detail-row">
                                <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                      <td style="color:#666666; font-weight:600;">Date</td>
                                      <td style="text-align:right; color:#000000;">${format(appointmentData.start.toDate(), 'EEEE d MMMM yyyy', { locale: fr })}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr class="detail-row">
                                <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                      <td style="color:#666666; font-weight:600;">Heure</td>
                                      <td style="text-align:right; color:#000000;">${format(appointmentData.start.toDate(), 'HH:mm')}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr class="detail-row">
                                <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                      <td style="color:#666666; font-weight:600;">Avec</td>
                                      <td style="text-align:right; color:#000000;">${staffData?.firstName} ${staffData?.lastName}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr class="detail-row">
                                <td style="padding:12px 20px;">
                                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                      <td style="color:#666666; font-weight:600;">Prix</td>
                                      <td style="text-align:right; color:#000000;">${serviceData?.price}€</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
       
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin:30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${confirmationUrl}" class="button" style="display:inline-block; padding:14px 30px; background-color:#000000; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:500;">
                              Voir ma réservation
                            </a>
                          </td>
                        </tr>
                      </table>
       
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-top:30px; border-top:1px solid #eeeeee;">
                        <tr>
                          <td style="padding:20px 0; text-align:center;">
                            <p style="margin:0 0 10px; color:#666666;">À bientôt chez ${businessName} !</p>
                            <p style="margin:0; font-size:13px; color:#999999;">
                              Si vous souhaitez modifier ou annuler votre rendez-vous, cliquez sur le bouton ci-dessus ou contactez-nous directement.
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
       </html>
          `,
          text: `
       Réservation confirmée ✨
       
       Bonjour ${firstName},
       
       Votre rendez-vous chez ${businessName} a été confirmé avec les détails suivants :
       
       Service : ${serviceData?.title}
       Date : ${format(appointmentData.start.toDate(), 'EEEE d MMMM yyyy', { locale: fr })}
       Heure : ${format(appointmentData.start.toDate(), 'HH:mm')}
       Avec : ${staffData?.firstName} ${staffData?.lastName}
       Prix : ${serviceData?.price}€
       
       Pour voir votre réservation : ${confirmationUrl}
       
       À bientôt chez ${businessName} !`
        }
       };

      await addDoc(collection(db, this.MAIL_COLLECTION), emailData);
      await updateDoc(doc(db, 'appointments', appointmentId), {
        emailConfirmationSent: true
      });

      console.log('Email de confirmation envoyé et statut mis à jour');

    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw error;
    }
  }
}