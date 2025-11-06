// State
let currentDate = new Date();
let selectedDate = null;
let currentPage = 0;
let notesData = {};
let pagesData = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    loadAllData();
    renderCalendar();
    setupEventListeners();
    
    // Initialize notifications on app startup (Cordova)
    if (window.cordova) {
        document.addEventListener('deviceready', function() {
            // Always check and request permission on every app open
            initializeNotifications();
        }, false);
        
        // Also check on resume (when app comes to foreground)
        document.addEventListener('resume', function() {
            // Check permission again when app resumes
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
                window.cordova.plugins.notification.local.hasPermission(function(granted) {
                    if (!granted) {
                        // Ask again if still not granted
                        requestNotificationPermission();
                    }
                });
            }
        }, false);
    }
    
    // Disable context menu on notes area
    const notesArea = document.getElementById('notesArea');
    notesArea.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable long press menu on mobile
    notesArea.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    });
    
    // Prevent copy/cut/paste context menu but allow text selection
    notesArea.style.webkitTouchCallout = 'none';
    
    // Move cursor to end when clicking in notes area
    notesArea.addEventListener('click', function(e) {
        // If clicking on empty area or at end, move cursor to end
        const range = document.createRange();
        const sel = window.getSelection();
        
        // Get the last child node
        if (this.childNodes.length > 0) {
            const lastNode = this.childNodes[this.childNodes.length - 1];
            
            // If click is near the end, move cursor to end
            const rect = this.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const contentHeight = this.scrollHeight;
            
            // If clicked in bottom 20% of content, move to end
            if (clickY > contentHeight * 0.8) {
                try {
                    if (lastNode.nodeType === 3) {
                        range.setStart(lastNode, lastNode.length);
                    } else {
                        range.selectNodeContents(lastNode);
                        range.collapse(false);
                    }
                    sel.removeAllRanges();
                    sel.addRange(range);
                } catch(err) {}
            }
        }
        
        updateToolbarState();
    });
    
    // Update toolbar on selection change
    document.addEventListener('selectionchange', updateToolbarState);
    
    // Clear toolbar state when typing
    notesArea.addEventListener('mouseup', updateToolbarState);
    notesArea.addEventListener('keyup', updateToolbarState);
});

// Load Theme
function loadTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'lavender';
    document.body.className = `theme-${savedTheme}`;
}

// Load All Data
function loadAllData() {
    const savedNotes = localStorage.getItem('calendarNotes');
    const savedPages = localStorage.getItem('pagesData');
    
    if (savedNotes) {
        notesData = JSON.parse(savedNotes);
    }
    
    if (savedPages) {
        pagesData = JSON.parse(savedPages);
    }
}

// Save Data
function saveData() {
    localStorage.setItem('calendarNotes', JSON.stringify(notesData));
    localStorage.setItem('pagesData', JSON.stringify(pagesData));
}

// Event Listeners
function setupEventListeners() {
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', toggleSidebar);
    document.getElementById('closeSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('overlay').addEventListener('click', toggleSidebar);
    
    // Theme selection
    document.querySelectorAll('.theme-item').forEach(item => {
        item.addEventListener('click', function() {
            const theme = this.dataset.theme;
            applyTheme(theme);
        });
    });
    
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Notes view
    document.getElementById('backBtn').addEventListener('click', backToCalendar);
    document.getElementById('addPageBtn').addEventListener('click', addNewPage);
    document.getElementById('saveBtn').addEventListener('click', saveNotes);
    
    // Editor toolbar
    document.getElementById('fontSize').addEventListener('change', function() {
        const notesArea = document.getElementById('notesArea');
        notesArea.style.fontSize = this.value + 'px';
        notesArea.focus();
    });
    
    document.getElementById('boldBtn').addEventListener('click', () => applyFormat('bold'));
    document.getElementById('italicBtn').addEventListener('click', () => applyFormat('italic'));
    document.getElementById('underlineBtn').addEventListener('click', () => applyFormat('underline'));
    document.getElementById('highlightBtn').addEventListener('click', () => applyHighlight());
    document.getElementById('clearFormatBtn').addEventListener('click', () => clearAllFormatting());
}

// Update Toolbar State
function updateToolbarState() {
    const selection = window.getSelection();
    const notesArea = document.getElementById('notesArea');
    
    // Reset all buttons first
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        if (btn.id !== 'fontSize' && btn.id !== 'clearFormatBtn' && btn.id !== 'highlightBtn') {
            btn.classList.remove('active');
        }
    });
    
    // Highlight and Clear Format buttons should NEVER be active automatically
    document.getElementById('highlightBtn').classList.remove('active');
    document.getElementById('clearFormatBtn').classList.remove('active');
    
    // Check if cursor is in notes area
    if (!selection.rangeCount || !notesArea.contains(selection.anchorNode)) {
        return;
    }
    
    // Get the node at cursor position
    let node = selection.anchorNode;
    if (node.nodeType === 3) node = node.parentNode;
    
    // Check formatting at cursor position (only for Bold, Italic, Underline)
    while (node && node !== notesArea) {
        const computedStyle = window.getComputedStyle(node);
        
        // Check for bold
        if (computedStyle.fontWeight === 'bold' || computedStyle.fontWeight >= 700 || node.tagName === 'B' || node.tagName === 'STRONG') {
            document.getElementById('boldBtn').classList.add('active');
        }
        
        // Check for italic
        if (computedStyle.fontStyle === 'italic' || node.tagName === 'I' || node.tagName === 'EM') {
            document.getElementById('italicBtn').classList.add('active');
        }
        
        // Check for underline
        if (computedStyle.textDecoration.includes('underline') || node.tagName === 'U') {
            document.getElementById('underlineBtn').classList.add('active');
        }
        
        node = node.parentNode;
    }
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Apply Theme
function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('selectedTheme', theme);
    toggleSidebar();
}

