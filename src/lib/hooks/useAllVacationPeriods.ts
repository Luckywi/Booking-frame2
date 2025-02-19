import { useState, useEffect, useCallback, useMemo } from 'react';
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

export const useAllVacationPeriods = (businessId: string, staffList: Array<{ id: string }>) => {
  const [businessVacations, setBusinessVacations] = useState<VacationPeriod[]>([]);
  const [allStaffVacations, setAllStaffVacations] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mémoriser les staffIds pour éviter les re-rendus inutiles
  const staffIds = useMemo(() => staffList.map(staff => staff.id), [staffList]);

  useEffect(() => {
    if (!businessId || staffIds.length === 0) return;

    setLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];

    // Query pour les vacances business
    const businessQuery = query(
      collection(db, 'vacationPeriods'),
      where('entityId', '==', businessId),
      where('type', '==', 'business')
    );

    // Query pour toutes les vacances staff
    const staffQuery = query(
      collection(db, 'vacationPeriods'),
      where('entityId', 'in', staffIds),
      where('type', '==', 'staff')
    );

    // Observer les vacances business
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

    // Observer les vacances staff
    const staffUnsubscribe = onSnapshot(staffQuery, (snapshot) => {
      const vacations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate()
      })) as VacationPeriod[];
      setAllStaffVacations(vacations);
    }, (error) => {
      console.error('Erreur lors de la récupération des vacances staff:', error);
      setError('Erreur lors de la récupération des vacances');
    });

    unsubscribes.push(staffUnsubscribe);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [businessId, staffIds]); // Utiliser staffIds au lieu de staffList

  // Mémoriser la fonction isStaffInVacation
  const isStaffInVacation = useCallback((date: Date, staffId: string): boolean => {
    const checkDate = startOfDay(date);

    // Vérifier les vacances business
    const isInBusinessVacation = businessVacations.some(vacation => 
      isWithinInterval(checkDate, {
        start: startOfDay(vacation.startDate),
        end: endOfDay(vacation.endDate)
      })
    );

    if (isInBusinessVacation) return true;

    // Vérifier les vacances du staff spécifique
    const staffVacations = allStaffVacations.filter(v => v.entityId === staffId);
    return staffVacations.some(vacation => 
      isWithinInterval(checkDate, {
        start: startOfDay(vacation.startDate),
        end: endOfDay(vacation.endDate)
      })
    );
  }, [businessVacations, allStaffVacations]);

  return {
    businessVacations,
    allStaffVacations,
    isStaffInVacation,
    loading,
    error
  };
};