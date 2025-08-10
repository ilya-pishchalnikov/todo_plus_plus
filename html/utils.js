/**
 * A utility class containing various helpful functions for DOM manipulation,
 * cookie management, and other common tasks.
 */
class Utils {
    /**
     * Adjusts the height of a textarea element to fit its content.
     * This function is designed to be used as an event handler, typically for 'input' or 'keyup' events.
     * @param {Event} event The event object from the textarea.
     */
    static textAreaAutoResize(event) {
        const textArea = event.target;
        textArea.style.height = "1px";
        textArea.style.height = `${textArea.scrollHeight - 20}px`;
    }

    /**
     * Generates a universally unique identifier (GUID).
     * @returns {string} A new GUID string.
     */
    static guid() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
            (
                +c ^
                (crypto.getRandomValues(new Uint8Array(1))[0] &
                    (15 >> (+c / 4)))
            ).toString(16)
        );
    }

    /**
     * Sets a new cookie or updates an existing one.
     * @param {string} name The name of the cookie.
     * @param {string} value The value of the cookie.
     * @param {object} [options={}] Optional settings for the cookie.
     * @param {number} [options.expires=1] The number of days until the cookie expires.
     * @param {string} [options.path='/'] The path for which the cookie is valid.
     * @param {string} [options.domain=''] The domain for which the cookie is valid.
     * @param {boolean} [options.secure=true] Specifies if the cookie should only be sent over HTTPS.
     * @param {string} [options.sameSite='none'] Specifies the SameSite policy for the cookie ('none', 'lax', or 'strict').
     */
    static setCookie(name, value, options = {}) {
        let cookieString =
            encodeURIComponent(name) + "=" + encodeURIComponent(value);

        const defaults = {
            expires: 1, // days
            path: "/",
            domain: "",
            secure: true, // https
            sameSite: "none",
        };

        const optionsToUse = { ...defaults, ...options };

        const expiresDate = new Date(
            Date.now() + optionsToUse.expires * 24 * 60 * 60 * 1000
        );
        cookieString += `; expires=${expiresDate.toUTCString()}`;

        cookieString += `; path=${optionsToUse.path}`;
        cookieString += `; domain=${optionsToUse.domain}`;
        if (optionsToUse.secure) cookieString += "; secure";
        if (optionsToUse.sameSite === "none") cookieString += "; samesite=none";

        document.cookie = cookieString;
    }

    /**
     * Retrieves the value of a cookie by its name.
     * @param {string} name The name of the cookie to retrieve.
     * @returns {string|null} The value of the cookie, or null if not found.
     */
    static getCookieByName(name) {
        const match = document.cookie.match(
            new RegExp("(^| )" + name + "=([^;]+)")
        );
        if (match) {
            return match[2];
        }
        return null;
    }

    /**
     * Deletes a cookie by its name.
     * @param {string} name The name of the cookie to delete.
     */
    static deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    /**
     * Checks if the cursor is at the end of a content-editable element or a text/textarea input.
     * It also returns true if the element is not currently focused.
     * @param {HTMLElement} editableElement The element to check.
     * @returns {boolean} True if the cursor is at the end or the element is not focused, otherwise false.
     */
    static isCursorAtEndOrNotFocused(editableElement) {
        if (
            editableElement.tagName === "INPUT" ||
            editableElement.tagName === "TEXTAREA"
        ) {
            return (
                editableElement.selectionStart ===
                    editableElement.value.length &&
                editableElement.selectionStart === editableElement.selectionEnd
            );
        }

        const selection = window.getSelection();
        if (
            !selection.rangeCount ||
            !editableElement.contains(selection.getRangeAt(0).startContainer)
        ) {
            return true;
        }

        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        const currentNode = range.startContainer;

        if (currentNode.nodeType === Node.TEXT_NODE) {
            return (
                cursorPosition === currentNode.length &&
                currentNode === editableElement.lastChild &&
                range.endOffset === cursorPosition
            );
        } else {
            const lastChild = editableElement.lastChild;
            return (
                lastChild &&
                range.startContainer === editableElement &&
                range.startOffset === editableElement.childNodes.length
            );
        }
    }

    /**
     * Checks if the cursor is at the beginning of a content-editable element or a text/textarea input.
     * It also returns true if the element is not currently focused.
     * @param {HTMLElement} editableElement The element to check.
     * @returns {boolean} True if the cursor is at the start or the element is not focused, otherwise false.
     */
    static isCursorAtStartOrNotFocused(editableElement) {
        if (
            editableElement.tagName === "INPUT" ||
            editableElement.tagName === "TEXTAREA"
        ) {
            return (
                editableElement.selectionStart === 0 &&
                editableElement.selectionEnd === 0
            );
        }

        const selection = window.getSelection();
        if (
            !selection.rangeCount ||
            !editableElement.contains(selection.getRangeAt(0).startContainer)
        ) {
            return true;
        }

        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        const currentNode = range.startContainer;

        if (currentNode.nodeType === Node.TEXT_NODE) {
            return (
                cursorPosition === 0 &&
                currentNode === editableElement.firstChild &&
                range.endOffset === cursorPosition
            );
        } else {
            return (
                range.startContainer === editableElement &&
                range.startOffset === 0
            );
        }
    }

    /**
     * Sets the cursor position at the beginning or end of a content-editable div.
     * @param {HTMLElement} editableDiv The content-editable element.
     * @param {boolean} isFirst If true, sets the cursor at the beginning; if false, at the end.
     */
    static setCursorAtEdge(editableDiv, isFirst) {
        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(editableDiv);
        range.collapse(isFirst);

        selection.removeAllRanges();
        selection.addRange(range);

        editableDiv.focus();
    }

    /**
     * Scrolls the window or a parent element to make a given element visible.
     * @param {HTMLElement} element The element to ensure is visible.
     * @param {object} [options={}] Optional settings for the scroll behavior.
     * @param {number} [options.padding=65] The padding to maintain around the element.
     * @param {boolean} [options.scrollParent=true] If true, scrolls parent containers in addition to the window.
     * @param {boolean} [options.center=false] If true, attempts to center the element in the viewport.
     */
    static ensureVisible(element, options = {}) {
        const { padding = 65, scrollParent = true, center = false } = options;

        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Vertical check
        if (rect.top < padding || rect.bottom > viewportHeight - padding) {
            const scrollToY = center
                ? rect.top +
                  window.scrollY -
                  viewportHeight / 2 +
                  rect.height / 2
                : rect.top + window.scrollY - padding;

            window.scrollTo({
                top: scrollToY,
                behavior: "smooth",
            });
        }

        // Horizontal check (if needed)
        if (rect.left < padding || rect.right > viewportWidth - padding) {
            const scrollToX = center
                ? rect.left +
                  window.scrollX -
                  viewportWidth / 2 +
                  rect.width / 2
                : rect.left + window.scrollX - padding;

            window.scrollTo({
                left: scrollToX,
                behavior: "smooth",
            });
        }

        // Handle overflow containers
        if (scrollParent) {
            let parent = element.parentElement;
            while (parent && parent !== document.body) {
                if (parent.scrollHeight > parent.clientHeight) {
                    const parentRect = parent.getBoundingClientRect();
                    const relativeTop = rect.top - parentRect.top;

                    if (
                        relativeTop < padding ||
                        relativeTop > parentRect.height - padding
                    ) {
                        parent.scrollTo({
                            top: element.offsetTop - parent.offsetTop - padding,
                            behavior: "smooth",
                        });
                    }
                }
                parent = parent.parentElement;
            }
        }
    }

    /**
     * Positions an element directly below a reference element on the page.
     * This is useful for creating tooltips, dropdowns, or popups.
     * @param {HTMLElement} referenceElement The element to position relative to.
     * @param {HTMLElement} elementToShow The element to be positioned.
     */
    static showElementUnder(referenceElement, elementToShow) {
        const rect = referenceElement.getBoundingClientRect();
        elementToShow.style.position = "absolute";
        elementToShow.style.top = `${rect.bottom + window.scrollY}px`;
        elementToShow.style.left = `${rect.left + window.scrollX}px`;
        elementToShow.style.zIndex = "9999";
    }

    /**
     * Gets the start and end position of the text selection within a content-editable element.
     * @param {HTMLElement} element The content-editable element.
     * @returns {{start: number, end: number}} An object with the start and end offsets of the selection.
     */
    static getEditableSelection(element) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0)
            return {
                start: 0,
                end: 0,
            };

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        return {
            start: preCaretRange.toString().length,
            end: preCaretRange.toString().length + range.toString().length,
        };
    }

    /**
     * Sets the text selection within a content-editable element to a specific range.
     * @param {HTMLElement} element The content-editable element.
     * @param {number} start The starting character offset for the selection.
     * @param {number} [end=start] The ending character offset for the selection.
     */
    static setContentEditableSelection(element, start, end = start) {
        const selection = window.getSelection();
        const range = document.createRange();
        const startNode = Utils.getTextNodeAtPosition(element, start);
        const endNode =
            end !== start
                ? Utils.getTextNodeAtPosition(element, end)
                : startNode;

        range.setStart(startNode.node, startNode.offset);
        range.setEnd(endNode.node, endNode.offset);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Finds the text node and offset at a specific character position within a given root element.
     * This is a helper function for `setContentEditableSelection`.
     * @param {HTMLElement} root The root element to search within.
     * @param {number} position The character position to find.
     * @returns {{node: Node, offset: number}} An object with the text node and its corresponding offset.
     */
    static getTextNodeAtPosition(root, position) {
        const treeWalker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentPosition = 0;
        let currentNode;

        while ((currentNode = treeWalker.nextNode())) {
            const nodeLength = currentNode.length;
            if (
                position >= currentPosition &&
                position <= currentPosition + nodeLength
            ) {
                return {
                    node: currentNode,
                    offset: position - currentPosition,
                };
            }
            currentPosition += nodeLength;
        }

        return {
            node: currentNode || document.createTextNode(""),
            offset: currentNode?.length || 0,
        };
    }
}
