import IndexedDBDataStore from './datastore.js'; 
import { ref } from 'vue';
import apiClient from '../../js/utils/apiClient.js';

const dataStoreInstance = new IndexedDBDataStore();

const isReady = ref(false);
let isStarted = false;


async function initDataStore() {
    if (isReady.value || isStarted) return;

    isStarted = true;
    
    await dataStoreInstance.init("DataStore", 1);

    if (await fetchAllUserData()) {
        console.log("DataStoreService: Data store is ready.");
        isReady.value = true;
    } else {
        console.error("DataStoreService: Failed to initialize data store.");
    }

    isStarted = false;
}
/**
 * Fetches complete user data from the server and persists it in IndexedDB.
 *
 * Retrieves the user"s full dataset including projects, groups, and tasks by making a GET request
 * to the "/api/all_user_data" endpoint. The response data is then stored in IndexedDB for offline use.
 * @returns {boolean} True if data fetching and storing was successful, false otherwise.
 */
async function fetchAllUserData() {
    try {
        const response = await apiClient.get('/all_user_data'); 

        await dataStoreInstance.clean();
        if (response.data.projects) {
            dataStoreInstance.insertProjects(response.data.projects);
        }
        if (response.data.groups) {
            dataStoreInstance.insertTaskGroups(response.data.groups);
        }
        if (response.data.tasks) {
            dataStoreInstance.insertTasks(response.data.tasks);
        }
    } catch (error) {
        console.error("Failed to fetch all data:", error);
        return false;
    }
    return true;
}

async function clean() {
    isReady = false;
    await dataStoreInstance.clean();
}

export const DataStoreKey = Symbol('IndexedDBDataStore');

export const DataStoreService = {
    instance: dataStoreInstance,
    isReady,
    init: initDataStore,
    clean: clean
};
