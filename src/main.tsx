import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
// 顶部新增：
import { Toaster } from 'react-hot-toast'

// ReactDOM.createRoot(...).render(
<>
  <App />
  <Toaster position="top-center" />
</>

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
