import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* your existing config options */
};

const withNextIntl = createNextIntlPlugin();

// Wrap the Next.js config with both bundle analyzer and the intl plugin.
module.exports = bundleAnalyzer(withNextIntl(nextConfig));
