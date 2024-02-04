import nodemailer, { createTransport } from 'nodemailer';

const mailer = createTransport(process.env.EMAIL_SERVER);

const mailer = nodemailer.createTransport(process.env.EMAIL_SERVER);

export default mailer;
