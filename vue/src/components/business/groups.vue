<template>
  <div class="groups-region" id="groups-region">
    <div v-for="group in groups" :key="group.id" :id="group.id" class="group-region" @click="onProjectClick">
      <div class="group-header-region">
        <span v-if="!group.isEditing" class="group-header-text" @click="groupHeaderClick" :id="'gh-' + group.id">
          {{ group.name }}
        </span>
        <input v-else
          :id="'ge-' + group.id"
          v-model="group.name"
          @blur="saveGroupName"
          @keydown.enter ="saveGroupName"
          @keydown.escape="cancelGroupName" />
        <div class="group-actions">
          <MoreOptionsButton :menu-items="groupMenuItems" :source-id="group.id" />
        </div>
      </div>
      <TasksComponent :group-id="group.id"/>
    </div>
  </div>
  <AddItemComponent @add-item="addGroup" :text="'Add Group'" />
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

export default {
  name: 'GroupsComponent',
  props: {
    projectId: {
      type: String,
      required: true,
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
    appEventInstance.onGroupAdd = onGroupAddEventRecieved;
    appEventInstance.onGroupDelete = onGroupDeleteEventRecieved;
    appEventInstance.onGroupUpdate = onGroupUpdateEventRecieved;

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllGroups(props.projectId);
      }
    }, { immediate: true });

    watch(() => props.projectId, async (newProjectId) => {
      if (newProjectId) {
        await getAllGroups(props.projectId);
      }
    }, { immediate: true });


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

    async function groupHeaderClick(e) {
      const groupId = e.target.id.slice(3);

      groups.value.forEach(group => group.isEditing = false);
      const group = groups.value.find(group => group.id === groupId);
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

    async function saveGroupName (e) {
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

      addGroup(prevGroupId, true);
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
          let prevGroupId;id="'gh-' + group.id"
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
      let prevGroupId;
      let prevPrevGroupId;
      let currentGroup;

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


    return {
      groups,
      groupMenuItems,
      onGroupAddEventRecieved,
      addGroup,
      groupHeaderClick,
      saveGroupName,
      cancelGroupName
    }
  }
}
</script>