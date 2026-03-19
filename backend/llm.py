from langchain_ollama import OllamaLLM
from langchain_ollama import OllamaEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import RetrievalQA, LLMChain
from langchain_classic.memory import ConversationBufferWindowMemory
from langchain_chroma import Chroma
from langchain_classic.output_parsers import OutputFixingParser
from langchain_core.output_parsers import JsonOutputParser
from typing import List, AsyncGenerator
import os
import json
import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL       = os.getenv("LLM_MODEL", "llama3.1:8b")
CHROMA_PATH     = os.getenv("CHROMA_PATH", "./chroma_store")

# ── Singleton LLM (reused across all calls) ──────────────────────
_llm = None
def get_llm():
    global _llm
    if _llm is None:
        _llm = OllamaLLM(
            model=LLM_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=0.2,
            num_predict=1024,
        )
    return _llm

# ── Embeddings (reused across all calls) ─────────────────────────
_embeddings = None
def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = OllamaEmbeddings(
            model="nomic-embed-text",
            base_url=OLLAMA_BASE_URL,
        )
    return _embeddings

# ── Vector store ──────────────────────────────────────────────────
def get_vectorstore():
    return Chroma(
        collection_name="articles",
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_PATH,
    )

# ── Conversation memories (keyed by conversation_id) ─────────────
_memories: dict[str, ConversationBufferWindowMemory] = {}

def get_memory(conversation_id: str) -> ConversationBufferWindowMemory:
    if conversation_id not in _memories:
        _memories[conversation_id] = ConversationBufferWindowMemory(
            k=6,
            memory_key="chat_history",
            return_messages=True,
        )
    return _memories[conversation_id]

def clear_memory(conversation_id: str):
    if conversation_id in _memories:
        del _memories[conversation_id]

# ── Simple LLM call (summary, topics, why-it-matters) ────────────
async def ask_llm(prompt: str) -> str:
    llm = get_llm()
    return await llm.ainvoke(prompt)

