<template>
  <div class="groups-region" id="groups-region">
    <div v-for="group in groups" :key="group.id" :id="group.id" class="group-region" @click="onProjectClick">
      <div class="group-header-region">
        <span class="group-header-text">{{ group.name }}</span>
        <div class="group-actions">
          <MoreOptionsButton :menu-items="groupMenuItems" :source-id="group.id" />
        </div>
      </div>
    </div>
  </div>
  <AddItemComponent @add-item="addGroup" />
</template>

<script>
import { ref, inject, computed, watch } from 'vue';
import MoreOptionsButton from '../common/more-options-button.vue';
import AddItemComponent from '../common/additembutton.vue';
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
    AddItemComponent
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
      // { label: 'Rename', action: renameGroup },
      // { label: 'Remove', action: removeGroup },
      // { label: 'Move Up', action: moveUpGroup },
      // { label: 'Move Down', action: moveDownGroup }
    ]);
    const browserInstance = getBrowserInstanceId();
    appEventInstance.onGroupAdd = onGroupAddEventRecieved;

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllGroups(props.projectId);
      }
    }, { immediate: true });

    watch(() => props.projectId, async (newProjectId) => {
      console.log("GroupsComponent: change project id", newProjectId);
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

    async function onGroupAddEventRecieved(eventPayload) {
      await dataStore.upsertGroup(eventPayload);
      await getAllGroups();
    }

    async function addGroup(prevGroupId) {
      try {
        const result = await modalService.openModal(
          "Add Group", groupFields
        );

        if (result) {

          const eventPayload = {
            id: window.crypto.randomUUID(),
            name: result.name,
            projectid: props.projectId,
            after: prevGroupId || groups.value[groups.value.length - 1]?.id || '',
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

    return {
      groups,
      groupMenuItems,
      addGroup
    }
  }
}
</script>