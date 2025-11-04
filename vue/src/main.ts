import { createApp } from 'vue'
// @ts-ignore: no declaration file for .vue files
import App from './App.vue'

import { AppEventService, AppEventKey } from './js/event/appevent-service.js';

import './assets/style.css'

const app = createApp(App)

app.provide(AppEventKey, AppEventService);

app.mount('#app')
