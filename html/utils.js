
function textAreaAutoResize(event) {
    const textArea = event.target;
    textArea.style.height = '1px';
    textArea.style.height = `${textArea.scrollHeight - 20}px`
}

// Generates GUID
function guid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

function setCookie(name, value, options = {}) {
    let cookieString = encodeURIComponent(name) + "=" + encodeURIComponent(value);
  
    // Опции по умолчанию
    const defaults = {
        expires: 1, // days
        path: '/',
        domain: '', 
        secure: true, // https
        sameSite: 'none' 
    };
  
    const optionsToUse = { ...defaults, ...options };
  
    const expiresDate = new Date(Date.now() + optionsToUse.expires * 24 * 60 * 60 * 1000);
    cookieString += "; expires=" + expiresDate.toUTCString();
  
    cookieString += "; path=" + optionsToUse.path;
    cookieString += "; domain=" + optionsToUse.domain;
    if (optionsToUse.secure) cookieString += "; secure";
    if (optionsToUse.sameSite === 'none') cookieString += "; samesite=none";
  
    document.cookie = cookieString;
}

function getCookieByName(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
        return match[2];
    }
    return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function isCursorAtEndOrNotFocused(editableElement) {
    if (editableElement.tagName === "INPUT" || editableElement.tagName === "TEXTAREA"){
        return editableElement.selectionStart === editableElement.value.length && editableElement.selectionStart === editableElement.selectionEnd;
    }

    const selection = window.getSelection();
    
    // No selection or no focus on the div
    if (!selection.rangeCount) return true;
    
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;
    const currentNode = range.startContainer;
  
    // Check if the cursor is inside the editable div
    if (!editableElement.contains(currentNode)) return true;
  
    // Case 1: Cursor is in a text node
    if (currentNode.nodeType === Node.TEXT_NODE) {
      return (
        cursorPosition === currentNode.length &&  // Cursor at end of text
        currentNode === editableElement.lastChild &&  // Last text node in div
        range.endOffset === cursorPosition       // No selection, just cursor
      );
    }
    // Case 2: Cursor is between elements (e.g., after last <br> or <div>)
    else {
      const lastChild = editableElement.lastChild;
      return (
        lastChild && 
        range.startContainer === editableElement && 
        range.startOffset === editableElement.childNodes.length
      );
    }
}

function isCursorAtStartOrNotFocused(editableElement) {
    if (editableElement.tagName === "INPUT" || editableElement.tagName === "TEXTAREA"){
        return editableElement.selectionStart === 0 && editableElement.selectionEnd === 0;
    }

    const selection = window.getSelection();

    
    // No selection or no focus on the div
    if (!selection.rangeCount) return true;
    
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;
    const currentNode = range.startContainer;
  
    // Check if cursor is inside the editable div
    if (!editableElement.contains(currentNode)) return true;
  
    // Case 1: Cursor is in a text node (first character)
    if (currentNode.nodeType === Node.TEXT_NODE) {
      return (
        cursorPosition === 0 &&                  // Cursor at the start of text
        currentNode === editableElement.firstChild && // First text node in div
        range.endOffset === cursorPosition       // No selection, just cursor
      );
    }
    // Case 2: Cursor is before the first element (e.g., at the very beginning)
    else {
      return (
        range.startContainer === editableElement &&
        range.startOffset === 0
      );
    }
}

function setCursorAtEdge(editableDiv, isFirst) {
    const range = document.createRange();
    const selection = window.getSelection();
  
    // Set range at the end of the editable div
    range.selectNodeContents(editableDiv); // Select all contents
    range.collapse(isFirst); // Collapse to the end
  
    // Clear existing selections and apply the new range
    selection.removeAllRanges();
    selection.addRange(range);
  
    // Focus the div (optional, if not already focused)
    editableDiv.focus();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-region:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function ensureVisible(element, options = {}) {
    const {
      padding = 65,
      scrollParent = true,
      center = false
    } = options;
  
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
  
    // Vertical check
    if (rect.top < padding || rect.bottom > viewportHeight - padding) {
      const scrollToY = center 
        ? rect.top + window.scrollY - (viewportHeight / 2) + (rect.height / 2)
        : rect.top + window.scrollY - padding;
  
      window.scrollTo({
        top: scrollToY,
        behavior: 'smooth'
      });
    }
  
    // Horizontal check (if needed)
    if (rect.left < padding || rect.right > viewportWidth - padding) {
      const scrollToX = center
        ? rect.left + window.scrollX - (viewportWidth / 2) + (rect.width / 2)
        : rect.left + window.scrollX - padding;
  
      window.scrollTo({
        left: scrollToX,
        behavior: 'smooth'
      });
    }
  
    // Handle overflow containers
    if (scrollParent) {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        if (parent.scrollHeight > parent.clientHeight) {
          const parentRect = parent.getBoundingClientRect();
          const relativeTop = rect.top - parentRect.top;
          
          if (relativeTop < padding || relativeTop > parentRect.height - padding) {
            parent.scrollTo({
              top: element.offsetTop - parent.offsetTop - padding,
              behavior: 'smooth'
            });
          }
        }
        parent = parent.parentElement;
      }
    }
}

function showElementUnder(referenceElement, elementToShow) {
    const rect = referenceElement.getBoundingClientRect();
    elementToShow.style.position = 'absolute';
    elementToShow.style.top = `${rect.bottom + window.scrollY}px`;
    elementToShow.style.left = `${rect.left + window.scrollX}px`;
    elementToShow.style.zIndex = '9999';
}

function getEditableSelection(element) {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return { start: 0, end: 0 };

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return {
    start: preCaretRange.toString().length,
    end: preCaretRange.toString().length + range.toString().length
  };
}

function setContentEditableSelection(element, start, end = start) {
  const selection = window.getSelection();
  const range = document.createRange();
  const startNode = getTextNodeAtPosition(element, start);
  const endNode = end !== start 
    ? getTextNodeAtPosition(element, end) 
    : startNode;

  range.setStart(startNode.node, startNode.offset);
  range.setEnd(endNode.node, endNode.offset);
  
  selection.removeAllRanges();
  selection.addRange(range);
}

function getTextNodeAtPosition(root, position) {
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let currentPosition = 0;
  let currentNode;
  
  while (currentNode = treeWalker.nextNode()) {
    const nodeLength = currentNode.length;
    if (position >= currentPosition && position <= currentPosition + nodeLength) {
      return { 
        node: currentNode, 
        offset: position - currentPosition 
      };
    }
    currentPosition += nodeLength;
  }
  
  return { 
    node: currentNode || document.createTextNode(''), 
    offset: currentNode?.length || 0 
  };
}