'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import ConfirmationPage from '@/components/booking/ConfirmationPage';
import { SMSService } from '@/lib/services/smsService';
import { EmailService } from '@/lib/services/emailService';
import {EmailAdminService} from '@/lib/services/emailAdminService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function Page() {
  const params = useParams();

  useEffect(() => {
    const sendSMS = async () => {
      if (!params.id) return;

      try {
        // 1. Vérifier le statut actuel
        const appointmentRef = doc(db, 'appointments', params.id as string);
        const appointmentDoc = await getDoc(appointmentRef);

        if (!appointmentDoc.exists()) {
          console.error('Rendez-vous non trouvé');
          return;
        }

        const appointmentData = appointmentDoc.data();

        // 2. Vérifier si le SMS a déjà été envoyé
        if (appointmentData.smsConfirmationSent) {
          console.log('SMS déjà envoyé');
          return;
        }

        // 3. Envoyer le SMS
        await SMSService.sendConfirmationSMS(params.id as string);

        // 4. Mettre à jour le statut
        await updateDoc(appointmentRef, {
          smsConfirmationSent: true
        });

        console.log('SMS envoyé et statut mis à jour');

      } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS:', error);
      }
    };

    sendSMS();
  }, [params.id]);


 // Email sending
 useEffect(() => {
  const sendEmailClient = async () => {
    if (!params.id) return;

    try {
      const appointmentRef = doc(db, 'appointments', params.id as string);
      const appointmentDoc = await getDoc(appointmentRef);

      if (!appointmentDoc.exists()) {
        console.error('Rendez-vous non trouvé');
        return;
      }

      const appointmentData = appointmentDoc.data();

        // 2. Vérifier si le MAIL a déjà été envoyé
        if (appointmentData.emailConfirmationSent) {
          console.log('MAIL déjà envoyé');
          return;
        }

      await EmailService.sendConfirmationEmail(params.id as string);
      console.log('Email de confirmation envoyé');

       // 4. Mettre à jour le statut
       await updateDoc(appointmentRef, {
        emailConfirmationSent: true
      });


    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  };

  sendEmailClient();
}, [params.id]);


useEffect(() => {
  const sendEmailAdmin = async () => {
    if (!params.id) return;

    try {
      const appointmentRef = doc(db, 'appointments', params.id as string);
      const appointmentDoc = await getDoc(appointmentRef);

      if (!appointmentDoc.exists()) {
        console.error('Rendez-vous non trouvé');
        return;
      }

      const appointmentData = appointmentDoc.data();

        // 2. Vérifier si le MAIL a déjà été envoyé
        if (appointmentData.emailAdminConfirmationSent) {
          console.log('MAIL ADMIN déjà envoyé');
          return;
        }

      await EmailAdminService.sendNewAppointmentEmail(params.id as string);
      console.log('Email de confirmation ADMIN envoyé');

       // 4. Mettre à jour le statut
       await updateDoc(appointmentRef, {
        emailAdminConfirmationSent: true
      });


    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  };

  sendEmailAdmin();
}, [params.id]);

return <ConfirmationPage />;
}