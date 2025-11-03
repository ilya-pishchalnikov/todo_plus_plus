<template>
  <HeaderLayout @signout="handleSignout"/>

  <div class="content-wrapper">
    <SidebarLayout />
    <ContentLayout />
  </div>

  <div v-if="showPopup" class="popup" id="popup"></div>

</template>

<script>
import HeaderLayout from './header.vue';  
import SidebarLayout from './sidebar.vue';  
import ContentLayout from './content.vue';  
import { defineEmits, ref } from 'vue';

export default {
  name: 'MainLayout',
  components: {
    HeaderLayout,
    SidebarLayout,
    ContentLayout
  },
  setup(props, {emit}) {

    const showPopup = ref(false);

    function handleSignout() {
      console.log("Signing out (main)...");
      emit('signout');
    } 


    return {
      handleSignout,
      showPopup
    }
  }
}
</script>