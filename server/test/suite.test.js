import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import Room from '../src/models/Room.js';
import Payment from '../src/models/Payment.js';
import { generateToken } from '../src/middleware/auth.js';

test('1. User Model & Authentication Security', async (t) => {
  await t.test('Password hashing and comparison with bcrypt', async () => {
    const plainPassword = 'SecretPassword123!';
    const hash = await bcrypt.hash(plainPassword, 10);
    const isMatch = await bcrypt.compare(plainPassword, hash);
    const isWrong = await bcrypt.compare('WrongPassword', hash);

    assert.equal(isMatch, true, 'Correct password should match hash');
    assert.equal(isWrong, false, 'Incorrect password should fail match');
  });

  await t.test('toSafeObject() should sanitize passwordHash and expose user details', () => {
    const userDoc = new User({
      name: 'Tester Admin',
      email: 'admin@hotelpro.com',
      passwordHash: 'secret_hash_value',
      role: 'admin'
    });

    const safeObj = userDoc.toSafeObject();
    assert.equal(safeObj.name, 'Tester Admin');
    assert.equal(safeObj.email, 'admin@hotelpro.com');
    assert.equal(safeObj.role, 'admin');
    assert.equal(safeObj.passwordHash, undefined, 'passwordHash must never be exposed');
  });

  await t.test('JWT generation and verification', () => {
    const secret = 'hotelpro_test_secret_for_unit_tests_123456';
    process.env.JWT_SECRET = secret;
    process.env.JWT_EXPIRES_IN = '1h';

    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'guest@hotelpro.com',
      role: 'guest'
    };

    const token = generateToken(mockUser);
    assert.ok(typeof token === 'string' && token.length > 20, 'JWT token must be a non-empty string');

    const decoded = jwt.verify(token, secret);
    assert.equal(decoded.id, mockUser._id);
    assert.equal(decoded.role, 'guest');
  });
});

test('2. Room Schema & Validation Rules', async (t) => {
  await t.test('Room accepts valid category enum and required attributes', () => {
    const validRoom = new Room({
      roomNumber: '999',
      title: 'Ocean Presidential Penthouse',
      category: 'Luxury Suite',
      price: 25000,
      capacity: 4,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
    });

    const validationError = validRoom.validateSync();
    assert.equal(validationError, undefined, 'Valid room should produce no validation error');
  });

  await t.test('Room rejects invalid category enum', () => {
    const invalidRoom = new Room({
      roomNumber: '998',
      title: 'Mystery Chamber',
      category: 'SpaceStation', // Not in enum
      price: 15000,
      capacity: 2,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
    });

    const validationError = invalidRoom.validateSync();
    assert.ok(validationError, 'Invalid room category should fail validation');
    assert.ok(validationError.errors.category, 'Category field error must exist');
  });

  await t.test('Room rejects negative pricing', () => {
    const negativePriceRoom = new Room({
      roomNumber: '997',
      title: 'Budget Haven',
      category: 'Standard',
      price: -500,
      capacity: 2,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
    });

    const validationError = negativePriceRoom.validateSync();
    assert.ok(validationError, 'Negative room price should fail validation');
  });
});

test('3. Payment Model & Demo Transaction ID Generation', async (t) => {
  await t.test('generateTransactionId produces HPDEMO- prefix and unique hex string', () => {
    const txId1 = Payment.generateTransactionId();
    const txId2 = Payment.generateTransactionId();

    assert.ok(txId1.startsWith('HPDEMO-'), 'Transaction ID must start with HPDEMO-');
    assert.ok(txId2.startsWith('HPDEMO-'), 'Transaction ID must start with HPDEMO-');
    assert.notEqual(txId1, txId2, 'Subsequent transaction IDs must be unique');
    assert.equal(txId1.length, 19, 'Transaction ID format length should match HPDEMO- (7 + 12 hex = 19)');
  });

  await t.test('Payment schema validates required payment fields', () => {
    const validPayment = new Payment({
      booking: '507f1f77bcf86cd799439011',
      user: '507f1f77bcf86cd799439012',
      amount: 18500,
      currency: 'INR',
      provider: 'demo',
      transactionId: Payment.generateTransactionId(),
      status: 'paid'
    });

    const validationError = validPayment.validateSync();
    assert.equal(validationError, undefined, 'Valid payment should produce no validation error');
  });
});

test('4. Price & Night Calculation Logic', () => {
  const checkIn = new Date('2026-11-01');
  const checkOut = new Date('2026-11-04');
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const totalNights = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const pricePerNight = 12500;
  const totalAmount = totalNights * pricePerNight;

  assert.equal(totalNights, 3, 'Total nights between Nov 1 and Nov 4 should be 3');
  assert.equal(totalAmount, 37500, '3 nights @ ₹12,500 should equal ₹37,500');
});
