/** Settings > Export log (M3-AC7): download the telemetry JSON; iOS Safari fallback = share sheet, then copy to clipboard. */
export async function exportLog(json: string, name: string, doc: Document = document): Promise<string> {
  const blob = new Blob([json], { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  try {
    if (ios && typeof File !== 'undefined' && nav.canShare?.({ files: [new File([blob], name, { type: 'application/json' })] })) {
      await nav.share({ files: [new File([blob], name, { type: 'application/json' })], title: 'Egg Farm log' }); return 'Log shared.';
    }
    const url = URL.createObjectURL(blob), a = doc.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; doc.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    if (!ios) return 'Log downloaded.';
  } catch { /* fall through to clipboard */ }
  try { await nav.clipboard.writeText(json); return 'Log copied to clipboard — paste it into a message.'; }
  catch { return ios ? 'If no file appeared, try again or use Share.' : 'Export failed.'; }
}
