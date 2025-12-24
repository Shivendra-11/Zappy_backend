import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    code: String,
    sentAt: Date,
    verifiedAt: Date,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const checkInSchema = new mongoose.Schema(
  {
    arrivalPhoto: String,
    arrivalPhotoPublicId: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    timestamp: Date,
    isCheckedIn: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const setupPhotoSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    uploadedAt: Date
  },
  { _id: false }
);

const eventSetupSchema = new mongoose.Schema(
  {
    preSetupPhotos: {
      type: [setupPhotoSchema],
      default: []
    },
    postSetupPhotos: {
      type: [setupPhotoSchema],
      default: []
    },
    notes: String,
    setupCompletedAt: Date
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  eventName: {
    type: String,
    required: [true, 'Please provide event name'],
    trim: true
  },
  customerName: {
    type: String,
    required: [true, 'Please provide customer name']
  },
  customerEmail: {
    type: String,
    required: [true, 'Please provide customer email']
  },
  customerPhone: {
    type: String,
    required: [true, 'Please provide customer phone']
  },
  eventDate: {
    type: Date,
    required: [true, 'Please provide event date']
  },
  location: {
    type: String,
    required: [true, 'Please provide event location']
  },
  eventLocation: {
    address: String,
    city: String,
    state: String
  },
  
  // Vendor Check-In Data
  checkIn: {
    type: checkInSchema,
    default: () => ({})
  },
  
  // Customer OTP for Event Start
  startOTP: {
    type: otpSchema,
    default: () => ({})
  },
  
  // Event Setup Progress
  eventSetup: {
    type: eventSetupSchema,
    default: () => ({})
  },
  
  // Event Closing Confirmation
  closingOTP: {
    type: otpSchema,
    default: () => ({})
  },
  
  status: {
    type: String,
    enum: ['pending', 'checked-in', 'started', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date,
  
  completedAt: Date
}, {
  timestamps: true
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
