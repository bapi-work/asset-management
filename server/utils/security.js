/**
 * Escape special regular expression characters in user input to prevent ReDoS and Regex Injection.
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Remove dangerous keys (__proto__, constructor, prototype, $-prefixed operators) from plain objects
 * to prevent Prototype Pollution and NoSQL Injection during mass assignment.
 */
export const sanitizePayload = (obj, disallowedFields = ['_id', '__v', 'createdAt']) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype' ||
      key.startsWith('$') ||
      disallowedFields.includes(key)
    ) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
};

