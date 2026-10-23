// The coin economy. Every change to a child's balance is one row in the
// append-only ledger plus the same update to children.coins, inside one
// transaction. The idempotency key makes retries harmless: a game that is
// ended twice, a lesson completed twice or a double-tapped purchase never
// pays or charges twice. Daily earning caps keep rewards modest.
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { childRewards, children, coinTransactions, rewardItems } from '../database/schema.js';
import { localParts } from './controlsService.js';

export interface RewardValues {
  tutorialCompleted: number;
  gameCompleted: number;
  gameWon: number;
  puzzleSolvedMin: number;
  puzzleSolvedMax: number;
  dailyChallenge: number;
  craftCompleted: number;
  lessonCompleted: number;
  quizCompleted: number;
  factDiscovered: number;
  dailyCap: number;
  shopEnabled: boolean;
}

export const DEFAULT_REWARDS: RewardValues = {
  tutorialCompleted: 5,
  gameCompleted: 5,
  gameWon: 10,
  puzzleSolvedMin: 5,
  puzzleSolvedMax: 15,
  dailyChallenge: 10,
  craftCompleted: 10,
  lessonCompleted: 10,
  quizCompleted: 5,
  factDiscovered: 1,
  dailyCap: 150,
  shopEnabled: true,
};

/** Coins earned (positive entries) on the child's local calendar day. */
export async function earnedOn(db: Pick<Db, 'select'>, childId: string, timezone: string, day: string): Promise<number> {
  const [sum] = await db
    .select({ n: sql<number>`coalesce(sum(${coinTransactions.amount}) filter (where ${coinTransactions.amount} > 0), 0)::int` })
    .from(coinTransactions)
    .where(and(eq(coinTransactions.childId, childId), sql`(${coinTransactions.createdAt} at time zone ${timezone})::date = ${day}::date`));
  return sum?.n ?? 0;
}

export interface AwardResult {
  awarded: number;
  balance: number;
  duplicate: boolean;
  capped: boolean;
}

/**
 * Credits coins once per idempotency key. Returns what was actually awarded:
 * 0 for a duplicate, or less than asked when the daily cap is reached.
 */
export async function awardCoins(db: Db, childId: string, amount: number, reason: string, idempotencyKey: string, opts: { refType?: string; refId?: string; note?: string; dailyCap?: number | null; timezone?: string } = {}): Promise<AwardResult> {
  if (amount <= 0) {
    const [c] = await db.select({ coins: children.coins }).from(children).where(eq(children.id, childId));
    return { awarded: 0, balance: c?.coins ?? 0, duplicate: false, capped: false };
  }
  return db.transaction(async (tx) => {
    const [dup] = await tx.select({ id: coinTransactions.id }).from(coinTransactions).where(eq(coinTransactions.idempotencyKey, idempotencyKey));
    const [child] = await tx.select({ coins: children.coins }).from(children).where(eq(children.id, childId)).for('update');
    if (!child) throw new Error('child not found');
    if (dup) return { awarded: 0, balance: child.coins, duplicate: true, capped: false };
    let grant = amount;
    let capped = false;
    if (opts.dailyCap !== null && opts.dailyCap !== undefined && opts.dailyCap >= 0) {
      const tz = opts.timezone ?? 'Asia/Kolkata';
      const room = Math.max(0, opts.dailyCap - (await earnedOn(tx, childId, tz, localParts(new Date(), tz).day)));
      if (grant > room) {
        grant = room;
        capped = true;
      }
    }
    if (grant <= 0) return { awarded: 0, balance: child.coins, duplicate: false, capped };
    const balance = child.coins + grant;
    await tx.insert(coinTransactions).values({ childId, amount: grant, balanceAfter: balance, reason, refType: opts.refType ?? null, refId: opts.refId ?? null, idempotencyKey, note: opts.note ?? null });
    await tx.update(children).set({ coins: balance, updatedAt: new Date() }).where(eq(children.id, childId));
    return { awarded: grant, balance, duplicate: false, capped };
  });
}

export class ShopError extends Error {
  constructor(
    public readonly code: 'shop_disabled' | 'not_found' | 'already_owned' | 'insufficient_coins' | 'premium_only',
    message: string
  ) {
    super(message);
  }
}

/** Buys a reward item with coins, once. Validates price and ownership on the server. */
export async function purchaseItem(db: Db, childId: string, itemKey: string, idempotencyKey: string, opts: { shopEnabled: boolean; premium: boolean }) {
  if (!opts.shopEnabled) throw new ShopError('shop_disabled', 'The reward shop is turned off');
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(rewardItems).where(and(eq(rewardItems.key, itemKey), eq(rewardItems.status, 'published')));
    if (!item) throw new ShopError('not_found', 'That reward does not exist');
    if (item.premiumOnly && !opts.premium) throw new ShopError('premium_only', 'This reward is for subscribers');
    const [dup] = await tx.select({ id: coinTransactions.id }).from(coinTransactions).where(eq(coinTransactions.idempotencyKey, idempotencyKey));
    const [child] = await tx.select({ coins: children.coins }).from(children).where(eq(children.id, childId)).for('update');
    if (!child) throw new Error('child not found');
    const [owned] = await tx.select().from(childRewards).where(and(eq(childRewards.childId, childId), eq(childRewards.itemKey, itemKey)));
    if (dup || owned) return { item, balance: child.coins, duplicate: true };
    if (child.coins < item.price) throw new ShopError('insufficient_coins', `You need ${item.price - child.coins} more coins`);
    const balance = child.coins - item.price;
    await tx.insert(coinTransactions).values({ childId, amount: -item.price, balanceAfter: balance, reason: 'shop_purchase', refType: 'item', refId: itemKey, idempotencyKey });
    await tx.update(children).set({ coins: balance, updatedAt: new Date() }).where(eq(children.id, childId));
    await tx.insert(childRewards).values({ childId, itemKey });
    return { item, balance, duplicate: false };
  });
}

