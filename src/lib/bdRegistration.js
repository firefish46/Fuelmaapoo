/**
 * Bangladesh BRTA Vehicle Registration Parser
 *
 * STRICT FORMAT: [DISTRICT_CODE] [CLASS_CODE] [6-DIGIT-NUMBER]
 * Examples:
 *   DM LA 527474      ✅ valid
 *   CTG GA 123456     ✅ valid
 *   DM LA 52747       ❌ invalid (only 5 digits)
 *   DM LA 5274741     ❌ invalid (7 digits)
 *   DM GHA 527474     ✅ valid (3-letter class code)
 */

export const BRTA_CLASS_MAP = {
  // Motorcycles
  'LA':  { label: 'Motorcycle',              systemClass: 'Motorcycle',   icon: '🏍', cc: null },
  'HA':  { label: 'Motorcycle (Small)',       systemClass: 'Motorcycle',   icon: '🏍', cc: '≤100cc' },
  'A':   { label: 'Motorcycle (up to 100cc)', systemClass: 'Motorcycle',   icon: '🏍', cc: '≤100cc' },
  'B':   { label: 'Motorcycle (101-150cc)',   systemClass: 'Motorcycle',   icon: '🏍', cc: '101-150cc' },
  'C':   { label: 'Motorcycle (151-250cc)',   systemClass: 'Motorcycle',   icon: '🏍', cc: '151-250cc' },
  'D':   { label: 'Motorcycle (above 250cc)', systemClass: 'Motorcycle',   icon: '🏍', cc: '>250cc' },

  // Private Cars
  'KA':  { label: 'Private Car (≤1000cc)',   systemClass: 'Private Car',  icon: '🚗', cc: '≤1000cc' },
  'KHA': { label: 'Private Car (1000-1300cc)',systemClass: 'Private Car',  icon: '🚗', cc: '1000-1300cc' },
  'GA':  { label: 'Private Car (1301-2000cc)',systemClass: 'Private Car',  icon: '🚗', cc: '1301-2000cc' },
  'BHA': { label: 'Private Car (Luxury)',     systemClass: 'Private Car',  icon: '🚗', cc: '>2000cc' },

  // Jeep / SUV / Pickup
  'GHA': { label: 'Jeep / SUV / Pickup',     systemClass: 'Pickup / SUV', icon: '🚙', cc: null },

  // Microbus / Van
  'CHA': { label: 'Microbus',                systemClass: 'Microbus',     icon: '🚐', cc: null },
  'NA':  { label: 'Covered Van',             systemClass: 'Light Truck',  icon: '🚛', cc: null },

  // Bus / Minibus
  'BA':  { label: 'Bus',                     systemClass: 'Bus',          icon: '🚌', cc: null },
  'E':   { label: 'Minibus',                 systemClass: 'Minibus',      icon: '🚌', cc: null },

  // Trucks
  'TA':  { label: 'Light Truck',             systemClass: 'Light Truck',  icon: '🚛', cc: null },
  'MA':  { label: 'Heavy Truck',             systemClass: 'Heavy Truck',  icon: '🚚', cc: null },

  // Agricultural
  'G':   { label: 'Agricultural Vehicle',    systemClass: 'Agricultural', icon: '🚜', cc: null },

  // Three-wheelers → map to Motorcycle (closest available class)
  'THA': { label: 'Auto-Rickshaw (CNG)',     systemClass: 'Motorcycle',   icon: '🛺', cc: null },
};

export const DISTRICT_CODES = {
  'DHAKA METRO':      { bn: 'ঢাকা মেট্রো',      short: 'DM'  },
  'CHITTAGONG METRO': { bn: 'চট্টগ্রাম মেট্রো',  short: 'CTM' },
  'KHULNA METRO':     { bn: 'খুলনা মেট্রো',      short: 'KHM' },
  'RAJSHAHI METRO':   { bn: 'রাজশাহী মেট্রো',    short: 'RJM' },
  'SYLHET METRO':     { bn: 'সিলেট মেট্রো',      short: 'SYM' },
  'BARISHAL METRO':   { bn: 'বরিশাল মেট্রো',     short: 'BAM' },
  'MYMENSINGH METRO': { bn: 'ময়মনসিংহ মেট্রো',  short: 'MYM' },
  'GAZIPUR METRO':    { bn: 'গাজীপুর মেট্রো',    short: 'GPM' },
  'DHAKA':            { bn: 'ঢাকা',              short: 'DHA' },
  'CHITTAGONG':       { bn: 'চট্টগ্রাম',          short: 'CTG' },
  'KHULNA':           { bn: 'খুলনা',              short: 'KHL' },
  'RAJSHAHI':         { bn: 'রাজশাহী',            short: 'RAJ' },
  'SYLHET':           { bn: 'সিলেট',              short: 'SYL' },
  'BARISHAL':         { bn: 'বরিশাল',             short: 'BAR' },
  'MYMENSINGH':       { bn: 'ময়মনসিংহ',          short: 'MYM' },
  'RANGPUR':          { bn: 'রংপুর',              short: 'RNG' },
  'COMILLA':          { bn: 'কুমিল্লা',           short: 'COM' },
  'NARAYANGANJ':      { bn: 'নারায়ণগঞ্জ',        short: 'NAR' },
  'GAZIPUR':          { bn: 'গাজীপুর',            short: 'GAZ' },
  'BOGURA':           { bn: 'বগুড়া',             short: 'BOG' },
  'NOAKHALI':         { bn: 'নোয়াখালী',          short: 'NOA' },
  'JESSORE':          { bn: 'যশোর',               short: 'JES' },
  'DINAJPUR':         { bn: 'দিনাজপুর',           short: 'DIN' },
  'PABNA':            { bn: 'পাবনা',              short: 'PAB' },
  'TANGAIL':          { bn: 'টাঙ্গাইল',           short: 'TAN' },
  'FARIDPUR':         { bn: 'ফরিদপুর',            short: 'FAR' },
  'COX\'S BAZAR':     { bn: 'কক্সবাজার',          short: 'COX' },
  'NARSINGDI':        { bn: 'নরসিংদী',            short: 'NRS' },
  'MANIKGANJ':        { bn: 'মানিকগঞ্জ',          short: 'MAN' },
  'MUNSHIGANJ':       { bn: 'মুন্সীগঞ্জ',         short: 'MUN' },
  'KISHOREGANJ':      { bn: 'কিশোরগঞ্জ',          short: 'KIS' },
};

