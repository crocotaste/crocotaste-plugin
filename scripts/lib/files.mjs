import {
  chmodSync,
  lstatSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

// The examples are under 300 KB; anything this big is not a brand book.
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

class FileGuardError extends Error {
  constructor(message) {
    super(message);
    this.name = "FileGuardError";
  }
}

function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function refuseSymlink(path, shown = path) {
  if (isSymlink(path)) {
    throw new FileGuardError(`refusing to write through a symlink: ${shown}`);
  }
}

function readInput(path, shown = path) {
  if (statSync(path).size > MAX_INPUT_BYTES) {
    throw new FileGuardError(`file too large (max 2 MB): ${shown}`);
  }
  return readFileSync(path, "utf8");
}

// A link in the user's repo could point anywhere, so it is never followed; the
// temp file and rename mean a crash never leaves half a file behind.
function writeFileSafely(path, text, shown = path) {
  refuseSymlink(path, shown);
  let mode;
  try {
    mode = statSync(path).mode & 0o777;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temp = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${Date.now()}.tmp`
  );
  try {
    writeFileSync(temp, text, { flag: "wx" });
    if (mode !== undefined) chmodSync(temp, mode);
    renameSync(temp, path);
  } catch (error) {
    try {
      unlinkSync(temp);
    } catch {
      // Nothing to clean up when the temp file was never created.
    }
    throw error;
  }
}

export {
  FileGuardError,
  MAX_INPUT_BYTES,
  isSymlink,
  readInput,
  refuseSymlink,
  writeFileSafely,
};
