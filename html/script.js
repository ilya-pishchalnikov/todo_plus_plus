
const taskInput = document.getElementById('new-task');
const addButton = document.getElementById('add-btn');
let dragging = false; // true if in dragging mode

// start polling
setInterval(() => fetchTasksFromServer (document.getElementById('task-list')), 500);
//fetchTasksFromServer (document.getElementById('task-list'));

// Add new task on click
addButton.onclick = () => {
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    addTask(taskText, document.getElementById('task-list'))
    taskInput.value = '';
};

// Add new task on enter
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addButton.click();
});

//Add a task function
function addTask (taskText, taskList, isFetchToServer = true, id = null) {
    const li = document.createElement('li');
    li.textContent = taskText;
    li.className = "task";
    if (id == null) {
        li.id = guid();
    }
    else {
        li.id = id;
    }
    li.draggable = true;
    addDragAndDropHandlers(li);
  
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => remove(li);
  
    li.appendChild(removeBtn);
    taskList.appendChild(li);
    if (isFetchToServer) {
        postTaskList(taskList);
    }
}

// Fetches task list from the server 
function fetchTasksFromServer (taskList) { 
    if (!dragging) {
        fetch ('/api/task_list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }
        )
        .then(response => response.json())
        .then(taskListResponse => {
            while (taskList.firstChild) {
                taskList.removeChild(taskList.firstChild);
            }
            taskListResponse.forEach (item => {
                addTask (item.task, taskList, false, item.id)
            })
        })
        .catch(error => console.error(error));
    }
}

// removes Task (li)
function remove (li) {
    li.remove();
    postTaskList(document.getElementById('task-list'));
}

// Uploads task list to the server
function postTaskList (taskList) {
    const jsonBody = taskListToJson(taskList);
    fetch ('/api/task_list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: taskListToJson (taskList)
    }
    )
    .then(response => response.json)
    .catch(error => console.error(error));
}

// Serializes task list to JSON for server upload
function taskListToJson (taskList) {
    const items = [];

    taskList.querySelectorAll('li').forEach(li => {
    items.push({ id: li.id, task: li.firstChild.nodeValue.trim() });
    });

    return JSON.stringify(items);
}

// Generates GUID
function guid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  }

///////// DRAG-N-DROP /////////
let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
    dragging = true;
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDrop(e) {
    e.stopPropagation();
  
    if (dragSrcEl !== this) {
      // move
      const taskList = document.getElementById('task-list');

      taskList.insertBefore(dragSrcEl, this)
  
      // Reattach event listeners after swapping content
      addDragAndDropHandlers(dragSrcEl);
      addDragAndDropHandlers(this);
    }
    return false;
  }
  
  function handleDragEnd() {
    this.classList.remove('dragging');
    postTaskList (document.getElementById('task-list'));
    dragging = false;
  }
  
  function addDragAndDropHandlers(item) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  }
  