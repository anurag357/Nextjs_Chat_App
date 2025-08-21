import { useState } from "react";
import Head from "next/head";
import FileUpload from "../components/FileUpload";
import TextPaste from "../components/TextPaste";
import UrlInput from "../components/UrlInput";
import ChatInterface from "../components/ChatInterface";

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'text' | 'url'
  const [uploadedItems, setUploadedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile drawer

  // --- Handlers ---
  const handleFileUpload = async (files) => {
    setIsProcessing(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (response.ok) {
        const result = await response.json();
        setUploadedItems((prev) => [...prev, ...result.processedFiles]);
      } else {
        throw new Error("File upload failed");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/process-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.ok) {
        setUploadedItems((prev) => [
          ...prev,
          {
            id: `text-${Date.now()}`,
            name: "Pasted Text",
            type: "text",
            size: Math.round(text.length / 1024) + " KB",
          },
        ]);
      } else {
        throw new Error("Text processing failed");
      }
    } catch (error) {
      console.error("Error processing text:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (url) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (response.ok) {
        const result = await response.json();
        setUploadedItems((prev) => [
          ...prev,
          {
            id: `url-${Date.now()}`,
            name: url,
            type: "url",
            size: Math.round(result.content.length / 1024) + " KB",
          },
        ]);
      } else {
        throw new Error("URL processing failed");
      }
    } catch (error) {
      console.error("Error processing URL:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Add this handler in Home component ---
  const handleDeleteItem = (id) => {
    setUploadedItems((prev) => prev.filter((item) => item.id !== id));
  };


  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Head>
        <title>AI Assistant for Your Documents</title>
        <meta
          name="description"
          content="Upload documents, paste text, or share URLs and chat with them using AI"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            aria-label="Open sidebar"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md border border-gray-200 text-gray-700"
          >
            {/* Hamburger */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant for Your Documents</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="h-full flex">
        {/* Sidebar (desktop static, mobile drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[320px] bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
                      ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                      lg:translate-x-0 lg:static`}
        >
          {/* Sidebar header */}
          <div className="hidden lg:flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Assistant for Your Documents</h1>
              <p className="text-xs text-gray-500">Chat. Ask. Learn</p>
            </div>
          </div>

          {/* Close on mobile */}
          <div className="lg:hidden px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Assistant for Your Documents</h2>
              <p className="text-xs text-gray-500">Chat. Ask. Learn</p>
            </div>
            <button
              aria-label="Close sidebar"
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-md border border-gray-200 text-gray-700"
            >
              {/* X */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "upload", label: "📂 Upload" },
                { key: "text", label: "✍️ Text" },
                { key: "url", label: "🔗 URL" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition
                    ${activeTab === t.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
                  disabled={isProcessing}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active panel */}
          <div className="p-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
              {/* Inline spinner (only on Upload tab) */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {activeTab === "upload" && "Upload documents"}
                  {activeTab === "text" && "Paste text"}
                  {activeTab === "url" && "Share a website"}
                </h3>
                {activeTab === "upload" && isProcessing && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-600">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Processing…</span>
                  </div>
                )}
              </div>

              {activeTab === "upload" && (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Supports PDF, TXT, DOCX, and more
                  </p>
                  <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
                </>
              )}

              {activeTab === "text" && (
                <TextPaste onTextSubmit={handleTextSubmit} isProcessing={isProcessing} />
              )}

              {activeTab === "url" && (
                <UrlInput onUrlSubmit={handleUrlSubmit} isProcessing={isProcessing} />
              )}
            </div>
          </div>

          {/* Added items */}
          {/* <div className="px-4 pb-4 overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Added items</h4>
              {uploadedItems.length === 0 ? (
                <p className="text-xs text-gray-500">No items added yet</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {uploadedItems.map((item) => (
                    <li key={item.id} className="py-2 flex items-center justify-between">
                      <div className="pr-2">
                        <p className="text-sm text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500">[{item.type}]</p>
                      </div>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">{item.size}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div> */}

          {/* Added items */}
          <div className="px-4 pb-4 overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Added items</h4>
              {uploadedItems.length === 0 ? (
                <p className="text-xs text-gray-500">No items added yet</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {uploadedItems.map((item) => (
                    <li key={item.id} className="py-2 flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <p className="text-sm text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500">[{item.type}]</p>
                      </div>

                      <span className="text-[11px] text-gray-500 whitespace-nowrap mr-2">
                        {item.size}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 6a1 1 0 011.707-.707L10 7.586l2.293-2.293A1 1 0 1113.707 6L11.414 8.293 13.707 10.586A1 1 0 1112.293 12L10 9.707 7.707 12A1 1 0 116.293 10.586L8.586 8.293 6.293 6.707A1 1 0 016 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </aside>

        {/* Right panel: Chat */}
        <section className="flex-1 min-w-0 h-full relative">
          <div className="h-full flex flex-col">
            {/* Desktop header spacer to match sidebar height (optional aesthetics) */}
            <div className="hidden lg:block h-16" />
            <div className="h-full p-4 lg:p-8">
              <div className="h-full bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  ChatBox
                </h3>
                <div className="h-[calc(100vh-220px)]">
                  <ChatInterface uploadedItems={uploadedItems} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Overlay Spinner (blocks entire UI while processing) */}
      {isProcessing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white p-5 rounded-full shadow-xl">
            <svg className="animate-spin h-10 w-10 text-indigo-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
