// src/hooks/useVacationPeriods.ts
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface VacationPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  type: 'business' | 'staff';
  entityId: string;
  title: string;
  description?: string;
}

export const useVacationPeriods = (entityIds: { businessId: string; staffId?: string }) => {
  const [businessVacations, setBusinessVacations] = useState<VacationPeriod[]>([]);
  const [staffVacations, setStaffVacations] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityIds.businessId) return;

    setLoading(true);
    setError(null);

    // Créer un query pour les vacances du business
    const businessQuery = query(
      collection(db, 'vacationPeriods'),
      where('entityId', '==', entityIds.businessId),
      where('type', '==', 'business')
    );

    // Créer un query pour les vacances du staff si un staffId est fourni
    const staffQuery = entityIds.staffId ? query(
      collection(db, 'vacationPeriods'),
      where('entityId', '==', entityIds.staffId),
      where('type', '==', 'staff')
    ) : null;

    const unsubscribes: (() => void)[] = [];

    // Observer les vacances du business
    const businessUnsubscribe = onSnapshot(businessQuery, (snapshot) => {
      const vacations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate()
      })) as VacationPeriod[];
      setBusinessVacations(vacations);
      setLoading(false);
    }, (error) => {
      console.error('Erreur lors de la récupération des vacances business:', error);
      setError('Erreur lors de la récupération des vacances');
      setLoading(false);
    });

    unsubscribes.push(businessUnsubscribe);

    // Observer les vacances du staff si un staffId est fourni
    if (staffQuery) {
      const staffUnsubscribe = onSnapshot(staffQuery, (snapshot) => {
        const vacations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().startDate.toDate(),
          endDate: doc.data().endDate.toDate()
        })) as VacationPeriod[];
        setStaffVacations(vacations);
      }, (error) => {
        console.error('Erreur lors de la récupération des vacances staff:', error);
        setError('Erreur lors de la récupération des vacances');
      });

      unsubscribes.push(staffUnsubscribe);
    } else {
      setStaffVacations([]);
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [entityIds.businessId, entityIds.staffId]);

  const isDateInVacation = (date: Date): boolean => {
    const checkDate = startOfDay(date);

    // Vérifier les vacances business
    const isInBusinessVacation = businessVacations.some(vacation => {
      return isWithinInterval(checkDate, {
        start: startOfDay(vacation.startDate),
        end: endOfDay(vacation.endDate)
      });
    });

    if (isInBusinessVacation) return true;

    // Vérifier les vacances staff si applicable
    if (staffVacations.length > 0) {
      const isInStaffVacation = staffVacations.some(vacation => {
        return isWithinInterval(checkDate, {
          start: startOfDay(vacation.startDate),
          end: endOfDay(vacation.endDate)
        });
      });

      if (isInStaffVacation) return true;
    }

    return false;
  };

  return {
    businessVacations,
    staffVacations,
    isDateInVacation,
    loading,
    error
  };
};