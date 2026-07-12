import { NextResponse } from "next/server";
import { exportUserData } from "@/lib/actions/profile";

export async function GET() {
  try {
    const data = await exportUserData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
}
