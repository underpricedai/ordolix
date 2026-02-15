import { describe, expect, it } from "vitest";
import {
  createLicenseInput,
  updateLicenseInput,
  listLicensesInput,
  allocateLicenseInput,
  renewalAlertsInput,
  LICENSE_TYPES,
  LICENSE_STATUSES,
} from "./schemas";

describe("LICENSE_TYPES", () => {
  it("contains expected types", () => {
    expect(LICENSE_TYPES).toEqual(["perpetual", "subscription", "concurrent", "site", "oem"]);
  });
});

describe("LICENSE_STATUSES", () => {
  it("contains expected statuses", () => {
    expect(LICENSE_STATUSES).toEqual(["active", "expired", "cancelled"]);
  });
});

describe("createLicenseInput", () => {
  it("accepts valid input with required fields only", () => {
    const result = createLicenseInput.parse({
      name: "Office 365",
      licenseType: "subscription",
    });
    expect(result.name).toBe("Office 365");
    expect(result.licenseType).toBe("subscription");
    expect(result.totalEntitlements).toBe(1);
    expect(result.currency).toBe("USD");
    expect(result.autoRenew).toBe(false);
    expect(result.status).toBe("active");
  });

  it("accepts valid input with all fields", () => {
    const result = createLicenseInput.parse({
      name: "Adobe CC",
      vendor: "Adobe",
      licenseType: "subscription",
      licenseKey: "AAAA-BBBB-CCCC",
      totalEntitlements: 50,
      purchasePrice: 5000,
      currency: "EUR",
      purchaseDate: "2024-01-15",
      renewalDate: "2025-01-15",
      expirationDate: "2025-01-15",
      autoRenew: true,
      renewalCost: 4500,
      notes: "Enterprise license",
      status: "active",
    });
    expect(result.vendor).toBe("Adobe");
    expect(result.totalEntitlements).toBe(50);
    expect(result.purchasePrice).toBe(5000);
    expect(result.currency).toBe("EUR");
    expect(result.autoRenew).toBe(true);
    expect(result.purchaseDate).toBeInstanceOf(Date);
  });

  it("rejects empty name", () => {
    expect(() =>
      createLicenseInput.parse({ name: "", licenseType: "subscription" }),
    ).toThrow();
  });

  it("rejects name longer than 255 characters", () => {
    expect(() =>
      createLicenseInput.parse({ name: "x".repeat(256), licenseType: "subscription" }),
    ).toThrow();
  });

  it("rejects invalid license type", () => {
    expect(() =>
      createLicenseInput.parse({ name: "Test", licenseType: "invalid" }),
    ).toThrow();
  });

  it("accepts all valid license types", () => {
    for (const lt of LICENSE_TYPES) {
      const result = createLicenseInput.parse({ name: "Test", licenseType: lt });
      expect(result.licenseType).toBe(lt);
    }
  });

  it("accepts all valid statuses", () => {
    for (const s of LICENSE_STATUSES) {
      const result = createLicenseInput.parse({
        name: "Test",
        licenseType: "perpetual",
        status: s,
      });
      expect(result.status).toBe(s);
    }
  });

  it("rejects negative totalEntitlements", () => {
    expect(() =>
      createLicenseInput.parse({
        name: "Test",
        licenseType: "subscription",
        totalEntitlements: -1,
      }),
    ).toThrow();
  });

  it("rejects zero totalEntitlements", () => {
    expect(() =>
      createLicenseInput.parse({
        name: "Test",
        licenseType: "subscription",
        totalEntitlements: 0,
      }),
    ).toThrow();
  });

  it("rejects negative purchasePrice", () => {
    expect(() =>
      createLicenseInput.parse({
        name: "Test",
        licenseType: "subscription",
        purchasePrice: -100,
      }),
    ).toThrow();
  });

  it("accepts null vendor", () => {
    const result = createLicenseInput.parse({
      name: "Test",
      licenseType: "subscription",
      vendor: null,
    });
    expect(result.vendor).toBeNull();
  });

  it("accepts null dates", () => {
    const result = createLicenseInput.parse({
      name: "Test",
      licenseType: "perpetual",
      purchaseDate: null,
      renewalDate: null,
      expirationDate: null,
    });
    expect(result.purchaseDate).toBeNull();
    expect(result.renewalDate).toBeNull();
    expect(result.expirationDate).toBeNull();
  });

  it("coerces date strings to Date objects", () => {
    const result = createLicenseInput.parse({
      name: "Test",
      licenseType: "subscription",
      purchaseDate: "2024-06-01",
    });
    expect(result.purchaseDate).toBeInstanceOf(Date);
  });
});