// Apply Format (Bold, Italic, Underline)
function applyFormat(command) {
    const notesArea = document.getElementById('notesArea');
    const selection = window.getSelection();
    
    notesArea.focus();
    
    // Check if there's a selection
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        // Text is selected - apply/remove formatting
        document.execCommand(command, false, null);
    } else {
        // No selection - toggle formatting for next typed text
        document.execCommand(command, false, null);
    }
    
    // Update toolbar state
    setTimeout(updateToolbarState, 10);
}

// Apply Highlight
function applyHighlight() {
    const notesArea = document.getElementById('notesArea');
    const selection = window.getSelection();
    
    // IMPORTANT: Only work when text is selected
    if (!selection.rangeCount || selection.isCollapsed) {
        alert('Please select text first to highlight!');
        return;
    }
    
    // Check if selection is in notes area
    if (!notesArea.contains(selection.anchorNode)) {
        return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Save selection position
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;
    
    // Check if selection contains highlighted content
    const fragment = range.cloneContents();
    const hasHighlight = fragment.querySelector('mark') !== null;
    
    if (hasHighlight) {
        // Remove highlight only, keep other formatting
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        
        const marksToRemove = [];
        let node;
        
        while (node = walker.nextNode()) {
            if (node.tagName === 'MARK' && range.intersectsNode(node)) {
                marksToRemove.push(node);
            }
        }
        
        marksToRemove.forEach(mark => {
            const parent = mark.parentNode;
            while (mark.firstChild) {
                parent.insertBefore(mark.firstChild, mark);
            }
            parent.removeChild(mark);
        });
        
    } else {
        // Add highlight, keep other formatting
        const span = document.createElement('span');
        span.innerHTML = range.toString();
        
        // Wrap in mark tag
        const mark = document.createElement('mark');
        mark.style.backgroundColor = '#ffeb3b';
        mark.style.padding = '2px 0';
        
        // Extract and wrap the content
        const contents = range.extractContents();
        mark.appendChild(contents);
        range.insertNode(mark);
    }
    
    // Clear selection and place cursor at end
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(notesArea);
    newRange.collapse(false);
    selection.addRange(newRange);
    
    notesArea.focus();
    
    // Update toolbar
    setTimeout(updateToolbarState, 10);
}

// Clear All Formatting
function clearAllFormatting() {
    const selection = window.getSelection();
    const notesArea = document.getElementById('notesArea');
    
    // IMPORTANT: Only work when text is selected
    if (!selection.rangeCount || selection.isCollapsed) {
        alert('Please select text first to clear formatting!');
        return;
    }
    
    // Check if selection is in notes area
    if (!notesArea.contains(selection.anchorNode)) {
        return;
    }
    
    // Get the range and selected text
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    // If no text selected
    if (!selectedText || selectedText.trim() === '') {
        alert('Please select text first to clear formatting!');
        return;
    }
    
    // Extract all content from selection (including nested elements)
    const fragment = range.cloneContents();
    
    // Get pure text content (removes ALL formatting: bold, italic, underline, highlight, etc)
    const plainText = fragment.textContent || selectedText;
    
    // Create a plain text node with absolutely NO formatting
    const textNode = document.createTextNode(plainText);
    
    // Replace selected formatted text with plain text
    range.deleteContents();
    range.insertNode(textNode);
    
    // Move cursor to END of the cleaned text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    notesArea.focus();
    
    // Update toolbar
    setTimeout(updateToolbarState, 10);
}

// Render Calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';
    
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, true, year, month - 1);
        daysContainer.appendChild(dayElement);
    }
    
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && 
                       month === today.getMonth() && 
                       year === today.getFullYear();
        const dayElement = createDayElement(day, false, year, month, isToday);
        daysContainer.appendChild(dayElement);
    }
    
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, true, year, month + 1);
        daysContainer.appendChild(dayElement);
    }
}

