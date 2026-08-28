import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
}));

vi.mock("./transport", () => ({
  getTransport: () => ({ sendMail: mockSendMail }),
}));

import { sendRawEmail } from "./send";

describe("email delivery", () => {
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

    const result = await sendRawEmail({
      to: "recipient@example.com",
      subject: "Test message",
      text: "This must not be delivered",
    });

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "DELIVERY_DISABLED" });
  });

  it("sends normally when delivery is enabled", async () => {
    vi.stubEnv("EMAIL_DELIVERY_DISABLED", "false");

    const result = await sendRawEmail({
      to: "recipient@example.com",
      subject: "Live message",
      text: "This should be delivered",
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true });
  });

  it("reports missing sender configuration", async () => {
    vi.stubEnv("EMAIL_DELIVERY_DISABLED", "false");
    vi.stubEnv("SUPPORT_EMAIL", "");

    const result = await sendRawEmail({
      to: "recipient@example.com",
      subject: "Unconfigured message",
      text: "This should not be delivered",
    });

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      reason: "SUPPORT_EMAIL_NOT_CONFIGURED",
    });
  });

  it("reports transport failures without throwing", async () => {
    vi.stubEnv("EMAIL_DELIVERY_DISABLED", "false");
    mockSendMail.mockRejectedValueOnce(new Error("SMTP rejected message"));

    const result = await sendRawEmail({
      to: "recipient@example.com",
      subject: "Rejected message",
      text: "This should fail",
    });

    expect(result).toEqual({ ok: false, reason: "TRANSPORT_ERROR" });
  });
});
