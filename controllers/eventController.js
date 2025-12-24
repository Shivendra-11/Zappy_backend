import Event from '../models/Event.js';
import { cloudinary } from '../config/cloudinary.js';
import { generateOTP, sendOTP } from '../utils/otpService.js';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const ensureNotDeleted = (event, res) => {
  if (event?.isDeleted) {
    res.status(410).json({
      success: false,
      message: 'This event was deleted'
    });
    return false;
  }
  return true;
};

const sanitizeEvent = (eventDoc) => {
  const eventObj = eventDoc.toObject();
  ['startOTP', 'closingOTP'].forEach((key) => {
    if (eventObj[key]) {
      eventObj[key] = {
        ...eventObj[key],
        code: process.env.NODE_ENV === 'development' ? eventObj[key].code : undefined
      };
    }
  });
  return eventObj;
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    const {
      eventName,
      customerName,
      customerEmail,
      customerPhone,
      eventDate,
      location,
      eventLocation
    } = req.body;

    const resolvedLocation =
      (typeof location === 'string' ? location : undefined) ||
      (typeof eventLocation === 'string' ? eventLocation : undefined) ||
      (typeof eventLocation?.address === 'string' ? eventLocation.address : undefined);

    if (!resolvedLocation || resolvedLocation.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide event location'
      });
    }

    const event = await Event.create({
      vendor: req.vendor._id,
      eventName,
      customerName,
      customerEmail,
      customerPhone,
      eventDate,
      location: resolvedLocation.trim(),
      ...(eventLocation && typeof eventLocation === 'object' ? { eventLocation } : {})
    });

    await event.populate('vendor', 'name email phone');

    const sanitizedEvent = sanitizeEvent(event);

    res.status(201).json({
      success: true,
      event: sanitizedEvent
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all events for vendor
// @route   GET /api/events
// @access  Private
export const getEvents = async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted || '').toLowerCase() === 'true';
    const onlyDeleted = String(req.query.onlyDeleted || '').toLowerCase() === 'true';

    const filter = { vendor: req.vendor._id };
    if (onlyDeleted) {
      filter.isDeleted = true;
    } else if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    const events = await Event.find(filter)
      .populate('vendor', 'name email phone')
      .sort({ createdAt: -1 });

    const sanitizedEvents = events.map(sanitizeEvent);

    res.status(200).json({
      success: true,
      count: sanitizedEvents.length,
      events: sanitizedEvents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getEvent = async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted || '').toLowerCase() === 'true';
    const event = await Event.findById(req.params.id)
      .populate('vendor', 'name email phone');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if vendor owns the event
    if (event.vendor._id.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this event'
      });
    }

    if (event.isDeleted && !includeDeleted) {
      return res.status(410).json({
        success: false,
        message: 'This event was deleted'
      });
    }

    const sanitizedEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      event: sanitizedEvent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Vendor Check-In
// @route   POST /api/events/:id/checkin
// @access  Private
export const checkIn = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env and restart the backend.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload arrival photo'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!ensureNotDeleted(event, res)) return;

    // Upload image to cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'zappy/vendor-checkins',
          transformation: [{ width: 1080, height: 1080, crop: 'limit' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Update event with check-in data
    event.checkIn = {
      arrivalPhoto: result.secure_url,
      arrivalPhotoPublicId: result.public_id,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      timestamp: new Date(),
      isCheckedIn: true
    };
    event.status = 'checked-in';

    await event.save();

    const sanitizedEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      event: sanitizedEvent
    });
  } catch (error) {
    if (typeof error?.message === 'string' && error.message.includes('Invalid Signature')) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary upload failed (invalid signature). Your CLOUDINARY_API_SECRET (or API key/cloud name) is incorrect. Update backend/.env with the exact values from your Cloudinary Dashboard and restart the backend.'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Trigger Customer OTP for Event Start
// @route   POST /api/events/:id/start-otp
// @access  Private
export const triggerStartOTP = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!ensureNotDeleted(event, res)) return;

    if (!event.checkIn?.isCheckedIn) {
      return res.status(400).json({
        success: false,
        message: 'Please check-in first'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP] Start OTP generated for event ${event._id} -> ${event.customerEmail}: ${otp}`);
    }

    // Send OTP to customer
    const toEmail = typeof event.customerEmail === 'string' ? event.customerEmail.trim() : '';
    await sendOTP(event.customerPhone, toEmail, otp);

    // Save OTP to event
    event.startOTP = {
      code: otp,
      sentAt: new Date(),
      isVerified: false
    };

    await event.save();

    const responseEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      message: 'OTP sent to customer successfully',
      event: responseEvent,
      // In development, return OTP for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify Customer OTP for Event Start
// @route   POST /api/events/:id/verify-start-otp
// @access  Private
export const verifyStartOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!ensureNotDeleted(event, res)) return;

    if (!event.startOTP?.code) {
      return res.status(400).json({
        success: false,
        message: 'OTP has not been requested yet'
      });
    }

    const isExpired = event.startOTP.sentAt && (Date.now() - new Date(event.startOTP.sentAt).getTime() > OTP_TTL_MS);
    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (event.startOTP.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark OTP as verified
    event.startOTP.isVerified = true;
    event.startOTP.verifiedAt = new Date();
    event.status = 'started';

    await event.save();

    const responseEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      message: 'Event started successfully',
      event: responseEvent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload Event Setup Photos
// @route   POST /api/events/:id/setup-photos
// @access  Private
export const uploadSetupPhotos = async (req, res) => {
  try {
    const { type, notes } = req.body; // type: 'pre' or 'post'

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env and restart the backend.'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one photo'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!ensureNotDeleted(event, res)) return;

    if (!event.startOTP?.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify start OTP first'
      });
    }

    // Ensure nested structure exists (for older records created before defaults)
    if (!event.eventSetup) {
      event.eventSetup = { preSetupPhotos: [], postSetupPhotos: [] };
    }
    if (!Array.isArray(event.eventSetup.preSetupPhotos)) {
      event.eventSetup.preSetupPhotos = [];
    }
    if (!Array.isArray(event.eventSetup.postSetupPhotos)) {
      event.eventSetup.postSetupPhotos = [];
    }

    // Upload all photos to cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `zappy/event-setup/${type}`,
            transformation: [{ width: 1080, height: 1080, crop: 'limit' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve({
              url: result.secure_url,
              publicId: result.public_id,
              uploadedAt: new Date()
            });
          }
        );
        uploadStream.end(file.buffer);
      });
    });

    const uploadedPhotos = await Promise.all(uploadPromises);

    // Add photos to event
    if (type === 'pre') {
      event.eventSetup.preSetupPhotos.push(...uploadedPhotos);
    } else if (type === 'post') {
      event.eventSetup.postSetupPhotos.push(...uploadedPhotos);
      event.eventSetup.setupCompletedAt = new Date();
      event.status = 'in-progress';
    }

    if (notes) {
      event.eventSetup.notes = notes;
    }

    await event.save();

    const sanitizedEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      message: `${type}-setup photos uploaded successfully`,
      event: sanitizedEvent
    });
  } catch (error) {
    if (typeof error?.message === 'string' && error.message.includes('Invalid Signature')) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary upload failed (invalid signature). Your CLOUDINARY_API_SECRET (or API key/cloud name) is incorrect. Update backend/.env with the exact values from your Cloudinary Dashboard and restart the backend.'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Trigger Customer OTP for Event Closing
// @route   POST /api/events/:id/closing-otp
// @access  Private
export const triggerClosingOTP = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!ensureNotDeleted(event, res)) return;

    if (!event.eventSetup?.postSetupPhotos || event.eventSetup.postSetupPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload post-setup photos first'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP] Closing OTP generated for event ${event._id} -> ${event.customerEmail}: ${otp}`);
    }

    // Send OTP to customer
    const toEmail = typeof event.customerEmail === 'string' ? event.customerEmail.trim() : '';
    await sendOTP(event.customerPhone, toEmail, otp);

    // Save OTP to event
    event.closingOTP = {
      code: otp,
      sentAt: new Date(),
      isVerified: false
    };

    await event.save();

    const responseEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      message: 'Closing OTP sent to customer successfully',
      event: responseEvent,
      // In development, return OTP for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify Customer OTP for Event Closing
