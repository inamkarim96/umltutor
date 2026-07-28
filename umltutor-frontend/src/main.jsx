import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import "./index.css";          /* Tailwind base — used by Login, Landing, auth pages */
import "./styles/index.css";   /* Modular design system — used by Student Dashboard    */
import App from './App';
import { store } from './app/store';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { AppProvider } from './contexts/AppContext';

const isDev = process.env.NODE_ENV === 'development';

createRoot(document.getElementById('root')).render(
  isDev ? (
    <StrictMode>
      <Provider store={store}>
        <AppProvider>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </AppProvider>
      </Provider>
    </StrictMode>
  ) : (
    <Provider store={store}>
      <AppProvider>
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </AppProvider>
    </Provider>
  )
);
