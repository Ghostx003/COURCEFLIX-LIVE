import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './db/database'
import './services/courseService'
import './services/progressService'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
