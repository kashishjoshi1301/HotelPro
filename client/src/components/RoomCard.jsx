import React from 'react';
import { formatINR } from '../utils/formatCurrency';

const RoomCard = ({ room, onSelectRoom }) => {
  const formattedCapacity = typeof room.capacity === 'number' ? `${room.capacity} Guests` : (room.capacity || '2 Guests');
  const roomAmenities = Array.isArray(room.amenities) ? room.amenities : [];

  return (
    <div className="col-12 col-md-6 col-lg-4 d-flex">
      <div className="card room-card w-100 d-flex flex-column">
        <div className="room-card-img-wrapper">
          <img src={room.image} alt={room.title} className="room-card-img" loading="lazy" />
          <span className="room-badge">
            <i className="bi bi-award me-1"></i>{room.badge || 'Featured'}
          </span>
          <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white px-3 py-1 rounded-start-pill small">
            <i className="bi bi-star-fill text-warning me-1"></i>
            {room.rating || 4.9} <span className="text-white-50">({room.reviews || 10})</span>
          </div>
        </div>

        <div className="card-body p-4 d-flex flex-column justify-content-between flex-grow-1">
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge bg-secondary-subtle text-secondary-emphasis fw-medium px-2 py-1 rounded">
                {room.category}
              </span>
              <span className="small text-muted">
                <i className="bi bi-aspect-ratio me-1"></i>{room.size || '60 m²'}
              </span>
            </div>

            <h5 className="card-title fw-bold font-serif mb-2">{room.title}</h5>

            <div className="d-flex gap-3 text-muted small mb-3">
              <span><i className="bi bi-people me-1"></i>{formattedCapacity}</span>
              <span><i className="bi bi-moon-stars me-1"></i>{room.bed || '1 King Bed'}</span>
            </div>

            <div className="d-flex flex-wrap gap-1 mb-4">
              {roomAmenities.slice(0, 4).map((item, idx) => (
                <span key={idx} className="badge bg-light text-secondary border px-2 py-1" style={{ fontSize: '0.75rem' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 border-top d-flex align-items-center justify-content-between mt-auto">
            <div>
              <span className="room-price-tag">{formatINR(room.price)}</span>
              <span className="text-muted small"> / night</span>
            </div>
            <button
              onClick={() => onSelectRoom(room)}
              className="btn btn-outline-dark btn-sm px-3 py-2 fw-semibold rounded-pill d-flex align-items-center gap-1"
            >
              <span>View Details</span>
              <i className="bi bi-arrow-right-short fs-6"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
