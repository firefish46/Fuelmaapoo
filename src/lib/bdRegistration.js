/**
 * Bangladesh BRTA Vehicle Registration Parser
 * Format: [DISTRICT] [METRO?]-[CLASS_LETTER]-[SERIES]-[NUMBER]
 * Examples:
 *   ঢাকা মেট্রো-ক-১১-৯৯৯৯  (Dhaka Metro, class A, motorcycle up to 100cc)
 *   ঢাকা মেট্রো-গ-১১-৯৯৯৯  (Dhaka Metro, class G, private car/jeep)
 *   চট্টগ্রাম-ঘ-১১-৯৯৯৯     (Chittagong, class GH, microbus)
 *
 * For romanized input (typed by employees):
 *   Dhaka Metro-A-11-9999
 *   Ctg-B-22-1234
 */

// ── BRTA Vehicle Class Letter → Vehicle Class mapping ──────────────────────
// Source: Bangladesh Road Transport Authority (BRTA) official classification
// Bengali letter : BRTA English code : CC/type range : our system class
export const BRTA_CLASS_MAP = {
  // Private Cars (Based on CC/Size)
  'KA':  { label: 'Private Car (Up to 1000cc)', systemClass: 'Private Car', icon: '🚗' },
  'KHA': { label: 'Private Car (1000cc-1300cc)', systemClass: 'Private Car', icon: '🚗' },
  'GA':  { label: 'Private Car (1301cc-2000cc)', systemClass: 'Private Car', icon: '🚗' },
  'BHA': { label: 'Private Car (Luxury/New)',    systemClass: 'Private Car', icon: '🚗' },
  
  // Jeeps / SUVs
  'GHA': { label: 'Jeep / SUV',             systemClass: 'SUV',         icon: '🚙' },
  
  // Microbus / Van
  'CHA': { label: 'Microbus',               systemClass: 'Microbus',    icon: '🚐' },
  'NA':  { label: 'Covered Van',            systemClass: 'Truck',       icon: '🚛' },

  // Motorcycles (Note: BRTA uses 'LA' or 'HA')
  'LA':  { label: 'Motorcycle',             systemClass: 'Motorcycle',  icon: '🏍' },
  'HA':  { label: 'Motorcycle (Small)',     systemClass: 'Motorcycle',  icon: '🏍' },

  // Commercial / Goods
  'TA':  { label: 'Truck (Standard)',       systemClass: 'Truck',       icon: '🚚' },
  'MA':  { label: 'Truck (Heavy)',          systemClass: 'Heavy Truck', icon: '🚚' },
  'BA':  { label: 'Bus / Minibus',          systemClass: 'Bus',         icon: '🚌' },
  
  // Three-Wheelers
  'THA': { label: 'Auto-Rickshaw (CNG)',    systemClass: 'CNG',         icon: '🛺' },
};

// ── District / Metro codes (romanized as typed on keyboard) ────────────────
export const DISTRICT_CODES = {
  // Metropolitan areas (Metro prefix)
  'DHAKA METRO':      { bn: 'ঢাকা মেট্রো',   short: 'DM'  },
  'CHITTAGONG METRO': { bn: 'চট্টগ্রাম মেট্রো', short: 'CTM' },
  'KHULNA METRO':     { bn: 'খুলনা মেট্রো',   short: 'KHM' },
  'RAJSHAHI METRO':   { bn: 'রাজশাহী মেট্রো', short: 'RJM' },
  'SYLHET METRO':     { bn: 'সিলেট মেট্রো',   short: 'SYM' },
  'BARISHAL METRO':   { bn: 'বরিশাল মেট্রো',  short: 'BAM' },
  'MYMENSINGH METRO': { bn: 'ময়মনসিংহ মেট্রো', short: 'MYM' },
  'GAZIPUR METRO':    { bn: 'গাজীপুর মেট্রো', short: 'GPM' },

  // Divisions / Districts
  'DHAKA':        { bn: 'ঢাকা',        short: 'DHA' },
  'CHITTAGONG':   { bn: 'চট্টগ্রাম',   short: 'CTG' },
  'KHULNA':       { bn: 'খুলনা',       short: 'KHL' },
  'RAJSHAHI':     { bn: 'রাজশাহী',     short: 'RAJ' },
  'SYLHET':       { bn: 'সিলেট',       short: 'SYL' },
  'BARISHAL':     { bn: 'বরিশাল',      short: 'BAR' },
  'MYMENSINGH':   { bn: 'ময়মনসিংহ',   short: 'MYM' },
  'RANGPUR':      { bn: 'রংপুর',       short: 'RNG' },
  'COMILLA':      { bn: 'কুমিল্লা',    short: 'COM' },
  'NARAYANGANJ':  { bn: 'নারায়ণগঞ্জ', short: 'NAR' },
  'GAZIPUR':      { bn: 'গাজীপুর',    short: 'GAZ' },
  'BOGURA':       { bn: 'বগুড়া',      short: 'BOG' },
  'NOAKHALI':     { bn: 'নোয়াখালী',   short: 'NOA' },
  'JESSORE':      { bn: 'যশোর',        short: 'JES' },
  'DINAJPUR':     { bn: 'দিনাজপুর',   short: 'DIN' },
  'PABNA':        { bn: 'পাবনা',       short: 'PAB' },
  'TANGAIL':      { bn: 'টাঙ্গাইল',   short: 'TAN' },
  'FARIDPUR':     { bn: 'ফরিদপুর',    short: 'FAR' },
  'BARISAL':      { bn: 'বরিশাল',      short: 'BAR' },
  'COX\'S BAZAR': { bn: 'কক্সবাজার',  short: 'COX' },
  'NARSINGDI':    { bn: 'নরসিংদী',    short: 'NRS' },
  'MANIKGANJ':    { bn: 'মানিকগঞ্জ',  short: 'MAN' },
  'MUNSHIGANJ':   { bn: 'মুন্সীগঞ্জ', short: 'MUN' },
  'KISHOREGANJ':  { bn: 'কিশোরগঞ্জ',  short: 'KIS' },
};

