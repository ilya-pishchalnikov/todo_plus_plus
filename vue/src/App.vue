<template>
  <div id="app">
    <LoginComponent v-if="!isLoggedIn" @login-success="handleLoginSuccess"/>
    <MainLayout v-if="isLoggedIn" @signout="handleSignout" />
  </div>
</template>

<script>
import LoginComponent from './components/login/login.vue'
import MainLayout from './components/layout/main.vue'
import { onMounted, ref, computed } from 'vue'

export default {
  name: 'App',
  components: {
    LoginComponent,
    MainLayout
  },
  setup() {
    const jwtToken = ref('');
    const isLoggedIn = computed(() => !!jwtToken.value);

    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    }

    function handleLoginSuccess() {
      setTimeout(() => { jwtToken.value = getCookie('jwtToken') || ''; }, 100)
    }

    function handleSignout() {
      console.log("Signing out (app)...");
      document.cookie = `jwtToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      jwtToken.value = '';
    }

    onMounted(() => {
      jwtToken.value = getCookie('jwtToken') || '';
    });

    return {
      jwtToken,
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
