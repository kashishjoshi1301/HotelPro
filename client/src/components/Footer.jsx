import React from 'react';

const currentYear = new Date().getFullYear();

const Footer = () => {
  return (
    <footer id="contact" className="footer-hotelpro pt-5 pb-4">
      <div className="container pt-3">
        <div className="row g-4 mb-5">
          {/* Brand Info */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="d-flex align-items-center gap-2 fw-bold fs-4 text-white mb-3">
              <i className="bi bi-buildings brand-accent fs-3"></i>
              <span>Hotel<span className="brand-accent">Pro</span></span>
            </div>
            <p className="text-secondary small pe-lg-4 lh-base mb-4">
              HotelPro represents the benchmark in luxury accommodations, intuitive guest experiences, and world-class hospitality across prime destinations.
            </p>
            <div className="d-flex gap-3">
              <a
                href="https://github.com/Arnav2306/HotelPro"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-secondary rounded-circle"
                style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="GitHub Repository"
                title="GitHub Repository"
              >
                <i className="bi bi-github"></i>
              </a>
              <a href="#home" className="btn btn-sm btn-outline-secondary rounded-circle" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Instagram">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="#home" className="btn btn-sm btn-outline-secondary rounded-circle" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Facebook">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="#home" className="btn btn-sm btn-outline-secondary rounded-circle" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
              <a href="#home" className="btn btn-sm btn-outline-secondary rounded-circle" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Twitter">
                <i className="bi bi-twitter-x"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-6 col-md-3 col-lg-2">
            <h6 className="text-white text-uppercase fw-semibold mb-3 small tracking-wider">Explore</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              <li><a href="#rooms" className="footer-link">Rooms & Suites</a></li>
              <li><a href="#amenities" className="footer-link">Resort Amenities</a></li>
              <li><a href="#search" className="footer-link">Rates & Availability</a></li>
              <li><a href="#home" className="footer-link">Dining & Lounges</a></li>
              <li><a href="#home" className="footer-link">Spa Sanctuary</a></li>
            </ul>
          </div>

          {/* Hotel Services */}
          <div className="col-6 col-md-3 col-lg-2">
            <h6 className="text-white text-uppercase fw-semibold mb-3 small tracking-wider">Services</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small">
              <li><a href="#home" className="footer-link">Airport Chauffeur</a></li>
              <li><a href="#home" className="footer-link">Private Events</a></li>
              <li><a href="#home" className="footer-link">Weddings & Galas</a></li>
              <li><a href="#home" className="footer-link">Corporate Summits</a></li>
              <li><a href="#home" className="footer-link">Concierge Desk</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="col-12 col-md-6 col-lg-4">
            <h6 className="text-white text-uppercase fw-semibold mb-3 small tracking-wider">Contact & Location</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 small text-secondary mb-4">
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-geo-alt brand-accent mt-1"></i>
                <span>742 Evergreen Ocean Promenade, Coastal Bay, CA 90210</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-telephone brand-accent"></i>
                <span>+1 (800) 555-HOTELPRO</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-envelope brand-accent"></i>
                <span>reservations@hotelpro.luxury</span>
              </li>
            </ul>

            <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="small text-white d-block mb-1 fw-semibold">Subscribe for Private Offers</span>
              <div className="input-group input-group-sm">
                <input
                  type="email"
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="Enter your email"
                  aria-label="Email address"
                />
                <button className="btn btn-gold text-dark fw-semibold" type="button">
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 mt-4 border-top border-secondary border-opacity-25 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 small text-secondary">
          <p className="mb-0">&copy; {currentYear} HotelPro Resort & Management. All rights reserved.</p>
          <div className="d-flex gap-4">
            <a
              href="https://github.com/Arnav2306/HotelPro"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              <i className="bi bi-github me-1"></i>GitHub Repository
            </a>
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <a href="#terms" className="footer-link">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
