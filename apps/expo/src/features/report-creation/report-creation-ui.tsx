import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { ReactNode } from "react";
import type {
  DimensionValue,
  ImageStyle,
  KeyboardTypeOptions,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import * as React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import DateTimePicker from "@react-native-community/datetimepicker";

import type { CreationDraftKind } from "../resilience/creation-drafts";
import type {
  DurableCreationDraftPersistence,
  DurableCreationDraftRecovery,
} from "../resilience/use-durable-creation-draft";
import type { ReportCreationJourneyStep } from "./report-creation-journey";
import { normalizeReportCreationEventTime } from "./report-creation-event-time";

export interface ReportCreationFieldViewModel {
  error?: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface ReportCreationOption<TValue extends string> {
  body: string;
  iconName: string;
  isSelected: boolean;
  label: string;
  value: TValue;
}

export interface ReportCreationReviewRow {
  label: string;
  value: string;
}

export interface ReportCreationStep {
  id: string;
  isComplete: boolean;
  label: string;
}

export type ReportCreationProgressStep =
  | ReportCreationJourneyStep
  | ReportCreationStep;

export interface ReportCreationPetProfileOptionViewModel {
  body: string;
  id: string;
  isSelected: boolean;
  photoCountLabel: string;
  thumbnailUri?: string;
  title: string;
}

export type ReportCreationPublishState = "editing" | "publishing" | "success";

export type ReportCreationIconComponent = (props: {
  color: string;
  name: string;
  size?: number;
}) => ReactNode;

const minimumTopSafeArea = 12;
const screenTopContentSpacing = 16;
const minimumBottomSafeArea = 16;
const stickyFooterContentClearance = 172;

export interface ReportCreationScreenInsets {
  contentInsetBottom: number;
  contentPaddingTop: number;
  footerPaddingBottom: number;
  scrollIndicatorInsetBottom: number;
}

export function getReportCreationScreenInsets({
  bottom,
  hasFooter,
  top,
}: {
  bottom: number;
  hasFooter: boolean;
  top: number;
}): ReportCreationScreenInsets {
  const safeTop = Math.max(top, minimumTopSafeArea);
  const safeBottom = Math.max(bottom, minimumBottomSafeArea);
  const bottomContentInset = hasFooter
    ? stickyFooterContentClearance + safeBottom
    : safeBottom;

  return {
    contentInsetBottom: bottomContentInset,
    contentPaddingTop: safeTop + screenTopContentSpacing,
    footerPaddingBottom: safeBottom,
    scrollIndicatorInsetBottom: hasFooter ? 0 : bottomContentInset,
  };
}

export function ReportCreationScreenFrame({
  children,
  contentContainerStyle,
  footer,
  scrollViewRef,
  style,
}: {
  children: ReactNode;
  contentContainerStyle: StyleProp<ViewStyle>;
  footer?: ReactNode;
  scrollViewRef?: React.Ref<React.ComponentRef<typeof ScrollView>>;
  style: StyleProp<ViewStyle>;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const screenInsets = getReportCreationScreenInsets({
    bottom: safeAreaInsets.bottom,
    hasFooter: Boolean(footer),
    top: safeAreaInsets.top,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={style}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          contentContainerStyle,
          {
            paddingBottom: screenInsets.contentInsetBottom,
            paddingTop: screenInsets.contentPaddingTop,
          },
        ]}
        contentInset={{ bottom: screenInsets.contentInsetBottom }}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{
          bottom: screenInsets.scrollIndicatorInsetBottom,
        }}
        style={screenFrameStyles.scrollView}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            screenFrameStyles.footer,
            { paddingBottom: screenInsets.footerPaddingBottom },
          ]}
          testID="report-creation-frame-footer"
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const screenFrameStyles = StyleSheet.create({
  footer: {
    backgroundColor: "#F8FBF9",
    borderTopColor: "#DDE8E1",
    borderTopWidth: 1,
    boxShadow: "0 -10px 22px rgba(23, 32, 28, 0.08)",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollView: {
    flex: 1,
  },
});

export interface ReportCreationStyles {
  actionButton: StyleProp<ViewStyle>;
  actionButtonPrimary: StyleProp<ViewStyle>;
  actionButtonSecondary: StyleProp<ViewStyle>;
  actionButtonText: StyleProp<TextStyle>;
  actionButtonTextPrimary: StyleProp<TextStyle>;
  addPhotoText: StyleProp<TextStyle>;
  addPhotoTile: StyleProp<ViewStyle>;
  contactOption: StyleProp<ViewStyle>;
  content: StyleProp<ViewStyle>;
  disabledButton: StyleProp<ViewStyle>;
  disabledTile: StyleProp<ViewStyle>;
  errorText: StyleProp<TextStyle>;
  field: StyleProp<ViewStyle>;
  fieldLabel: StyleProp<TextStyle>;
  helpText: StyleProp<TextStyle>;
  infoLabel: StyleProp<TextStyle>;
  infoRow: StyleProp<ViewStyle>;
  input: StyleProp<TextStyle>;
  itemTitle: StyleProp<TextStyle>;
  metaText: StyleProp<TextStyle>;
  multilineInput: StyleProp<TextStyle>;
  optionCopy: StyleProp<ViewStyle>;
  optionStack: StyleProp<ViewStyle>;
  permissionBox: StyleProp<ViewStyle>;
  photoGrid: StyleProp<ViewStyle>;
  photoImage: StyleProp<ImageStyle>;
  photoTile: StyleProp<ViewStyle>;
  pressed: StyleProp<ViewStyle>;
  publishButton: StyleProp<ViewStyle>;
  publishText: StyleProp<TextStyle>;
  reviewLabel: StyleProp<TextStyle>;
  reviewList: StyleProp<ViewStyle>;
  reviewRow: StyleProp<ViewStyle>;
  reviewValue: StyleProp<TextStyle>;
  section: StyleProp<ViewStyle>;
  sectionTitle: StyleProp<TextStyle>;
  selectedBorder: StyleProp<ViewStyle>;
  selectedPill: StyleProp<ViewStyle>;
  selectedPillText: StyleProp<TextStyle>;
  screen: StyleProp<ViewStyle>;
  stepDot: StyleProp<ViewStyle>;
  stepDotComplete: StyleProp<ViewStyle>;
  stepItem: StyleProp<ViewStyle>;
  stepLabel: StyleProp<TextStyle>;
  stepNumber: StyleProp<TextStyle>;
  stepNumberComplete: StyleProp<TextStyle>;
  steps: StyleProp<ViewStyle>;
  switchOn: StyleProp<ViewStyle>;
  switchThumb: StyleProp<ViewStyle>;
  switchThumbOn: StyleProp<ViewStyle>;
  switchTrack: StyleProp<ViewStyle>;
  toggleRow: StyleProp<ViewStyle>;
  typePill: StyleProp<ViewStyle>;
  typePillText: StyleProp<TextStyle>;
  typeRow: StyleProp<ViewStyle>;
}

export type ReportCreationPetProfileListStyles = Pick<
  ReportCreationStyles,
  "itemTitle" | "metaText" | "optionCopy" | "optionStack" | "selectedBorder"
> & {
  petOption: StyleProp<ViewStyle>;
  petThumb: StyleProp<ImageStyle>;
};

export function useReportCreationPetDraftUpdaters<
  TType extends string,
  TDraft extends {
    pet: {
      breed: string;
      description: string;
      type: TType;
    };
  },
>(setDraft: React.Dispatch<React.SetStateAction<TDraft>>) {
  const updatePetType = React.useCallback(
    (type: TType) => {
      setDraft((current) => ({
        ...current,
        pet: { ...current.pet, type },
      }));
    },
    [setDraft],
  );
  const updatePetBreed = React.useCallback(
    (breed: string) => {
      setDraft((current) => ({
        ...current,
        pet: {
          ...current.pet,
          breed,
        },
      }));
    },
    [setDraft],
  );
  const updatePetDescription = React.useCallback(
    (description: string) => {
      setDraft((current) => ({
        ...current,
        pet: {
          ...current.pet,
          description,
        },
      }));
    },
    [setDraft],
  );

  return {
    updatePetBreed,
    updatePetDescription,
    updatePetType,
  };
}

export function ReportCreationSection({
  children,
  styles,
  title,
}: {
  children: ReactNode;
  styles: ReportCreationStyles;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.15} style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ReportCreationDraftPersistenceAlert({
  draftPersistence,
}: {
  draftPersistence: DurableCreationDraftPersistence;
}) {
  if (draftPersistence.error === null) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={draftPersistenceAlertStyles.container}
    >
      <Text selectable style={draftPersistenceAlertStyles.text}>
        {draftPersistence.error.message}
      </Text>
    </View>
  );
}

export function ReportCreationField({
  field,
  keyboardType,
  multiline,
  onChangeText,
  placeholderTextColor,
  styles,
}: {
  field: ReportCreationFieldViewModel;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholderTextColor: string;
  styles: ReportCreationStyles;
}) {
  return (
    <View style={styles.field}>
      <Text maxFontSizeMultiplier={1.1} style={styles.fieldLabel}>
        {field.label}
      </Text>
      <TextInput
        accessibilityHint={field.error}
        accessibilityLabel={field.label}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={field.placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, multiline ? styles.multilineInput : null]}
        value={field.value}
      />
      <ReportCreationErrorText message={field.error} styles={styles} />
    </View>
  );
}

type ReportCreationDateTimePickerMode = "date" | "time";

export function ReportCreationDateTimeField({
  accentColor = "#0F7665",
  field,
  maximumDate,
  onChangeDateTime,
  placeholderTextColor,
  styles,
}: {
  accentColor?: string;
  field: ReportCreationFieldViewModel;
  maximumDate?: Date;
  onChangeDateTime: (value: string) => void;
  placeholderTextColor: string;
  styles: ReportCreationStyles;
}) {
  const [pickerMode, setPickerMode] =
    React.useState<ReportCreationDateTimePickerMode | null>(null);
  const selectedDate = React.useMemo(
    () => parseReportCreationDateTimeValue(field.value),
    [field.value],
  );
  const pickerDate = React.useMemo(
    () => selectedDate ?? maximumDate ?? new Date(),
    [maximumDate, selectedDate],
  );
  const displayValue = selectedDate
    ? formatReportCreationDateTime(selectedDate)
    : field.placeholder;

  const handlePickerChange = React.useCallback(
    (event: DateTimePickerEvent, value?: Date) => {
      if (event.type === "dismissed") {
        setPickerMode(null);
        return;
      }

      if (!value || !pickerMode) {
        return;
      }

      const merged =
        pickerMode === "date"
          ? mergeReportCreationDatePart(pickerDate, value)
          : mergeReportCreationTimePart(pickerDate, value);
      const clamped = clampReportCreationDateTime(
        merged,
        maximumDate ?? new Date(),
      );

      onChangeDateTime(clamped.toISOString());
      setPickerMode(null);
    },
    [maximumDate, onChangeDateTime, pickerDate, pickerMode],
  );

  return (
    <View style={styles.field}>
      <Text maxFontSizeMultiplier={1.1} style={styles.fieldLabel}>
        {field.label}
      </Text>
      <View
        accessibilityHint={field.error}
        accessibilityLabel={field.label}
        style={[
          dateTimeFieldStyles.container,
          field.error ? dateTimeFieldStyles.containerError : null,
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.1}
          style={[
            dateTimeFieldStyles.valueText,
            selectedDate ? null : { color: placeholderTextColor },
          ]}
        >
          {displayValue}
        </Text>
        <View style={dateTimeFieldStyles.actionRow}>
          <Pressable
            accessibilityLabel={`Cambiar fecha de ${field.label}`}
            accessibilityRole="button"
            onPress={() => setPickerMode("date")}
            style={({ pressed }) => [
              dateTimeFieldStyles.actionButton,
              { borderColor: accentColor },
              pressed ? dateTimeFieldStyles.actionButtonPressed : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.05}
              style={[dateTimeFieldStyles.actionText, { color: accentColor }]}
            >
              Fecha
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Cambiar hora de ${field.label}`}
            accessibilityRole="button"
            onPress={() => setPickerMode("time")}
            style={({ pressed }) => [
              dateTimeFieldStyles.actionButton,
              { borderColor: accentColor },
              pressed ? dateTimeFieldStyles.actionButtonPressed : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.05}
              style={[dateTimeFieldStyles.actionText, { color: accentColor }]}
            >
              Hora
            </Text>
          </Pressable>
        </View>
      </View>
      <ReportCreationErrorText message={field.error} styles={styles} />
      {pickerMode ? (
        <DateTimePicker
          display="default"
          is24Hour
          locale="es-BO"
          maximumDate={maximumDate ?? new Date()}
          minuteInterval={5}
          mode={pickerMode}
          onChange={handlePickerChange}
          value={pickerDate}
        />
      ) : null}
    </View>
  );
}

function parseReportCreationDateTimeValue(value: string) {
  const normalized = normalizeReportCreationEventTime(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatReportCreationDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mergeReportCreationDatePart(baseDate: Date, selectedDate: Date) {
  const nextDate = new Date(baseDate);

  nextDate.setFullYear(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
  );

  return nextDate;
}

function mergeReportCreationTimePart(baseDate: Date, selectedDate: Date) {
  const nextDate = new Date(baseDate);

  nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);

  return nextDate;
}

function clampReportCreationDateTime(date: Date, maximumDate: Date) {
  return date.getTime() > maximumDate.getTime() ? maximumDate : date;
}

const dateTimeFieldStyles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  actionButtonPressed: {
    opacity: 0.76,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8E1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  containerError: {
    borderColor: "#D6453D",
  },
  valueText: {
    color: "#1E2A24",
    fontSize: 16,
    lineHeight: 22,
    minHeight: 22,
  },
});

export function ReportCreationErrorText({
  maxFontSizeMultiplier = 1.15,
  message,
  styles,
}: {
  maxFontSizeMultiplier?: number;
  message?: string;
  styles: ReportCreationStyles;
}) {
  return message ? (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      selectable
      style={styles.errorText}
    >
      {message}
    </Text>
  ) : null;
}

export function useReportCreationPublishedResultActions<TConfirmation>({
  onClose,
  onOpenPublishedResult,
  onSharePublishedResult,
  publishedResult,
}: {
  onClose?: () => void;
  onOpenPublishedResult?: (confirmation: TConfirmation) => void;
  onSharePublishedResult?: (
    confirmation: TConfirmation,
  ) => Promise<void> | void;
  publishedResult: TConfirmation | null;
}) {
  const sharePublishedResult = React.useCallback(() => {
    if (publishedResult) {
      void onSharePublishedResult?.(publishedResult);
    }
  }, [onSharePublishedResult, publishedResult]);
  const openPublishedResult = React.useCallback(() => {
    if (publishedResult && onOpenPublishedResult) {
      onOpenPublishedResult(publishedResult);
      return;
    }

    onClose?.();
  }, [onClose, onOpenPublishedResult, publishedResult]);

  return {
    canSharePublishedResult: Boolean(publishedResult && onSharePublishedResult),
    openPublishedResult,
    sharePublishedResult,
  };
}

export function ReportCreationDraftRecoveryPrompt<K extends CreationDraftKind>({
  draftRecovery,
  onDiscardDraft,
  onResumeDraft,
}: {
  draftRecovery: DurableCreationDraftRecovery<K>;
  onDiscardDraft: () => Promise<void> | void;
  onResumeDraft: () => void;
}) {
  if (draftRecovery.status === "available") {
    return (
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={draftRecoveryPromptStyles.container}
      >
        <Text selectable style={draftRecoveryPromptStyles.title}>
          Encontramos un borrador guardado.
        </Text>
        <Text selectable style={draftRecoveryPromptStyles.body}>
          Puedes retomarlo o descartarlo para empezar de nuevo.
        </Text>
        <View style={draftRecoveryPromptStyles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onResumeDraft}
            style={[
              draftRecoveryPromptStyles.button,
              draftRecoveryPromptStyles.primaryButton,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.1}
              style={[
                draftRecoveryPromptStyles.buttonText,
                draftRecoveryPromptStyles.primaryButtonText,
              ]}
            >
              Retomar borrador
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onDiscardDraft}
            style={[
              draftRecoveryPromptStyles.button,
              draftRecoveryPromptStyles.secondaryButton,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.1}
              style={[
                draftRecoveryPromptStyles.buttonText,
                draftRecoveryPromptStyles.secondaryButtonText,
              ]}
            >
              Descartar borrador
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (draftRecovery.status === "incompatible") {
    return (
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          draftRecoveryPromptStyles.container,
          draftRecoveryPromptStyles.incompatibleContainer,
        ]}
      >
        <Text selectable style={draftRecoveryPromptStyles.title}>
          No pudimos abrir el borrador guardado.
        </Text>
        <Text selectable style={draftRecoveryPromptStyles.body}>
          {draftRecovery.reason} Puedes descartarlo para empezar de nuevo.
        </Text>
        <View style={draftRecoveryPromptStyles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onDiscardDraft}
            style={[
              draftRecoveryPromptStyles.button,
              draftRecoveryPromptStyles.primaryButton,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.1}
              style={[
                draftRecoveryPromptStyles.buttonText,
                draftRecoveryPromptStyles.primaryButtonText,
              ]}
            >
              Descartar borrador
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const draftPersistenceAlertStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF2F1",
    borderColor: "#D6453D",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    color: "#8F1F18",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
});

const draftRecoveryPromptStyles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  body: {
    color: "#365146",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  container: {
    backgroundColor: "#EEF8F3",
    borderColor: "#2E8F62",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  incompatibleContainer: {
    backgroundColor: "#FFF7E8",
    borderColor: "#C77718",
  },
  primaryButton: {
    backgroundColor: "#1F7A4D",
    borderColor: "#1F7A4D",
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#9EB3A8",
  },
  secondaryButtonText: {
    color: "#1F7A4D",
  },
  title: {
    color: "#183F2B",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginBottom: 4,
  },
});

export function ReportCreationPetSnapshotSection<TType extends string>({
  breedField,
  descriptionField,
  onChangeBreed,
  onChangeDescription,
  onSelectType,
  placeholderTextColor,
  selectedType,
  styles,
  title,
  typeOptions,
}: {
  breedField: ReportCreationFieldViewModel;
  descriptionField: ReportCreationFieldViewModel;
  onChangeBreed: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onSelectType: (type: TType) => void;
  placeholderTextColor: string;
  selectedType: TType;
  styles: ReportCreationStyles;
  title: string;
  typeOptions: readonly TType[];
}) {
  return (
    <ReportCreationSection styles={styles} title={title}>
      <ReportCreationInlinePetTypeRow
        onSelectType={onSelectType}
        selectedType={selectedType}
        styles={styles}
        typeOptions={typeOptions}
      />
      <ReportCreationField
        field={breedField}
        onChangeText={onChangeBreed}
        placeholderTextColor={placeholderTextColor}
        styles={styles}
      />
      <ReportCreationField
        multiline
        field={descriptionField}
        onChangeText={onChangeDescription}
        placeholderTextColor={placeholderTextColor}
        styles={styles}
      />
    </ReportCreationSection>
  );
}

export function ReportCreationExistingPetProfileList({
  accentColor,
  Icon,
  onSelectProfile,
  options,
  styles,
}: {
  accentColor: string;
  Icon: ReportCreationIconComponent;
  onSelectProfile: (profileId: string) => void;
  options: readonly ReportCreationPetProfileOptionViewModel[];
  styles: ReportCreationPetProfileListStyles;
}) {
  return (
    <View style={styles.optionStack}>
      {options.map((profile) => (
        <Pressable
          accessibilityState={{ selected: profile.isSelected }}
          accessibilityRole="button"
          key={profile.id}
          onPress={() => onSelectProfile(profile.id)}
          style={[
            styles.petOption,
            profile.isSelected ? styles.selectedBorder : null,
          ]}
        >
          <Image
            accessibilityLabel={profile.title}
            contentFit="cover"
            source={
              profile.thumbnailUri ? { uri: profile.thumbnailUri } : undefined
            }
            style={styles.petThumb}
          />
          <View style={styles.optionCopy}>
            <Text maxFontSizeMultiplier={1.15} style={styles.itemTitle}>
              {profile.title}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={styles.metaText}>
              {profile.body} · {profile.photoCountLabel}
            </Text>
          </View>
          {profile.isSelected ? (
            <Icon color={accentColor} name="checkmark.circle.fill" size={22} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export function ReportCreationInlinePetTypeRow<TType extends string>({
  onSelectType,
  selectedType,
  styles,
  typeOptions,
}: {
  onSelectType: (type: TType) => void;
  selectedType: TType | "";
  styles: Pick<
    ReportCreationStyles,
    | "selectedPill"
    | "selectedPillText"
    | "typePill"
    | "typePillText"
    | "typeRow"
  >;
  typeOptions: readonly TType[];
}) {
  return (
    <View style={styles.typeRow}>
      {typeOptions.map((type) => (
        <Pressable
          accessibilityState={{ selected: selectedType === type }}
          accessibilityRole="button"
          key={type}
          onPress={() => onSelectType(type)}
          style={[
            styles.typePill,
            selectedType === type ? styles.selectedPill : null,
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.1}
            style={[
              styles.typePillText,
              selectedType === type ? styles.selectedPillText : null,
            ]}
          >
            {type}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ReportCreationDetailsFieldsSection<TKey extends string>({
  dateTimeAccentColor,
  fields,
  onChangeField,
  placeholderTextColor,
  styles,
  title,
}: {
  fields: readonly {
    input?: "dateTime" | "text";
    field: ReportCreationFieldViewModel;
    key: TKey;
    multiline?: boolean;
  }[];
  dateTimeAccentColor?: string;
  onChangeField: (key: TKey, value: string) => void;
  placeholderTextColor: string;
  styles: ReportCreationStyles;
  title: string;
}) {
  return (
    <ReportCreationSection styles={styles} title={title}>
      {fields.map((item) =>
        item.input === "dateTime" ? (
          <ReportCreationDateTimeField
            accentColor={dateTimeAccentColor}
            field={item.field}
            key={item.key}
            onChangeDateTime={(value) => onChangeField(item.key, value)}
            placeholderTextColor={placeholderTextColor}
            styles={styles}
          />
        ) : (
          <ReportCreationField
            field={item.field}
            key={item.key}
            multiline={item.multiline}
            onChangeText={(value) => onChangeField(item.key, value)}
            placeholderTextColor={placeholderTextColor}
            styles={styles}
          />
        ),
      )}
    </ReportCreationSection>
  );
}

export interface ReportCreationPhotoItem {
  alt?: string;
  id: string;
  thumbUri?: string;
  uri?: string;
}

export function ReportCreationPhotoSection<
  TPhoto extends ReportCreationPhotoItem,
>({
  accentColor,
  addPhoto,
  addPhotoAccessibilityLabel,
  canAddPhoto,
  countLabel,
  error,
  helpLabel,
  Icon,
  onRemovePhoto,
  permissionBody,
  permissionTitle,
  photos,
  styles,
  title,
}: {
  accentColor: string;
  addPhoto: () => void;
  addPhotoAccessibilityLabel: string;
  canAddPhoto: boolean;
  countLabel: string;
  error?: string;
  helpLabel: string;
  Icon: ReportCreationIconComponent;
  onRemovePhoto: (photoId: string) => void;
  permissionBody: string;
  permissionTitle: string;
  photos: readonly TPhoto[];
  styles: ReportCreationStyles;
  title: string;
}) {
  return (
    <ReportCreationSection styles={styles} title={title}>
      <View style={styles.permissionBox}>
        <Icon color={accentColor} name="camera.fill" size={22} />
        <View style={styles.optionCopy}>
          <Text maxFontSizeMultiplier={1.15} style={styles.itemTitle}>
            {permissionTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.metaText}>
            {permissionBody}
          </Text>
        </View>
      </View>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <Pressable
            accessibilityLabel="Quitar foto"
            accessibilityRole="button"
            key={photo.id}
            onPress={() => onRemovePhoto(photo.id)}
            style={styles.photoTile}
          >
            <Image
              accessibilityLabel={photo.alt}
              contentFit="cover"
              source={photo.thumbUri ?? photo.uri}
              style={styles.photoImage}
            />
          </Pressable>
        ))}
        <Pressable
          accessibilityLabel={addPhotoAccessibilityLabel}
          accessibilityRole="button"
          disabled={!canAddPhoto}
          onPress={addPhoto}
          style={[
            styles.addPhotoTile,
            !canAddPhoto ? styles.disabledTile : null,
          ]}
        >
          <Icon color={accentColor} name="plus" size={22} />
          <Text maxFontSizeMultiplier={1.1} style={styles.addPhotoText}>
            {countLabel}
          </Text>
        </Pressable>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={styles.helpText}>
        {helpLabel}
      </Text>
      {error ? (
        <Text maxFontSizeMultiplier={1.2} selectable style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </ReportCreationSection>
  );
}

export function ReportCreationProgressSteps({
  steps,
  styles,
}: {
  steps: readonly ReportCreationProgressStep[];
  styles: ReportCreationStyles;
}) {
  const visibleSteps = getVisibleReportCreationProgressSteps(steps);
  const currentStepIndex =
    getReportCreationProgressCurrentStepIndex(visibleSteps);
  const progressText = `Paso ${currentStepIndex + 1} de ${visibleSteps.length}`;
  const currentStep = visibleSteps[currentStepIndex];

  return (
    <View style={[styles.steps, progressStepStyles.steps]}>
      <View style={progressStepStyles.progressHeader}>
        <Text
          accessibilityLabel={`Progreso de creacion, ${progressText}${currentStep ? `, ${currentStep.label}` : ""}`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            max: visibleSteps.length,
            min: 1,
            now: currentStepIndex + 1,
            text: currentStep
              ? `${progressText}, ${currentStep.label}`
              : progressText,
          }}
          maxFontSizeMultiplier={1.2}
          style={[styles.stepLabel, progressStepStyles.progressText]}
        >
          {progressText}
        </Text>
        {currentStep ? (
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.stepLabel, progressStepStyles.currentStepLabel]}
          >
            {currentStep.label}
          </Text>
        ) : null}
      </View>
      <View style={progressStepStyles.markerRow}>
        {visibleSteps.map((step, index) => {
          const status = getReportCreationProgressStepStatus(
            step,
            index,
            currentStepIndex,
          );
          const isCompleted = status === "completed";
          const isCurrent = status === "current";
          const stepProgressText = `Paso ${index + 1} de ${visibleSteps.length}`;

          return (
            <View
              accessible
              accessibilityLabel={`${stepProgressText}, ${step.label}, ${getReportCreationProgressAccessibilityStateLabel(status)}`}
              accessibilityRole="text"
              accessibilityState={{
                checked: isCompleted,
                disabled: status === "upcoming",
                selected: isCurrent,
              }}
              key={step.id}
              style={[styles.stepItem, progressStepStyles.stepItem]}
            >
              <View
                style={[
                  styles.stepDot,
                  progressStepStyles.stepDot,
                  isCompleted ? styles.stepDotComplete : null,
                  isCompleted ? progressStepStyles.stepDotComplete : null,
                  isCurrent ? progressStepStyles.stepDotCurrent : null,
                  status === "upcoming"
                    ? progressStepStyles.stepDotUpcoming
                    : null,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={1.1}
                  style={[
                    styles.stepNumber,
                    isCompleted ? styles.stepNumberComplete : null,
                    isCompleted ? progressStepStyles.stepNumberComplete : null,
                  ]}
                >
                  {isCompleted ? "✓" : index + 1}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const hiddenReportCreationProgressStepIds = new Set<string>([
  "chooseType",
  "submitting",
  "success",
]);

function getVisibleReportCreationProgressSteps(
  steps: readonly ReportCreationProgressStep[],
) {
  const visibleSteps = steps.filter(
    (step) => !hiddenReportCreationProgressStepIds.has(step.id),
  );

  return visibleSteps.length > 0 ? visibleSteps : steps;
}

function getReportCreationProgressCurrentStepIndex(
  steps: readonly ReportCreationProgressStep[],
) {
  const canonicalCurrentStepIndex = steps.findIndex(
    (step) => "status" in step && step.status === "current",
  );

  if (canonicalCurrentStepIndex >= 0) {
    return canonicalCurrentStepIndex;
  }

  const firstIncompleteStepIndex = steps.findIndex(
    (step) => "isComplete" in step && !step.isComplete,
  );

  if (firstIncompleteStepIndex >= 0) {
    return firstIncompleteStepIndex;
  }

  return Math.max(steps.length - 1, 0);
}

function getReportCreationProgressStepStatus(
  step: ReportCreationProgressStep,
  index: number,
  currentStepIndex: number,
) {
  if ("status" in step) {
    return step.status;
  }

  if (index < currentStepIndex) {
    return "completed";
  }

  if (index === currentStepIndex) {
    return "current";
  }

  return "upcoming";
}

function getReportCreationProgressAccessibilityStateLabel(
  status: ReportCreationJourneyStep["status"],
) {
  switch (status) {
    case "completed":
      return "completado";
    case "current":
      return "paso actual";
    case "upcoming":
      return "pendiente";
  }
}

const progressStepStyles = StyleSheet.create({
  currentStepLabel: {
    flex: 1,
    flexShrink: 1,
    fontWeight: "800",
    textAlign: "right",
  },
  markerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    justifyContent: "space-between",
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  progressText: {
    flexShrink: 0,
    fontWeight: "700",
    textAlign: "left",
  },
  stepDot: {
    borderStyle: "solid",
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  stepDotComplete: {
    borderWidth: 0,
  },
  stepDotCurrent: {
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
  stepDotUpcoming: {
    borderStyle: "dashed",
    opacity: 0.55,
  },
  stepItem: {
    flexBasis: 28,
    flexGrow: 0,
    flexShrink: 0,
    height: 28,
    minWidth: 28,
    width: 28,
  },
  stepNumberComplete: {
    fontSize: 14,
    lineHeight: 18,
  },
  steps: {
    alignItems: "stretch",
    flexDirection: "column",
    flexWrap: "nowrap",
    gap: 8,
  },
});

export function ReportCreationToggleRow({
  body,
  isSelected,
  label,
  onPress,
  styles,
}: {
  body: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
  styles: ReportCreationStyles;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={styles.toggleRow}
    >
      <View style={styles.optionCopy}>
        <Text maxFontSizeMultiplier={1.15} style={styles.itemTitle}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.metaText}>
          {body}
        </Text>
      </View>
      <View style={[styles.switchTrack, isSelected ? styles.switchOn : null]}>
        <View
          style={[styles.switchThumb, isSelected ? styles.switchThumbOn : null]}
        />
      </View>
    </Pressable>
  );
}

export function ReportCreationInfoRow({
  accentColor,
  Icon,
  icon,
  label,
  styles,
  value,
}: {
  accentColor: string;
  Icon: ReportCreationIconComponent;
  icon: string;
  label: string;
  styles: ReportCreationStyles;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Icon color={accentColor} name={icon} size={20} />
      <View style={styles.optionCopy}>
        <Text maxFontSizeMultiplier={1.1} style={styles.infoLabel}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.itemTitle}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function ReportCreationLocationPreview({
  accentColor,
  coordinates,
  Icon,
  label,
}: {
  accentColor: string;
  coordinates?: { latitude: number; longitude: number };
  Icon: ReportCreationIconComponent;
  label: string;
}) {
  const pinPosition = getBoliviaPreviewPinPosition(coordinates);

  return (
    <View
      accessibilityLabel={`Mapa de Bolivia, ${label}`}
      accessibilityRole="image"
      style={locationPreviewStyles.mapPreview}
    >
      <View style={locationPreviewStyles.mapBackdrop}>
        <View
          style={[
            locationPreviewStyles.boliviaShape,
            locationPreviewStyles.boliviaShapeNorth,
          ]}
        />
        <View
          style={[
            locationPreviewStyles.boliviaShape,
            locationPreviewStyles.boliviaShapeCenter,
          ]}
        />
        <View
          style={[
            locationPreviewStyles.boliviaShape,
            locationPreviewStyles.boliviaShapeWest,
          ]}
        />
        <View
          style={[
            locationPreviewStyles.boliviaShape,
            locationPreviewStyles.boliviaShapeEast,
          ]}
        />
        <View
          style={[
            locationPreviewStyles.boliviaShape,
            locationPreviewStyles.boliviaShapeSouth,
          ]}
        />
        <View style={locationPreviewStyles.mapRoute} />
      </View>
      <View
        style={[
          locationPreviewStyles.mapPin,
          {
            backgroundColor: accentColor,
            left: pinPosition.left,
            top: pinPosition.top,
          },
        ]}
      >
        <Icon color="#FFFFFF" name="mappin" size={22} />
      </View>
      <Text
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        style={locationPreviewStyles.mapLabel}
      >
        {label}
      </Text>
    </View>
  );
}

function getBoliviaPreviewPinPosition(coordinates?: {
  latitude: number;
  longitude: number;
}): { left: DimensionValue; top: DimensionValue } {
  if (!coordinates) {
    return {
      left: "52%",
      top: "48%",
    };
  }

  const minLongitude = -69.8;
  const maxLongitude = -57.4;
  const minLatitude = -23.1;
  const maxLatitude = -9.6;
  const longitudeProgress =
    (coordinates.longitude - minLongitude) / (maxLongitude - minLongitude);
  const latitudeProgress =
    (maxLatitude - coordinates.latitude) / (maxLatitude - minLatitude);

  return {
    left: `${clampPercent(longitudeProgress, 0.22, 0.78) * 100}%`,
    top: `${clampPercent(latitudeProgress, 0.18, 0.76) * 100}%`,
  };
}

function clampPercent(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return (min + max) / 2;
  }

  return Math.min(max, Math.max(min, value));
}

const locationPreviewStyles = StyleSheet.create({
  boliviaShape: {
    backgroundColor: "#B9D8CC",
    borderColor: "#91BCAF",
    borderCurve: "continuous",
    borderWidth: 1,
    position: "absolute",
  },
  boliviaShapeCenter: {
    borderRadius: 22,
    height: "42%",
    left: "35%",
    top: "30%",
    transform: [{ rotate: "-8deg" }],
    width: "28%",
  },
  boliviaShapeEast: {
    borderRadius: 20,
    height: "35%",
    left: "52%",
    top: "28%",
    transform: [{ rotate: "10deg" }],
    width: "25%",
  },
  boliviaShapeNorth: {
    borderRadius: 24,
    height: "34%",
    left: "42%",
    top: "13%",
    transform: [{ rotate: "12deg" }],
    width: "28%",
  },
  boliviaShapeSouth: {
    borderRadius: 22,
    height: "28%",
    left: "38%",
    top: "59%",
    transform: [{ rotate: "13deg" }],
    width: "27%",
  },
  boliviaShapeWest: {
    borderRadius: 18,
    height: "38%",
    left: "25%",
    top: "35%",
    transform: [{ rotate: "15deg" }],
    width: "24%",
  },
  mapBackdrop: {
    backgroundColor: "#E2F1F4",
    borderColor: "#C8E1E5",
    borderCurve: "continuous",
    borderRadius: 8,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  mapLabel: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: 8,
    bottom: 12,
    color: "#0F5E50",
    fontSize: 12,
    fontWeight: "900",
    left: 12,
    lineHeight: 16,
    maxWidth: "78%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  mapPin: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 3,
    boxShadow: "0 6px 14px rgba(23, 32, 28, 0.18)",
    height: 48,
    justifyContent: "center",
    marginLeft: -24,
    marginTop: -24,
    position: "absolute",
    width: 48,
  },
  mapPreview: {
    aspectRatio: 2.35,
    borderColor: "#C8E1E5",
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  mapRoute: {
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderRadius: 999,
    height: 5,
    left: "22%",
    position: "absolute",
    top: "33%",
    transform: [{ rotate: "-18deg" }],
    width: "58%",
  },
});

export function ReportCreationActionButton({
  accentColor,
  disabled = false,
  Icon,
  icon,
  label,
  onPress,
  primaryTextColor,
  styles,
  variant = "primary",
}: {
  accentColor: string;
  disabled?: boolean;
  Icon: ReportCreationIconComponent;
  icon: string;
  label: string;
  onPress?: () => void;
  primaryTextColor: string;
  styles: ReportCreationStyles;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <Icon
        color={isPrimary ? primaryTextColor : accentColor}
        name={icon}
        size={18}
      />
      <Text
        maxFontSizeMultiplier={1.1}
        style={[
          styles.actionButtonText,
          isPrimary ? styles.actionButtonTextPrimary : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ReportCreationContactOptionSection<TValue extends string>({
  accentColor,
  Icon,
  onChangeWhatsappPhone,
  onSelectOption,
  options,
  styles,
  title,
  whatsappField,
}: {
  accentColor: string;
  Icon: ReportCreationIconComponent;
  onChangeWhatsappPhone: (value: string) => void;
  onSelectOption: (value: TValue) => void;
  options: ReportCreationOption<TValue>[];
  styles: ReportCreationStyles;
  title: string;
  whatsappField: ReportCreationFieldViewModel & {
    visible: boolean;
  };
}) {
  return (
    <ReportCreationSection styles={styles} title={title}>
      <View style={styles.optionStack}>
        {options.map((option) => (
          <Pressable
            accessibilityState={{ selected: option.isSelected }}
            accessibilityRole="button"
            key={option.value}
            onPress={() => onSelectOption(option.value)}
            style={[
              styles.contactOption,
              option.isSelected ? styles.selectedBorder : null,
            ]}
          >
            <Icon color={accentColor} name={option.iconName} size={22} />
            <View style={styles.optionCopy}>
              <Text maxFontSizeMultiplier={1.15} style={styles.itemTitle}>
                {option.label}
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.metaText}>
                {option.body}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      {whatsappField.visible ? (
        <ReportCreationField
          field={whatsappField}
          keyboardType="phone-pad"
          onChangeText={onChangeWhatsappPhone}
          placeholderTextColor="#66736D"
          styles={styles}
        />
      ) : null}
    </ReportCreationSection>
  );
}

export function ReportCreationReviewPublishSection({
  activityIndicatorColor,
  canPublish,
  Icon,
  onPublish,
  publishActionLabel,
  publishState,
  rows,
  styles,
  submitError,
  title = "Revisar",
  validationErrors,
}: {
  activityIndicatorColor: string;
  canPublish: boolean;
  Icon: ReportCreationIconComponent;
  onPublish: () => void;
  publishActionLabel: string;
  publishState: ReportCreationPublishState;
  rows: ReportCreationReviewRow[];
  styles: ReportCreationStyles;
  submitError: string | null;
  title?: string;
  validationErrors: string[];
}) {
  const isPublishing = publishState === "publishing";
  const isPublishDisabled = !canPublish || isPublishing;

  return (
    <ReportCreationSection styles={styles} title={title}>
      <View style={styles.reviewList}>
        {rows.map((row) => (
          <View key={row.label} style={styles.reviewRow}>
            <Text maxFontSizeMultiplier={1.15} style={styles.reviewLabel}>
              {row.label}
            </Text>
            <Text maxFontSizeMultiplier={1.15} style={styles.reviewValue}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
      {validationErrors.length > 0 ? (
        <View accessibilityLiveRegion="polite" accessibilityRole="alert">
          {validationErrors.map((error) => (
            <Text
              key={error}
              maxFontSizeMultiplier={1.2}
              style={styles.errorText}
            >
              {error}
            </Text>
          ))}
        </View>
      ) : null}
      {submitError ? (
        <View accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text maxFontSizeMultiplier={1.2} style={styles.errorText}>
            {submitError}
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={getReportCreationPublishAccessibilityLabel({
          publishActionLabel,
          publishState,
        })}
        accessibilityRole="button"
        accessibilityState={{
          busy: isPublishing,
          disabled: isPublishDisabled,
        }}
        disabled={isPublishDisabled}
        onPress={onPublish}
        style={({ pressed }) => [
          styles.publishButton,
          !canPublish ? styles.disabledButton : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {publishState === "publishing" ? (
          <ActivityIndicator color={activityIndicatorColor} />
        ) : (
          <>
            <Icon
              color={activityIndicatorColor}
              name="paperplane.fill"
              size={20}
            />
            <Text maxFontSizeMultiplier={1.15} style={styles.publishText}>
              {publishActionLabel}
            </Text>
          </>
        )}
      </Pressable>
    </ReportCreationSection>
  );
}

function getReportCreationPublishAccessibilityLabel({
  publishActionLabel,
  publishState,
}: {
  publishActionLabel: string;
  publishState: ReportCreationPublishState;
}) {
  if (publishState !== "publishing") {
    return publishActionLabel;
  }

  if (/^Publicar\s+/i.test(publishActionLabel)) {
    return publishActionLabel.replace(/^Publicar\s+/i, "Publicando ");
  }

  if (/^Publicar$/i.test(publishActionLabel)) {
    return "Publicando";
  }

  return `Publicando. ${publishActionLabel}`;
}
