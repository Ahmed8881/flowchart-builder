// Global Variables
let nodes = [];
let connections = [];
let history = [];
let historyIndex = -1;
let nodeIdCounter = 0;
let connectionIdCounter = 0;
let selectedNode = null;
let selectedConnection = null;
let isConnectionMode = false;
let firstConnectNode = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let canvasOffset = { x: 0, y: 0 };
let zoomLevel = 1;
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let currentTheme = 'dark';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateDisplay();
    updateStatusBar();
    setTheme(currentTheme);
    loadFromLocalStorage();
});

// Event Listeners
function initializeEventListeners() {
    const flowchart = document.getElementById('flowchart');
    const nodeText = document.getElementById('nodeText');
    const nodeSearch = document.getElementById('nodeSearch');
    const showGrid = document.getElementById('showGrid');
    const snapToGrid = document.getElementById('snapToGrid');
    const showNodeIds = document.getElementById('showNodeIds');
    const zoomSlider = document.getElementById('zoomSlider');
    const fileInput = document.getElementById('fileInput');

    // Node text input
    nodeText.addEventListener('input', updateCharCount);
    nodeText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addNode();
    });

    // Search functionality
    nodeSearch.addEventListener('input', filterNodes);

    // Settings
    showGrid.addEventListener('change', toggleGrid);
    snapToGrid.addEventListener('change', toggleSnapToGrid);
    showNodeIds.addEventListener('change', toggleNodeIds);
    zoomSlider.addEventListener('input', handleZoom);

    // Canvas events
    flowchart.addEventListener('mousedown', handleCanvasMouseDown);
    flowchart.addEventListener('mousemove', handleCanvasMouseMove);
    flowchart.addEventListener('mouseup', handleCanvasMouseUp);
    flowchart.addEventListener('contextmenu', handleContextMenu);
    flowchart.addEventListener('wheel', handleWheel);

    // Global events
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleGlobalClick);
    
    // File input
    fileInput.addEventListener('change', handleFileLoad);

    // Modal close events
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    });
}

// Node Management
function addNode() {
    const text = document.getElementById('nodeText').value.trim();
    const type = document.getElementById('nodeType').value;
    const color = document.getElementById('nodeColor').value;
    const size = document.getElementById('nodeSize').value;

    if (!text) {
        alert('Please enter node text');
        return;
    }

    const node = {
        id: nodeIdCounter++,
        text: text,
        type: type,
        color: color,
        size: size,
        x: 100 + (nodes.length * 180),
        y: 100 + (nodes.length % 3) * 120
    };

    nodes.push(node);
    
    // Auto-connect to previous node if exists and not in connection mode
    if (nodes.length > 1 && !isConnectionMode) {
        connections.push({
            id: connectionIdCounter++,
            from: nodes[nodes.length - 2].id,
            to: node.id
        });
    }

    document.getElementById('nodeText').value = '';
    saveToHistory();
    updateDisplay();
    updateStatusBar();
    autoSave();
}

function removeNode(nodeId) {
    nodes = nodes.filter(node => node.id !== nodeId);
    connections = connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId);
    
    if (selectedNode && selectedNode.id === nodeId) {
        selectedNode = null;
    }
    
    saveToHistory();
    updateDisplay();
    updateStatusBar();
    autoSave();
}

function editNode() {
    if (!selectedNode) return;
    
    document.getElementById('editNodeText').value = selectedNode.text;
    document.getElementById('editNodeType').value = selectedNode.type;
    document.getElementById('editModal').style.display = 'block';
}

function saveNodeEdit() {
    if (!selectedNode) return;
    
    selectedNode.text = document.getElementById('editNodeText').value;
    selectedNode.type = document.getElementById('editNodeType').value;
    
    saveToHistory();
    updateDisplay();
    closeModal();
    autoSave();
}

function duplicateNode() {
    if (!selectedNode) return;
    
    const newNode = {
        ...selectedNode,
        id: nodeIdCounter++,
        x: selectedNode.x + 150,
        y: selectedNode.y + 50
    };
    
    nodes.push(newNode);
    saveToHistory();
    updateDisplay();
    updateStatusBar();
    autoSave();
}

