const VIDEO_EXTS = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

export function isVideoUrl(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTS.some((ext) => path.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

export function formatRelative(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;

  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;

  const year = Math.floor(month / 12);
  return `${year}y ago`;
}
