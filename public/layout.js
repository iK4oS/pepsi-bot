export function centeredColumnCount(postCount, viewportWidth) {
  const viewportCap = viewportWidth <= 520 ? 1
    : viewportWidth <= 760 ? 2
      : viewportWidth <= 1100 ? 3
        : viewportWidth <= 1500 ? 4
          : 5;
  const contentColumns = Math.max(1, Math.ceil(Math.sqrt(postCount * 1.5)));
  return Math.min(viewportCap, contentColumns, Math.max(1, postCount));
}
