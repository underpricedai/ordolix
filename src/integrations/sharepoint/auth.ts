/**
 * Azure AD OAuth token acquisition for SharePoint access.
 *
 * Implements client credentials flow and on-behalf-of flow
 * for accessing Microsoft Graph API / SharePoint resources.
 *
 * @module integrations/sharepoint/auth
 */

import { IntegrationError } from "@/server/lib/errors";

/** Token response from Azure AD */
export interface AzureADTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * Acquire an application-level access token using client credentials.
 *
 * Used for background/daemon operations that do not require user context.
 *
 * @param tenantId - Azure AD tenant ID
 * @param clientId - Azure AD application client ID
 * @param clientSecret - Azure AD application client secret
 * @param scope - OAuth scope (defaults to Microsoft Graph default)
 * @returns Access token response
 * @throws IntegrationError on authentication failure
 *
 * @example
 * ```ts
 * const token = await acquireClientCredentialsToken("tenant-id", "client-id", "secret");
 * const client = new SharePointClient(token.access_token);
 * ```
 */
export async function acquireClientCredentialsToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  scope = "https://graph.microsoft.com/.default",
): Promise<AzureADTokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error");
    throw new IntegrationError("SharePoint", `Failed to acquire client credentials token: ${response.status}`, {
      tenantId,
      clientId,
      error,
    });
  }

  return response.json() as Promise<AzureADTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 *
 * Used to maintain user-delegated access without re-authentication.
 *
 * @param tenantId - Azure AD tenant ID
 * @param clientId - Azure AD application client ID
 * @param clientSecret - Azure AD application client secret
 * @param refreshToken - The refresh token from a previous auth flow
 * @param scope - OAuth scope
 * @returns New access token response (may include new refresh token)
 * @throws IntegrationError on refresh failure
 */
export async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  scope = "https://graph.microsoft.com/.default offline_access",
): Promise<AzureADTokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error");
    throw new IntegrationError("SharePoint", `Failed to refresh access token: ${response.status}`, {
      tenantId,
      clientId,
      error,
    });
  }

  return response.json() as Promise<AzureADTokenResponse>;
}

/**
 * Build the Azure AD authorization URL for the OAuth2 code flow.
 *
 * Redirect the user to this URL to initiate SharePoint authorization.
 *
 * @param tenantId - Azure AD tenant ID
 * @param clientId - Azure AD application client ID
 * @param redirectUri - The callback URL to handle the auth code
 * @param state - CSRF protection state parameter
 * @param scope - OAuth scope
 * @returns The authorization URL to redirect the user to
 */
export function buildAuthorizationUrl(
  tenantId: string,
  clientId: string,
  redirectUri: string,
  state: string,
  scope = "https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All offline_access",
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope,
    state,
    response_mode: "query",
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 *
 * @param tenantId - Azure AD tenant ID
 * @param clientId - Azure AD application client ID
 * @param clientSecret - Azure AD application client secret
 * @param code - Authorization code from the callback
 * @param redirectUri - Must match the redirect URI used in the authorization request
 * @returns Access token response with refresh token
 * @throws IntegrationError on exchange failure
 */
export async function exchangeCodeForToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<AzureADTokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    scope: "https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All offline_access",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error");
    throw new IntegrationError("SharePoint", `Failed to exchange authorization code: ${response.status}`, {
      tenantId,
      clientId,
      error,
    });
  }

  return response.json() as Promise<AzureADTokenResponse>;
}