function changeNodeColor() {
    if (!selectedNode) return;
    
    const color = prompt('Enter new color (hex):', selectedNode.color);
    if (color) {
        selectedNode.color = color;
        saveToHistory();
        updateDisplay();
        autoSave();
    }
}

function deleteSelectedNode() {
    if (selectedNode) {
        removeNode(selectedNode.id);
        hideContextMenu();
    }
}

// Connection Management
function toggleConnectionMode() {
    isConnectionMode = !isConnectionMode;
    firstConnectNode = null;
    
    document.getElementById('connectionModeText').textContent = 
        isConnectionMode ? 'Exit Connect' : 'Connect Mode';
    
    // Update button style
    const btn = document.querySelector('[onclick="toggleConnectionMode()"]');
    if (isConnectionMode) {
        btn.classList.add('btn-warning');
        btn.classList.remove('btn-secondary');
    } else {
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-warning');
    }
    
    updateDisplay();
}

function createConnection(fromNodeId, toNodeId) {
    // Check if connection already exists
    const exists = connections.some(conn => 
        (conn.from === fromNodeId && conn.to === toNodeId) ||
        (conn.from === toNodeId && conn.to === fromNodeId)
    );
    
    if (!exists) {
        connections.push({
            id: connectionIdCounter++,
            from: fromNodeId,
            to: toNodeId
        });
        
        saveToHistory();
        updateDisplay();
        updateStatusBar();
        autoSave();
    }
}

function removeConnection(connectionId) {
    connections = connections.filter(conn => conn.id !== connectionId);
    
    if (selectedConnection && selectedConnection.id === connectionId) {
        selectedConnection = null;
    }
    
    saveToHistory();
    updateDisplay();
    updateStatusBar();
    autoSave();
}

// Layout Management
function autoLayout() {
    if (nodes.length === 0) return;
    
    const containerWidth = document.getElementById('flowchart').clientWidth;
    const containerHeight = document.getElementById('flowchart').clientHeight;
    const nodeSpacing = 200;
    const rowHeight = 150;
    const nodesPerRow = Math.floor(containerWidth / nodeSpacing);
    
    nodes.forEach((node, index) => {
        const col = index % nodesPerRow;
        const row = Math.floor(index / nodesPerRow);
        
        node.x = 50 + col * nodeSpacing;
        node.y = 50 + row * rowHeight;
    });
    
    saveToHistory();
    updateDisplay();
    autoSave();
}

function clearChart() {
    if (nodes.length > 0 && !confirm('Are you sure you want to clear all nodes?')) {
        return;
    }
    
    nodes = [];
    connections = [];
    selectedNode = null;
    selectedConnection = null;
    firstConnectNode = null;
    nodeIdCounter = 0;
    connectionIdCounter = 0;
    
    saveToHistory();
    updateDisplay();
    updateStatusBar();
    autoSave();
}

// Display Management
function updateDisplay() {
    const flowchart = document.getElementById('flowchart');
    const nodesList = document.getElementById('nodesList');
    
    // Clear existing display
    flowchart.innerHTML = '';
    nodesList.innerHTML = '';
    
    // Apply zoom
    flowchart.style.transform = `scale(${zoomLevel})`;
    
    // Draw connections first
    connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        
        if (fromNode && toNode) {
            drawConnection(fromNode, toNode, conn);
        }
    });
    
    // Draw nodes
    nodes.forEach(node => {
        const nodeElement = createNodeElement(node);
        flowchart.appendChild(nodeElement);
        
        // Add to nodes list
        const listItem = createNodeListItem(node);
        nodesList.appendChild(listItem);
    });
    
    // Update minimap
    updateMinimap();
}

