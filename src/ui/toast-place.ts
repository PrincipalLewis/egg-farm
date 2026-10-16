/** Toast top (F1 + rc2 item 1): 8px below the lower of the queue strip (not docked) and a visible 'New helper!' banner; null = default slide from the top. Pure. */
export const toastTop = (queueBottom: number, bannerBottom: number, docked: boolean): number | null => {
  const edge = Math.max(docked ? 0 : queueBottom, bannerBottom);
  return edge > 0 ? Math.round(edge + 8) : null;
};
