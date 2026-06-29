"use client";

import * as React from "react";

import { Button } from "@acme/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";

export function AdminNativeSelectField<
  TOption extends { id: string; label: string },
>(props: {
  id: string;
  label: string;
  name: string;
  options: readonly TOption[];
  value?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <select
        className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        defaultValue={props.value ?? ""}
        id={props.id}
        name={props.name}
      >
        <option value="">Todos</option>
        {props.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function getArrayFilterValue(value: readonly string[] | undefined) {
  return value?.[0];
}

export function AdminExternalMediaUrlFallback(props: {
  fields: readonly {
    error?: string;
    hasSubmittedValue: boolean;
    id: string;
    label: string;
    name: string;
    placeholder: string;
    value?: string;
  }[];
  id: string;
  removedFieldNames: readonly string[];
}) {
  const shouldOpen = props.fields.some(
    (field) => field.hasSubmittedValue || field.error,
  );
  const [open, setOpen] = React.useState(shouldOpen);

  React.useEffect(() => {
    if (shouldOpen) {
      setOpen(true);
    }
  }, [shouldOpen]);

  return (
    <FieldSet
      className="border-border gap-3 rounded-md border p-3"
      data-admin-media-url-fallback="external"
    >
      <FieldLegend>Fallback por URL externa (avanzado)</FieldLegend>
      <FieldDescription>
        Usa esta sección solo si la carga administrada no está disponible.
      </FieldDescription>
      <Button
        aria-controls={props.id}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        size="sm"
        type="button"
        variant="outline"
      >
        {open
          ? "Ocultar fallback por URL externa"
          : "Mostrar fallback por URL externa"}
      </Button>
      {open ? (
        <div className="grid gap-4 sm:grid-cols-2" id={props.id}>
          {props.fields.map((field) => (
            <AdminTextField
              error={field.error}
              id={field.id}
              key={field.name}
              label={field.label}
              name={field.name}
              placeholder={field.placeholder}
              type="url"
              value={field.value}
            />
          ))}
        </div>
      ) : (
        props.removedFieldNames.map((fieldName) => (
          <input key={fieldName} name={fieldName} type="hidden" value="" />
        ))
      )}
    </FieldSet>
  );
}

export function AdminTextField(props: {
  autoFocus?: boolean;
  error?: string;
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type: React.HTMLInputTypeAttribute;
  value?: string;
}) {
  const errorId = `${props.id}-error`;

  return (
    <Field data-invalid={Boolean(props.error)}>
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <Input
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={Boolean(props.error)}
        autoFocus={props.autoFocus}
        defaultValue={props.value ?? ""}
        id={props.id}
        name={props.name}
        placeholder={props.placeholder}
        required={props.required}
        step={props.step}
        type={props.type}
      />
      <FieldError id={errorId}>{props.error}</FieldError>
    </Field>
  );
}

export function AdminListFilterSubmitControls(props: {
  mediaState?: string;
  mediaStateId: string;
  sortBy?: string;
  sortDirection?: string;
}) {
  return (
    <>
      <AdminNativeSelectField
        id={props.mediaStateId}
        label="Medios"
        name="mediaState"
        options={[
          { id: "has_media", label: "Con medios" },
          { id: "missing_media", label: "Sin medios" },
        ]}
        value={props.mediaState === "any" ? undefined : props.mediaState}
      />
      <input name="sortBy" type="hidden" value={props.sortBy ?? ""} />
      <input
        name="sortDirection"
        type="hidden"
        value={props.sortDirection ?? ""}
      />
      <div className="flex items-end">
        <Button className="w-full lg:w-fit" type="submit">
          Aplicar filtros
        </Button>
      </div>
    </>
  );
}
