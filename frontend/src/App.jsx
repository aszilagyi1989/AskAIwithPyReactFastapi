import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// Figyelem: A végén ott kell legyen a /chats/
const API_URL = "https://askaiwithpyreactfastapibackend.onrender.com";

function App() {
  // --- 1. Összes State az elején ---
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null); // Ez felkerült ide
  const [chats, setChats] = useState([]);
  const [formData, setFormData] = useState({
    email: '', model: 'gpt-4', question: '', answer: ''
  });
  const [loading, setLoading] = useState(false);

  // --- 2. Függvények (Csak egyszer!) ---
  const handleSuccess = (credentialResponse) => {
    const token = credentialResponse.credential;
    const decoded = jwtDecode(token);
    
    setUser(decoded);
    setIdToken(token); // Elmentjük a későbbi küldéshez
    setFormData(prev => ({ ...prev, email: decoded.email }));
  };

  const fetchChats = async () => {
    try {
      const res = await axios.get(API_URL);
      setChats(res.data.reverse());
    } catch (err) {
      console.error("Hiba a lekérésnél", err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idToken) {
        alert("Kérlek jelentkezz be előbb!");
        return;
    }
    
    setLoading(true);
    try {
      await axios.post(API_URL, formData, {
        headers: {
          Authorization: `Bearer ${idToken}` // Küldjük a tokent a backendnek
        }
      });
      setFormData(prev => ({ ...prev, question: '', answer: '' }));
      await fetchChats();
    } catch (err) {
        console.error("Hiba a mentésnél", err);
        alert("Hiba a mentés során. Ellenőrizd a bejelentkezést!");
    } finally {
        setLoading(false);
    }
  };

  // --- 3. Megjelenítés ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-slate-800 text-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">AI Chat History</h1>
          <div>
            {!user ? (
              <GoogleLogin 
                onSuccess={handleSuccess} 
                onError={() => console.log('Bejelentkezési hiba')} 
              />
            ) : (
              <div className="flex items-center gap-4 text-sm">
                <span className="hidden sm:inline font-medium">{user.name}</span>
                <button 
                  onClick={() => { googleLogout(); setUser(null); setIdToken(null); }} 
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition"
                >
                  Kijelentkezés
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
        {/* Bal oldal: Form */}
        <section className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Új bejegyzés</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 outline-none"
                  type="email" 
                  value={formData.email} 
                  readOnly 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Modell</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.model} 
                  onChange={e => setFormData({...formData, model: e.target.value})}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Kérdés</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.question} 
                  onChange={e => setFormData({...formData, question: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Válasz</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.answer} 
                  onChange={e => setFormData({...formData, answer: e.target.value})}
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || !user}
                className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                  (loading || !user) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
              >
                {!user ? 'Bejelentkezés szükséges' : (loading ? 'Mentés...' : 'Naplózás')}
              </button>
            </form>
          </div>
        </section>

        {/* Jobb oldal: Előzmények */}
        <section className="md:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Előzmények ({chats.length})</h2>
          <div className="space-y-4">
            {chats.map(chat => (
              <div key={chat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex justify-between text-xs text-gray-400">
                  <span className="font-semibold text-blue-600 uppercase">{chat.model}</span>
                  <span>{new Date(chat.date).toLocaleString('hu-HU')}</span>
                </div>
                <div className="p-4">
                   <p className="text-gray-800 font-medium mb-2">{chat.question}</p>
                   <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400 text-gray-700 text-sm">
                     {chat.answer}
                   </div>
                   <p className="text-[10px] text-right text-gray-400 mt-2 italic">{chat.email}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;


/* 
https://askaiwithpyreactfastapibackend.onrender.com
Állapotkezelés: Komplexebb apphoz érdemes a React Query (TanStack) használata az adatok gyorsítótárazásához.
Stílus: A gyors és modern kinézethez a Tailwind CSS a legnépszerűbb választás manapság.
Interaktivitás: Ha valódi AI választ szeretnél, a create_chat hívás előtt hívd meg az OpenAI vagy Anthropic API-ját.*/