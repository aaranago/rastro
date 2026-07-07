import type { Metadata } from "next";

import {
  LegalSection,
  PublicLegalPage,
  supportEmail,
} from "~/public-legal-page";

export const metadata: Metadata = {
  description:
    "Política de privacidad de Rastro para reportes, adopciones y recursos locales de mascotas en Bolivia.",
  title: "Privacidad | Rastro",
};

export default function PrivacyPage() {
  return (
    <PublicLegalPage
      description="Explicamos qué datos usa Rastro, por qué los necesita y cómo protegemos reportes comunitarios, adopciones, recursos locales y cuentas de miembros."
      eyebrow="Privacidad"
      title="Política de privacidad"
    >
      <LegalSection title="Datos que tratamos">
        <p>
          Rastro trata datos de cuenta como nombre, correo, proveedor de inicio
          de sesión, estado de sesión y preferencias de contacto. Cuando una
          persona crea reportes o adopciones, también tratamos títulos,
          descripciones, fotos, tipo de mascota, zona aproximada y acciones de
          contacto elegidas por la persona que publica.
        </p>
        <p>
          Los recursos locales pueden incluir datos públicos o moderados de
          proveedores, como nombre comercial, categoría, zona de atención,
          enlaces, teléfonos, horarios y señales de verificación.
        </p>
      </LegalSection>

      <LegalSection title="Ubicación y fotos">
        <p>
          Rastro usa ubicación para mostrar reportes y recursos cercanos. Las
          superficies públicas muestran zonas aproximadas y celdas de ubicación,
          no coordenadas exactas de una mascota o persona.
        </p>
        <p>
          Las fotos se usan para identificar mascotas, reportes y recursos. No
          deben incluir documentos, placas, direcciones completas ni datos de
          terceros que no sean necesarios para el caso.
        </p>
      </LegalSection>

      <LegalSection title="Uso de la información">
        <p>
          Usamos la información para publicar reportes, coordinar mensajes,
          enviar alertas, moderar abuso, prevenir fraude, medir funcionamiento
          del servicio y mostrar recursos relevantes en Bolivia.
        </p>
        <p>
          Rastro no vende datos personales. Los patrocinadores locales no pueden
          cambiar la prioridad de recuperación de mascotas ni recibir contactos
          privados por patrocinar una superficie.
        </p>
      </LegalSection>

      <LegalSection title="Conservación y eliminación">
        <p>
          Conservamos datos mientras la cuenta, reporte, adopción, conversación
          o recurso siga activo, y durante plazos razonables para seguridad,
          auditoría, prevención de abuso y obligaciones legales.
        </p>
        <p>
          Una persona puede solicitar eliminación de cuenta desde la app o desde
          la web autenticada. Si no puede acceder, puede escribir a{" "}
          {supportEmail} desde el correo asociado a la cuenta.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <p>
          Para consultas de privacidad, eliminación o corrección de datos,
          escribe a {supportEmail}. Revisamos solicitudes con prioridad cuando
          involucran datos públicos, seguridad de una persona o riesgo para una
          mascota.
        </p>
      </LegalSection>
    </PublicLegalPage>
  );
}
