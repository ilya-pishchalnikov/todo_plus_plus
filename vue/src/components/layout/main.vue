<template>
  <HeaderLayout @signout="handleSignout"/>

  <div class="content-wrapper">
    <SidebarLayout 
      @project-selected="handleProjectSelected"
      @project-clicked="handleProjectClicked"
      ref="sidebarRef"
    />
    <ContentLayout :project-id="projectId" @group-click="onGroupClick" @task-click="onTaskClick" ref="contentRef"/>
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

    function handleSignout() {
      emit('signout');
    };

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        if (modalService.state.isVisible) {
          modalService.handleCancel();
        } else {
          navigateOut();
        }
      }

      if(event.key === "ArrowUp") {
        navigatePrevious();
      }
 
      if(event.key === "ArrowDown") {
        navigateNext();
      }

      if (event.key === "ArrowLeft") {
        navigateOut();
      }

      if (event.key === "ArrowRight") {
        navigateInto();
      }

      if (event.key === "Enter") {  
        event.preventDefault();
        navigateEdit();
      }
    }

    function navigateInto() {
      if (selectedElementType.value === "project") {
        selectedElementType.value = sidebarRef.value.navigateIntoProject();
        if (selectedElementType.value === "group") {
          contentRef.value.navigateIntoGroup();
        }
      } else if (selectedElementType.value === "group") {
        selectedElementType.value = contentRef.value.navigateIntoTask();
      }

    }

    function navigateOut() {
      if (selectedElementType.value === "group") {
        contentRef.value.navigateOutGroup();
        selectedElementType.value = "project";
        sidebarRef.value.scrollToSelectedProject();
      }
      if (selectedElementType.value === "task") {
        contentRef.value.navigateOutTask();
        selectedElementType.value = "group";
      }
    }

    function navigateNext() {
      if (selectedElementType.value === "project") {
        sidebarRef.value.selectNextProject();
      } else if (selectedElementType.value === "group") {
        contentRef.value.navigateNextGroup();
      } else if (selectedElementType.value === "task") {
        contentRef.value.navigateNextTask();
      }
    }

    function navigatePrevious() {
      if (selectedElementType.value === "project") {
        sidebarRef.value.selectPreviousProject();
      } else if (selectedElementType.value === "group") {
        contentRef.value.navigatePreviousGroup();
      }else if (selectedElementType.value === "task") {
        contentRef.value.navigatePreviousTask();
      }
    }

    function navigateEdit() {
      if (selectedElementType.value === "project") {
        sidebarRef.value.editProject();
      } else if (selectedElementType.value === "group") {
        contentRef.value.editGroup();
      } else if (selectedElementType.value === "task") {
        contentRef.value.editTask();
      }
    }

    function handleProjectSelected(selectedProjectId) {
      projectId.value = selectedProjectId;
    }

    function handleProjectClicked() {
      if (selectedElementType.value = "task") {
        contentRef.value.navigateOutTask();
        contentRef.value.navigateOutGroup();
      } else if (selectedElementType.value === "group") {
        contentRef.value.navigateOutGroup();
      }
      selectedElementType.value = "project";
    }

    function onGroupClick() {
      selectedElementType.value = "group";
    }

    function onTaskClick() {
      selectedElementType.value = "task";
    }

    onMounted(async () => {
      window.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(async () => {
      window.removeEventListener('keydown', handleKeydown);
    })

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
      contentRef
    }
  }
}
</script>