import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Cseréld ki a saját Render backend URL-edre!
const API_URL = "https://askaiwithpyreactfastapibackend.onrender.com";

function App() {
  const [chats, setChats] = useState([]);
  const [formData, setFormData] = useState({
    email: '', model: 'gpt-4', question: '', answer: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchChats = async () => {
    try {
      const res = await axios.get(API_URL);
      setChats(res.data.reverse()); // A legújabb legyen legfelül
    } catch (err) {
      console.error("Hiba a lekérésnél", err);
    }
  };

  useEffect(() => { fetchChats(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(API_URL, formData);
      setFormData({ ...formData, question: '', answer: '' });
      await fetchChats();
    } catch (err) {
      console.error("Hiba a mentésnél", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-slate-800 text-white py-6 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold tracking-tight">AI Chat History Manager</h1>
          <p className="text-slate-300 text-sm">Rögzítsd és kezeld az AI interakcióidat</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
        
        {/* Form Szekció */}
        <section className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Új bejegyzés</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="pelda@email.hu"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Modell</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                  value={formData.question} 
                  onChange={e => setFormData({...formData, question: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Válasz</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[120px]"
                  value={formData.answer} 
                  onChange={e => setFormData({...formData, answer: e.target.value})}
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}
              >
                {loading ? 'Mentés...' : 'Naplózás'}
              </button>
            </form>
          </div>
        </section>

        {/* Lista Szekció */}
        <section className="md:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
            Előzmények 
            <span className="ml-3 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">{chats.length}</span>
          </h2>
          
          <div className="space-y-4">
            {chats.length === 0 && <p className="text-gray-400 italic text-center py-10">Még nincsenek mentett beszélgetések.</p>}
            
            {chats.map(chat => (
              <div key={chat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-blue-200 transition">
                <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-100 text-xs">
                  <span className="font-semibold text-blue-600 uppercase">{chat.model}</span>
                  <span className="text-gray-400">{new Date(chat.date).toLocaleString('hu-HU')}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Kérdés:</span>
                    <p className="text-gray-800 font-medium">{chat.question}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <span className="text-[10px] font-bold text-blue-400 uppercase">AI Válasz:</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{chat.answer}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 italic">User: {chat.email}</span>
                  </div>
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