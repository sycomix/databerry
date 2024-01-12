import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  // transporter configuration
});

class Mailer {
  transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = transporter;
  }

  sendMail(options: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> {
    return this.transporter.sendMail(options);
  }
}

export default new Mailer();
