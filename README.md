# Zappy Backend (Vendor Event Day Tracker API)

Node/Express API for the Zappy Vendor Event Day Tracker.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth
- Multer (uploads) + Cloudinary (image storage)
- Nodemailer (OTP emails)

## Requirements

- Node.js 18+ (recommended)
- MongoDB (local or Atlas)
- Cloudinary account (required for image uploads)
- SMTP credentials (required for OTP endpoints)

## Setup

### 1) Install

```bash
cd Zappy_backend
npm install
```

### 2) Configure environment variables

Create `Zappy_backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# CORS (optional)
# Used in server.js in addition to localhost allowlist
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/zappy

# Auth
JWT_SECRET=replace_me_with_a_long_random_secret
JWT_EXPIRE=30d

# Cloudinary (required for uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SMTP (required for OTP emails)
SMTP_HOST=smtp.gmail.com
# For cloud hosting (Render, etc.) port 587 (STARTTLS) is usually the safest choice.
# Port 25 is commonly blocked; 465 may be blocked by some hosts.
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Zappy <your_email@gmail.com>

# Optional SMTP timeouts (ms) to fail fast if ports are blocked
SMTP_CONNECTION_TIMEOUT_MS=15000
SMTP_GREETING_TIMEOUT_MS=15000
SMTP_SOCKET_TIMEOUT_MS=20000

# Optional debugging
SMTP_DEBUG=false
```

Notes:

- OTP endpoints send emails via SMTP. In `NODE_ENV=development`, the API also returns the generated OTP in the JSON response for easier local testing.
- If Cloudinary vars are missing, check-in/setup uploads will fail with a clear error message.

### 3) Run

```bash
npm run dev
```

API runs at `http://localhost:5000`.

## API

Base URL: `http://localhost:5000/api`

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (requires `Authorization: Bearer <token>`)

### Events (all require `Authorization: Bearer <token>`)

- `GET /events` (query: `includeDeleted=true` or `onlyDeleted=true`)
- `GET /events/:id` (query: `includeDeleted=true` to view soft-deleted records)
- `POST /events`
- `DELETE /events/:id` (soft delete)
- `GET /events/analytics`

#### Vendor check-in

- `POST /events/:id/checkin` (multipart/form-data)
  - `arrivalPhoto`: image file
  - `latitude`: number (string is ok)
  - `longitude`: number (string is ok)

#### Setup photos

- `POST /events/:id/setup-photos` (multipart/form-data)
  - `photos`: 1..10 image files
  - `type`: `pre` or `post`
  - `notes`: optional string

#### OTP workflow

- `POST /events/:id/start-otp` (requires check-in completed)
- `POST /events/:id/verify-start-otp` with JSON `{ "otp": "123456" }`
- `POST /events/:id/closing-otp` (requires post-setup photos uploaded)
- `POST /events/:id/verify-closing-otp` with JSON `{ "otp": "123456" }`

## Troubleshooting

- **CORS blocked**: frontend should run on `http://localhost:3000`. If you use a different origin, set `CLIENT_URL` and restart the backend.
- **OTP fails**: ensure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` are set. For Render: avoid port 25; prefer 587 with `SMTP_SECURE=false` (STARTTLS) or 465 with `SMTP_SECURE=true`.
- **Uploads fail**: ensure Cloudinary env vars are correct. “Invalid Signature” usually means the API secret is wrong.

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

## 🚀 Deployment

### Environment Variables for Production
- Set strong `JWT_SECRET`
- Use production MongoDB cluster
- Configure Cloudinary production account
- Set appropriate CORS origins
- Enable rate limiting
- Add request logging

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

#Completed

---

