import { NextResponse } from "next/server";
import { resetDeviceSyncCode } from "../../../chatgpt-auth";

export async function GET(request: Request) {
  await resetDeviceSyncCode();
  const requested = new URL(request.url).searchParams.get("return_to") ?? "/";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return NextResponse.redirect(new URL(returnTo, request.url));
}
