// The password rule, the same as the server's (backend/src/lib/passwordPolicy.ts):
// 6–15 characters with a capital letter, a small letter, a number and a
// special character. Here it guides the form as someone types; the server's
// check is the one that counts.
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 15;

export type PasswordRule = 'length' | 'upper' | 'lower' | 'digit' | 'special';

export const PASSWORD_RULES: PasswordRule[] = ['length', 'upper', 'lower', 'digit', 'special'];

export function passwordRuleMet(rule: PasswordRule, password: string): boolean {
  switch (rule) {
    case 'length':
      return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX && !/\s/.test(password);
    case 'upper':
      return /[A-Z]/.test(password);
    case 'lower':
      return /[a-z]/.test(password);
    case 'digit':
      return /\d/.test(password);
    case 'special':
      return /[^A-Za-z0-9\s]/.test(password);
  }
}

export function passwordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => passwordRuleMet(r, password));
}


export const PASSWORD_RULE_MESSAGE = `Use ${PASSWORD_MIN}–${PASSWORD_MAX} characters with a capital letter, a small letter, a number and a special character`;

/** What is still missing, in words, for the form's hint. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN) problems.push(`at least ${PASSWORD_MIN} characters`);
  if (password.length > PASSWORD_MAX) problems.push(`at most ${PASSWORD_MAX} characters`);
  if (!/[A-Z]/.test(password)) problems.push('a capital letter');
  if (!/[a-z]/.test(password)) problems.push('a small letter');
  if (!/\d/.test(password)) problems.push('a number');
  if (!/[^A-Za-z0-9\s]/.test(password)) problems.push('a special character');
  if (/\s/.test(password)) problems.push('no spaces');
  return problems;
}
