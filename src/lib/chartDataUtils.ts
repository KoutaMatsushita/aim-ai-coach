import type { ScoreAnalysis } from "../../api/langgraph/types";

/**
 * ScoreAnalysis の chartData を Tremor 形式に変換
 * @param chartData ScoreAnalysis の chartData プロパティ
 * @returns Tremor AreaChart/LineChart で使用できる形式のデータ
 */
export function chartDataToTremorFormat(
	chartData: ScoreAnalysis["chartData"],
): Array<Record<string, string | number>> {
	if (!chartData.labels.length || !chartData.datasets.length) {
		return [];
	}

	return chartData.labels.map((label, index) => {
		const dataPoint: Record<string, string | number> = { date: label };

		for (const dataset of chartData.datasets) {
			dataPoint[dataset.label] = dataset.data[index] ?? 0;
		}

		return dataPoint;
	});
}
