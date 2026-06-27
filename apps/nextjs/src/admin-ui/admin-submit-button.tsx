"use client";

import type * as React from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@acme/ui/button";

export type AdminSubmitButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "type"
> & {
  children: React.ReactNode;
  pendingLabel: React.ReactNode;
};

export function AdminSubmitButton(props: AdminSubmitButtonProps) {
  const { children, disabled, pendingLabel, ...buttonProps } = props;
  const { pending } = useFormStatus();
  const isDisabled = pending ? true : Boolean(disabled);

  return (
    <Button
      {...buttonProps}
      aria-busy={pending}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
