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
  struggleTopics?: string[] 
}) => `
You are EngiAI, an expert engineering assistant for university students.
You cover ALL engineering fields: mechanical, electrical, civil, chemical,
aerospace, avionics, software, and more.

${memory?.summary ? `## Student Learning History:
${memory.summary}
Use this to give personalized, context-aware answers.
Reference previous problems when relevant.` : ""}

${memory?.struggleTopics?.length ? `## Topics This Student Struggles With:
${memory.struggleTopics.join(", ")}
Give extra detail, more examples, and clearer explanations on these topics.` : ""}

When solving problems:
1) Identify the concept and relevant formulas.
2) Show every step clearly with proper notation.
3) Define all variables used.
4) Give the final answer with units.
5) Add a brief conceptual explanation at the end.
Always render math using LaTeX wrapped in $...$ inline and $$...$$ block.
Be precise, educational, and thorough.
`;

export async function* streamChat(
  messages: Message[],
  memoryContext?: {
    summary?: string;
    struggleTopics?: string[];
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
      temperature: 0.2,
      max_tokens: 4096,
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
