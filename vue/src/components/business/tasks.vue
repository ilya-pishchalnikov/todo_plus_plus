<template>
  <div class="task-list-region">
    <div v-for="(task, index) in filteredTasks" :id="task.id" :key="task.id" :class="{
      'task-region': true,
      'todo': task.status == 1,
      'inprogress': task.status == 2,
      'done': task.status == 3,
      'cancelled': task.status == 4
    }"
      draggable="true"
      @dragstart="onDragStart($event, task.id)"
      @dragenter.prevent
      @dragover="dragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @dragend="onDragEnd"
    >
      <img class="task-status-img" :src="getStatusIcon(task.status)" :id="'ti-' + task.id" @click="statusImgOnClick" />
      <span class="task-text" v-if="!task.isEditing" @click="taskTextClick" :id="'tt-'+task.id" v-html="highlightText(task.text)">
      </span>
      <input v-else 
        :id="'te-'+task.id"
        v-model="task.text"
        @blur="saveTaskText"
        @keydown.enter="saveTaskText"
        @keydown.escape="cancelTaskText"
        @keydown="onTaskInputKeyDown"
      />
      <div class="tasks-actions">
        <MoreOptionsButton :menu-items="taskMenuItems" :source-id="task.id" />
      </div>
    </div>
    <AddItemComponent @add-item="addTask" :text="'Add Task'" ref="addTaskRef"/>
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
import { scrollElementIntoView } from '../../js/utils/utils.js'

