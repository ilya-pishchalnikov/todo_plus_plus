<template>
  <div class="projects-region" id="projects-region">
    <div v-for="project in projects" :key="project.id" :id="project.id" :class="{
      'project-region': project.id !== seletedProjectId,
      'project-region-selected': project.id === seletedProjectId
    }" @click="onProjectClick">
      <span>{{ project.name }}</span>
      <MoreOptionsButton :menu-items="projectMenuItems" :source-id="project.id" />
    </div>
  </div>
  <AddItemComponent @add-item="addProject" />
</template>

<script>
import { ref, inject, watch, computed } from 'vue';
import AddItemComponent from '../common/additembutton.vue';
import { modalService } from '../../js/store/modal-service.js';
import { getBrowserInstanceId } from '../../js/utils/utils.js';
import { AppEventKey } from '../../js/event/appevent-service.js';
import { DataStoreKey } from '../../js/store/datastore-service.js';
import MoreOptionsButton from '../common/more-options-button.vue';

export default {
  name: 'ProjectsComponent',
  components: {
    AddItemComponent,
    MoreOptionsButton
  },
  setup(props, { emit }) {


    const projects = ref([]);
    const seletedProjectId = ref('');
    const projectFields = [
      { name: 'name', label: 'Project Name' }
    ];
    const { instance: appEventInstance } = inject(AppEventKey);
    const { instance: dataStore, isReady } = inject(DataStoreKey);
    const projectMenuItems = computed(() => [
      { label: 'Add', action: addProject },
      { label: 'Rename', action: renameProject },
      { label: 'Remove', action: removeProject }
    ]);
    const browserInstance = getBrowserInstanceId();

    appEventInstance.onProjectAdd = onProjectAddEventRecieved;
    appEventInstance.onProjectDelete = onProjectDeleteEventRecieved;
    appEventInstance.onProjectUpdate = onProjectUpdateEventRecieved;


    async function onProjectAddEventRecieved(eventPayload) {
      await dataStore.upsertProject(eventPayload);
      await getAllProjects();
      seletedProjectId.value = eventPayload.id;
      emit('project-selected', eventPayload.id);
    }

    async function onProjectDeleteEventRecieved(eventPayload) {
      await dataStore.delete("project",eventPayload.id);
      await getAllProjects();
      if (seletedProjectId.value === eventPayload.id) {
        if (projects.value.length === 0) {
          seletedProjectId.value = "";
        } else {
          seletedProjectId.value = eventPayload.after;
        }
        emit('project-selected', selectedProject.value);
      }
    }

    async function onProjectUpdateEventRecieved (eventPayload) {
      console.log("onProjectUpdateEventRecieved 1");
      await dataStore.upsertProject(eventPayload);
      console.log("onProjectUpdateEventRecieved 2");
      await getAllProjects();
      console.log("onProjectUpdateEventRecieved 3");
    }

    async function getAllProjects() {
      if (isReady.value === false) {
        console.warn("ProjectsComponent: DataStore is not ready yet.");
      } else {
        await dataStore.getProjects().then((storedProjects) => {
          projects.value = storedProjects;
          projects.value.sort((a, b) => a.sequence - b.sequence);
          if (seletedProjectId.value === "" && projects.value.length > 0) {
            seletedProjectId.value = projects.value[0].id || '';
          }           
          if (projects.value.length === 0){
            seletedProjectId.value = '';
          }
        });
      }
    }

    watch(isReady, (isReady) => {
      if (isReady === true) {
          getAllProjects();
      }
    }, { immediate: true });

    function onProjectClick(e) {
      const clickedElement = e.target;
      let clickedProjectId = '';

      if (clickedElement.tagName === "SPAN") {
        clickedProjectId = clickedElement.parentElement.id;
      } else {
        clickedProjectId = clickedElement.id;
      }

      if (seletedProjectId.value !== clickedProjectId) {
        seletedProjectId.value = clickedProjectId;
        emit('project-selected', clickedProjectId);
      }
    }

    async function renameProject(projectId) {
      try {
        const result = await modalService.openModal(
          "Rename Project", projectFields
        );

        if (result) {
          let prevProjectId;
          let currentProjectId;

          for (let project of projects.value) {
            if (project.id === projectId) {
              currentProjectId = project.id;
              break;
            }
            prevProjectId = project.id;
          }

          const eventPayload = {
            id: currentProjectId,
            name: result.name,
            after: prevProjectId
          };

          const eventData = {
            type: "project-update",
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

    function removeProject(projectId) {
      let prevProjectId = "";
      let projectName = "";

      for (const project of projects.value) {
        if (project.id === projectId) {
          projectName = project.name;
          break;
        }
        prevProjectId = project.id;
      };

      const eventPayload = {
        id: projectId,
        name: projectName,
        after: prevProjectId
      }

      const event = {
        type: "project-delete",
        instance: browserInstance,
        payload: eventPayload
      }

      const eventJson = JSON.stringify(event);

      appEventInstance.send(eventJson);
    }


    async function addProject(prevProjectId) {
      try {
        const result = await modalService.openModal(
          "Add Project", projectFields
        );

        if (result) {

          const eventPayload = {
            id: window.crypto.randomUUID(),
            name: result.name,
            after: prevProjectId || projects.value[projects.value.length - 1]?.id || '',
          };

          const eventData = {
            type: "project-add",
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
      projects,
      seletedProjectId,
      onProjectClick,
      addProject,
      projectMenuItems
    }
  }
}
</script>