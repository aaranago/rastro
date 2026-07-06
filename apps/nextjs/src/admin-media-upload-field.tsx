"use client";

import * as React from "react";
import NextImage from "next/image";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { RotateCcwIcon, Trash2Icon, UploadIcon } from "lucide-react";
import SuperJSON from "superjson";

import type { AppRouter } from "@acme/api";
import type { AdminMediaAssetPurpose } from "@acme/validators";
import { Button } from "@acme/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";

export interface AdminMediaUploadFieldProps {
  assetFieldName: string;
  currentUrl?: string;
  description: string;
  id: string;
  initialAssetId?: string;
  label: string;
  onRemovedChange?: (removed: boolean) => void;
  previewAlt: string;
  purpose: AdminMediaAssetPurpose;
}

type UploadState = "failed" | "idle" | "pending" | "ready" | "removed";

let adminMediaClient: ReturnType<typeof createTRPCClient<AppRouter>> | null =
  null;

export function AdminMediaUploadField(props: AdminMediaUploadFieldProps) {
  const { currentUrl, onRemovedChange, purpose } = props;
  const initialAssetId = normalizeInitialAssetId(props.initialAssetId);
  const [assetId, setAssetId] = React.useState(initialAssetId);
  const [error, setError] = React.useState<string | null>(null);
  const [lastFile, setLastFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(
    currentUrl,
  );
  const [progress, setProgress] = React.useState(0);
  const [state, setState] = React.useState<UploadState>(
    initialAssetId ? "ready" : "idle",
  );
  const objectPreviewUrl = React.useRef<string | null>(null);
  const status = adminMediaUploadStateLabels[state];
  const readyAssetId = state === "ready" ? assetId : "";

  React.useEffect(() => {
    return () => {
      if (objectPreviewUrl.current) {
        URL.revokeObjectURL(objectPreviewUrl.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!initialAssetId) {
      return;
    }

    setAssetId(initialAssetId);
    setPreviewUrl((currentPreviewUrl) => currentPreviewUrl ?? currentUrl);
    setState((currentState) =>
      currentState === "idle" || currentState === "removed"
        ? "ready"
        : currentState,
    );
    onRemovedChange?.(false);
  }, [currentUrl, initialAssetId, onRemovedChange]);

  const setLocalPreview = React.useCallback((file: File) => {
    if (objectPreviewUrl.current) {
      URL.revokeObjectURL(objectPreviewUrl.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    objectPreviewUrl.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  }, []);

  const uploadFile = React.useCallback(
    async (file: File, existingAssetId?: string) => {
      setError(null);
      setState("pending");
      setProgress(10);
      setLocalPreview(file);
      onRemovedChange?.(false);

      try {
        const dimensions = await readImageDimensions(file);
        const client = getAdminMediaClient();
        const session = existingAssetId
          ? await client.resources.admin.refreshMediaUploadSession.mutate({
              assetId: existingAssetId,
            })
          : await client.resources.admin.createMediaUploadSession.mutate({
              height: dimensions.height,
              mimeType: file.type,
              purpose,
              sizeBytes: file.size,
              width: dimensions.width,
            });

        setAssetId(session.asset.assetId);
        setProgress(35);

        const response = await fetch(session.upload.url, {
          body: file,
          headers: session.upload.headers,
          method: session.upload.method,
        });

        if (!response.ok) {
          throw new Error(`La carga fue rechazada (${response.status}).`);
        }

        setProgress(80);

        const completed =
          await client.resources.admin.completeMediaUploadSession.mutate({
            assetId: session.asset.assetId,
          });

        setAssetId(completed.asset.assetId);
        setPreviewUrl(
          completed.asset.deliveryUrl ?? objectPreviewUrl.current ?? undefined,
        );
        setProgress(100);
        setState("ready");
      } catch (uploadError) {
        setProgress(0);
        setState("failed");
        setError(getAdminMediaUploadErrorMessage(uploadError));
      }
    },
    [onRemovedChange, purpose, setLocalPreview],
  );

  const onFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      setLastFile(file);
      void uploadFile(file);
    },
    [uploadFile],
  );

  const retryUpload = React.useCallback(() => {
    if (!lastFile) {
      setError("Selecciona un archivo para reintentar.");
      setState("failed");
      return;
    }

    void uploadFile(lastFile, assetId || undefined);
  }, [assetId, lastFile, uploadFile]);

  const removeAsset = React.useCallback(() => {
    const assetIdToRemove = assetId;

    setAssetId("");
    setError(null);
    setLastFile(null);
    setPreviewUrl(undefined);
    setProgress(0);
    setState("removed");
    onRemovedChange?.(true);

    if (objectPreviewUrl.current) {
      URL.revokeObjectURL(objectPreviewUrl.current);
      objectPreviewUrl.current = null;
    }

    if (assetIdToRemove) {
      void getAdminMediaClient()
        .resources.admin.removeMediaAsset.mutate({ assetId: assetIdToRemove })
        .catch(() => {
          setError(
            "El medio se retiró del formulario, pero falta limpiar el archivo.",
          );
        });
    }
  }, [assetId, onRemovedChange]);

  return (
    <Field data-admin-media-upload={props.purpose}>
      <input name={props.assetFieldName} type="hidden" value={readyAssetId} />
      <div className="flex min-w-0 flex-col gap-3 rounded-md border border-dashed p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
            <FieldDescription>{props.description}</FieldDescription>
          </div>
          <span
            className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium"
            data-admin-media-status={state}
          >
            {status}
          </span>
        </div>

        {previewUrl ? (
          <NextImage
            alt={props.previewAlt}
            className="border-border bg-muted h-24 w-full rounded-md border object-cover"
            height={96}
            loading="eager"
            src={previewUrl}
            unoptimized
            width={640}
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-24 items-center justify-center rounded-md border text-sm">
            Sin vista previa
          </div>
        )}

        <Input
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          aria-describedby={`${props.id}-status`}
          className="sr-only"
          id={props.id}
          onChange={onFileChange}
          tabIndex={-1}
          type="file"
        />

        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="bg-muted h-2 overflow-hidden rounded-full"
          role="progressbar"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-muted-foreground text-xs" id={`${props.id}-status`}>
          {state === "ready"
            ? "Archivo verificado. Se guardará al enviar el formulario."
            : "Selecciona o reemplaza el archivo antes de guardar."}
        </p>

        {error ? (
          <FieldError className="max-w-full [overflow-wrap:anywhere] break-words">
            {error}
          </FieldError>
        ) : null}

        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            className="h-auto min-h-8 max-w-full whitespace-normal"
            disabled={!lastFile}
            onClick={retryUpload}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcwIcon aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
          <Button
            className="h-auto min-h-8 max-w-full whitespace-normal"
            onClick={() => {
              const input = document.getElementById(props.id);
              if (input instanceof HTMLInputElement) {
                input.click();
              }
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <UploadIcon aria-hidden="true" className="size-4" />
            {previewUrl ? "Reemplazar" : "Seleccionar"}
          </Button>
          <Button
            className="h-auto min-h-8 max-w-full whitespace-normal"
            disabled={!assetId && !previewUrl}
            onClick={removeAsset}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
            Retirar
          </Button>
        </div>
      </div>
    </Field>
  );
}

export const adminMediaUploadStateLabels = {
  failed: "Falló la carga",
  idle: "Sin archivo seleccionado",
  pending: "Carga pendiente",
  ready: "Listo para guardar",
  removed: "Retirado",
} as const satisfies Record<UploadState, string>;

function normalizeInitialAssetId(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getAdminMediaUploadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "No pudimos cargar el archivo. Intenta nuevamente o usa el fallback por URL externa.";
  }

  if (
    error.message.startsWith("No pudimos leer las dimensiones") ||
    error.message.startsWith("La carga fue rechazada")
  ) {
    return error.message;
  }

  if (
    /\b(Failed query|insert into|params:|SQL|admin_media_asset)\b/i.test(
      error.message,
    )
  ) {
    return "No pudimos preparar la carga administrada. Revisa la configuración de medios e intenta nuevamente.";
  }

  if (error.message.length > 180) {
    return "No pudimos cargar el archivo. Intenta nuevamente o usa el fallback por URL externa.";
  }

  return error.message;
}

function getAdminMediaClient() {
  if (typeof window === "undefined") {
    throw new Error("Admin media uploads run in the browser.");
  }

  adminMediaClient ??= createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        transformer: SuperJSON,
        url: `${window.location.origin}/api/trpc`,
      }),
    ],
  });

  return adminMediaClient;
}

function readImageDimensions(file: File) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "No pudimos leer las dimensiones de la imagen. Prueba con JPG, PNG o WebP.",
        ),
      );
    };
    image.src = url;
  });
}
