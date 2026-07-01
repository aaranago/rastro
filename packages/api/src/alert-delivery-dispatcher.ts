import type {
  AlertRepository,
  PersistedAlertPushToken,
} from "./alert-repository";

export type ExpoPushMessageData =
  | {
      deepLink: string;
      deliveryId: string;
      reportId: string;
      type: "alert_delivery";
    }
  | {
      conversationId: string;
      deepLink: string;
      deliveryId: string;
      messageId: string;
      type: "chat_message";
    };

export interface ExpoPushMessage {
  body: string;
  data: ExpoPushMessageData;
  sound: "default";
  title: string;
  to: string;
}

export type ExpoPushTicket =
  | {
      id?: string;
      status: "ok";
    }
  | {
      details?: {
        error?: string;
      };
      message: string;
      status: "error";
    };

export interface ExpoPushClient {
  send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
}

export interface AlertDeliveryDispatchResult {
  failed: number;
  pending: number;
  requested: number;
  sent: number;
  skipped: number;
}

export interface DispatchPendingAlertDeliveriesInput {
  alertRepository: AlertRepository;
  limit?: number;
  pushClient: ExpoPushClient;
}

export interface PendingPushNotificationDelivery {
  body: string;
  deepLink: string;
  id: string;
  pushToken: PersistedAlertPushToken | null;
  title: string;
}

export type PushDeliveryTransitionResult = object;

export interface PushNotificationDeliveryRepository<
  TDelivery extends PendingPushNotificationDelivery,
> {
  disablePushToken(input: {
    pushTokenId: string;
  }): Promise<PushDeliveryTransitionResult | null>;
  listPendingDeliveries(input: { limit?: number }): Promise<TDelivery[]>;
  markDeliveryFailed(input: {
    deliveryId: string;
    reason: string;
  }): Promise<PushDeliveryTransitionResult | null>;
  markDeliverySent(input: {
    deliveryId: string;
  }): Promise<PushDeliveryTransitionResult | null>;
  markDeliverySkipped(input: {
    deliveryId: string;
    reason: string;
  }): Promise<PushDeliveryTransitionResult | null>;
}

export interface DispatchPendingPushDeliveriesInput<
  TDelivery extends PendingPushNotificationDelivery,
> {
  deliveryRepository: PushNotificationDeliveryRepository<TDelivery>;
  limit?: number;
  noActivePushTokenReason?: string;
  pushClient: ExpoPushClient;
  toMessageData: (delivery: TDelivery) => ExpoPushMessageData;
}

export interface ExpoPushClientOptions {
  endpoint?: string;
  fetch?: FetchLike;
}

export type FetchLike = (
  input: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  },
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}>;

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";
const expoPushMaxMessagesPerRequest = 100;
const noActivePushTokenReason =
  "No hay un token push activo para este miembro.";

export async function dispatchPendingAlertDeliveries({
  alertRepository,
  limit,
  pushClient,
}: DispatchPendingAlertDeliveriesInput): Promise<AlertDeliveryDispatchResult> {
  return dispatchPendingPushDeliveries({
    deliveryRepository: alertRepository,
    limit,
    pushClient,
    toMessageData: (delivery) => ({
      deepLink: delivery.deepLink,
      deliveryId: delivery.id,
      reportId: delivery.reportId,
      type: "alert_delivery",
    }),
  });
}

export async function dispatchPendingPushDeliveries<
  TDelivery extends PendingPushNotificationDelivery,
>({
  deliveryRepository,
  limit,
  noActivePushTokenReason: noActivePushTokenReasonOverride,
  pushClient,
  toMessageData,
}: DispatchPendingPushDeliveriesInput<TDelivery>): Promise<AlertDeliveryDispatchResult> {
  const pending = await deliveryRepository.listPendingDeliveries({ limit });
  const { sendable, skipped } = await skipUndeliverableDeliveries({
    deliveryRepository,
    noActivePushTokenReason:
      noActivePushTokenReasonOverride ?? noActivePushTokenReason,
    pending,
  });

  if (sendable.length === 0) {
    return {
      failed: 0,
      pending: pending.length,
      requested: 0,
      sent: 0,
      skipped,
    };
  }

  const tickets = await sendExpoPushMessagesInBatches({
    messages: sendable.map((delivery) =>
      toExpoPushMessage(delivery, toMessageData(delivery)),
    ),
    pushClient,
  });

  assertTicketCountMatchesDeliveries(tickets, sendable);

  const { failed, sent } = await applyExpoPushTickets({
    deliveryRepository,
    deliveries: sendable,
    tickets,
  });

  return {
    failed,
    pending: pending.length,
    requested: sendable.length,
    sent,
    skipped,
  };
}

async function skipUndeliverableDeliveries<
  TDelivery extends PendingPushNotificationDelivery,
>({
  deliveryRepository,
  noActivePushTokenReason,
  pending,
}: {
  deliveryRepository: PushNotificationDeliveryRepository<TDelivery>;
  noActivePushTokenReason: string;
  pending: TDelivery[];
}) {
  const sendable: TDelivery[] = [];
  let skipped = 0;

  for (const delivery of pending) {
    if (delivery.pushToken && !delivery.pushToken.disabledAt) {
      sendable.push(delivery);
      continue;
    }

    const transitioned = await deliveryRepository.markDeliverySkipped({
      deliveryId: delivery.id,
      reason: noActivePushTokenReason,
    });

    if (transitioned) {
      skipped += 1;
    }
  }

  return { sendable, skipped };
}

