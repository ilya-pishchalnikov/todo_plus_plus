<template>
  <div id="app">
    <LoginComponent v-if="!isLoggedIn" @login-success="handleLoginSuccess"/>
    <MainLayout v-if="isLoggedIn" @signout="handleSignout" />
  </div>
</template>

<script>
import LoginComponent from './components/login/login.vue'
import MainLayout from './components/layout/main.vue'
import apiClient from './js/utils/apiClient.js';
import { onMounted, ref, computed } from 'vue'

export default {
  name: 'App',
  components: {
    LoginComponent,
    MainLayout
  },
  setup() {
    
    const isLoggedIn = computed(() => isAuthentificated);

    const isAuthentificated = ref(false);

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
    }

    function handleSignout() {
      isAuthentificated.value = false;
    }

    onMounted(() => {
      isAuthentificated.value = fetchIsAuthentificated();
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
