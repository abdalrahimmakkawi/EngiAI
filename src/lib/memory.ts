import { supabase } from "./supabase";
import { streamChat } from "./nvidia";

// Save a message to Supabase
export const saveMessage = async (
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  topicTags: string[] = [],
  hasAttachments: boolean = false
) => {
  try {
    await supabase.from("messages").insert({
      user_id: userId,
      session_id: sessionId,
      role,
      content: typeof content === "string" ? content : JSON.stringify(content),
      topic_tags: topicTags,
      has_attachments: hasAttachments ? true : false,
    });
  } catch (err) {
    console.warn("Failed to save message:", err);
  }
};

// Load last N messages for context
export const loadRecentMessages = async (
  userId: string,
  limit: number = 20
) => {
  try {
    const { data } = await supabase
      .from("messages")
      .select("role, content, topic_tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).reverse();
  } catch {
    return [];
  }
};

// Get or create memory summary
export const getMemorySummary = async (userId: string): Promise<string> => {
  try {
    const { data } = await supabase
      .from("memory_summaries")
      .select("summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0]?.summary ?? "";
  } catch {
    return "";
  }
};

// Summarize old messages when count exceeds 30
export const summarizeIfNeeded = async (userId: string) => {
  try {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!count || count < 30) return;

    const recent = await loadRecentMessages(userId, 30);
    const historyText = recent
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    // Use NVIDIA to summarize
    let summary = "";
    const summaryMessages = [{
      role: "user" as const,
      content: `Summarize this student's engineering learning history 
      in 200 words. Focus on: topics covered, recurring struggles, 
      concepts mastered, and learning patterns.\n\n${historyText}`
    }];

    for await (const chunk of streamChat(summaryMessages)) {
      summary += chunk;
    }

    await supabase.from("memory_summaries").insert({
      user_id: userId,
      summary,
      message_count_at_summary: count,
    });
  } catch (err) {
    console.warn("Summarization failed:", err);
  }
};

// Update topic scores based on feedback
export const updateTopicScore = async (
  userId: string,
  topics: string[],
  wasHelpful: boolean
) => {
  for (const topic of topics) {
    try {
      const { data } = await supabase
        .from("topic_scores")
        .select("*")
        .eq("user_id", userId)
        .eq("topic", topic)
        .single();

      if (data) {
        await supabase
          .from("topic_scores")
          .update({
            attempts: data.attempts + 1,
            struggles: wasHelpful ? data.struggles : data.struggles + 1,
            score: wasHelpful
              ? Math.min(1, data.score + 0.1)
              : Math.max(0, data.score - 0.2),
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      } else {
        await supabase.from("topic_scores").insert({
          user_id: userId,
          topic,
          attempts: 1,
          struggles: wasHelpful ? 0 : 1,
          score: wasHelpful ? 1.0 : 0.8,
        });
      }
    } catch (err) {
      console.warn("Failed to update topic score:", err);
    }
  }
};

// Get struggle topics for system prompt injection
export const getStruggleTopics = async (userId: string): Promise<string[]> => {
  try {
    const { data } = await supabase
      .from("topic_scores")
      .select("topic, score")
      .eq("user_id", userId)
      .lt("score", 0.6)
      .order("score", { ascending: true })
      .limit(3);
    return (data ?? []).map(d => d.topic);
  } catch {
    return [];
  }
};
