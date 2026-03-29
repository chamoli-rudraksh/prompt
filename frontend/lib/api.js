// Centralized API client — all backend API calls go through here
import axios from 'axios';
import { apiFetch, getAccessToken } from '@/lib/auth';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 minutes for LLM responses (Ollama on CPU is slow)
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ─── Users ──────────────────────────────────────────────────────────────────

export async function createUser(data) {
  const res = await api.post('/users', data);
  return res.data;
}

export async function getUser(userId) {
  const res = await api.get(`/users/${userId}`);
  return res.data;
}

// ─── Feed ───────────────────────────────────────────────────────────────────

export async function getFeed(userId, limit = 20) {
  const res = await api.get('/feed', {
    params: { user_id: userId, limit },
  });
  return res.data;
}

export async function saveArticleLegacy(data) {
  await api.post('/saved-articles', data);
}

export async function saveArticle(articleId) {
  const res = await api.post('/articles/save', { article_id: articleId });
  return res.data;
}

export async function unsaveArticle(articleId) {
  const res = await api.delete(`/articles/save/${articleId}`);
  return res.data;
}

export async function getSavedArticles() {
  const res = await api.get('/articles/saves');
  return res.data;
}

export async function getAgentLogs(limit = 100) {
  const res = await api.get('/admin/logs', { params: { limit } });
  return res.data;
}

// ─── Navigator ──────────────────────────────────────────────────────────────

export async function createBriefing(topic, userId) {
  const res = await api.post('/briefing', {
    topic,
    user_id: userId,
  });
  return res.data;
}

export async function sendChatMessage(conversationId, message, stream = true) {
  if (stream) {
    const response = await apiFetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        stream: true,
      }),
    });

    return response.body; // no "as ReadableStream"
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

export async function getStoryArc(storyQuery, userId) {
  const res = await api.post('/story-arc', {
    story_query: storyQuery,
    user_id: userId,
  });
  return res.data;
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function healthCheck() {
  try {
    const res = await api.get('/health');
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}