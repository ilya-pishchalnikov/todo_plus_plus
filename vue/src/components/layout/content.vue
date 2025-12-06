<template>
    <main class="main-content">
      <GroupsComponent :project-id="projectId" :search-term="searchTerm" ref="groupsRef"/>
    </main>
</template>

<script>
import GroupsComponent from '../business/groups.vue';
import { ref } from 'vue';
export default {
  name: 'ContentLayout',
  components: {
    GroupsComponent
  },
  props: {
    projectId: {
      type: String,
      required: true,
    },
    searchTerm: {
      type: String,
      default: ""
    }
  },

  setup(props, { emit }) {

    return {
    }
  }
}
</script>