import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AccessError } from "@/modules/identity/auth";

/** Bound bytes actually received, including requests without Content-Length. */
export async function readJson(request: Request, maxBytes = 16_384) {
  const url = new URL(request.url);
  const expectedOrigin =
    process.env.APP_ORIGIN ||
    `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expectedOrigin)
    throw new AccessError("Request origin rejected.", 403);
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new AccessError("Send this request as application/json.", 415);
  const declared = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes)
    throw new AccessError("Request too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError("A JSON request body is required.", 400);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AccessError("Request too large.", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof TypeError)
      throw new AccessError("Invalid request encoding.", 400);
    throw error;
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(body) as unknown;
}

export function privateJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Cookie, Authorization");
  return NextResponse.json(data, { ...init, headers });
}

export function apiError(error: unknown) {
  if (error instanceof AccessError)
    return privateJson({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return privateJson(
      { error: "Invalid request. Check your entries and try again." },
      { status: 400 },
    );
  const requestId = randomUUID();
  // Never log request bodies, provider credentials, SQL text, or learner answers.
  console.error(
    JSON.stringify({
      event: "api_error",
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  return privateJson(
    { error: "Unable to save progress. Please retry.", requestId },
    { status: 500 },
  );
}
