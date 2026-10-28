import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Room from './models/Room.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotelpro';

const seedUsers = [
  {
    name: 'Hotel Administrator',
    email: 'admin@hotelpro.com',
    password: 'Admin@123',
    role: 'admin'
  },
  {
    name: 'Front Desk Staff',
    email: 'staff@hotelpro.com',
    password: 'Staff@123',
    role: 'staff'
  },
  {
    name: 'John Doe (Guest)',
    email: 'guest@hotelpro.com',
    password: 'Guest@123',
    role: 'guest'
  }
];

const seedRooms = [
  {
    roomNumber: '101',
    title: 'Presidential Ocean Suite',
    category: 'Luxury Suite',
    description: 'Breathtaking panoramic ocean views with private jacuzzi, personal butler service, and an expansive oceanfront terrace.',
    price: 18500,
    capacity: 2,
    bed: '1 King Bed',
    size: '85 m²',
    badge: 'Popular',
    rating: 4.95,
    reviews: 128,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Ocean View', 'Private Jacuzzi', 'Complimentary Breakfast', 'Butler Service', 'High-Speed Wi-Fi', 'Smart 4K TV'],
    status: 'available'
  },
  {
    roomNumber: '102',
    title: 'Deluxe Garden Villa',
    category: 'Villa',
    description: 'Nestled among lush tropical foliage featuring an espresso bar, outdoor rain shower, and tranquil private garden patio.',
    price: 13500,
    capacity: 3,
    bed: '1 King + 1 Daybed',
    size: '65 m²',
    badge: 'Best Value',
    rating: 4.88,
    reviews: 94,
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Private Garden', 'Espresso Bar', 'Free High-Speed Wi-Fi', 'Rain Shower', 'Room Service'],
    status: 'available'
  },
  {
    roomNumber: '201',
    title: 'Executive Panorama Suite',
    category: 'Executive',
    description: 'Designed for the discerning executive with sweeping city skyline views, dedicated workstation, and Executive Lounge privileges.',
    price: 16000,
    capacity: 2,
    bed: '1 California King',
    size: '72 m²',
    badge: 'Skyline View',
    rating: 4.92,
    reviews: 110,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80',
    amenities: ['City Skyline', 'Executive Lounge Access', 'Work Desk', 'Marble Bath', 'Complimentary Breakfast'],
    status: 'available'
  },
  {
    roomNumber: '202',
    title: 'Superior King Room',
    category: 'Superior',
    description: 'Contemporary elegance featuring warm natural wood accents, private balcony, plush king bedding, and 24/7 room dining.',
    price: 9500,
    capacity: 2,
    bed: '1 King Bed',
    size: '48 m²',
    badge: 'Classic',
    rating: 4.82,
    reviews: 76,
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Balcony', 'Smart 4K TV', '24/7 Room Service', 'Mini Bar', 'Free Wi-Fi'],
    status: 'available'
  },
  {
    roomNumber: '301',
    title: 'Family Grand Residence',
    category: 'Family Suite',
    description: 'Spacious two-bedroom retreat with adjoining living salon, kitchen nook, and custom child-friendly hospitality amenities.',
    price: 22000,
    capacity: 5,
    bed: '2 King Beds + 1 Rollaway',
    size: '110 m²',
    badge: 'Family Pick',
    rating: 4.97,
    reviews: 142,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Two Bedrooms', 'Living Salon', 'Kitchenette', 'Pool Access', 'Kids Corner', 'Free Breakfast'],
    status: 'available'
  },
  {
    roomNumber: '401',
    title: 'Penthouse Sky Villa',
    category: 'Penthouse',
    description: 'The pinnacle of luxury atop HotelPro. Includes private rooftop infinity plunge pool, 360-degree vistas, and dedicated private sommelier.',
    price: 32000,
    capacity: 4,
    bed: '2 King Master Suites',
    size: '160 m²',
    badge: 'Top Luxury',
    rating: 4.99,
    reviews: 64,
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80',
    amenities: ['Private Infinity Pool', 'Rooftop Terrace', 'Personal Sommelier', 'Chauffeur Service', 'Spa Access'],
    status: 'available'
  }
];

async function seed() {
  try {
    console.log(`[HotelPro Seed] Connecting to MongoDB: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000
    });
    console.log('[HotelPro Seed] MongoDB connected successfully.');

    // Seed Users
    console.log('[HotelPro Seed] Seeding users...');
    for (const u of seedUsers) {
      const existing = await User.findOne({ email: u.email });
      const passwordHash = await bcrypt.hash(u.password, 10);
      if (existing) {
        existing.name = u.name;
        existing.passwordHash = passwordHash;
        existing.role = u.role;
        await existing.save();
        console.log(`  ✓ Updated user: ${u.email} [${u.role}]`);
      } else {
        await User.create({
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role
        });
        console.log(`  ✓ Created user: ${u.email} [${u.role}]`);
      }
    }

    // Seed Rooms
    console.log('[HotelPro Seed] Seeding rooms...');
    for (const r of seedRooms) {
      const existing = await Room.findOne({ roomNumber: r.roomNumber });
      if (existing) {
        Object.assign(existing, r);
        await existing.save();
        console.log(`  ✓ Updated room ${r.roomNumber}: "${r.title}"`);
      } else {
        await Room.create(r);
        console.log(`  ✓ Created room ${r.roomNumber}: "${r.title}"`);
      }
    }

    console.log('\n=========================================');
    console.log('✅ HotelPro Database Seeded Successfully!');
    console.log('=========================================');
    console.log('Test Accounts:');
    console.log('  👑 Admin: admin@hotelpro.com / Admin@123');
    console.log('  🛎️  Staff: staff@hotelpro.com / Staff@123');
    console.log('  🧳 Guest: guest@hotelpro.com / Guest@123');
    console.log('=========================================\n');
  } catch (err) {
    console.error('[HotelPro Seed Error]:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[HotelPro Seed] Database connection closed.');
  }
}

seed();
