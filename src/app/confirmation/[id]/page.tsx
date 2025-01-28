'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ConfirmationPage from '@/components/booking/ConfirmationPage';
import { SMSService } from '@/lib/services/smsService';

export default function Page() {
  const params = useParams();
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    const sendSMS = async () => {
      if (!smsSent && params.id) {
        try {
          await SMSService.sendConfirmationSMS(params.id as string);
          setSmsSent(true);
        } catch (error) {
          console.error('Erreur lors de l\'envoi du SMS:', error);
        }
      }
    };

    sendSMS();
  }, [params.id, smsSent]);

  return <ConfirmationPage />;
}