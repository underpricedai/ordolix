import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/server/i18n.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default withNextIntl(nextConfig);
