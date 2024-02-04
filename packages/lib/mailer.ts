import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);
const mailer = nodemailer.createTransport(transporter);

export default mailer;
