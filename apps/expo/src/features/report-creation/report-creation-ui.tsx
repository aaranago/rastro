import type { ReactNode } from "react";
import type {
  ImageStyle,
  KeyboardTypeOptions,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
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
import { Image } from "expo-image";

import type { DurableCreationDraftPersistence } from "../resilience/use-durable-creation-draft";

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

export function ReportCreationEditorScrollView({
  bottomInset,
  children,
  styles,
}: {
  bottomInset: number;
  children: ReactNode;
  styles: ReportCreationStyles;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      {children}
    </ScrollView>
  );
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
  fields,
  onChangeField,
  placeholderTextColor,
  styles,
  title,
}: {
  fields: readonly {
    field: ReportCreationFieldViewModel;
    key: TKey;
    multiline?: boolean;
  }[];
  onChangeField: (key: TKey, value: string) => void;
  placeholderTextColor: string;
  styles: ReportCreationStyles;
  title: string;
}) {
  return (
    <ReportCreationSection styles={styles} title={title}>
      {fields.map((item) => (
        <ReportCreationField
          field={item.field}
          key={item.key}
          multiline={item.multiline}
          onChangeText={(value) => onChangeField(item.key, value)}
          placeholderTextColor={placeholderTextColor}
          styles={styles}
        />
      ))}
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
