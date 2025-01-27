// src/lib/services/smsService.ts
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export class SMSService {
  private static formatPhoneNumber(phone: string): string {
    // Enlever tous les espaces et tirets
    const cleaned = phone.replace(/\s+|-/g, '');
    // Si le numéro ne commence pas par +33 ou 0033, ajouter 33 et enlever le 0 initial si présent
    if (!cleaned.startsWith('+33') && !cleaned.startsWith('0033')) {
      return cleaned.startsWith('0') ? `33${cleaned.slice(1)}` : `33${cleaned}`;
    }
    return cleaned;
  }

  public static async sendConfirmationSMS(appointmentId: string): Promise<void> {
    try {
      // Récupérer les données du rendez-vous
      const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
      
      if (!appointmentDoc.exists()) {
        throw new Error('Rendez-vous non trouvé');
      }

      const appointmentData = appointmentDoc.data();
      
      // Convertir les timestamps Firestore en Date
      const startDate = appointmentData.start.toDate();
      const dateStr = format(startDate, 'dd/MM/yyyy');
      const timeStr = format(startDate, 'HH:mm');

      // Extraire le prénom du clientName
      const firstName = appointmentData.clientName.split(' ')[0];

      // Formater le numéro de téléphone
      const formattedPhone = this.formatPhoneNumber(appointmentData.clientPhone);
      
      console.log('Données du SMS:');
      console.log('Numéro formaté:', formattedPhone);
      console.log('Prénom:', firstName);
      console.log('Date:', dateStr);
      console.log('Heure:', timeStr);
      console.log('Clé API:', process.env.NEXT_PUBLIC_TOPMESSAGE_API_KEY ? 'Présente' : 'Manquante');

      const headers = {
        'Content-Type': 'application/json',
        'X-TopMessage-Key': process.env.NEXT_PUBLIC_TOPMESSAGE_API_KEY || ''
      };

      console.log('Headers:', headers);

      const response = await fetch('https://api.topmessage.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-TopMessage-Key': process.env.NEXT_PUBLIC_TOPMESSAGE_API_KEY || '',
  },
  body: JSON.stringify({
    data: {  // Ajout de l'objet data ici
      from: "ADM",
      to: [formattedPhone],
      text: `Bonjour ${firstName},\nRDV le ${dateStr} à ${timeStr}\nLuckyWi`,
      channel: "SMS"
    }
  })
});

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur TopMessage:', errorData);
        throw new Error(`Erreur TopMessage: ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      console.log('Réponse TopMessage:', responseData);

    } catch (error) {
      console.error('Erreur détaillée:', error);
      throw error;
    }
  }
}