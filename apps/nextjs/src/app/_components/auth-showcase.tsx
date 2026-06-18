import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";

import {
  initiateAccountDeletion,
  requestPasswordReset,
  signInWithEmail,
  signInWithSocialProvider,
  signOut,
  signUpWithEmail,
} from "~/auth/actions";
import {
  getEnabledSocialAuthProviders,
  getSession,
  socialAuthProviderLabels,
} from "~/auth/server";

const authMessages = {
  "account-deletion-error": {
    tone: "error",
    text: "No pudimos iniciar la eliminacion de cuenta. Intentalo nuevamente.",
  },
  "account-deletion-integration-needed": {
    tone: "error",
    text: "La eliminacion de cuenta aun necesita la integracion del backend para limpiar datos publicos de forma segura.",
  },
  "account-deletion-signed-out": {
    tone: "error",
    text: "Ingresa para solicitar la eliminacion de tu cuenta.",
  },
  "account-deletion-started": {
    tone: "success",
    text: "Solicitud de eliminacion iniciada.",
  },
  "account-deletion-verification-sent": {
    tone: "success",
    text: "Te enviamos un correo para confirmar la eliminacion de tu cuenta.",
  },
  "email-not-verified": {
    tone: "error",
    text: "Verifica tu correo antes de ingresar.",
  },
  "password-reset-error": {
    tone: "error",
    text: "No pudimos solicitar el restablecimiento de contrasena. Intentalo nuevamente.",
  },
  "password-reset-integration-needed": {
    tone: "error",
    text: "El restablecimiento de contrasena aun necesita la integracion de correo para enviar enlaces seguros.",
  },
  "password-reset-invalid": {
    tone: "error",
    text: "Ingresa un correo valido para restablecer tu contrasena.",
  },
  "password-reset-sent": {
    tone: "success",
    text: "Si ese correo existe en Rastro, enviaremos un enlace para restablecer la contrasena.",
  },
  "signin-error": {
    tone: "error",
    text: "No pudimos iniciar sesion con esos datos.",
  },
  "signin-invalid": {
    tone: "error",
    text: "Ingresa un correo valido y una contrasena de al menos 8 caracteres.",
  },
  "signin-success": {
    tone: "success",
    text: "Sesion iniciada.",
  },
  "signed-out": {
    tone: "success",
    text: "Sesion cerrada.",
  },
  "signup-email-exists": {
    tone: "error",
    text: "Ya existe una cuenta con ese correo.",
  },
  "signup-error": {
    tone: "error",
    text: "No pudimos crear la cuenta. Intentalo nuevamente.",
  },
  "signup-invalid": {
    tone: "error",
    text: "Completa nombre, correo y una contrasena de al menos 8 caracteres.",
  },
  "signup-success": {
    tone: "success",
    text: "Cuenta creada. Ya puedes usar Rastro.",
  },
  "signup-verify-email": {
    tone: "success",
    text: "Cuenta creada. Revisa tu correo para verificarla antes de ingresar.",
  },
  "social-error": {
    tone: "error",
    text: "No pudimos iniciar sesion con ese proveedor.",
  },
  "social-unavailable": {
    tone: "error",
    text: "Ese proveedor de acceso no esta disponible.",
  },
} satisfies Record<string, { text: string; tone: "error" | "success" }>;

type AuthStatus = keyof typeof authMessages;

const isAuthStatus = (status: string): status is AuthStatus =>
  Object.prototype.hasOwnProperty.call(authMessages, status);

const getAuthMessage = (status: string | undefined) => {
  if (!status) {
    return null;
  }

  return isAuthStatus(status) ? authMessages[status] : null;
};

function AuthMessage(props: {
  message: { text: string; tone: "error" | "success" };
}) {
  return (
    <p
      className={
        props.message.tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive mb-5 rounded-md border px-3 py-2 text-sm"
          : "border-primary/30 bg-primary/10 text-primary mb-5 rounded-md border px-3 py-2 text-sm"
      }
    >
      {props.message.text}
    </p>
  );
}

