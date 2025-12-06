<template>
  <HeaderLayout @signout="handleSignout" @search="handleSearch"/>

  <div class="content-wrapper">
    <SidebarLayout 
      @project-selected="handleProjectSelected"
      @project-clicked="handleProjectClicked"
      ref="sidebarRef"
    />
    <ContentLayout :project-id="projectId" :search-term="searchTerm" @group-click="onGroupClick" @task-click="onTaskClick" ref="contentRef"/>
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
    const selectedElementType = ref("project");
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

    function handleProjectClicked() {
      selectedElementType.value = "project";
    }

    function onGroupClick() {
      selectedElementType.value = "group";
    }

    function onTaskClick() {
      selectedElementType.value = "task";
    }

    return {
      handleSignout,
      handleProjectSelected,
      handleProjectClicked,
      onGroupClick,
      onTaskClick,
      showPopup,
      modalService,
      projectId,
      selectedElementType,
      sidebarRef,
      contentRef,
      searchTerm,
      handleSearch
    }
  }
}
</script>