# ── Streaming LLM call (for chat) ────────────────────────────────
async def ask_llm_stream(prompt: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": True,
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.strip():
                    chunk = json.loads(line)
                    if chunk.get("response"):
                        yield chunk["response"]
                    if chunk.get("done"):
                        break

# ── RAG chain for navigator briefing ─────────────────────────────
BRIEFING_TEMPLATE = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are an expert Indian business journalist writing for ET (Economic Times).
Using ONLY the articles provided in the context below, write a comprehensive briefing.

Structure your response with these exact sections:

## Background
(2-3 sentences of context on this topic)

## What happened
(3-5 bullet points of key developments, each ending with [Source: publication name])

## Why it matters
(2-3 sentences on the significance for Indian businesses and markets)

## Key players
(List the main people, companies, or institutions involved)

## What to watch next
(2-3 specific forward-looking points)

Context:
{context}

Topic: {question}

If the context does not contain enough information say:
"Insufficient recent news found on this topic. Try a different search term."

Write the briefing now:"""
)

def get_briefing_chain():
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 8, "fetch_k": 20, "lambda_mult": 0.7},
    )
    return RetrievalQA.from_chain_type(
        llm=get_llm(),
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": BRIEFING_TEMPLATE},
        return_source_documents=True,
    )

# ── Follow-up chat chain (with memory) ───────────────────────────
CHAT_TEMPLATE = PromptTemplate(
    input_variables=["chat_history", "context", "question"],
    template="""You are an expert Indian business journalist assistant.
Answer the user's question using the provided news context.
If the context does not answer the question, use your general knowledge
but clearly label it as: [General knowledge — not from today's news]

Always cite news sources as [Source: publication] when using article content.
Be concise and direct.

Previous conversation:
{chat_history}

News context:
{context}

User question: {question}

Your answer:"""
)

async def ask_with_memory(
    question: str,
    conversation_id: str,
    extra_context: str = "",
) -> str:
    llm = get_llm()
    memory = get_memory(conversation_id)
    chain = LLMChain(llm=llm, prompt=CHAT_TEMPLATE, memory=memory)
    result = await chain.ainvoke({
        "question": question,
        "context": extra_context,
    })
    return result["text"]

# ── Story arc structured output ───────────────────────────────────
STORY_TEMPLATE = PromptTemplate(
    input_variables=["context", "story_query"],
    template="""You are analyzing a collection of Indian business news articles
about: {story_query}

Articles span multiple dates. Use ALL articles regardless of how old they are.
Return a JSON object with EXACTLY this structure. Return ONLY the JSON.
No markdown, no backticks, no explanation before or after.

{{
  "timeline": [
    {{
      "date": "YYYY-MM-DD",
      "headline": "max 8 words",
      "description": "one sentence",
      "sentiment": "positive or negative or neutral",
      "source": "publication name"
    }}
  ],
  "players": [
    {{
      "name": "entity name",
      "type": "person or company or institution or government",
      "role": "one sentence",
      "connections": ["name of connected player"]
    }}
  ],
  "sentiment_over_time": [
    {{
      "date": "YYYY-MM-DD",
      "score": 0.5,
      "label": "positive or negative or neutral"
    }}
  ],
  "contrarian_view": "2-3 sentences challenging mainstream narrative",
  "summary": "one paragraph summary of the full story arc",
  "what_to_watch": ["point 1", "point 2", "point 3"]
}}

Articles:
{context}

JSON:"""
)

async def get_story_arc(story_query: str, articles: list) -> dict:
    llm = get_llm()
    parser = JsonOutputParser()
    fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=llm)

    context = "\n\n".join([
        f"[{a.get('source','')} | {a.get('published_at','')}]\n"
        f"Title: {a.get('title','')}\n"
        f"Content: {(a.get('content') or a.get('summary',''))[:600]}"
        for a in articles
    ])

    chain = STORY_TEMPLATE | llm
    raw = await chain.ainvoke({
        "context": context,
        "story_query": story_query,
    })

    try:
        return parser.parse(raw)
    except Exception:
        try:
            return fixing_parser.parse(raw)
        except Exception:
            return {
                "timeline": [],
                "players": [],
                "sentiment_over_time": [],
                "contrarian_view": "Could not parse story arc. Try a more specific search.",
                "summary": raw[:500],
                "what_to_watch": [],
            }

# ── General knowledge fallback ────────────────────────────────────
GENERAL_TEMPLATE = PromptTemplate(
    input_variables=["question", "news_context"],
    template="""You are a knowledgeable Indian business and general knowledge assistant.

First check if the news context below answers the question.
If yes, answer from the context and cite the source.
If no, answer from your general training knowledge and label it clearly as:
[General knowledge]

Be direct, factual, and concise.

News context (may be empty or irrelevant):
{news_context}

Question: {question}

Answer:"""
)

async def ask_with_fallback(question: str, news_context: str = "") -> str:
    llm = get_llm()
    chain = LLMChain(llm=llm, prompt=GENERAL_TEMPLATE)
    result = await chain.ainvoke({
        "question": question,
        "news_context": news_context,
    })
    return result["text"]

# ── Legacy compatibility ──────────────────────────────────────────
def build_rag_prompt(question: str, articles: list) -> str:
    context = ""
    for i, a in enumerate(articles, 1):
        context += (
            f"\n--- Article {i} ---\n"
            f"Source: {a.get('source', 'Unknown')}\n"
            f"Title: {a.get('title', '')}\n"
            f"Content: {a.get('content') or a.get('summary', '')}\n"
        )
    return (
        f"You are an expert business journalist. "
        f"Answer the following question using ONLY the articles provided below. "
        f"Cite sources as [Source: publication name] when making specific claims. "
        f"If the articles do not contain enough information, say so clearly. "
        f"Do not use any outside knowledge.\n\n"
        f"Question: {question}\n\n"
        f"Articles:{context}"
    )
