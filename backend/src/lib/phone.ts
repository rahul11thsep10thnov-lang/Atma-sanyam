// Mobile numbers are stored in E.164 (+<country><number>, digits only). What a
// person types is normalised with a default country code (India unless the
// deployment says otherwise): "98765 43210", "098765-43210", "+91 98765 43210"
// and "0091..." all become "+919876543210".
const E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(input: string, defaultCountryCode: string): string | null {
  let s = input.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) {
    s = s.replace(/^0+/, '');
    s = `+${defaultCountryCode}${s}`;
  }
  return E164.test(s) ? s : null;
}

/** For anywhere other than the owner's own screens: "+91 ••••••• 10". */
export function maskPhone(phone: string): string {
  const tail = phone.slice(-2);
  return `${phone.slice(0, 3)} ${'•'.repeat(Math.max(3, phone.length - 5))} ${tail}`;
}
