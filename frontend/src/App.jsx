import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import ReCAPTCHA from "react-google-recaptcha";

const API_URL = "https://askaiwithpyreactfastapibackend.onrender.com/chats/";
const API_URL2 = "https://askaiwithpyreactfastapibackend.onrender.com/images/";
const API_URL3 = "https://askaiwithpyreactfastapibackend.onrender.com/videos/";

const VERIFY_URL = "https://askaiwithpy.onrender.com";
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log("Debug Site Key:", import.meta.env.VITE_RECAPTCHA_SITE_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const [chats, setChats] = useState([]);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [formData, setFormData] = useState({ email: '', model: 'gpt-4o-mini', question: '' });
  const [imageFormData, setImageFormData] = useState({ email: '', model: 'dall-e-3', description: '' });
  const [videoFormData, setVideoFormData] = useState({ email: '', model: 'sora-1', duration: 4, content: '' });

  const [activeTab, setActiveTab] = useState('chat');

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleLoginSuccess = async (credentialResponse) => {
  try {
    const res = await axios.post("https://askaiwithpyreactfastapibackend.onrender.com", {
      google_token: credentialResponse.credential,
      recaptcha_token: captchaToken
    });

    if (res.data.success) {
      // Figyelem: a backend a res.data.user-ben küldi az adatokat!
      const userData = res.data.user; 
      setUser(userData);
      setIdToken(credentialResponse.credential);
      
      setFormData(prev => ({ ...prev, email: userData.email }));
      setImageFormData(prev => ({ ...prev, email: userData.email }));
      setVideoFormData(prev => ({ ...prev, email: userData.email }));
    }
  } catch (error) {
    alert("Bejelentkezési hiba: " + (error.response?.data?.detail || "Ismeretlen hiba"));
    captchaRef.current?.reset();
    setCaptchaToken(null);
  }
};

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setIdToken(null);
    setCaptchaToken(null);
    setChats([]);
    setImages([]);
    setVideos([]);
  };

  const getFilteredUrl = (baseUrl) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  const fetchChats = async () => {
    if (!idToken) return;
    setFetching(true);
    try {
      const res = await axios.get(getFilteredUrl(API_URL), { headers: { Authorization: `Bearer ${idToken}` } });
      setChats(res.data);
    } catch (err) { console.error(err); } finally { setFetching(false); }
  };
  
  const fetchImages = async () => {
    if (!idToken) return;
    try {
      const res = await axios.get(getFilteredUrl(API_URL2), { headers: { Authorization: `Bearer ${idToken}` } });
      setImages(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchVideos = async () => {
    if (!idToken) return;
    try {
      const res = await axios.get(getFilteredUrl(API_URL3), { headers: { Authorization: `Bearer ${idToken}` } });
      setVideos(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!apiKey) return alert("Kérlek add meg az OpenAI API kulcsodat!");
    setLoading(true);
    try {
      await axios.post(API_URL, { formData, openaiapi_key: apiKey }, { headers: { Authorization: `Bearer ${idToken}` } });
      setFormData(prev => ({ ...prev, question: ''})); 
      fetchChats();
    } catch (err) { alert("Hiba a chat során."); } finally { setLoading(false); }
  };
  
  const handleImageSubmit = async (e) => {
    e.preventDefault();
    setImageLoading(true);
    try {
      await axios.post(API_URL2, imageFormData, { headers: { Authorization: `Bearer ${idToken}` } });
      setImageFormData(prev => ({ ...prev, description: '' }));
      fetchImages();
    } catch (err) { alert("Hiba a képnél."); } finally { setImageLoading(false); }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    setVideoLoading(true);
    try {
      await axios.post(API_URL3, videoFormData, { headers: { Authorization: `Bearer ${idToken}` } });
      setVideoFormData(prev => ({ ...prev, content: '' }));
      fetchVideos();
    } catch (err) { alert("Hiba a videónál."); } finally { setVideoLoading(false); }
  };

  const downloadCSV = () => {
    if (chats.length === 0) return alert("Nincsenek üzenetek!");
    const header = ["Dátum", "Modell", "Kérdés", "Válasz"];
    const rows = chats.map(chat => [new Date(chat.date).toLocaleString('hu-HU'), chat.model, `"${chat.question}"`, `"${chat.answer}"`]);
    const csvContent = [header.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "history.csv";
    link.click();
  };

  useEffect(() => {
    if (idToken) { fetchChats(); fetchImages(); fetchVideos(); }
  }, [idToken]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-slate-900 text-white shadow-lg py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Ask AI with Python</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{user.name}</span>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition">Kijelentkezés</button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 bg-white rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800">Bejelentkezés</h2>
            <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={handleCaptchaChange} />
            <div className={!captchaToken ? "opacity-50 pointer-events-none" : ""}>
                <GoogleLogin onSuccess={handleLoginSuccess} onError={() => alert("Login Failed")} />
            </div>
            {!captchaToken && <p className="text-xs text-gray-400 italic">Oldd meg a CAPTCHA-t a belépéshez!</p>}
          </div>
        ) : (
          <>
            <nav className="bg-white border-b sticky top-0 z-10 shadow-sm mb-6 rounded-lg">
              <div className="container mx-auto px-4 flex gap-8">
                {['chat', 'image', 'video'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`py-4 px-2 font-bold capitalize border-b-2 transition-all ${
                      activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-400'
                    }`}>
                    {tab === 'chat' ? '💬 Chat' : tab === 'image' ? '🖼️ Képek' : '🎥 Videók'}
                  </button>
                ))}
              </div>
            </nav>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end mb-4">
               <div className="flex flex-col">
                 <label className="text-xs font-bold text-gray-500 mb-1">Kezdő dátum</label>
                 <input type="date" className="p-2 border rounded text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
               </div>
               <div className="flex flex-col">
                 <label className="text-xs font-bold text-gray-500 mb-1">Záró dátum</label>
                 <input type="date" className="p-2 border rounded text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
               </div>
               <button onClick={() => { fetchChats(); fetchImages(); fetchVideos(); }} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition">Szűrés</button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm mb-8">
              <label className="text-xs font-bold text-red-500 block mb-1">OPENAI API KEY</label>
              <input type="password" placeholder="sk-..." className="w-full p-2 border rounded text-sm outline-none" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>

            {activeTab === 'chat' && (
              <div className="grid lg:grid-cols-3 gap-8">
                <section className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">AI Chat</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <select className="w-full p-2 border rounded" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}>
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4o">gpt-4o</option>
                      </select>
                      <textarea placeholder="Kérdés..." className="w-full p-2 border rounded h-24" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
                      <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                        {loading ? 'Gondolkodom...' : 'Küldés'}
                      </button>
                    </form>
                  </div>
                </section>
                <section className="lg:col-span-2 space-y-4">
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-slate-800">Üzenetek {fetching && <span className="text-xs font-normal text-gray-400 animate-pulse ml-2">(Frissítés...)</span>}</h2>
                      <button onClick={downloadCSV} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition">CSV Export</button>
                   </div>
                   {chats.map(chat => (
                     <div key={chat.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                       <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                         <span>{new Date(chat.date).toLocaleString('hu-HU')}</span>
                         <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{chat.model}</span>
                       </div>
                       <p className="font-bold text-blue-900 italic mb-3">Q: {chat.question}</p>
                       <div className="text-gray-700 bg-blue-50/40 p-4 rounded-lg border-l-4 border-blue-400 leading-relaxed">A: {chat.answer}</div>
                     </div>
                   ))}
                </section>
              </div>
            )}

            {activeTab === 'image' && (
               <div className="grid lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                      <h2 className="text-lg font-bold mb-4 border-b pb-2">Képgenerálás</h2>
                      <form onSubmit={handleImageSubmit} className="space-y-4">
                        <select className="w-full p-2 border rounded" value={imageFormData.model} onChange={e => setImageFormData({...imageFormData, model: e.target.value})}>
                          <option value="dall-e-3">DALL-E 3</option>
                          <option value="dall-e-2">DALL-E 2</option>
                        </select>
                        <textarea placeholder="Kép leírása..." className="w-full p-2 border rounded h-24" value={imageFormData.description} onChange={e => setImageFormData({...imageFormData, description: e.target.value})} required />
                        <button disabled={imageLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                          {imageLoading ? 'Rajzolok...' : 'Generálás'}
                        </button>
                      </form>
                    </div>
                  </section>
                  <section className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                    {images.map(img => (
                      <div key={img.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                        <img src={img.image} alt={img.description} className="w-full aspect-square object-cover rounded-xl group-hover:scale-105 transition duration-500" />
                        <div className="mt-3">
                           <span className="text-[10px] text-gray-400 block mb-1">{new Date(img.date).toLocaleDateString('hu-HU')}</span>
                           <p className="text-xs text-gray-600 italic line-clamp-2">{img.description}</p>
                        </div>
                      </div>
                    ))}
                  </section>
               </div>
            )}

            {activeTab === 'video' && (
              <div className="grid lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                      <h2 className="text-lg font-bold mb-4 border-b pb-2">Videógenerálás</h2>
                      <form onSubmit={handleVideoSubmit} className="space-y-4">
                        <select className="w-full p-2 border rounded" value={videoFormData.model} onChange={e => setVideoFormData({...videoFormData, model: e.target.value})}>
                          <option value="sora-1">OpenAI Sora</option>
                        </select>
                        <input type="number" min="1" max="10" className="w-full p-2 border rounded" value={videoFormData.duration} onChange={e => setVideoFormData({...videoFormData, duration: parseInt(e.target.value)})} />
                        <textarea placeholder="Videó tartalma..." className="w-full p-2 border rounded h-24" value={videoFormData.content} onChange={e => setVideoFormData({...videoFormData, content: e.target.value})} required />
                        <button disabled={videoLoading} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold transition disabled:bg-gray-300">
                          {videoLoading ? 'Forgatok...' : 'Videó készítése'}
                        </button>
                      </form>
                    </div>
                  </section>
                  <section className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                    {videos.map(vid => (
                      <div key={vid.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <video controls className="w-full rounded-xl mb-3 shadow-inner bg-black aspect-video">
                          <source src={vid.video} type="video/mp4" />
                        </video>
                        <div className="px-1">
                           <span className="text-[10px] text-gray-400 block mb-1">{new Date(vid.date).toLocaleDateString('hu-HU')}</span>
                           <p className="text-xs text-gray-600 line-clamp-2">{vid.content}</p>
                        </div>
                      </div>
                    ))}
                  </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function AppWrapper() {
  const clientID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  if (!clientID) {
    return <div style={{color: "red", padding: "20px"}}>HIBA: Google Client ID hiányzik!</div>;
  }

  return (
    <GoogleOAuthProvider 
      clientId={clientID}
      onScriptLoadError={() => console.log("Google SDK betöltési hiba")}
      onScriptLoadSuccess={() => console.log("Google SDK kész")}
    >
      <App />
    </GoogleOAuthProvider>
  );
}

//export default App;


    /* 
    Állapotkezelés: Komplexebb apphoz érdemes a React Query (TanStack) használata az adatok gyorsítótárazásához.
    Stílus: A gyors és modern kinézethez a Tailwind CSS a legnépszerűbb választás manapság.
    Interaktivitás: Ha valódi AI választ szeretnél, a create_chat hívás előtt hívd meg az OpenAI vagy Anthropic API-ját.*/