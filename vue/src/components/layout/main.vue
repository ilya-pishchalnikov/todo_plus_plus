<template>
  <HeaderLayout @signout="handleSignout"/>

  <div class="content-wrapper">
    <SidebarLayout @project-selected="handleProjectSelected"/>
    <ContentLayout :project-id="projectId" />
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
import { defineEmits, ref, onMounted, onUnmounted } from 'vue';
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
    const projectId = ref("");

    function handleSignout() {
      emit('signout');
    };

    function handleEscape(event) {
      if (event.key === 'Escape') {
        if (modalService.state.isVisible) {
          modalService.handleCancel();
          console.log("Modal closed by ESC key.");
        }
      }
    }

    function handleProjectSelected(selectedProjectId) {
      projectId.value = selectedProjectId;
    }

    onMounted(async () => {
      document.addEventListener('keyup', handleEscape);
    });

    onUnmounted(async () => {
      document.removeEventListener('keyup', handleEscape);
    })

    return {
      handleSignout,
      handleProjectSelected,
      showPopup,
      modalService,
      projectId
    }
  }
}
</script>