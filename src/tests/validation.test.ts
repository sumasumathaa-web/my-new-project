import { describe, expect, it } from "vitest";
import {
  isEmail,
  isHexColor,
  isHttpUrl,
  isSlug,
  requireEnum,
  requireString,
  sanitizeText,
  slugify,
  toRupeeNumber,
} from "@/lib/validation";

describe("validation utilities", () => {
  it("validates emails conservatively", () => {
    expect(isEmail("asha@example.com")).toBe(true);
    expect(isEmail("a.b+c@sub.domain.in")).toBe(true);
    expect(isEmail("not-an-email")).toBe(false);
    expect(isEmail("@example.com")).toBe(false);
    expect(isEmail("spaces in@email.com")).toBe(false);
  });

  it("slugify produces safe URL slugs", () => {
    expect(isSlug("golden-reels-invite")).toBe(true);
    expect(isSlug("UPPER")).toBe(false);
    expect(isSlug("two words")).toBe(false);
    expect(slugify("  Royal Maroon Frame! ")).toBe("royal-maroon-frame");
  });

  it("requireString enforces bounds and trims", () => {
    expect(requireString("  hello  ", "f")).toBe("hello");
    expect(() => requireString("", "f")).toThrow();
    expect(() => requireString("x".repeat(600), "f", { max: 100 })).toThrow();
  });

  it("toRupeeNumber rejects non-finite and out-of-range money", () => {
    expect(toRupeeNumber("1499.50", "price")).toBe(1499.5);
    expect(() => toRupeeNumber("Infinity", "price")).toThrow();
    expect(() => toRupeeNumber("-5", "price", { min: 0 })).toThrow();
    expect(() => toRupeeNumber("500", "rate", { max: 100 })).toThrow();
  });

  it("requireEnum only allows listed values", () => {
    expect(requireEnum("draft", ["draft", "published"] as const, "Status")).toBe("draft");
    expect(() => requireEnum("hacked", ["draft", "published"] as const, "Status")).toThrow();
  });

  it("isHexColor / isHttpUrl are strict", () => {
    expect(isHexColor("#B08D57")).toBe(true);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHttpUrl("https://example.com/x")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
  });

  it("sanitizeText strips control characters (keeps tab/newline)", () => {
    const dirty = "hello\u0000\u0008world\nnext\u0007line";
    const clean = sanitizeText(dirty);
    expect(clean).toBe("helloworld\nnextline");
  });
});
