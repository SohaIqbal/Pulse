import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import {AppProvider} from '../Context/AppContext.jsx';


createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>

  </AppProvider>
);
