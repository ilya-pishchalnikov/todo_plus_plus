class IndexedDBEventStore {
    constructor(databaseName = 'EventStore', version = 1) {
        this.databaseName = databaseName;
        this.version = version;
        this.db = null;
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, this.version);

            request.onupgradeneeded = (event) => {
                this.onupgradeneeded(event);
            };

            request.onsuccess = (event) => {
                this.onsuccess(event, resolve);
            };

            request.onerror = (event) => {
                this.onerror(event, reject);
            };
        });
    }

    onupgradeneeded(event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('events')) {
            const store = db.createObjectStore('events', { keyPath: 'eventId' });

            store.createIndex('idx_utc_time', 'utc_time', { unique: false });
        }
    }

    onsuccess(event, resolve) {
        this.db = event.target.result;
        resolve(this);  // Now resolve is available as a parameter
    }

    onerror(event, reject) {
        console.error(`IndexedDB error: ${event.target.error}`);
        reject(`IndexedDB error: ${event.target.error}`);
    }

    // Save events to the store
    async saveEvents(events) {
        if (!Array.isArray(events)) {
            events = [events];
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');

            let completed = 0;
            const errors = [];

            events.forEach((event) => {
                const request = store.add(event);

                request.onsuccess = () => {
                    completed++;
                    if (completed === events.length) {
                        if (errors.length > 0) {
                            reject(errors);
                        } else {
                            resolve();
                        }
                    }
                };

                request.onerror = (e) => {
                    errors.push(e.target.error);
                    completed++;
                    if (completed === events.length) {
                        if (errors.length > 0) {
                            reject(errors);
                        } else {
                            resolve();
                        }
                    }
                };
            });
        });
    }


    // Get events since a specific timestamp
    async getEventsSince(utc_time) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const index = store.index('idx_utc_time');
            const range = IDBKeyRange.lowerBound(utc_time);
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async clearEventStore() {
        const storeName = "events";
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('EventStore');
          
          request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
              resolve();
            };
            
            clearRequest.onerror = (event) => {
              reject(`Error clearing store: ${event.target.error}`);
            };
          };
          
          request.onerror = (event) => {
            reject(`Error opening database: ${event.target.error}`);
          };
        });
      }
}