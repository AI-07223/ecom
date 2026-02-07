/**
 * Status badge color mappings for orders and other status-driven UI elements
 * Royal Trading Company - E-commerce Design System
 */

export const statusBadgeStyles = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
} as const;

export type StatusType = keyof typeof statusBadgeStyles;

/**
 * Get Tailwind CSS classes for a status badge based on status string
 * @param status - The status string (case-insensitive)
 * @returns Tailwind CSS classes for styling the badge
 */
export function getStatusBadgeClass(status: string): string {
  const normalizedStatus = status.toLowerCase() as StatusType;
  return statusBadgeStyles[normalizedStatus] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Check if a status is a valid status type
 * @param status - The status string to check
 * @returns boolean indicating if the status is valid
 */
export function isValidStatus(status: string): status is StatusType {
  return Object.keys(statusBadgeStyles).includes(status.toLowerCase());
}

/**
 * Get all available status types
 * @returns Array of valid status type strings
 */
export function getAvailableStatuses(): StatusType[] {
  return Object.keys(statusBadgeStyles) as StatusType[];
}
