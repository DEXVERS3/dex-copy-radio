import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    output: "✅ PROBE_OK_APP_APP_ROUTE (if you still see 'No input received', your deploy is not using this file)",
  });
}
