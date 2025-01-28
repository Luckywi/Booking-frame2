// src/lib/services/smsService.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class SMSService {
  private static formatPhoneNumber(phone: string): string {
    return phone.replace(/\s/g, '').replace(/^0/, '33');
  }

  public static async sendConfirmationSMS(appointmentId: string): Promise<void> {
    try {
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      
      if (!appointmentDoc.exists()) {
        throw new Error('Rendez-vous non trouvé');
      }

      const appointmentData = appointmentDoc.data();
      const firstName = appointmentData.clientName.split(' ')[0];
      const formattedPhone = this.formatPhoneNumber(appointmentData.clientPhone);

      // Formatage de la date et de l'heure
      const appointmentDate = format(appointmentData.start.toDate(), 'EEEE d MMMM yyyy', { locale: fr });
      const appointmentTime = format(appointmentData.start.toDate(), 'HH:mm');

      // Construction du body en suivant exactement l'exemple cURL
      const requestBody = {
        "data": {
          "from": "ADM ",
          "to": [formattedPhone],
          "parameters": {
            [formattedPhone]: [firstName, appointmentDate, appointmentTime]
          },
          "text": "Bonjour {first_name} ! votre rendez-vous est confirmé pour le {appointmentDate} à {appointmentTime}. À bientôt !",
          "request_id": appointmentId,
          "shorten_URLs": true
        }
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.topmessage.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-topmessage-key': process.env.NEXT_PUBLIC_TOPMESSAGE_API_KEY || ''
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur API: ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      console.log('Succès:', responseData);
      return responseData;

    } catch (error) {
      console.error('Erreur détaillée:', error);
      throw error;
    }
  }
}