import React, { useState, useEffect } from 'react';
import { getGuestDashboard } from '../api/dashboard';
import { createRazorpayOrder, verifyRazorpayPayment, processDemoPayment } from '../api/payments';
import InvoiceModal from './InvoiceModal';
import { STATUS_BADGE, formatDate } from './BookingModal';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatCurrency';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const GuestDashboard = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [data, setData] = useState({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [invoice, setInvoice] = useState({ open: false, booking: null, payment: null });

  const load = () => {
    setLoading(true);
    setError('');
    getGuestDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  const handlePay = async (booking) => {
    if (payingId) return;
    setPayingId(booking._id);
    setPayError('');
    setPaySuccess('');

    try {
      const { data: orderRes } = await createRazorpayOrder(booking._id);

      // If Razorpay live/test credentials are fully configured on server
      if (orderRes.keyId) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Razorpay Checkout SDK failed to load. Please check your network connection.');
        }

        const options = {
          key: orderRes.keyId,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'HotelPro Luxury Resort',
          description: `Reservation #${booking._id.slice(-8).toUpperCase()} — ${booking.room?.title || 'Suite'}`,
          order_id: orderRes.orderId,
          handler: async (response) => {
            try {
              await verifyRazorpayPayment({
                bookingId: booking._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });
              setPaySuccess(`Payment verified! Transaction ID: ${response.razorpay_payment_id}`);
              load();
            } catch (vErr) {
              setPayError(vErr.response?.data?.error || 'Payment signature verification failed.');
            } finally {
              setPayingId(null);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || ''
          },
          theme: {
            color: '#c5a880'
          },
          modal: {
            ondismiss: () => {
              setPayingId(null);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          setPayError(response.error?.description || 'Payment failed or was cancelled by the user.');
          setPayingId(null);
        });
        rzp.open();
      } else if (orderRes.mockOrder) {
        // Fallback to demo payment when Razorpay keys are not yet inserted in dev
        await processDemoPayment(booking._id);
        setPaySuccess('Payment processed in test mode. (Razorpay keys not yet configured in server/.env)');
        load();
        setPayingId(null);
      }
    } catch (e) {
      setPayError(e.response?.data?.error || e.message || 'Failed to initiate payment.');
      setPayingId(null);
    }
  };

  const openInvoice = (booking) => {
    const payment = booking.payment || null;
    setInvoice({ open: true, booking, payment });
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-dark text-white border-0 px-4 py-3">
              <div>
                <h5 className="modal-title font-serif fw-bold mb-0">
                  <i className="bi bi-person-circle brand-accent me-2"></i>Guest Dashboard
                </h5>
                <p className="text-white-50 small mb-0">Welcome back, {user?.name}</p>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
            </div>

            <div className="modal-body p-4 bg-light">
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}

              {!loading && error && (
                <div className="alert alert-danger small py-2 px-3">
                  <i className="bi bi-exclamation-triangle me-1"></i>{error}
                </div>
              )}

              {paySuccess && (
                <div className="alert alert-success small py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill flex-shrink-0"></i>
                  <span>{paySuccess}</span>
                </div>
              )}

              {payError && (
                <div className="alert alert-warning small py-2 px-3 mb-3">
                  <i className="bi bi-exclamation-circle me-1"></i>{payError}
                </div>
              )}

              {!loading && !error && (
                <div className="row g-4">
                  {/* Upcoming Stays */}
                  <div className="col-12">
                    <div className="bg-white rounded-3 p-4 shadow-sm">
                      <h6 className="font-serif fw-bold mb-3">
                        <i className="bi bi-calendar-event brand-accent me-2"></i>Upcoming Stays
                      </h6>
                      {data.upcoming.length === 0 ? (
                        <p className="text-muted small mb-0">No upcoming stays. <button className="btn btn-link btn-sm p-0" onClick={onClose}>Browse rooms</button></p>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {data.upcoming.map((b) => (
                            <div key={b._id} className="border rounded-3 p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                              <div>
                                <div className="fw-semibold">{b.room?.title}</div>
                                <div className="text-muted small">
                                  {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights · {b.guests} guests
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <span className={`badge px-2 py-1 ${STATUS_BADGE[b.bookingStatus] || ''}`}>
                                  {b.bookingStatus}
                                </span>
                                <span className={`badge px-2 py-1 ${b.paymentStatus === 'paid' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}`}>
                                  {b.paymentStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Booking History */}
                  <div className="col-12">
                    <div className="bg-white rounded-3 p-4 shadow-sm">
                      <h6 className="font-serif fw-bold mb-3">
                        <i className="bi bi-clock-history brand-accent me-2"></i>Booking History
                      </h6>
                      {data.history.length === 0 ? (
                        <p className="text-muted small mb-0">No bookings yet.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle small mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Room</th>
                                <th>Dates</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.history.map((b) => (
                                <tr key={b._id}>
                                  <td>
                                    <div className="fw-semibold">{b.room?.title}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{b.room?.roomNumber}</div>
                                  </td>
                                  <td>
                                    <div>{formatDate(b.checkIn)}</div>
                                    <div className="text-muted">to {formatDate(b.checkOut)}</div>
                                  </td>
                                  <td className="fw-semibold">{formatINR(b.totalAmount)}</td>
                                  <td>
                                    <span className={`badge ${STATUS_BADGE[b.bookingStatus] || 'bg-secondary-subtle text-secondary'}`}>
                                      {b.bookingStatus}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${b.paymentStatus === 'paid' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}`}>
                                      {b.paymentStatus}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-1 flex-wrap">
                                      {b.paymentStatus !== 'paid' && b.bookingStatus === 'confirmed' && (
                                        <button
                                          className="btn btn-hotelpro-gold btn-sm px-2 py-1"
                                          style={{ fontSize: '0.75rem' }}
                                          onClick={() => handlePay(b)}
                                          disabled={payingId === b._id}
                                          title="Pay securely via Razorpay"
                                        >
                                          {payingId === b._id
                                            ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                            : <><i className="bi bi-shield-check me-1"></i>Pay Now</>
                                          }
                                        </button>
                                      )}
                                      <button
                                        className="btn btn-outline-secondary btn-sm px-2 py-1"
                                        style={{ fontSize: '0.75rem' }}
                                        onClick={() => openInvoice(b)}
                                      >
                                        <i className="bi bi-receipt me-1"></i>Invoice
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <InvoiceModal
        isOpen={invoice.open}
        onClose={() => setInvoice({ open: false, booking: null, payment: null })}
        booking={invoice.booking}
        payment={invoice.payment}
        guestName={user?.name}
      />
    </>
  );
};

export default GuestDashboard;
