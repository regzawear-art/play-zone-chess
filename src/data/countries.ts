export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  currencySymbol: string;
}

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '\u{1F1EE}\u{1F1F3}', dialCode: '+91', currency: 'INR', currencySymbol: '\u20B9' },
  { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', dialCode: '+1', currency: 'USD', currencySymbol: '$' },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', dialCode: '+44', currency: 'GBP', currencySymbol: '\u00A3' },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', dialCode: '+1', currency: 'CAD', currencySymbol: 'C$' },
  { code: 'AU', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}', dialCode: '+61', currency: 'AUD', currencySymbol: 'A$' },
  { code: 'DE', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', dialCode: '+49', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'FR', name: 'France', flag: '\u{1F1EB}\u{1F1F7}', dialCode: '+33', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'IT', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', dialCode: '+39', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'ES', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', dialCode: '+34', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'NL', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', dialCode: '+31', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'BE', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}', dialCode: '+32', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'PT', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', dialCode: '+351', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'IE', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}', dialCode: '+353', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'AT', name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}', dialCode: '+43', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'FI', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}', dialCode: '+358', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'GR', name: 'Greece', flag: '\u{1F1EC}\u{1F1F7}', dialCode: '+30', currency: 'EUR', currencySymbol: '\u20AC' },
  { code: 'PL', name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}', dialCode: '+48', currency: 'PLN', currencySymbol: 'z\u0142' },
  { code: 'SE', name: 'Sweden', flag: '\u{1F1F8}\u{1F1ED}', dialCode: '+46', currency: 'SEK', currencySymbol: 'kr' },
  { code: 'NO', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}', dialCode: '+47', currency: 'NOK', currencySymbol: 'kr' },
  { code: 'DK', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', dialCode: '+45', currency: 'DKK', currencySymbol: 'kr' },
  { code: 'CZ', name: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}', dialCode: '+420', currency: 'CZK', currencySymbol: 'K\u010D' },
  { code: 'RU', name: 'Russia', flag: '\u{1F1F7}\u{1F1FA}', dialCode: '+7', currency: 'RUB', currencySymbol: '\u20BD' },
  { code: 'UA', name: 'Ukraine', flag: '\u{1F1FA}\u{1F1E6}', dialCode: '+380', currency: 'UAH', currencySymbol: '\u20B4' },
  { code: 'TR', name: 'Turkey', flag: '\u{1F1F9}\u{1F1F7}', dialCode: '+90', currency: 'TRY', currencySymbol: '\u20BA' },
  { code: 'CN', name: 'China', flag: '\u{1F1E8}\u{1F1F3}', dialCode: '+86', currency: 'CNY', currencySymbol: '\u00A5' },
  { code: 'JP', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', dialCode: '+81', currency: 'JPY', currencySymbol: '\u00A5' },
  { code: 'KR', name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', dialCode: '+82', currency: 'KRW', currencySymbol: '\u20A9' },
  { code: 'HK', name: 'Hong Kong', flag: '\u{1F1ED}\u{1F1F0}', dialCode: '+852', currency: 'HKD', currencySymbol: 'HK$' },
  { code: 'SG', name: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}', dialCode: '+65', currency: 'SGD', currencySymbol: 'S$' },
  { code: 'MY', name: 'Malaysia', flag: '\u{1F1F2}\u{1F1FE}', dialCode: '+60', currency: 'MYR', currencySymbol: 'RM' },
  { code: 'TH', name: 'Thailand', flag: '\u{1F1F9}\u{1F1ED}', dialCode: '+66', currency: 'THB', currencySymbol: '\u0E3F' },
  { code: 'ID', name: 'Indonesia', flag: '\u{1F1EE}\u{1F1E9}', dialCode: '+62', currency: 'IDR', currencySymbol: 'Rp' },
  { code: 'PH', name: 'Philippines', flag: '\u{1F1F5}\u{1F1ED}', dialCode: '+63', currency: 'PHP', currencySymbol: '\u20B1' },
  { code: 'VN', name: 'Vietnam', flag: '\u{1F1FB}\u{1F1F3}', dialCode: '+84', currency: 'VND', currencySymbol: '\u20AB' },
  { code: 'PK', name: 'Pakistan', flag: '\u{1F1F5}\u{1F1F0}', dialCode: '+92', currency: 'PKR', currencySymbol: '\u20A8' },
  { code: 'BD', name: 'Bangladesh', flag: '\u{1F1E7}\u{1F1E9}', dialCode: '+880', currency: 'BDT', currencySymbol: '\u09F3' },
  { code: 'LK', name: 'Sri Lanka', flag: '\u{1F1F1}\u{1F1F0}', dialCode: '+94', currency: 'LKR', currencySymbol: 'Rs' },
  { code: 'NP', name: 'Nepal', flag: '\u{1F1F3}\u{1F1F5}', dialCode: '+977', currency: 'NPR', currencySymbol: 'Rs' },
  { code: 'AE', name: 'United Arab Emirates', flag: '\u{1F1E6}\u{1F1EA}', dialCode: '+971', currency: 'AED', currencySymbol: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', flag: '\u{1F1F8}\u{1F1E6}', dialCode: '+966', currency: 'SAR', currencySymbol: 'SAR' },
  { code: 'QA', name: 'Qatar', flag: '\u{1F1F6}\u{1F1E6}', dialCode: '+974', currency: 'QAR', currencySymbol: 'QAR' },
  { code: 'KW', name: 'Kuwait', flag: '\u{1F1F0}\u{1F1FC}', dialCode: '+965', currency: 'KWD', currencySymbol: 'KWD' },
  { code: 'BH', name: 'Bahrain', flag: '\u{1F1E7}\u{1F1ED}', dialCode: '+973', currency: 'BHD', currencySymbol: 'BHD' },
  { code: 'OM', name: 'Oman', flag: '\u{1F1F4}\u{1F1F2}', dialCode: '+968', currency: 'OMR', currencySymbol: 'OMR' },
  { code: 'JO', name: 'Jordan', flag: '\u{1F1EF}\u{1F1F4}', dialCode: '+962', currency: 'JOD', currencySymbol: 'JOD' },
  { code: 'IL', name: 'Israel', flag: '\u{1F1EE}\u{1F1F1}', dialCode: '+972', currency: 'ILS', currencySymbol: '\u20AA' },
  { code: 'EG', name: 'Egypt', flag: '\u{1F1EA}\u{1F1EC}', dialCode: '+20', currency: 'EGP', currencySymbol: 'E\u00A3' },
  { code: 'ZA', name: 'South Africa', flag: '\u{1F1FF}\u{1F1E6}', dialCode: '+27', currency: 'ZAR', currencySymbol: 'R' },
  { code: 'NG', name: 'Nigeria', flag: '\u{1F1F3}\u{1F1EC}', dialCode: '+234', currency: 'NGN', currencySymbol: '\u20A6' },
  { code: 'KE', name: 'Kenya', flag: '\u{1F1F0}\u{1F1EA}', dialCode: '+254', currency: 'KES', currencySymbol: 'KSh' },
  { code: 'GH', name: 'Ghana', flag: '\u{1F1EC}\u{1F1ED}', dialCode: '+233', currency: 'GHS', currencySymbol: '\u20B5' },
  { code: 'MA', name: 'Morocco', flag: '\u{1F1F2}\u{1F1E6}', dialCode: '+212', currency: 'MAD', currencySymbol: 'MAD' },
  { code: 'BR', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', dialCode: '+55', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'AR', name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', dialCode: '+54', currency: 'ARS', currencySymbol: 'AR$' },
  { code: 'MX', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', dialCode: '+52', currency: 'MXN', currencySymbol: 'Mex$' },
  { code: 'CO', name: 'Colombia', flag: '\u{1F1E8}\u{1F1F4}', dialCode: '+57', currency: 'COP', currencySymbol: 'Col$' },
  { code: 'CL', name: 'Chile', flag: '\u{1F1E8}\u{1F1F1}', dialCode: '+56', currency: 'CLP', currencySymbol: 'CL$' },
  { code: 'PE', name: 'Peru', flag: '\u{1F1F5}\u{1F1EA}', dialCode: '+51', currency: 'PEN', currencySymbol: 'S/' },
  { code: 'VE', name: 'Venezuela', flag: '\u{1F1FB}\u{1F1EA}', dialCode: '+58', currency: 'VES', currencySymbol: 'Bs' },
  { code: 'UY', name: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', dialCode: '+598', currency: 'UYU', currencySymbol: '$U' },
  { code: 'NZ', name: 'New Zealand', flag: '\u{1F1F3}\u{1F1FF}', dialCode: '+64', currency: 'NZD', currencySymbol: 'NZ$' },
];

export const CURRENCIES: string[] = Array.from(new Set(COUNTRIES.map((c) => c.currency))).sort();

const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRY_BY_CODE[code];
}

export function getCountryByDialCode(dialCode: string): Country | undefined {
  return COUNTRIES.find((c) => c.dialCode === dialCode);
}

const STORAGE_KEY = 'gambit-user-currency';
const COUNTRY_STORAGE_KEY = 'gambit-user-country';

export function getStoredCurrency(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'INR';
  } catch {
    return 'INR';
  }
}

export function storeCurrency(currency: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // ignore
  }
}

export function getStoredCountryCode(): string {
  try {
    return localStorage.getItem(COUNTRY_STORAGE_KEY) || 'IN';
  } catch {
    return 'IN';
  }
}

export function storeCountryCode(code: string): void {
  try {
    localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

const INR_RATES: Record<string, number> = {
  INR: 1, USD: 0.012, GBP: 0.0094, EUR: 0.011, CAD: 0.016, AUD: 0.018,
  JPY: 1.78, CNY: 0.085, KRW: 16.2, RUB: 1.1, BRL: 0.065, MXN: 0.22,
  ZAR: 0.21, NGN: 18.5, SEK: 0.12, NOK: 0.13, DKK: 0.08, CHF: 0.011,
  SGD: 0.016, HKD: 0.093, MYR: 0.054, THB: 0.42, IDR: 188, PHP: 0.69,
  VND: 295, PKR: 3.35, BDT: 1.3, LKR: 3.6, NPR: 1.6, AED: 0.044,
  SAR: 0.045, QAR: 0.044, KWD: 0.0037, BHD: 0.0045, OMR: 0.0042,
  JOD: 0.0085, ILS: 0.043, EGP: 0.58, KES: 1.55, GHS: 0.18, MAD: 0.11,
  ARS: 12.5, COP: 49, CLP: 10.8, PEN: 0.045, VES: 0.54, UYU: 0.49,
  NZD: 0.02, PLN: 0.048, CZK: 0.27, UAH: 0.5, TRY: 0.41, HUF: 4.2,
};

export function convertFromINR(amountInr: number, targetCurrency: string): number {
  const rate = INR_RATES[targetCurrency] ?? 1;
  return amountInr * rate;
}

export function formatCurrency(amountInr: number, currency: string): string {
  const country = COUNTRIES.find((c) => c.currency === currency);
  const symbol = country?.currencySymbol ?? '';
  const converted = convertFromINR(amountInr, currency);
  const decimals = currency === 'INR' || currency === 'JPY' || currency === 'KRW' || currency === 'VND' || currency === 'IDR' ? 0 : 2;
  return `${symbol}${converted.toFixed(decimals)}`;
}
