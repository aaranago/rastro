import type { Metadata } from "next";

import {
  LegalSection,
  PublicLegalPage,
  supportEmail,
} from "~/public-legal-page";

export const metadata: Metadata = {
  description:
    "Términos de uso de Rastro para reportes, adopciones responsables y recursos locales de mascotas en Bolivia.",
  title: "Términos | Rastro",
};

export default function TermsPage() {
  return (
    <PublicLegalPage
      description="Estos términos definen el uso aceptable de Rastro para publicar reportes, coordinar adopciones responsables, consultar recursos locales y administrar cuentas."
      eyebrow="Términos"
      title="Términos de uso"
    >
      <LegalSection title="Uso permitido">
        <p>
          Rastro es una red comunitaria para mascotas perdidas, encontradas,
          avistadas, adopciones no monetarias y recursos locales. La información
          publicada debe ser verdadera, útil y respetuosa de la privacidad de
          personas y animales.
        </p>
        <p>
          No se permite vender mascotas, subastar animales, publicar recompensas
          engañosas, acosar a otras personas, suplantar identidades ni usar
          Rastro para actividades ilegales o dañinas.
        </p>
      </LegalSection>

      <LegalSection title="Reportes y adopciones">
        <p>
          Quien publica un reporte o adopción es responsable de mantener los
          datos actualizados, responder con respeto y cerrar el caso cuando deje
          de estar vigente.
        </p>
        <p>
          Las adopciones en Rastro son responsables y no monetarias. Podemos
          retirar publicaciones que parezcan venta, cría comercial, tráfico,
          maltrato, fraude o riesgo para la comunidad.
        </p>
      </LegalSection>

      <LegalSection title="Moderación y seguridad">
        <p>
          Podemos limitar, suspender, ocultar o eliminar contenido, cuentas,
          proveedores, mensajes o recursos cuando detectemos abuso, riesgo,
          datos sensibles expuestos, spam, fraude o incumplimiento de estos
          términos.
        </p>
        <p>
          Rastro puede conservar registros mínimos de auditoría para investigar
          reportes de seguridad, proteger a miembros y cumplir obligaciones
          aplicables.
        </p>
      </LegalSection>

      <LegalSection title="Proveedores y patrocinios">
        <p>
          Los recursos locales ayudan a encontrar servicios cercanos. La
          presencia de un proveedor o patrocinio no garantiza resultados,
          disponibilidad, urgencias ni calidad fuera de la información revisada
          por Rastro.
        </p>
        <p>
          Los patrocinios se muestran con divulgación visible y no afectan la
          prioridad de recuperación, alertas ni moderación de casos.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <p>
          Para consultas sobre estos términos, seguridad o uso aceptable,
          escribe a {supportEmail}. Si una autoridad solicita información,
          revisaremos la solicitud antes de responder.
        </p>
      </LegalSection>
    </PublicLegalPage>
  );
}
