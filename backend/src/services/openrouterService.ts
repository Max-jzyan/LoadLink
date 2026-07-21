/**
 * Thin wrapper around the OpenRouter chat-completions API.
 *
 * If OPENROUTER_API_KEY is absent the helpers degrade gracefully:
 *   - isAvailable() returns false
 *   - chat() throws (callers should guard with isAvailable() first)
 *
 * Model selection: reads OPENROUTER_MODEL from env, then automatically falls
 * back through a list of free-tier models when the preferred one returns 429.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? ''
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/**
 * Primary model from env, plus a rotation of free-tier fallbacks tried in order
 * when the preferred model returns 429 (rate-limited upstream).
 */
const PRIMARY_MODEL = process.env.OPENROUTER_MODEL ?? 'tencent/hy3:free'

const FREE_FALLBACKS = [
  'tencent/hy3:free',
  'openai/gpt-oss-120b:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
  'google/gemma-2-9b-it:free',
]

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Returns true only when a key is present in the environment. */
export const isAvailable = (): boolean => OPENROUTER_API_KEY.length > 0

/** Single-model call — throws with a `.status` property set on 4xx/5xx. */
const callModel = async (
  model: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> => {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://loadlink.io',
      'X-Title': 'LoadLink',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    const err = Object.assign(new Error(`[openrouterService] HTTP ${res.status}: ${text}`), {
      status: res.status,
    })
    throw err
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    // Mark as retryable (status 0) so the fallback loop tries the next model
    throw Object.assign(new Error('[openrouterService] Empty response from model'), { status: 0 })
  }
  return content
}

/**
 * Call the OpenRouter chat-completions endpoint.
 *
 * Automatically retries with fallback free-tier models when the primary model
 * returns 429 (upstream rate-limit). Throws only if every candidate fails.
 */
export const chat = async (
  messages: ChatMessage[],
  model: string = PRIMARY_MODEL,
  maxTokens = 512
): Promise<string> => {
  if (!isAvailable()) {
    throw new Error('[openrouterService] OPENROUTER_API_KEY is not set')
  }

  // Build candidate list: preferred model first, then free fallbacks (deduped)
  const candidates = [model, ...FREE_FALLBACKS.filter((m) => m !== model)]

  let lastError: unknown
  for (const candidate of candidates) {
    try {
      return await callModel(candidate, messages, maxTokens)
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 429 || status === 0) {
        console.warn(
          `[openrouterService] ${candidate} failed (${status === 429 ? '429 rate-limited' : 'empty response'}), trying next model…`
        )
        lastError = err
        continue
      }
      // Non-429 errors are not retried
      throw err
    }
  }

  throw lastError ?? new Error('[openrouterService] All models exhausted')
}
