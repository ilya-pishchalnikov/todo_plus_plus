<template>
  <div id="app">
    <LoginComponent />
  </div>
</template>

<script>
import LoginComponent from './components/login.vue'

export default {
  name: 'App',
  components: {
    LoginComponent
  }
}
</script>

<style>
  @import './assets/style.css';
</style>

