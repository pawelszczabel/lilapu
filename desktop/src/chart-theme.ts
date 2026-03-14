/**
 * Chart color palette and styles for Lilapu dark-mode UI.
 * Used by ChartRenderer to maintain visual consistency.
 */

export const CHART_COLORS = [
    "#7c5cfc", // primary purple
    "#22d3ee", // cyan
    "#f472b6", // pink
    "#fbbf24", // amber
    "#34d399", // emerald
    "#fb923c", // orange
    "#a78bfa", // light purple
    "#38bdf8", // sky
];

export const CHART_STYLES = {
    fontSize: 12,
    fontFamily: "inherit",
    axisColor: "rgba(255,255,255,0.4)",
    gridColor: "rgba(255,255,255,0.06)",
    tooltipBg: "rgba(15,15,20,0.95)",
    tooltipBorder: "rgba(124,92,252,0.3)",
    tooltipColor: "#e2e8f0",
} as const;
