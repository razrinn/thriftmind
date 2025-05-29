/**
 * Formats a number as Indonesian Rupiah (IDR) currency using toLocaleString
 * @param amount The amount to format
 * @returns Formatted string with "Rp" prefix and proper IDR formatting
 */
export function formatIDR(amount: number | string): string {
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	return `Rp${num.toLocaleString('id-ID')}`;
}
