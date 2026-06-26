import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface MediaStorageConfig {
  accessKeyId: string;
  allowedMimeTypes: string[];
  bucket: string;
  deliveryBaseUrl: string | null;
  forcePathStyle: boolean;
  internalEndpoint: string | null;
  maxImageBytes: number;
  presignEndpoint: string | null;
  presignExpiresSeconds: number;
  region: string;
  secretAccessKey: string;
  tls: boolean;
}

const defaultAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

function requiredEnv(env: Record<string, string | undefined>, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function optionalEnv(env: Record<string, string | undefined>, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    return null;
  }

  return value;
}

export function buildMediaDeliveryUrl(
  deliveryBaseUrl: string | null,
  objectKey: string,
) {
  const baseUrl = deliveryBaseUrl?.trim();
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${objectKey.replace(/^\/+/, "")}`;
}

export function buildRequestMediaDeliveryBaseUrl(
  headers: Headers,
  path = "/api/report-media",
) {
  const host =
    firstForwardedHeaderValue(headers.get("x-forwarded-host")) ??
    firstForwardedHeaderValue(headers.get("host"));

  if (!host) {
    return null;
  }

  const protocol =
    firstForwardedHeaderValue(headers.get("x-forwarded-proto")) ??
    (isLocalHost(host) ? "http" : "https");

  return `${protocol}://${host}${path}`;
}

export function resolveMediaDeliveryBaseUrl({
  configuredDeliveryBaseUrl,
  headers,
}: {
  configuredDeliveryBaseUrl: string | null;
  headers: Headers;
}) {
  const configured = configuredDeliveryBaseUrl?.trim();

  if (configured !== undefined && configured.length > 0) {
    return configured;
  }

  return buildRequestMediaDeliveryBaseUrl(headers);
}

function firstForwardedHeaderValue(value: string | null) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .find(Boolean);
}

function isLocalHost(host: string) {
  const normalizedHost = host.toLowerCase().split(":")[0] ?? "";

  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "10.0.2.2" ||
    normalizedHost === "::1"
  );
}

function booleanEnv(
  env: Record<string, string | undefined>,
  key: string,
  fallback: boolean,
) {
  const value = env[key]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  if (["1", "true", "yes"].includes(value)) {
    return true;
  }

  if (["0", "false", "no"].includes(value)) {
    return false;
  }

  throw new Error(`Invalid boolean value for ${key}`);
}

function integerEnv(
  env: Record<string, string | undefined>,
  key: string,
  fallback: number,
) {
  const value = env[key]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer for ${key}`);
  }

  return parsed;
}

function listEnv(
  env: Record<string, string | undefined>,
  key: string,
  fallback: string[],
) {
  const value = env[key]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    throw new Error(`Invalid comma-separated list for ${key}`);
  }

  return parsed;
}

export function parseMediaStorageConfig(
  env: Record<string, string | undefined>,
): MediaStorageConfig {
  return {
    accessKeyId: requiredEnv(env, "RASTRO_STORAGE_ACCESS_KEY_ID"),
    allowedMimeTypes: listEnv(
      env,
      "RASTRO_STORAGE_ALLOWED_MIME_TYPES",
      defaultAllowedMimeTypes,
    ),
    bucket: requiredEnv(env, "RASTRO_STORAGE_BUCKET"),
    deliveryBaseUrl: optionalEnv(env, "RASTRO_STORAGE_DELIVERY_BASE_URL"),
    forcePathStyle: booleanEnv(env, "RASTRO_STORAGE_FORCE_PATH_STYLE", false),
    internalEndpoint: optionalEnv(env, "RASTRO_STORAGE_INTERNAL_ENDPOINT"),
    maxImageBytes: integerEnv(
      env,
      "RASTRO_STORAGE_MAX_IMAGE_BYTES",
      10 * 1024 * 1024,
    ),
    presignEndpoint: optionalEnv(env, "RASTRO_STORAGE_PRESIGN_ENDPOINT"),
    presignExpiresSeconds: integerEnv(
      env,
      "RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS",
      5 * 60,
    ),
    region: requiredEnv(env, "RASTRO_STORAGE_REGION"),
    secretAccessKey: requiredEnv(env, "RASTRO_STORAGE_SECRET_ACCESS_KEY"),
    tls: booleanEnv(env, "RASTRO_STORAGE_TLS", true),
  };
}

export function parseOptionalMediaStorageConfig(
  env: Record<string, string | undefined>,
): MediaStorageConfig | null {
  const configuredKeys = [
    "RASTRO_STORAGE_ACCESS_KEY_ID",
    "RASTRO_STORAGE_BUCKET",
    "RASTRO_STORAGE_INTERNAL_ENDPOINT",
    "RASTRO_STORAGE_PRESIGN_ENDPOINT",
    "RASTRO_STORAGE_REGION",
    "RASTRO_STORAGE_SECRET_ACCESS_KEY",
  ];
  const hasAnyStorageConfig = configuredKeys.some((key) => env[key]?.trim());

  return hasAnyStorageConfig ? parseMediaStorageConfig(env) : null;
}

export function redactMediaStorageConfig(config: MediaStorageConfig) {
  return {
    ...config,
    accessKeyId: "[redacted]",
    secretAccessKey: "[redacted]",
  };
}

export interface PresignedPutInput {
  checksumSha256?: string;
  contentType: string;
  expiresAt: Date;
  metadata: Record<string, string>;
  objectKey: string;
  sizeBytes: number;
}

export interface PresignedPutInstructions {
  expiresAt: Date;
  headers: Record<string, string>;
  method: "PUT";
  url: string;
}

export interface StoredObjectHead {
  checksumSha256: string | null;
  contentLength: number;
  contentType: string | null;
  metadata: Record<string, string>;
}

export interface StoredObject {
  body: Uint8Array;
  cacheControl: string | null;
  contentLength: number;
  contentType: string | null;
  eTag: string | null;
  metadata: Record<string, string>;
}

export interface MediaStorage {
  createPresignedPut(
    input: PresignedPutInput,
  ): Promise<PresignedPutInstructions>;
  headObject(input: { objectKey: string }): Promise<StoredObjectHead>;
  getObject(input: { objectKey: string }): Promise<StoredObject>;
  deleteObject(input: { objectKey: string }): Promise<void>;
}

export interface S3PresignPutObjectInput {
  bucket: string;
  checksumSha256?: string;
  contentType: string;
  expiresIn: number;
  key: string;
  metadata: Record<string, string>;
  sizeBytes: number;
}

export interface S3HeadObjectInput {
  bucket: string;
  key: string;
}

export interface S3MediaStorageOverrides {
  deleteObject?: (input: S3HeadObjectInput) => Promise<void>;
  getObject?: (input: S3HeadObjectInput) => Promise<StoredObject>;
  headObject?: (input: S3HeadObjectInput) => Promise<StoredObjectHead>;
  presignPutObject?: (input: S3PresignPutObjectInput) => Promise<string>;
}

function endpointForConfig(
  endpoint: string | null,
  tls: boolean,
): string | undefined {
  if (!endpoint) {
    return undefined;
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return `${tls ? "https" : "http"}://${endpoint}`;
}

