import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  MemberProfileDefaultContactPreference,
  MemberProfileRepository,
  MemberProfileSessionState,
  MemberProfileSettings,
  MemberProfileSettingsDraft,
} from "./member-profile";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import {
  createMemberProfileSettingsDraft,
  getMemberProfileLoadFailureMessage,
  getMemberProfileSaveFailureMessage,
  normalizeMemberProfileContactPhone,
  validateMemberProfileSettingsDraft,
} from "./member-profile";

export const memberProfileSettingsBottomInset = 208;

const contactPreferenceOptions = [
  {
    body: "Conversaciones dentro de Rastro.",
    icon: "message.fill",
    label: "Chat",
    value: "in_app_chat",
  },
  {
    body: "Contacto directo por WhatsApp.",
    icon: "phone.fill",
    label: "WhatsApp",
    value: "whatsapp",
  },
  {
    body: "Permite chat en la app y WhatsApp en reportes.",
    icon: "bubble.left.and.phone.fill",
    label: "Ambos",
    value: "both",
  },
] as const satisfies readonly {
  body: string;
  icon: string;
  label: string;
  value: MemberProfileDefaultContactPreference;
}[];

export interface MemberProfileSettingsScreenProps {
  onRequestSignIn?: () => void;
  onSaved?: (settings: MemberProfileSettings) => void;
  repository: MemberProfileRepository;
  session: MemberProfileSessionState;
}

type LoadState =
  | { kind: "error"; message: string }
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" };

interface Feedback {
  message: string;
  tone: "error" | "success";
}

interface MemberProfileSettingsDraftState {
  draft: MemberProfileSettingsDraft;
  memberSessionKey: string;
}

interface MemberProfileSettingsController {
  draft: MemberProfileSettingsDraft | null;
  feedback: Feedback | null;
  loadState: LoadState;
  pendingSave: boolean;
  retryLoadSettings: () => void;
  saveSettings: () => Promise<void>;
  selectContactPreference: (
    preference: MemberProfileDefaultContactPreference,
  ) => void;
  updateDisplayName: (value: string) => void;
  updatePhone: (value: string) => void;
  updateWhatsapp: (value: string) => void;
}

export function MemberProfileSettingsScreen({
  onRequestSignIn,
  onSaved,
  repository,
  session,
}: MemberProfileSettingsScreenProps) {
  const controller = useMemberProfileSettingsController({
    onSaved,
    repository,
    session,
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: memberProfileSettingsBottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: memberProfileSettingsBottomInset }}
      style={styles.screen}
      testID="member-profile-settings-screen"
    >
      <SettingsHero session={session} />
      {session.kind === "visitor" ? (
        <VisitorPanel onRequestSignIn={onRequestSignIn} />
      ) : (
        <MemberSettingsContent controller={controller} />
      )}
    </ScrollView>
  );
}

