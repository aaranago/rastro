# Use Better Auth for v1 authentication

Rastro needs email/password, Google, Facebook, and iOS-compatible social authentication, but zero auth spend is a hard constraint. We will use Better Auth for v1 instead of Clerk so user identity and auth cost remain under Rastro's control, accepting more implementation and security-hardening work in exchange for avoiding per-user vendor pricing and lock-in.
