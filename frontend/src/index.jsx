import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="137171816079-hd3ffm9fqjiv4nmbbji1eei9hjs50a1p.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);