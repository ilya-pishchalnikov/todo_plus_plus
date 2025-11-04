<template>
  <div class="projects-region" id="projects-region"></div>
  <div v-for="project in projects" :key="project.id" :id="project.id" :class="{
    'project-region': project.id !== seletedProjectId,
    'project-region-selected': project.id === seletedProjectId
  }" @click="onProjectClick">
    {{ project.name }}
  </div>
  <AddItemComponent @add-item="addProject" />
</template>

<script>
import { ref, inject, watch } from 'vue';
import AddItemComponent from '../common/additembutton.vue';
import { modalService } from '../../js/store/modal-service.js';
import { getBrowserInstanceId } from '../../js/utils/utils.js';
import { AppEventKey } from '../../js/event/appevent-service.js';
import { DataStoreKey } from '../../js/store/datastore-service.js';

export default {
  name: 'ProjectsComponent',
  components: {
    AddItemComponent
  },
  setup(props, { emit }) {

    const projects = ref([]);
    const seletedProjectId = ref('');
    const projectFields = [
      { name: 'name', label: 'Project Name' }
    ];
    const { instance: appEventInstance } = inject(AppEventKey);
    const { instance: dataStore, isReady } = inject(DataStoreKey);

    appEventInstance.onProjectAdd = onProjectAddEventRecieved;

    function onProjectAddEventRecieved(eventPayload) {
      const newProject = {
        id: eventPayload.id,
        name: eventPayload.name,
        sequence: projects.value.length > 0 ? projects.value[projects.value.length -1].sequence + 1 : 1
      };
      projects.value.push(newProject);
      projects.value.sort((a, b) => a.sequence - b.sequence);
      seletedProjectId.value = newProject.id;
      dataStore.upsertProject(eventPayload);
      emit('project-selected', newProject.id);
    }

    function getAllProjects() {
      if (isReady.value === false) {
        console.warn("ProjectsComponent: DataStore is not ready yet.");
      } else {
        dataStore.getProjects().then((storedProjects) => {
          projects.value = storedProjects;
          projects.value.sort((a, b) => a.sequence - b.sequence);
          if (projects.value.length > 0) {
            seletedProjectId.value = projects.value[0].id || '';
          } else {
            seletedProjectId.value = '';
          }
        });
      }
    }

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllProjects();
      }
    });

    function onProjectClick(e) {
      const clickedProjectId = e.target.id;
      if (seletedProjectId.value !== clickedProjectId) {
        seletedProjectId.value = clickedProjectId;
        emit('project-selected', clickedProjectId);
      }
    }

    function addProject() {  
      openNewProjectModal();
    }

    async function openNewProjectModal() {
      try {
        const result = await modalService.openModal(
          "Add Project",projectFields
        );
        
        if (result) {

          const browserInstance  = getBrowserInstanceId();


          const eventPayload = {
            id: window.crypto.randomUUID(),
            name: result.name,
            after: projects.value[projects.value.length -1]?.id || '',
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
      addProject
    }
  }
}
</script>