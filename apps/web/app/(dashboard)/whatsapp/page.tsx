// apps/web/app/(dashboard)/whatsapp/page.tsx
"use client";
import { useState } from "react";
import { Send, MessageSquare, Clock, CheckCheck, Phone, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  direction: "out" | "in";
  body: string;
  time: string;
  status: "sent" | "delivered" | "read";
};

type Contact = {
  id: number;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
};

const DEMO_CONTACTS: Contact[] = [
  { id: 1, name: "Rajesh Kumar",   phone: "+918827504243", lastMessage: "Rate: 3200", time: "10:42 AM", unread: 0 },
  { id: 2, name: "Priya Sharma",   phone: "+919876543210", lastMessage: "Work done: Delivered 40 bags", time: "9:15 AM",  unread: 2 },
  { id: 3, name: "Suresh Patel",   phone: "+917654321098", lastMessage: "Stock: 150 kg", time: "Yesterday", unread: 0 },
  { id: 4, name: "Anita Singh",    phone: "+916543210987", lastMessage: "Will submit report by 6pm", time: "Yesterday", unread: 1 },
  { id: 5, name: "Mohan Das",      phone: "+915432109876", lastMessage: "Sales: 300 units today", time: "Mon", unread: 0 },
];

const DEMO_HISTORY: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, direction: "out", body: "Good morning Rajesh! Please share today's rates.", time: "8:01 AM", status: "read" },
    { id: 2, direction: "in",  body: "Rate: 3200", time: "8:45 AM", status: "read" },
    { id: 3, direction: "out", body: "Thanks! That's noted ✓", time: "8:46 AM", status: "delivered" },
    { id: 4, direction: "in",  body: "Also wheat is at 2900 per quintal today", time: "10:42 AM", status: "read" },
  ],
  2: [
    { id: 1, direction: "out", body: "Hi Priya, please submit your daily report.", time: "8:00 AM", status: "read" },
    { id: 2, direction: "in",  body: "Work done: Delivered 40 bags to Rajkot client", time: "9:15 AM", status: "read" },
    { id: 3, direction: "out", body: "Great work today! 👍", time: "9:16 AM", status: "read" },
  ],
  3: [
    { id: 1, direction: "out", body: "Suresh ji, please share today's stock status.", time: "7:00 AM", status: "read" },
    { id: 2, direction: "in",  body: "Stock: 150 kg basmati remaining", time: "9:30 AM", status: "read" },
  ],
  4: [
    { id: 1, direction: "out", body: "Hi Anita, your report is pending for today.", time: "6:00 PM", status: "read" },
    { id: 2, direction: "in",  body: "Will submit report by 6pm", time: "5:45 PM", status: "read" },
  ],
  5: [
    { id: 1, direction: "out", body: "Good morning! Please share today's sales update.", time: "8:00 AM", status: "read" },
    { id: 2, direction: "in",  body: "Sales: 300 units today, all dispatched", time: "4:30 PM", status: "read" },
  ],
};

const QUICK_MESSAGES = [
  "Please submit your daily report.",
  "Good morning! Please share today's rates.",
  "Reminder: Stock update is pending.",
  "Hi, please confirm delivery status.",
  "Your payment has been received. Thank you!",
];

export default function WhatsAppPage() {
  const [selectedContact, setSelectedContact] = useState<Contact>(DEMO_CONTACTS[0]);
  const [phone,   setPhone]   = useState("+918827504243");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [search,  setSearch]  = useState("");
  const [chatHistory, setChatHistory] = useState<Record<number, ChatMessage[]>>(DEMO_HISTORY);
  const [showNewChat, setShowNewChat] = useState(false);

  const filteredContacts = DEMO_CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const currentMessages = chatHistory[selectedContact.id] ?? [];

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSending(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 900));

    const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const newMsg: ChatMessage = {
      id:        Date.now(),
      direction: "out",
      body:      message.trim(),
      time:      now,
      status:    "sent",
    };

    setChatHistory((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] ?? []), newMsg],
    }));

    setSending(false);
    setMessage("");
    toast.success("Message sent successfully (demo)");

    // Simulate delivered status after 1s
    setTimeout(() => {
      setChatHistory((prev) => ({
        ...prev,
        [selectedContact.id]: (prev[selectedContact.id] ?? []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "delivered" } : m
        ),
      }));
    }, 1000);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-sm text-gray-500">Send messages and manage conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Connected (demo)
          </span>
          <button
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New message
          </button>
        </div>
      </div>

      {/* Main panel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex h-[calc(100vh-12rem)]">

        {/* Contact list */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedContact(c); setPhone(c.phone); }}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors",
                  selectedContact.id === c.id && "bg-blue-50 hover:bg-blue-50"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 flex-shrink-0 ml-1">{c.time}</p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                    {c.unread > 0 && (
                      <span className="ml-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 font-medium">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {selectedContact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selectedContact.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" /> {selectedContact.phone}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "#f0f7ff14" }}>
            <p className="text-center text-xs text-gray-400 my-2">Today</p>
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.direction === "out" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[72%] px-3.5 py-2 rounded-2xl text-sm",
                    msg.direction === "out"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  )}
                >
                  <p className="leading-relaxed">{msg.body}</p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-1",
                    msg.direction === "out" ? "text-blue-200" : "text-gray-400"
                  )}>
                    <span className="text-xs">{msg.time}</span>
                    {msg.direction === "out" && (
                      <CheckCheck className={cn("w-3.5 h-3.5", msg.status === "read" ? "text-blue-200" : "text-blue-300/60")} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {currentMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center pt-20">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">No messages yet. Send the first one!</p>
              </div>
            )}
          </div>

          {/* Quick messages */}
          <div className="px-4 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
            {QUICK_MESSAGES.map((q) => (
              <button
                key={q}
                onClick={() => setMessage(q)}
                className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-100 bg-white">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-28"
            />
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Right panel — send to new number */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Send to number</p>
            <p className="text-xs text-gray-400 mt-0.5">Send to any WhatsApp number</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Type your message…"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Message
                </>
              )}
            </button>

            {/* Stats */}
            <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's stats</p>
              {[
                { label: "Messages sent", value: "24" },
                { label: "Delivered",     value: "22" },
                { label: "Read",          value: "19" },
                { label: "Replies",       value: "8"  },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-semibold text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
