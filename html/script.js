
const taskInput = document.getElementById('new-task');
const addButton = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');

// Add new task
addButton.onclick = () => {
  const taskText = taskInput.value.trim();
  if (taskText === "") return;

  const li = document.createElement('li');
  li.textContent = taskText;

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  removeBtn.className = 'remove-btn';
  removeBtn.onclick = () => remove(li);

  li.appendChild(removeBtn);
  taskList.appendChild(li);
  taskInput.value = '';
  postTaskList(taskList);
};

// Add task on enter
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addButton.click();
});

function remove (li) {
  li.remove();
  postTaskList(taskList);
}

function postTaskList (taskList) {
    const jsonBody = taskListToJson(taskList);
    console.log (taskListToJson (taskList));
    fetch ('/api/task_list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: taskListToJson (taskList)
    }
    )
    .then(response => response.json)
    .then(data => console.log(data)) // ToDo: response handler
    .catch(error => console.error(error));
}

function taskListToJson (taskList) {
    const items = [];

    taskList.querySelectorAll('li').forEach(li => {
    items.push({ task: li.innerText });
    });

    return JSON.stringify(items);
}