import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Generic authenticated proxy from the browser to the FastAPI backend.
 * The backend bearer token is attached here, server-side, and is never
 * sent to or readable by the browser (build spec: no secrets exposed to
 * the frontend). Client Components call `/api/proxy/<backend path>`
 * instead of the backend directly.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000/api";
const BACKEND_API_TOKEN = process.env.BACKEND_API_TOKEN || "";

async function forward(req: NextRequest, method: string, path: string[]) {
  const backendUrl = `${BACKEND_API_URL}/${path.join("/")}${req.nextUrl.search}`;
  const contentType = req.headers.get("content-type") || "";

  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${BACKEND_API_TOKEN}` },
  };

  if (method !== "GET" && method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      init.body = await req.formData();
    } else {
      const text = await req.text();
      if (text) {
        init.body = text;
        init.headers = { ...init.headers, "Content-Type": "application/json" };
      }
    }
  }

  const res = await fetch(backendUrl, init);
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, "GET", params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, "POST", params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, "PUT", params.path);
}
