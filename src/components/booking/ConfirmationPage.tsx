'use client';


import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Calendar, Check, AlertCircle, ChevronUp, ChevronDown, Clock, User2, Mail, Phone, CreditCard } from 'lucide-react';
import { useIframeResize } from '@/lib/hooks/useIframeResize';
import {EmailCancellationService} from '@/lib/services/emailCancellationService';
import {EmailAdminCancellationService} from '@/lib/services/emailAdminCancellationService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


interface AppointmentService {
  title: string;
  price: number;
}

interface AppointmentStaff {
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  start: Date;
  end: Date;
  createdAt: Date;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  status: 'confirmed' | 'cancelled';
  service: AppointmentService;
  staff: AppointmentStaff;
  smsConfirmationSent?: boolean;
  emailConfirmationSent?: boolean;
  emailAdminConfirmationSent?:boolean;  // Nouveau champ
}

export default function ConfirmationPage() {
  const params = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null); 
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const calculateHeight = useIframeResize();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // @ts-expect-error type
  const AppointmentDetail = ({ icon: Icon, label, value, highlight = false }) => (
    <div className="confirmation-details-row">
      <div className="icon-label-group">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className={`details-value ${highlight ? 'text-green-600' : ''}`}>
        {value}
      </span>
    </div>
  );
  

  const handleToggleAppointments = () => {
    setShowAllAppointments(prev => !prev);
    setTimeout(calculateHeight, 0);
  };

  // Effet pour le recalcul de hauteur
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'recalculateHeight') {
        calculateHeight();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [calculateHeight]);

  // Effet pour le signal initial de la page
  useEffect(() => {
    window.parent.postMessage({ 
      type: 'pageChange',
      step: 4 
    }, '*');
    setTimeout(calculateHeight, 0);
  }, []);

  const fetchAppointmentHistory = async (clientEmail: string, businessId: string) => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('clientEmail', '==', clientEmail),
        where('businessId', '==', businessId),
        where('status', 'in', ['confirmed', 'cancelled'])
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      
      const appointments = await Promise.all(
        querySnapshot.docs.map(async (appointmentDoc) => {
          const data = appointmentDoc.data();
          let serviceDetails;
          let staffDetails;

          try {
            const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
            serviceDetails = serviceDoc.exists() ? serviceDoc.data() : null;

            const staffDoc = await getDoc(doc(db, 'staff', data.staffId));
            staffDetails = staffDoc.exists() ? staffDoc.data() : null;
          } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
          }

          return {
            id: appointmentDoc.id,
            start: data.start.toDate(),
            end: data.end.toDate(),
            createdAt: data.createdAt.toDate(),
            clientEmail: data.clientEmail,
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            status: data.status,
            service: {
              title: serviceDetails?.title || 'Service inconnu',
              price: serviceDetails?.price || 0
            },
            staff: {
              firstName: staffDetails?.firstName || '',
              lastName: staffDetails?.lastName || ''
            }
          };
        })
      );

      return appointments
        .filter(apt => apt.id !== params.id)
        .sort((a, b) => b.start.getTime() - a.start.getTime());

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !isFuture(appointment.start)) return;

    try {
      setCancelLoading(true);
      await updateDoc(doc(db, 'appointments', appointment.id), {
        status: 'cancelled'
      });

      await EmailCancellationService.sendCancellationEmail(appointment.id);
      await EmailAdminCancellationService.sendAdminCancellationEmail(appointment.id);
      setAppointment(prev => prev ? {...prev, status: 'cancelled'} : null);
      setTimeout(calculateHeight, 0);
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      setError('Erreur lors de l\'annulation du rendez-vous');
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        const appointmentDoc = await getDoc(doc(db, 'appointments', params.id as string));
        
        if (!appointmentDoc.exists()) {
          setError('Rendez-vous non trouvé');
          return;
        }

        const data = appointmentDoc.data();
        setBusinessId(data.businessId);

        const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
        const serviceData = serviceDoc.data();

        const staffDoc = await getDoc(doc(db, 'staff', data.staffId));
        const staffData = staffDoc.data();

        const currentAppointment: Appointment = {
          id: appointmentDoc.id,
          start: data.start.toDate(),
          end: data.end.toDate(),
          createdAt: data.createdAt.toDate(),
          clientEmail: data.clientEmail,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          status: data.status,
          service: {
            title: serviceData?.title || 'Service inconnu',
            price: serviceData?.price || 0
          },
          staff: {
            firstName: staffData?.firstName || '',
            lastName: staffData?.lastName || ''
          }
        };
        
        setAppointment(currentAppointment);

        if (data.clientEmail && data.businessId) {
          const history = await fetchAppointmentHistory(data.clientEmail, data.businessId);
          setPastAppointments(history);
        }
      } catch (error) {
        console.error('Erreur:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
        setTimeout(calculateHeight, 0);
      }
    };

    fetchData();
  }, [params.id]);

  const isAppointmentCancellable = appointment?.status === 'confirmed' && isFuture(appointment.start);

  if (loading) {
    return (
      <div className="resa-container">
        <Card className="confirmation-content">
          <div className="loading-state">Chargement...</div>
        </Card>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="resa-container">
        <Card className="confirmation-content">
          <div className="error-state">
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              {error || 'Rendez-vous non trouvé'}
            </h1>
            <Link href="/">
              <Button>Retourner à l'accueil</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="resa-container">
      <Card className="confirmation-content">
        <div className="confirmation-header">
          {appointment.status === 'cancelled' ? (
            <>
              <div className="confirmation-icon-wrapper confirmation-icon-cancel">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="confirmation-title">Rendez-vous annulé</h1>
              <p className="confirmation-subtitle">Ce rendez-vous a été annulé</p>
              <Link href={`/?id=${businessId}`} className="mt-8 inline-block">
                <Button className="bg-black text-white hover:bg-gray-800 px-6">
                  Prendre un nouveau rendez-vous
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="confirmation-icon-wrapper confirmation-icon-success">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="confirmation-title">Réservation confirmée !</h1>
              <p className="confirmation-subtitle">
                Votre rendez-vous a été enregistré avec succès
              </p>
            </>
          )}
        </div>

        <div className="confirmation-details">
  <h2 className="confirmation-details-title">Détails de votre rendez-vous</h2>
  <AppointmentDetail 
    icon={Calendar} 
    label="Service" 
    value={appointment.service.title} 
  />
  <AppointmentDetail 
    icon={Calendar} 
    label="Date" 
    value={format(appointment.start, 'EEEE d MMMM yyyy', { locale: fr })} 
  />
  <AppointmentDetail 
    icon={Clock} 
    label="Heure" 
    value={format(appointment.start, 'HH:mm')} 
  />
  <AppointmentDetail 
    icon={User2} 
    label="Avec" 
    value={`${appointment.staff.firstName} ${appointment.staff.lastName}`} 
  />
  <AppointmentDetail 
    icon={CreditCard} 
    label="Prix" 
    value={`${appointment.service.price}€`} 
  />
  <AppointmentDetail 
    icon={User2} 
    label="Client" 
    value={appointment.clientName} 
  />
  <AppointmentDetail 
    icon={Mail} 
    label="Email" 
    value={appointment.clientEmail} 
  />
  <AppointmentDetail 
    icon={Phone} 
    label="Téléphone" 
    value={appointment.clientPhone} 
  />
  <AppointmentDetail 
    icon={Check} 
    label="Statut" 
    value={appointment.status === 'cancelled' ? 'Annulé' : 'Confirmé'} 
    highlight={appointment.status === 'confirmed'} 
  />
</div>


        
{isAppointmentCancellable && (
  <div className="confirmation-cancel-section">
    <AlertDialog 
  open={isDialogOpen} 
  onOpenChange={(open) => {
    setIsDialogOpen(open);
    if (!open) setCancelLoading(false); // Réinitialiser l'état de chargement si on ferme
  }}
>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          className="cancel-button"
          onClick={() => setIsDialogOpen(true)}
        >
          Annuler ce rendez-vous
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="alert-dialog-content">
        <AlertDialogHeader>
          <AlertDialogTitle className="alert-dialog-title">
            Annuler le rendez-vous ?
          </AlertDialogTitle>
          <AlertDialogDescription className="alert-dialog-description">
            Cette action ne peut pas être annulée.
            Êtes-vous sûr de vouloir annuler ce rendez-vous ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="alert-dialog-footer">
        <AlertDialogCancel 
  className="alert-dialog-cancel"
  onClick={() => setIsDialogOpen(false)} // Ajout de cet événement
>
  Non, garder
</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await handleCancelAppointment();
              setIsDialogOpen(false);
            }}
            disabled={cancelLoading}
            className="alert-dialog-confirm"
          >
            {cancelLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                <span>Annulation...</span>
              </div>
            ) : (
              "Oui, annuler"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)}
        {pastAppointments.length > 0 && (
          <div className="confirmation-history">
            <h2 className="confirmation-history-title">
              <Calendar className="w-5 h-5" />
              Historique de vos rendez-vous
            </h2>
            <div className="space-y-4">
              {(showAllAppointments ? pastAppointments : pastAppointments.slice(0, 2)).map((apt) => (
                <div key={apt.id} className="confirmation-history-item">
                  <div>
                    <p className="font-medium">{apt.service.title}</p>
                    <p className="text-sm text-gray-500">
                      {format(apt.start, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                    <p className="text-sm text-gray-500">
                      Avec {apt.staff.firstName} {apt.staff.lastName}
                    </p>
                  </div>
                  <div>
                    <span className={`status-badge ${
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {apt.status === 'cancelled' ? 'Annulé' : 'Effectué'}
                    </span>
                  </div>
                </div>
              ))}

              {pastAppointments.length > 2 && (
                <button 
                  onClick={handleToggleAppointments} 
                  className="view-more-button"
                >
                  <span>{showAllAppointments ? 'Voir moins' : 'Voir plus'}</span>
                  {showAllAppointments ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

{appointment.status === 'confirmed' && (
          <div className="px-8 py-6 text-center border-t border-[hsl(var(--border))]">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Un email de confirmation a été envoyé à {appointment.clientEmail}
            </p>
          </div>
        )}

        <div className="confirmation-actions">
          {appointment.status === 'confirmed' && (
            <Link href={`/?id=${businessId}`}>
              <Button variant="outline">
                Réserver un autre rendez-vous
              </Button>
            </Link>
          )}
          <Button
            onClick={() => window.print()}
            variant="outline"
          >
            Imprimer
          </Button>
        </div>
      </Card>
    </div>
  );
}
