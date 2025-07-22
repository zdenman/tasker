// Advanced Daily Planner with Multiple Lists, Modals, and Live Countdown
let lists = JSON.parse(localStorage.getItem('plannerLists') || '[]');
let currentEditingTask = null;
let currentEditingList = null;
let countdownIntervals = new Map();
let isColumnView = JSON.parse(localStorage.getItem('isColumnView')) || false;

// Toggle time inputs visibility
function toggleTimeInputs(button) {
  const form = button.closest('.list-form');
  const timeInputs = form.querySelector('.time-date-inputs');
  const isVisible = timeInputs.style.display !== 'none';
  
  if (isVisible) {
    timeInputs.style.display = 'none';
    button.classList.remove('active');
    button.title = 'Add time & date';
  } else {
    timeInputs.style.display = 'flex';
    button.classList.add('active');
    button.title = 'Hide time & date';
  }
}

// Toggle modal time inputs visibility
function toggleModalTimeInputs() {
  const timeInputs = document.querySelector('.modal-time-inputs');
  const toggleBtn = document.querySelector('#editTaskModal .time-toggle-btn');
  const isVisible = timeInputs.style.display !== 'none';
  
  if (isVisible) {
    timeInputs.style.display = 'none';
    toggleBtn.classList.remove('active');
    toggleBtn.title = 'Add time & date';
  } else {
    timeInputs.style.display = 'flex';
    toggleBtn.classList.add('active');
    toggleBtn.title = 'Hide time & date';
  }
}

// Settings modal functions
function showSettingsModal() {
  document.getElementById('settingsModal').style.display = 'block';
}

function closeSettingsModal() {
  document.getElementById('settingsModal').style.display = 'none';
}