export async function AuthShowcase(props: { status?: string }) {
  const session = await getSession();
  const socialProviders = getEnabledSocialAuthProviders();
  const message = getAuthMessage(props.status);

  if (session) {
    const displayName = session.user.name || session.user.email;

    return (
      <section
        id="auth"
        className="border-border bg-card text-card-foreground w-full max-w-4xl rounded-lg border p-5 shadow-xs"
        aria-labelledby="auth-heading"
      >
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm font-medium">
              Sesion activa
            </p>
            <h2 id="auth-heading" className="truncate text-xl font-semibold">
              Configuracion de cuenta
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">{displayName}</p>
          </div>
          <form>
            <Button type="submit" formAction={signOut} variant="outline">
              Cerrar sesion
            </Button>
          </form>
        </div>

        {message ? <AuthMessage message={message} /> : null}

        <div className="border-border grid gap-5 border-t pt-5 md:grid-cols-2">
          <form action={requestPasswordReset} className="flex flex-col gap-3">
            <div>
              <h3 className="text-base font-semibold">
                Restablecer contrasena
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Solicita un enlace para cambiar la contrasena de tu acceso por
                correo.
              </p>
            </div>
            <input type="hidden" name="email" value={session.user.email} />
            <Button type="submit" variant="outline" className="w-fit">
              Solicitar enlace
            </Button>
          </form>

          <form
            action={initiateAccountDeletion}
            className="flex flex-col gap-3"
          >
            <div>
              <h3 className="text-base font-semibold">Eliminar cuenta</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Solicitar eliminacion inicia el cierre de tu acceso como miembro
                y requiere limpieza segura de tus datos.
              </p>
            </div>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
              <li>
                Tus perfiles de mascota dejan de estar bajo tu gestion como
                responsable activo.
              </li>
              <li>
                Tus reportes y publicaciones de adopcion pueden cerrarse,
                despublicarse o quedar retenidos para moderacion.
              </li>
              <li>
                Tus conversaciones dejan de usarse para contactarte, pero Rastro
                puede conservar registros necesarios para seguridad.
              </li>
              <li>
                El contenido publico se revisa para retirar datos de contacto y
                evitar informacion insegura sin responsable.
              </li>
              <li>
                Algunos registros de seguridad y moderacion se conservan cuando
                son necesarios para prevenir abuso.
              </li>
            </ul>
            <Button type="submit" variant="destructive" className="w-fit">
              Solicitar eliminacion
            </Button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section
      id="auth"
      className="border-border bg-card text-card-foreground w-full max-w-4xl rounded-lg border p-5 shadow-xs"
      aria-labelledby="auth-heading"
    >
      <div className="mb-5">
        <p className="text-muted-foreground text-sm font-medium">
          Acceso de miembros
        </p>
        <h2 id="auth-heading" className="text-2xl font-semibold">
          Ingresa o crea tu cuenta
        </h2>
      </div>

      {message ? <AuthMessage message={message} /> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <form action={signInWithEmail} className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">Ingresar</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Usa el correo con el que registraste tu cuenta.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Correo electronico
            <Input
              autoComplete="email"
              inputMode="email"
              name="email"
              placeholder="tu@correo.com"
              required
              type="email"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Contrasena
            <Input
              autoComplete="current-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <Button type="submit" className="w-full">
            Ingresar
          </Button>
        </form>

        <form action={signUpWithEmail} className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold">Crear cuenta</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Necesitamos tu nombre para identificar tus reportes.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Nombre
            <Input
              autoComplete="name"
              minLength={2}
              name="name"
              placeholder="Tu nombre"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Correo electronico
            <Input
              autoComplete="email"
              inputMode="email"
              name="email"
              placeholder="tu@correo.com"
              required
              type="email"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Contrasena
            <Input
              autoComplete="new-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <Button type="submit" className="w-full">
            Crear cuenta
          </Button>
        </form>
      </div>

      {socialProviders.length > 0 ? (
        <div className="border-border mt-6 border-t pt-5">
          <p className="text-muted-foreground mb-3 text-sm">
            Tambien puedes acceder con:
          </p>
          <div className="flex flex-wrap gap-3">
            {socialProviders.map((provider) => (
              <form action={signInWithSocialProvider} key={provider}>
                <input type="hidden" name="provider" value={provider} />
                <Button type="submit" variant="outline">
                  {socialAuthProviderLabels[provider]}
                </Button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
