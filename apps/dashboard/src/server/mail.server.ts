import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "./env.server";

// Outgoing email (invites, password resets) over SMTP: Mailpit locally, any provider when hosted
// (Resend, Postmark, SES, …). SMTP_URL like smtp://user:pass@host:587; MAIL_FROM is the sender.

let transport: Transporter | undefined;

export async function sendMail(message: { to: string; subject: string; text: string }) {
	const env = serverEnv();
	transport ??= nodemailer.createTransport(env.SMTP_URL);
	await transport.sendMail({
		from: env.MAIL_FROM,
		...message,
	});
}
