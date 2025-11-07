<template>
  <aside class="sidebar">
    <ProjectsComponent @project-selected="handleProjectSelected"/>
  </aside>
</template>

<script>
import ProjectsComponent from '../business/projects.vue';
import { defineEmits } from 'vue';
export default {
  name: 'SidebarLayout',
  components: {
    ProjectsComponent
  },
  setup(props, { emit }) {

    function handleProjectSelected(projectId) {
      emit('project-selected', projectId)
    }

    return {
      handleProjectSelected
    }

  }
}
</script>