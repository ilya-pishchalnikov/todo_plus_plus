<template>
  <header class="menu-bar" id="menu-bar">
    <div class="logo">
      <img src="../../assets/todo_logo.png" alt="TODO++" class="logo-image" height="60" width="224" />
    </div>
    <div class="menu-upper" id="menu-upper">
      <div class="menu-upper-item-right" id="menu-upper-item-search">
        <input class="input-search" id="input-search" type="text" placeholder="Search" />
      </div>
      <div class="menu-upper-item-right hyperlink-style" id="menu-upper-item-signout" @click="handleSignout">
        Sign out
      </div>
      <div class="menu-upper-item-right online-indicator" id="menu-upper-item-online-indicator" v-bind:style="onlineStyle">{{ onlineIndicator }}</div>
    </div>
    <!--div class="menu-main" id="menu-main"></div-->
  </header>
</template>

<script>
import {defineEmits, ref, computed, inject } from 'vue';
import { AppEventKey } from '../../js/event/appevent-service';

export default {
  name: 'HeaderLayout',
  setup(props, {emit}) {

    const { isConnected } = inject(AppEventKey);

    const onlineIndicator = computed(() => {
      return isConnected.value ? "online 🟢" : "offline 🔴";
    });

    const onlineStyle = computed(() => {
      return {
        color: isConnected.value ? "green" : "red"
      }
    });



    function handleSignout() {
      console.log("Signing out...");
      //document.cookie = `jwtToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      emit('signout');
    }



    return {
      handleSignout,
      onlineIndicator,
      onlineStyle
    }
  }
}
</script>