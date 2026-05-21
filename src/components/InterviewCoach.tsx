import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, MessageSquare, AlertCircle, HelpCircle } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  { text: 'Explain the math of weight of evidence (WoE) and its advantages.', id: 'q-woe' },
  { text: 'Why do bank regulators prefer Logistic Regression over Random Forests?', id: 'q-reg' },
  { text: 'How are credit scores scaled from default odds (PDO Calibration)?', id: 'q-score' },
  { text: 'What is the relationship between ROC-AUC and the Gini Coefficient?', id: 'q-gini' }
];

export default function InterviewCoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: "Hello! I am your LendingClub Credit Risk Advisory Coach. \n\nI can help you review Probability of Default (PD) systems, explain scorecard scaling factors, Weight of Evidence (WoE), Basel Accords capital requirements, and prepare you for quantitative credit risk developer interviews. \n\nSelect one of the classic technical questions below or write anything you want to discuss!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setConfigError(null);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isConfigError) {
          setConfigError(data.hint || data.error);
        } else {
          throw new Error(data.error || 'Server error communicating with Gemini AI.');
        }
        return;
      }

      const coachMsg: ChatMessage = {
        id: `msg-${Date.now()}-coach`,
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, coachMsg]);

    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'model',
          text: `⚠️ Error completing query: ${err.message || 'An unexpected networking failure occurred. Please retry.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#EBE9E4] border border-[#141414] rounded-none overflow-hidden flex flex-col h-[550px] mb-6">
      
      {/* Header */}
      <div className="p-4 border-b border-[#141414] bg-[#D6D5D2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#141414] text-white rounded-none">
            <MessageSquare className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-serif italic text-gray-900 font-bold leading-none">
              AI Credit Compliance & Interview Coach
            </h3>
            <span className="text-[9px] text-[#141414] font-bold font-mono block mt-1 uppercase tracking-tight">
              Powered by server-side gemini-3.5-flash
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono border border-[#141414] bg-[#E4E3E0] px-2 py-0.5">ONLINE AGENT</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#E4E3E0]/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col max-w-[85%] ${
              m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <div
              className={`p-3.5 text-xs leading-relaxed rounded-none border border-[#141414] ${
                m.role === 'user'
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414]'
              }`}
              style={{ whiteSpace: 'pre-line' }}
            >
              {m.text}
            </div>
            <span className="text-[9px] text-gray-600 font-mono mt-1 px-1">
              {m.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start max-w-[85%] mr-auto">
            <div className="p-3.5 bg-white border border-[#141414] rounded-none text-xs text-gray-700 font-mono flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#141414] animate-ping" />
              <span>Analyzing scorecard coefficients...</span>
            </div>
          </div>
        )}

        {/* Informative Config Error Card if no key is configured */}
        {configError && (
          <div className="bg-white border border-red-700 p-4 text-xs text-red-950 rounded-none flex gap-3 font-mono">
            <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0" />
            <div>
              <p className="font-bold uppercase text-red-700 mb-1">AI Coach Key Required:</p>
              <p className="mb-2 leading-relaxed text-gray-700">{configError}</p>
              <p className="text-[10px] text-gray-500">
                💡 <em>Note: The interactive scorecard solvers, WoE tables, DT trace engines, and ROC-AUC sliders run natively client-side without any key!</em>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompting anchors */}
      <div className="px-4 py-2.5 bg-[#D6D5D2] border-t border-b border-[#141414]">
        <div className="flex items-center gap-1.5 text-[9px] text-gray-700 uppercase font-mono tracking-wider mb-1.5 font-bold">
          <HelpCircle className="w-3.5 h-3.5 text-blue-900" /> Suggested Interview Anchors:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q.id}
              onClick={() => handleSendMessage(q.text)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-white border border-[#141414] hover:bg-[#E4E3E0] text-[10px] text-gray-900 rounded-none cursor-pointer transition-all disabled:opacity-50 text-left truncate max-w-full font-mono"
            >
              {q.text}
            </button>
          ))}
        </div>
      </div>

      {/* Form Submission input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="p-3 bg-white border-t border-[#141414] flex gap-2"
      >
        <input
          type="text"
          id="coach-input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isLoading ? "Wating for CRO reply..." : "Discuss credit matrices or ask technical queries..."}
          disabled={isLoading}
          className="flex-1 rounded-none border border-[#141414] text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          id="btn-send-message"
          disabled={!inputText.trim() || isLoading}
          className="px-4 bg-[#141414] text-white hover:bg-[#D6D5D2] hover:text-[#141414] transition-all border border-[#141414] rounded-none disabled:opacity-50 flex items-center justify-center cursor-pointer font-mono text-xs uppercase"
        >
          <Send className="w-4 h-4 mr-1.5" /> Send
        </button>
      </form>

    </div>
  );
}
