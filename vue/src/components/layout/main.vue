<template>
  <HeaderLayout @signout="handleSignout"/>

  <div class="content-wrapper">
    <SidebarLayout />
    <ContentLayout />
  </div>

  <div v-if="showPopup" class="popup" id="popup"></div>
  
  <DataInputPopup
    v-if="modalService.state.isVisible"
    :title="modalService.state.title"
    :fields="modalService.state.fields"
    @data-saved="modalService.handleSave"  
    @cancel="modalService.handleCancel"
  />

</template>

<script>
import { defineEmits, ref } from 'vue';
import HeaderLayout from './header.vue';  
import SidebarLayout from './sidebar.vue';  
import ContentLayout from './content.vue';  
import DataInputPopup from '../common/datainputpopup.vue';
import { modalService } from '../../js/store/modal-service.js';

export default {
  name: 'MainLayout',
  components: {
    HeaderLayout,
    SidebarLayout,
    ContentLayout,
    DataInputPopup
  },
  setup(props, {emit}) {

    const showPopup = ref(false);

    function handleSignout() {
      console.log("Signing out (main)...");
      emit('signout');
    };

    return {
      handleSignout,
      showPopup,
      modalService
    }
  }
}
</script>