import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import "./App.css";
import { ThemeToggle } from "./components/ThemeToggle";
import { ResizableLayout } from "./components/ResizableLayout";
import { CommandPalette } from "./components/CommandPalette";
import { useTheme } from "./contexts/ThemeContext";
import faviconPng from "./logo.png";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
console.log("Using backend URL:", BACKEND_URL);

function App() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("blocks");
  const [responseData, setResponseData] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [latency, setLatency] = useState(null);
  const [status, setStatus] = useState("Agents ready");
  const [expandedReasoning, setExpandedReasoning] = useState(new Set());
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState(50);
  const { setTheme } = useTheme();
  const messagesEndRef = useRef(null);
  const lastProcessedUid = useRef(null);
  const currentViewRef = useRef(currentView);

  // Update ref whenever state changes
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const fetchLatestAnswer = useCallback(async () => {
    try {
      const start = performance.now();
      const res = await axios.get(`${BACKEND_URL}/latest_answer`);
      const end = performance.now();
      setLatency(Math.round(end - start));
      const data = res.data;

      updateData(data);
      if (!data.answer || data.answer.trim() === "") {
        return;
      }

      // Optimization: Check UID instead of content scanning O(N) -> O(1)
      if (data.uid && data.uid !== lastProcessedUid.current) {
        lastProcessedUid.current = data.uid;
        setMessages((prev) => [
          ...prev,
          {
            type: "agent",
            content: data.answer,
            reasoning: data.reasoning,
            agentName: data.agent_name,
            status: data.status,
            uid: data.uid,
          },
        ]);
        setStatus(data.status);
        scrollToBottom();
      } else {
        console.log("Duplicate answer detected, skipping:", data.answer);
      }
    } catch (error) {
      console.error("Error fetching latest answer:", error);
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      checkHealth();
      fetchLatestAnswer();
      fetchScreenshot();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [fetchLatestAnswer]);

  const commands = [
    {
      id: "clear",
      label: "Clear Chat History",
      action: () => clearChat(),
      icon: "🗑️",
    },
    {
      id: "export",
      label: "Export Conversation",
      action: () => exportChat(),
      icon: "📥",
    },
    {
      id: "theme-light",
      label: "Theme: Light Mode",
      action: () => setTheme("light"),
      icon: "☀️",
    },
    {
      id: "theme-dark",
      label: "Theme: Dark Mode",
      action: () => setTheme("dark"),
      icon: "🌙",
    },
    {
      id: "theme-hacker",
      label: "Theme: Hacker Mode",
      action: () => setTheme("hacker"),
      icon: "👨‍💻",
    },
    {
      id: "layout-chat",
      label: "Layout: Focus Chat (70/30)",
      action: () => setLayoutWidth(70),
      icon: "💬",
    },
    {
      id: "layout-code",
      label: "Layout: Focus Code (30/70)",
      action: () => setLayoutWidth(30),
      icon: "🖥️",
    },
    {
      id: "layout-balanced",
      label: "Layout: Balanced (50/50)",
      action: () => setLayoutWidth(50),
      icon: "⚖️",
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const checkHealth = async () => {
    try {
      const start = performance.now();
      await axios.get(`${BACKEND_URL}/health`);
      const end = performance.now();
      setLatency(Math.round(end - start));
      setIsOnline(true);
      console.log("System is online");
    } catch {
      setIsOnline(false);
      setLatency(null);
      console.log("System is offline");
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      setExpandedReasoning(new Set());
    }
  };

  const exportChat = () => {
    const chatContent = messages
      .map((msg) => {
        const role = msg.type === "user" ? "User" : msg.agentName || "Agent";
        return `### ${role}\n${msg.content}\n${
          msg.reasoning ? `> **Reasoning:** ${msg.reasoning}\n` : ""
        }\n---\n`;
      })
      .join("\n");

    const blob = new Blob([chatContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentic-seek-chat-${new Date().toISOString()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchScreenshot = async () => {
    // Optimization: Only fetch screenshot if we are in the screenshot view
    if (currentViewRef.current !== "screenshot") {
      return;
    }

    try {
      const timestamp = new Date().getTime();
      const res = await axios.get(
        `${BACKEND_URL}/screenshots/updated_screen.png?timestamp=${timestamp}`,
        {
          responseType: "blob",
        }
      );
      console.log("Screenshot fetched successfully");
      const imageUrl = URL.createObjectURL(res.data);
      setResponseData((prev) => {
        if (prev?.screenshot && prev.screenshot !== "placeholder.png") {
          URL.revokeObjectURL(prev.screenshot);
        }
        return {
          ...prev,
          screenshot: imageUrl,
          screenshotTimestamp: new Date().getTime(),
        };
      });
    } catch (err) {
      console.error("Error fetching screenshot:", err);
      setResponseData((prev) => ({
        ...prev,
        screenshot: "placeholder.png",
        screenshotTimestamp: new Date().getTime(),
      }));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleReasoning = (messageIndex) => {
    setExpandedReasoning((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  const updateData = (data) => {
    setResponseData((prev) => ({
      ...prev,
      blocks: data.blocks || prev.blocks || null,
      done: data.done,
      answer: data.answer,
      agent_name: data.agent_name,
      status: data.status,
      uid: data.uid,
    }));
  };

  const handleStop = async (e) => {
    e.preventDefault();
    checkHealth();
    setIsLoading(false);
    setError(null);
    try {
      await axios.get(`${BACKEND_URL}/stop`);
      setStatus("Requesting stop...");
    } catch (err) {
      console.error("Error stopping the agent:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    checkHealth();
    if (!query.trim()) {
      console.log("Empty query");
      return;
    }
    setMessages((prev) => [...prev, { type: "user", content: query }]);
    setIsLoading(true);
    setError(null);

    try {
      console.log("Sending query:", query);
      setQuery("waiting for response...");
      const res = await axios.post(`${BACKEND_URL}/query`, {
        query,
        tts_enabled: false,
      });
      setQuery("Enter your query...");
      console.log("Response:", res.data);
      const data = res.data;
      updateData(data);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to process query.");
      setMessages((prev) => [
        ...prev,
        { type: "error", content: "Error: Unable to get a response." },
      ]);
    } finally {
      console.log("Query completed");
      setIsLoading(false);
      setQuery("");
    }
  };

  const handleGetScreenshot = async () => {
    try {
      setCurrentView("screenshot");
    } catch (err) {
      setError("Browser not in use");
    }
  };

  return (
    <div className="app">
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        commands={commands}
      />
      <header className="header">
        <div className="header-brand">
          <div className="logo-container">
            <img src={faviconPng} alt="AgenticSeek" className="logo-icon" />
          </div>
          <div className="brand-text">
            <h1>AgenticSeek</h1>
          </div>
        </div>
        <div className="header-status">
          <div
            className={`status-indicator ${isOnline ? "online" : "offline"}`}
          >
            <div className="status-dot"></div>
            <span className="status-text">
              {isOnline ? "Online" : "Offline"}
            </span>
            {latency !== null && (
              <span className="latency-text">
                {latency}ms
              </span>
            )}
          </div>
        </div>
        <div className="layout-presets">
          <button
            onClick={() => setLayoutWidth(70)}
            className={`preset-btn ${layoutWidth === 70 ? "active" : ""}`}
            title="Focus Chat"
          >
            Chat
          </button>
          <button
            onClick={() => setLayoutWidth(50)}
            className={`preset-btn ${layoutWidth === 50 ? "active" : ""}`}
            title="Balanced"
          >
            50/50
          </button>
          <button
            onClick={() => setLayoutWidth(30)}
            className={`preset-btn ${layoutWidth === 30 ? "active" : ""}`}
            title="Focus Code"
          >
            Code
          </button>
        </div>

        <div className="header-actions">
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="action-button palette-btn"
            title="Command Palette (Ctrl+K)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="action-text">Cmds</span>
          </button>
          <button
            onClick={clearChat}
            className="action-button"
            title="Clear Chat"
            aria-label="Clear Chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={exportChat}
            className="action-button"
            title="Export Chat"
            aria-label="Export Chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <a
            href="https://github.com/Fosowl/agenticSeek"
            target="_blank"
            rel="noopener noreferrer"
            className="action-button github-link"
            aria-label="View on GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="action-text">GitHub</span>
          </a>
          <div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="main">
        <ResizableLayout
          leftWidth={layoutWidth}
          onWidthChange={setLayoutWidth}
        >
          <div className="chat-section">
            <h2>Chat Interface</h2>
            <div className="messages">
              {messages.length === 0 ? (
                <p className="placeholder">
                  No messages yet. Type below to start!
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${
                      msg.type === "user"
                        ? "user-message"
                        : msg.type === "agent"
                        ? "agent-message"
                        : "error-message"
                    }`}
                  >
                    <div className="message-header">
                      {msg.type === "agent" && (
                        <span className="agent-name">{msg.agentName}</span>
                      )}
                      {msg.type === "agent" &&
                        msg.reasoning &&
                        expandedReasoning.has(index) && (
                          <div className="reasoning-content">
                            <ReactMarkdown>{msg.reasoning}</ReactMarkdown>
                          </div>
                        )}
                      {msg.type === "agent" && (
                        <button
                          className="reasoning-toggle"
                          onClick={() => toggleReasoning(index)}
                          title={
                            expandedReasoning.has(index)
                              ? "Hide reasoning"
                              : "Show reasoning"
                          }
                        >
                          {expandedReasoning.has(index) ? "▼" : "▶"} Reasoning
                        </button>
                      )}
                    </div>
                    <div className="message-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            {isOnline && <div className="loading-animation">{status}</div>}
            {!isLoading && !isOnline && (
              <p className="loading-animation">
                System offline. Deploy backend first.
              </p>
            )}
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your query..."
                disabled={isLoading}
              />
              <div className="action-buttons">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="icon-button"
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="icon-button stop-button"
                  aria-label="Stop processing"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      fill="currentColor"
                      rx="2"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          <div className="computer-section">
            <h2>Computer View</h2>
            <div className="view-selector">
              <button
                className={currentView === "blocks" ? "active" : ""}
                onClick={() => setCurrentView("blocks")}
              >
                Editor View
              </button>
              <button
                className={currentView === "screenshot" ? "active" : ""}
                onClick={
                  responseData?.screenshot
                    ? () => setCurrentView("screenshot")
                    : handleGetScreenshot
                }
              >
                Browser View
              </button>
            </div>
            <div className="content">
              {error && <p className="error">{error}</p>}
              {currentView === "blocks" ? (
                <div className="blocks">
                  {responseData &&
                  responseData.blocks &&
                  Object.values(responseData.blocks).length > 0 ? (
                    Object.values(responseData.blocks).map((block, index) => (
                      <div key={index} className="block">
                        <div className="block-header">
                          <p className="block-tool">Tool: {block.tool_type}</p>
                          <button
                            className="copy-button"
                            onClick={() => {
                              navigator.clipboard.writeText(block.block);
                            }}
                            title="Copy Code"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-2M16 4h2a2 2 0 012 2v4M21 14H16m-5 5v-5m0 0h5m-5 0V9a2 2 0 012-2h1" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Copy
                          </button>
                        </div>
                        <pre>{block.block}</pre>
                        <p className="block-feedback">
                          Feedback: {block.feedback}
                        </p>
                        {block.success ? (
                          <p className="block-success">Success</p>
                        ) : (
                          <p className="block-failure">Failure</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="block">
                      <p className="block-tool">Tool: No tool in use</p>
                      <pre>No file opened</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="screenshot">
                  <img
                    src={responseData?.screenshot || "placeholder.png"}
                    alt="Screenshot"
                    onError={(e) => {
                      e.target.src = "placeholder.png";
                      console.error("Failed to load screenshot");
                    }}
                    key={responseData?.screenshotTimestamp || "default"}
                  />
                </div>
              )}
            </div>
          </div>
        </ResizableLayout>
      </main>
    </div>
  );
}

export default App;