// Create Day Element
function createDayElement(day, isOtherMonth, year, month, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'day';
    dayElement.textContent = day;
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    if (isToday) {
        dayElement.classList.add('today');
    }
    
    const dateKey = getDateKey(year, month, day);
    if (notesData[dateKey] && Object.keys(notesData[dateKey]).length > 0) {
        dayElement.classList.add('has-note');
    }
    
    if (!isOtherMonth) {
        dayElement.addEventListener('click', () => {
            openNotesView(year, month, day);
        });
    } else {
        dayElement.addEventListener('click', () => {
            if (month < 0) {
                currentDate.setFullYear(year - 1);
                currentDate.setMonth(11);
            } else if (month > 11) {
                currentDate.setFullYear(year + 1);
                currentDate.setMonth(0);
            } else {
                currentDate.setMonth(month);
            }
            renderCalendar();
        });
    }
    
    return dayElement;
}

// Get Date Key
function getDateKey(year, month, day) {
    return `${year}-${month}-${day}`;
}

// Open Notes View
function openNotesView(year, month, day) {
    selectedDate = { year, month, day };
    const dateKey = getDateKey(year, month, day);
    
    if (!pagesData[dateKey]) {
        pagesData[dateKey] = [{ name: 'Page 1', content: '' }];
    }
    
    if (!notesData[dateKey]) {
        notesData[dateKey] = {};
    }
    
    currentPage = 0;
    renderPages();
    loadPageContent();
    
    document.getElementById('calendarView').style.display = 'none';
    document.getElementById('notesView').style.display = 'flex';
}

// Render Pages
function renderPages() {
    const dateKey = getDateKey(selectedDate.year, selectedDate.month, selectedDate.day);
    const pages = pagesData[dateKey];
    const container = document.getElementById('pagesContainer');
    container.innerHTML = '';
    
    pages.forEach((page, index) => {
        const pageTab = document.createElement('div');
        pageTab.className = 'page-tab';
        if (index === currentPage) {
            pageTab.classList.add('active');
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = page.name;
        nameSpan.className = 'page-name';
        pageTab.appendChild(nameSpan);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-page-btn';
        editBtn.innerHTML = '✎';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editPageName(pageTab, nameSpan, page, index);
        });
        pageTab.appendChild(editBtn);
        
        if (pages.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-page-btn';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePage(index);
            });
            pageTab.appendChild(deleteBtn);
        }
        
        pageTab.addEventListener('click', () => {
            if (pageTab.classList.contains('edit-mode')) return;
            currentPage = index;
            renderPages();
            loadPageContent();
        });
        
        container.appendChild(pageTab);
    });
}

// Edit Page Name
function editPageName(pageTab, nameSpan, page, index) {
    pageTab.classList.add('edit-mode');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = page.name;
    input.style.width = '80px';
    
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    
    function saveEdit() {
        page.name = input.value || 'Page';
        saveData();
        renderPages();
    }
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
}

// Add New Page
function addNewPage() {
    const dateKey = getDateKey(selectedDate.year, selectedDate.month, selectedDate.day);
    const pages = pagesData[dateKey];
    const newPageNumber = pages.length + 1;
    
    pages.push({
        name: `Page ${newPageNumber}`,
        content: ''
    });
    
    currentPage = pages.length - 1;
    saveData();
    renderPages();
    loadPageContent();
}

// Delete Page
function deletePage(index) {
    const dateKey = getDateKey(selectedDate.year, selectedDate.month, selectedDate.day);
    const pages = pagesData[dateKey];
    
    if (pages.length <= 1) return;
    
    pages.splice(index, 1);
    
    if (currentPage >= pages.length) {
        currentPage = pages.length - 1;
    }
    
    delete notesData[dateKey][index];
    
    const newNotesData = {};
    Object.keys(notesData[dateKey]).forEach(key => {
        const pageIndex = parseInt(key);
        if (pageIndex < index) {
            newNotesData[pageIndex] = notesData[dateKey][key];
        } else if (pageIndex > index) {
            newNotesData[pageIndex - 1] = notesData[dateKey][key];
        }
    });
    notesData[dateKey] = newNotesData;
    
    saveData();
    renderPages();
    loadPageContent();
    renderCalendar();
}

// Load Page Content
function loadPageContent() {
    const dateKey = getDateKey(selectedDate.year, selectedDate.month, selectedDate.day);
    const content = notesData[dateKey][currentPage] || '';
    const notesArea = document.getElementById('notesArea');
    notesArea.innerHTML = content;
    
    // Reset font size to default
    const fontSize = document.getElementById('fontSize');
    notesArea.style.fontSize = fontSize.value + 'px';
}

