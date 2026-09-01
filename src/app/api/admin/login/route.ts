import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { adminCookieValue, checkPassword } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!checkPassword(body?.password ?? "")) {
    return Response.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
  const cookie = adminCookieValue();
  const jar = await cookies();
  jar.set(cookie.name, cookie.value, cookie.options);
  return Response.json({ ok: true });
}
