/**
 * Generates a random alphanumeric short ID
 * @param length Length of ID (default: 6)
 * @returns Generated short ID string
 */
export function generateShortId(length = 6): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Generates a UUID v4 string
 * @returns Generated UUID string
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Truncates text to max length with ellipsis if needed
 */
export function truncate(text: string, maxLength = 36) {
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
