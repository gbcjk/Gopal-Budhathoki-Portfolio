document.addEventListener('DOMContentLoaded', function() {
    // File Explorer Application
    class FileExplorer {
        constructor() {
            // State management
            this.currentPath = '/';
            this.history = [];
            this.historyIndex = -1;
            this.selectedItems = [];
            this.clipboard = null;
            this.clipboardAction = null;
            this.viewMode = 'list';
            this.sortConfig = {
                column: 'name',
                direction: 'asc'
            };
            this.theme = 'light';
            
            // DOM elements
            this.elements = {
                // Toolbar
                backBtn: document.getElementById('back-btn'),
                forwardBtn: document.getElementById('forward-btn'),
                upBtn: document.getElementById('up-btn'),
                refreshBtn: document.getElementById('refresh-btn'),
                newFolderBtn: document.getElementById('new-folder-btn'),
                deleteBtn: document.getElementById('delete-btn'),
                viewListBtn: document.getElementById('view-list-btn'),
                viewGridBtn: document.getElementById('view-grid-btn'),
                themeToggle: document.getElementById('theme-toggle'),
                searchInput: document.getElementById('search-input'),
                
                // Main UI
                breadcrumbs: document.getElementById('breadcrumbs'),
                quickAccess: document.getElementById('quick-access'),
                drives: document.getElementById('drives'),
                fileView: document.getElementById('file-view'),
                fileList: document.getElementById('file-list'),
                previewPane: document.getElementById('preview-pane'),
                previewContent: document.getElementById('preview-content'),
                
                // Status bar
                statusCount: document.getElementById('status-count'),
                statusSelected: document.getElementById('status-selected'),
                
                // Context menu
                contextMenu: document.getElementById('context-menu'),
                ctxOpen: document.getElementById('ctx-open'),
                ctxNewFolder: document.getElementById('ctx-new-folder'),
                ctxRename: document.getElementById('ctx-rename'),
                ctxCut: document.getElementById('ctx-cut'),
                ctxCopy: document.getElementById('ctx-copy'),
                ctxPaste: document.getElementById('ctx-paste'),
                ctxDelete: document.getElementById('ctx-delete'),
                ctxProperties: document.getElementById('ctx-properties'),
                
                // Modals
                renameModal: document.getElementById('rename-modal'),
                renameInput: document.getElementById('rename-input'),
                renameCancel: document.getElementById('rename-cancel'),
                renameConfirm: document.getElementById('rename-confirm'),
                
                newFolderModal: document.getElementById('new-folder-modal'),
                newFolderInput: document.getElementById('new-folder-input'),
                newFolderCancel: document.getElementById('new-folder-cancel'),
                newFolderConfirm: document.getElementById('new-folder-confirm')
            };
            
            // Initialize
            this.initEventListeners();
            this.initFileSystem();
            this.navigateTo('/');
            this.updateUI();
        }
        
        // Initialize event listeners
        initEventListeners() {
            // Toolbar buttons
            this.elements.backBtn.addEventListener('click', () => this.goBack());
            this.elements.forwardBtn.addEventListener('click', () => this.goForward());
            this.elements.upBtn.addEventListener('click', () => this.goUp());
            this.elements.refreshBtn.addEventListener('click', () => this.refresh());
            this.elements.newFolderBtn.addEventListener('click', () => this.showNewFolderModal());
            this.elements.deleteBtn.addEventListener('click', () => this.deleteSelected());
            this.elements.viewListBtn.addEventListener('click', () => this.setViewMode('list'));
            this.elements.viewGridBtn.addEventListener('click', () => this.setViewMode('grid'));
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
            
            // Search
            this.elements.searchInput.addEventListener('input', (e) => this.searchFiles(e.target.value));
            
            // Quick access and drives
            this.elements.quickAccess.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => this.navigateTo(item.dataset.path));
            });
            
            this.elements.drives.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => this.navigateTo(item.dataset.path));
            });
            
            // File list header sorting
            this.elements.fileView.querySelectorAll('.file-view-header > div').forEach(header => {
                header.addEventListener('click', () => this.sortFiles(header.classList.contains('file-view-header-name') ? 'name' :
                    header.classList.contains('file-view-header-modified') ? 'modified' :
                    header.classList.contains('file-view-header-size') ? 'size' : 'type'));
            });
            
            // File list interactions
            this.elements.fileList.addEventListener('click', (e) => {
                const fileItem = e.target.closest('.file-item');
                if (fileItem) {
                    const filePath = fileItem.dataset.path;
                    const file = this.findFileByPath(filePath);
                    
                    if (e.ctrlKey || e.metaKey) {
                        // Multi-select with Ctrl/Cmd
                        this.toggleSelectItem(fileItem);
                    } else if (e.shiftKey && this.selectedItems.length > 0) {
                        // Range select with Shift
                        this.selectRange(fileItem);
                    } else {
                        // Single select
                        this.selectItem(fileItem, false);
                    }
                    
                    // Don't navigate on right-click or when just selecting
                    if (e.button !== 2 && !fileItem.classList.contains('selected')) {
                        if (file.type === 'folder') {
                            this.navigateTo(file.path);
                        } else {
                            this.previewFile(file);
                        }
                    }
                } else {
                    // Clicked outside any file item - clear selection
                    this.clearSelection();
                }
            });
            
            this.elements.fileList.addEventListener('dblclick', (e) => {
                const fileItem = e.target.closest('.file-item');
                if (fileItem) {
                    const filePath = fileItem.dataset.path;
                    const file = this.findFileByPath(filePath);
                    if (file.type === 'folder') {
                        this.navigateTo(file.path);
                    } else {
                        // In a real app, this would open the file
                        console.log(`Opening file: ${file.path}`);
                    }
                }
            });
            
            // Context menu
            document.addEventListener('click', () => this.hideContextMenu());
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e);
            });
            
            this.elements.ctxOpen.addEventListener('click', () => this.openSelected());
            this.elements.ctxNewFolder.addEventListener('click', () => this.showNewFolderModal());
            this.elements.ctxRename.addEventListener('click', () => this.showRenameModal());
            this.elements.ctxCut.addEventListener('click', () => this.cutSelected());
            this.elements.ctxCopy.addEventListener('click', () => this.copySelected());
            this.elements.ctxPaste.addEventListener('click', () => this.pasteClipboard());
            this.elements.ctxDelete.addEventListener('click', () => this.deleteSelected());
            this.elements.ctxProperties.addEventListener('click', () => this.showProperties());
            
            // Modals
            this.elements.renameCancel.addEventListener('click', () => this.hideRenameModal());
            this.elements.renameConfirm.addEventListener('click', () => this.confirmRename());
            this.elements.newFolderCancel.addEventListener('click', () => this.hideNewFolderModal());
            this.elements.newFolderConfirm.addEventListener('click', () => this.confirmNewFolder());
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'F2' && this.selectedItems.length === 1) {
                    e.preventDefault();
                    this.showRenameModal();
                } else if (e.key === 'Delete' && this.selectedItems.length > 0) {
                    e.preventDefault();
                    this.deleteSelected();
                } else if (e.key === 'F5') {
                    this.refresh();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.selectedItems.length > 0) {
                    e.preventDefault();
                    this.copySelected();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'x' && this.selectedItems.length > 0) {
                    e.preventDefault();
                    this.cutSelected();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && this.clipboard) {
                    e.preventDefault();
                    this.pasteClipboard();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                    e.preventDefault();
                    this.selectAll();
                }
            });
        }
        
        // Initialize mock file system
        initFileSystem() {
            this.fileSystem = {
                name: 'Root',
                type: 'folder',
                path: '/',
                modified: '2023-01-01',
                children: [
                    {
                        name: 'Documents',
                        type: 'folder',
                        path: '/Documents',
                        modified: '2023-05-15',
                        children: [
                            {
                                name: 'Project.docx',
                                type: 'document',
                                size: '245 KB',
                                modified: '2023-05-15',
                                path: '/Documents/Project.docx'
                            },
                            {
                                name: 'Report.pdf',
                                type: 'document',
                                size: '1.2 MB',
                                modified: '2023-06-20',
                                path: '/Documents/Report.pdf'
                            },
                            {
                                name: 'Notes.txt',
                                type: 'document',
                                size: '12 KB',
                                modified: '2023-04-10',
                                path: '/Documents/Notes.txt'
                            }
                        ]
                    },
                    {
                        name: 'Pictures',
                        type: 'folder',
                        path: '/Pictures',
                        modified: '2023-07-10',
                        children: [
                            {
                                name: 'Vacation.jpg',
                                type: 'image',
                                size: '3.5 MB',
                                modified: '2023-07-10',
                                path: '/Pictures/Vacation.jpg'
                            },
                            {
                                name: 'Profile.png',
                                type: 'image',
                                size: '1.8 MB',
                                modified: '2023-07-12',
                                path: '/Pictures/Profile.png'
                            }
                        ]
                    },
                    {
                        name: 'Music',
                        type: 'folder',
                        path: '/Music',
                        modified: '2023-04-05',
                        children: [
                            {
                                name: 'Song.mp3',
                                type: 'audio',
                                size: '4.7 MB',
                                modified: '2023-04-05',
                                path: '/Music/Song.mp3'
                            }
                        ]
                    },
                    {
                        name: 'Downloads',
                        type: 'folder',
                        path: '/Downloads',
                        modified: '2023-08-01',
                        children: [
                            {
                                name: 'Installer.exe',
                                type: 'application',
                                size: '15.2 MB',
                                modified: '2023-08-01',
                                path: '/Downloads/Installer.exe'
                            }
                        ]
                    },
                    {
                        name: 'README.txt',
                        type: 'document',
                        size: '12 KB',
                        modified: '2023-01-01',
                        path: '/README.txt'
                    }
                ]
            };
            
            // Add some mock drives
            this.drives = [
                {
                    name: 'Local Disk (C:)',
                    type: 'drive',
                    path: '/C',
                    modified: '2023-01-01',
                    size: '125 GB free of 250 GB',
                    children: [
                        {
                            name: 'Program Files',
                            type: 'folder',
                            path: '/C/Program Files',
                            modified: '2023-07-15'
                        },
                        {
                            name: 'Users',
                            type: 'folder',
                            path: '/C/Users',
                            modified: '2023-08-10'
                        }
                    ]
                },
                {
                    name: 'Data (D:)',
                    type: 'drive',
                    path: '/D',
                    modified: '2023-01-01',
                    size: '450 GB free of 500 GB',
                    children: [
                        {
                            name: 'Projects',
                            type: 'folder',
                            path: '/D/Projects',
                            modified: '2023-06-20'
                        },
                        {
                            name: 'Backups',
                            type: 'folder',
                            path: '/D/Backups',
                            modified: '2023-07-30'
                        }
                    ]
                }
            ];
        }
        
        // Navigation methods
        navigateTo(path) {
            const folder = this.findFileByPath(path);
            if (folder && folder.type === 'folder') {
                // Add to history
                if (this.historyIndex < this.history.length - 1) {
                    this.history = this.history.slice(0, this.historyIndex + 1);
                }
                this.history.push(path);
                this.historyIndex = this.history.length - 1;
                
                this.currentPath = path;
                this.currentFolder = folder;
                this.clearSelection();
                this.updateUI();
            }
        }
        
        goBack() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const path = this.history[this.historyIndex];
                this.currentPath = path;
                this.currentFolder = this.findFileByPath(path);
                this.clearSelection();
                this.updateUI();
            }
        }
        
        goForward() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                const path = this.history[this.historyIndex];
                this.currentPath = path;
                this.currentFolder = this.findFileByPath(path);
                this.clearSelection();
                this.updateUI();
            }
        }
        
        goUp() {
            if (this.currentPath !== '/') {
                const pathParts = this.currentPath.split('/');
                pathParts.pop();
                const parentPath = pathParts.join('/') || '/';
                this.navigateTo(parentPath);
            }
        }
        
        refresh() {
            // In a real app, this would reload from server
            this.clearSelection();
            this.updateUI();
        }
        
        // File system operations
        findFileByPath(path) {
            if (path === '/') return this.fileSystem;
            
            // Check if it's a drive path
            if (path.startsWith('/C') || path.startsWith('/D')) {
                const drive = this.drives.find(d => path.startsWith(d.path));
                if (!drive) return null;
                
                if (path === drive.path) return drive;
                
                const pathParts = path.substring(drive.path.length + 1).split('/');
                let current = drive;
                
                for (const part of pathParts) {
                    if (!current.children) return null;
                    current = current.children.find(item => item.name === part);
                    if (!current) return null;
                }
                
                return current;
            }
            
            const pathParts = path.split('/').filter(Boolean);
            let current = this.fileSystem;
            
            for (const part of pathParts) {
                if (!current.children) return null;
                current = current.children.find(item => item.name === part);
                if (!current) return null;
            }
            
            return current;
        }
        
        getParentFolder(path) {
            if (path === '/') return null;
            
            const pathParts = path.split('/').filter(Boolean);
            pathParts.pop();
            const parentPath = pathParts.join('/') || '/';
            return this.findFileByPath(parentPath);
        }
        
        // UI update methods
        updateUI() {
            this.updateBreadcrumbs();
            this.updateFileList();
            this.updateQuickAccess();
            this.updateStatusBar();
            this.updateNavigationButtons();
            this.updateViewModeButtons();
            this.updatePreviewPane();
        }
        
        updateBreadcrumbs() {
            this.elements.breadcrumbs.innerHTML = '';
            
            const paths = this.currentPath.split('/').filter(Boolean);
            let currentPath = '';
            
            // Add root
            const rootSpan = document.createElement('span');
            rootSpan.textContent = 'Root';
            rootSpan.dataset.path = '/';
            rootSpan.addEventListener('click', () => this.navigateTo('/'));
            this.elements.breadcrumbs.appendChild(rootSpan);
            
            // Add other paths
            paths.forEach((path, index) => {
                currentPath += `/${path}`;
                const span = document.createElement('span');
                span.textContent = path;
                span.dataset.path = currentPath;
                span.addEventListener('click', () => this.navigateTo(currentPath));
                this.elements.breadcrumbs.appendChild(span);
            });
        }
        
        updateFileList() {
            this.elements.fileList.innerHTML = '';
            
            let files = [];
            if (this.currentFolder.children) {
                files = [...this.currentFolder.children];
            }
            
            // Sort files
            this.sortFiles(this.sortConfig.column, this.sortConfig.direction, false);
            
            // Add ".." parent folder if not at root
            if (this.currentPath !== '/') {
                const parentItem = document.createElement('div');
                parentItem.className = 'file-item';
                parentItem.dataset.path = this.getParentFolder(this.currentPath).path;
                
                if (this.viewMode === 'grid') {
                    parentItem.innerHTML = `
                        <div class="file-item-icon"><i class="fas fa-level-up-alt"></i></div>
                        <div class="file-item-name">..</div>
                    `;
                } else {
                    parentItem.innerHTML = `
                        <div class="file-item-icon"><i class="fas fa-level-up-alt"></i></div>
                        <div class="file-item-name">..</div>
                        <div class="file-item-modified"></div>
                        <div class="file-item-size"></div>
                        <div class="file-item-type">Parent Folder</div>
                    `;
                }
                
                parentItem.addEventListener('dblclick', () => this.goUp());
                this.elements.fileList.appendChild(parentItem);
            }
            
            // Add files and folders
            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.dataset.path = file.path;
                
                const icon = this.getFileIcon(file);
                const modified = file.modified || '';
                const size = file.size || '';
                const type = this.getFileType(file);
                
                if (this.viewMode === 'grid') {
                    fileItem.innerHTML = `
                        <div class="file-item-icon">${icon}</div>
                        <div class="file-item-name">${file.name}</div>
                    `;
                } else {
                    fileItem.innerHTML = `
                        <div class="file-item-icon">${icon}</div>
                        <div class="file-item-name">${file.name}</div>
                        <div class="file-item-modified">${modified}</div>
                        <div class="file-item-size">${size}</div>
                        <div class="file-item-type">${type}</div>
                    `;
                }
                
                this.elements.fileList.appendChild(fileItem);
            });
            
            // Apply view mode
            this.elements.fileView.className = 'file-view';
            if (this.viewMode === 'grid') {
                this.elements.fileView.classList.add('grid-view');
            }
            
            // Update sort indicators
            this.elements.fileView.querySelectorAll('.file-view-header > div').forEach(header => {
                const icon = header.querySelector('.sort-icon');
                if (header.classList.contains(`file-view-header-${this.sortConfig.column}`)) {
                    icon.className = 'sort-icon fas ' + 
                        (this.sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
                } else {
                    icon.className = 'sort-icon';
                }
            });
        }
        
        getFileIcon(file) {
            const icons = {
                folder: 'fa-folder',
                document: 'fa-file-alt',
                image: 'fa-file-image',
                audio: 'fa-file-audio',
                video: 'fa-file-video',
                application: 'fa-file-code',
                drive: 'fa-hdd'
            };
            
            const iconClass = icons[file.type] || 'fa-file';
            return `<i class="fas ${iconClass}"></i>`;
        }
        
        getFileType(file) {
            const types = {
                folder: 'Folder',
                document: 'Document',
                image: 'Image',
                audio: 'Audio',
                video: 'Video',
                application: 'Application',
                drive: 'Drive'
            };
            
            return types[file.type] || 'File';
        }
        
        updateQuickAccess() {
            this.elements.quickAccess.querySelectorAll('li').forEach(item => {
                item.classList.toggle('active', item.dataset.path === this.currentPath);
            });
            
            this.elements.drives.querySelectorAll('li').forEach(item => {
                item.classList.toggle('active', item.dataset.path === this.currentPath);
            });
        }
        
        updateStatusBar() {
            const itemCount = this.currentFolder.children ? this.currentFolder.children.length : 0;
            this.elements.statusCount.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
            this.elements.statusSelected.textContent = `${this.selectedItems.length} selected`;
        }
        
        updateNavigationButtons() {
            this.elements.backBtn.disabled = this.historyIndex <= 0;
            this.elements.forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
            this.elements.upBtn.disabled = this.currentPath === '/';
        }
        
        updateViewModeButtons() {
            this.elements.viewListBtn.classList.toggle('active', this.viewMode === 'list');
            this.elements.viewGridBtn.classList.toggle('active', this.viewMode === 'grid');
        }
        
        updatePreviewPane() {
            this.elements.previewContent.innerHTML = '';
            
            if (this.selectedItems.length === 1) {
                const filePath = this.selectedItems[0].dataset.path;
                const file = this.findFileByPath(filePath);
                
                if (file.type === 'image') {
                    this.elements.previewContent.innerHTML = `
                        <img src="https://via.placeholder.com/200?text=${file.name}" alt="${file.name}">
                        <div class="preview-info">
                            <div class="preview-info-row">
                                <span class="preview-info-label">Name:</span>
                                <span>${file.name}</span>
                            </div>
                            <div class="preview-info-row">
                                <span class="preview-info-label">Type:</span>
                                <span>Image</span>
                            </div>
                            <div class="preview-info-row">
                                <span class="preview-info-label">Size:</span>
                                <span>${file.size}</span>
                            </div>
                            <div class="preview-info-row">
                                <span class="preview-info-label">Modified:</span>
                                <span>${file.modified}</span>
                            </div>
                        </div>
                    `;
                } else {
                    this.elements.previewContent.innerHTML = `
                        <div style="font-size: 48px; margin-bottom: 20px;">${this.getFileIcon(file)}</div>
                        <div class="preview-info">
                            <div class="preview-info-row">
                                <span class="preview-info-label">Name:</span>
                                <span>${file.name}</span>
                            </div>
                            <div class="preview-info-row">
                                <span class="preview-info-label">Type:</span>
                                <span>${this.getFileType(file)}</span>
                            </div>
                            ${file.size ? `
                            <div class="preview-info-row">
                                <span class="preview-info-label">Size:</span>
                                <span>${file.size}</span>
                            </div>
                            ` : ''}
                            <div class="preview-info-row">
                                <span class="preview-info-label">Modified:</span>
                                <span>${file.modified}</span>
                            </div>
                            ${file.path ? `
                            <div class="preview-info-row">
                                <span class="preview-info-label">Path:</span>
                                <span>${file.path}</span>
                            </div>
                            ` : ''}
                        </div>
                    `;
                }
            } else if (this.selectedItems.length > 1) {
                this.elements.previewContent.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 20px;"><i class="fas fa-object-group"></i></div>
                    <div class="preview-info">
                        <div class="preview-info-row">
                            <span class="preview-info-label">Selected:</span>
                            <span>${this.selectedItems.length} items</span>
                        </div>
                    </div>
                `;
            } else {
                this.elements.previewContent.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 20px;"><i class="fas fa-folder-open"></i></div>
                    <div class="preview-info">
                        <div class="preview-info-row">
                            <span class="preview-info-label">Folder:</span>
                            <span>${this.currentFolder.name}</span>
                        </div>
                        <div class="preview-info-row">
                            <span class="preview-info-label">Items:</span>
                            <span>${this.currentFolder.children ? this.currentFolder.children.length : 0}</span>
                        </div>
                        <div class="preview-info-row">
                            <span class="preview-info-label">Modified:</span>
                            <span>${this.currentFolder.modified}</span>
                        </div>
                        <div class="preview-info-row">
                            <span class="preview-info-label">Path:</span>
                            <span>${this.currentPath}</span>
                        </div>
                    </div>
                `;
            }
        }
        
        // Selection methods
        selectItem(item, clearExisting = true) {
            if (clearExisting) {
                this.clearSelection();
            }
            item.classList.add('selected');
            this.selectedItems.push(item);
            this.updateStatusBar();
            this.updatePreviewPane();
        }
        
        toggleSelectItem(item) {
            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                this.selectedItems = this.selectedItems.filter(selected => selected !== item);
            } else {
                item.classList.add('selected');
                this.selectedItems.push(item);
            }
            this.updateStatusBar();
            this.updatePreviewPane();
        }
        
        selectRange(endItem) {
            if (this.selectedItems.length === 0) {
                this.selectItem(endItem);
                return;
            }
            
            const startItem = this.selectedItems[this.selectedItems.length - 1];
            const items = Array.from(this.elements.fileList.querySelectorAll('.file-item'));
            const startIndex = items.indexOf(startItem);
            const endIndex = items.indexOf(endItem);
            
            if (startIndex === -1 || endIndex === -1) return;
            
            const [from, to] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
            
            for (let i = from; i <= to; i++) {
                const item = items[i];
                if (!item.classList.contains('selected')) {
                    item.classList.add('selected');
                    this.selectedItems.push(item);
                }
            }
            
            this.updateStatusBar();
            this.updatePreviewPane();
        }
        
        selectAll() {
            this.clearSelection();
            this.elements.fileList.querySelectorAll('.file-item').forEach(item => {
                item.classList.add('selected');
                this.selectedItems.push(item);
            });
            this.updateStatusBar();
            this.updatePreviewPane();
        }
        
        clearSelection() {
            this.selectedItems.forEach(item => item.classList.remove('selected'));
            this.selectedItems = [];
            this.updateStatusBar();
            this.updatePreviewPane();
        }
        
        // File operations
        showNewFolderModal() {
            this.elements.newFolderInput.value = 'New Folder';
            this.elements.newFolderModal.style.display = 'flex';
            this.elements.newFolderInput.select();
        }
        
        hideNewFolderModal() {
            this.elements.newFolderModal.style.display = 'none';
        }
        
        confirmNewFolder() {
            const folderName = this.elements.newFolderInput.value.trim();
            if (!folderName) return;
            
            // Check if folder already exists
            if (this.currentFolder.children && 
                this.currentFolder.children.some(item => item.name === folderName)) {
                alert('A folder with this name already exists!');
                return;
            }
            
            const newFolder = {
                name: folderName,
                type: 'folder',
                path: `${this.currentPath === '/' ? '' : this.currentPath}/${folderName}`,
                children: [],
                modified: new Date().toISOString().split('T')[0]
            };
            
            if (!this.currentFolder.children) {
                this.currentFolder.children = [];
            }
            
            this.currentFolder.children.push(newFolder);
            this.hideNewFolderModal();
            this.updateUI();
        }
        
        showRenameModal() {
            if (this.selectedItems.length !== 1) return;
            
            const filePath = this.selectedItems[0].dataset.path;
            const file = this.findFileByPath(filePath);
            if (!file) return;
            
            this.renameTarget = file;
            this.elements.renameInput.value = file.name;
            this.elements.renameModal.style.display = 'flex';
            this.elements.renameInput.select();
        }
        
        hideRenameModal() {
            this.elements.renameModal.style.display = 'none';
            this.renameTarget = null;
        }
        
        confirmRename() {
            if (!this.renameTarget) return;
            
            const newName = this.elements.renameInput.value.trim();
            if (!newName) return;
            
            // Check if name already exists
            const parent = this.getParentFolder(this.renameTarget.path);
            if (parent && parent.children && 
                parent.children.some(item => item !== this.renameTarget && item.name === newName)) {
                alert('An item with this name already exists!');
                return;
            }
            
            const oldPath = this.renameTarget.path;
            const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
            
            this.renameTarget.name = newName;
            this.renameTarget.path = `${parentPath === '' ? '/' : parentPath}/${newName}`;
            this.renameTarget.modified = new Date().toISOString().split('T')[0];
            
            // Update path for children if it's a folder
            if (this.renameTarget.children) {
                this.updateChildrenPaths(this.renameTarget);
            }
            
            this.hideRenameModal();
            this.updateUI();
        }
        
        updateChildrenPaths(folder) {
            if (!folder.children) return;
            
            folder.children.forEach(child => {
                const oldPath = child.path;
                child.path = `${folder.path}/${child.name}`;
                
                // Recursively update children
                if (child.children) {
                    this.updateChildrenPaths(child);
                }
            });
        }
        
        deleteSelected() {
            if (this.selectedItems.length === 0) return;
            
            if (!confirm(`Are you sure you want to delete ${this.selectedItems.length} item(s)?`)) {
                return;
            }
            
            this.selectedItems.forEach(item => {
                const filePath = item.dataset.path;
                this.deleteFile(filePath);
            });
            
            this.clearSelection();
            this.updateUI();
        }
        
        deleteFile(path) {
            const parent = this.getParentFolder(path);
            if (!parent || !parent.children) return;
            
            const fileName = path.split('/').pop();
            parent.children = parent.children.filter(child => child.name !== fileName);
        }
        
        cutSelected() {
            if (this.selectedItems.length === 0) return;
            
            this.clipboard = this.selectedItems.map(item => item.dataset.path);
            this.clipboardAction = 'cut';
        }
        
        copySelected() {
            if (this.selectedItems.length === 0) return;
            
            this.clipboard = this.selectedItems.map(item => item.dataset.path);
            this.clipboardAction = 'copy';
        }
        
        pasteClipboard() {
            if (!this.clipboard || !this.clipboardAction) return;
            
            this.clipboard.forEach(path => {
                const file = this.findFileByPath(path);
                if (file) {
                    if (this.clipboardAction === 'copy') {
                        this.copyFile(file);
                    } else if (this.clipboardAction === 'cut') {
                        this.moveFile(file);
                    }
                }
            });
            
            if (this.clipboardAction === 'cut') {
                this.clipboard = null;
                this.clipboardAction = null;
            }
            
            this.updateUI();
        }
        
        copyFile(file) {
            const newFile = JSON.parse(JSON.stringify(file));
            newFile.name = `Copy of ${newFile.name}`;
            
            // Update path
            const fileName = newFile.name;
            newFile.path = `${this.currentPath === '/' ? '' : this.currentPath}/${fileName}`;
            newFile.modified = new Date().toISOString().split('T')[0];
            
            // Update children paths if it's a folder
            if (newFile.children) {
                this.updateChildrenPaths(newFile);
            }
            
            if (!this.currentFolder.children) {
                this.currentFolder.children = [];
            }
            
            this.currentFolder.children.push(newFile);
        }
        
        moveFile(file) {
            const oldParent = this.getParentFolder(file.path);
            if (!oldParent || !oldParent.children) return;
            
            // Remove from old location
            oldParent.children = oldParent.children.filter(child => child !== file);
            
            // Update path
            file.path = `${this.currentPath === '/' ? '' : this.currentPath}/${file.name}`;
            file.modified = new Date().toISOString().split('T')[0];
            
            // Update children paths if it's a folder
            if (file.children) {
                this.updateChildrenPaths(file);
            }
            
            // Add to new location
            if (!this.currentFolder.children) {
                this.currentFolder.children = [];
            }
            
            this.currentFolder.children.push(file);
        }
        
        openSelected() {
            if (this.selectedItems.length !== 1) return;
            
            const filePath = this.selectedItems[0].dataset.path;
            const file = this.findFileByPath(filePath);
            
            if (file.type === 'folder') {
                this.navigateTo(file.path);
            } else {
                // In a real app, this would open the file
                console.log(`Opening file: ${file.path}`);
            }
        }
        
        previewFile(file) {
            // In a real app, this would show a proper preview
            console.log(`Previewing file: ${file.path}`);
        }
        
        showProperties() {
            if (this.selectedItems.length === 0) return;
            
            const files = this.selectedItems.map(item => this.findFileByPath(item.dataset.path));
            let message = '';
            
            if (files.length === 1) {
                const file = files[0];
                message = `Name: ${file.name}\nType: ${this.getFileType(file)}\n`;
                if (file.size) message += `Size: ${file.size}\n`;
                message += `Modified: ${file.modified}\nPath: ${file.path}`;
            } else {
                message = `${files.length} items selected\n`;
                
                const types = {};
                let totalSize = 0;
                
                files.forEach(file => {
                    types[this.getFileType(file)] = (types[this.getFileType(file)] || 0) + 1;
                    if (file.size) {
                        const sizeValue = parseFloat(file.size);
                        if (file.size.includes('KB')) totalSize += sizeValue * 1024;
                        else if (file.size.includes('MB')) totalSize += sizeValue * 1024 * 1024;
                        else if (file.size.includes('GB')) totalSize += sizeValue * 1024 * 1024 * 1024;
                        else totalSize += sizeValue;
                    }
                });
                
                message += 'Contains:\n';
                for (const type in types) {
                    message += `  ${types[type]} ${type}${types[type] > 1 ? 's' : ''}\n`;
                }
                
                if (totalSize > 0) {
                    let displaySize;
                    if (totalSize >= 1024 * 1024 * 1024) {
                        displaySize = (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                    } else if (totalSize >= 1024 * 1024) {
                        displaySize = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
                    } else if (totalSize >= 1024) {
                        displaySize = (totalSize / 1024).toFixed(2) + ' KB';
                    } else {
                        displaySize = totalSize + ' bytes';
                    }
                    
                    message += `Total size: ${displaySize}`;
                }
            }
            
            alert(message);
        }
        
        // View methods
        setViewMode(mode) {
            this.viewMode = mode;
            this.updateFileList();
            this.updateViewModeButtons();
        }
        
        // Search methods
        searchFiles(query) {
            if (!query) {
                this.updateFileList();
                return;
            }
            
            const searchTerm = query.toLowerCase();
            this.elements.fileList.querySelectorAll('.file-item').forEach(item => {
                const fileName = item.querySelector('.file-item-name').textContent.toLowerCase();
                item.style.display = fileName.includes(searchTerm) ? '' : 'none';
            });
        }
        
        sortFiles(column, direction = null, updateUI = true) {
            if (!this.currentFolder.children) return;
            
            // Toggle direction if sorting same column
            if (column === this.sortConfig.column) {
                this.sortConfig.direction = direction || 
                    (this.sortConfig.direction === 'asc' ? 'desc' : 'asc');
            } else {
                this.sortConfig.column = column;
                this.sortConfig.direction = 'asc';
            }
            
            // Sort the files
            this.currentFolder.children.sort((a, b) => {
                let valA, valB;
                
                switch (this.sortConfig.column) {
                    case 'name':
                        valA = a.name.toLowerCase();
                        valB = b.name.toLowerCase();
                        break;
                    case 'modified':
                        valA = new Date(a.modified);
                        valB = new Date(b.modified);
                        break;
                    case 'size':
                        valA = this.parseFileSize(a.size);
                        valB = this.parseFileSize(b.size);
                        break;
                    case 'type':
                        valA = this.getFileType(a).toLowerCase();
                        valB = this.getFileType(b).toLowerCase();
                        break;
                    default:
                        return 0;
                }
                
                if (valA < valB) return this.sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
            
            if (updateUI) {
                this.updateFileList();
            }
        }
        
        parseFileSize(sizeStr) {
            if (!sizeStr) return 0;
            
            const units = {
                'KB': 1024,
                'MB': 1024 * 1024,
                'GB': 1024 * 1024 * 1024
            };
            
            const match = sizeStr.match(/^([\d.]+)\s*(KB|MB|GB)$/);
            if (match) {
                return parseFloat(match[1]) * units[match[2]];
            }
            
            return parseFloat(sizeStr);
        }
        
        // Context menu
        showContextMenu(e) {
            const fileItem = e.target.closest('.file-item');
            
            // Hide if no file is selected and not clicking in empty space
            if (!fileItem && this.selectedItems.length === 0) return;
            
            // If clicking on a file item that's not selected, select it
            if (fileItem && !fileItem.classList.contains('selected')) {
                this.selectItem(fileItem, true);
            }
            
            // Position the context menu
            this.elements.contextMenu.style.display = 'block';
            this.elements.contextMenu.style.left = `${Math.min(e.pageX, window.innerWidth - this.elements.contextMenu.offsetWidth)}px`;
            this.elements.contextMenu.style.top = `${Math.min(e.pageY, window.innerHeight - this.elements.contextMenu.offsetHeight)}px`;
            
            // Update context menu items based on selection
            this.elements.ctxOpen.style.display = this.selectedItems.length === 1 ? '' : 'none';
            this.elements.ctxRename.style.display = this.selectedItems.length === 1 ? '' : 'none';
            this.elements.ctxPaste.style.display = this.clipboard ? '' : 'none';
        }
        
        hideContextMenu() {
            this.elements.contextMenu.style.display = 'none';
        }
        
        // Theme methods
        toggleTheme() {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', this.theme === 'dark');
            this.elements.themeToggle.innerHTML = this.theme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
    }
    
    // Initialize the file explorer
    const fileExplorer = new FileExplorer();
});