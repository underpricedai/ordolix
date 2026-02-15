import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password utilities", () => {
  it("hashPassword returns a bcrypt hash", async () => {
    const hash = await hashPassword("test-password");
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("correct-password", hash);
    expect(result).toBe(true);
  });

  it("verifyPassword returns false for incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("produces unique hashes for the same password (salted)", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });
});
