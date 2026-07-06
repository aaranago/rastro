"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";

import type { SocialAuthProvider } from "~/auth/server";
import { buildAuthHomeHref, sanitizeAuthReturnTo } from "~/auth/return-to";
import { auth, getEnabledSocialAuthProviders, getSession } from "~/auth/server";
import { env } from "~/env";

const signInSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2),
});

const passwordResetRequestSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

const socialProviderSchema = z.enum(["apple", "facebook", "google"]);
type SignInCredentials = z.infer<typeof signInSchema>;
type SignUpAccount = z.infer<typeof signUpSchema>;
type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

const readString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const readReturnTo = (formData: FormData) =>
  sanitizeAuthReturnTo(readString(formData, "returnTo"));

const redirectToAuth = (status: string, returnTo?: string): never => {
  redirect(buildAuthHomeHref(status, returnTo));
};

const redirectAfterAuthSuccess = (status: string, returnTo?: string): never => {
  redirect(returnTo ?? buildAuthHomeHref(status));
};

const getAuthFailureStatus = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "Email not verified") {
    return "email-not-verified";
  }

  if (
    error.message === "User already exists." ||
    error.message === "User already exists. Use another email."
  ) {
    return "signup-email-exists";
  }

  return fallback;
};

const getPasswordResetFailureStatus = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("reset password isn't enabled") ||
    message.includes("email delivery is not configured")
  ) {
    return "password-reset-integration-needed";
  }

  return "password-reset-error";
};

const getAccountDeletionFailureStatus = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("not found") ||
    message.includes("email delivery is not configured")
  ) {
    return "account-deletion-integration-needed";
  }

  return "account-deletion-error";
};

const parseSignInCredentials = (
  formData: FormData,
  returnTo?: string,
): SignInCredentials => {
  const parsed = signInSchema.safeParse({
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("signin-invalid", returnTo);
};

const parseSignUpAccount = (
  formData: FormData,
  returnTo?: string,
): SignUpAccount => {
  const parsed = signUpSchema.safeParse({
    email: readString(formData, "email"),
    name: readString(formData, "name"),
    password: readString(formData, "password"),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("signup-invalid", returnTo);
};

const parseSocialProvider = (
  formData: FormData,
  returnTo?: string,
): SocialAuthProvider => {
  const parsed = socialProviderSchema.safeParse(
    readString(formData, "provider"),
  );

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("social-unavailable", returnTo);
};

const parsePasswordResetRequest = (
  formData: FormData,
  returnTo?: string,
): PasswordResetRequest => {
  const parsed = passwordResetRequestSchema.safeParse({
    email: readString(formData, "email"),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("password-reset-invalid", returnTo);
};

export async function signInWithEmail(formData: FormData) {
  const returnTo = readReturnTo(formData);
  const credentials = parseSignInCredentials(formData, returnTo);

  try {
    await auth.api.signInEmail({
      body: {
        callbackURL: returnTo ?? "/",
        email: credentials.email,
        password: credentials.password,
      },
    });
  } catch (error) {
    return redirectToAuth(
      getAuthFailureStatus(error, "signin-error"),
      returnTo,
    );
  }

  return redirectAfterAuthSuccess("signin-success", returnTo);
}

export async function signUpWithEmail(formData: FormData) {
  const returnTo = readReturnTo(formData);
  const account = parseSignUpAccount(formData, returnTo);
  let successStatus = "signup-success";

  try {
    const response = await auth.api.signUpEmail({
      body: {
        callbackURL: returnTo ?? "/",
        email: account.email,
        name: account.name,
        password: account.password,
      },
    });

    if (response.token === null || env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
      successStatus = "signup-verify-email";
    }
  } catch (error) {
    return redirectToAuth(
      getAuthFailureStatus(error, "signup-error"),
      returnTo,
    );
  }

  return successStatus === "signup-success"
    ? redirectAfterAuthSuccess(successStatus, returnTo)
    : redirectToAuth(successStatus, returnTo);
}

export async function signInWithSocialProvider(formData: FormData) {
  const returnTo = readReturnTo(formData);
  const provider = parseSocialProvider(formData, returnTo);
  const enabledProviders = getEnabledSocialAuthProviders();

  if (!enabledProviders.includes(provider)) {
    return redirectToAuth("social-unavailable", returnTo);
  }

  let redirectUrl: string | undefined;

  try {
    const response = await auth.api.signInSocial({
      body: {
        callbackURL: returnTo ?? "/",
        provider,
      },
    });

    redirectUrl = response.url;
  } catch (error) {
    return redirectToAuth(getAuthFailureStatus(error, "social-error"), returnTo);
  }

  if (redirectUrl === undefined) {
    return redirectToAuth("social-unavailable", returnTo);
  }

  redirect(redirectUrl);
}

export async function requestPasswordReset(formData: FormData) {
  const returnTo = readReturnTo(formData);
  const request = parsePasswordResetRequest(formData, returnTo);

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: request.email,
        redirectTo: returnTo ?? "/",
      },
      headers: await headers(),
    });
  } catch (error) {
    return redirectToAuth(getPasswordResetFailureStatus(error), returnTo);
  }

  return redirectToAuth("password-reset-sent", returnTo);
}

export async function initiateAccountDeletion() {
  const session = await getSession();

  if (!session) {
    return redirectToAuth("account-deletion-signed-out");
  }

  try {
    const response = await auth.api.deleteUser({
      body: {
        callbackURL: "/",
      },
      headers: await headers(),
    });

    if (response.message === "Verification email sent") {
      return redirectToAuth("account-deletion-verification-sent");
    }
  } catch (error) {
    return redirectToAuth(getAccountDeletionFailureStatus(error));
  }

  return redirectToAuth("account-deletion-started");
}

export async function signOut() {
  const session = await getSession();

  if (!session) {
    return redirectToAuth("signed-out");
  }

  await auth.api.signOut({
    headers: await headers(),
  });

  return redirectToAuth("signed-out");
}
