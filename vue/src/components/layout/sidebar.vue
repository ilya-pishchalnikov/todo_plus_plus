<template>
  <aside class="sidebar">
    <div class="sidebar-header">Projects:</div>
    <ProjectsComponent />
  </aside>
</template>

<script>
import ProjectsComponent from '../business/projects.vue';
export default {
  name: 'SidebarLayout',
  components: {
    ProjectsComponent
  },
  setup(props, { emit }) {

    return {
    }
  }
}
</script>