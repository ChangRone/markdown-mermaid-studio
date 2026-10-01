/** Measured visual rows let scrolling follow wrapped textarea lines rather than logical line counts. */
export function buildSourceLineTops(
  markdown: string,
  width: number,
  lineHeight: number,
  measure: (text: string) => number,
) {
  const tops = [0];
  for (const line of markdown.split("\n")) {
    const visualWidth = measure(line.replaceAll("\t", "    "));
    const rows = Math.max(1, Math.ceil(visualWidth / Math.max(1, width)));
    tops.push(tops[tops.length - 1] + rows * lineHeight);
  }
  return tops;
}

export function lineAtSourceY(tops: number[], y: number) {
  let low = 0;
  let high = tops.length - 2;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (tops[middle] <= y) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}
