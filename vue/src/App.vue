<template>
  <div id="app">
    <LoginComponent v-if="!isLoggedIn" @login-success="handleLoginSuccess" />
    <MainLayout v-if="isLoggedIn" @signout="handleSignout" />
  </div>
</template>

<script>
import LoginComponent from './components/login/login.vue';
import MainLayout from './components/layout/main.vue';
import apiClient from './js/utils/apiClient.js';
import { onMounted, ref, computed, onUnmounted, inject, provide } from 'vue';
import { AppEventKey } from './js/event/appevent-service';
import { DataStoreService, DataStoreKey } from './js/store/datastore-service.js';

export default {
  name: 'App',
  components: {
    LoginComponent,
    MainLayout
  },
  setup() {

    const isLoggedIn = computed(() => isAuthentificated);
    const isAuthentificated = ref(false);

    const { instance: appEventInstance } = inject(AppEventKey);
    provide(DataStoreKey, DataStoreService);

    async function fetchIsAuthentificated() {
      try {
        const response = apiClient.get('/check_auth');
        return response.status === 200;
      } catch (error) {
        return false;
      }
    }

    function handleLoginSuccess() {
      isAuthentificated.value = fetchIsAuthentificated();

      if (isAuthentificated.value) {
        appEventInstance.connect();
        DataStoreService.init();
      }
    }

    function handleSignout() {
      isAuthentificated.value = false;
      if (appEventInstance.isConneceted()) {
        appEventInstance.disconnect();
      }
      DataStoreService.clearAllData();
    }

    onMounted(() => {
      isAuthentificated.value = fetchIsAuthentificated();
      DataStoreService.init();
    });

    onUnmounted(() => {
      if (appEventInstance.isConneceted()) {
        appEventInstance.disconnect();
      }
    });

    return {
      isAuthentificated,
      isLoggedIn,
      handleLoginSuccess,
      handleSignout
    }
  }
}
</script>

<style>
@import './assets/style.css';
</style>
