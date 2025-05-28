import React from 'react';
import ReactDOM from 'react-dom/client'; // Utilisez 'react-dom/client' pour React 18
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import TableManager from './components/TableManager';

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement); // Créez un root avec React 18
    root.render(
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <TableManager />
            </PersistGate>
        </Provider>
    );
}