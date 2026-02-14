import { describe, expect, it } from "vitest";
import { baseLayout, ctaButton, escapeHtml } from "./base-layout";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("ctaButton", () => {
  it("generates a table-based button with link", () => {
    const html = ctaButton("Click Me", "https://example.com");

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("Click Me");
    expect(html).toContain("background-color: #0052CC");
  });

  it("escapes the button text", () => {
    const html = ctaButton("<b>Bold</b>", "https://example.com");

    expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
    expect(html).not.toContain("<b>Bold</b>");
  });

  it("escapes the URL", () => {
    const html = ctaButton("Go", 'https://example.com/?a=1&b="2"');

    expect(html).toContain("a=1&amp;b=&quot;2&quot;");
  });

  it("sets target to _blank for external links", () => {
    const html = ctaButton("Go", "https://example.com");

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe("baseLayout", () => {
  it("generates valid HTML document", () => {
    const html = baseLayout({
      title: "Test Email",
      body: "<p>Hello</p>",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("includes the title in the document title tag", () => {
    const html = baseLayout({
      title: "My Email Title",
      body: "<p>Content</p>",
    });

    expect(html).toContain("<title>My Email Title</title>");
  });

  it("renders the title in the header h1", () => {
    const html = baseLayout({
      title: "Assignment Notification",
      body: "<p>Content</p>",
    });

    // Title appears in the h1 inside the body
    expect(html).toContain("Assignment Notification");
  });

  it("renders the body content", () => {
    const html = baseLayout({
      title: "Test",
      body: '<p class="custom">My content here</p>',
    });

    expect(html).toContain('<p class="custom">My content here</p>');
  });

  it("uses default footer when none provided", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain("notification preferences in Ordolix");
  });

  it("uses custom footer when provided", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
      footerText: "Custom footer message",
    });

    expect(html).toContain("Custom footer message");
    expect(html).not.toContain("notification preferences");
  });

  it("includes Ordolix branding", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain("Ordolix");
    expect(html).toContain("#0052CC");
  });

  it("includes responsive meta viewport", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });

  it("includes responsive media query styles", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain("@media only screen and (max-width: 620px)");
    expect(html).toContain(".container");
  });

  it("escapes HTML in title", () => {
    const html = baseLayout({
      title: '<script>alert("xss")</script>',
      body: "<p>Body</p>",
    });

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in footer text", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
      footerText: '<img src="x" onerror="alert(1)">',
    });

    expect(html).not.toContain('<img src="x"');
    expect(html).toContain("&lt;img");
  });

  it("includes copyright notice", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    const year = new Date().getFullYear();
    expect(html).toContain(`${year} Ordolix`);
  });

  it("sets charset to utf-8", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain('charset="utf-8"');
  });

  it("uses role=presentation on tables for accessibility", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain('role="presentation"');
  });

  it("sets lang attribute on html element", () => {
    const html = baseLayout({
      title: "Test",
      body: "<p>Body</p>",
    });

    expect(html).toContain('lang="en"');
  });
});
