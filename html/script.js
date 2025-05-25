
let dragging = false; // true if in dragging mode
let taskListJson = ""; // previous task list json for optimization reasons


// start polling
//setInterval(() => fetchTasksFromServer (document.getElementById('task-list')), 500);
fetchTasksFromServer (document.getElementById('task-list'))

function addInput() {
    const taskList = document.getElementById("task-list");
    // Add li element for input
    const li = document.createElement('li');
    li.className = "input-task";
    li.id = "input-task-li";
    li.draggable = true;

    taskList.appendChild(li);
    addDragAndDropHandlers(li);

    const input = document.createElement("input");
    input.type = "text";
    input.id = "new-task";
    input.className = "new-task";
    input.placeholder = "Enter new task";// Add new task on enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtnOnClick();
    });
    const btnAdd = document.createElement("button");
    btnAdd.id = "add-btn";
    btnAdd.className = "add-btn";
    btnAdd.innerText = "Add";
    btnAdd.onclick = () => addBtnOnClick();
    li.appendChild(input);
    li.appendChild(btnAdd);

}

function addBtnOnClick () {
    const taskInput = document.getElementById("new-task");
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    addTask(taskText, document.getElementById('input-task-li'))
    taskInput.value = '';
}

//Add a task function
function addTask (taskText, insertBefore = null, isFetchToServer = true, id = null) {
    const taskList = document.getElementById("task-list")
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
    taskList.insertBefore(li, insertBefore);
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
            const json = JSON.stringify(taskListResponse);
            if (json != taskListJson) { 
                
                const lis = taskList.querySelectorAll('li');

                Array.from(lis).forEach(li => {
                    if (li.className =="task") {
                        taskList.removeChild(li);
                    }
                  });

                taskListResponse.forEach (item => {
                    addTask (item.name, null, false, item.id)
                })
            }
            taskListJson = json;
            addInput();
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
        if (li.className == "task") {
            items.push({ id: li.id, name: li.firstChild.nodeValue.trim() });
        }
    });

    return JSON.stringify(items);
}

// Generates GUID
function guid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  }


  