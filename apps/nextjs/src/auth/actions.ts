"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";

import type { SocialAuthProvider } from "~/auth/server";
import { auth, getEnabledSocialAuthProviders, getSession } from "~/auth/server";
import { env } from "~/env";

const signInSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2),
});

const socialProviderSchema = z.enum(["apple", "facebook", "google"]);
type SignInCredentials = z.infer<typeof signInSchema>;
type SignUpAccount = z.infer<typeof signUpSchema>;

const readString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const redirectToAuth = (status: string): never => {
  redirect(`/?auth=${status}#auth`);
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

const parseSignInCredentials = (formData: FormData): SignInCredentials => {
  const parsed = signInSchema.safeParse({
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("signin-invalid");
};

const parseSignUpAccount = (formData: FormData): SignUpAccount => {
  const parsed = signUpSchema.safeParse({
    email: readString(formData, "email"),
    name: readString(formData, "name"),
    password: readString(formData, "password"),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("signup-invalid");
};

const parseSocialProvider = (formData: FormData): SocialAuthProvider => {
  const parsed = socialProviderSchema.safeParse(
    readString(formData, "provider"),
  );

  if (parsed.success) {
    return parsed.data;
  }

  return redirectToAuth("social-unavailable");
};

export async function signInWithEmail(formData: FormData) {
  const credentials = parseSignInCredentials(formData);

  try {
    await auth.api.signInEmail({
      body: {
        callbackURL: "/",
        email: credentials.email,
        password: credentials.password,
      },
    });
  } catch (error) {
    return redirectToAuth(getAuthFailureStatus(error, "signin-error"));
  }

  return redirectToAuth("signin-success");
}

export async function signUpWithEmail(formData: FormData) {
  const account = parseSignUpAccount(formData);
  let successStatus = "signup-success";

  try {
    const response = await auth.api.signUpEmail({
      body: {
        callbackURL: "/",
        email: account.email,
        name: account.name,
        password: account.password,
      },
    });

    if (response.token === null || env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
      successStatus = "signup-verify-email";
    }
  } catch (error) {
    return redirectToAuth(getAuthFailureStatus(error, "signup-error"));
  }

  return redirectToAuth(successStatus);
}

export async function signInWithSocialProvider(formData: FormData) {
  const provider = parseSocialProvider(formData);
  const enabledProviders = getEnabledSocialAuthProviders();

  if (!enabledProviders.includes(provider)) {
    return redirectToAuth("social-unavailable");
  }

  let redirectUrl: string | undefined;

  try {
    const response = await auth.api.signInSocial({
      body: {
        callbackURL: "/",
        provider,
      },
    });

    redirectUrl = response.url;
  } catch (error) {
    return redirectToAuth(getAuthFailureStatus(error, "social-error"));
  }

  if (redirectUrl === undefined) {
    return redirectToAuth("social-unavailable");
  }

  redirect(redirectUrl);
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
