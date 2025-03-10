// Modifications à apporter au fichier src/components/booking/BookingWidget.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import type { Service, Staff } from '@/types/booking';
import DateStaffSelection from './DateStaffSelection';
import ClientForm from './ClientForm';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useIframeResize } from '@/lib/hooks/useIframeResize';

interface BookingWidgetProps {
  businessId: string;
}

interface ServiceCategory {
  id: string;
  title: string;
  order: number;
  businessId: string;
}

export default function BookingWidget({ businessId }: BookingWidgetProps) {
  const [step, setStep] = useState(1);
  const calculateHeight = useIframeResize();
  
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [selectedStaffMember, setSelectedStaffMember] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const router = useRouter();
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  // État pour suivre les catégories développées sur mobile
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
  // État pour détecter si on est sur mobile
  const [isMobile, setIsMobile] = useState(false);

  // Détecter l'affichage mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Fonction pour basculer l'état d'une catégorie (développée/réduite)
  // Cette version ferme automatiquement les autres catégories
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      // Créer un nouvel objet avec toutes les catégories fermées
      const allClosed = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as {[key: string]: boolean});
      
      // Bascule uniquement la catégorie cliquée
      return {
        ...allClosed,
        [categoryId]: !prev[categoryId]
      };
    });
    setTimeout(calculateHeight, 0);
  };

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
    window.parent.postMessage({ 
      type: 'pageChange',
      step: newStep 
    }, '*');
    setTimeout(calculateHeight, 0);
  };

  const formatDuration = (duration: { hours: number; minutes: number }) => {
    const parts = [];
    if (duration.hours > 0) {
      parts.push(`${duration.hours}h`);
    }
    if (duration.minutes > 0) {
      parts.push(`${duration.minutes}min`);
    }
    return parts.join(' ');
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'recalculateHeight') {
        calculateHeight();
      }
    };
  
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [calculateHeight]);
  

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    handleStepChange(2);
  };


  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setLoading(true);
        
        const [servicesSnapshot, categoriesSnapshot, staffSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'services'), where('businessId', '==', businessId))),
          getDocs(query(collection(db, 'serviceCategories'), where('businessId', '==', businessId))),
          getDocs(query(collection(db, 'staff'), where('businessId', '==', businessId)))
        ]);
        
        if (servicesSnapshot.empty) {
          setError('Business non trouvé ou aucun service disponible');
          return;
        }

        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Service[];

        const categoriesData = categoriesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            order: data.order,
            title: data.title,
            businessId: data.businessId
          } as ServiceCategory;
        }).sort((a, b) => a.order - b.order);

        const staffData = staffSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Staff[];

        setServices(servicesData);
        setServiceCategories(categoriesData);
        setStaffList(staffData);
        // Initialiser toutes les catégories comme réduites par défaut
        const initialExpandedState = categoriesData.reduce((acc, category) => {
          acc[category.id] = false;
          return acc;
        }, {} as {[key: string]: boolean});
        setExpandedCategories(initialExpandedState);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  if (loading) {
    return (
      <Card className="booking-container">
        <div className="loading-state">Chargement...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="booking-container">
        <div className="error-state">{error}</div>
      </Card>
    );
  }

  return (
    <Card className="booking-container">
      <div className="steps-nav">
        {[1, 2, 3].map((number) => (
          <div key={number} className="step-item">
            <div className={`step-number ${
              step >= number ? 'step-number-active' : 'step-number-inactive'
            }`}>
              {number}
            </div>
            <span className={`step-label ${
              step >= number ? 'step-label-active' : 'step-label-inactive'
            }`}>
              {number === 1 ? 'Service' : number === 2 ? 'Date' : 'Informations'}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4">
        {step === 1 && (
          <div className="service-list">
            <div className="section-header">
              <h2 className="section-title">Sélectionner un service</h2>
            </div>
            
            <div className="space-y-8">
              {serviceCategories.map((category) => (
                <div key={category.id} className="service-category">
                  {/* En-tête de catégorie cliquable sur mobile */}
                  <div 
                    className={`service-category-header ${isMobile ? 'cursor-pointer' : ''}`}
                    onClick={() => isMobile && toggleCategory(category.id)}
                  >
                    <h3 className="service-category-title flex justify-between items-center">
                      {category.title}
                      {isMobile && (
                        <span className="service-category-chevron">
                          {expandedCategories[category.id] ? 
                            <ChevronUp className="w-5 h-5" /> : 
                            <ChevronDown className="w-5 h-5" />
                          }
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Contenu de la catégorie (toujours visible sur desktop, conditionnellement visible sur mobile) */}
                  <div className={`space-y-3 ${isMobile && !expandedCategories[category.id] ? 'hidden' : 'block'}`}>
                    {services
                      .filter(service => service.categoryId === category.id)
                      .map((service) => (
                        <div
                          key={service.id}
                          onClick={() => handleServiceSelect(service)}
                          className={`service-card ${
                            selectedService?.id === service.id 
                              ? 'service-card-selected' 
                              : ''
                          }`}
                        >
                          <div className="service-card-content">
                            <div className="space-y-1.5">
                              <h4 className="service-title">{service.title}</h4>
                              <p className="service-description">{service.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="service-price">{service.price}€</p>
                              <p className="service-duration">
                                {formatDuration(service.duration)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="date-selector">
          {/* En-tête avec résumé du service */}
          <div className="section-header">
            <h2 className="section-title">Choisir la date et l'heure</h2>
            <button 
              onClick={() => handleStepChange(1)}
              className="back-button"
            >
              <ChevronLeft className="w-4 h-4" />
              Modifier le service
            </button>
          </div>        
            <DateStaffSelection
              key={`date-staff-${selectedService?.id}`}
              businessId={businessId}
              serviceId={selectedService?.id || ''}
              serviceDuration={selectedService?.duration || { hours: 0, minutes: 0 }}
              selectedService={selectedService}
              onSelect={(datetime, staffId) => {
                setSelectedDateTime(datetime);
                const staffMember = staffId 
                  ? staffList.find(s => s.id === staffId) || null 
                  : null;
                setSelectedStaffMember(staffMember);
                handleStepChange(3);
              }}
            />
          </div>
        )}

        {step === 3 && selectedService && selectedDateTime && selectedStaffMember && (
          <div className="client-form">
            <div className="section-header">
              <h2 className="section-title">Vos informations</h2>
              <button 
                onClick={() => handleStepChange(2)}
                className="back-button"
              >
                <ChevronLeft className="w-4 h-4" />
                Modifier la date
              </button>
            </div>
            <ClientForm
              service={selectedService}
              dateTime={selectedDateTime}
              staff={selectedStaffMember}
              onSubmit={async (clientData) => {
                try {
                  const endDateTime = new Date(selectedDateTime);
                  endDateTime.setHours(
                    endDateTime.getHours() + selectedService.duration.hours,
                    endDateTime.getMinutes() + selectedService.duration.minutes
                  );
              
                  const appointmentData = {
                    businessId: businessId,
                    staffId: selectedStaffMember.id,
                    serviceId: selectedService.id,
                    clientName: `${clientData.firstName} ${clientData.lastName}`,
                    clientEmail: clientData.email,
                    clientPhone: clientData.phone,
                    start: selectedDateTime,
                    end: endDateTime,
                    status: 'confirmed',
                    createdAt: new Date(),
                    notes: ''
                  };
              
                  const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
                  router.push(`/confirmation/${docRef.id}`);
                  
                } catch (error) {
                  console.error('Erreur lors de la création du rendez-vous:', error);
                }
              }}
              onBack={() => handleStepChange(2)}
            />
          </div>
        )}
      </div>
    </Card>
  );
}