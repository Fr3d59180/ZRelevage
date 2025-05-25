import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Utilise localStorage
import tableReducer from './reducers/tableReducer'; // Reducer pour gérer le tableau

// Configuration de redux-persist
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['table'], // On persiste uniquement le state du tableau
};

const persistedReducer = persistReducer(persistConfig, tableReducer);

// Création du store Redux
const store = configureStore({
  reducer: persistedReducer,
});

const persistor = persistStore(store);

export { store, persistor };