function createS3Client(config: MediaStorageConfig, endpoint: string | null) {
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: endpointForConfig(endpoint, config.tls),
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  });
}

function normalizeMetadata(metadata: Record<string, string> | undefined) {
  return Object.fromEntries(
    Object.entries(metadata ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
}

async function bodyToUint8Array(body: unknown) {
  if (body instanceof Uint8Array) {
    return body;
  }

  if (hasTransformToByteArray(body)) {
    return body.transformToByteArray();
  }

  if (isAsyncIterable(body)) {
    const chunks: Uint8Array[] = [];

    for await (const chunk of body) {
      chunks.push(
        chunk instanceof Uint8Array
          ? chunk
          : new Uint8Array(Buffer.from(String(chunk))),
      );
    }

    const byteLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const output = new Uint8Array(byteLength);
    let offset = 0;

    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }

    return output;
  }

  throw new Error("Unsupported S3 object body.");
}

function hasTransformToByteArray(
  body: unknown,
): body is { transformToByteArray: () => Promise<Uint8Array> } {
  return (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  );
}

function isAsyncIterable(body: unknown): body is AsyncIterable<unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body &&
    typeof body[Symbol.asyncIterator] === "function"
  );
}

export function createS3MediaStorage(
  config: MediaStorageConfig,
  overrides: S3MediaStorageOverrides = {},
): MediaStorage {
  const internalClient = createS3Client(config, config.internalEndpoint);
  const presignClient = createS3Client(
    config,
    config.presignEndpoint ?? config.internalEndpoint,
  );

  return {
    createPresignedPut: async (input) => {
      const expiresIn = Math.max(
        1,
        Math.floor((input.expiresAt.getTime() - Date.now()) / 1000),
      );
      const presignedUrl =
        overrides.presignPutObject?.({
          bucket: config.bucket,
          checksumSha256: input.checksumSha256,
          contentType: input.contentType,
          expiresIn,
          key: input.objectKey,
          metadata: input.metadata,
          sizeBytes: input.sizeBytes,
        }) ??
        getSignedUrl(
          presignClient,
          new PutObjectCommand({
            Bucket: config.bucket,
            ChecksumSHA256: input.checksumSha256,
            ContentLength: input.sizeBytes,
            ContentType: input.contentType,
            Key: input.objectKey,
            Metadata: input.metadata,
          }),
          { expiresIn },
        );

      return {
        expiresAt: input.expiresAt,
        headers: {
          "content-type": input.contentType,
        },
        method: "PUT",
        url: await presignedUrl,
      };
    },
    deleteObject: async ({ objectKey }) => {
      if (overrides.deleteObject) {
        await overrides.deleteObject({
          bucket: config.bucket,
          key: objectKey,
        });
        return;
      }

      await internalClient.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
        }),
      );
    },
    headObject: async ({ objectKey }) => {
      if (overrides.headObject) {
        return overrides.headObject({
          bucket: config.bucket,
          key: objectKey,
        });
      }

      const result = await internalClient.send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
        }),
      );

      return {
        checksumSha256: result.ChecksumSHA256 ?? null,
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        metadata: normalizeMetadata(result.Metadata),
      };
    },
    getObject: async ({ objectKey }) => {
      if (overrides.getObject) {
        return overrides.getObject({
          bucket: config.bucket,
          key: objectKey,
        });
      }

      const result = await internalClient.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
        }),
      );

      return {
        body: await bodyToUint8Array(result.Body),
        cacheControl: result.CacheControl ?? null,
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        eTag: result.ETag ?? null,
        metadata: normalizeMetadata(result.Metadata),
      };
    },
  };
}

export function createUnavailableMediaStorage(): MediaStorage {
  return {
    createPresignedPut: () => {
      throw new Error("Media storage is not configured.");
    },
    headObject: () => {
      throw new Error("Media storage is not configured.");
    },
    getObject: () => {
      throw new Error("Media storage is not configured.");
    },
    deleteObject: () => {
      throw new Error("Media storage is not configured.");
    },
  };
}
