import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  } else {
    // No SMTP configured (local dev): log emails instead of sending them.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const from = process.env.SMTP_FROM ?? "On-Time <no-reply@ontime.am>";
  const info = await getTransporter().sendMail({ from, to, subject, html, text });

  if (!process.env.SMTP_HOST) {
    console.log(`[dev mailer] Email to ${to}: ${subject}\n${text}`);
    console.log(`[dev mailer] message id: ${info.messageId}`);
  }
}
