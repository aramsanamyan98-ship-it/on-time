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

// Guest-facing appointment notifications (02_PRD.md Section 9, 08_Roadmap.md
// Phase 6). `dateTime` arrives pre-formatted (specialist's timezone, guest's
// locale — see src/lib/notifications/send.ts) so this module stays a pure
// string-template layer with no date-math of its own. Every notification
// includes the guest's private manage-booking link (02_PRD.md Section 8a).
export type AppointmentEmailParams = {
  guestName: string;
  specialistName: string;
  serviceName: string;
  dateTime: string;
  manageLink: string;
};

const BOOKING_CONFIRMATION_COPY: Record<AppLocale, (p: AppointmentEmailParams) => EmailContent> = {
  en: (p) => ({
    subject: `Your appointment with ${p.specialistName} is confirmed`,
    text: `Hi ${p.guestName},\n\nYour appointment is confirmed:\n\n${p.serviceName} with ${p.specialistName}\n${p.dateTime}\n\nNeed to reschedule or cancel? Manage your booking here:\n${p.manageLink}\n\nSee you soon!`,
    html: `<p>Hi ${p.guestName},</p><p>Your appointment is confirmed:</p><p><strong>${p.serviceName}</strong> with ${p.specialistName}<br>${p.dateTime}</p><p>Need to reschedule or cancel? <a href="${p.manageLink}">Manage your booking here</a>.</p><p>See you soon!</p>`,
  }),
  ru: (p) => ({
    subject: `Ваша запись к ${p.specialistName} подтверждена`,
    text: `Здравствуйте, ${p.guestName}!\n\nВаша запись подтверждена:\n\n${p.serviceName} у ${p.specialistName}\n${p.dateTime}\n\nНужно перенести или отменить запись? Управляйте записью здесь:\n${p.manageLink}\n\nДо встречи!`,
    html: `<p>Здравствуйте, ${p.guestName}!</p><p>Ваша запись подтверждена:</p><p><strong>${p.serviceName}</strong> у ${p.specialistName}<br>${p.dateTime}</p><p>Нужно перенести или отменить запись? <a href="${p.manageLink}">Управляйте записью здесь</a>.</p><p>До встречи!</p>`,
  }),
  hy: (p) => ({
    subject: `Ձեր ամրագրումը ${p.specialistName}-ի մոտ հաստատված է`,
    text: `Բարև Ձեզ, ${p.guestName}։\n\nՁեր ամրագրումը հաստատված է․\n\n${p.serviceName} — ${p.specialistName}\n${p.dateTime}\n\nՊե՞տք է փոփոխել ժամը կամ չեղարկել։ Կառավարեք ձեր ամրագրումն այստեղ.\n${p.manageLink}\n\nՏեսնվում ենք շուտով!`,
    html: `<p>Բարև Ձեզ, ${p.guestName}։</p><p>Ձեր ամրագրումը հաստատված է․</p><p><strong>${p.serviceName}</strong> — ${p.specialistName}<br>${p.dateTime}</p><p>Պե՞տք է փոփոխել ժամը կամ չեղարկել։ <a href="${p.manageLink}">Կառավարեք ձեր ամրագրումն այստեղ</a>։</p><p>Տեսնվում ենք շուտով!</p>`,
  }),
};

