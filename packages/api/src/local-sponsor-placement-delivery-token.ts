import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import type { LocalSponsorPlacementSurface } from "@acme/validators";
import { localSponsorPlacementSurfaceSchema } from "@acme/validators";

export const sponsorDeliveryTokenTtlMs = 15 * 60 * 1000;

export interface SponsorDeliveryTokenPayload {
  expiresAt: string;
  placementId: string;
  providerId: string;
  surface: LocalSponsorPlacementSurface;
  version: 1;
}

export class SponsorDeliveryTokenError extends Error {
  readonly code: "expired" | "invalid";

  constructor(code: "expired" | "invalid", message: string) {
    super(message);
    this.code = code;
    this.name = "SponsorDeliveryTokenError";
  }
}

export function createSponsorDeliveryToken(input: {
  expiresAt?: Date;
  now?: Date;
  placementId: string;
  providerId: string;
  secret?: string;
  surface: LocalSponsorPlacementSurface;
}) {
  const now = input.now ?? new Date();
  const expiresAt =
    input.expiresAt ?? new Date(now.getTime() + sponsorDeliveryTokenTtlMs);
  const payload: SponsorDeliveryTokenPayload = {
    expiresAt: expiresAt.toISOString(),
    placementId: input.placementId,
    providerId: input.providerId,
    surface: input.surface,
    version: 1,
  };
  const encryptedPayload = encryptSponsorDeliveryTokenPayload(
    JSON.stringify(payload),
    input.secret,
  );

  return [
    "v1",
    encryptedPayload.initializationVector,
    encryptedPayload.ciphertext,
    encryptedPayload.authenticationTag,
  ].join(".");
}

export function verifySponsorDeliveryToken(
  token: string,
  options: { now?: Date; secret?: string } = {},
): SponsorDeliveryTokenPayload {
  const [version, initializationVector, ciphertext, authenticationTag, extra] =
    token.split(".");

  if (
    version !== "v1" ||
    !initializationVector ||
    !ciphertext ||
    !authenticationTag ||
    extra !== undefined
  ) {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "Sponsor delivery token is malformed.",
    );
  }

  const payload = parseSponsorDeliveryTokenPayload(
    decryptSponsorDeliveryTokenPayload(
      {
        authenticationTag,
        ciphertext,
        initializationVector,
      },
      options.secret,
    ),
  );
  const expiresAt = Date.parse(payload.expiresAt);

  if (!Number.isFinite(expiresAt)) {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "Sponsor delivery token expiry is invalid.",
    );
  }

  if (expiresAt <= (options.now ?? new Date()).getTime()) {
    throw new SponsorDeliveryTokenError(
      "expired",
      "Sponsor delivery token has expired.",
    );
  }

  return payload;
}

function parseSponsorDeliveryTokenPayload(
  payload: string,
): SponsorDeliveryTokenPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "Sponsor delivery token payload is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "Sponsor delivery token payload is not an object.",
    );
  }

  const surfaceResult = localSponsorPlacementSurfaceSchema.safeParse(
    parsed.surface,
  );

  if (
    parsed.version !== 1 ||
    typeof parsed.expiresAt !== "string" ||
    typeof parsed.placementId !== "string" ||
    typeof parsed.providerId !== "string" ||
    !surfaceResult.success
  ) {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "Sponsor delivery token payload is incomplete.",
    );
  }

  return {
    expiresAt: parsed.expiresAt,
    placementId: parsed.placementId,
    providerId: parsed.providerId,
    surface: surfaceResult.data,
    version: 1,
  };
}

function resolveSponsorDeliveryTokenSecret(secret?: string) {
  const configured =
    secret ??
    process.env.RASTRO_SPONSOR_DELIVERY_TOKEN_SECRET ??
    process.env.RASTRO_JOB_SECRET ??
    process.env.AUTH_SECRET;
  const trimmed = configured?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (process.env.NODE_ENV === "production") {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "RASTRO_SPONSOR_DELIVERY_TOKEN_SECRET or RASTRO_JOB_SECRET is required.",
    );
  }

  return "dev-only-rastro-sponsor-delivery-token-secret";
}

function encryptSponsorDeliveryTokenPayload(payload: string, secret?: string) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    sponsorDeliveryTokenKey(secret),
    initializationVector,
  );
  const ciphertext = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);

  return {
    authenticationTag: base64UrlEncode(cipher.getAuthTag()),
    ciphertext: base64UrlEncode(ciphertext),
    initializationVector: base64UrlEncode(initializationVector),
  };
}

function decryptSponsorDeliveryTokenPayload(
  encryptedPayload: {
    authenticationTag: string;
    ciphertext: string;
    initializationVector: string;
  },
  secret?: string,
) {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      sponsorDeliveryTokenKey(secret),
      base64UrlDecode(encryptedPayload.initializationVector),
    );
    decipher.setAuthTag(base64UrlDecode(encryptedPayload.authenticationTag));

    return Buffer.concat([
      decipher.update(base64UrlDecode(encryptedPayload.ciphertext)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new SponsorDeliveryTokenError(
      "invalid",
      "Sponsor delivery token could not be decrypted.",
    );
  }
}

function sponsorDeliveryTokenKey(secret?: string) {
  return createHash("sha256")
    .update(resolveSponsorDeliveryTokenSecret(secret))
    .digest();
}

function base64UrlEncode(value: Buffer) {
  return value.toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
