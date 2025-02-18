// src/types/booking.ts
export interface Service {
    id: string;
    title: string;  // Changé de name à title pour correspondre à votre base de données
    description: string;
    price: number;
    duration: {
      hours: number;
      minutes: number;
    };
    categoryId: string;
    businessId: string;
  }
  
  export interface Staff {
    id: string;
    firstName: string;
    lastName: string;
    availability: {
      [date: string]: string[]; // Format "YYYY-MM-DD": ["HH:mm"]
    };
  }
  
  export interface BookingSlot {
    datetime: Date;
    staffId: string | null;
  }

  export interface VacationPeriod {
    id: string;
    startDate: Date;
    endDate: Date;
    title: string;
    description?: string;
    type: 'business' | 'staff';
    entityId: string; // businessId ou staffId selon le type
    createdAt: Date;
  }
  
  

  export interface Appointment {
    id: string;
    businessId: string;
    staffId: string;
    serviceId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    start: Date;
    end: Date;
    status: 'confirmed' | 'cancelled';
    createdAt: Date;
    smsConfirmationSent?: boolean;
    emailConfirmationSent?: boolean; 
    emailAdminConfirmationSent?:boolean;
  }

  export interface BreakPeriod {
    start: string;    // Format "HH:mm"
    end: string;      // Format "HH:mm"
    label?: string;   // Ex: "Pause déjeuner"
  }
  