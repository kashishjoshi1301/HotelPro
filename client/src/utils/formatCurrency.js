/**
 * Shared Indian Rupee (₹) currency formatter
 * Uses JavaScript Intl.NumberFormat with 'en-IN' locale and 'INR' currency.
 * Formats amounts with standard Indian numbering system (thousands, lakhs, crores).
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const inrFormatterWithDecimals = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Format a numeric amount into Indian Rupees (₹)
 * @param {number|string} amount - Monetary amount to format
 * @param {boolean} [showDecimals=false] - Whether to include 2 decimal digits (e.g. ₹1,25,000.00)
 * @returns {string} Formatted Indian Rupee string (e.g. '₹2,500' or '₹1,25,000.00')
 */
export const formatINR = (amount, showDecimals = false) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) return '₹0';
  return showDecimals
    ? inrFormatterWithDecimals.format(numericAmount)
    : inrFormatter.format(numericAmount);
};

export default formatINR;
