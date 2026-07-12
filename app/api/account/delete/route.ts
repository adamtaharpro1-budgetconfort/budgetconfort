import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/actions/profile";

export async function POST() {
  try {
    await deleteAccount();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
}
