<template>
  <HeaderLayout @signout="handleSignout" @search="handleSearch"/>

  <div class="content-wrapper">
    <SidebarLayout 
      @project-selected="handleProjectSelected"
      ref="sidebarRef"
    />
    <ContentLayout :project-id="projectId" :search-term="searchTerm" ref="contentRef"/>
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
    const sidebarRef = ref(null);
    const contentRef = ref(null);
    const searchTerm = ref("");

    function handleSearch(term) {
      searchTerm.value = term;
    }

    function handleSignout() {
      emit('signout');
    };

    function handleProjectSelected(selectedProjectId) {
      projectId.value = selectedProjectId;
    }

    return {
      handleSignout,
      handleProjectSelected,
      showPopup,
      modalService,
      projectId,
      sidebarRef,
      contentRef,
      searchTerm,
      handleSearch
    }
  }
}
</script>