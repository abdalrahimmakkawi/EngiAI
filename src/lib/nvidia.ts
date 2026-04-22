import { Attachment } from './fileProcessor';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

const buildContent = (text: string, attachments: Attachment[]) => {
  if (attachments.length === 0) return text;
  
  const content: any[] = [];
  
  // Consolidate all text (user message + file contents)
  let combinedText = text;
  attachments.forEach(file => {
    if (!file.type.startsWith("image/")) {
      combinedText = `[Attached file: ${file.name}]\n${file.textContent}\n\n${combinedText}`;
    }
  });

  if (combinedText.trim()) {
    content.push({ type: "text", text: combinedText });
  }

  // Add images
  attachments.forEach(file => {
    if (file.type.startsWith("image/")) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${file.type};base64,${file.base64}`
        }
      });
    }
  });

  // If literally empty (edge case), add a stub
  if (content.length === 0) {
    content.push({ type: "text", text: "[Sent attachments only]" });
  }

  return content;
};

const buildSystemPrompt = (memory?: {
  summary?: string;
  struggleTopics?: string[];
  userProfile?: { email: string; totalQuestions: number };
}) => `
You are EngiAI, an elite engineering tutor and problem solver 
for university students. You have PhD-level knowledge across ALL 
engineering disciplines.

## YOUR EXPERTISE
- Mechanical: statics, dynamics, thermodynamics, fluid mechanics, 
  materials, manufacturing, FEA
- Electrical: circuit analysis, electronics, power systems, 
  control theory, signal processing, EMC
- Civil: structural analysis, geotechnical, hydraulics, 
  transportation, concrete/steel design
- Chemical: reaction engineering, mass transfer, heat transfer, 
  process design, thermodynamics
- Aerospace & Avionics: flight mechanics, PBN, navigation systems, 
  avionics architecture, propulsion
- Software: algorithms, data structures, complexity, system design
- Mathematics: calculus, linear algebra, differential equations, 
  numerical methods, probability

## HOW YOU SOLVE PROBLEMS
For every engineering problem you MUST:
1. State the given information and what is being solved
2. Identify the governing principle, law, or theorem
3. Write the relevant formula(s) with ALL variables defined
4. Substitute values with units at every step
5. Solve step-by-step showing all algebra clearly
6. Box or highlight the final answer with correct units
7. Do a sanity check — does the answer make physical sense?
8. Give a one-paragraph intuitive explanation of WHY this answer 
   makes sense physically

## MATH FORMATTING RULES
- ALWAYS use LaTeX for any math expression
- Inline math: $F = ma$ 
- Block equations: $$\\int_0^t F\\,dt = \\Delta p$$
- Never write math in plain text like "F=ma"
- Use proper notation: vectors bold, matrices bracketed

## TEACHING STYLE
- Be thorough but clear — explain like a great professor
- Use analogies to build intuition
- Point out common mistakes students make on this topic
- If a concept has a visual component, describe it clearly
- When relevant, mention real-world engineering applications
- If student makes an error in their question, 
  gently correct it before solving

## MEMORY & PERSONALIZATION
${memory?.userProfile ? `Student: ${memory.userProfile.email} 
(${memory.userProfile.totalQuestions} questions asked so far)` : ""}

${memory?.summary ? `## Learning History:
${memory.summary}
Reference previous problems when relevant to show continuity.` : ""}

${memory?.struggleTopics?.length ? `## This Student Struggles With:
${memory.struggleTopics.join(", ")}
Give EXTRA detail, more intermediate steps, and additional 
examples on these specific topics.` : ""}

## RESPONSE QUALITY RULES
- Never give vague or incomplete answers
- Never skip steps "for brevity"
- Never say "it can be shown that..." — show it
- If a question is outside engineering, politely redirect
- If a question is unclear, ask ONE clarifying question
- Minimum response for any calculation: show full working
`;

export async function* streamChat(
  messages: Message[],
  memoryContext?: {
    summary?: string;
    struggleTopics?: string[];
    userProfile?: { email: string; totalQuestions: number };
  }
): AsyncGenerator<string> {

  // Only the last message gets the attachments in this implementation
  // Using meta/llama-3.2-11b-vision-instruct as it is a widely supported vision NIM
  const processedMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === 'user') {
      return { ...m, content: buildContent(m.content, m.attachments || []) };
    }
    return m;
  });

  const model = 'meta/llama-3.2-11b-vision-instruct';

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model, 
      messages: [
        { role: 'system', content: buildSystemPrompt(memoryContext) },
        ...processedMessages
      ],
      temperature: 0.1,  // lower = more precise and consistent
      max_tokens: 4096,  // was 2048
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is null');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return;

        try {
          const data = JSON.parse(dataStr);
          const content = data.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          console.error('Error parsing chunk:', e);
        }
      }
    }
  }
}
