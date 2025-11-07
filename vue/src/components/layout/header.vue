<template>
  <header class="menu-bar" id="menu-bar">
    <div class="logo">
      <img src="../../assets/todo_logo.png" alt="TODO++" class="logo-image" height="60" width="224" />
    </div>
    
    <div class="menu-upper" id="menu-upper">
      <!-- Поиск -->
      <div class="search-container">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input class="input-search" id="input-search" type="text" placeholder="Search tasks..." />
      </div>

      <!-- Выход -->
      <div class="signout-btn" @click="handleSignout" title="Sign out">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Статус -->
      <div class="status-indicator" :style="onlineStyle">
        <span class="status-dot"></span>
        {{ onlineIndicator }}
      </div>
    </div>
  </header>
</template>

<script>
import {defineEmits, ref, computed, inject } from 'vue';
import { AppEventKey } from '../../js/event/appevent-service';

export default {
  name: 'HeaderLayout',
  setup(props, {emit}) {

    const { instance: appEventInstance } = inject(AppEventKey);

    const isConnected = ref(false);

    const onlineIndicator = computed(() => {
      return isConnected.value ? "online" : "offline";
    });

    const onlineStyle = computed(() => {
      return {
        color: isConnected.value ? "green" : "red"
      }
    });


    appEventInstance.onConnect = () => {
      isConnected.value = true;
      console.log('WebSocket Connecting...')
    };
    appEventInstance.onDisconnect = () => {
      isConnected.value = false;      
      console.log('WebSocket Disconnected.');
    }

    function handleSignout() {
      emit('signout');
    }



    return {
      handleSignout,
      onlineIndicator,
      onlineStyle
    }
  }
}
</script>fix(ui/websocket): Online indicator now uses reactive service state