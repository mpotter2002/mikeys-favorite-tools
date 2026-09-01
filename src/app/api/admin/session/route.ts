import { isAdminRequest } from "@/lib/admin";

export async function GET() {
  return Response.json({ admin: await isAdminRequest() });
}
