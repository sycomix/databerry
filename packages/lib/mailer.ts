import nodemailer from 'nodemailer';

import smtpTransport from 'nodemailer-smtp-transport';

const options = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

const mailer = nodemailer.createTransport(smtpTransport(options));

export default mailer;