function createNodeElement(node) {
    const nodeElement = document.createElement('div');
    nodeElement.className = `node ${node.type} ${node.size}`;
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;
    nodeElement.style.backgroundColor = node.color;
    nodeElement.dataset.nodeId = node.id;
    
    // Add selection and connection mode styling
    if (selectedNode && selectedNode.id === node.id) {
        nodeElement.classList.add('selected');
    }
    
    if (isConnectionMode && firstConnectNode && firstConnectNode.id === node.id) {
        nodeElement.classList.add('connecting');
    }
    
    // Node content
    const content = document.createElement('div');
    content.className = 'node-content';
    content.textContent = node.text;
    nodeElement.appendChild(content);
    
    // Node ID badge
    if (document.getElementById('showNodeIds').checked) {
        const idBadge = document.createElement('div');
        idBadge.className = 'node-id';
        idBadge.textContent = node.id;
        nodeElement.appendChild(idBadge);
    }
    
    // Event listeners
    nodeElement.addEventListener('mousedown', (e) => handleNodeMouseDown(e, node));
    nodeElement.addEventListener('click', (e) => handleNodeClick(e, node));
    
    return nodeElement;
}

function createNodeListItem(node) {
    const listItem = document.createElement('div');
    listItem.className = 'node-item';
    listItem.dataset.nodeId = node.id;
    
    if (selectedNode && selectedNode.id === node.id) {
        listItem.classList.add('selected');
    }
    
    listItem.innerHTML = `
        <div class="node-item-info">
            <div>${node.text}</div>
            <div class="node-item-type">${node.type}</div>
        </div>
        <div class="node-item-actions">
            <button class="btn-small" onclick="removeNode(${node.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    listItem.addEventListener('click', () => selectNode(node));
    
    return listItem;
}

function drawConnection(fromNode, toNode, connection) {
    const flowchart = document.getElementById('flowchart');
    const nodeWidth = getNodeWidth(fromNode.size);
    const nodeHeight = getNodeHeight(fromNode.size);
    
    // Calculate connection points at the edges of nodes
    let fromX, fromY, toX, toY;
    
    const fromCenterX = fromNode.x + nodeWidth / 2;
    const fromCenterY = fromNode.y + nodeHeight / 2;
    const toCenterX = toNode.x + nodeWidth / 2;
    const toCenterY = toNode.y + nodeHeight / 2;
    
    // Determine connection direction and edge points
    const deltaX = toCenterX - fromCenterX;
    const deltaY = toCenterY - fromCenterY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal connection
        if (deltaX > 0) {
            fromX = fromNode.x + nodeWidth;
            fromY = fromCenterY;
            toX = toNode.x;
            toY = toCenterY;
        } else {
            fromX = fromNode.x;
            fromY = fromCenterY;
            toX = toNode.x + nodeWidth;
            toY = toCenterY;
        }
        
        // Draw horizontal line
        const line = document.createElement('div');
        line.className = 'connection horizontal';
        line.style.left = `${Math.min(fromX, toX)}px`;
        line.style.top = `${fromY - 1.5}px`;
        line.style.width = `${Math.abs(toX - fromX)}px`;
        line.dataset.connectionId = connection.id;
        
        if (selectedConnection && selectedConnection.id === connection.id) {
            line.classList.add('selected');
        }
        
        line.addEventListener('click', () => selectConnection(connection));
        flowchart.appendChild(line);
        
        // Draw arrow
        const arrow = document.createElement('div');
        if (deltaX > 0) {
            arrow.className = 'arrow right';
            arrow.style.left = `${toX - 10}px`;
            arrow.style.top = `${toY - 5}px`;
        } else {
            arrow.className = 'arrow left';
            arrow.style.left = `${toX + 10}px`;
            arrow.style.top = `${toY - 5}px`;
        }
        
        if (selectedConnection && selectedConnection.id === connection.id) {
            arrow.classList.add('selected');
        }
        
        flowchart.appendChild(arrow);
        
    } else {
        // Vertical connection
        if (deltaY > 0) {
            fromX = fromCenterX;
            fromY = fromNode.y + nodeHeight;
            toX = toCenterX;
            toY = toNode.y;
        } else {
            fromX = fromCenterX;
            fromY = fromNode.y;
            toX = toCenterX;
            toY = toNode.y + nodeHeight;
        }
        
        // Draw vertical line
        const line = document.createElement('div');
        line.className = 'connection vertical';
        line.style.left = `${fromX - 1.5}px`;
        line.style.top = `${Math.min(fromY, toY)}px`;
        line.style.height = `${Math.abs(toY - fromY)}px`;
        line.dataset.connectionId = connection.id;
        
        if (selectedConnection && selectedConnection.id === connection.id) {
            line.classList.add('selected');
        }
        
        line.addEventListener('click', () => selectConnection(connection));
        flowchart.appendChild(line);
        
        // Draw arrow
        const arrow = document.createElement('div');
        if (deltaY > 0) {
            arrow.className = 'arrow down';
            arrow.style.left = `${toX - 5}px`;
            arrow.style.top = `${toY - 10}px`;
        } else {
            arrow.className = 'arrow up';
            arrow.style.left = `${toX - 5}px`;
            arrow.style.top = `${toY + 10}px`;
        }
        
        if (selectedConnection && selectedConnection.id === connection.id) {
            arrow.classList.add('selected');
        }
        
        flowchart.appendChild(arrow);
    }
}

// Helper functions for node dimensions
function getNodeWidth(size) {
    switch (size) {
        case 'small': return 100;
        case 'medium': return 150;
        case 'large': return 200;
        default: return 150;
    }
}

function getNodeHeight(size) {
    switch (size) {
        case 'small': return 50;
        case 'medium': return 60;
        case 'large': return 80;
        default: return 60;
    }
}

// Event Handlers
function handleNodeMouseDown(e, node) {
    e.stopPropagation();
    
    if (isConnectionMode) {
        if (!firstConnectNode) {
            firstConnectNode = node;
            updateDisplay();
        } else if (firstConnectNode.id !== node.id) {
            createConnection(firstConnectNode.id, node.id);
            firstConnectNode = null;
            updateDisplay();
        }
        return;
    }
    
    selectNode(node);
    
    // Start dragging
    isDragging = true;
    const rect = document.getElementById('flowchart').getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left - node.x;
    dragOffset.y = e.clientY - rect.top - node.y;
    
    document.addEventListener('mousemove', handleNodeDrag);
    document.addEventListener('mouseup', handleNodeDragEnd);
}

function handleNodeClick(e, node) {
    e.stopPropagation();
    selectNode(node);
}

function handleNodeDrag(e) {
    if (!isDragging || !selectedNode) return;
    
    const rect = document.getElementById('flowchart').getBoundingClientRect();
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;
    
    // Snap to grid if enabled
    if (document.getElementById('snapToGrid').checked) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
    }
    
    // Keep node within bounds
    const nodeWidth = getNodeWidth(selectedNode.size);
    const nodeHeight = getNodeHeight(selectedNode.size);
    
    newX = Math.max(0, Math.min(newX, rect.width - nodeWidth));
    newY = Math.max(0, Math.min(newY, rect.height - nodeHeight));
    
    selectedNode.x = newX;
    selectedNode.y = newY;
    
    updateDisplay();
    updateCoordinates(newX, newY);
}

function handleNodeDragEnd() {
    if (isDragging) {
        isDragging = false;
        saveToHistory();
        autoSave();
        
        document.removeEventListener('mousemove', handleNodeDrag);
        document.removeEventListener('mouseup', handleNodeDragEnd);
    }
}

function handleCanvasMouseDown(e) {
    if (e.target.id === 'flowchart') {
        // Clear selection
        selectedNode = null;
        selectedConnection = null;
        updateDisplay();
        hideContextMenu();
        
        // Start selection box
        isSelecting = true;
        const rect = e.target.getBoundingClientRect();
        selectionStart.x = e.clientX - rect.left;
        selectionStart.y = e.clientY - rect.top;
    }
}

function handleCanvasMouseMove(e) {
    const rect = document.getElementById('flowchart').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    updateCoordinates(x, y);
    
    if (isSelecting && e.target.id === 'flowchart') {
        // Draw selection box
        const flowchart = document.getElementById('flowchart');
        let selectionBox = document.querySelector('.selection-box');
        
        if (!selectionBox) {
            selectionBox = document.createElement('div');
            selectionBox.className = 'selection-box';
            flowchart.appendChild(selectionBox);
        }
        
        const left = Math.min(selectionStart.x, x);
        const top = Math.min(selectionStart.y, y);
        const width = Math.abs(x - selectionStart.x);
        const height = Math.abs(y - selectionStart.y);
        
        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
    }
}

function handleCanvasMouseUp(e) {
    if (isSelecting) {
        isSelecting = false;
        
        // Remove selection box
        const selectionBox = document.querySelector('.selection-box');
        if (selectionBox) {
            selectionBox.remove();
        }
        
        // Select nodes within selection box
        const rect = document.getElementById('flowchart').getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const left = Math.min(selectionStart.x, x);
        const top = Math.min(selectionStart.y, y);
        const right = Math.max(selectionStart.x, x);
        const bottom = Math.max(selectionStart.y, y);
        
        const selectedNodes = nodes.filter(node => {
            const nodeWidth = getNodeWidth(node.size);
            const nodeHeight = getNodeHeight(node.size);
            
            return node.x >= left && node.y >= top && 
                   node.x + nodeWidth <= right && node.y + nodeHeight <= bottom;
        });
        
        if (selectedNodes.length === 1) {
            selectNode(selectedNodes[0]);
        }
    }
}

function handleContextMenu(e) {
    e.preventDefault();
    
    const nodeElement = e.target.closest('.node');
    if (nodeElement) {
        const nodeId = parseInt(nodeElement.dataset.nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            selectNode(node);
            showContextMenu(e.clientX, e.clientY);
        }
    }
}

function handleKeyDown(e) {
    if (e.key === 'Delete' && selectedNode) {
        deleteSelectedNode();
    } else if (e.key === 'Delete' && selectedConnection) {
        removeConnection(selectedConnection.id);
    } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoAction();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redoAction();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFlowchart();
    } else if (e.key === 'Escape') {
        if (isConnectionMode) {
            toggleConnectionMode();
        }
        selectedNode = null;
        selectedConnection = null;
        updateDisplay();
    }
}

function handleGlobalClick(e) {
    if (!e.target.closest('.context-menu')) {
        hideContextMenu();
    }
}

function handleWheel(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomLevel = Math.max(0.5, Math.min(2, zoomLevel + delta));
        
        document.getElementById('zoomSlider').value = zoomLevel;
        document.getElementById('zoomValue').textContent = Math.round(zoomLevel * 100) + '%';
        
        updateDisplay();
    }
}

// Selection Management
function selectNode(node) {
    selectedNode = node;
    selectedConnection = null;
    updateDisplay();
    updateStatusBar();
}

function selectConnection(connection) {
    selectedConnection = connection;
    selectedNode = null;
    updateDisplay();
    updateStatusBar();
}

// UI Controls
function updateCharCount() {
    const input = document.getElementById('nodeText');
    const counter = document.querySelector('.char-count');
    counter.textContent = `${input.value.length}/50`;
}

function filterNodes() {
    const searchTerm = document.getElementById('nodeSearch').value.toLowerCase();
    const nodeItems = document.querySelectorAll('.node-item');
    
    nodeItems.forEach(item => {
        const text = item.querySelector('.node-item-info div').textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}

function toggleGrid() {
    const showGrid = document.getElementById('showGrid').checked;
    const flowchart = document.getElementById('flowchart');
    
    if (showGrid) {
        flowchart.classList.remove('grid-hidden');
    } else {
        flowchart.classList.add('grid-hidden');
    }
}

function toggleSnapToGrid() {
    // This is handled in the drag function
}

function toggleNodeIds() {
    updateDisplay();
}

function handleZoom() {
    zoomLevel = parseFloat(document.getElementById('zoomSlider').value);
    document.getElementById('zoomValue').textContent = Math.round(zoomLevel * 100) + '%';
    updateDisplay();
}

function updateCoordinates(x, y) {
    document.getElementById('coordinates').textContent = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
}

function updateStatusBar() {
    document.getElementById('nodeCount').textContent = `Nodes: ${nodes.length}`;
    document.getElementById('connectionCount').textContent = `Connections: ${connections.length}`;
    
    if (selectedNode) {
        document.getElementById('selectedInfo').textContent = `Selected: ${selectedNode.text}`;
    } else if (selectedConnection) {
        const fromNode = nodes.find(n => n.id === selectedConnection.from);
        const toNode = nodes.find(n => n.id === selectedConnection.to);
        document.getElementById('selectedInfo').textContent = 
            `Connection: ${fromNode.text} → ${toNode.text}`;
    } else {
        document.getElementById('selectedInfo').textContent = 'No selection';
    }
}

// Context Menu
function showContextMenu(x, y) {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
}

function hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
}

// Modals
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function exportFlowchart() {
    document.getElementById('exportModal').style.display = 'block';
}

// Theme Management
function setTheme(theme) {
    currentTheme = theme;
    document.body.className = `theme-${theme}`;
    
    // Update active theme button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
    
    localStorage.setItem('flowchart-theme', theme);
}

// History Management
function saveToHistory() {
    const state = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections)),
        nodeIdCounter,
        connectionIdCounter
    };
    
    // Remove future history if we're not at the end
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    history.push(state);
    historyIndex = history.length - 1;
    
    // Limit history size
    if (history.length > 50) {
        history.shift();
        historyIndex--;
    }
}

function undoAction() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = history[historyIndex];
        
        nodes = JSON.parse(JSON.stringify(state.nodes));
        connections = JSON.parse(JSON.stringify(state.connections));
        nodeIdCounter = state.nodeIdCounter;
        connectionIdCounter = state.connectionIdCounter;
        
        selectedNode = null;
        selectedConnection = null;
        
        updateDisplay();
        updateStatusBar();
        autoSave();
    }
}

function redoAction() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const state = history[historyIndex];
        
        nodes = JSON.parse(JSON.stringify(state.nodes));
        connections = JSON.parse(JSON.stringify(state.connections));
        nodeIdCounter = state.nodeIdCounter;
        connectionIdCounter = state.connectionIdCounter;
        
        selectedNode = null;
        selectedConnection = null;
        
        updateDisplay();
        updateStatusBar();
        autoSave();
    }
}

// Minimap
function updateMinimap() {
    const minimap = document.getElementById('minimap');
    const minimapRect = minimap.getBoundingClientRect();
    const canvasRect = document.getElementById('flowchart').getBoundingClientRect();
    
    // Clear minimap
    minimap.innerHTML = '';
    
    // Calculate scale
    const scaleX = minimapRect.width / canvasRect.width;
    const scaleY = minimapRect.height / canvasRect.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Draw nodes in minimap
    nodes.forEach(node => {
        const minimapNode = document.createElement('div');
        minimapNode.className = 'minimap-node';
        minimapNode.style.left = `${node.x * scale}px`;
        minimapNode.style.top = `${node.y * scale}px`;
        minimapNode.style.width = `${getNodeWidth(node.size) * scale}px`;
        minimapNode.style.height = `${getNodeHeight(node.size) * scale}px`;
        minimapNode.style.backgroundColor = node.color;
        minimap.appendChild(minimapNode);
    });
    
    // Draw viewport
    const viewport = document.createElement('div');
    viewport.className = 'minimap-viewport';
    viewport.style.width = `${minimapRect.width}px`;
    viewport.style.height = `${minimapRect.height}px`;
    minimap.appendChild(viewport);
}

// Save/Load/Export
function saveFlowchart() {
    const data = {
        nodes,
        connections,
        nodeIdCounter,
        connectionIdCounter,
        theme: currentTheme,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowchart-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadFlowchart() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.nodes && data.connections) {
                nodes = data.nodes;
                connections = data.connections;
                nodeIdCounter = data.nodeIdCounter || nodes.length;
                connectionIdCounter = data.connectionIdCounter || connections.length;
                currentTheme = data.theme || 'dark';
                setTheme(currentTheme);
                saveToHistory();
                updateDisplay();
                updateStatusBar();
                autoSave && autoSave();
            } else {
                alert('Invalid flowchart file.');
            }
        } catch (err) {
            alert('Error loading file: ' + err.message);
        }
    };
    reader.readAsText(file);
}