import type { ReactNode } from "react";
import type {
  KeyboardTypeOptions,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

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

export type ReportCreationPublishState = "editing" | "publishing" | "success";

export type ReportCreationIconComponent = (props: {
  color: string;
  name: string;
  size?: number;
}) => ReactNode;

export interface ReportCreationStyles {
  actionButton: StyleProp<ViewStyle>;
  actionButtonPrimary: StyleProp<ViewStyle>;
  actionButtonSecondary: StyleProp<ViewStyle>;
  actionButtonText: StyleProp<TextStyle>;
  actionButtonTextPrimary: StyleProp<TextStyle>;
  contactOption: StyleProp<ViewStyle>;
  disabledButton: StyleProp<ViewStyle>;
  errorText: StyleProp<TextStyle>;
  field: StyleProp<ViewStyle>;
  fieldLabel: StyleProp<TextStyle>;
  infoLabel: StyleProp<TextStyle>;
  infoRow: StyleProp<ViewStyle>;
  input: StyleProp<TextStyle>;
  itemTitle: StyleProp<TextStyle>;
  metaText: StyleProp<TextStyle>;
  multilineInput: StyleProp<TextStyle>;
  optionCopy: StyleProp<ViewStyle>;
  optionStack: StyleProp<ViewStyle>;
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
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={field.placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, multiline ? styles.multilineInput : null]}
        value={field.value}
      />
      {field.error ? (
        <Text maxFontSizeMultiplier={1.15} selectable style={styles.errorText}>
          {field.error}
        </Text>
      ) : null}
    </View>
  );
}

export function ReportCreationProgressSteps({
  steps,
  styles,
}: {
  steps: ReportCreationStep[];
  styles: ReportCreationStyles;
}) {
  return (
    <View style={styles.steps}>
      {steps.slice(0, 4).map((step, index) => (
        <View key={step.id} style={styles.stepItem}>
          <View
            style={[
              styles.stepDot,
              step.isComplete ? styles.stepDotComplete : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1}
              style={[
                styles.stepNumber,
                step.isComplete ? styles.stepNumberComplete : null,
              ]}
            >
              {index + 1}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.05} style={styles.stepLabel}>
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

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

export function ReportCreationActionButton({
  accentColor,
  Icon,
  icon,
  label,
  onPress,
  primaryTextColor,
  styles,
  variant = "primary",
}: {
  accentColor: string;
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
      onPress={onPress}
      style={[
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
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
      {validationErrors.map((error) => (
        <Text key={error} maxFontSizeMultiplier={1.2} style={styles.errorText}>
          {error}
        </Text>
      ))}
      {submitError ? (
        <Text maxFontSizeMultiplier={1.2} style={styles.errorText}>
          {submitError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={!canPublish || publishState === "publishing"}
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
