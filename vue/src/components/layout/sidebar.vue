<template>
  <aside class="sidebar">
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