async function sendExpoPushMessagesInBatches({
  messages,
  pushClient,
}: {
  messages: ExpoPushMessage[];
  pushClient: ExpoPushClient;
}) {
  const tickets: ExpoPushTicket[] = [];

  for (
    let index = 0;
    index < messages.length;
    index += expoPushMaxMessagesPerRequest
  ) {
    tickets.push(
      ...(await pushClient.send(
        messages.slice(index, index + expoPushMaxMessagesPerRequest),
      )),
    );
  }

  return tickets;
}

function assertTicketCountMatchesDeliveries(
  tickets: ExpoPushTicket[],
  deliveries: PendingPushNotificationDelivery[],
) {
  if (tickets.length !== deliveries.length) {
    throw new Error("Expo push did not return one ticket per delivery.");
  }
}

async function applyExpoPushTickets<
  TDelivery extends PendingPushNotificationDelivery,
>({
  deliveryRepository,
  deliveries,
  tickets,
}: {
  deliveryRepository: PushNotificationDeliveryRepository<TDelivery>;
  deliveries: TDelivery[];
  tickets: ExpoPushTicket[];
}) {
  let failed = 0;
  let sent = 0;

  for (const [index, delivery] of deliveries.entries()) {
    const result = await applyExpoPushTicket({
      deliveryRepository,
      delivery,
      ticket: readTicketAt(tickets, index),
    });

    if (result === "sent") {
      sent += 1;
    }

    if (result === "failed") {
      failed += 1;
    }
  }

  return { failed, sent };
}

function readTicketAt(tickets: ExpoPushTicket[], index: number) {
  const ticket = tickets[index];

  if (!ticket) {
    throw new Error("Expo push ticket was missing for a delivery.");
  }

  return ticket;
}

async function applyExpoPushTicket<
  TDelivery extends PendingPushNotificationDelivery,
>({
  deliveryRepository,
  delivery,
  ticket,
}: {
  deliveryRepository: PushNotificationDeliveryRepository<TDelivery>;
  delivery: TDelivery;
  ticket: ExpoPushTicket;
}): Promise<"failed" | "sent" | "unchanged"> {
  if (ticket.status === "ok") {
    const transitioned = await deliveryRepository.markDeliverySent({
      deliveryId: delivery.id,
    });

    return transitioned ? "sent" : "unchanged";
  }

  if (delivery.pushToken && ticket.details?.error === "DeviceNotRegistered") {
    await deliveryRepository.disablePushToken({
      pushTokenId: delivery.pushToken.id,
    });
  }

  const transitioned = await deliveryRepository.markDeliveryFailed({
    deliveryId: delivery.id,
    reason: formatExpoPushTicketError(ticket),
  });

  return transitioned ? "failed" : "unchanged";
}

export function createExpoPushClient(
  options: ExpoPushClientOptions = {},
): ExpoPushClient {
  const endpoint = options.endpoint ?? expoPushEndpoint;
  const fetchImpl = options.fetch ?? fetch;

  return {
    send: async (messages) => {
      const response = await fetchImpl(endpoint, {
        body: JSON.stringify(messages),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `Expo push request failed with ${response.status} ${response.statusText}: ${await response.text()}`,
        );
      }

      return parseExpoPushTickets(await response.json());
    },
  };
}

function toExpoPushMessage(
  delivery: PendingPushNotificationDelivery,
  data: ExpoPushMessageData,
): ExpoPushMessage {
  const token = delivery.pushToken?.token;

  if (!token) {
    throw new Error("Cannot build an Expo push message without a token.");
  }

  return {
    body: delivery.body,
    data,
    sound: "default",
    title: delivery.title,
    to: token,
  };
}

function parseExpoPushTickets(payload: unknown): ExpoPushTicket[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("Expo push response did not include ticket data.");
  }

  return payload.data.map(parseExpoPushTicket);
}

function parseExpoPushTicket(ticket: unknown): ExpoPushTicket {
  if (!isRecord(ticket)) {
    throw new Error("Expo push response included an invalid ticket.");
  }

  if (ticket.status === "ok") {
    return {
      ...(typeof ticket.id === "string" ? { id: ticket.id } : {}),
      status: "ok",
    };
  }

  if (ticket.status === "error") {
    const details = isRecord(ticket.details) ? ticket.details : {};
    const error = typeof details.error === "string" ? details.error : undefined;

    return {
      ...(error ? { details: { error } } : {}),
      message:
        typeof ticket.message === "string" && ticket.message.trim().length > 0
          ? ticket.message
          : "Expo rechazo la notificacion.",
      status: "error",
    };
  }

  throw new Error("Expo push response included an unknown ticket status.");
}

function formatExpoPushTicketError(
  ticket: Extract<ExpoPushTicket, { status: "error" }>,
) {
  const detail = ticket.details?.error;

  if (!detail) {
    return `Expo rechazo la notificacion: ${ticket.message}`;
  }

  return `Expo rechazo la notificacion (${detail}): ${ticket.message}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
