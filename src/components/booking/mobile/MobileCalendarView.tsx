'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown } from "lucide-react";
import type { Service } from '@/types/booking';

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

interface MobileCalendarViewProps {
  weekDays: Date[];
  availableSlots: { [key: string]: TimeSlot[] };
  expandedDay: string | null;
  setExpandedDay: (day: string | null) => void;
  selectedStaff: Staff | null;
  selectedService: Service | null;
  handleTimeSelect: (day: Date, slot: TimeSlot) => void;
  loading: boolean;
}

interface TimeSlotGroupProps {
  slots: TimeSlot[];
  selectedStaff: Staff | null;
  handleTimeSelect: (day: Date, slot: TimeSlot) => void;
  date: Date;
  showAll?: boolean;
}

const TimeSlotGroup = ({ slots, selectedStaff, handleTimeSelect, date, showAll = false }: TimeSlotGroupProps) => {
  const displayedSlots = showAll ? slots : slots.slice(0, 6);

  return (
    <div className="mobile-day-content">
      {displayedSlots.map((slot) => {
        const isAvailable = selectedStaff 
          ? slot.availableStaff.some(s => s.id === selectedStaff.id)
          : slot.availableStaff.length > 0;

        return (
          <button
            key={slot.time}
            className={`
              mobile-time-slot
              ${isAvailable 
                ? 'hover:bg-black hover:text-white bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--foreground))]'
                : 'text-muted-foreground bg-muted cursor-not-allowed'
              }
            `}
            disabled={!isAvailable}
            onClick={() => handleTimeSelect(date, slot)}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
};

export default function MobileCalendarView({
  weekDays,
  availableSlots,
  expandedDay,
  setExpandedDay,
  selectedStaff,
  handleTimeSelect,
  loading
}: MobileCalendarViewProps) {
  const [expandedSlots, setExpandedSlots] = useState<{ [key: string]: boolean }>({});
  
  const getDayAvailability = (dayStr: string) => {
    const slots = availableSlots[dayStr] || [];
    if (selectedStaff) {
      return slots.some(slot => 
        slot.availableStaff.some(staff => staff.id === selectedStaff.id)
      );
    }
    return slots.length > 0;
  };

  return (
    <div className="mobile-calendar-wrapper">
{weekDays.map((day) => {
  const dayStr = format(day, 'yyyy-MM-dd');
  const slots = availableSlots[dayStr] || [];
  const hasAvailableSlots = getDayAvailability(dayStr);
  const isShowingMore = expandedSlots[dayStr];
  const isToday = format(new Date(), 'yyyy-MM-dd') === dayStr;
  const isPast = new Date(dayStr) < new Date(format(new Date(), 'yyyy-MM-dd'));
  const isDisabled = !hasAvailableSlots || isPast;

  return (
    <div 
      key={dayStr} 
      className={`
        border rounded-lg overflow-hidden mb-2
        ${isDisabled ? 'opacity-50' : ''}
        ${isToday ? 'border-primary' : 'border-border'}
      `}
    >
      <button
        onClick={() => setExpandedDay(expandedDay === dayStr ? null : dayStr)}
        className={`
          w-full mobile-day-header
          ${isDisabled ? 'cursor-not-allowed' : ''}
          ${isToday ? 'bg-accent/20' : ''}
        `}
        disabled={isDisabled}
      >
        <div className="font-medium">
          {format(day, 'EEEE d MMMM', { locale: fr })}
        </div>
        {!isDisabled && (
          <ChevronDown 
            className={`
              w-5 h-5 transition-transform duration-200
              ${expandedDay === dayStr ? 'rotate-180' : ''}
            `}
          />
        )}
      </button>
      
      {expandedDay === dayStr && hasAvailableSlots && (
        <div className="space-y-2">
          <TimeSlotGroup
            slots={slots}
            selectedStaff={selectedStaff}
            handleTimeSelect={handleTimeSelect}
            date={day}
            showAll={isShowingMore}
          />
          {slots.length > 6 && (
            <button
              onClick={() => setExpandedSlots(prev => ({
                ...prev,
                [dayStr]: !prev[dayStr]
              }))}
              className="w-full py-2 text-sm text-[hsl(var(--foreground))]"
            >
              {isShowingMore ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}
    </div>
  );
})}

      {!loading && weekDays.every(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return !getDayAvailability(dayStr);
      }) && (
        <div className="text-center py-4 text-muted-foreground">
          Aucune disponibilité cette semaine
        </div>
      )}
    </div>
  );
}