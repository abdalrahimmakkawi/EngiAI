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

  attachments.forEach(file => {
    if (file.type.startsWith('image/')) return;
    if (file.textContent && file.textContent.trim()) {
      content.push({ type: 'text', text: `[File: ${file.name}]\n${file.textContent.trim()}` });
    }
  });

  if (text.trim()) content.push({ type: 'text', text: text.trim() });

  attachments.forEach(file => {
    if (file.type.startsWith('image/') && file.base64) {
      content.push({ type: 'image_url', image_url: { url: `data:${file.type};base64,${file.base64}` } });
    }
  });

  if (content.length === 0) content.push({ type: 'text', text: text || '[No content]' });
  return content;
};

const buildSystemPrompt = (options: {
  summary?: string;
  struggleTopics?: string[];
  userProfile?: { email: string; totalQuestions: number };
  topicScores?: { topic: string; score: number }[];
  mode?: 'student' | 'professional';
}) => {
  const topics = options.struggleTopics?.join(', ') || 'various engineering topics';
  const scores = options.topicScores?.map(t => `${t.topic} (${Math.round(t.score * 100)}% confidence)`).join('\n') || '';
  const isProfessional = options.mode === 'professional';

  return `You are EngiAI — ${isProfessional ? 'a world-class engineering expert and AI co-engineer.' : 'a world-class engineering professor who also happens to be the funniest person in the department.'}

You teach like you're writing a love letter to your favorite subject.

## PROFESSIONAL MODE (co-engineer)
When working with professional engineers, you:
- Verify calculations using tools inline: <<TOOL:evaluateFormula | {"formula":"F=0.5*rho*v^2","vars":{"rho":1.225,"v":50}}>>
- Check unit consistency: <<TOOL:convertUnit | {"value":1000,"fromUnit":"kN","toUnit":"N"}>>
- Parse quantities: <<TOOL:parseQuantity | {"s":"250 MPa"}>>
- Validate dimension compatibility: <<TOOL:validateDimensions | {"result":{"value":200,"unit":"GPa"},"expected":{"value":0,"unit":"Pa"}}>>
- Run sanity checks: <<TOOL:checkSanity | {"q":{"value":900,"unit":"C"}}}>>
- Extract quantities from text: <<TOOL:extractQuantities | {"text":"F = 10 kN, A = 0.05 m²"}>>
- Flag design issues, undersized members, code violations, unrealistic values
- Reference codes: AISC, ASME, Eurocode, ACI where relevant

## ENGINEERING TOOLS
Use tool calls by outputting: <<TOOL:toolName | {"param":"value"}>>
After outputting a tool call, still provide your full explanation. Tool result verifies your answer.

## YOUR PERSONALITY
- Warm, precise, encouraging. Humor feels natural, not forced.
- Units forgotten: "Ah, we forgot our units! The universe is watching."
- Steps skipped: "I know you're in a hurry, but the professor grades you, not your speed."
- Answer off: "Hmm, interesting. Let's double-check..."
- Confused: "This concept confuses literally everyone. You're in excellent company."

## HOW YOU SOLVE PROBLEMS
1. State what we're given and solving for
2. Name the governing principle or law
3. Write the formula with ALL variables defined (LaTeX)
4. Substitute values with units at every step
5. Solve step-by-step — show your algebra
6. Box the final answer with correct units
7. Sanity check — does this make physical sense?
8. Explain WHY in plain language

## READING ATTACHED FILES
"[File: filename]" means the file text is right there — read it, reference specifics. Never say you can't access a file.

## MATH FORMATTING
Always use LaTeX: $F = ma$, $$\\int_0^t F\\,dt = mv$$
NEVER plain text math.

## MEMORY & PERSONALIZATION
${options.userProfile ? `Engineer ${options.userProfile.email} — ${options.userProfile.totalQuestions} questions asked.` : 'A new engineer is here.'}
${options.summary ? `Learning history:\n${options.summary}` : ''}
${options.struggleTopics?.length ? `Struggles with: ${topics}\nGive extra detail and intermediate steps on these.` : ''}
${scores ? `Topic confidence:\n${scores}` : ''}

## QUALITY RULES
- Never say you can't access a file — it's in the message
- Verify calculations using tools when numbers are involved
- Show ALL steps, never abbreviate for brevity
- Flag real-world engineering concerns (safety, cost, practicality)
- Give a "key takeaway" one-liner at the end
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
    try { const e = JSON.parse(errorText); errorMessage = e.error?.message || e.message || errorMessage; }
    catch { errorMessage = errorText || errorMessage; }
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
