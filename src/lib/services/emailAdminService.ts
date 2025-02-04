import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class EmailAdminService {
  private static readonly MAIL_COLLECTION = 'contact@fl-ec.fr';

  public static async sendNewAppointmentEmail(appointmentId: string): Promise<void> {
    try {
      // Récupérer les données du rendez-vous
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      if (!appointmentDoc.exists()) throw new Error('Rendez-vous non trouvé');
      
      const appointmentData = appointmentDoc.data();
      
      // Récupérer l'email de l'admin à partir du businessId
      const businessDoc = await getDoc(doc(db, 'users', appointmentData.businessId));
      if (!businessDoc.exists()) throw new Error('Business non trouvé');
      
      const businessData = businessDoc.data();
      const adminEmail = businessData.email;
      const businessName = businessData.businessName || "l'entreprise";

      // Récupérer les détails du service et du staff
      const [serviceDoc, staffDoc] = await Promise.all([
        getDoc(doc(db, 'services', appointmentData.serviceId)),
        getDoc(doc(db, 'staff', appointmentData.staffId))
      ]);

      const serviceData = serviceDoc.data();
      const staffData = staffDoc.data();

      // Préparer les données de l'email
      const emailData = {
        to: [adminEmail],
        message: {
          subject: `🔔 Nouveau rendez-vous - ${businessName}`,
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
                        <td style="background-color:#FFFFFF; padding:20px; text-align:center;">
                          <h1 style="margin:0; font-size:24px; line-height:1.5;">Nouveau rendez-vous ! 📅</h1>
                        </td>
                      </tr>
                      <tr>
                        <td class="content" style="background-color:#FFFFFF; padding:20px;">
                          <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#f8f8f8; border-radius:8px; margin:20px 0;">
                            <tr>
                              <td style="padding:20px;">
                                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                  <!-- Client -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Client</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${appointmentData.clientName}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Service -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Service</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${serviceData?.title}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Date -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Date</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${format(appointmentData.start.toDate(), 'EEEE d MMMM yyyy', { locale: fr })}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Heure -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Heure</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${format(appointmentData.start.toDate(), 'HH:mm')}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Avec -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Avec</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${staffData?.firstName} ${staffData?.lastName}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Prix -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Prix</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${serviceData?.price}€</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Email client -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px; border-bottom:1px solid #eeeeee;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Email client</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${appointmentData.clientEmail}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                  <!-- Téléphone client -->
                                  <tr class="detail-row">
                                    <td style="padding:12px 20px;">
                                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td class="detail-label" style="color:#666666; font-weight:600; width:40%;">Téléphone client</td>
                                          <td class="detail-value" style="text-align:right; color:#000000; width:60%; word-wrap: break-word; word-break: break-all;">${appointmentData.clientPhone}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
          
                                </table>
                              </td>
                            </tr>
                          </table>
          
                          <!-- Bouton -->
                          <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin:30px 0;">
                            <tr>
                              <td align="center">
                                <a href="https://booking-admin-bfmq.vercel.app/login" class="button" style="display:inline-block; padding:14px 30px; background-color:#000000; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:500;">
                                  Gérer vos rendez-vous
                                </a>
                              </td>
                            </tr>
                          </table>
          
                          <!-- Footer -->
                          <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-top:30px; border-top:1px solid #eeeeee;">
                            <tr>
                              <td style="padding:20px 0; text-align:center;">
                                <p style="margin:0; font-size:13px; color:#999999;">
                                  Cet email est généré automatiquement. Pour modifier ou annuler ce rendez-vous, utilisez le bouton ci-dessus.
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
          Nouveau rendez-vous ! 📅
      
          Vous avez un nouveau rendez-vous pour ${businessName} !
      
          Détails du rendez-vous :
      
          Client : ${appointmentData.clientName}
          Service : ${serviceData?.title}
          Date : ${format(appointmentData.start.toDate(), 'EEEE d MMMM yyyy', { locale: fr })}
          Heure : ${format(appointmentData.start.toDate(), 'HH:mm')}
          Avec : ${staffData?.firstName} ${staffData?.lastName}
          Prix : ${serviceData?.price}€
          
          Contact client :
          Email : ${appointmentData.clientEmail}
          Téléphone : ${appointmentData.clientPhone}
      
          Gérer vos rendez-vous : https://booking-admin-bfmq.vercel.app/login
      
          Cet email est généré automatiquement.`
        }
      };

      // Envoyer l'email
      await addDoc(collection(db, this.MAIL_COLLECTION), emailData);
      console.log('Email admin envoyé avec succès');

    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email admin:', error);
      throw error;
    }
  }
}