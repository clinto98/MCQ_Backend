import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',  // Outlook / Microsoft SMTP server
  port: 587,                   // STARTTLS port
  secure: false,               // Use TLS, not SSL
  auth: {
    user: process.env.EMAIL_USER, // your Outlook email address
    pass: process.env.EMAIL_PASS, // your Outlook password or app password
  },
  tls: {
    ciphers: 'SSLv3',
  },
});

export const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for verification',
    text: `The generated OTP code is ${otp}. It is valid for 20 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};
