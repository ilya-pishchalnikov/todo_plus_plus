<template>
    <main class="main-content">
      <GroupsComponent :project-id="projectId" @group-click="onGroupClick" @task-click="onTaskClick" ref="groupsRef"/>
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
    }
  },

  setup(props, { emit }) {

    const groupsRef = ref(null);

    function navigateIntoGroup() {
      if (groupsRef.value) {
        groupsRef.value.navigateIntoGroup();
      }
    }

    function navigateOutGroup() {
      if (groupsRef.value) {
        groupsRef.value.navigateOutGroup();
      }
    }

    function navigateNextGroup() {
      if (groupsRef.value) {
        groupsRef.value.navigateNextGroup();
      }
    }

    function navigatePreviousGroup() {
      if (groupsRef.value) {
        groupsRef.value.navigatePreviousGroup();
      }
    }

    function navigateIntoTask() {
      if (groupsRef.value) {
        return groupsRef.value.navigateIntoTask();
      }
    }

    function navigateOutTask() {
      if (groupsRef.value) {
        groupsRef.value.navigateOutTask();
      }
    }

    function navigateNextTask() {
      if (groupsRef.value) {
        groupsRef.value.navigateNextTask();
      }
    }

    function navigatePreviousTask() {
      if (groupsRef.value) {
        groupsRef.value.navigatePreviousTask();
      }
    }

    function onGroupClick(group) {
      emit('group-click', group);
    }

    function editGroup (){
      if (groupsRef.value) {
        groupsRef.value.editGroup();
      }
    }

    function editTask (){
      if (groupsRef.value) {
        groupsRef.value.editTask();
      }
    }

    function onTaskClick() {
      emit('task-click');
    }

    return {
      groupsRef,
      navigateIntoGroup,
      navigateOutGroup,
      navigateNextGroup,
      navigatePreviousGroup,
      navigateIntoTask,
      navigateOutTask,
      onGroupClick,
      navigateNextTask,
      navigatePreviousTask,
      editGroup,
      editTask,
      onTaskClick
    }
  }
}
</script>