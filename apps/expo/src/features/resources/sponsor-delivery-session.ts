export function createSponsorDeliverySessionId() {
  const runtime = globalThis as unknown as {
    crypto?: {
      randomUUID?: () => string;
    };
  };

  return runtime.crypto?.randomUUID?.() ?? createFallbackSponsorSessionId();
}

function createFallbackSponsorSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