function useMemberProfileSettingsController({
  onSaved,
  repository,
  session,
}: Pick<
  MemberProfileSettingsScreenProps,
  "onSaved" | "repository" | "session"
>): MemberProfileSettingsController {
  const [loadState, setLoadState] = React.useState<LoadState>({ kind: "idle" });
  const [draftState, setDraftState] =
    React.useState<MemberProfileSettingsDraftState | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [pendingSave, setPendingSave] = React.useState(false);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const memberSessionKey =
    session.kind === "member" ? session.memberId : "visitor";
  const draft =
    session.kind === "member" &&
    draftState?.memberSessionKey === memberSessionKey
      ? draftState.draft
      : null;

  React.useEffect(() => {
    let isActive = true;

    if (session.kind === "visitor") {
      setLoadState({ kind: "idle" });
      setDraftState(null);
      setFeedback(null);
      return;
    }

    const loadMemberSessionKey = memberSessionKey;

    setLoadState({ kind: "loading" });
    setFeedback(null);
    repository
      .getSettings(session)
      .then((settings) => {
        if (!isActive) {
          return;
        }

        setDraftState({
          draft: createMemberProfileSettingsDraft(settings),
          memberSessionKey: loadMemberSessionKey,
        });
        setLoadState({ kind: "ready" });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setLoadState({
          kind: "error",
          message: getMemberProfileLoadFailureMessage(error),
        });
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt, memberSessionKey, repository, session]);

  const updateDraft = React.useCallback(
    (patch: Partial<MemberProfileSettingsDraft>) => {
      setDraftState((current) => {
        if (current?.memberSessionKey !== memberSessionKey) {
          return current;
        }

        return {
          ...current,
          draft: { ...current.draft, ...patch },
        };
      });
    },
    [memberSessionKey],
  );

  const retryLoadSettings = React.useCallback(() => {
    setLoadAttempt((current) => current + 1);
  }, []);

  const saveSettings = React.useCallback(async () => {
    if (session.kind === "visitor" || !draft) {
      return;
    }

    const validation = validateMemberProfileSettingsDraft(draft);

    if (!validation.ok || !validation.input) {
      setFeedback({
        message: validation.errors.join(" "),
        tone: "error",
      });
      return;
    }

    setPendingSave(true);
    setFeedback(null);

    try {
      const saved = await repository.updateSettings(session, validation.input);

      setDraftState({
        draft: createMemberProfileSettingsDraft(saved),
        memberSessionKey,
      });
      setLoadState({ kind: "ready" });
      setFeedback({
        message: "Ajustes guardados en Rastro.",
        tone: "success",
      });
      onSaved?.(saved);
    } catch (error) {
      setFeedback({
        message: getMemberProfileSaveFailureMessage(error),
        tone: "error",
      });
    } finally {
      setPendingSave(false);
    }
  }, [draft, memberSessionKey, onSaved, repository, session]);

  return {
    draft,
    feedback,
    loadState,
    pendingSave,
    retryLoadSettings,
    saveSettings,
    selectContactPreference: (preference) => {
      updateDraft({ defaultContactPreference: preference });
    },
    updateDisplayName: (displayName) => {
      updateDraft({ displayName });
    },
    updatePhone: (phone) => {
      updateDraft({ phone: normalizeMemberProfileContactPhone(phone) });
    },
    updateWhatsapp: (whatsapp) => {
      updateDraft({ whatsapp: normalizeMemberProfileContactPhone(whatsapp) });
    },
  };
}

function SettingsHero({ session }: { session: MemberProfileSessionState }) {
  const isMember = session.kind === "member";

  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <ShellIcon
          color={shellColors.white}
          name={isMember ? "person.crop.circle.fill" : "lock.fill"}
          size={24}
        />
      </View>
      <View style={styles.heroCopy}>
        <Text selectable style={styles.eyebrow}>
          Ajustes de perfil
        </Text>
        <Text selectable style={styles.title}>
          {isMember ? "Tu identidad pública" : "Inicia sesión para editar"}
        </Text>
        <Text selectable style={styles.body}>
          {isMember
            ? "Estos datos se guardan en Rastro y se usan como valores por defecto al crear reportes."
            : "Como visitante puedes explorar, pero no editamos ajustes locales sin cuenta."}
        </Text>
      </View>
    </View>
  );
}

function VisitorPanel({ onRequestSignIn }: { onRequestSignIn?: () => void }) {
  return (
    <View style={styles.panel}>
      <Text selectable style={styles.sectionTitle}>
        Cuenta requerida
      </Text>
      <Text selectable style={styles.mutedText}>
        Inicia sesión para cargar y guardar tu nombre público, teléfono y
        WhatsApp en Rastro.
      </Text>
      <ActionButton
        icon="arrow.right.to.line"
        label="Iniciar sesión"
        onPress={onRequestSignIn}
        testID="member-profile-sign-in-button"
      />
    </View>
  );
}

function MemberSettingsContent({
  controller,
}: {
  controller: MemberProfileSettingsController;
}) {
  if (!controller.draft && controller.loadState.kind === "loading") {
    return <LoadingPanel />;
  }

  if (!controller.draft && controller.loadState.kind === "error") {
    return (
      <>
        <LoadErrorNotice
          isBlocking
          message={controller.loadState.message}
          onRetry={controller.retryLoadSettings}
        />
      </>
    );
  }

  return (
    <>
      {controller.loadState.kind === "loading" ? <LoadingBanner /> : null}
      {controller.loadState.kind === "error" ? (
        <LoadErrorNotice
          message={controller.loadState.message}
          onRetry={controller.retryLoadSettings}
        />
      ) : null}
      {controller.draft ? <ProfileForm controller={controller} /> : null}
      <FeedbackMessage feedback={controller.feedback} />
    </>
  );
}

function LoadErrorNotice({
  isBlocking = false,
  message,
  onRetry,
}: {
  isBlocking?: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={isBlocking ? styles.panel : styles.loadErrorBanner}
      testID="member-profile-load-error-state"
    >
      <View style={styles.loadErrorCopy}>
        {isBlocking ? (
          <Text selectable style={styles.sectionTitle}>
            No pudimos cargar tus ajustes
          </Text>
        ) : null}
        <Text
          selectable
          style={isBlocking ? styles.mutedText : styles.loadErrorText}
        >
          {message}
        </Text>
      </View>
      <ActionButton
        icon="arrow.clockwise"
        label="Reintentar"
        onPress={onRetry}
        testID="member-profile-load-retry-button"
      />
    </View>
  );
}

function ProfileForm({
  controller,
}: {
  controller: MemberProfileSettingsController;
}) {
  const { draft, pendingSave } = controller;

  if (!draft) {
    return null;
  }

  return (
    <>
      <View style={styles.panel}>
        <Text selectable style={styles.sectionTitle}>
          Nombre público
        </Text>
        <Text selectable style={styles.mutedText}>
          Es el nombre que otras personas ven en reportes y conversaciones.
        </Text>
        <TextInput
          accessibilityLabel="Nombre público"
          autoCapitalize="words"
          autoComplete="off"
          editable={!pendingSave}
          importantForAutofill="no"
          onChangeText={controller.updateDisplayName}
          placeholder="Tu nombre"
          style={styles.input}
          testID="member-profile-display-name-input"
          value={draft.displayName}
        />
      </View>

      <View style={styles.panel}>
        <Text selectable style={styles.sectionTitle}>
          Método de contacto por defecto
        </Text>
        <Text selectable style={styles.mutedText}>
          Lo usaremos como punto de partida cuando publiques reportes.
        </Text>
        <View style={styles.methodList}>
          {contactPreferenceOptions.map((option) => (
            <ContactMethodOption
              disabled={pendingSave}
              isSelected={draft.defaultContactPreference === option.value}
              key={option.value}
              onPress={() => {
                controller.selectContactPreference(option.value);
              }}
              option={option}
            />
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text selectable style={styles.sectionTitle}>
          Teléfonos de contacto
        </Text>
        <Text selectable style={styles.mutedText}>
          Puedes dejar vacío lo que no quieras compartir por defecto.
        </Text>
        <ContactInput
          editable={!pendingSave}
          label="Teléfono"
          onChangeText={controller.updatePhone}
          placeholder="+591 70123456"
          testID="member-profile-phone-input"
          value={draft.phone}
        />
        <ContactInput
          editable={!pendingSave}
          label="WhatsApp"
          onChangeText={controller.updateWhatsapp}
          placeholder="+591 70123456"
          testID="member-profile-whatsapp-input"
          value={draft.whatsapp}
        />
      </View>

      <ActionButton
        disabled={pendingSave}
        icon="checkmark.seal.fill"
        label={pendingSave ? "Guardando..." : "Guardar ajustes"}
        onPress={() => {
          void controller.saveSettings();
        }}
        testID="member-profile-save-button"
      />
    </>
  );
}

function ContactMethodOption({
  disabled,
  isSelected,
  onPress,
  option,
}: {
  disabled: boolean;
  isSelected: boolean;
  onPress: () => void;
  option: (typeof contactPreferenceOptions)[number];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSelected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.methodOption,
        isSelected ? styles.methodOptionSelected : null,
      ]}
      testID={`member-profile-contact-preference-${option.value}`}
    >
      <View style={styles.methodIcon}>
        <ShellIcon
          color={isSelected ? shellColors.white : shellColors.primary}
          name={option.icon}
          size={18}
        />
      </View>
      <View style={styles.methodCopy}>
        <Text
          selectable
          style={[
            styles.methodLabel,
            isSelected ? styles.methodLabelSelected : null,
          ]}
        >
          {option.label}
        </Text>
        <Text
          selectable
          style={[
            styles.methodBody,
            isSelected ? styles.methodBodySelected : null,
          ]}
        >
          {option.body}
        </Text>
      </View>
    </Pressable>
  );
}

function ContactInput({
  editable,
  label,
  onChangeText,
  placeholder,
  testID,
  value,
}: {
  editable: boolean;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text selectable style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoComplete="off"
        editable={editable}
        importantForAutofill="no"
        keyboardType="phone-pad"
        onEndEditing={(event) => {
          onChangeText(event.nativeEvent.text);
        }}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  );
}

function LoadingPanel() {
  return (
    <View style={styles.panel}>
      <ActivityIndicator color={shellColors.primary} />
      <Text selectable style={styles.mutedText}>
        Cargando ajustes...
      </Text>
    </View>
  );
}

function LoadingBanner() {
  return (
    <View style={styles.loadingBanner}>
      <ActivityIndicator color={shellColors.primary} />
      <Text selectable style={styles.loadingText}>
        Actualizando ajustes...
      </Text>
    </View>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return null;
  }

  return (
    <Text
      selectable
      style={
        feedback.tone === "success"
          ? styles.feedbackSuccess
          : styles.feedbackError
      }
      testID="member-profile-feedback"
    >
      {feedback.message}
    </Text>
  );
}

function ActionButton({
  disabled = false,
  icon,
  label,
  onPress,
  testID,
}: {
  disabled?: boolean;
  icon: string;
  label: string;
  onPress?: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled ? styles.actionButtonDisabled : null,
        pressed ? styles.actionButtonPressed : null,
      ]}
      testID={testID}
    >
      <View pointerEvents="none" style={styles.actionButtonContent}>
        <ShellIcon color={shellColors.white} name={icon} size={18} />
        <Text style={styles.actionButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  actionButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonPressed: {
    backgroundColor: shellColors.primaryDark,
  },
  actionButtonText: {
    color: shellColors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  body: {
    color: "#DDEFE9",
    fontSize: 15,
    lineHeight: 21,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: memberProfileSettingsBottomInset,
  },
  eyebrow: {
    color: "#BFE4D7",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  feedbackError: {
    backgroundColor: "#FDECEC",
    borderColor: "#F4B8B4",
    borderRadius: 8,
    borderWidth: 1,
    color: "#8A1F19",
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  feedbackSuccess: {
    backgroundColor: shellColors.primarySoft,
    borderColor: "#A9D4C9",
    borderRadius: 8,
    borderWidth: 1,
    color: shellColors.primaryDark,
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  hero: {
    alignItems: "flex-start",
    backgroundColor: shellColors.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  input: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: shellColors.text,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  loadingBanner: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  loadingText: {
    color: shellColors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
  },
  loadErrorBanner: {
    backgroundColor: "#FDECEC",
    borderColor: "#F4B8B4",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  loadErrorCopy: {
    gap: 6,
  },
  loadErrorText: {
    color: "#8A1F19",
    fontSize: 14,
    lineHeight: 20,
  },
  methodBody: {
    color: shellColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  methodBodySelected: {
    color: "#E9F7F2",
  },
  methodCopy: {
    flex: 1,
    gap: 3,
  },
  methodIcon: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  methodLabel: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  methodLabelSelected: {
    color: shellColors.white,
  },
  methodList: {
    gap: 10,
  },
  methodOption: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 70,
    padding: 12,
  },
  methodOptionSelected: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  mutedText: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  sectionTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    color: shellColors.white,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 28,
  },
});
