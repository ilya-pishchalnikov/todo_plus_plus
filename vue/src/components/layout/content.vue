<template>
    <main class="main-content">
      <GroupsComponent :project-id="projectId" :search-term="searchTerm" @group-click="onGroupClick" @task-click="onTaskClick" ref="groupsRef"/>
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

    const groupsRef = ref(null);

    function onGroupClick(group) {
      emit('group-click', group);
    }

    function onTaskClick() {
      emit('task-click');
    }

    return {
      groupsRef,
      onGroupClick,
      onTaskClick
    }
  }
}
</script>