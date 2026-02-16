import { describe, it, expect } from "vitest";
import { FileUploader, formatFileSize } from "./file-uploader";

/**
 * Tests for the FileUploader component.
 *
 * @description Smoke tests verifying exports and the formatFileSize helper.
 * Full interaction tests (drag-and-drop, upload flow) are deferred to E2E
 * (Playwright) since they require tRPC context and drag event simulation.
 */
describe("FileUploader", () => {
  it("should be exported as a function", () => {
    expect(typeof FileUploader).toBe("function");
  });

  it("should have the correct function name", () => {
    expect(FileUploader.name).toBe("FileUploader");
  });
});

describe("formatFileSize", () => {
  it("returns '0 B' for zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(5242880)).toBe("5.0 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
  });
});
