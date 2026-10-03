import { describe, it, expect, afterAll } from "vitest";

const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("OTP issue/verify", () => {
  const mobile = `+9198${String(Date.now()).slice(-8)}`;
  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.otpCode.deleteMany({ where: { mobile } });
    await prisma.smsLog.deleteMany({ where: { mobile } });
  });
  it("hashes codes, is single-use, limits attempts and resends", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { issueOtp, verifyOtp } = await import("./otp");
    const r = await issueOtp(mobile, "SIGNUP", "127.0.0.9");
    expect(r.ok && r.devCode).toMatch(/^\d{6}$/);
    const code = (r as { devCode: string }).devCode;
    const row = await prisma.otpCode.findFirstOrThrow({ where: { mobile } });
    expect(row.codeHash).not.toContain(code);
    expect((await prisma.smsLog.findFirstOrThrow({ where: { mobile } })).purpose).toBe("otp:SIGNUP"); // code itself never logged
    expect((await issueOtp(mobile, "SIGNUP", "127.0.0.9")).ok).toBe(false); // resend too soon
    expect(await verifyOtp(mobile, "LOGIN", code)).toMatchObject({ ok: false }); // wrong purpose
    expect(await verifyOtp(mobile, "SIGNUP", "000000".replace(/0$/, code.endsWith("0") ? "1" : "0"))).toMatchObject({ ok: false, error: "Incorrect code." });
    expect(await verifyOtp(mobile, "SIGNUP", code)).toEqual({ ok: true });
    expect(await verifyOtp(mobile, "SIGNUP", code)).toMatchObject({ ok: false }); // single use
  });
  it("locks after five wrong attempts and expires after five minutes", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { verifyOtp } = await import("./otp");
    await prisma.otpCode.create({ data: { mobile, purpose: "LOGIN", codeHash: "x", expiresAt: new Date(Date.now() + 60_000), attempts: 5 } });
    expect(await verifyOtp(mobile, "LOGIN", "123456")).toMatchObject({ ok: false, error: expect.stringMatching(/Too many/) });
    await prisma.otpCode.create({ data: { mobile, purpose: "RESET", codeHash: "x", expiresAt: new Date(Date.now() - 1) } });
    expect(await verifyOtp(mobile, "RESET", "123456")).toMatchObject({ ok: false, error: expect.stringMatching(/expired/) });
  });
});
