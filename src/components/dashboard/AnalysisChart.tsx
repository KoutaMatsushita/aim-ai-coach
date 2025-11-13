import { AreaChart } from "@tremor/react";
import type { ScoreAnalysis } from "../../../api/langgraph/types";
import { chartDataToTremorFormat } from "@/lib/chartDataUtils";

interface AnalysisChartProps {
	chartData: ScoreAnalysis["chartData"];
}

export function AnalysisChart({ chartData }: AnalysisChartProps) {
	const data = chartDataToTremorFormat(chartData);
	const categories = chartData.datasets.map((dataset) => dataset.label);

	if (data.length === 0) {
		return null;
	}

	return (
		<AreaChart
			data={data}
			index="date"
			categories={categories}
			colors={["blue", "green", "orange"]}
			valueFormatter={(value) =>
				`${typeof value === "number" ? value.toFixed(1) : value}`
			}
			yAxisWidth={48}
			showLegend={true}
			showGridLines={true}
			showXAxis={true}
			showYAxis={true}
			className="h-80"
		/>
	);
}