// Save Notes
function saveNotes() {
    const dateKey = getDateKey(selectedDate.year, selectedDate.month, selectedDate.day);
    const content = document.getElementById('notesArea').innerHTML;
    const pages = pagesData[dateKey];
    
    notesData[dateKey][currentPage] = content;
    pages[currentPage].content = content;
    
    saveData();
    
    const pageName = pages[currentPage].name;
    showSuccessPopup(pageName);
    
    // Schedule notification for next day 8 AM
    scheduleNotification(selectedDate.year, selectedDate.month, selectedDate.day, content);
    
    renderCalendar();
}

// Schedule Notification
function scheduleNotification(year, month, day, content) {
    // Get plain text from HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!plainText.trim()) {
        return; // Don't schedule if no content
    }
    
    // Create notification date (8 AM of the selected date)
    const notificationDate = new Date(year, month, day, 8, 0, 0);
    
    // Check if cordova plugin is available
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
        // Cancel any existing notification for this date
        const notificationId = parseInt(`${year}${month}${day}`);
        
        window.cordova.plugins.notification.local.cancel(notificationId, function() {
            // Schedule new notification
            window.cordova.plugins.notification.local.schedule({
                id: notificationId,
                title: 'Calendar Notes Reminder',
                text: plainText.substring(0, 200) + (plainText.length > 200 ? '...' : ''),
                trigger: { at: notificationDate },
                foreground: true,
                vibrate: true,
                sound: 'default',
                priority: 2
            });
        });
    }
}

// Show Success Popup
function showSuccessPopup(pageName) {
    const popup = document.getElementById('successPopup');
    const popupText = document.getElementById('popupText');
    
    popupText.textContent = `${pageName} Saved!`;
    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 2000);
}

// Back to Calendar
function backToCalendar() {
    document.getElementById('notesView').style.display = 'none';
    document.getElementById('calendarView').style.display = 'block';
    selectedDate = null;
}

// Initialize Notifications
function initializeNotifications() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
        // Check if permission is already granted
        window.cordova.plugins.notification.local.hasPermission(function(granted) {
            if (!granted) {
                // If not granted, request permission
                requestNotificationPermission();
            } else {
                // Permission already granted, schedule notifications
                console.log('Notification permission already granted');
                rescheduleAllNotifications();
            }
        });
        
        // Handle notification click
        window.cordova.plugins.notification.local.on('click', function (notification) {
            console.log('Notification clicked:', notification.id);
        });
    }
}

// Request Notification Permission (will keep asking until granted)
function requestNotificationPermission() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
        window.cordova.plugins.notification.local.requestPermission(function (granted) {
            if (granted) {
                console.log('Notification permission granted');
                // Save permission status
                localStorage.setItem('notificationPermission', 'granted');
                rescheduleAllNotifications();
            } else {
                console.log('Notification permission denied');
                // Don't save denied status, so it will ask again next time
                // Show alert to user
                setTimeout(function() {
                    alert('Please allow notification permission to get reminders for your notes!');
                }, 500);
            }
        });
    }
}

// Reschedule All Notifications
function rescheduleAllNotifications() {
    if (!window.cordova || !window.cordova.plugins || !window.cordova.plugins.notification) {
        return;
    }
    
    // Clear all existing notifications
    window.cordova.plugins.notification.local.cancelAll(function() {
        // Schedule notifications for all saved dates
        Object.keys(notesData).forEach(dateKey => {
            const notes = notesData[dateKey];
            
            // Check if there are any notes for this date
            let hasContent = false;
            let allContent = '';
            
            Object.keys(notes).forEach(pageIndex => {
                const content = notes[pageIndex];
                if (content && content.trim()) {
                    hasContent = true;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    const plainText = tempDiv.textContent || tempDiv.innerText || '';
                    allContent += plainText + ' ';
                }
            });
            
            if (hasContent && allContent.trim()) {
                // Parse date from key
                const parts = dateKey.split('-');
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const day = parseInt(parts[2]);
                
                // Schedule notification
                const notificationDate = new Date(year, month, day, 8, 0, 0);
                const notificationId = parseInt(`${year}${month}${day}`);
                
                // Only schedule if date is in future
                if (notificationDate > new Date()) {
                    window.cordova.plugins.notification.local.schedule({
                        id: notificationId,
                        title: 'Calendar Notes Reminder',
                        text: allContent.substring(0, 200) + (allContent.length > 200 ? '...' : ''),
                        trigger: { at: notificationDate },
                        foreground: true,
                        vibrate: true,
                        sound: 'default',
                        priority: 2
                    });
                }
            }
        });
    });
}