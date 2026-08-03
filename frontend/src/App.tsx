import { useState, useRef, useEffect } from 'react';

const BACKEND_URL = 'https://global-label-decode-backend.onrender.com';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisError, setAnalysisError] = useState('');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
      setLoggedInEmail(savedEmail);
    }
  }, []);

  const openModal = (mode: string) => {
    setModalMode(mode);
    setMessage('');
    setEmail('');
    setPassword('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setLoggedInEmail(null);
    setIsChatOpen(false);
  };

  const getFriendlyError = (context: 'auth' | 'analyze' | 'chat', data: any, response?: Response) => {
    if (data?.error) {
      return data.error;
    }
    if (response && response.status === 429) {
      return "We're getting a lot of requests right now. Please wait a moment and try again.";
    }
    if (response && response.status >= 500) {
      return 'Our server is temporarily unavailable. Please try again in a minute.';
    }
    if (context === 'auth') return 'Could not log you in right now. Please try again.';
    if (context === 'analyze') return 'Could not analyze this image right now. Please try again.';
    return 'Something went wrong. Please try again.';
  };

  const getNetworkErrorMessage = () => {
    if (!navigator.onLine) {
      return "You appear to be offline. Please check your internet connection and try again.";
    }
    return 'Could not reach the server. It may be starting up — please wait a few seconds and try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const endpoint = modalMode === 'login' ? '/login' : '/register';

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(getFriendlyError('auth', data, response));
      } else {
        setMessage(data.message);
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userEmail', data.user.email);
          setLoggedInEmail(data.user.email);
          setTimeout(() => {
            closeModal();
          }, 1000);
        }
      }
    } catch (err) {
      setMessage(getNetworkErrorMessage());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAnalysisError('Please choose an image file (JPG, PNG, etc).');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult('');
      setAnalysisError('');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisResult('');
    setAnalysisError('');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setAnalysisError(getFriendlyError('analyze', data, response));
      } else {
        setAnalysisResult(data.explanation);
      }
    } catch (err) {
      setAnalysisError(getNetworkErrorMessage());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        setChatMessages([...newMessages, { role: 'assistant', text: getFriendlyError('chat', data, response) }]);
      } else {
        setChatMessages([...newMessages, { role: 'assistant', text: data.reply }]);
      }
    } catch (err) {
      setChatMessages([...newMessages, { role: 'assistant', text: getNetworkErrorMessage() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 shadow-md">
        <div className="text-base sm:text-xl font-bold text-blue-600 truncate">
          Global AI Product Intelligence
        </div>
        <div className="hidden md:flex gap-6 text-gray-700">
          <a href="#about" className="hover:text-blue-600">About</a>
          <a href="#features" className="hover:text-blue-600">Features</a>
          <a href="#pricing" className="hover:text-blue-600">Pricing</a>
          <a href="#contact" className="hover:text-blue-600">Contact</a>
        </div>
        <div className="flex gap-2 sm:gap-4 items-center flex-shrink-0">
          {loggedInEmail ? (
            <>
              <span className="hidden sm:inline text-gray-700 text-sm truncate max-w-[140px]">
                Logged in as {loggedInEmail}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 whitespace-nowrap"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openModal('login')}
                className="px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 whitespace-nowrap"
              >
                Login
              </button>
              <button
                onClick={() => openModal('register')}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="flex flex-col items-center text-center py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-blue-50 to-white">
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6">
          Understand Any Product,<br />From Any Country, Instantly
        </h1>
        <p className="text-base sm:text-xl text-gray-600 max-w-2xl mb-8">
          AI-powered translation, classification, and trade intelligence
          for importers, exporters, and compliance teams worldwide.
        </p>
        <button
          onClick={() => openModal('register')}
          className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg rounded-lg hover:bg-blue-700"
        >
          Get Started Free
        </button>
      </section>

      <section id="try-it-now" className="py-16 sm:py-20 px-4 sm:px-6 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Try It Now
        </h2>
        <p className="text-gray-600 mb-8">
          Upload a photo of any product label — in any language — and see it explained in English.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4 max-w-full text-sm"
          />

          {previewUrl && (
            <div className="mb-4">
              <img
                src={previewUrl}
                alt="Selected preview"
                className="max-h-64 mx-auto rounded-lg shadow"
              />
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing... (this can take up to 30s)' : 'Analyze Label'}
          </button>
        </div>

        {analysisError && (
          <p className="mt-6 text-red-600 text-sm sm:text-base">{analysisError}</p>
        )}

        {analysisResult && (
          <div className="mt-8 text-left bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 whitespace-pre-wrap text-gray-800 text-sm sm:text-base">
            {analysisResult}
          </div>
        )}
      </section>

      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
          Everything You Need for Global Trade
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Powerful AI tools built for importers, exporters, and compliance teams
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI Translation
            </h3>
            <p className="text-gray-600">
              Instantly translate product names and descriptions from any
              language into English with confidence scoring.
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              HS Code Assistant
            </h3>
            <p className="text-gray-600">
              Get accurate HS Code suggestions with clear explanations,
              so you can classify products correctly every time.
            </p>
          </div>
          <div className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Trade Intelligence
            </h3>
            <p className="text-gray-600">
              Access country of origin data, trade regulations, and
              compliance insights in one unified dashboard.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 sm:py-20 px-4 sm:px-6 bg-gray-50 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Free for Everyone
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8">
          Our platform is completely free to use — no hidden fees, no credit card required.
          Every business, big or small, deserves access to powerful trade intelligence tools.
        </p>
        <button
          onClick={() => openModal('register')}
          className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg rounded-lg hover:bg-blue-700"
        >
          Get Started Free
        </button>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-10 px-4 sm:px-6 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="text-white font-semibold">
            Global AI Product Intelligence
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <a href="#about" className="hover:text-white">About</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
          <div className="text-sm text-gray-500 text-center">
            © 2026 Global AI Product Intelligence. All rights reserved.
            <br />
            Made by Srujan
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              {modalMode === 'login' ? 'Log In' : 'Create an Account'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-4 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border border-gray-300 rounded-lg px-4 py-2"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSubmitting
                  ? 'Please wait...'
                  : modalMode === 'login' ? 'Log In' : 'Register'}
              </button>
            </form>
            {message && (
              <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
            )}
            <p className="mt-4 text-center text-sm text-gray-500">
              {modalMode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => openModal('register')} className="text-blue-600 hover:underline">
                    Register
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => openModal('login')} className="text-blue-600 hover:underline">
                    Log In
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {loggedInEmail && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 z-50 text-2xl"
        >
          {isChatOpen ? '✕' : '💬'}
        </button>
      )}

      {loggedInEmail && isChatOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-24 sm:right-6 w-full h-[85vh] sm:w-96 sm:h-[min(28rem,calc(100vh-8rem))] bg-white border border-gray-300 sm:rounded-xl shadow-xl flex flex-col z-50">
          <div className="bg-blue-600 text-white px-4 py-3 sm:rounded-t-xl font-semibold flex justify-between items-center flex-shrink-0">
            AI Assistant
            <button onClick={() => setIsChatOpen(false)} className="sm:hidden text-white text-xl">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            {chatMessages.length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-8">
                Ask me anything about products, labels, or how to use this site!
              </p>
            )}
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white self-end'
                    : 'bg-gray-100 text-gray-800 self-start'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isChatLoading && (
              <div className="bg-gray-100 text-gray-500 text-sm px-3 py-2 rounded-lg self-start">
                Typing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-gray-200 p-3 flex gap-2 flex-shrink-0">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <button
              onClick={handleSendChat}
              disabled={isChatLoading || !chatInput.trim()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App