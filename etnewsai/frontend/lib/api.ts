// Centralized API client — all backend API calls go through here
import axios from 'axios';
import {
  User,
  FeedResponse,
  BriefingResponse,
  ChatResponse,
  StoryArcResponse,
  CreateUserRequest,
  SaveArticleRequest,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes for LLM responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Users ──────────────────────────────────────────────────────────────────

export async function createUser(data: CreateUserRequest): Promise<User> {
  const res = await api.post('/users', data);
  return res.data;
}

export async function getUser(userId: string): Promise<User> {
  const res = await api.get(`/users/${userId}`);
  return res.data;
}

// ─── Feed ───────────────────────────────────────────────────────────────────

export async function getFeed(userId: string, limit: number = 20): Promise<FeedResponse> {
  const res = await api.get('/feed', { params: { user_id: userId, limit } });
  return res.data;
}

export async function saveArticle(data: SaveArticleRequest): Promise<void> {
  await api.post('/saved-articles', data);
}

// ─── Navigator ──────────────────────────────────────────────────────────────

export async function createBriefing(topic: string, userId: string): Promise<BriefingResponse> {
  const res = await api.post('/briefing', { topic, user_id: userId });
  return res.data;
}

export async function sendChatMessage(
  conversationId: string,
  message: string,
  stream: boolean = true
): Promise<ChatResponse | ReadableStream> {
  if (stream) {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        stream: true,
      }),
    });
    return response.body as ReadableStream;
  } else {
    const res = await api.post('/chat', {
      conversation_id: conversationId,
      message,
      stream: false,
    });
    return res.data;
  }
}

// ─── Story Arc ──────────────────────────────────────────────────────────────

export async function getStoryArc(storyQuery: string, userId: string): Promise<StoryArcResponse> {
  const res = await api.post('/story-arc', { story_query: storyQuery, user_id: userId });
  return res.data;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

export async function getDemoFeed(): Promise<FeedResponse> {
  const res = await api.get('/demo/feed');
  return res.data;
}

export async function getDemoBriefing(): Promise<BriefingResponse> {
  const res = await api.get('/demo/briefing');
  return res.data;
}

export async function getDemoStoryArc(): Promise<StoryArcResponse> {
  const res = await api.get('/demo/story-arc');
  return res.data;
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await api.get('/health');
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}
