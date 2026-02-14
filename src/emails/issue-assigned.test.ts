import { describe, expect, it } from "vitest";
import { issueAssigned } from "./issue-assigned";

const defaultProps = {
  issueKey: "PROJ-42",
  issueSummary: "Fix login page error",
  assigneeName: "Jane Smith",
  assignerName: "Bob Jones",
  issueUrl: "https://ordolix.dev/proj/issues/PROJ-42",
};

describe("issueAssigned", () => {
  it("generates valid HTML", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes the issue key in the title", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("PROJ-42");
  });

  it("includes the issue summary", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("Fix login page error");
  });

  it("addresses the assignee by name", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("Jane Smith");
  });

  it("mentions the assigner name", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("Bob Jones");
  });

  it("includes a View Issue CTA button", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("View Issue");
    expect(html).toContain('href="https://ordolix.dev/proj/issues/PROJ-42"');
  });

  it("escapes HTML in issue summary", () => {
    const html = issueAssigned({
      ...defaultProps,
      issueSummary: '<script>alert("xss")</script>',
    });

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in user names", () => {
    const html = issueAssigned({
      ...defaultProps,
      assigneeName: "Jane <b>Smith</b>",
      assignerName: 'Bob "The Builder"',
    });

    expect(html).toContain("Jane &lt;b&gt;Smith&lt;/b&gt;");
    expect(html).toContain("Bob &quot;The Builder&quot;");
  });

  it("uses Ordolix branding colors", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("#0052CC");
  });

  it("wraps content in the base layout", () => {
    const html = issueAssigned(defaultProps);

    // Should have the Ordolix header from base layout
    expect(html).toContain("Ordolix");
    // Should have the copyright footer from base layout
    expect(html).toContain("All rights reserved");
  });

  it("displays the assignment title with key and summary", () => {
    const html = issueAssigned(defaultProps);

    expect(html).toContain("You&#39;ve been assigned to PROJ-42: Fix login page error");
  });

  it("shows the issue detail card", () => {
    const html = issueAssigned(defaultProps);

    // The card should show both key and summary
    expect(html).toContain("PROJ-42: Fix login page error");
  });
});
