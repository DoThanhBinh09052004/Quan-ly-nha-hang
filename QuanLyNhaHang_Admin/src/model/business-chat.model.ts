export interface BusinessChatAction {
  title: string;
  why: string;
  how: string[];
}

export interface BusinessChatResponse {
  summary: string;
  answerText: string;
  kpis: Record<string, unknown>;
  insights: string[];
  actions: BusinessChatAction[];
  risks: string[];
  followUpQuestions: string[];
}

export interface BusinessChatRequest {
  message: string;
  daysHour?: number;
  daysDow?: number;
  daysBest?: number;
  daysTurnover?: number;
  daysParty?: number;
  daysForecast?: number;
  topBest?: number;
}
