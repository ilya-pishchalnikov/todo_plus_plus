<template>
  <aside class="sidebar">
    <ProjectsComponent @project-selected="handleProjectSelected" @project-clicked="handleProjectClicked" ref="projectsRef"/>
  </aside>
</template>

<script>
import ProjectsComponent from '../business/projects.vue';
import { defineEmits, ref } from 'vue';
export default {
  name: 'SidebarLayout',
  components: {
    ProjectsComponent
  },
  setup(props, { emit }) {

    const projectsRef = ref(null);

    function handleProjectSelected(projectId) {
      emit('project-selected', projectId)
    }

    function handleProjectClicked(projectId) {
      emit('project-clicked');
    }

    function selectPreviousProject() {
      projectsRef.value.selectPreviousProject();
    }

    function selectNextProject() {
      projectsRef.value.selectNextProject();
    }

    function navigateIntoProject() {
      return projectsRef.value.navigateIntoProject();
    }

    function scrollToSelectedProject() {
      projectsRef.value.scrollToSelectedProject();
    }

    function editProject() {
      projectsRef.value.editProject();
    }

    return {
      handleProjectSelected,
      handleProjectClicked,
      selectPreviousProject,
      selectNextProject,
      navigateIntoProject,
      scrollToSelectedProject,
      editProject,
      projectsRef
    }

  }
}
</script>