// @route   POST /api/events/:id/verify-closing-otp
// @access  Private
export const verifyClosingOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!ensureNotDeleted(event, res)) return;

    if (!event.closingOTP?.code) {
      return res.status(400).json({
        success: false,
        message: 'Closing OTP has not been requested yet'
      });
    }

    const isExpired = event.closingOTP.sentAt && (Date.now() - new Date(event.closingOTP.sentAt).getTime() > OTP_TTL_MS);
    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Closing OTP has expired. Please request a new one.'
      });
    }

    if (event.closingOTP.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark OTP as verified and complete event
    event.closingOTP.isVerified = true;
    event.closingOTP.verifiedAt = new Date();
    event.status = 'completed';
    event.completedAt = new Date();

    await event.save();

    const responseEvent = sanitizeEvent(event);

    res.status(200).json({
      success: true,
      message: 'Event completed successfully',
      event: responseEvent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.vendor.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (event.isDeleted) {
      return res.status(200).json({
        success: true,
        message: 'Event already deleted'
      });
    }

    event.isDeleted = true;
    event.deletedAt = new Date();
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event moved to deleted list'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get analytics summary for vendor events
// @route   GET /api/events/analytics
// @access  Private
export const getEventAnalytics = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const [
      totalAll,
      totalDeleted,
      totalActive,
      statusCounts,
      completedEvents
    ] = await Promise.all([
      Event.countDocuments({ vendor: vendorId }),
      Event.countDocuments({ vendor: vendorId, isDeleted: true }),
      Event.countDocuments({ vendor: vendorId, isDeleted: { $ne: true } }),
      Event.aggregate([
        { $match: { vendor: vendorId, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Event.find({ vendor: vendorId, status: 'completed' }).select('checkIn.timestamp startOTP.verifiedAt closingOTP.verifiedAt completedAt').lean()
    ]);

    const ms = (d) => (d ? new Date(d).getTime() : null);
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

    const checkInToCompleted = [];
    const checkInToStarted = [];
    const startedToCompleted = [];

    for (const ev of completedEvents) {
      const checkInAt = ms(ev?.checkIn?.timestamp);
      const startedAt = ms(ev?.startOTP?.verifiedAt);
      const closedAt = ms(ev?.closingOTP?.verifiedAt) || ms(ev?.completedAt);

      if (checkInAt && closedAt && closedAt >= checkInAt) checkInToCompleted.push(closedAt - checkInAt);
      if (checkInAt && startedAt && startedAt >= checkInAt) checkInToStarted.push(startedAt - checkInAt);
      if (startedAt && closedAt && closedAt >= startedAt) startedToCompleted.push(closedAt - startedAt);
    }

    const statusMap = statusCounts.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      analytics: {
        totals: {
          all: totalAll,
          active: totalActive,
          deleted: totalDeleted
        },
        statusCounts: statusMap,
        avgDurationsMs: {
          checkInToStarted: avg(checkInToStarted),
          startedToCompleted: avg(startedToCompleted),
          checkInToCompleted: avg(checkInToCompleted)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
