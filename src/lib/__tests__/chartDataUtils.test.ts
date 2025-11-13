import { describe, expect, it } from "vitest";
import { chartDataToTremorFormat } from "../chartDataUtils";

describe("chartDataToTremorFormat", () => {
	it("ScoreAnalysisのchartDataをTremor形式に変換する", () => {
		const chartData = {
			labels: ["Day 1", "Day 2", "Day 3"],
			datasets: [
				{
					label: "Score",
					data: [800, 850, 900],
				},
				{
					label: "Accuracy",
					data: [0.75, 0.8, 0.85],
				},
			],
		};

		const result = chartDataToTremorFormat(chartData);

		expect(result).toEqual([
			{ date: "Day 1", Score: 800, Accuracy: 0.75 },
			{ date: "Day 2", Score: 850, Accuracy: 0.8 },
			{ date: "Day 3", Score: 900, Accuracy: 0.85 },
		]);
	});

	it("空のchartDataを処理する", () => {
		const chartData = {
			labels: [],
			datasets: [],
		};

		const result = chartDataToTremorFormat(chartData);

		expect(result).toEqual([]);
	});

	it("1つのデータセットを変換する", () => {
		const chartData = {
			labels: ["Jan", "Feb"],
			datasets: [
				{
					label: "Performance",
					data: [100, 120],
				},
			],
		};

		const result = chartDataToTremorFormat(chartData);

		expect(result).toEqual([
			{ date: "Jan", Performance: 100 },
			{ date: "Feb", Performance: 120 },
		]);
	});
});
