import type { Bug } from './supabase';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'llama3.2:latest';

export type AIDebugAnalysis = {
  summary: string;
  likely_root_cause: string;
  investigation_steps: string[];
  suspected_file: string;
  suspected_function: string;
  suggested_fix: string;
  regression_test: string;
  confidence: number;
};

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

export async function analyzeBugWithOllama(
  bug: Bug,
  existingPrediction?: {
    predicted_category?: string;
    probable_root_cause?: string;
    confidence_score?: number;
  } | null
): Promise<AIDebugAnalysis> {
  const prompt = `
You are an AI software debugging assistant inside a bug management system.

Analyze the following software bug and help a developer investigate it.

BUG INFORMATION

Title:
${bug.title}

Description:
${bug.description}

Category:
${bug.category}

Severity:
${bug.severity}

Priority:
${bug.priority}

Expected Behavior:
${bug.expected_behavior ?? 'Not provided'}

Actual Behavior:
${bug.actual_behavior ?? 'Not provided'}

Reproduction Steps:
${bug.reproduction_steps ?? 'Not provided'}

Environment:
${bug.environment_details ?? 'Not provided'}

Stack Trace:
${bug.stack_trace ?? 'Not provided'}

EXISTING AI TRIAGE

Predicted Category:
${existingPrediction?.predicted_category ?? 'Not available'}

Probable Root Cause:
${existingPrediction?.probable_root_cause ?? 'Not available'}

Confidence:
${existingPrediction?.confidence_score ?? 'Not available'}

IMPORTANT INSTRUCTIONS

1. Analyze the information carefully.
2. Do not claim that you know the exact source code because source code has not been provided.
3. Clearly distinguish likely causes from confirmed facts.
4. Give practical investigation steps that a developer can actually follow.
5. Suggest a likely file and function only when the bug information gives enough clues. Otherwise say "Not enough information".
6. Give a practical possible fix, but do not pretend it is confirmed.
7. Suggest a regression test that specifically targets this bug.
8. Keep the response concise and useful to a developer.
9. Return ONLY valid JSON matching the requested structure.

Return this exact JSON structure:

{
  "summary": "Short explanation of the bug",
  "likely_root_cause": "Most likely cause, clearly marked as a hypothesis",
  "investigation_steps": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "suspected_file": "Likely file or Not enough information",
  "suspected_function": "Likely function or Not enough information",
  "suggested_fix": "Possible fix",
  "regression_test": "Specific regression test",
  "confidence": 0
}

The confidence must be a number between 0 and 100.
`;

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
            'You are a careful software debugging assistant. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
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
    throw new Error('Ollama returned an empty response.');
  }

  try {
    return JSON.parse(content) as AIDebugAnalysis;
  } catch {
    throw new Error('Ollama returned an invalid JSON response.');
  }
}
export async function askOllama(
  question: string,
  bugContext?: string
): Promise<string> {
  const prompt = `
You are an AI software engineering assistant helping a developer debug and resolve software bugs.

Give practical, technically accurate answers.

The developer may ask about:
- debugging
- programming
- errors
- stack traces
- databases
- SQL
- APIs
- frontend issues
- backend issues
- testing
- regression testing
- root cause analysis
- code fixes
- software engineering concepts

${bugContext ? `
The developer is currently working with this bug:

${bugContext}
` : ''}

Developer's question:
${question}

Answer the developer directly.
Be concise but useful.
If you are uncertain, clearly say so.
Do not pretend you have access to source code that was not provided.
`;

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
            'You are a helpful software debugging assistant.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      options: {
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  const content = data.message?.content;

  if (!content) {
    throw new Error('Ollama returned an empty response.');
  }

  return content;
}