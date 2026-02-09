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
              <button onClick={() => { googleLogout(); setUser(null); setIdToken(null); setChats([]); setImages([]); }} 
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition">Kijelentkezés</button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        
        {/* BAL OLDAL: Űrlapok */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Chat</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="w-full p-2 border rounded bg-gray-100 outline-none text-xs" value={formData.email} readOnly />
              <select className="w-full p-2 border rounded outline-none" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
              <textarea placeholder="Kérdés" className="w-full p-2 border rounded h-20 outline-none" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
              <button disabled={!user || loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                {loading ? 'Thinking...' : 'Answer me!'}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Image Generator</h2>
            <form onSubmit={handleImageSubmit} className="space-y-4">
              <select className="w-full p-2 border rounded outline-none" value={imageFormData.model} onChange={e => setImageFormData({...imageFormData, model: e.target.value})}>
                <option value="dall-e-3">DALL-E 3</option>
                <option value="dall-e-2">DALL-E 2</option>
              </select>
              <textarea placeholder="Kép leírása (Prompt)" className="w-full p-2 border rounded h-20 outline-none" value={imageFormData.description} onChange={e => setImageFormData({...imageFormData, description: e.target.value})} required />
              <button disabled={!user || imageLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                {imageLoading ? 'Generating...' : 'Generate Image'}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Video Generator</h2>
            <form onSubmit={handleVideoSubmit} className="space-y-4">
              <textarea placeholder="Videó leírása..." className="w-full p-2 border rounded h-20 outline-none" 
                value={videoFormData.content} onChange={e => setVideoFormData({...videoFormData, content: e.target.value})} required />
              <button disabled={!user || videoLoading} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                {videoLoading ? 'Generating...' : 'Create Video'}
              </button>
            </form>
          </div>

        </section>

        {/* JOBB OLDAL: Eredmények */}
        <section className="lg:col-span-2 space-y-12">
          
          {/* Chat Üzenetek */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Messages</h2>
              {user && (
                <div className="flex gap-2">
                  <button onClick={downloadCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">Download CSV</button>
                  <button onClick={fetchChats} disabled={fetching} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
                    {fetching ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
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
          </div>

          {/* GALÉRIA KÓD BEILLESZTVE */}
          <div>
            <div className="flex items-center justify-between mb-6 border-b pb-2">
              <h2 className="text-xl font-bold">Gallery</h2>
              <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{images.length} items</span>
            </div>

            {(!images || images.length === 0) ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 italic">
                Your creative gallery is empty.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {images.map((img) => (
                  <div key={img.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-300">
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img src={img.image} alt={img.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-slate-700 font-medium line-clamp-2 min-h-[40px] mb-2 leading-relaxed">{img.description}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                        <span>{new Date(img.date).toLocaleDateString('hu-HU')}</span>
                        <a href={img.image} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition">Full Size ↗</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold mb-6">Generated Videos</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {videos.map((vid) => (
                <div key={vid.id} className="bg-white p-2 rounded-xl shadow-sm border">
                  <video controls className="w-full rounded-lg">
                    <source src={vid.video} type="video/mp4" />
                    A böngésződ nem támogatja a videólejátszást.
                  </video>
                  <p className="text-xs text-gray-500 mt-2">{vid.content}</p>
                </div>
              ))}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

export default App;


/* 
Állapotkezelés: Komplexebb apphoz érdemes a React Query (TanStack) használata az adatok gyorsítótárazásához.
Stílus: A gyors és modern kinézethez a Tailwind CSS a legnépszerűbb választás manapság.
Interaktivitás: Ha valódi AI választ szeretnél, a create_chat hívás előtt hívd meg az OpenAI vagy Anthropic API-ját.*/