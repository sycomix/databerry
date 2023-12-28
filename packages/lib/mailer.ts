import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);

if (!transporter || typeof transporter !== 'object' || !transporter.transport) {
 console.error('Failed to create transport: Invalid configuration');
 throw new Error('Invalid transport configuration');
}
transporter.mailer = transporter;

export default transporter;

export default mailer;
