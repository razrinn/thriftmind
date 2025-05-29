import * as cheerio from 'cheerio';
import { randomizeUserAgent } from '../utils/userAgent';

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
const TOKOPEDIA_SHORT_URL_REGEX = /^https?:\/\/tk\.tokopedia\.com\/[^/]+/i;
const REQUEST_TIMEOUT_MS = 10000; // Increased from 10s to 30s

/**
 * Resolves a Tokopedia short URL to the full product URL
 * @param shortUrl The short URL to resolve
 * @returns Promise resolving to full product URL
 * @throws ScrapingError if URL cannot be resolved
 */
async function resolveShortUrl(shortUrl: string): Promise<string> {
	const response = await fetch(shortUrl, {
		headers: { 'User-Agent': randomizeUserAgent() },
		redirect: 'manual',
	});

	if (!response.ok) {
		throw new ScrapingError(`Failed to resolve short URL: HTTP ${response.status}`, shortUrl);
	}

	const html = await response.text();
	const $ = cheerio.load(html);
	const fullUrl = $('a').attr('href');

	if (!fullUrl || !isValidTokopediaUrl(fullUrl)) {
		throw new ScrapingError('No valid product URL found in short URL response', shortUrl);
	}

	return fullUrl;
}

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
	// Resolve short URLs first
	if (TOKOPEDIA_SHORT_URL_REGEX.test(url)) {
		url = await resolveShortUrl(url);
	}

	if (!isValidTokopediaUrl(url)) {
		throw new ScrapingError('Invalid Tokopedia URL format', url);
	}

	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': randomizeUserAgent(),
			},
		});

		if (response.status === 429) {
			throw new ScrapingError('Rate limited by Tokopedia', url);
		}

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
