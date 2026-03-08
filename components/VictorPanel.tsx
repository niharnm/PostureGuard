"use client";

import { FormEvent, memo, useCallback, useMemo, useState } from "react";
import { Bot, CornerDownLeft, Mic, Paperclip } from "lucide-react";
import { VictorContextPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import {
  ExpandableChat,
  ExpandableChatBody,
  ExpandableChatFooter,
  ExpandableChatHeader
} from "@/components/ui/expandable-chat";

type Message = {
  id: number;
  sender: "user" | "ai";
  content: string;
};

type Props = {
  context: VictorContextPayload;
  guestMode?: boolean;
};

const SUGGESTED_PROMPTS = [
  "How did I do this session?",
  "What should I improve?",
  "Explain my posture score",
  "Should I recalibrate?"
];

const AVATARS = {
  user: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop",
  ai: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
};

function VictorPanelBase({ context, guestMode = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      content:
        "I’m Victor, your Posture Coach. Ask me about your posture score, sessions, calibration, or improvement tips."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const shortStatus = useMemo(() => {
    if (!context.trackingStable) return "Tracking unstable";
    return `Live: ${context.state} (${context.score}%)`;
  }, [context.score, context.state, context.trackingStable]);

  const sendPrompt = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: "user",
        content: question
      }
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/victor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, guestMode })
      });

      if (!res.ok) {
        throw new Error("Victor is unavailable right now.");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: "ai",
          content: data.answer
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: "ai",
          content: "I can help with your posture scores, sessions, calibration, and improvement tips."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [context, isLoading]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  }, [input, sendPrompt]);

  return (
    <ExpandableChat size="lg" position="bottom-right" icon={<Bot className="h-6 w-6" />}>
      <ExpandableChatHeader className="flex-col items-start gap-1">
        <h2 className="text-lg font-semibold">Victor</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Posture Coach</p>
        <span className="rounded-full border border-border bg-secondary/40 px-2 py-1 text-[11px] text-secondary-foreground">
          {shortStatus}
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void sendPrompt(prompt);
              }}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </ExpandableChatHeader>

      <ExpandableChatBody>
        <ChatMessageList>
          {messages.map((message) => (
            <ChatBubble key={message.id} variant={message.sender === "user" ? "sent" : "received"}>
              <ChatBubbleAvatar
                className="h-8 w-8 shrink-0"
                src={message.sender === "user" ? AVATARS.user : AVATARS.ai}
                fallback={message.sender === "user" ? "US" : "AI"}
              />
              <ChatBubbleMessage variant={message.sender === "user" ? "sent" : "received"}>
                {message.content}
              </ChatBubbleMessage>
            </ChatBubble>
          ))}

          {isLoading ? (
            <ChatBubble variant="received">
              <ChatBubbleAvatar className="h-8 w-8 shrink-0" src={AVATARS.ai} fallback="AI" />
              <ChatBubbleMessage isLoading />
            </ChatBubble>
          ) : null}
        </ChatMessageList>
      </ExpandableChatBody>

      <ExpandableChatFooter>
        <form onSubmit={handleSubmit} className="relative rounded-lg border bg-background p-1 focus-within:ring-1 focus-within:ring-ring">
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Victor about your posture performance..."
            className="min-h-12 resize-none rounded-lg border-0 bg-background p-3 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between p-3 pt-0">
            <div className="flex">
              <Button variant="ghost" size="icon" type="button" aria-label="Attach file">
                <Paperclip className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" type="button" aria-label="Microphone">
                <Mic className="size-4" />
              </Button>
            </div>
            <Button type="submit" size="sm" className="ml-auto gap-1.5" disabled={isLoading || !input.trim()}>
              Send Message
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Victor is a posture coach, not a medical professional. He only answers using your app data.
        </p>
        {guestMode ? (
          <p className="mt-1 text-xs text-muted-foreground">Guest mode: Victor uses your live temporary session data.</p>
        ) : null}
      </ExpandableChatFooter>
    </ExpandableChat>
  );
}

export const VictorPanel = memo(VictorPanelBase);
