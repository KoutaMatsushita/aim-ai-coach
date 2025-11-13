/**
 * LangGraph型定義
 * コーチングシステムの各フェーズと状態管理用の型
 */

import type { BaseMessage } from "@langchain/core/messages";

// ========================================
// Task 1.1: ユーザーコンテキストとタスク種別の型定義
// ========================================

/**
 * ユーザーコンテキスト
 * ユーザーの活動状況とデータ状態に基づいて自動検出される
 */
export type UserContext =
	| "new_user" // 新規ユーザー（スコアデータなし）
	| "returning_user" // 復帰ユーザー（7日以上非アクティブ）
	| "active_user" // アクティブユーザー
	| "playlist_recommended" // プレイリスト推奨（スコアあり、プレイリストなし）
	| "analysis_recommended"; // スコア分析推奨（直近24時間に6件以上の新規スコア）

/**
 * タスク種別
 * Task Graph で実行される明示的なタスクの種類
 */
export type TaskType =
	| "daily_report" // デイリーレポート生成
	| "score_analysis" // スコア分析実行
	| "playlist_building" // プレイリスト構築
	| "progress_review"; // 進捗レビュー実行

// ========================================
// Task 1.2: Chat Graph の状態モデル定義
// ========================================

import { Annotation } from "@langchain/langgraph";

/**
 * Chat Graph の状態定義
 * 会話型コーチングで使用される状態モデル
 */
export const ChatGraphStateAnnotation = Annotation.Root({
	/**
	 * ユーザーID
	 */
	userId: Annotation<string>(),

	/**
	 * スレッドID（会話履歴の識別子）
	 * 指定されない場合は userId を使用
	 */
	threadId: Annotation<string>(),

	/**
	 * メッセージ履歴
	 * reducer: 時系列順で蓄積
	 */
	messages: Annotation<Array<{ role: string; content: string }>>({
		reducer: (current, update) => [...current, ...update],
		default: () => [],
	}),

	/**
	 * ユーザーコンテキスト
	 * reducer: 最新値で上書き
	 */
	userContext: Annotation<UserContext>({
		reducer: (_, update) => update,
		default: () => "active_user" as UserContext,
	}),
});

/**
 * Chat Graph State の型
 */
export type ChatGraphState = typeof ChatGraphStateAnnotation.State;

// ========================================
// Task 1.3: Task Graph の状態モデル定義
// ========================================

/**
 * Task Result の型定義
 * 各専門エージェントが返す結果の Union 型
 */
export type TaskResult =
	| { type: "playlist"; data: Playlist; content?: string }
	| { type: "analysis"; data: ScoreAnalysis; content?: string }
	| { type: "report"; data: DailyReport; content?: string }
	| { type: "review"; data: ProgressReport; content?: string };

/**
 * Task Graph の状態定義
 * タスク実行で使用される状態モデル
 */
export const TaskGraphStateAnnotation = Annotation.Root({
	/**
	 * ユーザーID
	 */
	userId: Annotation<string>(),

	/**
	 * タスク種別
	 */
	taskType: Annotation<TaskType>(),

	/**
	 * ユーザーコンテキスト
	 * reducer: 最新値で上書き
	 */
	userContext: Annotation<UserContext>({
		reducer: (_, update) => update,
		default: () => "active_user" as UserContext,
	}),

	/**
	 * タスク実行結果
	 * reducer: 最新値で上書き
	 */
	taskResult: Annotation<TaskResult | null>({
		reducer: (_, update) => update,
		default: () => null,
	}),
});

/**
 * Task Graph State の型
 */
export type TaskGraphState = typeof TaskGraphStateAnnotation.State;

// ========================================
// Task 1.4: ドメインエンティティの型定義
// ========================================

/**
 * デイリーレポート型（新規定義）
 */
export interface DailyReport {
	id: string;
	userId: string;
	date: Date;
	sessionsCount: number;
	totalDuration: number;
	performanceRating: "good" | "normal" | "needs_improvement";
	achievements: string[];
	challenges: string[];
	tomorrowRecommendations: {
		focusSkills: string[];
		recommendedScenarios: string[];
		recommendedDuration: number;
	};
	createdAt: Date;
}

/**
 * スコア分析結果型（新規定義）
 */
