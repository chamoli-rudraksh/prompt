// All TypeScript interfaces for the ET NewsAI application

export interface User {
  id: string;
  name: string;
  persona: 'investor' | 'founder' | 'student' | 'professional';
  interests: string[];
  created_at?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at?: string;
  topics: string[];
  why_it_matters?: string;
}

export interface FeedResponse {
  articles: Article[];
  user_name: string;
  persona: string;
}

export interface SourceInfo {
  title: string;
  url: string;
  source: string;
}

export interface BriefingResponse {
  conversation_id: string;
  briefing_text: string;
  sources: SourceInfo[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  sources_used: SourceInfo[];
}

export interface TimelineEvent {
  date: string;
  headline: string;
  description: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  source: string;
}

export interface Player {
  name: string;
  type: 'person' | 'company' | 'institution' | 'government';
  role: string;
  connections: string[];
}

export interface SentimentPoint {
  date: string;
  score: number;
  label: 'positive' | 'negative' | 'neutral';
}

export interface StoryArcResponse {
  timeline: TimelineEvent[];
  players: Player[];
  sentiment_over_time: SentimentPoint[];
  contrarian_view: string;
  summary: string;
  what_to_watch: string[];
  articles: Article[];
}

export interface CreateUserRequest {
  name: string;
  persona: string;
  interests: string[];
}

export interface SaveArticleRequest {
  user_id: string;
  article_id: string;
}
