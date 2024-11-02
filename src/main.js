// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; 
import { createPinia } from 'pinia';

const app = createApp(App);

app.use(createPinia());
app.use(router); // Register the router with the app
app.mount('#app');
