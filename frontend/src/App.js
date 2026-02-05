import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://askaiwithpyreactfastapibackend.onrender.com";

function App() {
  const [chats, setChats] = useState([]);
  const [formData, setFormData] = useState({
    email: '', model: 'gpt-3.5', question: '', answer: ''
  });

  // Adatok betöltése
  const fetchChats = async () => {
    try {
      const res = await axios.get(API_URL);
      setChats(res.data);
    } catch (err) { console.error("Hiba a lekérésnél", err); }
  };

  useEffect(() => { fetchChats(); }, []);

  // Küldés kezelése
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, formData);
      setFormData({ ...formData, question: '', answer: '' }); // Mezők ürítése
      fetchChats(); // Lista frissítése
    } catch (err) { console.error("Hiba a mentésnél", err); }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Új Chat Mentése</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
        <input placeholder="Model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
        <textarea placeholder="Kérdés" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
        <textarea placeholder="Válasz" value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} required />
        <button type="submit">Mentés</button>
      </form>

      <h2>Korábbi üzenetek</h2>
      <ul>
        {chats.map(chat => (
          <li key={chat.id} style={{ marginBottom: '15px', borderBottom: '1px solid #ccc' }}>
            <strong>{chat.email}</strong> ({chat.model}): <br />
            Q: {chat.question} <br />
            A: {chat.answer}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;


/* Állapotkezelés: Komplexebb apphoz érdemes a React Query (TanStack) használata az adatok gyorsítótárazásához.
Stílus: A gyors és modern kinézethez a Tailwind CSS a legnépszerűbb választás manapság.
Interaktivitás: Ha valódi AI választ szeretnél, a create_chat hívás előtt hívd meg az OpenAI vagy Anthropic API-ját.*/