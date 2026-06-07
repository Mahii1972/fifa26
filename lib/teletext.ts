export const GROUP_HEADER_COLORS = [
  "bg-teletext-yellow text-background",
  "bg-teletext-cyan text-background",
  "bg-teletext-green text-background",
  "bg-teletext-magenta text-background",
  "bg-teletext-red text-teletext-yellow",
] as const;

export const FILTER_ACTIVE =
  "pixel-press pixel-shadow-sm font-display border-2 border-teletext-yellow bg-teletext-yellow px-2.5 py-1.5 text-[8px] tracking-wider text-background";

export const FILTER_INACTIVE =
  "pixel-press font-display border-2 border-teletext-cyan/40 px-2.5 py-1.5 text-[8px] tracking-wider text-teletext-cyan hover:border-teletext-yellow hover:text-teletext-yellow";

export function groupHeaderColor(index: number): string {
  return GROUP_HEADER_COLORS[index % GROUP_HEADER_COLORS.length];
}