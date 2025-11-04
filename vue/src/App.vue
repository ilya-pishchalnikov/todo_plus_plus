<template>
  <div id="app">
    <LoginComponent v-if="!isAuthentiticated" @login-success="handleLoginSuccess" />
    <MainLayout v-if="isAuthentiticated" @signout="handleSignout" />
  </div>
</template>

<script>
import LoginComponent from './components/login/login.vue';
import MainLayout from './components/layout/main.vue';
import apiClient from './js/utils/apiClient.js';
import { onMounted, ref, onUnmounted, inject, provide } from 'vue';
import { AppEventKey } from './js/event/appevent-service';
import { DataStoreService, DataStoreKey } from './js/store/datastore-service.js';

export default {
  name: 'App',
  components: {
    LoginComponent,
    MainLayout
  },
  setup() {

    const isAuthentiticated = ref(false);

    const { instance: appEventInstance } = inject(AppEventKey);
    provide(DataStoreKey, DataStoreService);

    async function fetchIsAuthentiticated() {
      try {
        const response = await apiClient.get('/check_auth');
        return response.status === 200;
      } catch (error) {
        return false;
      }
    }

    async function handleLoginSuccess() {
      isAuthentiticated.value = await fetchIsAuthentiticated();

      if (isAuthentiticated.value) {
        appEventInstance.connect();
        DataStoreService.init();
      }
    }

    function handleSignout() {
      isAuthentiticated.value = false;
      if (appEventInstance.isConneceted()) {
        appEventInstance.disconnect();
      }
      DataStoreService.clearAllData();
    }

    onMounted(async () => {
      isAuthentiticated.value = await fetchIsAuthentiticated();
      if(isAuthentiticated.value) {
        appEventInstance.connect();
        DataStoreService.init();
      }
    });

    onUnmounted(() => {
      if (appEventInstance.isConneceted()) {
        appEventInstance.disconnect();
      }
    });

    return {
      isAuthentiticated,
      handleLoginSuccess,
      handleSignout
    }
  }
}
</script>

<style>
@import './assets/style.css';
</style>
