
const taskInput = document.getElementById('new-task');
const addButton = document.getElementById('add-btn');
// start polling
setInterval(() => fetchTasksFromServer (document.getElementById('task-list')), 500);

// Add new task
addButton.onclick = () => {
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    addTask(taskText, document.getElementById('task-list'))
    taskInput.value = '';
};

// Add task on enter
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addButton.click();
});

//Add a task
function addTask (taskText, taskList, isFetchToServer = true, id = null) {
    const li = document.createElement('li');
    li.textContent = taskText;
    li.className = "task"
    if (id == null) {
        li.id = guid();
    }
    else {
        li.id = id;
    }
  
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

function fetchTasksFromServer (taskList) { 
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

function remove (li) {
    li.remove();
    postTaskList(taskList);
}

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

function taskListToJson (taskList) {
    const items = [];

    taskList.querySelectorAll('li').forEach(li => {
    items.push({ id: li.id, task: li.firstChild.nodeValue.trim() });
    });

    return JSON.stringify(items);
}

function guid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  }