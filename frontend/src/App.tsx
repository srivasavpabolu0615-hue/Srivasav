import { useState } from 'react';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const endpoint = modalMode === 'login' ? '/login' : '/register';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Something went wrong.');
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage('Could not connect to the server.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 shadow-md">
        <div className="text-xl font-bold text-blue-600">
          Global AI Product Intelligence
        </div>
        <div className="flex gap-6 text-gray-700">
          <a href="#about" className="hover:text-blue-600">About</a>
          <a href="#features" className="hover:text-blue-600">Features</a>
          <a href="#pricing" className="hover:text-blue-600">Pricing</a>
          <a href="#contact" className="hover:text-blue-600">Contact</a>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => openModal('login')}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            Login
          </button>
          <button
            onClick={() => openModal('register')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Register
          </button>
        </div>
      </nav>

      <section className="text-center py-24 px-6 bg-gradient-to-b from-blue-50 to-white">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Understand Any Product,<br />From Any Country, Instantly
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          AI-powered translation, classification, and trade intelligence
          for importers, exporters, and compliance teams worldwide.
        </p>
        <button
          onClick={() => openModal('register')}
          className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Get Started Free
        </button>
      </section>

      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Everything You Need for Global Trade
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Powerful AI tools built for importers, exporters, and compliance teams
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      <section id="pricing" className="py-20 px-6 bg-gray-50 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Free for Everyone
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8">
          Our platform is completely free to use — no hidden fees, no credit card required.
          Every business, big or small, deserves access to powerful trade intelligence tools.
        </p>
        <button
          onClick={() => openModal('register')}
          className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Get Started Free
        </button>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-10 px-6 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white font-semibold">
            Global AI Product Intelligence
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#about" className="hover:text-white">About</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
          <div className="text-sm text-gray-500">
            © 2026 Global AI Product Intelligence. All rights reserved.
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
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
                className="border border-gray-300 rounded-lg px-4 py-2"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700"
              >
                {modalMode === 'login' ? 'Log In' : 'Register'}
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
    </div>
  )
}

export default App