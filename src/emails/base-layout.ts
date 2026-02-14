/**
 * Shared email layout function for all Ordolix email templates.
 *
 * Generates a complete HTML email string with inline styles, Ordolix branding,
 * and responsive design. Uses #0052CC as the primary accent color.
 *
 * @module base-layout
 */

export interface BaseLayoutProps {
  /** Email title shown in the header area */
  title: string;
  /** HTML body content to render inside the layout */
  body: string;
  /** Optional footer text; defaults to standard Ordolix footer */
  footerText?: string;
}

/**
 * Generates a complete HTML email document with Ordolix branding.
 *
 * @param props - Layout properties including title, body HTML, and optional footer text
 * @returns Complete HTML string suitable for email delivery
 *
 * @example
 * ```ts
 * const html = baseLayout({
 *   title: "Issue Assigned",
 *   body: "<p>You have been assigned an issue.</p>",
 * });
 * ```
 */
export function baseLayout({ title, body, footerText }: BaseLayoutProps): string {
  const footer = footerText ?? "You are receiving this email because of your notification preferences in Ordolix.";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 12px !important; }
      .content { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #172b4d; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 16px 24px; background-color: #0052CC; border-radius: 8px 8px 0 0;">
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Ordolix</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px 24px 0 24px; border-radius: 0;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #172b4d; line-height: 1.3;">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="background-color: #ffffff; padding: 0 24px 24px 24px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 1px solid #dfe1e6; padding: 16px 0;">
                    <p style="margin: 0; font-size: 12px; color: #6b778c; line-height: 1.5;">
                      ${escapeHtml(footer)}
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b778c;">
                      &copy; ${new Date().getFullYear()} Ordolix. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates an HTML button element styled as a CTA for email templates.
 *
 * @param text - Button label text
 * @param url - Destination URL
 * @returns HTML string for the button
 */
export function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: #0052CC; border-radius: 4px;">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 4px;">
        ${escapeHtml(text)}
      </a>
    </td>
  </tr>
</table>`;
}

/**
 * Escapes HTML special characters to prevent XSS in email content.
 *
 * @param str - Raw string to escape
 * @returns HTML-safe string
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
