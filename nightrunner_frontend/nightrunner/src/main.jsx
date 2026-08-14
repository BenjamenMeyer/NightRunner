import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from './App.jsx'
import BrandingProvider from "@/branding/BrandingProvider.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
        <BrandingProvider>
            <App />
        </BrandingProvider>
    </BrowserRouter>
  </StrictMode>,
)
