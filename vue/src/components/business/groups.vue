<template>
  <div class="groups-region" id="groups-region" @dragover.prevent="dragOverParent" @drop="onDropParent"
    @dragleave="onDragLeaveParent">
    <div v-for="(group, index) in groups" :key="group.id" :id="group.id" 
      v-show="isGroupVisible(group.id)"
      :class="{
        'group-region':true,
        'selected': index == selectedGroupIndex && !isTaskSelected
      }"
      @click="onGroupClick"
      draggable="true" @dragstart="onDragStart($event, group.id)" @dragenter.prevent @dragover="dragOver"
      @dragleave="onDragLeave" 
      @drop="onDrop" 
      @dragend="onDragEnd"      
      >
      <div class="group-header-region">
        <span v-if="!group.isEditing" class="group-header-text" @click="groupHeaderClick" :id="'gh-' + group.id">
          {{ group.name }}
        </span>
        <input v-else :id="'ge-' + group.id" v-model="group.name" @blur="saveGroupName" @keydown.enter="saveGroupName"
          @keydown.escape="cancelGroupName" />
        <div class="group-actions">
          <MoreOptionsButton :menu-items="groupMenuItems" :source-id="group.id" />
        </div>
      </div>
      <TasksComponent :group-id="group.id" :search-term="searchTerm" ref="tasksRef" @task-click="onTaskClick" @visible-count-change="onTaskVisibleCountChange($event, group.id)"/>
    </div>
  </div>
  <AddItemComponent v-if="projectId" @add-item="addGroup" :text="'Add Group'" ref="addGroupRef"/>
</template>

<script>
import { ref, inject, computed, watch, nextTick } from 'vue';
import MoreOptionsButton from '../common/more-options-button.vue';
import AddItemComponent from '../common/additembutton.vue';
import TasksComponent from './tasks.vue'
import { modalService } from '../../js/store/modal-service.js';
import { getBrowserInstanceId } from '../../js/utils/utils.js';
import { AppEventKey } from '../../js/event/appevent-service.js';
import { DataStoreKey } from '../../js/store/datastore-service.js';
import { scrollElementIntoView } from '../../js/utils/utils.js'

