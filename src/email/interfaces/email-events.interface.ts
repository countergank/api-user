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

export interface ResendVerificationEvent {
  userId: string;
  email: string;
  name: string;
  verificationToken: string;
  lang?: string;
}
