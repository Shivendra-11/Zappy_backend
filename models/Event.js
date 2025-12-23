import mongoose from 'mongoose';

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
  
  // Customer OTP for Event Start
  startOTP: {
    code: String,
    sentAt: Date,
    verifiedAt: Date,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Event Setup Progress
  eventSetup: {
    preSetupPhotos: [{
      url: String,
      publicId: String,
      uploadedAt: Date
    }],
    postSetupPhotos: [{
      url: String,
      publicId: String,
      uploadedAt: Date
    }],
    notes: String,
    setupCompletedAt: Date
  },
  
  // Event Closing Confirmation
  closingOTP: {
    code: String,
    sentAt: Date,
    verifiedAt: Date,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'checked-in', 'started', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  completedAt: Date
}, {
  timestamps: true
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
