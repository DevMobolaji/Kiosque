export enum AuditAction {
  // User auth
  USER_REGISTER = 'user.register',
  USER_REGISTER_DUPLICATE = 'user.register.duplicate_attempt',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_LOGOUT_ALL = 'user.logout.all',
  USER_PASSWORD_CHANGE = 'user.password.change',
  USER_PASSWORD_RESET_REQUEST = 'user.password.reset_request',
  USER_PASSWORD_RESET_COMPLETE = 'user.password.reset_complete',
  USER_EMAIL_VERIFY_REQUEST = 'user.email.verify_request',
  USER_EMAIL_VERIFY_COMPLETE = 'user.email.verify_complete',
  USER_PROFILE_UPDATE = 'user.profile.update',
  USER_DELETE = 'user.delete',
}