describe("updateLicenseInput", () => {
  it("requires id", () => {
    expect(() => updateLicenseInput.parse({})).toThrow();
  });

  it("accepts id with no other fields", () => {
    const result = updateLicenseInput.parse({ id: "lic-1" });
    expect(result.id).toBe("lic-1");
    expect(result.name).toBeUndefined();
  });

  it("accepts partial updates", () => {
    const result = updateLicenseInput.parse({
      id: "lic-1",
      name: "Updated License",
      totalEntitlements: 100,
    });
    expect(result.name).toBe("Updated License");
    expect(result.totalEntitlements).toBe(100);
  });

  it("rejects empty id", () => {
    expect(() => updateLicenseInput.parse({ id: "" })).toThrow();
  });

  it("rejects invalid license type", () => {
    expect(() =>
      updateLicenseInput.parse({ id: "lic-1", licenseType: "bad" }),
    ).toThrow();
  });
});

describe("listLicensesInput", () => {
  it("accepts empty input with defaults", () => {
    const result = listLicensesInput.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts status filter", () => {
    const result = listLicensesInput.parse({ status: "expired" });
    expect(result.status).toBe("expired");
  });

  it("accepts vendor filter", () => {
    const result = listLicensesInput.parse({ vendor: "Microsoft" });
    expect(result.vendor).toBe("Microsoft");
  });

  it("accepts search filter", () => {
    const result = listLicensesInput.parse({ search: "Office" });
    expect(result.search).toBe("Office");
  });

  it("rejects invalid status", () => {
    expect(() => listLicensesInput.parse({ status: "invalid" })).toThrow();
  });

  it("rejects limit below 1", () => {
    expect(() => listLicensesInput.parse({ limit: 0 })).toThrow();
  });

  it("rejects limit above 100", () => {
    expect(() => listLicensesInput.parse({ limit: 101 })).toThrow();
  });

  it("accepts cursor for pagination", () => {
    const result = listLicensesInput.parse({ cursor: "abc123" });
    expect(result.cursor).toBe("abc123");
  });
});

describe("allocateLicenseInput", () => {
  it("requires licenseId", () => {
    expect(() => allocateLicenseInput.parse({})).toThrow();
  });

  it("accepts licenseId with assetId", () => {
    const result = allocateLicenseInput.parse({
      licenseId: "lic-1",
      assetId: "asset-1",
    });
    expect(result.licenseId).toBe("lic-1");
    expect(result.assetId).toBe("asset-1");
  });

  it("accepts licenseId with userId", () => {
    const result = allocateLicenseInput.parse({
      licenseId: "lic-1",
      userId: "user-1",
    });
    expect(result.userId).toBe("user-1");
  });

  it("accepts licenseId with both assetId and userId", () => {
    const result = allocateLicenseInput.parse({
      licenseId: "lic-1",
      assetId: "asset-1",
      userId: "user-1",
    });
    expect(result.assetId).toBe("asset-1");
    expect(result.userId).toBe("user-1");
  });

  it("accepts null assetId", () => {
    const result = allocateLicenseInput.parse({
      licenseId: "lic-1",
      assetId: null,
    });
    expect(result.assetId).toBeNull();
  });

  it("rejects empty licenseId", () => {
    expect(() => allocateLicenseInput.parse({ licenseId: "" })).toThrow();
  });
});

describe("renewalAlertsInput", () => {
  it("applies default daysAhead of 30", () => {
    const result = renewalAlertsInput.parse({});
    expect(result.daysAhead).toBe(30);
  });

  it("accepts custom daysAhead", () => {
    const result = renewalAlertsInput.parse({ daysAhead: 90 });
    expect(result.daysAhead).toBe(90);
  });

  it("rejects daysAhead below 1", () => {
    expect(() => renewalAlertsInput.parse({ daysAhead: 0 })).toThrow();
  });

  it("rejects daysAhead above 365", () => {
    expect(() => renewalAlertsInput.parse({ daysAhead: 366 })).toThrow();
  });

  it("rejects non-integer daysAhead", () => {
    expect(() => renewalAlertsInput.parse({ daysAhead: 30.5 })).toThrow();
  });
});
