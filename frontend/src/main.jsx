import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import Lists from './pages/Lists';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
        <App />
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/listas" element={<Lists />} />
      </Routes>
    </Router>
  </React.StrictMode>
);