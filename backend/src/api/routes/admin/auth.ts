import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { asyncHandler, HttpError } from "../../../middleware/errorHandler";
import { signAdminToken } from "../../../middleware/auth";
import { authRateLimit } from "../../../middleware/rateLimit";

export const adminAuthRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

adminAuthRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const admin = await prisma.adminUser.findUnique({ where: { email: body.email } });
    if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }

    const token = signAdminToken({ adminUserId: admin.id, role: admin.role });
    res.json({ token, role: admin.role });
  })
);
