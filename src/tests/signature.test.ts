import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/razorpay";

describe("Razorpay signature verification", () => {
  const secret = "whsec_test_only_0123456789";

  it("accepts a correct checkout signature (order_id|payment_id)", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const signature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyCheckoutSignature({ orderId, paymentId, signature, secret })).toBe(true);
  });

  it("rejects tampered signatures and wrong payment ids", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const signature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyCheckoutSignature({ orderId, paymentId: "pay_EVIL", signature, secret })).toBe(false);
    const tampered = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    expect(verifyCheckoutSignature({ orderId, paymentId, signature: tampered, secret })).toBe(false);
    expect(verifyCheckoutSignature({ orderId, paymentId, signature: "", secret })).toBe(false);
  });

  it("accepts a correct webhook signature over the raw body", () => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects webhook bodies modified in transit", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body.replace("captured", "failed"), signature, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(verifyCheckoutSignature({ orderId: "a", paymentId: "b", signature: "c", secret: "" })).toBe(false);
    expect(verifyWebhookSignature("{}", "sig", "")).toBe(false);
  });
});
