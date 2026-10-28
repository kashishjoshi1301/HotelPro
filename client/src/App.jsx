import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SearchForm from './components/SearchForm';
import RoomList from './components/RoomList';
import Amenities from './components/Amenities';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import MyBookings from './components/MyBookings';
import GuestDashboard from './components/GuestDashboard';
import StaffDashboard from './components/StaffDashboard';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { mockRooms } from './data/mockRooms';
import api from './api/axios';
import { formatINR } from './utils/formatCurrency';

function MainApp() {
  const [serverHealth, setServerHealth] = useState(null);
  const [rooms, setRooms] = useState(mockRooms);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'login' });
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    room: null,
    checkIn: '',
    checkOut: '',
    guests: 2
  });
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const { user } = useAuth();

  // Load rooms from backend API with fallback to mock data
  const loadRooms = useCallback(async (params = {}) => {
    setLoadingRooms(true);
    setRoomsError(null);

    try {
      const queryParams = {};
      if (params.category && params.category !== 'all') queryParams.category = params.category;
      if (params.guests) queryParams.guests = params.guests;
      if (params.checkIn) queryParams.checkIn = params.checkIn;
      if (params.checkOut) queryParams.checkOut = params.checkOut;

      const res = await api.get('/rooms', { params: queryParams });

      if (res.data && Array.isArray(res.data.rooms)) {
        if (res.data.rooms.length > 0) {
          setRooms(res.data.rooms);
          setIsUsingMockData(false);
        } else if (Object.keys(queryParams).length === 0) {
          setRooms(mockRooms);
          setIsUsingMockData(true);
        } else {
          setRooms([]);
          setIsUsingMockData(false);
        }
      }
    } catch (err) {
      console.warn('Rooms API unavailable, using mock fallback:', err.message);
      setRooms(mockRooms);
      setIsUsingMockData(true);
      setRoomsError('Live rooms inventory unavailable. Showing preview accommodations.');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    api.get('/health')
      .then((res) => setServerHealth(res.data.status || 'OK'))
      .catch(() => setServerHealth('Offline'));
    loadRooms();
  }, [loadRooms]);

  const handleSearch = (searchParams) => {
    const selectedCategory = searchParams.roomType || 'all';
    setActiveCategoryFilter(selectedCategory);
    loadRooms({
      category: selectedCategory,
      guests: searchParams.guests,
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut
    });
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategorySelect = (category) => setActiveCategoryFilter(category);

  const handleSelectRoom = (room) => setSelectedRoom(room);

  const openAuthModal = (tab = 'login') => setAuthModal({ isOpen: true, tab });
  const closeAuthModal = () => setAuthModal({ isOpen: false, tab: 'login' });

  // Open booking flow - pre-fill dates from last search if available
  const openBookingModal = (room) => {
    setSelectedRoom(null); // close room detail modal first
    setBookingModal({ isOpen: true, room, checkIn: '', checkOut: '', guests: 2 });
  };

  const closeBookingModal = () =>
    setBookingModal({ isOpen: false, room: null, checkIn: '', checkOut: '', guests: 2 });

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar
        serverHealth={serverHealth}
        onOpenAuth={openAuthModal}
        onOpenMyBookings={() => setMyBookingsOpen(true)}
        onOpenDashboard={() => setDashboardOpen(true)}
      />

      <main className="flex-grow-1">
        <Hero />
        <SearchForm onSearch={handleSearch} />
        <RoomList
          rooms={rooms}
          onSelectRoom={handleSelectRoom}
          activeCategoryFilter={activeCategoryFilter}
          onCategorySelect={handleCategorySelect}
          loading={loadingRooms}
          error={roomsError}
          isUsingMockData={isUsingMockData}
        />
        <Amenities />
      </main>

      <Footer />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialTab={authModal.tab}
        onClose={closeAuthModal}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModal.isOpen}
        room={bookingModal.room}
        initialCheckIn={bookingModal.checkIn}
        initialCheckOut={bookingModal.checkOut}
        initialGuests={bookingModal.guests}
        onClose={closeBookingModal}
      />

      {/* My Reservations Modal */}
      <MyBookings
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
      />

      {/* Role-Based Dashboards */}
      {user?.role === 'guest' && (
        <GuestDashboard
          isOpen={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
        />
      )}
      {user?.role === 'staff' && (
        <StaffDashboard
          isOpen={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
        />
      )}
      {user?.role === 'admin' && (
        <AdminDashboard
          isOpen={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
        />
      )}

      {/* Room Quick View Modal */}
      {selectedRoom && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white border-0 px-4 py-3">
                <h5 className="modal-title font-serif fw-bold">{selectedRoom.title}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedRoom(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-0">
                <img
                  src={selectedRoom.image}
                  alt={selectedRoom.title}
                  className="w-100"
                  style={{ maxHeight: '350px', objectFit: 'cover' }}
                />
                <div className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="badge bg-secondary-subtle text-secondary-emphasis fs-6 px-3 py-1">
                      {selectedRoom.category}
                    </span>
                    <div className="text-end">
                      <span className="fs-3 fw-bold text-dark">{formatINR(selectedRoom.price)}</span>
                      <span className="text-muted small"> / night</span>
                    </div>
                  </div>

                  <p className="text-muted mb-4">
                    {selectedRoom.description ||
                      `Experience unmatched luxury and privacy in our ${selectedRoom.title}. Tailored specifically for guests demanding elegance, comfort, and state-of-the-art hospitality conveniences.`}
                  </p>

                  <div className="row g-3 mb-4">
                    <div className="col-4">
                      <div className="p-2 border rounded text-center">
                        <small className="text-muted d-block">Capacity</small>
                        <strong className="small">
                          {typeof selectedRoom.capacity === 'number'
                            ? `${selectedRoom.capacity} Guests`
                            : selectedRoom.capacity || '2 Guests'}
                        </strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 border rounded text-center">
                        <small className="text-muted d-block">Bed Type</small>
                        <strong className="small">{selectedRoom.bed || '1 King Bed'}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 border rounded text-center">
                        <small className="text-muted d-block">Dimensions</small>
                        <strong className="small">{selectedRoom.size || '60 m²'}</strong>
                      </div>
                    </div>
                  </div>

                  <h6 className="fw-bold mb-2">Included Amenities:</h6>
                  <div className="d-flex flex-wrap gap-2 mb-4">
                    {Array.isArray(selectedRoom.amenities) &&
                      selectedRoom.amenities.map((item, idx) => (
                        <span key={idx} className="badge bg-light text-dark border px-3 py-2">
                          <i className="bi bi-check2 text-success me-1"></i>
                          {item}
                        </span>
                      ))}
                  </div>

                  <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setSelectedRoom(null)}
                    >
                      Close
                    </button>
                    {user ? (
                      <button
                        type="button"
                        className="btn btn-hotelpro-gold px-4"
                        onClick={() => openBookingModal(selectedRoom)}
                      >
                        <i className="bi bi-calendar2-check me-2"></i>Book This Suite
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-hotelpro-gold px-4"
                        onClick={() => {
                          setSelectedRoom(null);
                          openAuthModal('login');
                        }}
                      >
                        Sign in to Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
