<template>
  <div class="task-list-region">
    <div v-for="task in tasks" :id="task.id" :key="task.id" :class="'task-region',
    {
      'todo': task.status === 1,
      'inprogress': task.status === 2,
      'done': task.status === 3,
      'cancelled': task.status === 4,
    }">
      <img class="task-status-img" :src="getStatusIcon(task.status)" :id="'ti-' + task.id" @click="statusImgOnClick" />
      <span>{{ task.text }}</span>
    </div>
    <AddItemComponent @add-item="addTask" :text="'Add Task'" />
  </div>
</template>

<script>
import { ref, watch, inject } from 'vue'
import AddItemComponent from '../common/additembutton.vue';
import { AppEventKey } from '../../js/event/appevent-service.js';
import { DataStoreKey } from '../../js/store/datastore-service.js';
import { getBrowserInstanceId } from '../../js/utils/utils.js';
import { modalService } from '../../js/store/modal-service.js';

import todoIcon from '../../assets/todo.svg';
import inprogressIcon from '../../assets/inprogress.svg';
import doneIcon from '../../assets/done.svg';
import cancelledIcon from '../../assets/cancelled.svg';

export default {
  name: 'TasksComponent',
  props: {
    groupId: {
      type: String,
      required: true,
    }
  },
  components: {
    AddItemComponent,
  },

  setup(props, { emit }) {
    const { instance: appEventInstance } = inject(AppEventKey);
    const { instance: dataStore, isReady } = inject(DataStoreKey);
    const tasks = ref([]);
    const taskFields = [
      { name: 'text', label: 'Task Text' }
    ];
    const browserInstance = getBrowserInstanceId();
    const statusIcons = {
      1: todoIcon,
      2: inprogressIcon,
      3: doneIcon,
      4: cancelledIcon
    };
    appEventInstance.onTaskAdd.push(onTaskAddEventRecieved);
    appEventInstance.onTaskUpdate.push(onTaskUpdateEventReceived);

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllTasks(props.groupId);
      }
    }, { immediate: true });

    function getStatusIcon(status) {
      return statusIcons[Number(status)] || statusIcons[1];
    }


    async function getAllTasks(groupId) {
      if (isReady.value === false && groupId) {
        console.warn("TasksComponent: DataStore is not ready yet.");
      } else {
        await dataStore.getTasksByGroupId(groupId).then((storedTasks) => {
          tasks.value = storedTasks;
          tasks.value.sort((a, b) => a.sequence - b.sequence);
        });
      }
    }

    async function statusImgOnClick(e) {
      const taskId = e.target.id.substring(3);
      let task;
      let prevTaskId = "";

      for (const currentTask of tasks.value) {
        if (currentTask.id === taskId) {
          task = currentTask;
          break;
        }
        prevTaskId = currentTask.id;
      }

      let newStatus = Number(task.status) + 1;
      if (newStatus == 5) {
        newStatus = 1;
      }

      const eventPayload = {
        id: task.id,
        text: task.text,
        group: task.group,
        status: String(newStatus),
        after: prevTaskId,
      };

      const eventData = {
        type: "task-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }

    async function addTask(prevTaskId, isInsert = false) {
      try {
        const result = await modalService.openModal(
          "Add Task", taskFields
        );

        if (result) {

          if (!isInsert) {
            prevTaskId = prevTaskId || tasks.value[tasks.value.length - 1]?.id || ''
          }

          const eventPayload = {
            id: window.crypto.randomUUID(),
            text: result.text,
            group: props.groupId,
            status: "1",
            after: prevTaskId,
          };

          const eventData = {
            type: "task-add",
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

    async function onTaskAddEventRecieved(eventPayload) {
      await dataStore.upsertTask(eventPayload);
      await getAllTasks(props.groupId);
    }

    async function onTaskUpdateEventReceived(eventPayload) {
      const taskIndex = tasks.value.findIndex(task => task.id === eventPayload.id);
      if (taskIndex !== -1 || eventPayload.group === props.groupId) {
        await dataStore.upsertTask(eventPayload);
        await getAllTasks(props.groupId);
      }
    }

    return {
      tasks,
      addTask,
      statusImgOnClick,
      getStatusIcon
    }
  }
}
</script>