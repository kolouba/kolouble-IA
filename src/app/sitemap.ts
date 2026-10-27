import type { MetadataRoute } from "next";

const ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/templates", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/services", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/tarifs", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/docs", priority: 0.7, changeFrequency: "weekly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
