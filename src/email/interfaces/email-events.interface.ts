export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  verificationToken: string;
  lang?: string;
}

export interface ForgotPasswordEvent {
  userId: string;
  email: string;
  name: string;
  resetToken: string;
  lang?: string;
}

export interface PasswordChangedEvent {
  userId: string;
  email: string;
  name: string;
  lang?: string;
}

export interface EmailChangeRequestedEvent {
  userId: string;
  newEmail: string;
  name: string;
  pendingEmailToken: string;
  lang?: string;
}

export interface EmailChangeConfirmedEvent {
  userId: string;
  email: string;
  name: string;
  lang?: string;
}

/**
 * Identity-proof code sent to the address the account already has (S10).
 * `code` only lives in this payload and in the rendered email — it is never
 * persisted, logged or returned over HTTP (S8).
 */
export interface EmailChangeCodeRequestedEvent {
  userId: string;
  email: string;
  name: string;
  code: string;
  expiresAt: Date;
  lang?: string;
}

/**
 * Warning sent to the address the account used to have, so its owner can undo
 * the change with the revert link during the next 72 h (S12, S13).
 */
export interface EmailChangeRequestedOldEvent {
  userId: string;
  previousEmail: string;
  newEmail: string;
  name: string;
  revertToken: string;
  lang?: string;
}

export interface EmailChangeRevertedEvent {
  userId: string;
  email: string;
  name: string;
  lang?: string;
}

/**
 * Informational notice to the current address when an administrator started the
 * change (issue #556 S8). No action is required from this mailbox: identity is
 * proven on the NEW address via the confirmation link. The confirmation token
 * deliberately does not travel here (review R1): the notice is informational
 * and the token must only reach the new mailbox.
 */
export interface EmailChangeAdminRequestedEvent {
  userId: string;
  email: string;
  newEmail: string;
  name: string;
  lang?: string;
}

/**
 * Notice to the current address when an administrator canceled the pending
 * change before it was confirmed (issue #556 S9). The account keeps this
 * address; no action is required.
 */
export interface EmailChangeCanceledEvent {
  userId: string;
  email: string;
  canceledEmail: string;
  name: string;
  lang?: string;
}

export interface ResendVerificationEvent {
  userId: string;
  email: string;
  name: string;
  verificationToken: string;
  lang?: string;
}
