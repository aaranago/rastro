import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { shellColors } from "../shell/shell-theme";

const bottomInset = 36;

export function PublicReportDeepLinkScreen({
  accentColor,
  body,
  reportId,
  title,
  webUrl,
}: {
  accentColor: string;
  body: string;
  reportId: string;
  title: string;
  webUrl: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <View style={styles.panel}>
        <Text selectable style={[styles.eyebrow, { color: accentColor }]}>
          Rastro
        </Text>
        <Text selectable style={styles.title}>
          {title}
        </Text>
        <Text selectable style={styles.body}>
          {body}
        </Text>
        <Text selectable style={styles.reportId}>
          {reportId}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Linking.openURL(webUrl);
          }}
          style={[styles.button, { backgroundColor: accentColor }]}
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
