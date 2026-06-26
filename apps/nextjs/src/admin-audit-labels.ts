const auditActionLabels: Record<string, string> = {
  "local_sponsor_placement.create": "Patrocinio creado",
  "local_sponsor_placement.detach": "Patrocinio retirado",
  "local_sponsor_placement.update": "Patrocinio actualizado",
  "member.suspend": "Miembro suspendido",
  "member.unsuspend": "Suspensión revocada",
  "report.hide": "Contenido ocultado",
  "report.restore": "Contenido restaurado",
  "resource_provider.archive": "Proveedor archivado",
  "resource_provider.create": "Proveedor creado",
  "resource_provider.update": "Proveedor actualizado",
  "resource_provider.verification_update": "Verificación actualizada",
  "settings.update": "Ajustes actualizados",
  member_suspended: "Miembro suspendido",
  moderation_hide_target: "Contenido ocultado",
  moderation_restore_target: "Contenido restaurado",
  resource_provider_created: "Proveedor creado",
  resource_provider_deleted: "Proveedor eliminado",
  resource_provider_updated: "Proveedor actualizado",
  resource_provider_verified: "Proveedor verificado",
  settings_updated: "Ajustes actualizados",
  sponsor_placement_attached: "Patrocinio activado",
  sponsor_placement_detached: "Patrocinio retirado",
};

const auditTargetTypeLabels: Record<string, string> = {
  adoption_listing: "Publicación de adopción",
  admin_settings: "Ajustes admin",
  found_pet_report: "Reporte de mascota encontrada",
  in_app_chat: "Chat en Rastro",
  local_sponsor_placement: "Patrocinio local",
  lost_pet_report: "Reporte de mascota perdida",
  member: "Miembro",
  resource_provider: "Proveedor de recursos",
  resource_provider_profile: "Proveedor de recursos",
  sighting_report: "Reporte de avistamiento",
};

export function getAuditActionLabel(action: string, fallback?: string) {
  return fallback ?? auditActionLabels[action] ?? formatIdentifier(action);
}

export function getAuditTargetTypeLabel(targetType: string, fallback?: string) {
  return (
    fallback ??
    auditTargetTypeLabels[targetType] ??
    formatIdentifier(targetType)
  );
}

export function formatIdentifier(value: string) {
  const label = value.replace(/[._]+/g, " ").trim();

  return label.length > 0
    ? `${label.charAt(0).toUpperCase()}${label.slice(1)}`
    : "Sin dato";
}
