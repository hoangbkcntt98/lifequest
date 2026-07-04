import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import Busboy from "busboy";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";

export const runtime = "nodejs";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "music");
const MAX_FILE_SIZE = 350 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
]);

type MusicTrack = {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
};

type UploadResult = {
  fileName: string;
};

function sanitizeFileName(name: string) {
  const ext = path.extname(name).toLowerCase();
  const baseName = path
    .basename(name, ext)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "track"}-${Date.now()}${ext || ".mp3"}`;
}

function getUserMusicDir(userId: string) {
  return path.join(UPLOAD_ROOT, userId);
}

function getTrackUrl(fileName: string) {
  return `/api/music/stream?file=${encodeURIComponent(fileName)}`;
}

function getSafeFileName(fileName: string | null) {
  if (!fileName || fileName !== path.basename(fileName)) {
    return null;
  }

  return fileName;
}

function sanitizeRename(name: string, currentFileName: string) {
  const currentExt = path.extname(currentFileName).toLowerCase();
  const requestedExt = path.extname(name).toLowerCase();
  const ext = requestedExt || currentExt || ".mp3";
  const baseName = path
    .basename(name, requestedExt)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "track"}${ext}`;
}

async function listTracks(userId: string): Promise<MusicTrack[]> {
  const userDir = getUserMusicDir(userId);

  try {
    const entries = await readdir(userDir, { withFileTypes: true });
    const tracks = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = path.join(userDir, entry.name);
          const info = await stat(filePath);

          return {
            name: entry.name,
            url: getTrackUrl(entry.name),
            size: info.size,
            uploadedAt: info.birthtime.toISOString(),
          };
        })
    );

    return tracks.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getCurrentUserFromCookie();

    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const fileName = getSafeFileName(request.nextUrl.searchParams.get("file"));

    if (!fileName) {
      return NextResponse.json(
        { message: "Invalid file name." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { name?: string }
      | null;
    const nextName = body?.name?.trim();

    if (!nextName) {
      return NextResponse.json(
        { message: "Track name is required." },
        { status: 400 }
      );
    }

    const userDir = getUserMusicDir(authUser.userId);
    const nextFileName = sanitizeRename(nextName, fileName);

    if (nextFileName !== fileName) {
      await rename(path.join(userDir, fileName), path.join(userDir, nextFileName));
    }

    const tracks = await listTracks(authUser.userId);

    return NextResponse.json({
      track: tracks.find((track) => track.name === nextFileName),
      tracks,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ message: "Track not found." }, { status: 404 });
    }

    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return NextResponse.json(
        { message: "A track with that name already exists." },
        { status: 409 }
      );
    }

    console.error("MUSIC_RENAME_ERROR", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}

async function parseStreamingUpload(
  request: NextRequest,
  userId: string
): Promise<UploadResult> {
  if (!request.body) {
    throw new Error("Please upload an audio file.");
  }

  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD) {
    throw new Error("Audio file must be 350MB or smaller.");
  }

  const userDir = getUserMusicDir(userId);
  await mkdir(userDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(request.headers.entries());
    const busboy = Busboy({
      headers,
      limits: {
        files: 1,
        fileSize: MAX_FILE_SIZE,
      },
    });

    let fileFound = false;
    let savedFileName = "";
    let savedFilePath = "";
    let uploadTask: Promise<void> | null = null;
    let uploadError: Error | null = null;

    function fail(error: Error) {
      uploadError = error;
    }

    busboy.on("file", (fieldName, file, info) => {
      if (fieldName !== "file") {
        file.resume();
        return;
      }

      fileFound = true;

      if (!ALLOWED_TYPES.has(info.mimeType)) {
        fail(new Error("Unsupported audio format."));
        file.resume();
        return;
      }

      savedFileName = sanitizeFileName(info.filename);
      savedFilePath = path.join(userDir, savedFileName);

      file.on("limit", () => {
        fail(new Error("Audio file must be 350MB or smaller."));
      });

      uploadTask = pipeline(
        file,
        createWriteStream(savedFilePath, {
          flags: "wx",
        })
      ).catch(async (error) => {
        if (savedFilePath) {
          await unlink(savedFilePath).catch(() => undefined);
        }

        throw error;
      });
    });

    busboy.on("error", (error) => {
      reject(error);
    });

    busboy.on("finish", async () => {
      try {
        if (uploadError) {
          if (savedFilePath) {
            await unlink(savedFilePath).catch(() => undefined);
          }

          throw uploadError;
        }

        if (!fileFound || !uploadTask || !savedFileName) {
          throw new Error("Please upload an audio file.");
        }

        await uploadTask;

        resolve({
          fileName: savedFileName,
        });
      } catch (error) {
        reject(error);
      }
    });

    Readable.fromWeb(
      request.body as unknown as NodeReadableStream<Uint8Array>
    ).pipe(busboy);
  });
}

export async function GET() {
  try {
    const authUser = await getCurrentUserFromCookie();

    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const tracks = await listTracks(authUser.userId);

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("MUSIC_LIST_ERROR", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUserFromCookie();

    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { fileName } = await parseStreamingUpload(request, authUser.userId);
    const tracks = await listTracks(authUser.userId);

    return NextResponse.json({
      track: tracks.find((track) => track.name === fileName),
      tracks,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    if (
      message === "Please upload an audio file." ||
      message === "Unsupported audio format."
    ) {
      return NextResponse.json({ message }, { status: 400 });
    }

    if (message === "Audio file must be 350MB or smaller.") {
      return NextResponse.json({ message }, { status: 413 });
    }

    console.error("MUSIC_UPLOAD_ERROR", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getCurrentUserFromCookie();

    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const fileName = getSafeFileName(request.nextUrl.searchParams.get("file"));

    if (!fileName) {
      return NextResponse.json(
        { message: "Invalid file name." },
        { status: 400 }
      );
    }

    await unlink(path.join(getUserMusicDir(authUser.userId), fileName));

    const tracks = await listTracks(authUser.userId);

    return NextResponse.json({ tracks });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ message: "Track not found." }, { status: 404 });
    }

    console.error("MUSIC_DELETE_ERROR", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
