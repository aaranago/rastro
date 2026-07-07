import Link from "next/link";

const publicLegalLinks = [
  {
    href: "/privacidad",
    label: "Privacidad",
  },
  {
    href: "/terminos",
    label: "Términos",
  },
  {
    href: "/eliminar-cuenta",
    label: "Eliminar cuenta",
  },
] as const;

export function PublicLegalFooter() {
  return (
    <footer className="border-border bg-card border-t">
      <nav
        aria-label="Información legal"
        className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 lg:px-8"
      >
        <span>Rastro Bolivia</span>
        <span className="flex flex-wrap gap-x-5 gap-y-2">
          {publicLegalLinks.map((link) => (
            <Link
              className="hover:text-primary"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </span>
      </nav>
    </footer>
  );
}
