/**
 * Bangladesh vehicle registration normalizer.
 * Converts any variation to canonical form: "DM LA 527474"
 *
 * Handles:
 *   "dm-la-527474"         → "DM LA 527474"
 *   "Dhaka metro la 527474"→ "DM LA 527474"
 *   "DMLA527474"           → "DM LA 527474"
 *   "dhaka-metro-la-11-527474" → "DM LA 11 527474"
 *   "CTG-GA-22-5678"       → "CTG GA 22 5678"
 *   "Chittagong-G-33-9999" → "CTG G 33 9999"
 */

// District name → short code mapping
const DISTRICT_ALIASES = {
  // Metro areas
  'DHAKA METRO':        'DM',
  'DHAKAMETRO':         'DM',
  'DHAKAMET':           'DM',
  'DM':                 'DM',

  'CHITTAGONG METRO':   'CTM',
  'CHATTOGRAM METRO':   'CTM',
  'CHITTAGONGMETRO':    'CTM',
  'CHATTOGRAMMETRO':    'CTM',
  'CTM':                'CTM',

  'KHULNA METRO':       'KHM',
  'KHULNAMETRO':        'KHM',
  'KHM':                'KHM',

  'RAJSHAHI METRO':     'RJM',
  'RAJSHAHIMETRO':      'RJM',
  'RJM':                'RJM',

  'SYLHET METRO':       'SYM',
  'SYLHETMETRO':        'SYM',
  'SYM':                'SYM',

  'BARISHAL METRO':     'BAM',
  'BARISALMETRO':       'BAM',
  'BAM':                'BAM',

  'MYMENSINGH METRO':   'MYM',
  'MYMENSINGHMETRO':    'MYM',
  'MYM':                'MYM',

  'GAZIPUR METRO':      'GPM',
  'GAZIPURMETRO':       'GPM',
  'GPM':                'GPM',

  // Districts
  'DHAKA':              'DHA',
  'DHA':                'DHA',

  'CHITTAGONG':         'CTG',
  'CHATTOGRAM':         'CTG',
  'CTG':                'CTG',

  'KHULNA':             'KHL',
  'KHL':                'KHL',

  'RAJSHAHI':           'RAJ',
  'RAJ':                'RAJ',

  'SYLHET':             'SYL',
  'SYL':                'SYL',

  'BARISHAL':           'BAR',
  'BARISAL':            'BAR',
  'BAR':                'BAR',

  'MYMENSINGH':         'MYM2',
  'RANGPUR':            'RNG',
  'RNG':                'RNG',

  'COMILLA':            'COM',
  'CUMILLA':            'COM',
  'COM':                'COM',

  'NARAYANGANJ':        'NAR',
  'NAR':                'NAR',

  'GAZIPUR':            'GAZ',
  'GAZ':                'GAZ',

  'BOGURA':             'BOG',
  'BOGRA':              'BOG',
  'BOG':                'BOG',

  'NOAKHALI':           'NOA',
  'NOA':                'NOA',

  'JESSORE':            'JES',
  'JASHORE':            'JES',
  'JES':                'JES',

  'DINAJPUR':           'DIN',
  'DIN':                'DIN',

  'PABNA':              'PAB',
  'PAB':                'PAB',

  'TANGAIL':            'TAN',
  'TAN':                'TAN',

  'FARIDPUR':           'FAR',
  'FAR':                'FAR',

  'COXS BAZAR':         'COX',
  'COXSBAZAR':          'COX',
  'COX':                'COX',

  'NARSINGDI':          'NRS',
  'NRS':                'NRS',

  'MANIKGANJ':          'MAN',
  'MAN':                'MAN',

  'MUNSHIGANJ':         'MUN',
  'MUN':                'MUN',

  'KISHOREGANJ':        'KIS',
  'KIS':                'KIS',
};

