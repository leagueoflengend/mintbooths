import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://chinchinbooth.vercel.app";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date().toISOString(),
      priority: 1.0,
    },
    {
      url: `${baseUrl}/photo-booth`,
      lastModified: new Date().toISOString(),
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stickers`,
      lastModified: new Date().toISOString(),
      priority: 0.8,
    },
  ];
}