const REMINDER_COPY: Record<AppLocale, (p: AppointmentEmailParams) => EmailContent> = {
  en: (p) => ({
    subject: `Reminder: your appointment with ${p.specialistName} is coming up`,
    text: `Hi ${p.guestName},\n\nJust a reminder about your upcoming appointment:\n\n${p.serviceName} with ${p.specialistName}\n${p.dateTime}\n\nNeed to reschedule or cancel? Manage your booking here:\n${p.manageLink}\n\nSee you soon!`,
    html: `<p>Hi ${p.guestName},</p><p>Just a reminder about your upcoming appointment:</p><p><strong>${p.serviceName}</strong> with ${p.specialistName}<br>${p.dateTime}</p><p>Need to reschedule or cancel? <a href="${p.manageLink}">Manage your booking here</a>.</p><p>See you soon!</p>`,
  }),
  ru: (p) => ({
    subject: `Напоминание: скоро ваша запись к ${p.specialistName}`,
    text: `Здравствуйте, ${p.guestName}!\n\nНапоминаем о предстоящей записи:\n\n${p.serviceName} у ${p.specialistName}\n${p.dateTime}\n\nНужно перенести или отменить запись? Управляйте записью здесь:\n${p.manageLink}\n\nДо встречи!`,
    html: `<p>Здравствуйте, ${p.guestName}!</p><p>Напоминаем о предстоящей записи:</p><p><strong>${p.serviceName}</strong> у ${p.specialistName}<br>${p.dateTime}</p><p>Нужно перенести или отменить запись? <a href="${p.manageLink}">Управляйте записью здесь</a>.</p><p>До встречи!</p>`,
  }),
  hy: (p) => ({
    subject: `Հիշեցում․ շուտով ${p.specialistName}-ի մոտ ամրագրումն է`,
    text: `Բարև Ձեզ, ${p.guestName}։\n\nՀիշեցնում ենք առաջիկա ամրագրման մասին․\n\n${p.serviceName} — ${p.specialistName}\n${p.dateTime}\n\nՊե՞տք է փոփոխել ժամը կամ չեղարկել։ Կառավարեք ձեր ամրագրումն այստեղ.\n${p.manageLink}\n\nՏեսնվում ենք շուտով!`,
    html: `<p>Բարև Ձեզ, ${p.guestName}։</p><p>Հիշեցնում ենք առաջիկա ամրագրման մասին․</p><p><strong>${p.serviceName}</strong> — ${p.specialistName}<br>${p.dateTime}</p><p>Պե՞տք է փոփոխել ժամը կամ չեղարկել։ <a href="${p.manageLink}">Կառավարեք ձեր ամրագրումն այստեղ</a>։</p><p>Տեսնվում ենք շուտով!</p>`,
  }),
};

export function buildBookingConfirmationEmail(locale: AppLocale, params: AppointmentEmailParams): EmailContent {
  return BOOKING_CONFIRMATION_COPY[locale](params);
}

export function buildReminderEmail(locale: AppLocale, params: AppointmentEmailParams): EmailContent {
  return REMINDER_COPY[locale](params);
}

// Specialist-facing alerts (02_PRD.md Section 9 "New booking notification
// sent to specialist"; 07_Business_Rules.md "the specialist is notified
// whenever a guest cancels or reschedules via their link, the same as if
// the specialist had made the change"). Sent in the specialist's own
// dashboard language (language_preference), independent of the guest's
// booking language (02_PRD.md Section 2) — see src/lib/notifications/send.ts.
export type SpecialistAlertEmailParams = {
  guestName: string;
  guestPhone: string;
  serviceName: string;
  dateTime: string;
  dashboardLink: string;
};

const NEW_BOOKING_ALERT_COPY: Record<AppLocale, (p: SpecialistAlertEmailParams) => EmailContent> = {
  en: (p) => ({
    subject: `New booking: ${p.guestName} — ${p.serviceName}`,
    text: `You have a new booking:\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\n${p.dateTime}\n\nView it in your dashboard:\n${p.dashboardLink}`,
    html: `<p>You have a new booking:</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>${p.dateTime}</p><p><a href="${p.dashboardLink}">View it in your dashboard</a>.</p>`,
  }),
  ru: (p) => ({
    subject: `Новая запись: ${p.guestName} — ${p.serviceName}`,
    text: `У вас новая запись:\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\n${p.dateTime}\n\nПосмотреть в панели управления:\n${p.dashboardLink}`,
    html: `<p>У вас новая запись:</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>${p.dateTime}</p><p><a href="${p.dashboardLink}">Посмотреть в панели управления</a>.</p>`,
  }),
  hy: (p) => ({
    subject: `Նոր ամրագրում․ ${p.guestName} — ${p.serviceName}`,
    text: `Դուք ունեք նոր ամրագրում.\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\n${p.dateTime}\n\nԴիտեք այն ձեր վահանակում.\n${p.dashboardLink}`,
    html: `<p>Դուք ունեք նոր ամրագրում.</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>${p.dateTime}</p><p><a href="${p.dashboardLink}">Դիտեք այն ձեր վահանակում</a>։</p>`,
  }),
};

