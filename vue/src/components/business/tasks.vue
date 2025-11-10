<template>
  <div class="task-list-region">
    <div v-for="task in tasks" :id="task.id" :key="task.id" :class="{
      'task-region': true,
      'todo': task.status == 1,
      'inprogress': task.status == 2,
      'done': task.status == 3,
      'cancelled': task.status == 4,
    }">
      <img class="task-status-img" :src="getStatusIcon(task.status)" :id="'ti-' + task.id" @click="statusImgOnClick" />
      <span class="task-text" v-if="!task.isEditing" @click="taskTextClick" :id="'tt-'+task.id">
        {{ task.text }}
      </span>
      <input v-else 
        :id="'te-'+task.id"
        v-model="task.text"
        @blur="saveTaskText"
        @keydown.enter="saveTaskText"
        @keydown.escape="cancelTaskText" 
      />
      <div class="tasks-actions">
        <MoreOptionsButton :menu-items="taskMenuItems" :source-id="task.id" />
      </div>
    </div>
    <AddItemComponent @add-item="addTask" :text="'Add Task'" />
  </div>
</template>

<script>
import { ref, watch, inject, computed, nextTick } from 'vue'
import AddItemComponent from '../common/additembutton.vue';
import MoreOptionsButton from '../common/more-options-button.vue';
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
    MoreOptionsButton,
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
    const taskMenuItems = computed(() => [
      { label: 'Add', action: addTask },
      { label: 'Insert Before', action: insertTask },
      { label: 'Rename', action: renameTask },
      { label: 'Remove', action: removeTask },
      { label: 'Move Up', action: moveUpTask },
      { label: 'Move Down', action: moveDownTask }
    ]);


    appEventInstance.onTaskAdd.push(onTaskAddEventRecieved);
    appEventInstance.onTaskUpdate.push(onTaskUpdateEventReceived);
    appEventInstance.onTaskDelete.push(onTaskDeleteEventReceived);

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

    async function taskTextClick(e) {
      const taskId = e.target.id.slice(3);
      const task = tasks.value.find(task => task.id === taskId);
      if (task) {
        task.isEditing = true;
        await nextTick();
        document.getElementById("te-" + taskId).focus();
      }
    }

    async function saveTaskText(e){
      const taskId = e.target.id.slice(3);
      const text = e.target.value;
      let prevTaskId = "";
      let task;
      for (const curTask of tasks.value) {
        if (curTask.id === taskId) {
          task = curTask;
          break;
        }
        prevTaskId = curTask.id;
      }

      if (task) {
        task.isEditing = false;

        const eventPayload = {
        id: task.id,
          text: task.text,
          group: task.group,
          status: String(task.status),
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
    }

    async function cancelTaskText(e) {
      const taskId = e.target.id.slice(3);
      const task = tasks.value.find(task => task.id === taskId);
      if (task) {
        task.isEditing = false;
      }
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

    async function renameTask(taskId) {
      const task = tasks.value.find(task => task.id === taskId);

      const renameTaskFields = [
        { name: 'text', label: 'Task Text', default: task.text }
      ];

      const result = await modalService.openModal(
        "Rename Task", renameTaskFields
      );

      if (result) {
        let prevTaskId;
        let currentTask;

        for (const task of tasks.value) {
          if (task.id === taskId) {
            currentTask = task;
            break;
          }
          prevTaskId = task.id;
        }

        const eventPayload = {
          id: currentTask.id,
          text: result.text,
          status: String(currentTask.status),
          group: props.groupId,
          after: prevTaskId
        };

        const eventData = {
          type: "task-update",
          instance: browserInstance,
          payload: eventPayload
        };

        const eventDataJson = JSON.stringify(eventData);

        appEventInstance.send(eventDataJson);
      }
    }

    async function insertTask(nextTaskId) {
      let prevTaskId = "";

      for (const task of tasks.value) {
        if (task.id === nextTaskId) {
          break;
        }
        prevTaskId = task.id;
      }

      addTask(prevTaskId, true);
    }

    async function removeTask(taskId) {
      let prevTaskId = "";
      let task;

      for (const currentTask of tasks.value) {
        if (currentTask.id === taskId) {
          task = currentTask
          break;
        }
        prevTaskId = currentTask.id;
      }
      
      const eventPayload = {
        id: task.id,
        text: task.text,
        status: String(task.status),
        group: props.groupId,
        after: prevTaskId
      };

      const eventData = {
        type: "task-delete",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }

    async function moveUpTask(taskId) {
      console.log("moveUpTask", taskId);

      let prevTaskId = "";
      let prevPrevTaskId = "";
      let currentTask;

      for (const task of tasks.value) {
        if (task.id === taskId) {
          currentTask = task;
          break;
        }
        prevPrevTaskId = prevTaskId;
        prevTaskId = task.id;
      }

      const eventPayload = {
        id: currentTask.id,
        text: currentTask.text,
        status: String(currentTask.status),
        group: props.groupId,
        after: prevPrevTaskId
      };

      const eventData = {
        type: "task-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      console.log("moveUpTask eventDataJson", eventDataJson);

      appEventInstance.send(eventDataJson);
    }


    async function moveDownTask(taskId) {
      let currentTask;
      let nextTaskId = "";
      let prevPrevTaskId;

      for (const task of tasks.value) {
        if (currentTask) {
          nextTaskId = task.id;
          break;
        }
        if (task.id === taskId) {
          currentTask = task;
        }
        if (!currentTask) {
          prevPrevTaskId = task.id;
        }
      }

      const eventPayload = {
        id: currentTask.id,
        text: currentTask.text,
        status: String(currentTask.status),
        group: props.groupId,
        after: nextTaskId || prevPrevTaskId
      };

      const eventData = {
        type: "task-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }

    async function onTaskAddEventRecieved(eventPayload) {
      if (eventPayload.group === props.groupId) {
        await dataStore.upsertTask(eventPayload);
        await getAllTasks(props.groupId);
      }
    }

    async function onTaskUpdateEventReceived(eventPayload) {
      const taskIndex = tasks.value.findIndex(task => task.id === eventPayload.id);
      if (taskIndex !== -1 || eventPayload.group === props.groupId) {
        await dataStore.upsertTask(eventPayload);
        await getAllTasks(props.groupId);
      }
    }

    async function onTaskDeleteEventReceived(eventPayload) {
      const taskIndex = tasks.value.findIndex(task => task.id === eventPayload.id);
      if (taskIndex !== -1) {
        await dataStore.delete('task', eventPayload.id);
        await getAllTasks(props.groupId);
      }
    }

    return {
      tasks,
      addTask,
      statusImgOnClick,
      getStatusIcon,
      taskMenuItems,
      taskTextClick,
      saveTaskText,
      cancelTaskText
    }
  }
}
</script>