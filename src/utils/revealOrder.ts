// Produces a reveal order for a rows x cols grid where consecutive entries
// land on well-spread, non-adjacent cells rather than filling the grid
// row-by-row. Walks the R2 low-discrepancy additive recurrence (derived
// from the plastic number), which covers the unit square uniformly with no
// clustering, mapping each point to a grid cell and skipping ones already
// taken.
const GX = 0.7548776662466927;
const GY = 0.5698402909980532;

export function computeUniformRevealOrder(rows: number, cols: number): number[] {
  const total = rows * cols;
  const used = new Array(total).fill(false);
  const order: number[] = [];

  let x = 0;
  let y = 0;
  let attempts = 0;
  const maxAttempts = total * 50;

  while (order.length < total && attempts < maxAttempts) {
    x = (x + GX) % 1;
    y = (y + GY) % 1;
    attempts++;
    const col = Math.min(cols - 1, Math.floor(x * cols));
    const row = Math.min(rows - 1, Math.floor(y * rows));
    const idx = row * cols + col;
    if (!used[idx]) {
      used[idx] = true;
      order.push(idx);
    }
  }

  if (order.length < total) {
    for (let i = 0; i < total; i++) {
      if (!used[i]) order.push(i);
    }
  }

  return order;
}
