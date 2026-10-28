import React, { useState } from 'react';
import { createBooking } from '../api/bookings';
import { formatINR } from '../utils/formatCurrency';

// --- Utility helpers ---
const getDiffNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const STATUS_BADGE = {
  confirmed: 'bg-success-subtle text-success border border-success-subtle',
  'checked-in': 'bg-info-subtle text-info border border-info-subtle',
  'checked-out': 'bg-secondary-subtle text-secondary border border-secondary-subtle',
  cancelled: 'bg-danger-subtle text-danger border border-danger-subtle'
};

// --- Sub-step: Review & Confirm ---
const ReviewStep = ({ room, checkIn, checkOut, guests, nights, total, onBack, onConfirm, submitting, error }) => (
  <div>
    <div className="rounded-3 overflow-hidden border mb-4">
      <img
        src={room.image}
        alt={room.title}
        className="w-100"
        style={{ maxHeight: '180px', objectFit: 'cover' }}
      />
    </div>

    <h6 className="fw-bold font-serif mb-1">{room.title}</h6>
    <span className="badge bg-secondary-subtle text-secondary-emphasis mb-3">{room.category}</span>

    <div className="row g-2 mb-3 text-sm">
      <div className="col-6">
        <div className="p-2 border rounded text-center">
          <small className="text-muted d-block">CHECK-IN</small>
          <strong className="small">{formatDate(checkIn)}</strong>
        </div>
      </div>
      <div className="col-6">
        <div className="p-2 border rounded text-center">
          <small className="text-muted d-block">CHECK-OUT</small>
          <strong className="small">{formatDate(checkOut)}</strong>
        </div>
      </div>
    </div>

    <div className="bg-light rounded-3 p-3 mb-4">
      <div className="d-flex justify-content-between small text-muted mb-1">
        <span><i className="bi bi-moon-stars me-1"></i>{nights} night{nights !== 1 ? 's' : ''}</span>
        <span>{formatINR(room.price)} × {nights}</span>
      </div>
      <div className="d-flex justify-content-between small text-muted mb-1">
        <span><i className="bi bi-people me-1"></i>Guests</span>
        <span>{guests}</span>
      </div>
      <hr className="my-2" />
      <div className="d-flex justify-content-between fw-bold">
        <span>Total</span>
        <span className="fs-5">{formatINR(total)}</span>
      </div>
      <small className="text-muted d-block mt-1">
        <i className="bi bi-info-circle me-1"></i>Payment collected at check-in
      </small>
    </div>

    {error && (
      <div className="alert alert-danger py-2 px-3 small d-flex align-items-start gap-2 mb-3" role="alert">
        <i className="bi bi-exclamation-triangle-fill mt-1 flex-shrink-0"></i>
        <span>{error}</span>
      </div>
    )}

    <div className="d-flex gap-2">
      <button
        type="button"
        className="btn btn-outline-secondary flex-fill"
        onClick={onBack}
        disabled={submitting}
      >
        <i className="bi bi-arrow-left me-1"></i> Back
      </button>
      <button
        type="button"
        className="btn btn-hotelpro-gold flex-fill fw-semibold d-flex align-items-center justify-content-center gap-2"
        onClick={onConfirm}
        disabled={submitting}
      >
        {submitting && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
        <span>Confirm Booking</span>
      </button>
    </div>
  </div>
);

// --- Sub-step: Confirmed Receipt ---
const ConfirmationStep = ({ booking, onClose }) => (
  <div className="text-center py-2">
    <div className="mb-3">
      <span
        className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success"
        style={{ width: 64, height: 64, fontSize: '2rem' }}
      >
        <i className="bi bi-check2-circle"></i>
      </span>
    </div>
    <h5 className="fw-bold font-serif mb-1">Reservation Confirmed!</h5>
    <p className="text-muted small mb-3">
      Your stay at <strong>{booking.room?.title}</strong> has been reserved.
    </p>

    <div className="bg-light rounded-3 p-3 mb-4 text-start">
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">Confirmation ID</span>
        <span className="fw-semibold text-truncate ms-2" style={{ maxWidth: '160px' }}>
          #{booking._id?.slice(-8).toUpperCase()}
        </span>
      </div>
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">Check-In</span>
        <strong>{formatDate(booking.checkIn)}</strong>
      </div>
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">Check-Out</span>
        <strong>{formatDate(booking.checkOut)}</strong>
      </div>
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">Guests</span>
        <strong>{booking.guests}</strong>
      </div>
      <div className="d-flex justify-content-between small">
        <span className="text-muted">Total</span>
        <strong>{formatINR(booking.totalAmount)}</strong>
      </div>
    </div>

    <button className="btn btn-dark w-100 rounded-pill" onClick={onClose}>
      Done
    </button>
  </div>
);

// --- Main BookingModal ---
const BookingModal = ({ room, initialCheckIn = '', initialCheckOut = '', initialGuests = 2, isOpen, onClose }) => {
  const [step, setStep] = useState('form'); // 'form' | 'review' | 'confirmed'
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [specialRequests, setSpecialRequests] = useState('');
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  if (!isOpen || !room) return null;

  const nights = getDiffNights(checkIn, checkOut);
  const total = nights * (room.price || 0);
  const roomCapacity = typeof room.capacity === 'number' ? room.capacity : 4;

  const today = new Date().toISOString().split('T')[0];

  const handleFormNext = (e) => {
    e.preventDefault();
    setFormError('');

    if (!checkIn || !checkOut) {
      setFormError('Please select both check-in and check-out dates.');
      return;
    }
    if (new Date(checkIn) < new Date(today)) {
      setFormError('Check-in date cannot be in the past.');
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      setFormError('Check-out date must be after check-in date.');
      return;
    }
    if (nights < 1) {
      setFormError('Reservation must be for at least 1 night.');
      return;
    }
    if (guests < 1 || guests > roomCapacity) {
      setFormError(`Guests must be between 1 and ${roomCapacity} (room capacity).`);
      return;
    }

    setStep('review');
  };

  const handleConfirm = async () => {
    setSubmitError('');
    setSubmitting(true);

    try {
      const res = await createBooking({
        roomId: room._id || room.id,
        checkIn,
        checkOut,
        guests,
        specialRequests
      });
      setConfirmedBooking(res.data.booking);
      setStep('confirmed');
    } catch (err) {
      const msg = err.response?.data?.error || 'Booking failed. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormError('');
    setSubmitError('');
    setConfirmedBooking(null);
    onClose();
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-dark text-white border-0 px-4 py-3">
            <div>
              <h5 className="modal-title fw-bold font-serif mb-0">
                {step === 'confirmed' ? 'Booking Confirmed' : 'Reserve Your Suite'}
              </h5>
              {step === 'form' && (
                <p className="text-white-50 small mb-0">{room.title}</p>
              )}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            {step === 'form' && (
              <form onSubmit={handleFormNext}>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold text-secondary">
                      <i className="bi bi-calendar-event me-1"></i>CHECK-IN
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={checkIn}
                      min={today}
                      onChange={(e) => { setCheckIn(e.target.value); setFormError(''); }}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold text-secondary">
                      <i className="bi bi-calendar-check me-1"></i>CHECK-OUT
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={checkOut}
                      min={checkIn || today}
                      onChange={(e) => { setCheckOut(e.target.value); setFormError(''); }}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">
                    <i className="bi bi-people me-1"></i>GUESTS
                  </label>
                  <select
                    className="form-select"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  >
                    {Array.from({ length: roomCapacity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} Guest{n !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">
                    <i className="bi bi-chat-square-text me-1"></i>SPECIAL REQUESTS
                    <span className="text-muted fw-normal ms-1">(optional)</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    maxLength={500}
                    placeholder="Any dietary needs, accessibility requirements, etc."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>

                {nights > 0 && (
                  <div className="d-flex justify-content-between align-items-center py-2 px-3 rounded-3 bg-light border mb-3 small">
                    <span className="text-muted">{formatINR(room.price)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                    <span className="fw-bold fs-6">{formatINR(total)}</span>
                  </div>
                )}

                {formError && (
                  <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                    <span>{formError}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-hotelpro-gold w-100 py-2 fw-semibold">
                  <i className="bi bi-eye me-2"></i>Review Reservation
                </button>
              </form>
            )}

            {step === 'review' && (
              <ReviewStep
                room={room}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                nights={nights}
                total={total}
                onBack={() => { setSubmitError(''); setStep('form'); }}
                onConfirm={handleConfirm}
                submitting={submitting}
                error={submitError}
              />
            )}

            {step === 'confirmed' && confirmedBooking && (
              <ConfirmationStep booking={confirmedBooking} onClose={handleClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { STATUS_BADGE, formatDate };
export default BookingModal;
