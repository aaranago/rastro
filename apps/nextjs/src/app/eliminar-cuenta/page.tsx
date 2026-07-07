import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalSection,
  PublicLegalPage,
  supportEmail,
} from "~/public-legal-page";

export const metadata: Metadata = {
  description:
    "Cómo solicitar la eliminación de una cuenta de Rastro y qué datos se eliminan o conservan por seguridad.",
  title: "Eliminar cuenta | Rastro",
};

export default function AccountDeletionPage() {
  return (
    <PublicLegalPage
      description="Rastro permite solicitar eliminación de cuenta desde la app, desde la web autenticada o por soporte cuando una persona perdió acceso a su cuenta."
      eyebrow="Cuenta"
      title="Eliminar cuenta"
    >
      <LegalSection title="Desde la app">
        <p>
          Abre Rastro, entra a Perfil, revisa la sección de cuenta y solicita la
          eliminación. El flujo envía una confirmación al correo asociado antes
          de eliminar la cuenta.
        </p>
      </LegalSection>

      <LegalSection title="Desde la web">
        <p>
          Inicia sesión en la web de Rastro y usa el panel de acceso para
          solicitar eliminación de cuenta. Puedes entrar desde{" "}
          <Link className="text-primary font-semibold" href="/#auth">
            rastro.bo
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Si no puedes iniciar sesión">
        <p>
          Escribe a {supportEmail} desde el correo asociado a tu cuenta. Incluye
          tu nombre, el correo de la cuenta y una descripción breve del problema
          de acceso. No envíes contraseñas ni documentos por correo.
        </p>
      </LegalSection>

      <LegalSection title="Qué ocurre al eliminar">
        <p>
          Rastro elimina o desvincula datos de cuenta, sesión y perfil cuando la
          solicitud se confirma. También intenta limpiar contactos públicos
          asociados para no dejar datos personales activos después de eliminar
          la cuenta.
        </p>
        <p>
          Podemos conservar registros mínimos por seguridad, prevención de
          abuso, auditoría, resolución de disputas u obligaciones legales. Los
          reportes o adopciones públicos pueden requerir revisión adicional si
          eliminarlos de inmediato afectaría una investigación, seguridad de una
          persona o protección de una mascota.
        </p>
      </LegalSection>
    </PublicLegalPage>
  );
}
