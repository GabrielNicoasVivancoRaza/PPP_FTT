import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/theme.css'
import { FTT_LOGO } from './assets/fttLogo'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Favicon dinámico desde el logo
const ensureFavicon = () => {
  const link = document.querySelector("link[rel='icon']") || document.createElement('link');
  link.setAttribute('rel', 'icon');
  link.setAttribute('type', 'image/png');
  link.setAttribute('href', FTT_LOGO);
  if (!link.parentNode) document.head.appendChild(link);
};
ensureFavicon();
