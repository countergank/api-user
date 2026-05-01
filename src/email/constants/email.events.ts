export const EmailEvents = {
  USER_REGISTERED: 'user.registered',
  FORGOT_PASSWORD: 'auth.forgot-password',
  PASSWORD_CHANGED: 'auth.password-changed',
  EMAIL_CHANGE_REQUESTED: 'user.email-change-requested',
  EMAIL_CHANGE_CONFIRMED: 'user.email-change-confirmed',
  RESEND_VERIFICATION: 'auth.resend-verification',
} as const;

export type EmailEventType = (typeof EmailEvents)[keyof typeof EmailEvents];
