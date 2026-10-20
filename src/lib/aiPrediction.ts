import type { BugCategory } from './supabase';

export type PredictionInput = {
  title: string;
  description: string;
  category: BugCategory;
  severity: string;
  priority: string;
};

export type PredictionResult = {
  predicted_category: BugCategory;
  probable_root_cause: string;
  confidence_score: number;
  model_version: string;
};

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'llama3.2:latest';

const VALID_CATEGORIES: BugCategory[] = [
  'ui',
  'backend',
  'database',
  'network',
  'security',
  'performance',
  'api',
  'other',
];

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

export async function predict(
  input: PredictionInput
): Promise<PredictionResult> {
  const prompt = `
You are an AI software bug classification system.

Analyze the bug independently and determine its most likely technical category.

BUG TITLE:
${input.title}

BUG DESCRIPTION:
${input.description}

REPORTER'S SELECTED CATEGORY:
${input.category}

SEVERITY:
${input.severity}

PRIORITY:
${input.priority}

AVAILABLE CATEGORIES:
ui
backend
database
network
security
performance
api
other

IMPORTANT RULES:

1. Do NOT automatically use the reporter's selected category.
2. Analyze the title and description and choose the category that best matches the actual technical problem.
3. The confidence score must represent how strongly the evidence supports your predicted category.
4. Confidence must be a number between 0 and 100.
5. Do not claim the root cause is confirmed.
6. Give a short, technically relevant probable root cause.
7. Return ONLY valid JSON.

Return exactly:

{
  "predicted_category": "database",
  "probable_root_cause": "The likely cause is...",
  "confidence_score": 94
}
`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a careful software bug classification AI. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama request failed with status ${response.status}`
      );
    }

    const data = (await response.json()) as OllamaResponse;
    const content = data.message?.content;

    if (!content) {
      throw new Error('Ollama returned an empty prediction.');
    }

    const parsed = JSON.parse(content) as {
      predicted_category?: string;
      probable_root_cause?: string;
      confidence_score?: number;
    };

    const predictedCategory = VALID_CATEGORIES.includes(
      parsed.predicted_category as BugCategory
    )
      ? (parsed.predicted_category as BugCategory)
      : 'other';

    const rawConfidence = Number(parsed.confidence_score);

    const confidence = Number.isFinite(rawConfidence)
      ? Math.min(100, Math.max(0, rawConfidence))
      : 50;

    return {
      predicted_category: predictedCategory,
      probable_root_cause:
        parsed.probable_root_cause ||
        'The AI could not determine a specific probable root cause.',
      confidence_score: Math.round(confidence * 100) / 100,
      model_version: 'ollama-llama3.2',
    };
  } catch (error) {
    console.error('Ollama prediction failed:', error);

    /*
     * Safe fallback:
     * If Ollama is unavailable, bug reporting still works.
     * We clearly mark the prediction as unavailable rather
     * than pretending the fallback is an AI prediction.
     */
    return {
      predicted_category: input.category,
      probable_root_cause:
        'AI prediction was unavailable. Manual investigation is required.',
      confidence_score: 0,
      model_version: 'ollama-llama3.2-unavailable',
    };
  }
}