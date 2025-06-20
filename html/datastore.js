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
     * create and upgrade database structure on version change
     * 
     * @event {object} event data
     */
    onUpgradeNeeded(event) {
        const db = event?.target.result ?? this.db;

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
 * Clears all records from an IndexedDB object store
 * @param {string} objectStoreName - Name of object store to clear
 * @returns {Promise<void>}
 */
    async clearObjectStore(objectStoreName) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(objectStoreName, 'readwrite');
            const store = transaction.objectStore(objectStoreName);

            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Cleans (recreates) all object stores of IndexedDb
     */
    async clean() {
        if (!this.db) await this.init();
        this.clearObjectStore("project");
        this.clearObjectStore("task_group");
        this.clearObjectStore("task");
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
     * 
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
     * 
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
     * 
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
     * 
     * @param {Array} projects - Array of projects objects to store
     * @returns {Promise<void>}
     */
    async insertProjects(projects) {
        return this.storeArrayInIndexedDB("project", projects);
    }


    /**
     * Stores an array of task groups in the task_group IndexedDB object store
     * 
     * @param {Array} taskGroups - Array of task groups objects to store
     * @returns {Promise<void>}
     */
    async insertTaskGroups(taskGroups) {
        return this.storeArrayInIndexedDB("task_group", taskGroups);
    }


    /**
     * Stores an array of tasks in the task IndexedDB object store
     * 
     * @param {Array} tasks - Array of tasks objects to store
     * @returns {Promise<void>}
     */
    async insertTasks(tasks) {
        return this.storeArrayInIndexedDB("task", tasks);
    }

    /**
     * Async function to upsert (update or insert) an object in IndexedDB
     * 
     * @param {string} objectStoreName - Name of the object store
     * @param {object} objectValue - Object to upsert (must contain 'id' field)
     * @returns {Promise<void>} Resolves when operation completes, rejects on error
     */
    async upsert(objectStoreName, objectValue) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(objectStoreName, 'readwrite');
            const store = transaction.objectStore(objectStoreName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            const request = store.get(objectValue.id);

            request.onsuccess = () => {
                const upsertRequest = request.result
                    ? store.put(objectValue)
                    : store.add(objectValue);

                upsertRequest.onerror = () => reject(upsertRequest.error);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getObject(objectStoreName, id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(objectStoreName, "readonly");
          const store = transaction.objectStore(objectStoreName);
          const request = store.get(id);
      
          request.onsuccess = (event) => resolve(event.target.result || null);
          request.onerror = (event) => reject(event.target.error);
          
          transaction.onerror = (event) => reject(event.target.error);
        });
      }

    async getObjectsRange(objectStoreName, indexName, range) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(objectStoreName, "readonly");
            const store = transaction.objectStore(objectStoreName);
            const sequenceIndex = store.index(indexName);
            const request = sequenceIndex.openCursor(range);
            
            const projects = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    projects.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getProjectsAboveSequence(sequence) {
        if (!this.db) await this.init();
        const range = IDBKeyRange.lowerBound(sequence);
        return this.getObjectsRange("project", "idx_sequence", range);
    }

    async upsertProject(project) {
        const projectName = project.name;
        const projectId = project.id;
        const afterProjectId = project.after;
        const storeProject = await this.getObject("project", projectId);
        const afterProject = afterProjectId ? await this.getObject("project", afterProjectId) : null;
        const sequence = (afterProject?.sequence + 1) || 0;

        if (sequence != storeProject?.sequence) {
            const projectsToUpdate = await this.getProjectsAboveSequence (sequence);
            for (const project of projectsToUpdate) {
                project.sequence++;
                await this.upsert("project", project);
            }
        }

        const newProject = {id:projectId, name:projectName, sequence:sequence}
        await this.upsert("project", newProject);
    }
    async getProjectsAboveSequence(sequence) {
        if (!this.db) await this.init();
        const range = IDBKeyRange.lowerBound(sequence);
        return this.getObjectsRange("project", "idx_sequence", range);
    }

    async upsertGroup(group) {
        const groupName = group.name;
        const groupId = group.id;
        const projectId = group.projectid;        
        const afterGroupId = group.after;
        const storeGroup = await this.getObject("task_group", groupId);
        const afterGroup = afterGroupId ? await this.getObject("task_group", afterGroupId) : null;
        const sequence = (afterGroup?.sequence + 1) || 0;

        if (sequence != storeGroup?.sequence) {
            const sequenceRange = IDBKeyRange.bound(
                [projectId, sequence],       
                [projectId, Number.MAX_SAFE_INTEGER],                
                false,                                      
                false                                        
              );

            const groupsToUpdate = await this.getObjectsRange("task_group", "idx_projectid_sequence", sequenceRange);
            for (const group of groupsToUpdate) {
                group.sequence++;
                await this.upsert("task_group", group);
            }
        }

        const newGroup = {id:groupId, name:groupName, sequence:sequence, projectid:projectId}
        await this.upsert("task_group", newGroup);
    }

    
    async upsertTask(task) {
        const taskName = task.text;
        const taskId = task.id;
        const groupId = task.group;        
        const afterTaskId = task.after;
        const status = task.status;
        const storeTask = await this.getObject("task", taskId);
        const afterTask = afterTaskId ? await this.getObject("task", afterTaskId) : null;
        const sequence = (afterTask?.sequence + 1) || 0;

        if (sequence != storeTask?.sequence) {
            const sequenceRange = IDBKeyRange.bound(
                [groupId, sequence],       
                [groupId, Number.MAX_SAFE_INTEGER],                
                false,                                      
                false                                        
              );

            const tasksToUpdate = await this.getObjectsRange("task", "idx_group_sequence", sequenceRange);
            for (const task of tasksToUpdate) {
                task.sequence++;
                await this.upsert("task", task);
            }
        }

        const newTask = {id:taskId, text:taskName, sequence:sequence, group:groupId, status:status}
        await this.upsert("task", newTask);
    }

    /**
 * Deletes an object from IndexedDB by its ID
 * @param {string} objectStoreName - Name of the object store
 * @param {IDBValidKey} id - ID of the object to delete
 * @returns {Promise<void>} Resolves when deletion completes, rejects on error
 */
async delete(objectStoreName, id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(objectStoreName, 'readwrite');
        const store = transaction.objectStore(objectStoreName);
        
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
            resolve(); 
        };
        
        deleteRequest.onerror = () => {
            reject(new Error(`Failed to delete object with id ${id}: ${deleteRequest.error}`));
        };
        
        transaction.onerror = () => {
            reject(new Error(`Transaction error: ${transaction.error}`));
        };
    });
}

}