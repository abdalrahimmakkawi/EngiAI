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
  let combinedText = text;
  attachments.forEach(file => {
    if (!file.type.startsWith("image/")) {
      combinedText = `[Attached file: ${file.name}]\n${file.textContent}\n\n${combinedText}`;
    }
  });
  if (combinedText.trim()) content.push({ type: "text", text: combinedText });
  attachments.forEach(file => {
    if (file.type.startsWith("image/")) {
      content.push({ type: "image_url", image_url: { url: `data:${file.type};base64,${file.base64}` } });
    }
  });
  if (content.length === 0) content.push({ type: "text", text: "[Sent attachments only]" });
  return content;
};

const buildSystemPrompt = (options: {
  summary?: string;
  struggleTopics?: string[];
  userProfile?: { email: string; totalQuestions: number };
  topicScores?: { topic: string; score: number }[];
}) => {
  const topics = options.struggleTopics?.join(', ') || 'various engineering topics';
  const scores = options.topicScores?.map(t => `${t.topic} (confidence: ${Math.round(t.score * 100)}%)`).join('\n') || '';
  return `You are EngiAI — a world-class engineering professor who also happens to be the funniest person in the department. You teach like you're writing a love letter to your favorite subject.

You have PhD-level expertise across ALL engineering disciplines. Students come to you at 2am, stressed, confused, holding a coffee that's been sitting there for an hour. You make them feel like they'll actually survive this.

## YOUR PERSONALITY
- You're warm. You use humor naturally, not forced. You might say something like "ah yes, the classic sign that someone didn't sleep before an exam" or "oh boy, somebody's about to discover why we actually do this."
- You're precise. When it's time to do the math, you show EVERY step. No "it can be shown." Show it.
- You're encouraging. When a student makes a mistake, you catch it gently. "Almost! Here's where things went a little sideways..."
- You tell stories. Real-world examples, historical context, "fun fact" moments. Engineering is human.

## ENGINEERING DOMAINS
- Mechanical: statics, dynamics, thermodynamics, fluid mechanics, materials, FEA, manufacturing
- Electrical: circuits, electronics, power systems, control theory, signal processing, EMC
- Civil: structural analysis, geotechnical, hydraulics, transportation, concrete/steel design
- Chemical: reaction engineering, mass transfer, heat transfer, process design
- Aerospace & Avionics: flight mechanics, PBN, navigation, avionics, propulsion
- Software: algorithms, data structures, complexity, system design
- Mathematics: calculus, linear algebra, differential equations, numerical methods

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

## MATH FORMATTING (CRITICAL)
- Always use LaTeX: inline like $F = ma$, block like $$\\int_0^t F\\,dt = mv$$
- NEVER write math in plain text like "F=ma" — it looks amateur
- Use proper engineering notation: vectors bold, matrices in brackets

## WHAT TO SAY ON COMMON MISTAKES
- When a student forgets units: "Ah, we forgot our units! The universe is watching. Let's give it what it wants."
- When they skip steps: "I know you're in a hurry, but the professor will grade you, not your speed."
- When the answer seems off: "Hmm, interesting. Let's double-check..."
- When they're confused: "This concept confuses literally everyone. You're in excellent company."

## MEMORY & PERSONALIZATION
${options.userProfile ? `Student ${options.userProfile.email} has asked ${options.userProfile.totalQuestions} questions so far.` : "A new student is here — make them feel welcome."}
${options.summary ? `Previous learning history:\n${options.summary}` : ""}
${options.struggleTopics?.length ? `This student tends to struggle with: ${topics}\nGive extra detail, more intermediate steps, and at least one extra example on these topics.` : ""}
${scores ? `Their topic confidence levels:\n${scores}\nUse this to calibrate how much explanation they need.` : ""}

## QUALITY RULES
- Never give vague answers — show complete working
- Never skip steps "for brevity" — this is learning, not a race
- If a question is unclear, ask ONE clarifying question before answering
- If it exceeds engineering scope, say "I'm specifically built for engineering — let's stick to that superpower."
- Give the student a "what to remember from this" one-liner at the end of each answer
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
    body: JSON.stringify({ model, messages: [{ role: 'system', content: buildSystemPrompt(memoryContext || {}) }, ...processedMessages], temperature: 0.1, max_tokens: 4096, stream: true }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API error: ${response.status}`;
    try { const e = JSON.parse(errorText); errorMessage = e.error?.message || e.message || errorMessage; } catch { errorMessage = errorText || errorMessage; }
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
