import type {
  ReportCreationFieldViewModel,
  ReportCreationOption,
} from "./report-creation-ui";

export interface ReportCreationContactDraft {
  inAppChatEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
}

export function buildReportCreationContactViewModel<TOption extends string>({
  contact,
  currentOption,
  error,
  options,
}: {
  contact: ReportCreationContactDraft;
  currentOption: TOption;
  error?: string;
  options: ReportCreationOption<TOption>[];
}): {
  currentOption: TOption;
  error?: string;
  options: ReportCreationOption<TOption>[];
  whatsappField: ReportCreationFieldViewModel & {
    visible: boolean;
  };
} {
  return {
    currentOption,
    error,
    options,
    whatsappField: {
      error:
        contact.whatsappEnabled && contact.whatsappPhone.trim().length === 0
          ? "Ingresa el numero de WhatsApp que quieres mostrar."
          : undefined,
      label: "Numero de WhatsApp",
      placeholder: "+591 70000000",
      value: contact.whatsappPhone,
      visible: contact.whatsappEnabled,
    },
  };
}