// All known district short codes for validation
const ALL_DISTRICT_SHORTS = new Set(
  Object.values(DISTRICT_CODES).map(d => d.short)
);

// Class codes ordered longest-first so "GHA" matches before "G"
const CLASS_CODE_LIST = Object.keys(BRTA_CLASS_MAP)
  .sort((a, b) => b.length - a.length);

/**
 * STRICT validation.
 * Valid format after normalization: "XX CLASSCODE 6DIGITS"
 * e.g. "DM LA 527474", "CTG GHA 123456"
 *
 * Returns { isValid, error?, districtCode, classCode, classInfo, number, systemClass }
 */
/**
 * STRICT validation.
 * Valid format: "DISTRICT CLASS SERIES 4DIGITS"
 * e.g. "DM LA 11 5274", "CTG GHA 22 1234"
 */
export function validateRegistration(reg) {
  if (!reg || reg.trim().length < 6) {
    return { isValid: false, error: 'Registration number too short' };
  }

  const parts = reg.trim().toUpperCase().split(/\s+/);

  if (parts.length !== 4) {
    return {
      isValid: false,
      error: `Expected: DISTRICT CLASS SERIES 4DIGITS (e.g. DM LA 11 5274) — got ${parts.length} part(s)`,
    };
  }

  const [districtCode, classCode, series, number] = parts;

  // 1. Validate district
  if (!ALL_DISTRICT_SHORTS.has(districtCode)) {
    return {
      isValid: false,
      error: `Unknown district code "${districtCode}". Use codes like DM, CTG, SYL…`,
    };
  }

  // 2. Validate class code
  const classInfo = BRTA_CLASS_MAP[classCode];
  if (!classInfo) {
    return {
      isValid: false,
      error: `Unknown class code "${classCode}". Valid: ${CLASS_CODE_LIST.join(', ')}`,
    };
  }

  // 3. Validate series — 1 or 2 digits
  if (!/^\d{1,2}$/.test(series)) {
    return {
      isValid: false,
      error: `Series must be 1-2 digits (e.g. 11, 5) — got "${series}"`,
    };
  }

  // 4. Validate number — exactly 4 digits
  if (!/^\d{4}$/.test(number)) {
    return {
      isValid: false,
      error: `Number must be exactly 4 digits (e.g. 5274) — got "${number}" (${number.length} digit${number.length !== 1 ? 's' : ''})`,
    };
  }

  return {
    isValid:      true,
    districtCode,
    classCode,
    classInfo,
    series,
    number,
    systemClass:  classInfo.systemClass,
    formatted:    `${districtCode} ${classCode} ${series} ${number}`,
  };
}

/**
 * Parse registration — returns full info if valid, partial info if not.
 * Used for auto-detection even on incomplete input.
 */
export function parseRegistration(input) {
  if (!input || input.trim().length < 3) return { isValid: false, raw: input };

  const raw = input.trim().toUpperCase();

  // Try strict validation first
  const strict = validateRegistration(raw);
  if (strict.isValid) {
    return {
      ...strict,
      raw,
      district: strict.districtCode,
      suggestedSystemClass: strict.systemClass,
    };
  }

  // Partial — try to extract class code for hint/auto-detect
  const parts = raw.split(/\s+/);
  for (const part of parts) {
    const info = BRTA_CLASS_MAP[part];
    if (info) {
      return {
        isValid: false,
        partialMatch: true,
        classCode: part,
        classInfo: info,
        suggestedSystemClass: info.systemClass,
        raw,
        validationError: strict.error,
      };
    }
  }

  return { isValid: false, raw, validationError: strict.error };
}

/**
 * Live hint while typing — shows class info as soon as class code detected.
 */
export function getInputHint(input) {
  if (!input || input.length < 2) return null;
  const upper = input.toUpperCase();

  const classMatch = upper.match(/(?:^|\s|-)(THA|KHA|BHA|GHA|CHA|LA|HA|KA|GA|NA|BA|TA|MA|A|B|C|D|E|G)(?:\s|-|$)/);
  if (classMatch) {
    const code = classMatch[1];
    const info = BRTA_CLASS_MAP[code];
    if (info) {
      return {
        classCode:   code,
        label:       info.label,
        systemClass: info.systemClass,
        icon:        info.icon,
        cc:          info.cc,
      };
    }
  }
  return null;
}

export const DISTRICT_LIST = Object.entries(DISTRICT_CODES).map(([name, val]) => ({
  name, bn: val.bn, short: val.short,
}));

export const CLASS_OPTIONS = Object.entries(BRTA_CLASS_MAP).map(([code, info]) => ({
  code, ...info,
}));