import assert from 'assert';
import nodemailer from 'nodemailer';

assert.ok(process.env.EMAIL_SERVER, 'The EMAIL_SERVER environment variable is not set.');
const mailer = nodemailer.createTransport(process.env.EMAIL_SERVER);

export default mailer;
