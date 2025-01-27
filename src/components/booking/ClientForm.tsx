'use client';

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Service, Staff } from '@/types/booking';

interface ClientFormProps {
  service: Service;
  dateTime: Date;
  staff: Staff;
  onSubmit: (clientData: ClientFormData) => Promise<void>;
  onBack: () => void;
}

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function ClientForm({ service, dateTime, staff, onSubmit, onBack }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setError('Une erreur est survenue lors de la création du rendez-vous');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="client-form">
      {/* Résumé de la réservation */}
      <div className="booking-summary">
        <h3 className="summary-title">Résumé de votre réservation</h3>
        <div className="summary-content">
          <p>{service.title} - {service.price}€</p>
          <p>Le {format(dateTime, 'EEEE d MMMM yyyy', { locale: fr })} à {format(dateTime, 'HH:mm')}</p>
          <p>Avec {staff.firstName} {staff.lastName}</p>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-2 mb-4">
          {error}
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="form-group">
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Prénom</label>
            <Input
              className="form-label"
              required
              disabled={isSubmitting}
              value={formData.firstName}
              onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Nom</label>
            <Input
              className="form-label"
              required
              disabled={isSubmitting}
              value={formData.lastName}
              onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Email</label>
          <Input
            className="form-label"
            type="email"
            required
            disabled={isSubmitting}
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Téléphone</label>
          <Input
            className="form-label"
            type="tel"
            required
            disabled={isSubmitting}
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>

        <div className="form-actions">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            className="back-button"
            disabled={isSubmitting}
          >
            Retour
          </Button>
          <Button 
            type="submit"
            variant="outline" 
            className="back-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'En cours...' : 'Confirmer la réservation'}
          </Button>
        </div>
      </form>
    </div>
  );
}