import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
}));

vi.mock("./transport", () => ({
  getTransport: () => ({ sendMail: mockSendMail }),
}));

import { sendRawEmail } from "./send";

describe("email delivery test mode", () => {
  beforeEach(() => {
    vi.stubEnv("SUPPORT_EMAIL", "support@example.com");
    mockSendMail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("does not contact the transport when delivery is disabled", async () => {
    vi.stubEnv("EMAIL_DELIVERY_DISABLED", "true");

    await sendRawEmail({
      to: "recipient@example.com",
      subject: "Test message",
      text: "This must not be delivered",
    });

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("sends normally when delivery is enabled", async () => {
    vi.stubEnv("EMAIL_DELIVERY_DISABLED", "false");

    await sendRawEmail({
      to: "recipient@example.com",
      subject: "Live message",
      text: "This should be delivered",
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
  });
});
