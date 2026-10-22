import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error: "Content administration is not enabled. No content was published.",
    },
    { status: 403 },
  );
}
