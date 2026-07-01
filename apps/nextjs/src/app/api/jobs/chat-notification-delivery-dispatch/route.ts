import { NextResponse } from "next/server";

import {
  createDrizzleChatNotificationDeliveryRepository,
  createExpoPushClient,
  dispatchPendingChatNotificationDeliveries,
} from "@acme/api";
import { db } from "@acme/db/client";

import { parseJobLimit, validateJobRequest } from "../job-route-utils";

export const dynamic = "force-dynamic";

async function handler(request: Request) {
  const invalidResponse = validateJobRequest(request, {
    unconfiguredMessage:
      "Chat notification delivery dispatch job is not configured.",
  });
  if (invalidResponse) {
    return invalidResponse;
  }

  const result = await dispatchPendingChatNotificationDeliveries({
    chatNotificationRepository:
      createDrizzleChatNotificationDeliveryRepository(db),
    limit: parseJobLimit(request),
    pushClient: createExpoPushClient(),
  });

  return NextResponse.json(result);
}

export { handler as GET, handler as POST };
