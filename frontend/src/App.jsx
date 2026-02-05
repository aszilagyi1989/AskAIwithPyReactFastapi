import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// Figyelem: A végén ott kell legyen a /chats/
const API_URL = "https://askaiwithpyreactfastapibackend.onrender.com/chats/";

function App() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState({
    email: '', model: 'gpt-5.2', question: '' 
  });
/*, answer: ''*/
  const handleSuccess = (credentialResponse) => {
    const token = credentialResponse.credential;
    const decoded = jwtDecode(token);
    setUser(decoded);
    setIdToken(token);
    setFormData(prev => ({ ...prev, email: decoded.email }));
  };

  const fetchChats = async () => {
    if (!idToken) return;
    setFetching(true);
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setChats(res.data);
    } catch (err) {
      console.error("Hiba:", err);
      alert("Hiba az adatok lekérésekor.");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(API_URL, formData, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setFormData(prev => ({ ...prev, question: ''})); 
      //, answer: ''
      alert("AI Válasz megérkezett és mentve!");
      fetchChats();
    } catch (err) {
      alert("Hiba történt a generálás során.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-slate-900 text-white shadow-lg py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">Ask AI with Python</h1>
          {!user ? (
            <GoogleLogin onSuccess={handleSuccess} onError={() => alert("Login Failed")} />
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{user.name}</span>
              <button onClick={() => { googleLogout(); setUser(null); setIdToken(null); setChats([]); }} 
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition">Kijelentkezés</button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Beküldő Form */}
        <section className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Chat</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="w-full p-2 border rounded bg-gray-100 outline-none" value={formData.email} readOnly />
              <select className="w-full p-2 border rounded outline-none" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}>
                <option value="gpt-5.2">gpt-5.2</option>
                <option value="gpt-5">gpt-5</option>
                <option value="gpt-5-mini">gpt-5-mini</option>
                <option value="gpt-5-nano">gpt-5-nano</option>
              </select>
              <textarea placeholder="Kérdés" className="w-full p-2 border rounded h-20 outline-none" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
              {/*<textarea placeholder="AI Válasza" className="w-full p-2 border rounded h-32 outline-none" value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} required />*/}
              <button disabled={!user || loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                {loading ? 'Thinking...' : 'Answer me!'}
              </button>
            </form>
          </div>
        </section>

        {/* Adatbázis Lista */}
        <section className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Messages</h2>
            {user && (
              <button onClick={fetchChats} disabled={fetching} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                {fetching ? 'Loading...' : 'Data fetching'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {chats.map(chat => (
              <div key={chat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between text-[10px] text-gray-400 mb-2 font-bold uppercase">
                  <span className="text-emerald-600">{chat.model}</span>
                  <span>{new Date(chat.date).toLocaleString('hu-HU')}</span>
                </div>
                <p className="font-semibold text-gray-800 mb-2">{chat.question}</p>
                <div className="bg-emerald-50 p-3 rounded-lg text-sm border-l-4 border-emerald-400">{chat.answer}</div>
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