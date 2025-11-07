<template>
  <div id="app">
    <LoginComponent v-if="!isAuthenticated" @login-success="handleLoginSuccess" />
    <MainLayout v-if="isAuthenticated" @signout="handleSignout" />
  </div>
</template>

<script>
import LoginComponent from './components/login/login.vue';
import MainLayout from './components/layout/main.vue';
import apiClient from './js/utils/apiClient.js';
import { onMounted, ref, onUnmounted, inject, provide, nextTick } from 'vue';
import { AppEventKey } from './js/event/appevent-service';
import { DataStoreService, DataStoreKey } from './js/store/datastore-service.js';

export default {
  name: 'App',
  components: {
    LoginComponent,
    MainLayout
  },
  setup() {

    const isAuthenticated = ref(false);

    const { instance: appEventInstance, isConnected: isConnected } = inject(AppEventKey);
    provide(DataStoreKey, DataStoreService);


    appEventInstance.onUnauthorizedDisconnect = async (event) => {
      const response = await apiClient.get('/token_renew', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
      appEventInstance.connect();
    }

    async function fetchIsAuthenticated() {
      try {
        const response = await apiClient.get('/check_auth');
        return response.status === 200;
      } catch (error) {
        return false;
      }
    }

  async function handleLoginSuccess() {
    const authenticated = await fetchIsAuthenticated();
    if (authenticated) {
      appEventInstance.connect();
      await DataStoreService.init();
      
      isAuthenticated.value = authenticated;
      
      await nextTick();
    } else {
      console.error("Login failed - not authenticated");
    }
  }

    async function handleSignout() {
      isAuthenticated.value = false;
      await DataStoreService.clean();
      try {
        const response = await apiClient.get('/signout', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });

        if (response.status === 200 || response.status === 204) {
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error during signout request:", error);
        return true;
      }
    }

    onMounted(async () => {
      isAuthenticated.value = await fetchIsAuthenticated();
      if (isAuthenticated.value) {
        appEventInstance.connect();
        await DataStoreService.init();
      }
    });

    onUnmounted(() => {
      if (appEventInstance.isConneceted()) {
        appEventInstance.disconnect();
      }
    });

    return {
      isAuthenticated,
      handleLoginSuccess,
      handleSignout
    }
  }
}
</script>

<style>
@import './assets/style.css';
</style>
