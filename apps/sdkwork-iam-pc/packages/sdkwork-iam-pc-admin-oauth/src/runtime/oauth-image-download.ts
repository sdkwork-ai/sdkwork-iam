/**
 * Runtime download helper for remote images (e.g. WeChat follow-QR PNGs).
 *
 * The download action re-fetches the cross-origin ticket URL as a blob so a
 * local file can be saved. Raw HTTP dispatch lives here (runtime layer), not
 * in a UI component.
 */
export async function downloadRemoteImageAsFile(url: string, fileName: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}