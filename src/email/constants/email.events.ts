export const EmailEvents = {
  USER_REGISTERED: 'user.registered',
  FORGOT_PASSWORD: 'auth.forgot-password',
  PASSWORD_CHANGED: 'auth.password-changed',
  EMAIL_CHANGE_REQUESTED: 'user.email-change-requested',
  EMAIL_CHANGE_CONFIRMED: 'user.email-change-confirmed',
  /** Identity-proof code delivered to the address the account currently has (S10). */
  EMAIL_CHANGE_CODE_REQUESTED: 'user.email-change-code-requested',
  /** Notice sent to the *previous* address once the change is applied (S12, S13). */
  EMAIL_CHANGE_REQUESTED_OLD: 'user.email-change-requested-old',
  /** The change was undone from the revert link; both addresses are told (S5). */
  EMAIL_CHANGE_REVERTED: 'user.email-change-reverted',
  RESEND_VERIFICATION: 'auth.resend-verification',
} as const;

export type EmailEventType = (typeof EmailEvents)[keyof typeof EmailEvents];
