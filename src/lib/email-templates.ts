import type { AppLocale } from "@/i18n/routing";

/**
 * Transactional emails are plain server-rendered strings, not React
 * components, so they don't go through next-intl's message catalogs — but
 * they're still user-facing copy, so every locale gets a real translation
 * here rather than a single hardcoded language (02_PRD.md Section 2).
 */
type EmailContent = { subject: string; html: string; text: string };

const VERIFICATION_COPY: Record<AppLocale, (link: string) => EmailContent> = {
  en: (link) => ({
    subject: "Verify your email for On-Time",
    text: `Welcome to On-Time! Verify your email to activate your account:\n${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Welcome to On-Time! Verify your email to activate your account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  }),
  ru: (link) => ({
    subject: "Подтвердите ваш email для On-Time",
    text: `Добро пожаловать в On-Time! Подтвердите email, чтобы активировать аккаунт:\n${link}\n\nСсылка действительна 24 часа.`,
    html: `<p>Добро пожаловать в On-Time! Подтвердите email, чтобы активировать аккаунт:</p><p><a href="${link}">${link}</a></p><p>Ссылка действительна 24 часа.</p>`,
  }),
  hy: (link) => ({
    subject: "Հաստատեք ձեր էլ. հասցեն On-Time-ի համար",
    text: `Բարի գալուստ On-Time! Հաստատեք ձեր էլ. հասցեն՝ հաշիվն ակտիվացնելու համար.\n${link}\n\nՀղումը վավեր է 24 ժամ։`,
    html: `<p>Բարի գալուստ On-Time! Հաստատեք ձեր էլ. հասցեն՝ հաշիվն ակտիվացնելու համար.</p><p><a href="${link}">${link}</a></p><p>Հղումը վավեր է 24 ժամ։</p>`,
  }),
};

const PASSWORD_RESET_COPY: Record<AppLocale, (link: string) => EmailContent> = {
  en: (link) => ({
    subject: "Reset your On-Time password",
    text: `We received a request to reset your password. Reset it here:\n${link}\n\nIf you didn't request this, you can ignore this email. This link expires in 1 hour.`,
    html: `<p>We received a request to reset your password. Reset it here:</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>`,
  }),
  ru: (link) => ({
    subject: "Сброс пароля On-Time",
    text: `Мы получили запрос на сброс пароля. Сбросить пароль:\n${link}\n\nЕсли вы не запрашивали это, просто проигнорируйте письмо. Ссылка действительна 1 час.`,
    html: `<p>Мы получили запрос на сброс пароля. Сбросить пароль:</p><p><a href="${link}">${link}</a></p><p>Если вы не запрашивали это, просто проигнорируйте письмо. Ссылка действительна 1 час.</p>`,
  }),
  hy: (link) => ({
    subject: "On-Time գաղտնաբառի վերականգնում",
    text: `Ստացել ենք ձեր գաղտնաբառը վերականգնելու հայտ։ Վերականգնեք այստեղ.\n${link}\n\nԵթե դուք չեք ուղարկել այս հայտը, պարզապես անտեսեք այս նամակը։ Հղումը վավեր է 1 ժամ։`,
    html: `<p>Ստացել ենք ձեր գաղտնաբառը վերականգնելու հայտ։ Վերականգնեք այստեղ.</p><p><a href="${link}">${link}</a></p><p>Եթե դուք չեք ուղարկել այս հայտը, պարզապես անտեսեք այս նամակը։ Հղումը վավեր է 1 ժամ։</p>`,
  }),
};

export function buildVerificationEmail(locale: AppLocale, link: string): EmailContent {
  return VERIFICATION_COPY[locale](link);
}

export function buildPasswordResetEmail(locale: AppLocale, link: string): EmailContent {
  return PASSWORD_RESET_COPY[locale](link);
}
