// Safe arithmetic evaluator used to re-check numerical answers. It never
// calls eval(): a small recursive-descent parser that accepts numbers,
// + - * / ^, parentheses, unary minus and a postfix % (x% = x/100).

export class ComputationError extends Error {}

export function evaluateExpression(input: string): number {
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').trim();
  if (!src || src.length > 300) throw new ComputationError('empty or too long');
  if (!/^[0-9+\-*/^().%\s]+$/.test(src)) throw new ComputationError('unsupported characters');
  let pos = 0;

  const peek = () => src[pos];
  const skip = () => {
    while (src[pos] === ' ') pos++;
  };

  function number(): number {
    skip();
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(pos));
    if (!m) throw new ComputationError(`expected number at ${pos}`);
    pos += m[0].length;
    return Number(m[0]);
  }

  function primary(): number {
    skip();
    if (peek() === '(') {
      pos++;
      const v = expr();
      skip();
      if (peek() !== ')') throw new ComputationError('missing )');
      pos++;
      return v;
    }
    if (peek() === '-') {
      pos++;
      return -primary();
    }
    if (peek() === '+') {
      pos++;
      return primary();
    }
    return number();
  }

  function postfix(): number {
    let v = primary();
    skip();
    while (peek() === '%') {
      pos++;
      v = v / 100;
      skip();
    }
    return v;
  }

  function power(): number {
    const base = postfix();
    skip();
    if (peek() === '^') {
      pos++;
      return Math.pow(base, power());
    }
    return base;
  }

  function term(): number {
    let v = power();
    for (;;) {
      skip();
      const op = peek();
      if (op !== '*' && op !== '/') return v;
      pos++;
      const rhs = power();
      if (op === '/' && rhs === 0) throw new ComputationError('division by zero');
      v = op === '*' ? v * rhs : v / rhs;
    }
  }

  function expr(): number {
    let v = term();
    for (;;) {
      skip();
      const op = peek();
      if (op !== '+' && op !== '-') return v;
      pos++;
      const rhs = term();
      v = op === '+' ? v + rhs : v - rhs;
    }
  }

  const value = expr();
  skip();
  if (pos !== src.length) throw new ComputationError(`unexpected "${src.slice(pos, pos + 5)}"`);
  if (!Number.isFinite(value)) throw new ComputationError('not finite');
  return value;
}

/** The single numeric value in an option such as "₹450", "12.5%", "3/4",
 * "450 रुपये". null when the option has no number or several numbers
 * (e.g. "2 hours 30 minutes"), in which case it can't be checked. */
export function numericValue(text: string): number | null {
  // Devanagari digits → ASCII
  const t = text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966)).replace(/(\d),(?=\d{2,3}\b)/g, '$1');
  const frac = t.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g);
  const nums = t.match(/-?\d+(?:\.\d+)?/g) ?? [];
  if (frac && frac.length === 1 && nums.length === 2) {
    const [a, b] = frac[0]!.split('/').map((s) => Number(s.trim()));
    return b ? a! / b : null;
  }
  if (nums.length !== 1) return null;
  return Number(nums[0]);
}

/** Equal up to display rounding: options show at most 2 decimals, so
 * 33.333… matches "33.33", but ₹9395 never matches a computed ₹9400. */
export function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(0.006, Math.abs(b) * 1e-9);
}
