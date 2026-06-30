import mammoth from 'mammoth';

/**
 * Extracts raw text from a .docx File object (for placeholder detection).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Converts a .docx File to HTML, embedding images as base64 data URLs.
 * The resulting HTML includes the document's own letterhead/formatting.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractDocxHtml(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buf = await image.read('base64');
        return { src: `data:${image.contentType};base64,${buf}` };
      }),
    }
  );
  return result.value || '';
}

/**
 * Converts a filled DOCX ArrayBuffer to HTML, embedding images as base64.
 * Used for previewing backend-generated DOCX files in the browser.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
export async function convertArrayBufferToHtml(arrayBuffer) {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buf = await image.read('base64');
        return { src: `data:${image.contentType};base64,${buf}` };
      }),
    }
  );
  return result.value || '';
}

/**
 * Reads a File as a base64 string (without the data-URL prefix).
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(/** @type {string} */(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Finds all unique {UPPERCASE_PLACEHOLDER} tokens in a string.
 * @param {string} text
 * @returns {string[]}
 */
export function extractPlaceholders(text) {
  const matches = text.match(/\{[A-Z0-9_]+\}/g) || [];
  return [...new Set(matches)];
}

/**
 * Replaces every placeholder key in text with its corresponding value.
 * @param {string} text
 * @param {Record<string, string>} values  e.g. { '{GEM_NUMBER}': 'GEM-123' }
 * @returns {string}
 */
export function fillPlaceholders(text, values) {
  let result = text;
  for (const [placeholder, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      result = result.split(placeholder).join(value);
    }
  }
  return result;
}

// Explicit config for known warranty placeholders
const KNOWN_CONFIGS = {
  GEM_NUMBER:            { type: 'text',     label: 'GEM Number' },
  INVOICE_NUMBER:        { type: 'text',     label: 'Invoice Number' },
  PRODUCT_NAME:          { type: 'text',     label: 'Product Name' },
  TO_ADDRESS:            { type: 'textarea', label: 'To Address',         rows: 4 },
  SERIAL_NUMBERS:        { type: 'textarea', label: 'Serial Numbers',     rows: 3 },
  SERIAL_NUMBERS_COUNTS: { type: 'number',   label: 'Serial Numbers Count' },
  COMPANY_NAME:          { type: 'text',     label: 'Company Name' },
  DATE:                  { type: 'text',     label: 'Date' },
  DISPATCH_DATE:         { type: 'text',     label: 'Dispatch Date' },
  WARRANTY_PERIOD:       { type: 'text',     label: 'Warranty Period' },
  QUANTITY:              { type: 'number',   label: 'Quantity' },
  CONTRACT_NO:           { type: 'text',     label: 'Contract Number' },
  BID_NUMBER:            { type: 'text',     label: 'Bid Number' },
  CONSIGNEE_NAME:        { type: 'text',     label: 'Consignee Name' },
  MODEL_NAME:            { type: 'text',     label: 'Model Name' },
};

function toTitleCase(key) {
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Returns the form field config for a placeholder token.
 * @param {string} placeholder  e.g. '{GEM_NUMBER}'
 * @returns {{ type: string, label: string, rows?: number }}
 */
export function getInputConfig(placeholder) {
  const key = placeholder.replace(/[{}]/g, '');
  if (KNOWN_CONFIGS[key]) return KNOWN_CONFIGS[key];

  const lower = key.toLowerCase();
  if (lower.includes('address') || lower.includes('description') || lower.includes('notes') || lower.includes('remarks')) {
    return { type: 'textarea', label: toTitleCase(key), rows: 3 };
  }
  if (lower.includes('count') || lower.includes('qty') || lower.includes('quantity') || lower.includes('amount') || lower.includes('number') && lower.includes('count')) {
    return { type: 'number', label: toTitleCase(key) };
  }
  return { type: 'text', label: toTitleCase(key) };
}
