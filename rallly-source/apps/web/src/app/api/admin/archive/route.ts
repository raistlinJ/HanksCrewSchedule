import { createLogger } from "@rallly/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { env } from "@/env";
import { createInstanceArchive } from "@/features/archive/data";
import { restoreInstanceArchive } from "@/features/archive/mutations";
import { getUser } from "@/features/user/data";
import { authLib, getSessionState } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logger = createLogger("api/admin/archive");
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;

async function isAdmin() {
  const session = await getSessionState();
  if (session.status !== "authenticated" || session.session.user.isGuest) {
    return false;
  }

  const user = await getUser(session.session.user.id);
  return user?.role === "admin";
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return true;
  }

  try {
    // request.url can contain the proxy's internal HTTP origin after TLS is
    // terminated upstream. NEXT_PUBLIC_BASE_URL is the canonical browser
    // origin and cannot be changed through forwarded request headers.
    return new URL(origin).origin === new URL(env.NEXT_PUBLIC_BASE_URL).origin;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const archive = await createInstanceArchive();
    const date = archive.exportedAt.slice(0, 10);

    return new Response(JSON.stringify(archive), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="rallly-archive-${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to create instance archive");
    return NextResponse.json(
      { error: "archive_creation_failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_ARCHIVE_BYTES) {
    return NextResponse.json({ error: "archive_too_large" }, { status: 413 });
  }

  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_ARCHIVE_BYTES) {
      return NextResponse.json({ error: "archive_too_large" }, { status: 413 });
    }

    const input: unknown = JSON.parse(text);
    const counts = await restoreInstanceArchive(input);

    // Restoring replaces every user and session. Expire both the session
    // token and Better Auth's signed cookie cache in this response so the
    // browser cannot keep using the pre-restore user for up to five minutes.
    // Better Auth deliberately still clears the cookies when the database
    // session has already been removed by the restore.
    await authLib.api.signOut({ headers: request.headers });

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "invalid_archive" }, { status: 400 });
    }

    logger.error({ error }, "Failed to restore instance archive");
    return NextResponse.json(
      { error: "archive_restore_failed" },
      { status: 500 },
    );
  }
}
