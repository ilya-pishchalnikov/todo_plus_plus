/**
 * IndexedDBManager - Handles all application data storage and retrieval using IndexedDB
 * 
 * Provides a clean interface for:
 * - Initializing the IndexedDB database
 * - Storing user data with automatic serialization
 * - Retrieving data with various query methods
 * - Handling database versioning and upgrades
 */
class IndexedDBDataStore {
    /**
     * @constructor
     * @param {string} databaseName - Name of the IndexedDB database
     * @param {number} version - Database version (increment to trigger upgrades)
     */
    constructor(databaseName = "DataStore", version = 1) {
        this.databaseName = databaseName;
        this.version = version;
        this.db = null;
    }

    /**
     * Initializes or upgrades the IndexedDB database
     * @returns {Promise} Resolves when database is ready
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, this.version);

            request.onupgradeneeded = (event) => {
                this.onUpgradeNeeded(event);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this);
            };

            request.onerror = (event) => {
                console.error(`IndexedDB error: ${event.target.error}`);
                reject(`IndexedDB error: ${event.target.error}`);
            };
        });
    }

    /**
     * @onupgradeneeded create and upgrade database structure on version change
     * @param {string} databaseName - Name of the IndexedDB database
     * @param {number} version - Database version (increment to trigger upgrades)
     */
    onUpgradeNeeded(event) {
        const db = event.target.result;

        if (db.objectStoreNames.contains("project")) {
            db.deleteObjectStore("project")
        }
        const storeProject = db.createObjectStore("project", { keyPath: "id" });
        storeProject.createIndex("idx_sequence", "sequence", { unique: false });


        if (db.objectStoreNames.contains("task_group")) {
            db.deleteObjectStore("task_group")
        }
        const storeTaskGroup = db.createObjectStore("task_group", { keyPath: "id" });
        storeTaskGroup.createIndex("idx_projectid_sequence", ["projectid", "sequence"], { unique: false });

        if (db.objectStoreNames.contains("task")) {
            db.deleteObjectStore("task")

        }
        const storeTask = db.createObjectStore("task", { keyPath: "id" });
        storeTask.createIndex("idx_group_sequence", ["group", "sequence"], { unique: false });
    }



    /**
     * Fetches all projects sorted by sequence using index
     * @returns {Promise<Array>} Array of projects sorted by sequence
     */
    async getProjects() {
        if (!this.db) await this.init();

        const transaction = this.db.transaction("project", "readonly");
        const store = transaction.objectStore("project");
        const index = store.index("idx_sequence");

        return new Promise((resolve, reject) => {
            const request = index.getAll();

            request.onsuccess = (e) => resolve(e.target.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Fetches all task groups by projectid sorted by sequence using index
     * @returns {Promise<Array>} Array of task groups sorted by sequence
     */
    async getTaskGroupsByProjectId(projectId) {
        if (!this.db) await this.init();

        const transaction = this.db.transaction(["task_group"], "readonly");
        const store = transaction.objectStore("task_group");
        const index = store.index("idx_projectid_sequence");
        const lowerBound = [projectId, Number.MIN_SAFE_INTEGER];
        const upperBound = [projectId, Number.MAX_SAFE_INTEGER];
        const range = IDBKeyRange.bound(lowerBound, upperBound);

        return new Promise((resolve, reject) => {
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Fetches all tasks by task group id sorted by sequence using index
     * @returns {Promise<Array>} Array of tasks sorted by sequence
     */
    async getTasksByGroupId(groupId) {
        if (!this.db) await this.init();

        const transaction = this.db.transaction(["task"], "readonly");
        const store = transaction.objectStore("task");
        const index = store.index("idx_group_sequence");
        const lowerBound = [groupId, Number.MIN_SAFE_INTEGER];
        const upperBound = [groupId, Number.MAX_SAFE_INTEGER];
        const range = IDBKeyRange.bound(lowerBound, upperBound);

        return new Promise((resolve, reject) => {
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Stores an array of items in an IndexedDB object store
     * @param {string} storeName - Object store name
     * @param {Array} items - Array of objects to store
     * @returns {Promise<void>}
     */
    async storeArrayInIndexedDB(storeName, items) {
        if (!Array.isArray(items)) {
            items = [items];
        }

        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);

            items.forEach(item => {
                store.put(item);
            });
        });
    }



    /**
     * Stores an array of projects in the project IndexedDB object store
     * @param {Array} projects - Array of projects objects to store
     * @returns {Promise<void>}
     */
    async insertProjects(projects) {
        return this.storeArrayInIndexedDB("project", projects);
    }


    /**
     * Stores an array of task groups in the task_group IndexedDB object store
     * @param {Array} taskGroups - Array of task groups objects to store
     * @returns {Promise<void>}
     */
    async insertTaskGroups(taskGroups) {
        return this.storeArrayInIndexedDB("task_group", taskGroups);
    }


    /**
     * Stores an array of tasks in the task IndexedDB object store
     * @param {Array} tasks - Array of tasks objects to store
     * @returns {Promise<void>}
     */
    async insertTasks(tasks) {
        return this.storeArrayInIndexedDB("task", tasks);
    }


}