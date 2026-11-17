import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.jsx';
import './styles/index.css';
import { FavoritesProvider } from './contexts/FavoritesContext.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><FavoritesProvider><App /></FavoritesProvider></BrowserRouter></React.StrictMode>);
