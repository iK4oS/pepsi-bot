export function centeredColumnCount(postCount, viewportWidth) {
  const viewportCap = viewportWidth <= 520 ? 1
    : viewportWidth <= 760 ? 2
      : viewportWidth <= 1100 ? 3
        : viewportWidth <= 1500 ? 4
          : 5;
  const contentColumns = Math.max(1, Math.ceil(Math.sqrt(postCount * 1.5)));
  return Math.min(viewportCap, contentColumns, Math.max(1, postCount));
}

export function masonryLayout(itemHeights, columnCount, columnWidth, gap) {
  const columnHeights = Array(columnCount).fill(0);
  const items = itemHeights.map(height => {
    const shortest = Math.min(...columnHeights);
    const column = columnHeights.indexOf(shortest);
    const position = { column, x: column * (columnWidth + gap), y: shortest };
    columnHeights[column] += height + gap;
    return position;
  });
  return {
    items,
    height: Math.max(0, ...columnHeights) - (items.length ? gap : 0)
  };
}
