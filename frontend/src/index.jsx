import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import UsuarioProvider from './context/UsuarioProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <UsuarioProvider>
    <Router>
      <App />
    </Router>
  </UsuarioProvider>
);