'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Service, BreakPeriod } from '@/types/booking';
import MobileCalendarView from './mobile/MobileCalendarView';
import { useAllVacationPeriods } from '@/lib/hooks/useAllVacationPeriods';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  businessId: string;
}

interface TimeSlot {
  time: string;
  availableStaff: Staff[];
}

interface DateStaffSelectionProps {
  businessId: string;
  serviceId: string;
  serviceDuration: { hours: number; minutes: number };
  selectedService: Service | null;
  onSelect: (datetime: Date, staffId?: string) => void;
}

interface BusinessHours {
  hours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
      breakPeriods?: BreakPeriod[];
    };
  };
}

interface StaffHours {
  hours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
      breakPeriods?: BreakPeriod[];
    };
  };
}

const isPastTime = (date: Date, time: string): boolean => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const timeDate = new Date(date);
  timeDate.setHours(hours, minutes, 0, 0);
  return timeDate < now;
};

const hasAvailableSlotsInWeek = (slots: { [key: string]: TimeSlot[] }): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return Object.entries(slots).some(([dateStr, daySlots]) => {
    const slotDate = new Date(dateStr);
    // Ne vérifier que les créneaux à partir d'aujourd'hui
    return slotDate >= today && daySlots.length > 0;
  });
};

const isPastWeek = (date: Date): boolean => {
  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  return date < today;
};

