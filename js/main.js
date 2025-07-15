        let nodes = [];
        let connections = [];
        let nodeIdCounter = 0;

        function addNode() {
            const text = document.getElementById('nodeText').value.trim();
            const type = document.getElementById('nodeType').value;

            if (!text) {
                alert('Please enter node text');
                return;
            }

            const node = {
                id: nodeIdCounter++,
                text: text,
                type: type,
                x: 100 + (nodes.length * 150),
                y: 100 + (nodes.length % 3) * 100
            };

            nodes.push(node);
            
            // Auto-connect to previous node if exists
            if (nodes.length > 1) {
                connections.push({
                    from: nodes[nodes.length - 2].id,
                    to: node.id
                });
            }

            document.getElementById('nodeText').value = '';
            updateDisplay();
        }

        function removeNode(nodeId) {
            nodes = nodes.filter(node => node.id !== nodeId);
            connections = connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId);
            updateDisplay();
        }

        function clearChart() {
            nodes = [];
            connections = [];
            nodeIdCounter = 0;
            updateDisplay();
        }

        function autoLayout() {
            const containerWidth = document.getElementById('flowchart').clientWidth;
            const containerHeight = document.getElementById('flowchart').clientHeight;
            const nodeWidth = 150;
            const nodeHeight = 80;
            const horizontalSpacing = 200;
            const verticalSpacing = 120;

            nodes.forEach((node, index) => {
                const col = index % Math.floor(containerWidth / horizontalSpacing);
                const row = Math.floor(index / Math.floor(containerWidth / horizontalSpacing));
                
                node.x = 50 + col * horizontalSpacing;
                node.y = 50 + row * verticalSpacing;
            });

            updateDisplay();
        }

        function updateDisplay() {
            const flowchart = document.getElementById('flowchart');
            const nodesList = document.getElementById('nodesList');
            
            // Clear existing display
            flowchart.innerHTML = '';
            nodesList.innerHTML = '';

            // Draw connections first (so they appear behind nodes)
            connections.forEach(conn => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                
                if (fromNode && toNode) {
                    drawConnection(fromNode, toNode);
                }
            });

            // Draw nodes
            nodes.forEach(node => {
                const nodeElement = document.createElement('div');
                nodeElement.className = `node ${node.type}`;
                nodeElement.style.left = `${node.x}px`;
                nodeElement.style.top = `${node.y}px`;
                nodeElement.innerHTML = `<span>${node.text}</span>`;
                
                // Make nodes draggable
                nodeElement.addEventListener('mousedown', (e) => startDrag(e, node));
                
                flowchart.appendChild(nodeElement);

                // Add to nodes list
                const listItem = document.createElement('div');
                listItem.className = 'node-item';
                listItem.innerHTML = `
                    <div>
                        <div>${node.text}</div>
                        <div class="type">${node.type}</div>
                    </div>
                    <button class="btn-small" onclick="removeNode(${node.id})">Remove</button>
                `;
                nodesList.appendChild(listItem);
            });
        }

        function drawConnection(fromNode, toNode) {
            const flowchart = document.getElementById('flowchart');
            const nodeWidth = 150;
            const nodeHeight = 60;

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
                    // Left to right
                    fromX = fromNode.x + nodeWidth;
                    fromY = fromCenterY;
                    toX = toNode.x;
                    toY = toCenterY;
                } else {
                    // Right to left
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
                flowchart.appendChild(arrow);

            } else {
                // Vertical connection
                if (deltaY > 0) {
                    // Top to bottom
                    fromX = fromCenterX;
                    fromY = fromNode.y + nodeHeight;
                    toX = toCenterX;
                    toY = toNode.y;
                } else {
                    // Bottom to top
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
                flowchart.appendChild(arrow);
            }
        }

        let draggedNode = null;
        let dragOffset = { x: 0, y: 0 };

        function startDrag(e, node) {
            draggedNode = node;
            const rect = e.target.getBoundingClientRect();
            const flowchartRect = document.getElementById('flowchart').getBoundingClientRect();
            
            dragOffset.x = e.clientX - flowchartRect.left - node.x;
            dragOffset.y = e.clientY - flowchartRect.top - node.y;
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', endDrag);
            e.preventDefault();
        }

        function drag(e) {
            if (!draggedNode) return;
            
            const flowchartRect = document.getElementById('flowchart').getBoundingClientRect();
            
            draggedNode.x = e.clientX - flowchartRect.left - dragOffset.x;
            draggedNode.y = e.clientY - flowchartRect.top - dragOffset.y;
            
            // Keep node within bounds
            draggedNode.x = Math.max(0, Math.min(draggedNode.x, flowchartRect.width - 150));
            draggedNode.y = Math.max(0, Math.min(draggedNode.y, flowchartRect.height - 80));
            
            updateDisplay();
        }

        function endDrag() {
            draggedNode = null;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', endDrag);
        }

        // Handle Enter key in input
        document.getElementById('nodeText').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNode();
            }
        });

        // Initial display
        updateDisplay();