export interface ScoreAnalysis {
	userId: string;
	period: { start: Date; end: Date };
	trend: "improving" | "stable" | "declining";
	strengths: string[];
	challenges: string[];
	milestones: string[];
	chartData: {
		labels: string[];
		datasets: Array<{
			label: string;
			data: number[];
		}>;
	};
	createdAt: Date;
}

/**
 * 目標進捗型
 */
export interface GoalProgress {
	goalId: string;
	goalTitle: string;
	initialValue: number;
	currentValue: number;
	targetValue: number;
	progressPercent: number;
	status: "on_track" | "behind" | "ahead" | "completed";
}

/**
 * 進捗レビュー型（新規定義）
 */
export interface ProgressReport {
	userId: string;
	reviewPeriod: {
		start: Date;
		end: Date;
		days: number;
	};
	beforePausePerformance: {
		avgScore: number;
		strongSkills: string[];
		activityFrequency: number;
	};
	goalProgress?: GoalProgress[];
	rehabilitationPlan: string[];
	motivationalMessage: string;
	generatedAt: Date;
}

/**
 * コーチングステータス型（新規定義）
 */
export interface CoachingStatus {
	userContext: UserContext;
	todayFocus: {
		focusSkills: string[];
		recommendedDuration: number;
		recommendedScenarios: string[];
	} | null;
	scoreTrendSummary: {
		trend: "improving" | "stable" | "declining";
		improvedSkills: string[];
		challengeSkills: string[];
	} | null;
	activePlaylist: {
		id: string;
		title: string;
		scenariosCount: number;
	} | null;
	latestReport: {
		date: Date;
		generatedAt: Date;
	} | null;
}

// ========================================
// Coaching Phases
// ========================================

/**
 * コーチングフェーズの定義
 * ユーザーの状態に応じて適切なフェーズに遷移する
 */
export type CoachingPhase =
	| "initial_assessment" // 初回: プロファイル構築
	| "playlist_building" // プレイリスト作成フェーズ
	| "active_training" // 通常練習サポート
	| "score_analysis" // スコア詳細分析
	| "progress_review" // 経過観察・振り返り
	| "daily_report" // デイリーレポート生成
	| "adjustment_planning"; // 計画調整

/**
 * フェーズ遷移の履歴記録
 */
export interface PhaseTransition {
	from: CoachingPhase;
	to: CoachingPhase;
	timestamp: Date;
	reason: string;
}

// ========================================
// User Profile & Goals
// ========================================

export interface UserProfile {
	id: string;
	name: string;
	skillLevel: "beginner" | "intermediate" | "advanced" | "expert";
	mainGames: string[];
	practiceFrequency: number; // sessions per week
	preferredCommunicationStyle:
		| "strict"
		| "encouraging"
		| "data-driven"
		| "balanced";
	createdAt: Date;
	updatedAt: Date;
}

export interface Goal {
	id: string;
	userId: string;
	title: string;
	description: string;
	targetValue?: number;
	currentValue?: number;
	deadline?: Date;
	status: "active" | "completed" | "abandoned";
	createdAt: Date;
}

// ========================================
// Playlist System
// ========================================

