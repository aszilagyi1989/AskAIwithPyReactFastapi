import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const API_URL = "https://askaiwithpyreactfastapibackend.onrender.com/chats/";
const API_URL2 = "https://askaiwithpyreactfastapibackend.onrender.com/images/";
const API_URL3 = "https://askaiwithpyreactfastapibackend.onrender.com/videos/";

function App() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);

  const [chats, setChats] = useState([]);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '', model: 'gpt-5.2', question: '' 
  });
  const [imageFormData, setImageFormData] = useState({
    email: '', model: 'dall-e-3', description: '' 
  });
  const [videoFormData, setVideoFormData] = useState({
    email: '', model: 'sora-2', duration: 4, content: ''
  });

  const [activeTab, setActiveTab] = useState('chat');

  const handleSuccess = (credentialResponse) => {
    const token = credentialResponse.credential;
    const decoded = jwtDecode(token);
    setUser(decoded);
    setIdToken(token);
    setFormData(prev => ({ ...prev, email: decoded.email }));
    setImageFormData(prev => ({ ...prev, email: decoded.email }));
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
  
  const fetchImages = async () => {
    if (!idToken) return;
    try {
      const res = await axios.get(API_URL2, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      console.log("Képek érkeztek:", res.data);
      setImages(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Kép hiba:", err); }
  };

  const fetchVideos = async () => {
    if (!idToken) return;
    try {
      const res = await axios.get(API_URL3, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setVideos(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Videó lekérési hiba:", err); }
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
  
  const handleImageSubmit = async (e) => {
    e.preventDefault();
    setImageLoading(true);
    try {
      await axios.post(API_URL2, imageFormData, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setImageFormData(prev => ({ ...prev, description: '' }));
      alert("Kép elkészült!");
      fetchImages();
    } catch (err) {
        alert("Hiba a képgenerálásnál.");
    } finally {
        setImageLoading(false);
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    setVideoLoading(true);
    try {
      await axios.post(API_URL3, videoFormData, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setVideoFormData(prev => ({ ...prev, content: '' }));
      alert("Videó generálása elindult! Ez eltarthat pár percig.");
      fetchVideos();
    } catch (err) {
      alert("Hiba a videógenerálásnál.");
    } finally {
      setVideoLoading(false);
    }
  }
  
  const downloadCSV = () => {
  
    if (chats.length === 0) return alert("You have not got any Message!");

    // Fejléc és az adatok összeállítása pontosvesszővel (;) elválasztva
    const header = ["Created", "Model", "Question", "Answer"];
    const rows = chats.map(chat => [
      new Date(chat.date).toLocaleString('hu-HU'),
      chat.model,
      // Idézőjelek közé tesszük a szöveget, hogy a benne lévő ; ne törje meg a fájlt
      `"${chat.question.replace(/"/g, '""')}"`, 
      `"${chat.answer.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      header.join(";"), 
      ...rows.map(row => row.join(";"))
    ].join("\n");

    // Blob létrehozása és letöltés
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `chat_history_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  };
  
  useEffect(() => {
    if (idToken) {
      fetchChats();
      fetchImages();
      fetchVideos();
    }
  }, [idToken]);

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
              <button onClick={() => { googleLogout(); setUser(null); setIdToken(null); setChats([]); setImages([]); setVideos([]); }} 
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition">Kijelentkezés</button>
            </div>
          )}
        </div>
      </header>

      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 flex gap-8">
          {['chat', 'image', 'video'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 font-bold capitalize transition-colors border-b-2 ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              {tab === 'chat' ? '💬 Chat' : tab === 'image' ? '🖼️ Képek' : '🎥 Videók'}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
      {/* --- CHAT SZECKIÓ --- */}
      {activeTab === 'chat' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          <section className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">AI Chat</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input className="w-full p-2 border rounded bg-gray-100 outline-none text-xs" value={formData.email} readOnly />
                <select className="w-full p-2 border rounded outline-none" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                </select>
                <textarea placeholder="Kérdés" className="w-full p-2 border rounded h-24 outline-none" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
                <button disabled={!user || loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                  {loading ? 'Gondolkodom...' : 'Kérdezz!'}
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Üzenetek</h2>
              {user && (
                <div className="flex gap-2">
                  <button onClick={downloadCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">CSV Letöltés</button>
                  <button onClick={fetchChats} disabled={fetching} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition">Frissítés</button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {chats.map((chat) => (
                <div key={chat.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span className="font-mono">{chat.model}</span>
                    <span>{new Date(chat.date).toLocaleString('hu-HU')}</span>
                  </div>
                  <p className="font-bold text-gray-800 mb-2">Q: {chat.question}</p>
                  <p className="text-gray-600 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">A: {chat.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* --- KÉP SZECKIÓ --- */}
      {activeTab === 'image' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          <section className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">Képgeneráló</h2>
              <form onSubmit={handleImageSubmit} className="space-y-4">
                <select className="w-full p-2 border rounded outline-none" value={imageFormData.model} onChange={e => setImageFormData({...imageFormData, model: e.target.value})}>
                  <option value="dall-e-3">DALL-E 3</option>
                  <option value="dall-e-2">DALL-E 2</option>
                </select>
                <textarea placeholder="Kép leírása (Prompt)" className="w-full p-2 border rounded h-24 outline-none" value={imageFormData.description} onChange={e => setImageFormData({...imageFormData, description: e.target.value})} required />
                <button disabled={!user || imageLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                  {imageLoading ? 'Generálás...' : 'Kép készítése'}
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6">Generált Képek</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {images.map((img) => (
                <div key={img.id} className="bg-white p-2 rounded-xl shadow-sm border group overflow-hidden">
                  <img src={img.image} alt={img.description} className="w-full h-auto rounded-lg object-cover hover:scale-105 transition duration-300" />
                  <p className="text-[10px] text-gray-500 mt-2 px-1 italic">{img.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* --- VIDEÓ SZECKIÓ --- */}
      {activeTab === 'video' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          <section className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">Videógeneráló</h2>
              <form onSubmit={handleVideoSubmit} className="space-y-4">
                <select className="w-full p-2 border rounded outline-none" value={videoFormData.model} onChange={e => setVideoFormData({...videoFormData, model: e.target.value})}>
                  <option value="sora-1">OpenAI Sora</option>
                  <option value="luma-dream">Luma Dream Machine</option>
                </select>
                <textarea placeholder="Milyen videót szeretnél?" className="w-full p-2 border rounded h-24 outline-none" value={videoFormData.content} onChange={e => setVideoFormData({...videoFormData, content: e.target.value})} required />
                <button disabled={!user || videoLoading} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                  {videoLoading ? 'Videó készül...' : 'Videó készítése'}
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6">Generált Videók</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {videos.map((vid) => (
                <div key={vid.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <video controls className="w-full rounded-lg bg-black aspect-video" src={vid.video}>
                    A böngésződ nem támogatja a videót.
                  </video>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{vid.model}</p>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{vid.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
        </div>
      );
    }

export default App;


    /* 
    Állapotkezelés: Komplexebb apphoz érdemes a React Query (TanStack) használata az adatok gyorsítótárazásához.
    Stílus: A gyors és modern kinézethez a Tailwind CSS a legnépszerűbb választás manapság.
    Interaktivitás: Ha valódi AI választ szeretnél, a create_chat hívás előtt hívd meg az OpenAI vagy Anthropic API-ját.*/