import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Room title / name is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters']
    },
    category: {
      type: String,
      required: [true, 'Room category is required'],
      trim: true,
      enum: {
        values: [
          'Luxury Suite',
          'Villa',
          'Executive',
          'Superior',
          'Family Suite',
          'Penthouse',
          'Standard',
          'Deluxe'
        ],
        message: '{VALUE} is not a supported room category'
      }
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price must be greater than or equal to 0']
    },
    capacity: {
      type: Number,
      required: [true, 'Guest capacity is required'],
      min: [1, 'Capacity must be at least 1 guest']
    },
    bed: {
      type: String,
      default: '1 King Bed',
      trim: true
    },
    size: {
      type: String,
      default: '60 m²',
      trim: true
    },
    badge: {
      type: String,
      default: 'Featured',
      trim: true
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 0,
      max: 5
    },
    reviews: {
      type: Number,
      default: 12,
      min: 0
    },
    amenities: {
      type: [String],
      default: []
    },
    image: {
      type: String,
      required: [true, 'Room image URL is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'cleaning', 'maintenance', 'inactive'],
      default: 'available'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual id for frontend compatibility
roomSchema.virtual('id').get(function () {
  return this._id.toString();
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
