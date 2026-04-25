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
  const topics = options.struggleTopics?.join(', ') || '';
  const scores = options.topicScores?.map(t => `${t.topic}: ${Math.round(t.score * 100)}%`).join(', ') || '';
  const isProfessional = options.mode === 'professional';

  return `You are EngiAI — ${isProfessional ? 'a world-class engineering expert and AI co-engineer.' : 'an engineering professor who makes tough topics feel manageable.'}

## CORE BEHAVIOR
- Be warm, precise, and encouraging
- When units are missing: "Ah, we forgot our units — the universe is watching."
- When steps are skipped: "The professor grades you, not your speed."
- When answers are off: "Hmm, interesting — let's double-check..."
- Confused by something? "This confuses literally everyone. You're in excellent company."

## SOLVING PROBLEMS (${isProfessional ? 'co-engineer' : 'student'} mode)
1. State what's given and what we're solving for
2. Name the governing principle or law
3. Write the formula with all variables defined (use LaTeX: $F=ma$)
4. Substitute values with units, solve step-by-step
5. Sanity check — does the answer make physical sense?
${isProfessional ? `
## CO-ENGINEERING TOOLS
Use inline: <<TOOL:evaluateFormula | {"formula":"F=0.5*rho*v^2","vars":{"rho":1.225,"v":50}}>>
Check units: <<TOOL:convertUnit | {"value":1000,"fromUnit":"kN","toUnit":"N"}>>
Flag unrealistic values, design issues, code violations (AISC, ASME, Eurocode, ACI).` : ''}

## READING ATTACHED FILES
"[File: filename]" = the file content is in this message. Read it, reference specifics, never say you can't access it.

## MATH
Always LaTeX: $F=ma$, never plain text math.

${options.summary ? `## LEARNING HISTORY\n${options.summary}` : ''}
${topics ? `## STRUGGLING WITH\n${topics} — give extra detail and intermediate steps.` : ''}
${scores ? `## TOPIC CONFIDENCE\n${scores}` : ''}

## QUALITY
- Verify calculations when numbers are involved
- Show all steps, never abbreviate
- Flag real-world concerns (safety, cost, practicality)
- End with a "key takeaway" one-liner
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
