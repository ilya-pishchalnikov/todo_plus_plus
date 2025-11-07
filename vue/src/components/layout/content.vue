<template>
    <main class="main-content">
      <GroupsComponent :project-id="projectId"/>
    </main>
</template>

<script>
import GroupsComponent from '../business/groups.vue';
export default {
  name: 'ContentLayout',
  components: {
    GroupsComponent
  },
  props: {
    projectId: {
      type: String,
      required: true,
    }
  },

  setup(props, { emit }) {
    return {
    }
  }
}
</script>