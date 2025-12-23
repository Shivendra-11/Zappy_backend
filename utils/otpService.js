// Generate random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Mock OTP sending (in production, use SMS/Email service)
export const sendOTP = async (phone, email, otp) => {
  console.log(`\n=== OTP SENT ===`);
  console.log(`Phone: ${phone}`);
  console.log(`Email: ${email}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`================\n`);
  
  // In production, integrate with SMS service like Twilio
  // or Email service like SendGrid/Nodemailer
  
  return {
    success: true,
    message: `OTP sent successfully to ${email}`
  };
};