export interface PlaylistScenario {
	scenarioName: string;
	platform: "kovaaks" | "aimlab";
	purpose: string; // 目的（例: "tracking精度向上"）
	expectedEffect: string; // 期待効果
	duration: number; // 推奨時間（分）
	order: number; // プレイリスト内の順序
	difficultyLevel: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface Playlist {
	id: string;
	userId: string;
	title: string;
	description: string;
	scenarios: PlaylistScenario[];
	targetWeaknesses: string[];
	totalDuration: number; // 合計時間（分）
	reasoning: string; // AIの推論過程
	createdAt: Date;
	isActive: boolean;
}

// ========================================
// Analysis Results
// ========================================

export interface PerformanceStatistics {
	avgAccuracy: number;
	medianAccuracy: number;
	avgOvershots: number;
	avgEfficiency: number;
	consistencyIndex: number; // 0-1
	totalSessions: number;
}

export interface PerformanceTrend {
	metric: string; // "accuracy" | "overshots" | "efficiency"
	direction: "improving" | "stable" | "declining";
	changePercent: number;
	confidence: number; // 0-1
}

export interface PerformancePattern {
	type: string; // "overshoot_tendency" | "accuracy_variance" | etc.
	description: string;
	severity: "low" | "medium" | "high";
	recommendation: string;
}

export interface AnalysisResult {
	userId: string;
	period: {
		start: Date;
		end: Date;
	};
	statistics: PerformanceStatistics;
	trends: PerformanceTrend[];
	patterns: PerformancePattern[];
	insights: string; // LLM生成のインサイト
	recommendations: string[];
	analyzedAt: Date;
}

// ========================================
// Additional Domain Types (Legacy)
// ========================================

/**
 * プレイリスト遵守率
 */
export interface PlaylistAdherence {
	plannedSessions: number;
	completedSessions: number;
	adherenceRate: number; // 0-1
	missedScenarios: string[];
	extraScenarios: string[];
}

/**
 * デイリー活動
 */
export interface DailyActivity {
	date: Date;
	platform: "kovaaks" | "aimlab";
	scenarioName: string;
	score?: number;
	accuracy?: number;
	duration: number; // minutes
}

/**
 * デイリー達成事項
 */
export interface DailyAchievement {
	type: "personal_best" | "consistency" | "milestone" | "streak";
	title: string;
	description: string;
}

// ========================================
// Coaching Context
// ========================================

/**
 * コーチングセッション全体のコンテキスト
 * 各エージェント間で共有される情報
 */
export interface CoachingContext {
	// User info
	userId: string;
	userProfile: UserProfile | null;

	// Current state
	currentPhase: CoachingPhase;
	phaseHistory: PhaseTransition[];

	// Activity tracking
	lastActivityDate: Date | null;
	lastScoreDate: Date | null;
	newScoresCount: number;
	sessionCount: number;
	daysInactive: number;

	// Coaching data
	currentPlaylist: Playlist | null;
	userGoals: Goal[];
	weaknessAreas: string[];

	// Recent outputs
	lastAnalysis: AnalysisResult | null;
	lastProgressReport: ProgressReport | null;
	lastDailyReport: DailyReport | null;

	// Flags
	needsPlaylist: boolean;
	hasRecentScores: boolean;
	isNewUser: boolean;
}

// ========================================
// Graph State
// ========================================

/**
 * メインのグラフステート
 * すべてのノードで共有される状態
 */
export interface GraphState {
	// Core identity
	userId: string;
	threadId: string;

	// Conversation
	messages: BaseMessage[];

	// Phase management
	currentPhase: CoachingPhase;
	phaseHistory: PhaseTransition[];

	// Coaching context
	context: CoachingContext;

	// Agent outputs (各専門エージェントの出力を保存)
	agentOutputs: {
		playlist?: Playlist;
		analysis?: AnalysisResult;
		progressReport?: ProgressReport;
		dailyReport?: DailyReport;
		reasoning?: string;
	};

	// Metadata
	sessionStartTime: Date;
	lastUpdateTime: Date;
}

// ========================================
// Agent-Specific States
// ========================================

/**
 * Playlist Builder用の状態
 */
export interface PlaylistBuilderState {
	userId: string;
	userSkillLevel: string;
	targetGame?: string;
	weaknesses: string[];
	candidateScenarios: Array<Record<string, unknown>>; // RAG検索結果
	playlist: Playlist | null;
	reasoning: string;
	isValid: boolean;
	validationErrors: string[];
}

/**
 * Score Analysis用の状態
 */
export interface ScoreAnalysisState {
	userId: string;
	scores: any[]; // Kovaaks/Aimlab scores
	userBaseline: any;
	statistics: PerformanceStatistics | null;
	trends: PerformanceTrend[];
	patterns: PerformancePattern[];
	insights: string;
}

/**
 * Progress Review用の状態
 */
export interface ProgressReviewState {
	userId: string;
	reviewPeriod: number; // days
	periodData: any;
	userGoals: Goal[];
	currentPlaylist: Playlist | null;
	goalProgress: GoalProgress[];
	adherence: PlaylistAdherence | null;
	report: string;
}

/**
 * Daily Report用の状態
 */
export interface DailyReportState {
	userId: string;
	date: Date;
	activities: DailyActivity[];
	userGoals: Goal[];
	summary: string;
	achievements: DailyAchievement[];
	suggestions: string[];
	formattedReport: string;
}
