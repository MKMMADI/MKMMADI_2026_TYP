import { registerRootComponent } from 'expo';
import App from './src/App';

// Ensures the real navigation stack (Login → Home, etc.) loads — not the
// expo-router "first page of your app" template.
registerRootComponent(App);
