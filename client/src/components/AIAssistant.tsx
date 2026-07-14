import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  Trash2,
  HelpCircle,
} from "lucide-react";
import type { ChatMessage, Task } from "../types";
import { getFirebaseToken } from "../lib/firebase";

interface AIAssistantProps {
  tasks: Task[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function AIAssistant({
  tasks,
  messages,
  setMessages,
}: AIAssistantProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      label: "今日のおすすめは？",
      text: "今日登録されているタスクの中から、優先的に取り組むべきおすすめのスケジュールを教えてください。",
    },
    {
      label: "タスクを細分化して",
      text: "未完了のタスクのうち、時間がかかりそうなものを1つ選んで、20分単位でできる小さなステップに分割してください。",
    },
    {
      label: "テスト勉強のアドバイス",
      text: "期末試験が近づいています。効率的な復習スケジュールの立て方と、やる気を維持するコツを教えてください。",
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const token = await getFirebaseToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: updatedMessages,
          tasks: tasks,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to contact API");
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI error:", error);
      // Fallback response
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: error instanceof Error && error.message.includes("not configured")
          ? "AI機能の設定が完了していません。サーバーの GEMINI_API_KEY を設定してから再起動してください。"
          : "申し訳ありません。AIとの通信に失敗しました。時間を置いて再度お試しください。",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("チャット履歴を消去しますか？")) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: "こんにちは！ToDoneのAIアシスタントです。お疲れ様です！🍵\n\n「今日何から始めるべき？」「この重いレポート課題を細分化してほしい」「テスト勉強の計画を立てて」など、何でも気軽に聞いてね！あなたの日々のタスクに寄り添ってアドバイスするよ！",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-white border-l border-slate-100 flex flex-col h-full shrink-0">
      {/* Title Header */}
      <div className="p-4 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cobalt/10 flex items-center justify-center text-cobalt">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-sans font-bold text-sm text-slate-800">
              AI Assistant
            </span>
            <span className="block text-[10px] text-emerald-500 font-medium">
              ● Online Agent
            </span>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          title="チャット履歴をクリア"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isAI = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isAI ? "" : "flex-row-reverse"}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                  isAI ? "bg-cobalt text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {isAI ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              {/* Speech bubble */}
              <div className="max-w-[80%] flex flex-col gap-1">
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isAI
                      ? "bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100"
                      : "bg-cobalt text-white rounded-tr-none"
                  }`}
                >
                  {msg.text}
                </div>
                <span
                  className={`text-[10px] text-slate-400 ${
                    isAI ? "text-left" : "text-right"
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cobalt text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-2xl rounded-tl-none text-slate-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cobalt" />
              <span>AIが思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions if messages is just welcome */}
      {messages.length === 1 && !isLoading && (
        <div className="px-4 pb-2">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cobalt" />
            おすすめの質問：
          </div>
          <div className="flex flex-col gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                className="text-left text-xs bg-slate-50 border border-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-cobalt/5 hover:border-cobalt-light/30 transition-all duration-200"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-4 border-t border-slate-100 flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AIに質問する（例：やばいタスクどう分ける？）"
          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-cobalt text-white hover:bg-cobalt/90 transition-colors disabled:opacity-40 disabled:hover:bg-cobalt cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