export default {
  name: 'GroupsComponent',
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
  components: {
    MoreOptionsButton,
    AddItemComponent,
    TasksComponent
  },
  setup(props, { emit }) {

    const groups = ref([]);
    const groupFields = [
      { name: 'name', label: 'Group Name' }
    ];
    const { instance: appEventInstance } = inject(AppEventKey);
    const { instance: dataStore, isReady } = inject(DataStoreKey);
    const groupMenuItems = computed(() => [
      { label: 'Add', action: addGroup },
      { label: 'Insert Before', action: insertGroup },
      { label: 'Rename', action: renameGroup },
      { label: 'Remove', action: removeGroup },
      { label: 'Move Up', action: moveUpGroup },
      { label: 'Move Down', action: moveDownGroup }
    ]);
    const browserInstance = getBrowserInstanceId();
    appEventInstance.onGroupAdd.push(onGroupAddEventRecieved);
    appEventInstance.onGroupDelete.push(onGroupDeleteEventRecieved);
    appEventInstance.onGroupUpdate.push(onGroupUpdateEventRecieved);

    const draggingGroupId = ref(null);
    const selectedGroupIndex = ref(-1);
    const addGroupRef = ref(null);
    const tasksRef = ref([]);
    const isTaskSelected = ref(false);
    const visibleTaskCounts = ref({});

    function onTaskVisibleCountChange(count, groupId) {
      visibleTaskCounts.value[groupId] = count;
    }

    function isGroupVisible(groupId) {
      if (!props.searchTerm){
        return true;
      }
      return visibleTaskCounts.value[groupId] > 0;
    }

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllGroups(props.projectId);
      }
    }, { immediate: true });

    watch(() => props.projectId, async (newProjectId) => {
      if (newProjectId) {
        selectedGroupIndex.value = -1;
        await getAllGroups(props.projectId);
      }
    }, { immediate: true });

    watch(selectedGroupIndex, (newIndex, oldIndex) => {
      if (newIndex === -2 && oldIndex !== -2) {
        addGroupRef.value.select();
        addGroupRef.value.scrollTo();
      } else if (newIndex !== -2 && oldIndex === -2) {
        addGroupRef.value.deselect();
      }

      nextTick(() => {
        scrollToSelectedGroup();
      });
    });

    function navigateIntoGroup() {
      if (groups.value.length > 0) {
        selectedGroupIndex.value = 0;
      } else {
        selectedGroupIndex.value = -2; // Add New Group
      }
    }

    function navigateOutGroup() {
      selectedGroupIndex.value = -1;
    }

    function navigateIntoTask() {      
      if(selectedGroupIndex.value >= 0) {
        const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
        taskRef.navigateIntoTask();
        isTaskSelected.value = true;
        return 'task';
      } else {
        return 'group';
      }
    }

    function navigateOutTask() {
      if(selectedGroupIndex.value >= 0) {
        const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
        taskRef.navigateOutTask();
        isTaskSelected.value = false;
        scrollToSelectedGroup();
      }
    }   

    function navigateNextGroup() {
      if (selectedGroupIndex.value < groups.value.length - 1 && selectedGroupIndex.value >= 0) {
        selectedGroupIndex.value++;
      } else if (selectedGroupIndex.value === groups.value.length - 1) {
        selectedGroupIndex.value = -2; // Add New Group
      }
    }

    function navigatePreviousGroup() {
      if (selectedGroupIndex.value > 0) {
        selectedGroupIndex.value--;
      } else if (selectedGroupIndex.value === -2 && groups.value.length > 0) { // Add New Group
        selectedGroupIndex.value = groups.value.length - 1;
      }
    }

    function navigateNextTask() {
      if(selectedGroupIndex.value >= 0) {
        const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
        const navigateResult = taskRef.navigateNextTask();
        if (navigateResult.moveToNextGroup) {
          if (selectedGroupIndex.value < groups.value.length - 1) {
            selectedGroupIndex.value++;
            const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
            taskRef.isEditing = navigateResult.editing;
            taskRef.navigateIntoTask();
          } else if (selectedGroupIndex.value === groups.value.length - 1) {
            taskRef.isEditing = navigateResult.editing;
            taskRef.navigateAddTask();
          }
        }
      }
    }

    function navigatePreviousTask() {
      if(selectedGroupIndex.value >= 0) {
        const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
        const navigateResult = taskRef.navigatePreviousTask();
        if (navigateResult.moveToPreviousGroup) {
          if(selectedGroupIndex.value > 0) {
            selectedGroupIndex.value--;
            const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
            taskRef.isEditing = navigateResult.editing;;
            taskRef.navigateAddTask();
          } else if (selectedGroupIndex.value === 0) {
            taskRef.isEditing = navigateResult.editing;
            taskRef.navigateIntoTask();
          }
        }
      }
    }

    function editGroup() {
      if (selectedGroupIndex.value >= 0) {
        renameGroup(groups.value[selectedGroupIndex.value].id);
      } else {
        addGroup();
      }
    }

    function editTask() {
      if (selectedGroupIndex.value >= 0) {
        const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
        taskRef.editTask();
      }
    }

    function onTaskClick(groupId) {
      selectedGroupIndex.value = groups.value.findIndex(group => group.id === groupId);
      isTaskSelected.value = true;
      emit('task-click');
    }

    function onGroupAddEventRecieved(event) {
      if (event.browserInstance === browserInstance) {
        return;
      }

      if (event.projectId === props.projectId) {
        getAllGroups(props.projectId);
      }
      selectedGroupIndex.value = -1;
    }

    async function getAllGroups(projectId) {
      if (isReady.value === false && projectId) {
        console.warn("ProjectsComponent: DataStore is not ready yet.");
      } else {
        await dataStore.getTaskGroupsByProjectId(projectId).then((storedGroups) => {
          groups.value = storedGroups;
          groups.value.sort((a, b) => a.sequence - b.sequence);
        });
      }
    }

    function scrollToSelectedGroup() {
      let group;

      if (selectedGroupIndex.value >= 0) {
        group = document.getElementById(groups.value[selectedGroupIndex.value].id); 
      }
      
      if (group) {
        scrollElementIntoView(group);
      } else if (selectedGroupIndex.value === -2){
        addGroupRef.value.scrollTo();
      }
    }

    function onGroupClick(event){
      const groupId = event.target.closest('.group-region')?.id;
      if (groupId) {
        if (isTaskSelected.value && selectedGroupIndex.value >= 0) {
          const taskRef = tasksRef.value.find(taskRef => taskRef.groupId === groups.value[selectedGroupIndex.value].id);
          taskRef.navigateOutTask();
          isTaskSelected.value = false;
        }
        selectedGroupIndex.value = groups.value.findIndex(group => group.id === groupId);
      }

      emit('group-click');
    }

    async function groupHeaderClick(e) {
      const groupId = e.target.id.slice(3);

      groups.value.forEach(group => group.isEditing = false);
      const group = groups.value.find(group => group.id === groupId);
      selectedGroupIndex.value = groups.value.findIndex(g => g.id === groupId);
      group.isEditing = true;

      if (group) {
        group.isEditing = true;

        await nextTick();

        const input = document.querySelector(`#ge-${groupId}`);
        if (input) {
          input.focus();
          input.select();
        }
      }
    }

    async function saveGroupName(e) {
      const groupId = e.target.id.slice(3);
      let prevGroupId = "";
      let currentGroup;

      groups.value.forEach(group => group.isEditing = false);

      for (const group of groups.value) {
        if (group.id === groupId) {
          currentGroup = group;
          break;
        }
        prevGroupId = group.id
      }

      const eventPayload = {
        id: groupId,
        name: e.target.value,
        projectid: props.projectId,
        after: prevGroupId
      };

      const eventData = {
        type: "group-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }

    function cancelGroupName(e) {
      groups.value.forEach(group => group.isEditing = false);
    }

    async function onGroupAddEventRecieved(eventPayload) {
      await dataStore.upsertGroup(eventPayload);
      await getAllGroups(props.projectId);
      selectedGroupIndex.value = groups.value.findIndex(group => group.id === eventPayload.id); 
    }

    async function onGroupDeleteEventRecieved(eventPayload) {
      await dataStore.delete("task_group", eventPayload.id);
      await getAllGroups(props.projectId);
    }

    async function onGroupUpdateEventRecieved(eventPayload) {
      await dataStore.upsertGroup(eventPayload);
      await getAllGroups(props.projectId);
    }

    async function addGroup(prevGroupId, isInsert = false) {
      try {
        if (selectedGroupIndex.value !== -2) {
          selectedGroupIndex.value = -2; // Add New Group
        }

        const result = await modalService.openModal(
          "Add Group", groupFields
        );

        if (result) {

          if (!isInsert) {
            prevGroupId = prevGroupId || groups.value[groups.value.length - 1]?.id || ''
          }

          const eventPayload = {
            id: window.crypto.randomUUID(),
            name: result.name,
            projectid: props.projectId,
            after: prevGroupId,
          };

          const eventData = {
            type: "group-add",
            instance: browserInstance,
            payload: eventPayload
          };

          const eventDataJson = JSON.stringify(eventData);

          appEventInstance.send(eventDataJson);
        }


      } catch (error) {
        console.error('Error in modal:', error);
      }
    }

    async function insertGroup(nextGroupId) {
      let prevGroupId = "";

      for (const group of groups.value) {
        if (group.id === nextGroupId) {
          break;
        }
        prevGroupId = group.id;
      }
      await addGroup(prevGroupId, true);
    }


    function removeGroup(groupId) {
      let prevGroupId = "";
      let groupName = "";

      for (const group of groups.value) {
        if (group.id === groupId) {
          groupName = group.name;
          break;
        }
        prevGroupId = group.id;
      };

      const eventPayload = {
        id: groupId,
        name: groupName,
        projectid: props.projectId,
        after: prevGroupId
      }


      const event = {
        type: "group-delete",
        instance: browserInstance,
        payload: eventPayload
      }

      const eventJson = JSON.stringify(event);

      appEventInstance.send(eventJson);
    }

    async function renameGroup(groupId) {
      try {
        const group = groups.value.find(group => group.id === groupId);
        const renameGroupFields = [
          { name: 'name', label: 'Group Name', default: group.name }
        ];

        const result = await modalService.openModal(
          "Rename Group", renameGroupFields
        );

        if (result) {
          let prevGroupId;
          let currentGroupId;
          for (const group of groups.value) {
            if (group.id === groupId) {
              currentGroupId = group.id;
              break;
            }
            prevGroupId = group.id;
          }

          const eventPayload = {
            id: currentGroupId,
            name: result.name,
            projectid: props.projectId,
            after: prevGroupId
          };

          const eventData = {
            type: "group-update",
            instance: browserInstance,
            payload: eventPayload
          };

          const eventDataJson = JSON.stringify(eventData);

          appEventInstance.send(eventDataJson);
        }


      } catch (error) {
        console.error('Error in modal:', error);
      }
    }

    async function moveUpGroup(groupId) {
      let currentGroup;
      let prevPrevGroupId = "";
      let prevGroupId = "";

      for (const group of groups.value) {
        if (group.id === groupId) {
          currentGroup = group;
          break;
        }
        prevPrevGroupId = prevGroupId;
        prevGroupId = group.id;
      }

      const eventPayload = {
        id: currentGroup.id,
        name: currentGroup.name,
        projectid: props.projectId,
        after: prevPrevGroupId
      };

      const eventData = {
        type: "group-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }

    async function moveDownGroup(groupId) {
      let currentGroup;
      let nextGroupId = "";
      let prevPrevGroupId;

      for (const group of groups.value) {
        if (currentGroup) {
          nextGroupId = group.id;
          break;
        }
        if (group.id === groupId) {
          currentGroup = group;
        }
        if (!currentGroup) {
          prevPrevGroupId = group.id;
        }
      }

      const eventPayload = {
        id: currentGroup.id,
        name: currentGroup.name,
        projectid: props.projectId,
        after: nextGroupId || prevPrevGroupId
      };

      const eventData = {
        type: "group-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }


    function onDragStart(event, groupId) {
      draggingGroupId.value = groupId;
      event.dataTransfer.effectAllowed = 'move';

      event.dataTransfer.setData('groupId', groupId);
      event.dataTransfer.setData('sourceProjectId', props.projectId);

      nextTick(() => {
        event.target.classList.add('dragging');
        event.target.style.opacity = '0.5';
      });
    }

    function dragOver(event) {
      event.preventDefault();
      const target = event.target.closest('.group-region');
      if (target && target.id !== draggingGroupId.value) {
        document.querySelectorAll('.group-region').forEach(el => {
          el.classList.remove('drag-over');
        });
        target.classList.add('drag-over');
      }
    }

    function dragOverParent(event) {
      event.preventDefault();
      document.querySelectorAll('.group-region').forEach(el => {
        el.classList.remove('drag-over');
      });
    }

    function onDragLeave(event) {
      event.target.classList.remove('drag-over');
    }

    function onDragLeaveParent(event) {
      document.querySelectorAll('.group-region').forEach(el => {
        el.classList.remove('drag-over');
      });
    }

    function onDrop(event) {
      event.preventDefault();
      event.stopPropagation();

      // Cleanup visual effects
      document.querySelectorAll('.group-region').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('dragging');
        el.style.opacity = '1';
      });

      const draggedId = event.dataTransfer.getData('groupId');
      const target = event.target.closest('.group-region');
      const targetId = target ? target.id : '';

      const taskId = event.dataTransfer.getData('taskId');
      const dragType = event.dataTransfer.getData('dragType');

      if (dragType === 'task' && taskId) {
        // TASK DROP: Dropping a task onto a group container
        const sourceGroupId = event.dataTransfer.getData('sourceGroupId');
        const newGroupId = targetId; // Target group is the one we dropped onto

        if (!newGroupId || newGroupId === sourceGroupId) {
          // Dropped onto the task list itself, or the same group, handled by tasks.vue
          return;
        }

        // Move task to new group (at the beginning, so afterId is '')
        moveTaskToNewGroup(taskId, newGroupId, '');
        draggingGroupId.value = null; // Important to reset if a group drag was happening (though it shouldn't be a task drag)
        return;
      }

      if (draggedId === targetId) return;

      let newAfterId = '';
      const draggingIndex = groups.value.findIndex(g => g.id === draggedId);
      const targetIndex = groups.value.findIndex(g => g.id === targetId);

      if (draggingIndex !== -1 && targetIndex !== -1) {
        if (draggingIndex < targetIndex) {
          newAfterId = targetId;
        } else {
          newAfterId = groups.value[targetIndex - 1]?.id || '';
        }
      }

      moveGroupToNewPosition(draggedId, newAfterId, props.projectId);
    }

    function onDropParent(event) {
      event.preventDefault();

      const draggedId = draggingGroupId.value;

      const taskId = event.dataTransfer.getData('taskId');
      const dragType = event.dataTransfer.getData('dragType');

      if (dragType === 'task' && taskId) {
        return;
      }

      if (!draggedId || event.dataTransfer.getData('groupId') !== draggedId) {
        return;
      }

      const lastGroup = groups.value.slice().reverse().find(g => g.id !== draggedId);
      const newAfterId = lastGroup ? lastGroup.id : '';

      moveGroupToNewPosition(draggedId, newAfterId, props.projectId);

      document.querySelectorAll('.group-region').forEach(el => {
        el.classList.remove('dragging');
        el.style.opacity = '1';
      });
      draggingGroupId.value = null;
    }

    function onDragEnd(event) {
      event.target.classList.remove('dragging');
      event.target.style.opacity = '1';

      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      draggingGroupId.value = null;
    }

    function moveGroupToNewPosition(groupId, afterId, newProjectId) {
      const group = groups.value.find(g => g.id === groupId) || {}; // Находим группу в текущем списке

      const eventPayload = {
        id: groupId,
        name: group.name,
        projectid: newProjectId,
        after: afterId
      };

      const eventData = {
        type: "group-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);
      appEventInstance.send(eventDataJson);
    }

    async function moveTaskToNewGroup (taskId, newGroupId, afterId) {

      if (!taskId || !newGroupId) return;

      let taskToMove;

      await dataStore.getTasks()
            .then(tasks => {
              taskToMove = tasks.find(t => t.id === taskId);
            });

      if (!taskToMove) return;

      const eventPayload = {
        id: taskId,
        text: taskToMove.text,
        status: String(taskToMove.status),
        group: newGroupId,
        after: afterId
      };

      const eventData = {
        type: "task-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);
      appEventInstance.send(eventDataJson);
    }

    return {
      groups,
      groupMenuItems,
      selectedGroupIndex,
      isTaskSelected,
      addGroupRef,
      tasksRef,
      onGroupAddEventRecieved,
      addGroup,
      groupHeaderClick,
      onGroupClick,
      saveGroupName,
      cancelGroupName,
      insertGroup,
      renameGroup,
      removeGroup,
      moveUpGroup,
      moveDownGroup,
      onDragStart,
      dragOver,
      onDragLeave,
      onDrop,
      onDropParent,
      onDragLeaveParent,
      dragOverParent,
      onDragEnd,
      navigateIntoGroup,
      navigateOutGroup,
      navigateNextGroup,
      navigatePreviousGroup,
      navigateIntoTask,
      navigateOutTask,
      navigateNextTask,
      navigatePreviousTask,
      editGroup,
      editTask,
      editTask,
      onTaskClick,
      onTaskVisibleCountChange,
      isGroupVisible
    }
  }
}
</script>