export default {
  name: 'TasksComponent',
  props: {
    groupId: {
      type: String,
      required: true,
    },
    searchTerm: {
      type: String,
      default: ""
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

    const draggingTaskId = ref(null); // State for dragging task ID
    const addTaskRef = ref(null);
    const isEditing = ref(false);


    appEventInstance.onTaskAdd.push(onTaskAddEventRecieved);
    appEventInstance.onTaskUpdate.push(onTaskUpdateEventReceived);
    appEventInstance.onTaskDelete.push(onTaskDeleteEventReceived);

    const filteredTasks = computed(() => {
      if (!props.searchTerm) {
        return tasks.value;
      }
      const term = props.searchTerm.toLowerCase();
      return tasks.value.filter(task => task.text.toLowerCase().includes(term));
    });

    watch(filteredTasks, (newTasks) => {
      emit('visible-count-change', newTasks.length);
    }, { immediate: true });

    function highlightText(text) {
      if (!props.searchTerm) return text;
      const regex = new RegExp(`(${props.searchTerm})`, 'gi');
      return text.replace(regex, '<span class="highlight">$1</span>');
    }

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllTasks(props.groupId);
      }
    }, { immediate: true });




    async function editTask() {
      addTask();
    }


    function getStatusIcon(status) {
      return statusIcons[Number(status)] || statusIcons[1];
    }


    async function getAllTasks(groupId) {
      let edinigTaskIndex;
      if (tasks.value) {
        edinigTaskIndex = tasks.value.findIndex(task => task.isEditing);
      }

      if (isReady.value === false && groupId) {
        console.warn("TasksComponent: DataStore is not ready yet.");
      } else {
        await dataStore.getTasksByGroupId(groupId).then((storedTasks) => {
          tasks.value = storedTasks;
          tasks.value.sort((a, b) => a.sequence - b.sequence);
        });
      }

      if (edinigTaskIndex >= 0) {
        tasks.value[edinigTaskIndex].isEditing = true;
        nextTick(() => {document.getElementById("te-" + tasks.value[edinigTaskIndex].id).focus();});
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
      e.stopPropagation();
      const taskId = e.target.id.slice(3);
      const task = tasks.value.find(task => task.id === taskId);
      if (task) {
        task.isEditing = true;
        isEditing.value = true;
        emit('task-click', props.groupId);
        await nextTick();
        document.getElementById("te-" + taskId).focus();
      }
    }

    async function saveTaskText(e){
      e.stopPropagation();
      const taskId = e.target.id.slice(3);
      const text = e.target.value;
      saveTask(taskId, text);
      isEditing.value = false;
    }

    function saveTask(taskId, text) {
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
          text: text,
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
      isEditing.value = false;
      await getAllTasks(props.groupId);
    }

    function onTaskInputKeyDown(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopPropagation();
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        cancelTaskText(e);
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

    // --- Drag and Drop Logic ---

    function onDragStart(event, taskId) {
      draggingTaskId.value = taskId;
      event.dataTransfer.effectAllowed = 'move';
      
      const task = tasks.value.find(t => t.id === taskId);
      
      // Pass the task ID and its source group ID and project ID (which is not directly available, but not required for drag to Project)
      event.dataTransfer.setData('taskId', taskId);
      event.dataTransfer.setData('sourceGroupId', props.groupId);
      // Data to identify if it's a task being dragged
      event.dataTransfer.setData('dragType', 'task');

      nextTick(() => {
       event.target.classList.add('dragging');
        event.target.style.opacity = '0.5';
      });
    }

    function dragOver(event) {
      event.preventDefault();
      // Only allow drag-over effect if a task is being dragged
      if (event.dataTransfer.getData('dragType') === 'task') {
        const target = event.target.closest('.task-region');
        if (target && target.id !== draggingTaskId.value) {
          document.querySelectorAll('.task-region').forEach(el => {
            el.classList.remove('drag-over');
          });
          target.classList.add('drag-over');
        }
      }
    }

    function onDragLeave(event) {
      event.target.classList.remove('drag-over');
    }

    function onDrop(event) {
      event.preventDefault();
      event.stopPropagation();
      
      document.querySelectorAll('.task-region').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('dragging');
        el.style.opacity = '1';
      });
      
      // Only proceed if it was a task drag-n-drop
      if (event.dataTransfer.getData('dragType') !== 'task') {
        draggingTaskId.value = null;
        return;
      }
      
      const draggedId = event.dataTransfer.getData('taskId');
      const sourceGroupId = event.dataTransfer.getData('sourceGroupId');
      const target = event.target.closest('.task-region');
      const targetId = target ? target.id : '';
      const newGroupId = props.groupId; // The component's current group ID

      if (!draggedId) {
        draggingTaskId.value = null;
        return;
      }
      
      // If dropping onto a task in the same group, calculate the new sequence position
      if (targetId && sourceGroupId === newGroupId) {
          if (draggedId === targetId) {
              draggingTaskId.value = null;
              return;
          }
          
          let newAfterId = '';
          const draggingIndex = tasks.value.findIndex(t => t.id === draggedId);
          const targetIndex = tasks.value.findIndex(t => t.id === targetId);

          if (draggingIndex !== -1 && targetIndex !== -1) {
              if (draggingIndex < targetIndex) {
                  // Dragging down: New 'after' is the target task ID
                  newAfterId = targetId;
              } else {
                  // Dragging up: New 'after' is the ID of the task before the target task
                  newAfterId = tasks.value[targetIndex - 1]?.id || '';
              }
          }
          
          moveTaskToNewPosition(draggedId, newAfterId, newGroupId);
          
      } else if (!targetId && sourceGroupId === newGroupId) {
          // Dropping into the empty space at the bottom of the *same* group
          const lastTask = tasks.value.slice().reverse().find(t => t.id !== draggedId);
          const newAfterId = lastTask ? lastTask.id : '';
          
          if (newAfterId === draggedId) {
              draggingTaskId.value = null;
              return;
          }
          
          moveTaskToNewPosition(draggedId, newAfterId, newGroupId);
          
      } else if (targetId && sourceGroupId !== newGroupId) {
          // Dropping onto a task in a *different* group
          // The dragged task should be inserted relative to the target task in the new group.
          
          let newAfterId = '';
          const targetIndex = tasks.value.findIndex(t => t.id === targetId);

          if (targetIndex !== -1) {
              // New 'after' is the ID of the task before the target task in the *new* group.
              newAfterId = tasks.value[targetIndex - 1]?.id || '';
          }
          
          // Move to new group and position
          moveTaskToNewPosition(draggedId, newAfterId, newGroupId);
          
      } else {
          // This covers dropping into the empty space of an *empty* or *different* group
          // If the group is empty, newAfterId will be ''. If not empty, dropping into the space below the last task is not handled here
          // This case is primarily for an empty target group.
          
          if (tasks.value.length === 0) {
              moveTaskToNewPosition(draggedId, '', newGroupId);
          }
          // Dropping onto the component boundary without hitting a task is tricky, 
          // the 'groups.vue' component has a specific dragOverParent/onDropParent for this.
      }
      
      draggingTaskId.value = null;
    }

    function onDragEnd(event) {
      event.target.classList.remove('dragging');
      event.target.style.opacity = '1';

      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
      
      draggingTaskId.value = null;
    }
    
    // Function to send the task-update event for position change
    async function moveTaskToNewPosition(taskId, afterId, newGroupId) {
      let taskToMove;
      
      // Need to fetch the task data, especially if it was dragged from a different group (tasks.value won't have it).
      // A more robust solution would be to pass the task's text and status in dataTransfer, but for now, we rely on the dataStore for cross-group moves.
      if (tasks.value.find(t => t.id === taskId)) {
         taskToMove = tasks.value.find(t => t.id === taskId);
      } else {
          // Fetch task from DataStore if it's not in the current list (i.e., cross-group move)
          await dataStore.getTasks()
            .then(tasks => {
              taskToMove = tasks.find(t => t.id === taskId);
            });
      }

      if (!taskToMove) {
          console.error("Task to move not found:", taskId);
          return;
      }
      
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

    // --- End Drag and Drop Logic ---


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
      filteredTasks,
      addTaskRef,
      taskMenuItems,
      highlightText,
      onTaskAddEventRecieved,
      addTask,
      statusImgOnClick,
      getStatusIcon,
      taskTextClick,
      saveTaskText,
      cancelTaskText,
      onDragStart,
      dragOver,
      onDragLeave,
      onDrop,
      onDragEnd,
      editTask,
      onTaskInputKeyDown
    }
  }
}
</script>