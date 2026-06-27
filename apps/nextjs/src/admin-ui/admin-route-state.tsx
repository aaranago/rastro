import { Badge } from "@acme/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/card";
import { Skeleton } from "@acme/ui/skeleton";

export function AdminRouteLoading(props: {
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section
      aria-busy="true"
      aria-label={`Cargando ${props.title}`}
      className="mx-auto flex w-full max-w-[1500px] flex-col gap-6"
    >
      <div className="min-w-0">
        {props.eyebrow ? (
          <Badge className="w-fit" variant="secondary">
            {props.eyebrow}
          </Badge>
        ) : null}
        <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
          {props.title}
        </h2>
        {props.description ? (
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
            {props.description}
          </p>
        ) : null}
      </div>

      <section
        aria-label="Cargando resumen"
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {["summary-1", "summary-2", "summary-3", "summary-4"].map((card) => (
          <Card className="rounded-lg" key={card}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">
            Cargando datos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {["row-1", "row-2", "row-3", "row-4"].map((row) => (
            <Skeleton className="h-12 w-full" key={row} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
