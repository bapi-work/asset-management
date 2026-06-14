/**
 * Formats a date string, object, or timestamp to 'DD-MM-YYYY'.
 * If the input is invalid or missing, returns '-' or a custom fallback.
 * 
 * @param {string|Date|number} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatDate = (dateInput, fallback = '-') => {
  if (!dateInput) return fallback;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return fallback;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Formats a date string, object, or timestamp to 'DD-MM-YYYY HH:mm:ss'.
 * If the input is invalid or missing, returns '-' or a custom fallback.
 * 
 * @param {string|Date|number} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatDateTime = (dateInput, fallback = '-') => {
  if (!dateInput) return fallback;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return fallback;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};