const GUEST_CANCELLED_ALERT_COPY: Record<AppLocale, (p: SpecialistAlertEmailParams) => EmailContent> = {
  en: (p) => ({
    subject: `Booking cancelled: ${p.guestName} — ${p.serviceName}`,
    text: `A guest has cancelled their booking:\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\n${p.dateTime}\n\nView your calendar:\n${p.dashboardLink}`,
    html: `<p>A guest has cancelled their booking:</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>${p.dateTime}</p><p><a href="${p.dashboardLink}">View your calendar</a>.</p>`,
  }),
  ru: (p) => ({
    subject: `Запись отменена: ${p.guestName} — ${p.serviceName}`,
    text: `Клиент отменил запись:\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\n${p.dateTime}\n\nПосмотреть календарь:\n${p.dashboardLink}`,
    html: `<p>Клиент отменил запись:</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>${p.dateTime}</p><p><a href="${p.dashboardLink}">Посмотреть календарь</a>.</p>`,
  }),
  hy: (p) => ({
    subject: `Ամրագրումը չեղարկվել է․ ${p.guestName} — ${p.serviceName}`,
    text: `Հաճախորդը չեղարկել է իր ամրագրումը.\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\n${p.dateTime}\n\nԴիտեք ձեր օրացույցը.\n${p.dashboardLink}`,
    html: `<p>Հաճախորդը չեղարկել է իր ամրագրումը.</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>${p.dateTime}</p><p><a href="${p.dashboardLink}">Դիտեք ձեր օրացույցը</a>։</p>`,
  }),
};

const GUEST_RESCHEDULED_ALERT_COPY: Record<AppLocale, (p: SpecialistAlertEmailParams) => EmailContent> = {
  en: (p) => ({
    subject: `Booking rescheduled: ${p.guestName} — ${p.serviceName}`,
    text: `A guest has rescheduled their booking to a new time:\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\nNew time: ${p.dateTime}\n\nView your calendar:\n${p.dashboardLink}`,
    html: `<p>A guest has rescheduled their booking to a new time:</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>New time: ${p.dateTime}</p><p><a href="${p.dashboardLink}">View your calendar</a>.</p>`,
  }),
  ru: (p) => ({
    subject: `Запись перенесена: ${p.guestName} — ${p.serviceName}`,
    text: `Клиент перенёс свою запись на новое время:\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\nНовое время: ${p.dateTime}\n\nПосмотреть календарь:\n${p.dashboardLink}`,
    html: `<p>Клиент перенёс свою запись на новое время:</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>Новое время: ${p.dateTime}</p><p><a href="${p.dashboardLink}">Посмотреть календарь</a>.</p>`,
  }),
  hy: (p) => ({
    subject: `Ամրագրման ժամը փոփոխվել է․ ${p.guestName} — ${p.serviceName}`,
    text: `Հաճախորդը փոփոխել է իր ամրագրման ժամը.\n\n${p.serviceName}\n${p.guestName} · ${p.guestPhone}\nՆոր ժամը՝ ${p.dateTime}\n\nԴիտեք ձեր օրացույցը.\n${p.dashboardLink}`,
    html: `<p>Հաճախորդը փոփոխել է իր ամրագրման ժամը.</p><p><strong>${p.serviceName}</strong><br>${p.guestName} · ${p.guestPhone}<br>Նոր ժամը՝ ${p.dateTime}</p><p><a href="${p.dashboardLink}">Դիտեք ձեր օրացույցը</a>։</p>`,
  }),
};

export function buildNewBookingAlertEmail(locale: AppLocale, params: SpecialistAlertEmailParams): EmailContent {
  return NEW_BOOKING_ALERT_COPY[locale](params);
}

export function buildGuestCancelledAlertEmail(locale: AppLocale, params: SpecialistAlertEmailParams): EmailContent {
  return GUEST_CANCELLED_ALERT_COPY[locale](params);
}

export function buildGuestRescheduledAlertEmail(locale: AppLocale, params: SpecialistAlertEmailParams): EmailContent {
  return GUEST_RESCHEDULED_ALERT_COPY[locale](params);
}
