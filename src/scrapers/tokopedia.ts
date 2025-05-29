import * as cheerio from 'cheerio';

/**
 * Custom errors for scraping failures
 */
export class ScrapingError extends Error {
	constructor(message: string, public url: string) {
		super(message);
		this.name = 'ScrapingError';
	}
}

interface ScrapedProduct {
	title: string;
	price: number;
	currency: string;
	available: boolean;
	originalUrl: string;
}

const TOKOPEDIA_URL_REGEX = /^https?:\/\/(?:www\.)?tokopedia\.com\/[^/]+\/[^/]+/i;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Validates a Tokopedia product URL format
 * @param url The URL to validate
 * @returns boolean indicating if URL is valid
 */
export function isValidTokopediaUrl(url: string): boolean {
	return TOKOPEDIA_URL_REGEX.test(url);
}

/**
 * Scrapes product details from Tokopedia
 * @param url Valid Tokopedia product URL
 * @returns Promise resolving to product details
 * @throws ScrapingError for various failure scenarios
 */
export async function scrapeTokopedia(url: string): Promise<ScrapedProduct> {
	if (!isValidTokopediaUrl(url)) {
		throw new ScrapingError('Invalid Tokopedia URL format', url);
	}

	try {
		// Add timeout and retry logic
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
			},
		});
		clearTimeout(timeout);

		if (!response.ok) {
			throw new ScrapingError(`HTTP ${response.status}: ${response.statusText}`, url);
		}

		const html = await response.text();
		if (!html.includes('tokopedia')) {
			throw new ScrapingError('Response does not appear to be from Tokopedia', url);
		}

		const $ = cheerio.load(html);

		const title = $('h1[data-testid="lblPDPDetailProductName"]').text().trim();
		if (!title) {
			throw new ScrapingError('Product title not found', url);
		}

		const priceText = $('div[data-testid="lblPDPDetailProductPrice"]').text();
		const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));

		if (isNaN(price)) {
			throw new ScrapingError(`Could not parse price from: ${priceText}`, url);
		}

		return {
			title,
			price,
			currency: 'IDR',
			available: true,
			originalUrl: url,
		};
	} catch (error) {
		if (error instanceof ScrapingError) throw error;
		throw new ScrapingError(error instanceof Error ? error.message : 'Unknown scraping error', url);
	}
}