export default function DateStaffSelection({ 
  businessId, 
  serviceId,
  serviceDuration,
  selectedService,
  onSelect 
}: DateStaffSelectionProps) {
  const isInitialized = useRef(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const { isStaffInVacation } = useAllVacationPeriods(businessId, staff);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
  });
  const [availableSlots, setAvailableSlots] = useState<{ [key: string]: TimeSlot[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [staffHoursMap, setStaffHoursMap] = useState<{ [key: string]: StaffHours }>({});
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const weekDays = [...Array(7)].map((_, index) => addDays(weekStart, index));

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


  // Effet pour le chargement initial des données
  useEffect(() => {
    const loadData = async () => {
      if (!businessId) return;

      try {
        setLoading(true);
        setError(null);
        
        // Chargement parallèle des données avec gestion d'erreur appropriée
        const [staffResponse, businessHoursDoc, appointmentsResponse] = await Promise.all([
          getDocs(query(collection(db, 'staff'), where('businessId', '==', businessId))),
          getDoc(doc(db, 'businessHours', businessId)),
          getDocs(query(collection(db, 'appointments'), where('businessId', '==', businessId)))
        ]).catch(error => {
          throw new Error(`Erreur lors du chargement des données: ${error.message}`);
        });

        const staffData = staffResponse.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Staff[];

        if (staffData.length === 0) {
          throw new Error('Aucun personnel disponible');
        }

        const businessHoursData = businessHoursDoc.exists() ? businessHoursDoc.data() as BusinessHours : null;
        if (!businessHoursData) {
          throw new Error('Horaires non configurés');
        }

        setStaff(staffData);
        setBusinessHours(businessHoursData);
        setAppointments(appointmentsResponse.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

        // Chargement des horaires du personnel
        const hoursMap: { [key: string]: StaffHours } = {};
        await Promise.all(
          staffData.map(async (staffMember) => {
            const staffHoursDoc = await getDoc(doc(db, 'staffHours', staffMember.id));
            if (staffHoursDoc.exists()) {
              hoursMap[staffMember.id] = staffHoursDoc.data() as StaffHours;
            }
          })
        );
        setStaffHoursMap(hoursMap);
        setSelectedStaff(null);
        isInitialized.current = true;

      } catch (error) {
        console.error('Erreur:', error);
        setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [businessId]);

  const checkTimeSlotAvailability = (
    currentTime: Date,
    slotEndTime: Date,
    staffToCheck: Staff[],
    date: Date
  ): Staff[] => {

    const dateStr = format(date, 'yyyy-MM-dd');
    const timeString = format(currentTime, 'HH:mm');
    const endTimeString = format(slotEndTime, 'HH:mm');
    
    return staffToCheck.filter(staffMember => {
      // Vérifier les vacances pour ce staff spécifique
      if (isStaffInVacation(date, staffMember.id)) {
        return false;
      }
  

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[date.getDay()];
  
      // Vérification des horaires business
      const businessDay = businessHours?.hours[dayName];
      if (businessDay?.breakPeriods?.length) {
        const isInBusinessBreak = businessDay.breakPeriods.some(period => {
          return (
            (timeString >= period.start && timeString < period.end) ||
            (endTimeString > period.start && endTimeString <= period.end) ||
            (timeString <= period.start && endTimeString >= period.end)
          );
        });
        if (isInBusinessBreak) return false;
      }
  
      // Vérification des horaires staff
      const staffHours = staffHoursMap[staffMember.id]?.hours?.[dayName];
      if (!staffHours?.isOpen) return false;
  
      // Vérification des pauses du staff
      if (staffHours.breakPeriods?.length) {
        const isInStaffBreak = staffHours.breakPeriods.some(period => {
          return (
            (timeString >= period.start && timeString < period.end) ||
            (endTimeString > period.start && endTimeString <= period.end) ||
            (timeString <= period.start && endTimeString >= period.end)
          );
        });
        if (isInStaffBreak) return false;
      }
  
      const [openHour, openMinute] = staffHours.openTime.split(':').map(Number);
      const [closeHour, closeMinute] = staffHours.closeTime.split(':').map(Number);
      const staffStartTime = new Date(date);
      staffStartTime.setHours(openHour, openMinute, 0, 0);
      const staffEndTime = new Date(date);
      staffEndTime.setHours(closeHour, closeMinute, 0, 0);
  
      if (currentTime < staffStartTime || slotEndTime > staffEndTime) {
        return false;
      }
  
      const staffAppointments = appointments.filter(apt => 
        apt.staffId === staffMember.id &&
        apt.status !== 'cancelled' &&
        format(apt.start.toDate(), 'yyyy-MM-dd') === dateStr
      );
  
      return !staffAppointments.some(apt => {
        const appointmentStart = apt.start.toDate();
        const appointmentEnd = apt.end.toDate();
        return (currentTime < appointmentEnd && slotEndTime > appointmentStart);
      });
    });
  };

  const fetchDaySlots = async (date: Date) => {
    if (!businessHours || !staff.length) return [];

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[date.getDay()];
    const businessDay = businessHours.hours[dayName];

    if (!businessDay?.isOpen) return [];

    const slots: TimeSlot[] = [];
    const [openHour, openMinute] = businessDay.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = businessDay.closeTime.split(':').map(Number);
    const serviceDurationMinutes = (serviceDuration?.hours || 0) * 60 + (serviceDuration?.minutes || 0);

    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMinute, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    while (currentTime <= endTime) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + serviceDurationMinutes);
      
      if (slotEndTime > endTime) break;

      const timeString = format(currentTime, 'HH:mm');
      
      if (!isPastTime(date, timeString)) {
        const availableStaffForSlot = selectedStaff 
          ? checkTimeSlotAvailability(currentTime, slotEndTime, [selectedStaff], date)
          : checkTimeSlotAvailability(currentTime, slotEndTime, staff, date);

        if (availableStaffForSlot.length > 0) {
          slots.push({
            time: timeString,
            availableStaff: availableStaffForSlot
          });
        }
      }

      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    return slots;
  };

  const fetchAvailability = async (startDate: Date) => {
    if (!businessHours || !staff.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      setWeekStart(startDate);
      let consecutiveUnavailableWeeks = 0;
      let hasCheckedCurrentWeek = false;
      let currentCheck = startDate;
  
      // Vérifier jusqu'à 8 semaines à partir de la date de début
      for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
        const weekSlots: { [key: string]: TimeSlot[] } = {};
        
        // Vérifier les jours de la semaine courante
        for (const day of [...Array(7)].map((_, index) => addDays(currentCheck, index))) {
          const dayStr = format(day, 'yyyy-MM-dd');
          weekSlots[dayStr] = await fetchDaySlots(day);
        }
  
        if (!hasCheckedCurrentWeek) {
          // Pour la première semaine (semaine courante), on met à jour l'affichage
          setAvailableSlots(weekSlots);
          hasCheckedCurrentWeek = true;
        }
  
        if (!hasAvailableSlotsInWeek(weekSlots)) {
          consecutiveUnavailableWeeks++;
        } else {
          // Si on trouve une semaine avec des disponibilités, on arrête de chercher
          break;
        }
  
        currentCheck = addDays(currentCheck, 7);
      }
  
      // Définir le message d'erreur approprié
      if (consecutiveUnavailableWeeks > 0) {
        if (consecutiveUnavailableWeeks === 1) {
          setError('Aucun créneau disponible cette semaine');
        } else if (consecutiveUnavailableWeeks === 8) {
          setError('Aucun créneau disponible dans les 8 prochaines semaines. Veuillez nous contacter directement pour plus d informations.');
        } else {
          setError(`Aucun créneau disponible les ${consecutiveUnavailableWeeks} prochaines semaines`);
        }
      } else {
        setError(null);
      }
  
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
      setError('Erreur lors du chargement des disponibilités');
    } finally {
      setLoading(false);
    }
  };


  // Effet unifié pour la mise à jour des disponibilités
  useEffect(() => {
    if (!businessHours || !staff.length || !isInitialized.current) return;
    fetchAvailability(weekStart);
  }, [
    weekStart,
    selectedStaff,
    businessHours,
    staff,
    serviceDuration,
    appointments,
    staffHoursMap,
    isStaffInVacation,
  ]);

  const handleTimeSelect = (date: Date, slot: TimeSlot) => {
    if (!slot.availableStaff.length) return;
  
    const [hours, minutes] = slot.time.split(':').map(Number);
    const selectedDate = new Date(date);
    selectedDate.setHours(hours, minutes, 0, 0);
  
    if (selectedStaff) {
      // Si un staff est déjà sélectionné 
      onSelect(selectedDate, selectedStaff.id);
    } else {
      // Les staffs dans slot.availableStaff sont déjà filtrés et disponibles
      const randomStaff = slot.availableStaff[
        Math.floor(Math.random() * slot.availableStaff.length)
      ];
      onSelect(selectedDate, randomStaff.id);
    }
  };

  return (
    <div className="date-selector">
      {/* En-tête avec résumé du service */}
      <div className="staff-selector">
  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
    <div className="space-y-1">
      <h3 className="summary-title">{selectedService?.title}</h3>
      <p className="summary-content">
        {formatDuration(serviceDuration)} - {selectedService?.price}€
      </p>
    </div>
    <div className="w-full lg:w-auto">
      <Select 
        defaultValue="no_preference"
        value={selectedStaff?.id || "no_preference"}
        onValueChange={(value) => {
          if (value === "no_preference") {
            setSelectedStaff(null);
          } else {
            const selected = staff.find(s => s.id === value);
            setSelectedStaff(selected || null);
          }
        }}
      >
        <SelectTrigger className="w-full lg:w-48 text-[hsl(var(--foreground))] bg-[hsl(var(--background))]">
          <SelectValue placeholder="Avec qui ?" className="text-[hsl(var(--foreground))]">
            {selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : "Avec qui ?"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[hsl(var(--background))] border-[hsl(var(--border))]">
          <SelectItem value="no_preference" className="text-[hsl(var(--foreground))]">
            Sans préférence
          </SelectItem>
          {staff.map((member) => (
            <SelectItem 
              key={member.id} 
              value={member.id} 
              className="text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
            >
              {member.firstName} {member.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</div>

      {/* Navigation commune */}
      <div className="calendar-navigation mb-4">
      <button
  onClick={() => {
    const newWeekStart = addDays(weekStart, -7);
    if (!isPastWeek(newWeekStart)) {
      setWeekStart(newWeekStart);
    }
  }}
  // Désactiver le bouton si la semaine précédente est dans le passé
  disabled={isPastWeek(addDays(weekStart, -7))}
  className={`nav-button text-[hsl(var(--foreground))] ${
    isPastWeek(addDays(weekStart, -7)) ? 'opacity-50 cursor-not-allowed' : ''
  }`}
>
  <ChevronLeft className="w-4 h-4" />
</button>
        <div className="text-sm font-medium text-[hsl(var(--foreground))]">
          {format(weekStart, 'd MMM', { locale: fr })} - {format(addDays(weekStart, 6), 'd MMM', { locale: fr })}
        </div>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="nav-button text-[hsl(var(--foreground))]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Vue Mobile */}
      <div className="block lg:hidden">
        <MobileCalendarView
          weekDays={weekDays}
          availableSlots={availableSlots}
          expandedDay={expandedDay}
          setExpandedDay={setExpandedDay}
          selectedStaff={selectedStaff}
          selectedService={selectedService}
          handleTimeSelect={handleTimeSelect}
          loading={loading}
        />
      </div>

      {/* Vue Desktop */}
      <div className="hidden lg:block">
        <div className="calendar-container">
          <div className="calendar-header">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="calendar-day">
                <div className="font-medium text-sm text-[hsl(var(--foreground))]">
                  {format(day, 'EEEE', { locale: fr })}
                </div>
                <div className="font-medium text-sm text-[hsl(var(--foreground))]">
                  {format(day, 'd', { locale: fr })}
                  <span className="ml-1">
                    {format(day, 'MMM', { locale: fr })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="time-slots-grid">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const slots = availableSlots[dayStr] || [];

              return (
                <div key={dayStr} className="time-slot-column">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      className={`
                        w-full py-2 px-3 mb-2 text-sm rounded-md
                        transition-all duration-200 font-medium
                        ${selectedStaff 
                          ? slot.availableStaff.some(s => s.id === selectedStaff.id)
                            ? 'hover:bg-black hover:text-white bg-transparent text-[hsl(var(--foreground))] border border-[hsl(var(--foreground))]'
                            : 'text-muted-foreground bg-muted cursor-not-allowed'
                          : slot.availableStaff.length > 0
                            ? 'hover:bg-black hover:text-white bg-transparent text-[hsl(var(--foreground))] border border-[hsl(var(--foreground))]'
                            : 'text-muted-foreground bg-muted cursor-not-allowed'
                        }
                      `}
                      disabled={selectedStaff 
                        ? !slot.availableStaff.some(s => s.id === selectedStaff.id)
                        : slot.availableStaff.length === 0
                      }
                      onClick={() => handleTimeSelect(day, slot)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          Chargement des disponibilités...
        </div>
      )}

{!loading && Object.values(availableSlots).every(slots => slots.length === 0) && (
  <div className="empty-state">
    {error}
  </div>
)}
    </div>
  );
}