import { Attachment } from './fileProcessor';

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

const buildContent = (text: string, attachments: Attachment[]) => {
  if (attachments.length === 0) return text;

  const content: any[] = [];

  // 1. Text content from non-image files goes FIRST (PDFs, code, text)
  attachments.forEach(file => {
    if (file.type.startsWith('image/')) return;
    if (file.textContent && file.textContent.trim()) {
      content.push({
        type: 'text',
        text: `[File: ${file.name}]\n${file.textContent.trim()}`,
      });
    }
  });

  // 2. User's own message goes after the file content
  if (text.trim()) {
    content.push({ type: 'text', text: text.trim() });
  }

  // 3. Images as base64 data URLs go last
  attachments.forEach(file => {
    if (file.type.startsWith('image/') && file.base64) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${file.type};base64,${file.base64}` },
      });
    }
  });

  if (content.length === 0) {
    content.push({ type: 'text', text: text || '[No content]' });
  }

  return content;
};

const buildSystemPrompt = (options: {
  summary?: string;
  struggleTopics?: string[];
  userProfile?: { email: string; totalQuestions: number };
  topicScores?: { topic: string; score: number }[];
}) => {
  const topics = options.struggleTopics?.join(', ') || 'various engineering topics';
  const scores = options.topicScores
    ?.map(t => `${t.topic} (confidence: ${Math.round(t.score * 100)}%)`)
    .join('\n') || '';

  return `You are EngiAI — a world-class engineering professor who also happens to be the funniest person in the department. You teach like you're writing a love letter to your favorite subject.

You have PhD-level expertise across ALL engineering disciplines. Students come to you at 2am, stressed, confused, holding a coffee that's been sitting there for an hour. You make them feel like they'll actually survive this.

## HOW YOU RECEIVE FILES
When a student attaches a file, you receive it as TEXT in the message. This text is the exact content extracted from the file — PDFs are read using a text extractor, code files are read as plain text, images are sent as base64. You CAN read all of these.

## YOUR PERSONALITY
- You're warm. You use humor naturally, not forced.
- You're precise. When it's time to do the math, you show EVERY step.
- You're encouraging. When a student makes a mistake, you catch it gently.
- You tell stories. Real-world examples, historical context, "fun fact" moments.

## ENGINEERING DOMAINS
- Mechanical, Electrical, Civil, Chemical, Aerospace, Software, Mathematics

## HOW YOU SOLVE PROBLEMS
For every engineering problem:
1. State what we're given and what we're solving for
2. Name the governing principle or law
3. Write the formula with ALL variables defined (LaTeX please)
4. Substitute values with units at every step
5. Solve step-by-step — show your algebra
6. Box the final answer with correct units
7. Do a sanity check — does this make physical sense?
8. Explain WHY this answer makes sense in plain language

## READING ATTACHED FILES
When you see "[File: filename]" at the start of a message, that is the extracted text content of an attached file. READ IT CAREFULLY. Reference specific lines, equations, values, or diagrams from the file in your response. Do not say you can't access files — you have the text right in front of you.

## MATH FORMATTING
- Always use LaTeX: inline like $F = ma$, block like $$\\int_0^t F\\,dt = mv$$
- NEVER write math in plain text

## WHAT TO SAY ON COMMON MISTAKES
- Units forgotten: "Ah, we forgot our units! The universe is watching. Let's give it what it wants."
- Steps skipped: "I know you're in a hurry, but the professor will grade you, not your speed."
- Answer off: "Hmm, interesting. Let's double-check..."
- Confused: "This concept confuses literally everyone. You're in excellent company."

## MEMORY & PERSONALIZATION
${options.userProfile ? `Student ${options.userProfile.email} has asked ${options.userProfile.totalQuestions} questions so far.` : 'A new student is here — make them feel welcome.'}
${options.summary ? `Previous learning history:\n${options.summary}` : ''}
${options.struggleTopics?.length ? `This student tends to struggle with: ${topics}\nGive extra detail, more intermediate steps, and at least one extra example on these topics.` : ''}
${scores ? `Their topic confidence levels:\n${scores}` : ''}

## QUALITY RULES
- Never say you can't access or view a file — the content is right there in the message
- Show complete working, never skip steps
- Ask ONE clarifying question if the question is unclear
- Give a "what to remember from this" one-liner at the end
`;
};

export async function* streamChat(
  messages: Message[],
  memoryContext?: {
    summary?: string;
    struggleTopics?: string[];
    userProfile?: { email: string; totalQuestions: number };
    topicScores?: { topic: string; score: number }[];
  }
): AsyncGenerator<string> {
  const processedMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === 'user') {
      return { ...m, content: buildContent(m.content, m.attachments || []) };
    }
    return m;
  });

  const model = 'meta/llama-3.2-11b-vision-instruct';

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(memoryContext || {}) },
        ...processedMessages,
      ],
      temperature: 0.1,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API error: ${response.status}`;
    try {
      const e = JSON.parse(errorText);
      errorMessage = e.error?.message || e.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('Response body is null');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return;
        try {
          const data = JSON.parse(dataStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch { /* skip */ }
      }
    }
  }
}