// Export data function
function exportData() {
  const data = {
    lists: lists,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `tasker-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

// Import data function
function importData() {
  document.getElementById('importFileInput').click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.lists && Array.isArray(data.lists)) {
        const confirmImport = confirm('This will replace all your current data. Are you sure you want to continue?');
        
        if (confirmImport) {
          lists = data.lists;
          saveLists();
          renderLists();
          closeSettingsModal();
          showToast('Data imported successfully!', 'success');
        }
      } else {
        showToast('Invalid file format. Please select a valid backup file.', 'error');
      }
    } catch (error) {
      showToast('Error reading file. Please make sure it\'s a valid JSON file.', 'error');
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

// View toggle function
function toggleView() {
  isColumnView = !isColumnView;
  localStorage.setItem('isColumnView', JSON.stringify(isColumnView));
  
  const container = document.getElementById('listsContainer');
  const toggleBtn = document.getElementById('viewToggleBtn');
  
  if (isColumnView) {
    container.classList.add('column-view');
    toggleBtn.title = 'Switch to row view';
    toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    `;
  } else {
    container.classList.remove('column-view');
    toggleBtn.title = 'Switch to column view';
    toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
      </svg>
    `;
  }
}

// Modal functions
function showAddListModal() {
  document.getElementById('addListModal').style.display = 'block';
  document.getElementById('newListName').focus();
}

function closeAddListModal() {
  document.getElementById('addListModal').style.display = 'none';
  document.getElementById('addListForm').reset();
}

function showEditListModal(list) {
  currentEditingList = list;
  document.getElementById('editListModal').style.display = 'block';
  document.getElementById('editListName').value = list.name;
  document.getElementById('editListDate').value = list.date || '';
  document.getElementById('editListDescription').value = list.description || '';
  document.getElementById('editListName').focus();
}

function closeEditListModal() {
  document.getElementById('editListModal').style.display = 'none';
  document.getElementById('editListForm').reset();
  currentEditingList = null;
}

function showEditTaskModal(task, listId, taskId) {
  currentEditingTask = { listId, taskId, task };
  document.getElementById('editTaskModal').style.display = 'block';
  document.getElementById('editTaskText').value = task.text;
  document.getElementById('editTaskTime').value = task.time || '';
  document.getElementById('editTaskDate').value = task.date || '';
  
  // Show time inputs if task has time or date
  const timeInputs = document.querySelector('.modal-time-inputs');
  const toggleBtn = document.querySelector('#editTaskModal .time-toggle-btn');
  if (task.time || task.date) {
    timeInputs.style.display = 'flex';
    toggleBtn.classList.add('active');
    toggleBtn.title = 'Hide time & date';
  } else {
    timeInputs.style.display = 'none';
    toggleBtn.classList.remove('active');
    toggleBtn.title = 'Add time & date';
  }
  
  document.getElementById('editTaskText').focus();
}

function closeEditTaskModal() {
  document.getElementById('editTaskModal').style.display = 'none';
  document.getElementById('editTaskForm').reset();
  currentEditingTask = null;
}

// Save to localStorage
function saveLists() {
  localStorage.setItem('plannerLists', JSON.stringify(lists));
}

// Create countdown timer
function createCountdownTimer(task) {
  if (!task.time || !task.date) return '';
  
  const now = new Date();
  const taskDate = new Date(task.date + 'T' + task.time);
  const diff = taskDate - now;
  
  if (diff <= 0) {
    return '<span class="countdown-timer due">Due!</span>';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours < 1) {
    return `<span class="countdown-timer due">${minutes}m</span>`;
  } else if (hours < 24) {
    return `<span class="countdown-timer">${hours}h ${minutes}m</span>`;
  } else {
    const days = Math.floor(hours / 24);
    return `<span class="countdown-timer">${days}d ${hours % 24}h</span>`;
  }
}

// Update countdown timers
function updateCountdowns() {
  lists.forEach(list => {
    list.tasks.forEach(task => {
      if (task.time && task.date) {
        const timerId = `${list.id}-${task.id}`;
        const element = document.getElementById(`countdown-${timerId}`);
        if (element) {
          element.innerHTML = createCountdownTimer(task);
        }
      }
    });
  });
}

// Render all lists
function renderLists() {
  const container = document.getElementById('listsContainer');
  container.innerHTML = '';
  
  if (lists.length === 0) {
    container.innerHTML = `
      <div class="empty-list">
        <p>No lists yet. Click "+ New List" to create your first list!</p>
      </div>
    `;
    return;
  }
  
  lists.forEach(list => {
    const listCard = document.createElement('div');
    listCard.className = `list-card ${list.collapsed ? 'collapsed' : ''}`;
    listCard.setAttribute('data-list-id', list.id);
    listCard.setAttribute('draggable', 'true');
    console.log(`Rendering list ${list.id} with classes: ${listCard.className}`);
    
    // Apply initial collapsed state
    if (list.collapsed) {
      setTimeout(() => {
        const listContent = listCard.querySelector('.list-content');
        if (listContent) {
          listContent.style.display = 'none';
        }
      }, 0);
    }
    listCard.innerHTML = `
      <div class="list-header">
        <div>
          <h3 class="list-title">${list.name}</h3>
          <div class="list-date">${list.date || 'No date'}</div>
          ${list.description ? `<div class="list-description">${list.description}</div>` : ''}
        </div>
        <div class="list-actions">
          <button class="icon-btn list-collapse" title="${list.collapsed ? 'Expand' : 'Collapse'} List">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="${list.collapsed ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z'}"/>
            </svg>
          </button>
          <div class="list-menu-container">
            <button class="icon-btn list-menu" title="More options">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="12" cy="5" r="1"/>
                <circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            <div class="list-menu-dropdown">
              <button class="menu-item list-edit" title="Edit List">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                Edit
              </button>
              <button class="menu-item list-delete" title="Delete List">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="list-content">
        <form class="list-form" onsubmit="addTask(event, '${list.id}')">
          <input type="text" placeholder="Add task..." required>
          <div class="time-date-inputs" style="display: none;">
            <input type="time" placeholder="Time">
            <input type="date" placeholder="Date">
          </div>
          <button type="button" class="time-toggle-btn" onclick="toggleTimeInputs(this)" title="Add time & date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </button>
          <button type="submit">+</button>
        </form>
        <ul class="list-tasks">
          ${renderTasks(list)}
        </ul>
      </div>
    `;
    
    // Event handlers are now managed by event delegation
    
    // Add drag event handlers for list reordering
    listCard.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', list.id);
      e.dataTransfer.setData('application/x-list-id', list.id);
      listCard.classList.add('dragging');
    });
    
    listCard.addEventListener('dragend', (e) => {
      listCard.classList.remove('dragging');
    });
    
    listCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingList = document.querySelector('.list-card.dragging');
      if (draggingList && draggingList !== listCard) {
        const rect = listCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          listCard.classList.add('drag-over-top');
          listCard.classList.remove('drag-over-bottom');
        } else {
          listCard.classList.add('drag-over-bottom');
          listCard.classList.remove('drag-over-top');
        }
      }
    });
    
    listCard.addEventListener('dragleave', (e) => {
      listCard.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    listCard.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedListId = e.dataTransfer.getData('application/x-list-id');
      if (draggedListId && draggedListId !== list.id) {
        reorderLists(draggedListId, list.id, listCard.classList.contains('drag-over-bottom'));
      }
      listCard.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    container.appendChild(listCard);
    
    // Add task drag event handlers
    const taskItems = listCard.querySelectorAll('.list-task-item');
    taskItems.forEach(taskItem => {
      taskItem.addEventListener('dragstart', (e) => {
        const taskId = taskItem.getAttribute('data-task-id');
        const listId = taskItem.getAttribute('data-list-id');
        e.dataTransfer.setData('text/plain', `${listId}:${taskId}`);
        e.dataTransfer.setData('application/x-task-data', JSON.stringify({taskId, listId}));
        taskItem.classList.add('dragging');
        e.stopPropagation();
      });
      
      taskItem.addEventListener('dragend', (e) => {
        taskItem.classList.remove('dragging');
      });
      
      taskItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggingTask = document.querySelector('.list-task-item.dragging');
        if (draggingTask && draggingTask !== taskItem) {
          const rect = taskItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            taskItem.classList.add('drag-over-top');
            taskItem.classList.remove('drag-over-bottom');
          } else {
            taskItem.classList.add('drag-over-bottom');
            taskItem.classList.remove('drag-over-top');
          }
        }
      });
      
      taskItem.addEventListener('dragleave', (e) => {
        taskItem.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      
      taskItem.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const taskData = e.dataTransfer.getData('application/x-task-data');
        if (taskData) {
          const {taskId: draggedTaskId, listId: draggedListId} = JSON.parse(taskData);
          const targetTaskId = taskItem.getAttribute('data-task-id');
          const targetListId = taskItem.getAttribute('data-list-id');
          if (draggedTaskId !== targetTaskId) {
            reorderTasks(draggedListId, draggedTaskId, targetTaskId, targetListId, taskItem.classList.contains('drag-over-bottom'));
          }
        }
        taskItem.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });
    
    // Add drag event handlers for empty lists
    const emptyList = listCard.querySelector('.empty-list');
    if (emptyList) {
      emptyList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggingTask = document.querySelector('.list-task-item.dragging');
        if (draggingTask) {
          emptyList.classList.add('drag-over');
        }
      });
      
      emptyList.addEventListener('dragleave', (e) => {
        emptyList.classList.remove('drag-over');
      });
      
      emptyList.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const taskData = e.dataTransfer.getData('application/x-task-data');
        if (taskData) {
          const {taskId: draggedTaskId, listId: draggedListId} = JSON.parse(taskData);
          const targetListId = emptyList.getAttribute('data-list-id');
          if (draggedListId !== targetListId) {
            moveTaskToEmptyList(draggedListId, draggedTaskId, targetListId);
          }
        }
        emptyList.classList.remove('drag-over');
      });
    }
  });
  
  startCountdownUpdates();
}

// Render tasks for a list
function renderTasks(list) {
  if (list.tasks.length === 0) {
    return `<div class="empty-list" data-list-id="${list.id}">No tasks yet. Add your first task!</div>`;
  }
  
  return list.tasks.map(task => {
    const timerId = `${list.id}-${task.id}`;
    const countdown = createCountdownTimer(task);
    
    return `
      <li class="list-task-item ${task.done ? 'done' : ''}" draggable="true" data-task-id="${task.id}" data-list-id="${list.id}">
        <input type="checkbox" ${task.done ? 'checked' : ''} 
               onchange="toggleTask('${list.id}', '${task.id}')">
        <span class="task-text">${task.text}</span>
        ${task.time ? `<span class="task-time">${task.time}</span>` : ''}
        ${task.date ? `<span class="task-time">${task.date}</span>` : ''}
        ${countdown ? `<span id="countdown-${timerId}" class="countdown-timer">${countdown}</span>` : ''}
        <div class="task-actions">
          <svg class="icon edit" title="Edit Task" viewBox="0 0 24 24" fill="currentColor"
               onclick="editTask('${list.id}', '${task.id}')">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          <svg class="icon bell" title="Set Reminder" viewBox="0 0 24 24" fill="currentColor" onclick="setReminder('${list.id}', '${task.id}')">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <svg class="icon trash" title="Delete Task" viewBox="0 0 24 24" fill="currentColor"
               onclick="deleteTask('${list.id}', '${task.id}')">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </div>
      </li>
    `;
  }).join('');
}

// Add new list
function addList(event) {
  event.preventDefault();
  const name = event.target.elements[0].value.trim();
  const date = event.target.elements[1].value;
  const description = event.target.elements[2].value.trim();
  
  if (name) {
    const newList = {
      id: Date.now().toString(),
      name: name,
      date: date,
      description: description,
      collapsed: false,
      tasks: []
    };
    lists.push(newList);
    saveLists();
    renderLists();
    closeAddListModal();
  }
}

// Save edited list
function saveEditedList(event) {
  event.preventDefault();
  if (!currentEditingList) return;
  
  const name = document.getElementById('editListName').value.trim();
  const date = document.getElementById('editListDate').value;
  const description = document.getElementById('editListDescription').value.trim();
  
  if (name) {
    currentEditingList.name = name;
    currentEditingList.date = date;
    currentEditingList.description = description;
    saveLists();
    renderLists();
    closeEditListModal();
  }
}

// Add task to list
function addTask(event, listId) {
  event.preventDefault();
  const form = event.target;
  const text = form.elements[0].value.trim();
  const time = form.elements[1].value;
  const date = form.elements[2].value;
  
  if (text) {
    const list = lists.find(l => l.id === listId);
    if (list) {
      const newTask = {
        id: Date.now().toString(),
        text: text,
        time: time,
        date: date,
        done: false
      };
      list.tasks.push(newTask);
      saveLists();
      renderLists();
      form.reset();
    }
  }
}

// Toggle task completion
function toggleTask(listId, taskId) {
  const list = lists.find(l => l.id === listId);
  if (list) {
    const task = list.tasks.find(t => t.id === taskId);
    if (task) {
      task.done = !task.done;
      saveLists();
      renderLists();
    }
  }
}

// Edit task
function editTask(listId, taskId) {
  const list = lists.find(l => l.id === listId);
  if (list) {
    const task = list.tasks.find(t => t.id === taskId);
    if (task) {
      showEditTaskModal(task, listId, taskId);
    }
  }
}

// Save edited task
function saveEditedTask(event) {
  event.preventDefault();
  if (!currentEditingTask) return;
  
  const { listId, taskId } = currentEditingTask;
  const text = document.getElementById('editTaskText').value.trim();
  const time = document.getElementById('editTaskTime').value;
  const date = document.getElementById('editTaskDate').value;
  
  if (text) {
    const list = lists.find(l => l.id === listId);
    if (list) {
      const task = list.tasks.find(t => t.id === taskId);
      if (task) {
        task.text = text;
        task.time = time;
        task.date = date;
        saveLists();
        renderLists();
        closeEditTaskModal();
      }
    }
  }
}

// Delete task
function deleteTask(listId, taskId) {
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  // Create confirmation toast with action buttons
  showConfirmationToast(
    `Delete task "${task.text}"?`,
    () => {
      list.tasks = list.tasks.filter(t => t.id !== taskId);
      saveLists();
      renderLists();
      showToast('Task deleted successfully', 'success');
    },
    () => {}
  );
}

// Toggle list collapse
function toggleListCollapse(listId) {
  const list = lists.find(l => l.id === listId);
  if (list) {
    list.collapsed = !list.collapsed;
    console.log(`List ${listId} collapsed state: ${list.collapsed}`);
    
    // Directly manipulate DOM for immediate effect
    const listCard = document.querySelector(`[data-list-id="${listId}"]`);
    if (listCard) {
      const listContent = listCard.querySelector('.list-content');
      if (listContent) {
        listContent.style.display = list.collapsed ? 'none' : 'block';
      }
      
      // Update collapse icon
      const collapseIcon = listCard.querySelector('.list-collapse svg path');
      if (collapseIcon) {
        collapseIcon.setAttribute('d', list.collapsed ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
      }
      
      // Update title
      const collapseBtn = listCard.querySelector('.list-collapse');
      if (collapseBtn) {
        collapseBtn.setAttribute('title', list.collapsed ? 'Expand List' : 'Collapse List');
      }
    }
    
    saveLists();
  }
}

// Edit list
function editList(listId) {
  const list = lists.find(l => l.id === listId);
  if (list) {
    showEditListModal(list);
  }
}

// Delete list
function deleteList(listId) {
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  
  // Create confirmation toast with action buttons
  showConfirmationToast(
    `Delete entire list "${list.name}" and all its tasks?`,
    () => {
      lists = lists.filter(l => l.id !== listId);
      saveLists();
      renderLists();
      showToast('List deleted successfully', 'success');
    },
    () => {}
  );
}

// Reorder lists
function reorderLists(draggedListId, targetListId, insertAfter) {
  const draggedIndex = lists.findIndex(l => l.id === draggedListId);
  const targetIndex = lists.findIndex(l => l.id === targetListId);
  
  if (draggedIndex === -1 || targetIndex === -1) return;
  
  const draggedList = lists[draggedIndex];
  lists.splice(draggedIndex, 1);
  
  const newTargetIndex = lists.findIndex(l => l.id === targetListId);
  const insertIndex = insertAfter ? newTargetIndex + 1 : newTargetIndex;
  
  lists.splice(insertIndex, 0, draggedList);
  saveLists();
  renderLists();
}

// Reorder tasks
function reorderTasks(draggedListId, draggedTaskId, targetTaskId, targetListId, insertAfter) {
  const draggedList = lists.find(l => l.id === draggedListId);
  const targetList = lists.find(l => l.id === targetListId);
  
  if (!draggedList || !targetList) return;
  
  const draggedTaskIndex = draggedList.tasks.findIndex(t => t.id === draggedTaskId);
  if (draggedTaskIndex === -1) return;
  
  const draggedTask = draggedList.tasks[draggedTaskIndex];
  
  // Remove task from source list
  draggedList.tasks.splice(draggedTaskIndex, 1);
  
  // Find target position
  if (draggedListId === targetListId) {
    // Reordering within same list
    const targetTaskIndex = targetList.tasks.findIndex(t => t.id === targetTaskId);
    if (targetTaskIndex !== -1) {
      const insertIndex = insertAfter ? targetTaskIndex + 1 : targetTaskIndex;
      targetList.tasks.splice(insertIndex, 0, draggedTask);
    } else {
      // If target task not found, add back to original position or end
      targetList.tasks.push(draggedTask);
    }
  } else {
    // Moving between different lists
    const targetTaskIndex = targetList.tasks.findIndex(t => t.id === targetTaskId);
    if (targetTaskIndex !== -1) {
      const insertIndex = insertAfter ? targetTaskIndex + 1 : targetTaskIndex;
      targetList.tasks.splice(insertIndex, 0, draggedTask);
    } else {
      // If target task not found, add to end
      targetList.tasks.push(draggedTask);
    }
  }
  
  saveLists();
  renderLists();
}

// Move task to empty list
function moveTaskToEmptyList(draggedListId, draggedTaskId, targetListId) {
  const draggedList = lists.find(l => l.id === draggedListId);
  const targetList = lists.find(l => l.id === targetListId);
  
  if (!draggedList || !targetList) return;
  
  const draggedTaskIndex = draggedList.tasks.findIndex(t => t.id === draggedTaskId);
  if (draggedTaskIndex === -1) return;
  
  const draggedTask = draggedList.tasks[draggedTaskIndex];
  
  // Remove task from source list
  draggedList.tasks.splice(draggedTaskIndex, 1);
  
  // Add task to target list
  targetList.tasks.push(draggedTask);
  
  saveLists();
  renderLists();
}

// Set reminder
function setReminder(listId, taskId) {
  const list = lists.find(l => l.id === listId);
  if (!list) return;
  
  const task = list.tasks.find(t => t.id === taskId);
  if (!task || !task.time || !task.date) {
    showToast('Please set both time and date for this task first.', 'warning');
    return;
  }
  
  if (!('Notification' in window)) {
    showToast('Notifications are not supported in your browser.', 'error');
    return;
  }
  
  const taskDate = new Date(task.date + 'T' + task.time);
  const now = new Date();
  const timeUntilReminder = taskDate - now;
  
  if (timeUntilReminder <= 0) {
    showToast('This task is already past due!', 'warning');
    return;
  }
  
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      setupReminder(task, permission, timeUntilReminder);
    });
  } else {
    setupReminder(task, Notification.permission, timeUntilReminder);
  }
}

function setupReminder(task, permission, timeUntilReminder) {
  showToast(`Reminder set for "${task.text}" at ${task.date} ${task.time}`, 'success');
  
  setTimeout(() => {
    if (permission === 'granted') {
      new Notification('Daily Planner Reminder', { 
        body: task.text
      });
    } else {
      showToast(`Reminder: ${task.text}`, 'info', 6000);
    }
  }, timeUntilReminder);
}

// Start countdown updates
function startCountdownUpdates() {
  countdownIntervals.forEach(interval => clearInterval(interval));
  countdownIntervals.clear();
  
  const interval = setInterval(updateCountdowns, 60000);
  countdownIntervals.set('main', interval);
}

// Initialize view state
function initializeView() {
  const container = document.getElementById('listsContainer');
  const toggleBtn = document.getElementById('viewToggleBtn');
  
  if (isColumnView) {
    container.classList.add('column-view');
    toggleBtn.title = 'Switch to row view';
    toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    `;
  } else {
    container.classList.remove('column-view');
    toggleBtn.title = 'Switch to column view';
    toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
      </svg>
    `;
  }
}

// Event listeners
document.getElementById('addListForm').addEventListener('submit', addList);
document.getElementById('editListForm').addEventListener('submit', saveEditedList);
document.getElementById('editTaskForm').addEventListener('submit', saveEditedTask);

// Event delegation for dynamically created list action buttons
document.addEventListener('click', function(event) {
  const target = event.target.closest('button');
  console.log('Click event detected:', {
    target: target,
    classList: target ? Array.from(target.classList) : null,
    eventTarget: event.target
  });
  
  if (!target) return;
  
  // Handle list collapse button
  if (target.classList.contains('list-collapse')) {
    console.log('List collapse button clicked');
    const listCard = target.closest('.list-card');
    if (listCard) {
      const listId = listCard.getAttribute('data-list-id');
      console.log('Toggling list collapse for:', listId);
      toggleListCollapse(listId);
    }
  }
  
  // Handle list menu toggle button
  else if (target.classList.contains('list-menu')) {
    event.stopPropagation();
    const menuContainer = target.closest('.list-menu-container');
    const isActive = menuContainer.classList.contains('active');
    
    // Close all other open menus
    document.querySelectorAll('.list-menu-container.active').forEach(container => {
      container.classList.remove('active');
    });
    
    // Toggle current menu
    if (!isActive) {
      menuContainer.classList.add('active');
    }
  }
  
  // Handle list edit button
  else if (target.classList.contains('list-edit')) {
    const listCard = target.closest('.list-card');
    if (listCard) {
      const listId = listCard.getAttribute('data-list-id');
      editList(listId);
      // Close the menu
      const menuContainer = target.closest('.list-menu-container');
      if (menuContainer) {
        menuContainer.classList.remove('active');
      }
    }
  }
  
  // Handle list delete button
  else if (target.classList.contains('list-delete')) {
    const listCard = target.closest('.list-card');
    if (listCard) {
      const listId = listCard.getAttribute('data-list-id');
      deleteList(listId);
      // Close the menu
      const menuContainer = target.closest('.list-menu-container');
      if (menuContainer) {
        menuContainer.classList.remove('active');
      }
    }
  }
});

// Close dropdown menus when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.list-menu-container')) {
    document.querySelectorAll('.list-menu-container.active').forEach(container => {
      container.classList.remove('active');
    });
  }
});

// Close modals when clicking outside
window.onclick = function(event) {
  const addModal = document.getElementById('addListModal');
  const editListModal = document.getElementById('editListModal');
  const editTaskModal = document.getElementById('editTaskModal');
  if (event.target === addModal) closeAddListModal();
  if (event.target === editListModal) closeEditListModal();
  if (event.target === editTaskModal) closeEditTaskModal();
};

// Theme management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Toast notification system
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    error: '<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    warning: '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>',
    info: '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
  };
  
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon ${type}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${icons[type]}
      </svg>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="removeToast(this.parentElement)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto remove
  setTimeout(() => removeToast(toast), duration);
  
  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentElement) return;
  
  toast.classList.remove('show');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

function showConfirmationToast(message, onConfirm, onCancel) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast warning confirmation';
  
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
      </svg>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-actions">
      <button class="toast-btn cancel" onclick="handleConfirmationAction(this, false)">Cancel</button>
      <button class="toast-btn confirm" onclick="handleConfirmationAction(this, true)">Delete</button>
    </div>
  `;
  
  // Store callbacks on the toast element
  toast._onConfirm = onConfirm;
  toast._onCancel = onCancel;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  return toast;
}

function handleConfirmationAction(button, isConfirm) {
  const toast = button.closest('.toast');
  if (!toast) return;
  
  if (isConfirm && toast._onConfirm) {
    toast._onConfirm();
  } else if (!isConfirm && toast._onCancel) {
    toast._onCancel();
  }
  
  removeToast(toast);
}

// Initialize
initializeTheme();
initializeView();
renderLists();
startCountdownUpdates();

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
