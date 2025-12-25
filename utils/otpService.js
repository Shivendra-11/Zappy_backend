import nodemailer from 'nodemailer';

const asPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toPublicSmtpErrorMessage = (err) => {
  const code = err?.code;
  const responseCode = err?.responseCode;
  const command = err?.command;
  const message = String(err?.message || '');

  // Auth failures
  if (code === 'EAUTH' || responseCode === 535 || /auth|login|password|username/i.test(message)) {
    return 'SMTP authentication failed. Verify SMTP_USER/SMTP_PASS (Gmail requires an App Password) and redeploy.';
  }

  // DNS / host issues
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || /getaddrinfo/i.test(message)) {
    return 'SMTP host could not be resolved. Check SMTP_HOST and redeploy.';
  }

  // Timeouts / connection issues (common on PaaS if using blocked ports like 25)
  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'EHOSTUNREACH' ||
    command === 'CONN' ||
    /timeout/i.test(message)
  ) {
    return 'Email service connection timed out. On Render, avoid SMTP port 25; prefer 587 (STARTTLS) or 465 (SSL). Verify SMTP_HOST/SMTP_PORT/SMTP_SECURE and that your email provider allows SMTP from cloud hosts.';
  }

  // TLS / certificates
  if (/tls|ssl|certificate|handshake/i.test(message)) {
    return 'SMTP TLS/SSL negotiation failed. Verify SMTP_PORT + SMTP_SECURE (587 => false, 465 => true) and your provider TLS settings.';
  }

  return 'Failed to send OTP email due to an email service error. Please verify SMTP settings and try again.';
};

// Generate random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Reuse a single transporter instance
let cachedTransporter;
let smtpVerified = false;
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in backend/.env');
  }

  // Gmail app passwords are often copied with spaces (e.g. "xxxx xxxx xxxx xxxx").
  // Remove whitespace to avoid auth issues.
  const normalizedPass = String(SMTP_PASS).replace(/\s+/g, '');

  const port = Number(SMTP_PORT);
  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
    auth: {
      user: SMTP_USER,
      pass: normalizedPass
    },
    // Fail fast rather than hanging on network blocks/firewalls.
    connectionTimeout: asPositiveInt(process.env.SMTP_CONNECTION_TIMEOUT_MS, 15000),
    greetingTimeout: asPositiveInt(process.env.SMTP_GREETING_TIMEOUT_MS, 15000),
    socketTimeout: asPositiveInt(process.env.SMTP_SOCKET_TIMEOUT_MS, 20000),
    // Set SMTP_DEBUG=true if you want full nodemailer SMTP logs
    ...(process.env.SMTP_DEBUG === 'true' ? { logger: true, debug: true } : {})
  });

  return cachedTransporter;
};

// Send OTP to customer's email (and log phone for SMS gateway use if added later)
export const sendOTP = async (phone, email, otp) => {
  const toEmail = typeof email === 'string' ? email.trim() : '';
  if (!toEmail) {
    throw new Error('Customer email is missing; cannot send OTP');
  }

  const transporter = getTransporter();

  // Verify SMTP once in development so auth/port problems show clearly.
  if (process.env.NODE_ENV === 'development' && !smtpVerified) {
    try {
      await transporter.verify();
      smtpVerified = true;
      console.log('[SMTP] Verified OK');
    } catch (err) {
      console.error('[SMTP] Verify failed:', err?.message || err);
      throw err;
    }
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: 'Your verification code',
    text: `Your Zappy verification code is ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <p style="font-size: 20px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p>
        ${phone ? `<p>We have this phone on file: ${phone}</p>` : ''}
      </div>
    `
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`[OTP] Sending OTP email to: ${toEmail} (phone: ${phone || 'N/A'}) | OTP: ${otp}`);
  } else {
    console.log(`[OTP] Sending OTP email to: ${toEmail} (phone: ${phone || 'N/A'})`);
  }

  let info;
  try {
    info = await transporter.sendMail(mailOptions);
  } catch (err) {
    // Log the internal error for server-side debugging.
    console.error('[OTP] Email send failed:', {
      code: err?.code,
      command: err?.command,
      responseCode: err?.responseCode,
      message: err?.message
    });
    throw new Error(toPublicSmtpErrorMessage(err));
  }

  console.log('[OTP] Email send result:', {
    to: toEmail,
    messageId: info?.messageId,
    accepted: info?.accepted,
    rejected: info?.rejected,
    response: info?.response
  });

  return {
    success: true,
    message: `OTP sent successfully to ${toEmail}`,
    messageId: info?.messageId
  };
};
