import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styling/index.css'
import '../scripts/fetchInterceptor.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <App />
)