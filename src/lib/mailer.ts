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

  if (!process.env.SMTP_HOST) {
    const info = await getTransporter().sendMail({ from, to, subject, html, text });
    console.log(`[dev mailer] Email to ${to}: ${subject}\n${text}`);
    console.log(`[dev mailer] message id: ${info.messageId}`);
    return;
  }

  try {
    const info = await getTransporter().sendMail({ from, to, subject, html, text });
    // accepted/rejected split matters: Gmail can return 250 OK for the SMTP
    // transaction while still listing the recipient as rejected.
    console.log(
      `[mailer] sent to ${to}: messageId=${info.messageId} response="${info.response}" accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`,
    );
  } catch (err) {
    const smtpErr = err as NodeJS.ErrnoException & {
      response?: string;
      responseCode?: number;
      command?: string;
    };
    console.error(
      `[mailer] send to ${to} FAILED: code=${smtpErr.code} responseCode=${smtpErr.responseCode} command=${smtpErr.command} response="${smtpErr.response}" message="${smtpErr.message}"`,
    );
    throw err;
  }
}
