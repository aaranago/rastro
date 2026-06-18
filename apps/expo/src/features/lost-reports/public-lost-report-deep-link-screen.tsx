import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { buildPublicLostReportShareTarget } from "@acme/validators";

import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";
const bottomInset = 36;

export function PublicLostReportDeepLinkScreen({
  reportId,
}: {
  reportId?: string;
}) {
  const safeReportId = reportId?.trim() ?? "reporte";
  const shareTarget = buildPublicLostReportShareTarget({
    publicWebBaseUrl,
    reportId: safeReportId,
    title: "mascota perdida",
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <View style={styles.panel}>
        <Text selectable style={styles.eyebrow}>
          Rastro
        </Text>
        <Text selectable style={styles.title}>
          Reporte de mascota perdida
        </Text>
        <Text selectable style={styles.body}>
          Este enlace abre el reporte compartido en la app. Si el detalle aun no
          esta sincronizado en tu telefono, puedes abrir la pagina publica.
        </Text>
        <Text selectable style={styles.reportId}>
          {safeReportId}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Linking.openURL(shareTarget.webUrl);
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Abrir pagina publica</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: shellColors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderCurve: "continuous",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  buttonText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  content: {
    padding: 18,
    paddingTop: 32,
  },
  eyebrow: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  reportId: {
    color: shellColors.text,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  title: {
    color: shellColors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
});
