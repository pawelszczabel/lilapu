import { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line,
} from "recharts";
import { CHART_COLORS, CHART_STYLES } from "../chart-theme";

// ── Types ────────────────────────────────────────────────────────────

interface VisualizationConfig {
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
    colors?: string[];
}

interface VisualizationPayload {
    type: "bar" | "pie" | "line" | "timeline";
    title: string;
    data: Array<Record<string, string | number>>;
    config: VisualizationConfig;
}

interface ChartRendererProps {
    /** Raw JSON string from decrypted visualization field */
    visualizationJson: string;
}

// ── Tooltip styles ───────────────────────────────────────────────────

const tooltipStyle: React.CSSProperties = {
    backgroundColor: CHART_STYLES.tooltipBg,
    border: `1px solid ${CHART_STYLES.tooltipBorder}`,
    borderRadius: "8px",
    padding: "8px 12px",
    color: CHART_STYLES.tooltipColor,
    fontSize: CHART_STYLES.fontSize,
    fontFamily: CHART_STYLES.fontFamily,
};

// ── Component ────────────────────────────────────────────────────────

export default function ChartRenderer({ visualizationJson }: ChartRendererProps) {
    const payload = useMemo((): VisualizationPayload | null => {
        try {
            const parsed = JSON.parse(visualizationJson);
            if (!parsed.type || !Array.isArray(parsed.data) || parsed.data.length === 0) {
                return null;
            }
            return parsed as VisualizationPayload;
        } catch {
            return null;
        }
    }, [visualizationJson]);

    if (!payload) {
        return null;
    }

    const colors = payload.config?.colors?.length ? payload.config.colors : CHART_COLORS;

    return (
        <div style={{
            marginTop: "0.75rem",
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(124, 92, 252, 0.06)",
            border: "1px solid rgba(124, 92, 252, 0.15)",
        }}>
            <div style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
            }}>
                📊 {payload.title}
            </div>

            <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart(payload, colors)}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ── Chart renderers ──────────────────────────────────────────────────

function renderChart(payload: VisualizationPayload, colors: string[]): React.ReactElement {
    const { type, data, config } = payload;
    const xKey = config?.xKey || "name";
    const yKey = config?.yKey || "value";

    switch (type) {
        case "bar":
            return (
                <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLES.gridColor} />
                    <XAxis
                        dataKey={xKey}
                        tick={{ fill: CHART_STYLES.axisColor, fontSize: CHART_STYLES.fontSize }}
                        axisLine={{ stroke: CHART_STYLES.gridColor }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: CHART_STYLES.axisColor, fontSize: CHART_STYLES.fontSize }}
                        axisLine={{ stroke: CHART_STYLES.gridColor }}
                        tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(124,92,252,0.08)" }} />
                    <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            );

        case "pie": {
            const nameKey = config?.nameKey || config?.xKey || "name";
            const valueKey = config?.valueKey || config?.yKey || "value";
            return (
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={50}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={{ stroke: CHART_STYLES.axisColor }}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                        wrapperStyle={{
                            fontSize: CHART_STYLES.fontSize,
                            color: CHART_STYLES.axisColor,
                        }}
                    />
                </PieChart>
            );
        }

        case "line":
        case "timeline":
            return (
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLES.gridColor} />
                    <XAxis
                        dataKey={xKey}
                        tick={{ fill: CHART_STYLES.axisColor, fontSize: CHART_STYLES.fontSize }}
                        axisLine={{ stroke: CHART_STYLES.gridColor }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: CHART_STYLES.axisColor, fontSize: CHART_STYLES.fontSize }}
                        axisLine={{ stroke: CHART_STYLES.gridColor }}
                        tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={colors[0]}
                        strokeWidth={2}
                        dot={{ fill: colors[0], r: 4 }}
                        activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2, fill: "#0f0f14" }}
                    />
                </LineChart>
            );

        default:
            return <></>;
    }
}
