import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const draftRoot = path.join(root, ".scratch/ui-draft");
const stageRoot = path.join(root, ".scratch/ui-polished-html");
const chrome = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";
const renderFilter = process.env.RASTRO_RENDER_FILTER ?? "";

const mobileVariants = [
  ["mobile-ios-390x844", 390, 844],
  ["mobile-android-360x800", 360, 800],
  ["mobile-android-412x915", 412, 915],
];

const mappings = [
  ["pantalla_de_inicio_splash", "docs/screens/01-splash-app-shell/mocks/mobile-ios-390x844-splash.png"],
  ["cerca_miembro", "docs/screens/01-splash-app-shell/mocks/mobile-ios-390x844-member-shell.png"],
  ["acciones_r_pidas_fab", "docs/screens/01-splash-app-shell/mocks/mobile-ios-390x844-fab-action-sheet.png"],
  ["inicia_sesi_n", "docs/screens/01-splash-app-shell/mocks/mobile-ios-390x844-signin-prompt.png"],

  ["cerca_lista", "docs/screens/02-nearby/mocks/mobile-ios-390x844-list-default.png"],
  ["cerca_mapa", "docs/screens/02-nearby/mocks/mobile-ios-390x844-map-default.png"],
  ["filtros_de_b_squeda", "docs/screens/02-nearby/mocks/mobile-ios-390x844-filter-sheet.png"],
  ["sin_resultados_cercanos", "docs/screens/02-nearby/mocks/mobile-ios-390x844-empty-area.png"],
  ["permiso_de_ubicaci_n", "docs/screens/02-nearby/mocks/mobile-ios-390x844-location-denied.png"],

  ["crear_reporte_detalles", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-create-lost-details.png"],
  ["seleccionar_ubicaci_n", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-create-location.png"],
  ["revisar_reporte", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-review-publish.png"],
  ["opciones_de_contacto", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-contact-options.png"],
  ["reporte_publicado_con_xito", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-publish-success.png"],
  ["reportar_avistamiento", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-create-sighting.png"],
  ["crear_perfil_de_mascota", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-create-adoption.png"],
  ["permiso_de_c_mara", "docs/screens/03-report-creation/mocks/mobile-ios-390x844-photo-permission.png"],

  ["mis_mascotas_lista", "docs/screens/04-pet-profiles/mocks/mobile-ios-390x844-my-pets-list.png"],
  ["mis_mascotas_vac_o", "docs/screens/04-pet-profiles/mocks/mobile-ios-390x844-empty.png"],
  ["crear_perfil_de_mascota", "docs/screens/04-pet-profiles/mocks/mobile-ios-390x844-create-pet.png"],
  ["detalle_de_mascota", "docs/screens/04-pet-profiles/mocks/mobile-ios-390x844-pet-detail.png"],

  ["detalle_mascota_perdida_visitante", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-lost-visitor.png"],
  ["detalle_mascota_perdida_due_o", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-lost-owner.png"],
  ["detalle_mascota_encontrada_visitante", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-found-visitor.png"],
  ["detalle_avistamiento_visitante", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-sighting-visitor.png"],
  ["detalle_en_adopci_n_visitante", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-adoption-visitor.png"],
  ["p_gina_p_blica_reporte_cerrado", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-closed-report.png"],
  ["opciones_de_chat", "docs/screens/05-report-detail/mocks/mobile-ios-390x844-report-action.png"],

  ["actividad_miembro", "docs/screens/06-activity/mocks/mobile-ios-390x844-feed.png"],
  ["actividad_visitante", "docs/screens/06-activity/mocks/mobile-ios-390x844-signed-out.png"],
  ["actividad_vac_o", "docs/screens/06-activity/mocks/mobile-ios-390x844-empty.png"],
  ["configuraci_n_de_alertas", "docs/screens/06-activity/mocks/mobile-ios-390x844-stale-prompt.png"],

  ["conversaciones_de_chat", "docs/screens/07-chat/mocks/mobile-ios-390x844-conversations.png"],
  ["chat_buster_perdido", "docs/screens/07-chat/mocks/mobile-ios-390x844-thread.png"],
  ["chat_usuario_bloqueado", "docs/screens/07-chat/mocks/mobile-ios-390x844-blocked.png"],
  ["sin_conexi_n_error", "docs/screens/07-chat/mocks/mobile-ios-390x844-send-failed.png"],

  ["recursos_lista", "docs/screens/08-resources/mocks/mobile-ios-390x844-list.png"],
  ["recursos_mapa", "docs/screens/08-resources/mocks/mobile-ios-390x844-map.png"],
  ["filtros_de_recursos", "docs/screens/08-resources/mocks/mobile-ios-390x844-filters.png"],
  ["sin_recursos_cercanos", "docs/screens/08-resources/mocks/mobile-ios-390x844-empty.png"],

  ["perfil_de_proveedor_est_ndar", "docs/screens/09-provider-profiles/mocks/mobile-ios-390x844-standard.png"],
  ["perfil_de_proveedor_verificado", "docs/screens/09-provider-profiles/mocks/mobile-ios-390x844-verified.png"],
  ["perfil_de_proveedor_patrocinado", "docs/screens/09-provider-profiles/mocks/mobile-ios-390x844-sponsored.png"],
  ["reportar_proveedor_acci_n", "docs/screens/09-provider-profiles/mocks/mobile-ios-390x844-report-provider.png"],

  ["perfil_miembro", "docs/screens/10-profile-settings/mocks/mobile-ios-390x844-member.png"],
  ["perfil_visitante", "docs/screens/10-profile-settings/mocks/mobile-ios-390x844-visitor.png"],
  ["configuraci_n_de_alertas", "docs/screens/10-profile-settings/mocks/mobile-ios-390x844-alert-settings.png"],
  ["eliminar_cuenta_confirmaci_n", "docs/screens/10-profile-settings/mocks/mobile-ios-390x844-delete-account.png"],

  ["dashboard_overview", "docs/screens/11-admin-dashboard/mocks/web-desktop-1440x900-overview.png", 1440, 900],
  ["cola_de_contenido_reportado", "docs/screens/11-admin-dashboard/mocks/web-desktop-1440x900-flagged-content.png", 1440, 900],
  ["revisi_n_de_verificaciones", "docs/screens/11-admin-dashboard/mocks/web-desktop-1440x900-verification-review.png", 1440, 900],
  ["gesti_n_de_recursos_y_patrocinios", "docs/screens/11-admin-dashboard/mocks/web-desktop-1440x900-provider-sponsors.png", 1440, 900],

  ["p_gina_p_blica_mascota_perdida", "docs/screens/12-public-web-pages/mocks/web-mobile-390x844-lost-report.png", 390, 844],
  ["p_gina_p_blica_mascota_perdida", "docs/screens/12-public-web-pages/mocks/web-desktop-1440x900-lost-report.png", 1440, 900],
  ["p_gina_p_blica_mascota_encontrada", "docs/screens/12-public-web-pages/mocks/web-mobile-390x844-found-report.png", 390, 844],
  ["p_gina_p_blica_avistamiento", "docs/screens/12-public-web-pages/mocks/web-mobile-390x844-sighting.png", 390, 844],
  ["p_gina_p_blica_en_adopci_n", "docs/screens/12-public-web-pages/mocks/web-mobile-390x844-adoption.png", 390, 844],
  ["p_gina_p_blica_reporte_cerrado", "docs/screens/12-public-web-pages/mocks/web-mobile-390x844-closed-report.png", 390, 844],

  ["cargando_lista", "docs/screens/13-app-states/mocks/mobile-ios-390x844-loading-list.png"],
  ["sin_resultados_cercanos", "docs/screens/13-app-states/mocks/mobile-ios-390x844-generic-empty.png"],
  ["sin_conexi_n_error", "docs/screens/13-app-states/mocks/mobile-ios-390x844-offline-retry.png"],
  ["permiso_de_ubicaci_n", "docs/screens/13-app-states/mocks/mobile-ios-390x844-permission-education.png"],
  ["chat_usuario_bloqueado", "docs/screens/13-app-states/mocks/mobile-ios-390x844-banned.png"],
  ["mantenimiento", "docs/screens/13-app-states/mocks/mobile-ios-390x844-maintenance.png"],
];

const colorReplacements = [
  [/#e040a0/gi, "#146C5A"],
  [/#a02070/gi, "#0E5145"],
  [/#f080c0/gi, "#BFE1D8"],
  [/#ffd6ee/gi, "#DDEFE9"],
  [/#f0a0cc/gi, "#A9D4C9"],
  [/#7c52aa/gi, "#1D7A52"],
  [/#eedcff/gi, "#DDEFE9"],
  [/#c8a8e8/gi, "#BFE1D8"],
  [/#4a3068/gi, "#39564E"],
  [/#2e2040/gi, "#17201C"],
  [/#0096cc/gi, "#2E6D9E"],
  [/#40c0ee/gi, "#CFE3EE"],
  [/#c8eaff/gi, "#E1EFF5"],
  [/#80d0f0/gi, "#B6D4E4"],
  [/#fef7ff/gi, "#F7F9F6"],
  [/#fbf2fb/gi, "#FFFFFF"],
  [/#f8eef8/gi, "#EEF3EE"],
  [/#f2e8f2/gi, "#E7EEE9"],
  [/#ece2ec/gi, "#DCE4DE"],
  [/#dcc8e0/gi, "#DCE4DE"],
  [/#907898/gi, "#82908A"],
  [/#604868/gi, "#66736D"],
  [/#2e1a28/gi, "#17201C"],
  [/#e0d6e0/gi, "#E4EBE6"],
  [/#3d0028/gi, "#0B342D"],
  [/#001a33/gi, "#102A3A"],
  [/#00334d/gi, "#183F56"],
  [/#005580/gi, "#2E6D9E"],
  [/#e53e3e/gi, "#D6453D"],
  [/#ffe8e8/gi, "#FDECEC"],
  [/#9b1c1c/gi, "#8A241D"],
  [/rgba\(224,\s*64,\s*160,\s*([^)]+)\)/gi, "rgba(20,108,90,$1)"],
  [/rgba\(124,\s*82,\s*170,\s*([^)]+)\)/gi, "rgba(29,122,82,$1)"],
  [/rgba\(0,\s*150,\s*204,\s*([^)]+)\)/gi, "rgba(46,109,158,$1)"],
  [/rgba\(46,\s*26,\s*40,\s*([^)]+)\)/gi, "rgba(23,32,28,$1)"],
];

const textReplacements = [
  ["Pet Recovery Ops", "Operaciones Rastro"],
  ["PetRescue Admin", "Rastro Admin"],
  ["PetRescue", "Rastro"],
  ["Admin Dashboard", "Panel administrativo"],
  ["GLOBAL COMMAND", "OPERACIONES"],
  ["Global Command", "Operaciones"],
  ["DASHBOARD", "PANEL"],
  ["Dashboard", "Panel"],
  ["Platform Overview", "Panel operativo"],
  ["Real-time pulse of rescue operations and community moderation.", "Pulso en tiempo real de reportes, recursos y seguridad."],
  ["Search across operations...", "Buscar en operaciones..."],
  ["Active Alerts", "Alertas activas"],
  ["Flagged Reports", "Reportes marcados"],
  ["Verification Requests", "Solicitudes de verificación"],
  ["User / Subject", "Usuario / asunto"],
  ["Flagged comment", "Comentario marcado"],
  ["Verification Badge Review", "Revisión de insignias"],
  ["Verification Review", "Revisión de verificaciones"],
  ["Search providers...", "Buscar proveedores..."],
  ["Recent Activity Summary", "Actividad reciente"],
  ["View All", "Ver todo"],
  ["Action Type", "Tipo de acción"],
  ["STATUS", "ESTADO"],
  ["Status", "Estado"],
  ["TIME", "HORA"],
  ["Time", "Hora"],
  ["Alert Triggered", "Alerta enviada"],
  ["Moderation", "Moderación"],
  ["Verification", "Verificación"],
  ["24 Pending", "24 pendientes"],
  ["Pending", "Pendiente"],
  ["PENDING", "PEND."],
  ["In Review", "En revisión"],
  ["Live", "En vivo"],
  ["Abuse by Region", "Abuso por región"],
  ["Metropolis", "Santa Cruz"],
  ["Coastal City", "La Paz"],
  ["Rivertown", "Cochabamba"],
  ["Bella's Owner", "Dueña de Bella"],
  ["Reported missing", "Reportó pérdida"],
  ["Rescue Shelter #4", "Refugio #4"],
  ["Account verify", "Cuenta por verificar"],
  ["Resource Provider & Sponsor Management", "Gestión de recursos y patrocinios"],
  ["Resource Provider &amp; Sponsor Management", "Gestión de recursos y patrocinios"],
  ["Active Schedules", "Programaciones activas"],
  ["Dashboard Top Banner", "Franja superior del panel"],
  ["Panel Top Banner", "Franja superior del panel"],
  ["Flagged Content Queue", "Cola de contenido reportado"],
  ["Search queues, reports...", "Buscar colas o reportes..."],
  ["Duplicate Post", "Publicación duplicada"],
  ["Found Reports", "Encontradas"],
  ["Pet Database", "Mascotas"],
  ["User Management", "Miembros"],
  ["Analytics", "Analítica"],
  ["Post New Alert", "Nueva alerta"],
  ["Help Center", "Ayuda"],
  ["Logout", "Salir"],
  ["Active", "Activo"],
  ["Open in App", "Abrir en Rastro"],
  ["Share Profile", "Compartir"],
  ["Compartir Perfil", "Compartir reporte"],
  ["BUSCADO", "PERDIDO"],
  ["Encontrados", "Encontradas"],
  ["Parque Europa", "Parque Urbano Central"],
  ["Madrid, Spain", "La Paz, Bolivia"],
  ["Madrid, España", "La Paz, Bolivia"],
  ["Madrid", "La Paz"],
  ["Ciudad de México", "Santa Cruz de la Sierra"],
  ["Mexico City", "Santa Cruz de la Sierra"],
  ["CDMX", "Santa Cruz"],
  ["Parque México", "Parque Urbano Central"],
  ["Parque Mexico", "Parque Urbano Central"],
  ["Parque España", "Parque Urbano"],
  ["Condesa", "Equipetrol"],
  ["Cuauhtémoc", "Santa Cruz"],
  ["Hipódromo", "Equipetrol"],
  ["Buenos Aires", "Santa Cruz de la Sierra"],
  ["Toluca, Estado de México", "Cochabamba"],
  ["Estado de México", "Cochabamba"],
  ["México", "Bolivia"],
  ["Mexico", "Bolivia"],
  ["Sydney", "La Paz"],
  ["Melbourne", "Cochabamba"],
  ["Brisbane", "Santa Cruz"],
  ["Australia", "Bolivia"],
  ["Adopcion", "Adopción"],
  ["Ubicacion", "Ubicación"],
  ["ubicacion", "ubicación"],
  ["Informacion", "Información"],
  ["informacion", "información"],
  ["Conexion", "Conexión"],
  ["conexion", "conexión"],
  ["Revision", "Revisión"],
  ["revision", "revisión"],
  ["recuperacion", "recuperación"],
  ["sesion", "sesión"],
  ["telefono", "teléfono"],
  ["direccion", "dirección"],
  ["Veterinarias", "Veterinarias"],
];

const polishCss = `
<style id="rastro-polish">
  :root {
    color-scheme: light;
    --rastro-bg: #F7F9F6;
    --rastro-surface: #FFFFFF;
    --rastro-surface-muted: #EEF3EE;
    --rastro-text: #17201C;
    --rastro-muted: #66736D;
    --rastro-border: #DCE4DE;
    --rastro-primary: #146C5A;
    --rastro-primary-dark: #0E5145;
    --rastro-lost: #D6453D;
    --rastro-found: #1D7A52;
    --rastro-sighting: #2E6D9E;
    --rastro-adoption: #9D4F66;
  }
  html, body {
    width: 100% !important;
    max-width: 100vw !important;
    min-height: 100dvh !important;
    margin: 0 !important;
    overflow-x: hidden !important;
    background: var(--rastro-bg) !important;
    color: var(--rastro-text) !important;
    font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    letter-spacing: 0 !important;
  }
  * { letter-spacing: 0 !important; }
  .candy-shadow-primary { box-shadow: 0 12px 28px rgba(20,108,90,.22) !important; }
  .candy-shadow-secondary { box-shadow: 0 12px 28px rgba(29,122,82,.16) !important; }
  .candy-shadow-tertiary { box-shadow: 0 12px 30px rgba(46,109,158,.18) !important; }
  .text-primary { color: var(--rastro-primary) !important; }
  .text-secondary { color: var(--rastro-found) !important; }
  .text-tertiary { color: var(--rastro-sighting) !important; }
  .text-on-background, .text-on-surface { color: var(--rastro-text) !important; }
  .text-on-surface-variant { color: var(--rastro-muted) !important; }
  .bg-background, .bg-surface, .bg-surface-bright { background-color: var(--rastro-bg) !important; }
  .bg-surface-container-lowest, .bg-white { background-color: var(--rastro-surface) !important; }
  .bg-surface-container, .bg-surface-container-low, .bg-surface-container-high, .bg-surface-variant { background-color: var(--rastro-surface-muted) !important; }
  .bg-primary { background-color: var(--rastro-primary) !important; }
  .bg-secondary { background-color: var(--rastro-found) !important; }
  .bg-tertiary { background-color: var(--rastro-sighting) !important; }
  .bg-primary-container, .bg-primary-fixed, .bg-primary-fixed-dim { background-color: #DDEFE9 !important; }
  .bg-secondary-container, .bg-secondary-fixed { background-color: #E7F3EB !important; }
  .bg-tertiary-container, .bg-tertiary-fixed { background-color: #E1EFF5 !important; }
  .border-primary, .border-primary-fixed, .border-secondary-fixed, .border-outline-variant, .border-surface-variant { border-color: var(--rastro-border) !important; }
  .shadow-\\[0_4px_16px_rgba\\(224\\,64\\,160\\,0\\.15\\)\\],
  .shadow-\\[0_4px_16px_rgba\\(224\\,64\\,160\\,0\\.2\\)\\],
  .shadow-\\[0_4px_16px_rgba\\(224\\,64\\,160\\,0\\.3\\)\\] {
    box-shadow: 0 12px 28px rgba(20,108,90,.18) !important;
  }
  img[data-location],
  [data-alt*="map"],
  [data-alt*="Map"],
  [data-alt*="mapa"],
  [data-alt*="Mapa"] {
    filter: saturate(.72) hue-rotate(118deg) contrast(.98) brightness(1.02);
  }
  nav.fixed.bottom-0 {
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    max-width: 430px !important;
    height: 86px !important;
    margin-inline: auto !important;
    padding: 8px 10px 14px !important;
    border-radius: 24px 24px 0 0 !important;
    border-top: 1px solid var(--rastro-border) !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: 0 -12px 32px rgba(23,32,28,.10) !important;
  }
  nav.fixed.bottom-0 a {
    min-width: 0 !important;
    flex: 1 1 0 !important;
    padding-left: 6px !important;
    padding-right: 6px !important;
  }
  nav.fixed.bottom-0 :is(a, button) {
    min-width: 0 !important;
    width: auto !important;
    flex: 1 1 0 !important;
    height: 64px !important;
    margin: 0 !important;
    padding: 6px !important;
    border: 0 !important;
    border-radius: 18px !important;
    background: transparent !important;
    color: var(--rastro-muted) !important;
    box-shadow: none !important;
    transform: none !important;
  }
  nav.fixed.bottom-0 :is(a, button)[class~="bg-primary"],
  nav.fixed.bottom-0 :is(a, button)[class~="bg-primary-container"] {
    background: #DDEFE9 !important;
    color: var(--rastro-primary) !important;
  }
  nav.fixed.bottom-0 :is(a, button) .material-symbols-outlined {
    font-size: 24px !important;
  }
  nav.fixed.bottom-0 span:last-child {
    max-width: 78px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
  .fixed.bottom-24,
  .rastro-global-fab {
    right: 18px !important;
    bottom: 98px !important;
    width: 60px !important;
    height: 60px !important;
    border-radius: 999px !important;
    background: var(--rastro-primary) !important;
    color: white !important;
    box-shadow: 0 18px 30px rgba(20,108,90,.28) !important;
  }
  .rastro-global-fab {
    position: fixed !important;
    z-index: 40 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: 0 !important;
  }
  [class*="rounded-\\[2rem\\]"],
  .rounded-lg,
  .rounded-xl {
    border-color: rgba(220,228,222,.95) !important;
  }
  main, section { scrollbar-width: none; }
  main::-webkit-scrollbar, section::-webkit-scrollbar, div::-webkit-scrollbar { display: none; }
</style>`;

function transformHtml(html) {
  let transformed = html;
  for (const [from, to] of colorReplacements) transformed = transformed.replace(from, to);
  for (const [from, to] of textReplacements) transformed = transformed.split(from).join(to);
  const hasBottomNav = /<nav[^>]*class="[^"]*fixed bottom-0/.test(transformed);
  const hasGlobalFab = /<(?:button|a)[^>]*class="[^"]*(?:fixed bottom-24|rastro-global-fab)/.test(transformed);
  if (hasBottomNav && !hasGlobalFab) {
    transformed = transformed.replace(
      /(<nav[^>]*class="[^"]*fixed bottom-0)/,
      `<button class="rastro-global-fab" aria-label="Crear reporte"><span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1;">add_alert</span></button>\n$1`,
    );
  }
  transformed = transformed.replace("</head>", `${polishCss}\n</head>`);
  return transformed;
}

function outputVariants([source, target, fixedWidth, fixedHeight]) {
  if (fixedWidth && fixedHeight) return [[target, fixedWidth, fixedHeight]];
  return mobileVariants.map(([prefix, width, height]) => [
    target.replace("mobile-ios-390x844", prefix),
    width,
    height,
  ]);
}

function prepareStage(source) {
  const input = path.join(draftRoot, source, "code.html");
  if (!existsSync(input)) throw new Error(`Missing draft source: ${input}`);
  const output = path.join(stageRoot, `${source}.html`);
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, transformHtml(readFileSync(input, "utf8")));
  return output;
}

function stateName(target) {
  return path
    .basename(target, ".png")
    .replace(/^(mobile-ios-390x844|mobile-android-360x800|mobile-android-412x915|web-desktop-1440x900|web-mobile-390x844)-/, "");
}

function writeReferenceHtml(htmlPath, target) {
  const mocksDir = path.dirname(path.join(root, target));
  const htmlDir = path.join(mocksDir, "html");
  const output = path.join(htmlDir, `${stateName(target)}.html`);
  mkdirSync(htmlDir, { recursive: true });
  if (!existsSync(output)) writeFileSync(output, readFileSync(htmlPath, "utf8"));
}

function cleanGeneratedPngs(selectedMappings) {
  if (renderFilter) {
    for (const mapping of selectedMappings) {
      for (const [target] of outputVariants(mapping)) {
        const png = path.join(root, target);
        if (existsSync(png)) rmSync(png);
        const html = path.join(path.dirname(png), "html", `${stateName(target)}.html`);
        if (existsSync(html)) rmSync(html);
      }
    }
    return;
  }

  const screensRoot = path.join(root, "docs/screens");
  for (const screen of readdirSync(screensRoot, { withFileTypes: true })) {
    if (!screen.isDirectory()) continue;
    const mocks = path.join(screensRoot, screen.name, "mocks");
    if (!existsSync(mocks)) continue;
    for (const entry of readdirSync(mocks)) {
      if (entry.endsWith(".png")) rmSync(path.join(mocks, entry));
      if (entry === "html") rmSync(path.join(mocks, entry), { recursive: true, force: true });
    }
  }
}

function render(htmlPath, target, width, height) {
  const absoluteTarget = path.join(root, target);
  mkdirSync(path.dirname(absoluteTarget), { recursive: true });
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=3500",
    `--window-size=${width},${height}`,
    `--screenshot=${absoluteTarget}`,
    `file://${htmlPath}`,
  ], { stdio: "ignore" });
}

const selectedMappings = renderFilter
  ? mappings.filter((mapping) => mapping[0].includes(renderFilter) || mapping[1].includes(renderFilter))
  : mappings;

if (selectedMappings.length === 0) throw new Error(`No mappings matched RASTRO_RENDER_FILTER=${renderFilter}`);

cleanGeneratedPngs(selectedMappings);

let rendered = 0;
for (const mapping of selectedMappings) {
  const html = prepareStage(mapping[0]);
  for (const [target, width, height] of outputVariants(mapping)) {
    writeReferenceHtml(html, target);
    render(html, target, width, height);
    rendered += 1;
    process.stdout.write(`rendered ${rendered}: ${target}\n`);
  }
}

process.stdout.write(`done: ${rendered} mocks\n`);