/**
 * Parse a typed registration number and extract district + vehicle class.
 * Accepts flexible formats like:
 *   "Dhaka Metro-B-11-1234"
 *   "DM-B-11-1234"
 *   "CTG-GA-22-5678"
 *   "Chittagong-G-33-9999"
 *
 * Returns: { district, districtBn, classCode, classInfo, formatted, isValid }
 */
export function parseRegistration(input) {
  if (!input || input.trim().length < 3) {
    return { isValid: false, raw: input };
  }

  const raw = input.trim().toUpperCase();

  // Try to split on the class letter segment
  // Pattern: DISTRICT[-|space]CLASSCODE[-|space]SERIES[-|space]NUMBER
  // Class code is 1-3 uppercase letters sitting between district and the series number
// This pattern accounts for 1 to 3 letters (like G, KA, or BHA)
const match = raw.match(
  /^([A-Z\s']+?)\s*[-\s]+([A-Z]{1,3})\s*[-\s]+(\d{1,2})\s*[-\s]+(\d{1,4})$/
);
  if (!match) {
    // Can't parse fully — try to at least detect class code from anywhere
    const classMatch = raw.match(/[-\s]([A-Z]{1,3})[-\s]/);
    if (classMatch) {
      const classCode = classMatch[1];
      const classInfo = BRTA_CLASS_MAP[classCode];
      if (classInfo) {
        return {
          isValid: false,
          partialMatch: true,
          classCode,
          classInfo,
          raw,
          suggestion: classInfo.systemClass,
        };
      }
    }
    return { isValid: false, raw };
  }

  const [, districtRaw, classCode, series, number] = match;
  const district = districtRaw.trim();

  // Look up class
  const classInfo = BRTA_CLASS_MAP[classCode];

  // Look up district (fuzzy)
  let districtInfo = null;
  for (const [key, val] of Object.entries(DISTRICT_CODES)) {
    if (
      key === district ||
      val.short === district ||
      key.startsWith(district) ||
      district.startsWith(key.split(' ')[0])
    ) {
      districtInfo = { name: key, ...val };
      break;
    }
  }

  return {
    isValid: !!classInfo,
    raw,
    district: districtInfo?.name || district,
    districtBn: districtInfo?.bn || district,
    classCode,
    classInfo: classInfo || null,
    series,
    number: number.padStart(4, '0'),
    suggestedSystemClass: classInfo?.systemClass || null,
    formatted: `${districtInfo?.bn || district}-${classCode}-${series}-${number.padStart(4, '0')}`,
  };
}

/**
 * Get a human-readable hint for a partial input as the user types.
 * Used for the live suggestion bubble under the input field.
 */
export function getInputHint(input) {
  if (!input || input.length < 2) return null;
  const upper = input.toUpperCase();

  // Check if a class code is present
  const classMatch = upper.match(/[-\s]([A-Z]{1,3})(?:[-\s]|$)/);
  if (classMatch) {
    const code = classMatch[1];
    const info = BRTA_CLASS_MAP[code];
    if (info) {
      return {
        classCode: code,
        label: info.label,
        systemClass: info.systemClass,
        icon: info.icon,
        cc: info.cc,
      };
    }
  }
  return null;
}

// Flat list of all districts for the dropdown
export const DISTRICT_LIST = Object.entries(DISTRICT_CODES).map(([name, val]) => ({
  name,
  bn: val.bn,
  short: val.short,
}));

// All vehicle class options enriched with BRTA info
export const CLASS_OPTIONS = Object.entries(BRTA_CLASS_MAP).map(([code, info]) => ({
  code,
  ...info,
}));