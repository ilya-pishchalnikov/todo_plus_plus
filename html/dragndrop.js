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

      taskList.insertBefore(dragSrcEl, this);
      postTaskList(taskList);
  
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