
const taskInput = document.getElementById('new-task');
const addButton = document.getElementById('add-btn');
fetchTasksFromServer (document.getElementById('task-list'))

// Add new task
addButton.onclick = () => {
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    addTask(taskText, document.getElementById('task-list'))
};

// Add task on enter
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addButton.click();
});

//Add a task
function addTask (taskText, taskList) {
    const li = document.createElement('li');
    li.textContent = taskText;
    li.className = "task"
  
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => remove(li);
  
    li.appendChild(removeBtn);
    taskList.appendChild(li);
    taskInput.value = '';
    postTaskList(taskList);
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
        while (taskListResponse.firstChild) {
            taskListResponse.removeChild(ul.firstChild);
        }
        taskListResponse.forEach (item => {
            console.log(`Task: ${item.task}`)
            addTask (item.task, taskList)
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
    items.push({ task: li.innerText });
    });

    return JSON.stringify(items);
}