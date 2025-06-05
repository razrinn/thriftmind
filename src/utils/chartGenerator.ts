import { priceHistory } from '../db/schema';
import { Resvg, initWasm, ResvgRenderOptions } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { formatIDR } from './priceFormatter';

// Initialize WASM module once
type PriceHistory = typeof priceHistory.$inferSelect;

let initPromise: Promise<void> | null = null;

/**
 * Generates an SVG chart for price history data
 * Generates a PNG chart for price history data
 * @param history Array of price history records (sorted by recordedAt)
 * @param width Chart width (default: 400)
 * @param height Chart height (default: 200)
 * @returns SVG string
 */
export async function generatePriceChart(history: PriceHistory[], width = 400, height = 200): Promise<Uint8Array> {
	if (!initPromise) {
		initPromise = initWasm(resvgWasm);
	}
	await initPromise;

	const abbreviateNumber = (value: number): string => {
		if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
		if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
		if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
		return value.toString();
	};

	const fontResponse = await fetch(
		'https://fonts.gstatic.com/s/opensans/v43/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.woff2'
	);
	const fontBuffer = await fontResponse.arrayBuffer();

	const opts: ResvgRenderOptions = {
		font: {
			loadSystemFonts: false,
			fontBuffers: [new Uint8Array(fontBuffer)],
			defaultFontFamily: 'Open Sans',
		},
	};

	if (history.length < 2) {
		const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#1e293b" font-size="14">Not enough data</text>
    </svg>`;

		const resvg = new Resvg(svg, opts);
		return resvg.render().asPng();
	}

	// Sort history by recordedAt
	const sortedHistory = [...history].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

	// Calculate data points
	const minPrice = Math.min(...sortedHistory.map((h) => h.price));
	const maxPrice = Math.max(...sortedHistory.map((h) => h.price));
	const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

	// Calculate 5 price ticks
	const tickCount = 5;
	const priceTicks = Array.from({ length: tickCount }).map((_, i) => {
		return minPrice + (priceRange * i) / (tickCount - 1);
	});

	// Increased left padding to prevent price tick cropping
	const padding = { top: 20, right: 20, bottom: 30, left: 75 };

	// Calculate coordinates
	const points = sortedHistory
		.map((h, i) => {
			const x = padding.left + (i / (sortedHistory.length - 1)) * (width - padding.left - padding.right);
			const y = padding.top + ((maxPrice - h.price) / priceRange) * (height - padding.top - padding.bottom);
			return `${x},${y}`;
		})
		.join(' ');

	// Generate SVG
	const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
	   <defs>
	     <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
	       <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
	       <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
	     </linearGradient>
	     <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
	       <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
	       <feOffset in="blur" dx="0" dy="2" result="offsetBlur"/>
	       <feFlood flood-color="#0c4a6e" flood-opacity="0.15"/>
	       <feComposite in2="offsetBlur" operator="in"/>
	       <feMerge>
	         <feMergeNode/>
	         <feMergeNode in="SourceGraphic"/>
	       </feMerge>
	     </filter>
	     <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
	       <circle cx="1" cy="1" r="1" fill="#e2e8f0" fill-opacity="0.3"/>
	     </pattern>
	   </defs>

	   <!-- Styled background with border -->
	   <rect width="100%" height="100%" fill="url(#dots)" rx="8" stroke="#e2e8f0" stroke-width="2"/>

	   <!-- Decorative corner elements -->
	   <path d="M0,8 Q0,0 8,0" fill="none" stroke="#3b82f6" stroke-width="2"/>
	   <path d="M${width},8 Q${width},0 ${width - 8},0" fill="none" stroke="#3b82f6" stroke-width="2"/>

	   <!-- Y-axis ticks and labels -->
	   ${priceTicks
				.map((tick) => {
					const y = padding.top + ((maxPrice - tick) / priceRange) * (height - padding.top - padding.bottom);
					return `
	     <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#f1f5f9"/>
	     <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11" font-weight="500">Rp${abbreviateNumber(
						tick
					)}</text>
	   `;
				})
				.join('')}

	   <!-- X-axis labels with consistent styling -->
	   <text x="${padding.left}" y="${
		height - padding.bottom + 20
	}" text-anchor="middle" fill="#64748b" font-size="11" font-weight="500" font-family="Open Sans, sans-serif">${
		new Date(sortedHistory[0].recordedAt).getMonth() + 1
	}/${new Date(sortedHistory[0].recordedAt).getDate()}</text>
	   <text x="${width - padding.right}" y="${
		height - padding.bottom + 20
	}" text-anchor="middle" fill="#64748b" font-size="11" font-weight="500" font-family="Open Sans, sans-serif">${
		new Date(sortedHistory[sortedHistory.length - 1].recordedAt).getMonth() + 1
	}/${new Date(sortedHistory[sortedHistory.length - 1].recordedAt).getDate()}</text>

	   <!-- Consistent axis styling -->
	   <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#e2e8f0" stroke-width="1"/>

	   <!-- X-axis line -->
	   <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${
		height - padding.bottom
	}" stroke="#e2e8f0"/>

	   <!-- Area fill -->
	   <polygon points="${points} ${width - padding.right},${height - padding.bottom} ${padding.left},${
		height - padding.bottom
	}" fill="url(#gradient)"/>

	   <!-- Smoother line chart -->
	   <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)" stroke-dasharray="0"/>

	   <!-- Modern data points -->
	   <circle cx="${points.split(' ')[0].split(',')[0]}" cy="${
		points.split(' ')[0].split(',')[1]
	}" r="5" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>

	   <circle cx="${points.split(' ')[points.split(' ').length - 1].split(',')[0]}"
	           cy="${points.split(' ')[points.split(' ').length - 1].split(',')[1]}"
	           r="5" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
	 </svg>`;

	// Render SVG to PNG
	const resvg = new Resvg(svg, opts);
	return resvg.render().asPng();
}
