import type { ReactNode } from "react";
import Link from "next/link";

import { PublicLegalFooter } from "./public-legal-links";

export const supportEmail = "soporte@rastro.bo";
const legalEffectiveDate = "6 de julio de 2026";

export function PublicLegalPage(props: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="bg-background min-h-screen">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link className="text-primary text-xl font-bold" href="/">
            Rastro
          </Link>
          <Link
            className="hover:text-primary text-sm font-semibold"
            href="/descargar"
          >
            Descargar
          </Link>
        </div>
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
          <p className="text-primary text-sm font-semibold uppercase">
            {props.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
            {props.title}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-3xl text-lg leading-8">
            {props.description}
          </p>
        </div>
      </header>
      <article className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 sm:px-6 lg:px-8">
        <p className="text-muted-foreground text-sm">
          Vigente desde el {legalEffectiveDate}.
        </p>
        {props.children}
      </article>
      <PublicLegalFooter />
    </main>
  );
}

export function LegalSection(props: { children: ReactNode; title: string }) {
  return (
    <section className="border-border bg-card rounded-lg border p-5 shadow-xs">
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <div className="text-muted-foreground mt-3 grid gap-3 text-sm leading-6">
        {props.children}
      </div>
    </section>
  );
}
