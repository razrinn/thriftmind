import { priceHistory } from '../db/schema';
import {Resvg } from '@resvg/resvg-wasm';

// Initialize WASM module once
type PriceHistory = typeof priceHistory.$inferSelect;

/**
 * Generates an SVG chart for price history data
 * Generates a PNG chart for price history data
 * @param history Array of price history records (sorted by recordedAt)
 * @param width Chart width (default: 400)
 * @param height Chart height (default: 200)
 * @returns SVG string
 */
export async function generatePriceChart(
  history: PriceHistory[],
  width = 400,
  height = 200
): Promise<Uint8Array> {
  if (history.length < 2) {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#64748b">Not enough data</text>
    </svg>`;

    const resvg = new Resvg(svg);
    return resvg.render().asPng();
  }

  // Sort history by recordedAt
  const sortedHistory = [...history].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()
  );

  // Calculate data points
  const minPrice = Math.min(...sortedHistory.map((h) => h.price));
  const maxPrice = Math.max(...sortedHistory.map((h) => h.price));
  const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

  // Padding for chart
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  // Calculate coordinates
  const points = sortedHistory.map((h, i) => {
    const x = padding.left +
              (i / (sortedHistory.length - 1)) * (width - padding.left - padding.right);
    const y = padding.top +
              ((maxPrice - h.price) / priceRange) * (height - padding.top - padding.bottom);
    return `${x},${y}`;
  }).join(' ');

  // Generate SVG
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="100%" height="100%" fill="#f8fafc"/>

    <!-- Y-axis labels -->
    <text x="${padding.left - 5}" y="${padding.top}" text-anchor="end" fill="#64748b" font-size="10">${maxPrice.toFixed(2)}</text>
    <text x="${padding.left - 5}" y="${height - padding.bottom}" text-anchor="end" fill="#64748b" font-size="10">${minPrice.toFixed(2)}</text>

    <!-- X-axis labels -->
    <text x="${padding.left}" y="${height - padding.bottom + 20}" text-anchor="middle" fill="#64748b" font-size="10">${new Date(sortedHistory[0].recordedAt).toLocaleDateString()}</text>
    <text x="${width - padding.right}" y="${height - padding.bottom + 20}" text-anchor="middle" fill="#64748b" font-size="10">${new Date(sortedHistory[sortedHistory.length - 1].recordedAt).toLocaleDateString()}</text>

    <!-- Grid lines -->
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#e2e8f0"/>
    <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#e2e8f0"/>

    <!-- Area fill -->
    <polygon points="${points} ${width - padding.right},${height - padding.bottom} ${padding.left},${height - padding.bottom}" fill="url(#gradient)"/>

    <!-- Line chart -->
    <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Start point -->
    <circle cx="${points.split(' ')[0].split(',')[0]}" cy="${points.split(' ')[0].split(',')[1]}" r="3" fill="#3b82f6"/>

    <!-- End point -->
    <circle cx="${points.split(' ')[points.split(' ').length - 1].split(',')[0]}"
            cy="${points.split(' ')[points.split(' ').length - 1].split(',')[1]}"
            r="3" fill="#3b82f6"/>
  </svg>`;

  // Render SVG to PNG
  const resvg = new Resvg(svg);
  return resvg.render().asPng();
}