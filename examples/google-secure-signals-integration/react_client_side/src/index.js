import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import SecureSignalsApp from './SecureSignalsApp.tsx';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<SecureSignalsApp />);
