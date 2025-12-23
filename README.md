# Zappy Backend - Vendor Event Day Tracker API

Backend API for the Vendor Event Day Tracker application built with Node.js, Express, and MongoDB.

## 🛠️ Technologies

- **Node.js** v14+
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Cloudinary** - Image storage
- **Multer** - File uploads
- **bcryptjs** - Password hashing
- **dotenv** - Environment variables
- **cors** - Cross-origin requests

## 📦 Installation

```bash
cd backend
npm install
```

## ⚙️ Configuration

Create/update `.env` file:

```env
# Database
MONGODB_URI=mongodb+srv://shivendrakeshari11_db_user:i4MH79sjLVnaz0VU@cluster0.wkob5in.mongodb.net/

# Authentication
JWT_SECRET=zappy_secret_key_2024_vendor_tracker

# Server
PORT=5000

# Cloudinary (Get from cloudinary.com dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🚀 Running the Server

### Development Mode (with nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### 1. Register Vendor
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123"
}

Response: {
  "token": "jwt_token",
  "vendor": { ... }
}
```

#### 2. Login Vendor
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response: {
  "token": "jwt_token",
  "vendor": { ... }
}
```

#### 3. Get Current Vendor
```http
GET /auth/me
Authorization: Bearer <jwt_token>

Response: {
  "vendor": { ... }
}
```

### Event Endpoints

All event endpoints require authentication header:
```
Authorization: Bearer <jwt_token>
```

#### 1. Create Event
```http
POST /events
Content-Type: application/json

{
  "eventName": "Wedding Reception",
  "eventDate": "2024-12-25",
  "location": "Grand Hotel",
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "customerPhone": "9876543210"
}

Response: {
  "event": { ... }
}
```

#### 2. Get All Events
```http
GET /events

Response: {
  "events": [ ... ]
}
```

#### 3. Get Event by ID
```http
GET /events/:id

Response: {
  "event": { ... }
}
```

#### 4. Vendor Check-In
```http
POST /events/:id/checkin
Content-Type: multipart/form-data

FormData:
- photo: File
- latitude: Number
- longitude: Number

Response: {
  "event": { ... }
}
```

#### 5. Trigger Start OTP
```http
POST /events/:id/start-otp

Response: {
  "message": "Start OTP sent",
  "otp": "123456" // For development only
}
```

#### 6. Verify Start OTP
```http
POST /events/:id/verify-start-otp
Content-Type: application/json

{
  "otp": "123456"
}

Response: {
  "message": "Event started",
  "event": { ... }
}
```

#### 7. Upload Setup Photos
```http
POST /events/:id/setup-photos
Content-Type: multipart/form-data

FormData:
- photos: File[] (multiple files)
- type: "pre" or "post"
- notes: String (optional)

Response: {
  "message": "Photos uploaded",
  "event": { ... }
}
```

#### 8. Trigger Closing OTP
```http
POST /events/:id/closing-otp

Response: {
  "message": "Closing OTP sent",
  "otp": "654321" // For development only
}
```

#### 9. Verify Closing OTP
```http
POST /events/:id/verify-closing-otp
Content-Type: application/json

{
  "otp": "654321"
}

Response: {
  "message": "Event completed",
  "event": { ... }
}
```

## 🗃️ Database Models

### Vendor Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String (required),
  password: String (required, hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Event Model
```javascript
{
  vendor: ObjectId (ref: Vendor),
  eventName: String,
  eventDate: Date,
  location: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  status: Enum ['pending', 'checked-in', 'started', 'in-progress', 'completed'],
  
  checkIn: {
    photo: String (Cloudinary URL),
    location: GeoJSON Point,
    timestamp: Date
  },
  
  startOTP: {
    otp: String,
    sentAt: Date,
    verified: Boolean,
    verifiedAt: Date
  },
  
  eventSetup: {
    prePhotos: [String] (Cloudinary URLs),
    postPhotos: [String] (Cloudinary URLs),
    notes: String
  },
  
  closingOTP: {
    otp: String,
    sentAt: Date,
    verified: Boolean,
    verifiedAt: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Middleware

### 1. Authentication (auth.js)
Protects routes requiring authentication:
```javascript
const protect = require('./middleware/auth')
router.get('/protected-route', protect, controller)
```

### 2. File Upload (upload.js)
Handles multipart/form-data uploads:
```javascript
const upload = require('./middleware/upload')
router.post('/upload', upload.single('photo'), controller)
router.post('/upload-multiple', upload.array('photos', 10), controller)
```

### 3. Error Handler (errorHandler.js)
Global error handling for all routes

## 📸 Image Storage

Images are stored on Cloudinary with organized folder structure:

```
/vendor-checkins/
  ├── vendor_123_timestamp_random.jpg
  ├── ...

/event-setup/
  ├── pre/
  │   ├── event_456_pre_timestamp_random.jpg
  │   └── ...
  └── post/
      ├── event_456_post_timestamp_random.jpg
      └── ...
```

## 🔐 Security

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Secure authentication
3. **Environment Variables**: Sensitive data in .env
4. **CORS**: Configured for frontend origin
5. **Input Validation**: Mongoose schema validation

## 🧪 Testing Endpoints

You can test the API using:

### cURL Example
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","phone":"1234567890","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Postman Collection
Import these endpoints into Postman for easy testing.

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

## 🐛 Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## 📝 OTP Implementation

Current implementation is for **development/testing only**:
- Generates 6-digit random OTP
- Logs to console
- Returns OTP in response

**Production Implementation** (TODO):
```javascript
// Use Twilio for SMS
const twilio = require('twilio')
await client.messages.create({
  body: `Your OTP: ${otp}`,
  to: customerPhone,
  from: process.env.TWILIO_PHONE
})

// Use SendGrid for Email
const sgMail = require('@sendgrid/mail')
await sgMail.send({
  to: customerEmail,
  subject: 'Your OTP',
  text: `Your OTP: ${otp}`
})
```

## 🚀 Deployment

### Environment Variables for Production
- Set strong `JWT_SECRET`
- Use production MongoDB cluster
- Configure Cloudinary production account
- Set appropriate CORS origins
- Enable rate limiting
- Add request logging

### Recommended Platforms
- **Heroku**
- **Railway**
- **Render**
- **AWS EC2**
- **DigitalOcean**

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cloudinary": "^1.41.0",
  "multer": "^1.4.5-lts.1",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "nodemon": "^3.0.1" (dev)
}
```

## 🔄 Development Workflow

1. Start MongoDB (Atlas is already configured)
2. Install dependencies: `npm install`
3. Configure `.env` with Cloudinary credentials
4. Run development server: `npm run dev`
5. Test endpoints with frontend or Postman
6. Check console logs for OTP values

## 📞 Support

For issues or questions about the backend API, check:
- Console logs for errors
- MongoDB Atlas connection status
- Cloudinary dashboard for upload status
- JWT token expiration (24 hours)

---

Built with ❤️ for Zappy FullStack Internship Assessment
