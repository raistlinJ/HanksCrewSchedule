import { createLogger } from "@rallly/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createInstanceArchive } from "@/features/archive/data";
import { restoreInstanceArchive } from "@/features/archive/mutations";
import { getUser } from "@/features/user/data";
import { getSessionState } from "@/lib/auth";

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
  return origin === null || origin === new URL(request.url).origin;
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