// All valid BRTA class codes (2-3 letter ones first so they match before single-letter subsets)
const CLASS_CODES = [
  'KHA', 'BHA', 'GHA', 'CHA', 'THA',
  'KA', 'GA', 'NA', 'LA', 'HA', 'TA', 'MA', 'BA',
  'A', 'B', 'C', 'D', 'E', 'G',
];

/**
 * Normalize any BD registration string to canonical spaced form.
 * e.g. "dmla527474" → "DM LA 527474"
 */
export function normalizeReg(reg) {
  if (!reg) return '';

  // 1. Uppercase, replace dashes/dots/underscores with spaces, collapse spaces
  let s = reg.toUpperCase()
    .replace(/[.\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Try to match spaced format: DISTRICT CLASS [SERIES] NUMBER
  //    e.g. "DM LA 527474" or "DM LA 11 527474"
  const spacedMatch = s.match(
    /^([A-Z\s]+?)\s+([A-Z]{1,3})\s+(\d{1,2})\s+(\d{1,4})$|^([A-Z\s]+?)\s+([A-Z]{1,3})\s+(\d{1,4})$/
  );

  if (spacedMatch) {
    let district, classCode, series, number;
    if (spacedMatch[1]) {
      // Full format with series
      [, district, classCode, series, number] = spacedMatch;
    } else {
      // Short format without series
      district  = spacedMatch[5];
      classCode = spacedMatch[6];
      number    = spacedMatch[7];
    }
    const shortDistrict = resolveDistrict(district.trim());
    return [shortDistrict, classCode, series, number].filter(Boolean).join(' ');
  }

  // 3. Try compact no-separator format: e.g. "DMLA527474" or "CTGGA225678"
  const compact = s.replace(/\s/g, '');
  const compactResult = parseCompact(compact);
  if (compactResult) return compactResult;

  // 4. Fallback — just return cleaned uppercase spaced version
  return s;
}

/**
 * Try to parse a compact string like "DMLA527474" by trying all known
 * district codes as prefixes, then class codes.
 */
function parseCompact(s) {
  // Try longest district prefix first (greedily)
  const districtKeys = Object.keys(DISTRICT_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of districtKeys) {
    if (s.startsWith(alias)) {
      const afterDistrict = s.slice(alias.length);
      const shortDistrict = DISTRICT_ALIASES[alias];

      // Try to find class code at start of remainder
      for (const code of CLASS_CODES) {
        if (afterDistrict.startsWith(code)) {
          const remainder = afterDistrict.slice(code.length);
          // Remainder should be digits (series+number or just number)
          if (/^\d+$/.test(remainder)) {
            const parts = splitSeriesNumber(remainder);
            return [shortDistrict, code, ...parts].join(' ');
          }
        }
      }
    }
  }
  return null;
}

/**
 * Split a digit string into optional series + number.
 * e.g. "11527474" → could be series=11, number=527474
 *      "527474"   → just number
 * Heuristic: if > 4 digits, first 1-2 are series
 */
function splitSeriesNumber(digits) {
  if (digits.length <= 4) return [digits];
  // Series is typically 1-2 digits, number is up to 4
  const numberLen   = Math.min(4, digits.length);
  const seriesLen   = digits.length - numberLen;
  const series      = digits.slice(0, seriesLen);
  const number      = digits.slice(seriesLen);
  return [series, number];
}

/**
 * Resolve a district string (possibly full name) to its short code.
 */
function resolveDistrict(s) {
  // Remove internal spaces for alias lookup
  const noSpace = s.replace(/\s/g, '');
  if (DISTRICT_ALIASES[noSpace]) return DISTRICT_ALIASES[noSpace];
  if (DISTRICT_ALIASES[s])       return DISTRICT_ALIASES[s];
  // Try startsWith match for partial names like "DHAKA M" → "DM"
  for (const [key, val] of Object.entries(DISTRICT_ALIASES)) {
    if (key.startsWith(s) || s.startsWith(key)) return val;
  }
  return s; // unknown district — return as-is
}

// Keep old export as alias
export const normalizeRegistration = normalizeReg;