export async function equipItem(db: Db, childId: string, itemKey: string | null, kind: string) {
  const [child] = await db.select({ equipped: children.equippedRewards }).from(children).where(eq(children.id, childId));
  if (!child) throw new Error('child not found');
  const equipped = { ...child.equipped };
  if (itemKey === null) delete equipped[kind];
  else {
    const [owned] = await db.select().from(childRewards).where(and(eq(childRewards.childId, childId), eq(childRewards.itemKey, itemKey)));
    if (!owned) throw new ShopError('not_found', 'You do not own that reward yet');
    equipped[kind] = itemKey;
  }
  await db.update(children).set({ equippedRewards: equipped, updatedAt: new Date() }).where(eq(children.id, childId));
  return equipped;
}

export async function wallet(db: Db, childId: string, opts: { shopEnabled: boolean; premium: boolean; timezone: string; dailyCap: number | null }) {
  const [child] = await db.select({ coins: children.coins, equipped: children.equippedRewards }).from(children).where(eq(children.id, childId));
  const tx = await db.select().from(coinTransactions).where(eq(coinTransactions.childId, childId)).orderBy(desc(coinTransactions.createdAt)).limit(50);
  const items = await db.select().from(rewardItems).where(eq(rewardItems.status, 'published')).orderBy(rewardItems.sortOrder);
  const owned = new Set((await db.select({ k: childRewards.itemKey }).from(childRewards).where(eq(childRewards.childId, childId))).map((r) => r.k));
  const earnedToday = await earnedOn(db, childId, opts.timezone, localParts(new Date(), opts.timezone).day);
  return {
    balance: child?.coins ?? 0,
    earnedToday,
    dailyCap: opts.dailyCap,
    shopEnabled: opts.shopEnabled,
    equipped: child?.equipped ?? {},
    transactions: tx.map((t) => ({ id: t.id, amount: t.amount, balanceAfter: t.balanceAfter, reason: t.reason, refType: t.refType, refId: t.refId, note: t.note, createdAt: t.createdAt.toISOString() })),
    items: items.map((i) => ({ key: i.key, name: i.name, description: i.description, kind: i.kind, emoji: i.emoji, color: i.color, visual: i.visual, price: i.price, premiumOnly: i.premiumOnly, owned: owned.has(i.key), affordable: (child?.coins ?? 0) >= i.price, locked: i.premiumOnly && !opts.premium })),
  };
}

export const REWARD_ITEM_SEEDS: (typeof rewardItems.$inferInsert)[] = [
  { key: 'hat-party', name: 'Party Hat', description: 'A stripy party hat for your avatar.', kind: 'avatar_accessory', emoji: '🎉', color: '#FF6B9D', price: 30, sortOrder: 1 },
  { key: 'crown-gold', name: 'Golden Crown', description: 'Rule your games in style.', kind: 'avatar_accessory', emoji: '👑', color: '#FFC93C', price: 80, sortOrder: 2 },
  { key: 'glasses-star', name: 'Star Glasses', description: 'Sparkly star-shaped glasses.', kind: 'avatar_accessory', emoji: '🕶️', color: '#9B6BFF', price: 40, sortOrder: 3 },
  { key: 'theme-ocean', name: 'Ocean Theme', description: 'Blue waves and bubbles for your home screen.', kind: 'theme', emoji: '🌊', color: '#4FB3FF', price: 60, sortOrder: 4 },
  { key: 'theme-jungle', name: 'Jungle Theme', description: 'Leafy greens and friendly animals.', kind: 'theme', emoji: '🌴', color: '#7ED957', price: 60, sortOrder: 5 },
  { key: 'theme-space', name: 'Space Theme', description: 'Stars, planets and a rocket.', kind: 'theme', emoji: '🚀', color: '#2E2A4A', price: 90, premiumOnly: true, sortOrder: 6 },
  { key: 'board-wood', name: 'Wooden Board', description: 'A warm wooden look for chess and checkers.', kind: 'board_skin', emoji: '🪵', color: '#D4A574', price: 50, sortOrder: 7 },
  { key: 'board-candy', name: 'Candy Board', description: 'Pink and mint squares for your board games.', kind: 'board_skin', emoji: '🍬', color: '#FF6B9D', price: 50, sortOrder: 8 },
  { key: 'tokens-animals', name: 'Animal Tokens', description: 'Ludo tokens become little animals.', kind: 'token_design', emoji: '🐾', color: '#FF8A3D', price: 45, sortOrder: 9 },
  { key: 'bg-sunset', name: 'Sunset Sky', description: 'A warm sunset behind your games.', kind: 'background', emoji: '🌅', color: '#FF8A3D', price: 35, sortOrder: 10 },
  { key: 'effect-sparkle', name: 'Sparkle Trail', description: 'Sparkles follow your taps.', kind: 'effect', emoji: '✨', color: '#FFC93C', price: 70, sortOrder: 11 },
  { key: 'badge-explorer', name: 'Explorer Badge', description: 'Show everyone you love discovering.', kind: 'badge', emoji: '🧭', color: '#4FD1C5', price: 25, sortOrder: 12 },
  { key: 'craft-rocket', name: 'Rocket Craft Template', description: 'Unlock the paper rocket tutorial.', kind: 'craft_template', emoji: '🚀', color: '#9B6BFF', price: 40, sortOrder: 13 },
];
