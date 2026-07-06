import { AuthShowcase } from "./_components/auth-showcase";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const primaryActions = [
  {
    body: "Crea una alerta con zona, fotos y contacto para que la comunidad pueda ayudarte.",
    href: "rastro://report-create/lost",
    label: "Reportar mascota perdida",
    tone: "primary",
  },
  {
    body: "Publica un caso no monetario para encontrar un hogar responsable en Bolivia.",
    href: "rastro://report-create/adoption",
    label: "Publicar adopcion",
    tone: "secondary",
  },
  {
    body: "Encuentra veterinarias, rescatistas y apoyo local cerca de tu zona.",
    href: "rastro://recursos",
    label: "Buscar recursos locales",
    tone: "secondary",
  },
] as const;

const publicSections = [
  {
    heading: "Reportes comunitarios",
    text: "Perdidos, encontrados y avistamientos se organizan por ubicacion aproximada para cuidar datos sensibles.",
  },
  {
    heading: "Adopciones responsables",
    text: "Las publicaciones de adopcion se mantienen fuera de compras, ventas o subastas.",
  },
  {
    heading: "Recursos en Bolivia",
    text: "El directorio prioriza ayuda practica: veterinarias, hogares temporales, rescate y transporte.",
  },
] as const;

const getSingleSearchParam = (params: Awaited<SearchParams>, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export default async function HomePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const authStatus = getSingleSearchParam(searchParams, "auth");
  const authReturnTo = getSingleSearchParam(searchParams, "returnTo");

  return (
    <main className="min-h-screen">
      <section className="border-border bg-card border-b">
        <div className="container grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div className="max-w-3xl">
            <p className="text-primary text-sm font-semibold uppercase">
              Red de recuperacion en Bolivia
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal sm:text-6xl">
              Rastro
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
              Reportes, adopciones y recursos locales para reunir mascotas con
              sus familias y coordinar ayuda comunitaria sin exponer datos
              sensibles.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {primaryActions.map((action) => (
                <a
                  aria-label={action.label}
                  className={
                    action.tone === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 text-sm font-semibold"
                      : "border-border bg-background text-foreground hover:bg-muted inline-flex min-h-11 items-center justify-center rounded-md border px-5 py-3 text-sm font-semibold"
                  }
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>

          <div className="border-border bg-background rounded-lg border p-5 shadow-xs">
            <p className="text-muted-foreground text-sm font-medium">
              Entradas publicas
            </p>
            <div className="mt-4 grid gap-4">
              {publicSections.map((section) => (
                <div
                  className="border-border rounded-md border p-4"
                  key={section.heading}
                >
                  <h2 className="text-base font-semibold">{section.heading}</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {section.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-10" aria-labelledby="member-access">
        <div className="mb-5 max-w-4xl">
          <p className="text-muted-foreground text-sm font-medium">
            Acceso para miembros
          </p>
          <h2 id="member-access" className="text-2xl font-semibold">
            Gestiona tus reportes y contactos
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Inicia sesion para responder mensajes, revisar tus publicaciones y
            mantener actualizada tu informacion.
          </p>
        </div>

        <AuthShowcase returnTo={authReturnTo} status={authStatus} />
      </section>
    </main>
  );
}
