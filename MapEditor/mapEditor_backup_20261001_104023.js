// 地图编辑器主类
class MapEditor {
    constructor() {
        this.config = null;
        this.mapTiles = []; // 地图分块数据 {x, y, image}
        this.markers = {
            blocks: new Map(), // 不可移动点 key: "x,y" value: {movable: 0/1}
            resources: new Map(), // 资源刷新点 key: "x,y" value: [{id, weight, minCount, maxCount}, ...]
            spawnPoints: [] // 出生点 [{x, y}, ...]
        };
        this.objects = []; // 地图物体 {id, resourcePath, gridX, gridY, type, occupyX, occupyY, offsetX, offsetY, params, image}

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.isPainting = false;
        this.lastPaintGrid = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.selectedObject = null;
        this.excelData = null; // Excel表数据
        this.isDraggingObject = false; // 是否正在拖动物体
        this.draggedObject = null; // 被拖动的物体

        this.initCanvas();
        this.initEvents();
        this.initUI();

        // 资源ID颜色映射 (30种颜色)
        this.resourceColors = this.generateResourceColors(30);

        // 初始化文件系统
        this.initFileSystem();
    }

    // 生成30种不同的资源颜色（色差大）
    generateResourceColors(count) {
        // 使用更分散的色相和不同的饱和度/明度组合，确保色差明显
        const colors = [
            'hsla(0, 100%, 50%, 0.5)',      // 纯红
            'hsla(30, 100%, 50%, 0.5)',     // 橙色
            'hsla(60, 100%, 50%, 0.5)',     // 黄色
            'hsla(90, 100%, 40%, 0.5)',     // 黄绿
            'hsla(120, 100%, 35%, 0.5)',    // 纯绿
            'hsla(150, 100%, 40%, 0.5)',    // 青绿
            'hsla(180, 100%, 40%, 0.5)',    // 青色
            'hsla(210, 100%, 50%, 0.5)',    // 天蓝
            'hsla(240, 100%, 50%, 0.5)',    // 纯蓝
            'hsla(270, 100%, 50%, 0.5)',    // 紫色
            'hsla(300, 100%, 50%, 0.5)',    // 品红
            'hsla(330, 100%, 50%, 0.5)',    // 粉红
            'hsla(15, 100%, 40%, 0.5)',     // 深橙
            'hsla(45, 100%, 45%, 0.5)',     // 金黄
            'hsla(75, 90%, 35%, 0.5)',      // 橄榄绿
            'hsla(105, 100%, 30%, 0.5)',    // 深绿
            'hsla(135, 100%, 35%, 0.5)',    // 海绿
            'hsla(165, 100%, 40%, 0.5)',    // 蓝绿
            'hsla(195, 100%, 45%, 0.5)',    // 深蓝
            'hsla(225, 100%, 45%, 0.5)',    // 靛蓝
            'hsla(255, 100%, 45%, 0.5)',    // 深紫
            'hsla(285, 100%, 45%, 0.5)',    // 紫罗兰
            'hsla(315, 100%, 45%, 0.5)',    // 洋红
            'hsla(345, 100%, 45%, 0.5)',    // 玫瑰红
            'hsla(20, 80%, 35%, 0.5)',      // 棕色
            'hsla(200, 80%, 30%, 0.5)',     // 深青
            'hsla(280, 80%, 35%, 0.5)',     // 深紫罗兰
            'hsla(40, 90%, 40%, 0.5)',      // 土黄
            'hsla(160, 90%, 30%, 0.5)',     // 墨绿
            'hsla(320, 90%, 40%, 0.5)'      // 紫红
        ];
        return colors.slice(0, count);
    }

    // 初始化文件系统
    async initFileSystem() {
        if (!ResFS.supported) {
            this.updateInfo('浏览器不支持文件系统访问API，请使用Chrome或Edge');
            return;
        }

        const savedName = await ResFS.savedName();
        if (savedName) {
            document.getElementById('current-dir').textContent = `当前: ${savedName}`;
            const result = await ResFS.restore(false);
            if (result === 'ok') {
                this.updateInfo(`已恢复目录: ${ResFS.label}`);
            } else if (result === 'prompt') {
                this.updateInfo(`需要重新授权目录: ${savedName}`);
            }
        }
    }

    // 选择资源目录
    async selectResourceDirectory() {
        try {
            await ResFS.pick();
            this.updateInfo(`已选择目录: ${ResFS.label}`);
            document.getElementById('current-dir').textContent = `当前: ${ResFS.label}`;
        } catch (error) {
            if (error.name !== 'AbortError') {
                alert('选择目录失败: ' + error.message);
            }
        }
    }

    // 初始化画布
    initCanvas() {
        this.mapCanvas = document.getElementById('map-canvas');
        this.gridCanvas = document.getElementById('grid-canvas');
        this.markerCanvas = document.getElementById('marker-canvas');
        this.objectCanvas = document.getElementById('object-canvas');

        this.mapCtx = this.mapCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.markerCtx = this.markerCanvas.getContext('2d');
        this.objectCtx = this.objectCanvas.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    // 调整画布大小
    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();

        [this.mapCanvas, this.gridCanvas, this.markerCanvas, this.objectCanvas].forEach(canvas => {
            canvas.width = rect.width;
            canvas.height = rect.height;
        });

        this.render();
    }

    // 初始化事件
    initEvents() {
        const container = document.getElementById('canvas-container');

        // 鼠标滚轮缩放
        container.addEventListener('wheel', (e) => this.onWheel(e));

        // 鼠标拖动地图
        container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('mouseup', (e) => this.onMouseUp(e));
        container.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        // 右键取消标记
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });

        // 资源拖放
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        container.addEventListener('drop', (e) => this.onDrop(e));
    }

    // 初始化UI事件
    initUI() {
        // 新建地图
        document.getElementById('btn-new-map').addEventListener('click', () => {
            document.getElementById('modal-new-map').classList.add('active');
        });

        document.getElementById('btn-cancel-new').addEventListener('click', () => {
            document.getElementById('modal-new-map').classList.remove('active');
        });

        document.getElementById('btn-select-image').addEventListener('click', () => {
            document.getElementById('input-source-image').click();
        });

        document.getElementById('input-source-image').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                document.getElementById('selected-image-name').textContent = e.target.files[0].name;
            }
        });

        document.getElementById('new-map-source-type').addEventListener('change', (e) => {
            const isImage = e.target.value === 'image';
            document.getElementById('field-source-image').style.display = isImage ? 'block' : 'none';
            document.getElementById('field-source-tiles').style.display = isImage ? 'none' : 'block';
        });

        // 选择地图块目录
        document.getElementById('btn-select-tiles-dir').addEventListener('click', async () => {
            if (!ResFS.ready) {
                alert('请先选择资源目录');
                return;
            }
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
                const path = await ResFS.relPath(dirHandle);
                if (path) {
                    document.getElementById('input-tiles-path').value = path;
                } else {
                    // 不在授权目录内，使用相对路径
                    document.getElementById('input-tiles-path').value = `[外部]/${dirHandle.name}`;
                    alert('选择的目录不在已授权的资源目录内，请选择 assets/remote 下的目录');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('选择目录失败:', error);
                }
            }
        });

        document.getElementById('btn-create-map').addEventListener('click', () => this.createNewMap());

        // 加载地图
        document.getElementById('btn-load-map').addEventListener('click', () => {
            document.getElementById('modal-load-map').classList.add('active');
        });

        document.getElementById('btn-cancel-load').addEventListener('click', () => {
            document.getElementById('modal-load-map').classList.remove('active');
        });

        document.getElementById('btn-select-config').addEventListener('click', () => {
            document.getElementById('input-config-file').click();
        });

        document.getElementById('input-config-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                document.getElementById('selected-config-name').textContent = e.target.files[0].name;
            }
        });

        document.getElementById('btn-load-config').addEventListener('click', () => this.loadMapConfig());

        // 保存地图
        document.getElementById('btn-save-map').addEventListener('click', () => this.saveMapConfig());

        // 标记模式切换
        document.getElementById('mark-mode').addEventListener('change', (e) => {
            const mode = e.target.value;
            document.getElementById('block-params').style.display = mode === 'block' ? 'flex' : 'none';
            document.getElementById('resource-params').style.display = mode === 'resource' ? 'flex' : 'none';
        });

        // 物体属性修改
        ['prop-type', 'prop-grid-x', 'prop-grid-y', 'prop-offset-x', 'prop-offset-y', 'prop-params', 'prop-walkable'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateSelectedObjectProps());
        });

        // 删除物体
        document.getElementById('btn-delete-object').addEventListener('click', () => this.deleteSelectedObject());

        // 加载Excel表
        document.getElementById('btn-load-excel').addEventListener('click', async () => {
            // 尝试自动加载默认Excel文件
            const defaultExcelPath = '../sharedata/excel/S-地图表(MapData).xlsx';

            if (ResFS.ready) {
                try {
                    this.updateInfo('尝试加载默认Excel: ' + defaultExcelPath);
                    document.getElementById('loading').classList.add('active');

                    const file = await ResFS.read(defaultExcelPath);
                    this.excelData = await ExcelParser.parseMapData(file);
                    this.updateInfo(`Excel数据加载成功: ${this.excelData.length} 条记录`);
                    alert(`Excel数据加载成功: ${this.excelData.length} 条记录`);
                    document.getElementById('loading').classList.remove('active');
                    return;
                } catch (error) {
                    document.getElementById('loading').classList.remove('active');
                    console.warn('加载默认Excel失败，请手动选择:', error);
                }
            }

            // 如果默认加载失败，打开文件选择器
            document.getElementById('input-excel-file').click();
        });

        document.getElementById('input-excel-file').addEventListener('change', (e) => this.loadExcelData(e));

        // 加载资源
        document.getElementById('btn-load-resources').addEventListener('click', async () => {
            await this.loadResources();
        });

        // 随机生成物件
        document.getElementById('btn-random-generate').addEventListener('click', () => this.randomGenerateObjects());

        // 选择资源目录
        document.getElementById('btn-select-dir').addEventListener('click', () => this.selectResourceDirectory());

        // 加载资源
        document.getElementById('btn-load-resources').addEventListener('click', () => this.loadMapObjects());
    }

    // 创建新地图
    async createNewMap() {
        const mapId = document.getElementById('new-map-id').value.trim();
        const mapName = document.getElementById('new-map-name').value.trim();
        const gridWidth = parseInt(document.getElementById('new-grid-width').value);
        const gridHeight = parseInt(document.getElementById('new-grid-height').value);
        const sourceType = document.getElementById('new-map-source-type').value;

        if (!mapId || !mapName) {
            alert('请填写地图ID和名称');
            return;
        }

        this.config = {
            mapId,
            mapName,
            gridWidth,
            gridHeight,
            tileSize: 512,
            tilesPath: `../assets/remote/Res/Map/MapGrid/${mapId}`
        };

        document.getElementById('modal-new-map').classList.remove('active');
        document.getElementById('loading').classList.add('active');

        try {
            if (sourceType === 'image') {
                const fileInput = document.getElementById('input-source-image');
                if (fileInput.files.length === 0) {
                    alert('请选择大地图文件');
                    document.getElementById('loading').classList.remove('active');
                    return;
                }
                await this.cutMapImage(fileInput.files[0], mapId);
            } else {
                const tilesPath = document.getElementById('input-tiles-path').value.trim();
                if (!tilesPath) {
                    alert('请填写地图块目录路径');
                    document.getElementById('loading').classList.remove('active');
                    return;
                }
                this.config.tilesPath = tilesPath;
                await this.loadMapTiles();
            }

            await this.loadMapObjects();
            this.render();
            this.updateInfo('地图创建成功');
        } catch (error) {
            alert('创建地图失败: ' + error.message);
            console.error(error);
        } finally {
            document.getElementById('loading').classList.remove('active');
        }
    }

    // 切割大地图并保存到文件系统
    async cutMapImage(file, mapId) {
        if (!ResFS.ready) {
            throw new Error('请先选择资源目录');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        const tileSize = 512;
                        const cols = Math.ceil(img.width / tileSize);
                        const rows = Math.ceil(img.height / tileSize);

                        this.mapTiles = [];

                        // 目标目录
                        const targetDir = `Res/Map/MapGrid/${mapId}`;

                        // 创建目录
                        try {
                            await ResFS.dir(targetDir, true);
                        } catch (error) {
                            console.warn('创建目录失败，可能已存在:', error);
                        }

                        // 创建临时画布用于切割
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = tileSize;
                        tempCanvas.height = tileSize;
                        const tempCtx = tempCanvas.getContext('2d');

                        let saved = 0;
                        for (let row = 0; row < rows; row++) {
                            for (let col = 0; col < cols; col++) {
                                tempCtx.clearRect(0, 0, tileSize, tileSize);
                                tempCtx.fillStyle = '#000';
                                tempCtx.fillRect(0, 0, tileSize, tileSize);

                                const sw = Math.min(tileSize, img.width - col * tileSize);
                                const sh = Math.min(tileSize, img.height - row * tileSize);

                                tempCtx.drawImage(
                                    img,
                                    col * tileSize, row * tileSize, sw, sh,
                                    0, 0, sw, sh
                                );

                                // 转换为Blob并保存
                                const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/jpeg', 0.9));
                                const fileName = `${col}_${row}.jpg`;
                                const filePath = `${targetDir}/${fileName}`;

                                try {
                                    await ResFS.write(filePath, blob);
                                    saved++;
                                    this.updateInfo(`保存中: ${saved}/${cols * rows}`);
                                } catch (error) {
                                    console.error('保存失败:', filePath, error);
                                }

                                // 加载到内存用于显示
                                const tileImg = new Image();
                                tileImg.src = URL.createObjectURL(blob);
                                await new Promise(r => { tileImg.onload = r; });

                                this.mapTiles.push({
                                    x: col,
                                    y: row,
                                    image: tileImg,
                                    name: fileName
                                });
                            }
                        }

                        this.updateInfo(`地图切割完成: ${cols}x${rows} = ${this.mapTiles.length} 块，已保存到 ${targetDir}`);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 加载地图分块
    async loadMapTiles() {
        if (!ResFS.ready) {
            this.updateInfo('请先选择资源目录');
            return;
        }

        this.updateInfo('加载地图分块...');

        try {
            const entries = await ResFS.list(this.config.tilesPath);
            const imageFiles = entries.filter(e =>
                e.kind === 'file' &&
                /^\d+_\d+\.(jpg|jpeg|png)$/i.test(e.name) &&
                !e.name.endsWith('.meta')
            );

            this.mapTiles = [];

            for (const entry of imageFiles) {
                const match = /^(\d+)_(\d+)\.(jpg|jpeg|png)$/i.exec(entry.name);
                if (!match) continue;

                const x = parseInt(match[1]);
                const y = parseInt(match[2]);

                try {
                    const file = await ResFS.read(`${this.config.tilesPath}/${entry.name}`);
                    const url = URL.createObjectURL(file);
                    const img = await this.loadImage(url);

                    this.mapTiles.push({ x, y, image: img, name: entry.name });
                } catch (error) {
                    console.warn(`加载地图块失败: ${entry.name}`, error);
                }
            }

            this.updateInfo(`加载了 ${this.mapTiles.length} 个地图分块`);
        } catch (error) {
            console.error('加载地图分块失败:', error);
            this.updateInfo('加载地图分块失败: ' + error.message);
        }
    }

    // 加载图片
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    // 加载地图物体资源
    async loadMapObjects() {
        if (!ResFS.ready) {
            alert('请先选择资源目录');
            return;
        }

        document.getElementById('loading').classList.add('active');

        try {
            const resources = await ResourceLoader.scanMapObjects();

            // 加载预览图
            for (const res of resources) {
                res.preview = await ResourceLoader.loadPreview(res);
            }

            this.updateResourceList(resources);
            this.updateInfo(`加载了 ${resources.length} 个地图物体资源`);
        } catch (error) {
            alert('加载资源失败: ' + error.message);
            console.error(error);
        } finally {
            document.getElementById('loading').classList.remove('active');
        }
    }

    // 更新资源列表UI
    updateResourceList(resources) {
        const list = document.getElementById('resource-list');
        list.innerHTML = '';

        resources.forEach((res, index) => {
            const item = document.createElement('div');
            item.className = 'resource-item';
            item.draggable = true;
            item.dataset.index = index;
            item.dataset.path = res.displayPath || res.path;
            item.dataset.type = res.type;

            const img = document.createElement('img');
            img.src = res.preview || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23444"/><text x="32" y="32" text-anchor="middle" dominant-baseline="middle" fill="%23fff" font-size="12">加载中</text></svg>';
            img.alt = res.name;

            const span = document.createElement('span');
            span.textContent = res.name;

            item.appendChild(img);
            item.appendChild(span);
            list.appendChild(item);

            // 拖拽事件
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('resourcePath', res.displayPath || res.path);
                e.dataTransfer.setData('resourceType', res.type);
                e.dataTransfer.setData('resourceImage', res.preview || '');
            });
        });
    }

    // 鼠标滚轮缩放
    onWheel(e) {
        e.preventDefault();

        const rect = this.mapCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算缩放前的世界坐标
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;

        // 缩放
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(5, this.scale));

        // 调整偏移以保持鼠标位置不变
        this.offsetX = mouseX - worldX * this.scale;
        this.offsetY = mouseY - worldY * this.scale;

        document.getElementById('zoom-level').textContent = `${Math.round(this.scale * 100)}%`;
        this.render();
    }

    // 鼠标按下
    onMouseDown(e) {
        if (e.button === 0) { // 左键
            const grid = this.screenToGrid(e.clientX, e.clientY);
            if (!grid) return;

            const markMode = document.getElementById('mark-mode').value;
            const paintMode = document.getElementById('paint-mode').value;

            if (markMode !== 'none') {
                this.isPainting = true;
                this.paintMark(grid.x, grid.y);

                if (paintMode === 'click') {
                    this.isPainting = false;
                }
            } else {
                // 检查是否点击了物体
                const obj = this.getObjectAtGrid(grid.x, grid.y);
                if (obj) {
                    this.selectObject(obj);
                    this.isDraggingObject = true;
                    this.draggedObject = obj;
                    this.dragStartX = e.clientX;
                    this.dragStartY = e.clientY;
                } else {
                    // 取消选中
                    this.selectedObject = null;
                    document.getElementById('property-panel').classList.remove('active');
                    // 拖动地图
                    this.isDragging = true;
                    this.dragStartX = e.clientX - this.offsetX;
                    this.dragStartY = e.clientY - this.offsetY;
                }
                this.render();
            }
        }
    }

    // 鼠标移动
    onMouseMove(e) {
        const grid = this.screenToGrid(e.clientX, e.clientY);
        if (grid) {
            const worldPos = this.gridToWorld(grid.x, grid.y);
            document.getElementById('info-position').textContent = `位置: ${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`;
            document.getElementById('info-grid').textContent = `格子: ${grid.x}, ${grid.y}`;
        }

        if (this.isDraggingObject && this.draggedObject) {
            // 拖动物体
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;

            // 移动超过一定距离才更新位置（避免抖动）
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                if (grid) {
                    // 检查新位置是否与其他物体重叠
                    const otherObjects = this.objects.filter(obj => obj.id !== this.draggedObject.id);
                    if (!this.checkObjectOverlap(grid.x, grid.y, this.draggedObject.occupyX, this.draggedObject.occupyY, otherObjects)) {
                        // 不重叠，可以移动
                        this.draggedObject.gridX = grid.x;
                        this.draggedObject.gridY = grid.y;
                        this.dragStartX = e.clientX;
                        this.dragStartY = e.clientY;
                        this.render();
                    }
                }
            }
        } else if (this.isDragging) {
            this.offsetX = e.clientX - this.dragStartX;
            this.offsetY = e.clientY - this.dragStartY;
            this.render();
        } else if (this.isPainting) {
            if (grid && (this.lastPaintGrid?.x !== grid.x || this.lastPaintGrid?.y !== grid.y)) {
                this.paintMark(grid.x, grid.y);
            }
        }
    }

    // 鼠标抬起
    onMouseUp(e) {
        this.isDragging = false;
        this.isPainting = false;
        this.isDraggingObject = false;
        this.draggedObject = null;
        this.lastPaintGrid = null;
    }

    // 右键取消标记
    onRightClick(e) {
        const grid = this.screenToGrid(e.clientX, e.clientY);
        if (!grid) return;

        const key = `${grid.x},${grid.y}`;
        const markMode = document.getElementById('mark-mode').value;

        if (markMode === 'block') {
            this.markers.blocks.delete(key);
        } else if (markMode === 'resource') {
            this.markers.resources.delete(key);
        }

        this.render();
    }

    // 绘制标记
    paintMark(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        const markMode = document.getElementById('mark-mode').value;

        if (markMode === 'block') {
            const movable = parseInt(document.getElementById('block-movable').value);
            this.markers.blocks.set(key, { movable });
        } else if (markMode === 'resource') {
            // 检查是否是不可移动格子
            if (this.markers.blocks.has(key) && this.markers.blocks.get(key).movable === 0) {
                this.updateInfo('不可移动的格子上不能刷资源点');
                return;
            }

            const resourceId = parseInt(document.getElementById('resource-id').value);
            const weight = parseInt(document.getElementById('resource-weight').value);
            const minCount = parseInt(document.getElementById('resource-min-count').value) || 1;
            const maxCount = parseInt(document.getElementById('resource-max-count').value) || 1;

            if (!this.markers.resources.has(key)) {
                this.markers.resources.set(key, []);
            }

            const resources = this.markers.resources.get(key);
            const existing = resources.find(r => r.id === resourceId);

            if (existing) {
                existing.weight = weight;
                existing.minCount = minCount;
                existing.maxCount = maxCount;
            } else {
                resources.push({ id: resourceId, weight, minCount, maxCount });
            }
        }

        this.lastPaintGrid = { x: gridX, y: gridY };
        this.render();
    }

    // 拖放物体
    async onDrop(e) {
        e.preventDefault();

        const resourcePath = e.dataTransfer.getData('resourcePath');
        const resourceType = e.dataTransfer.getData('resourceType');
        const resourceImage = e.dataTransfer.getData('resourceImage');

        if (!resourcePath) return;

        const grid = this.screenToGrid(e.clientX, e.clientY);
        if (!grid) return;

        // 创建新物体
        const obj = {
            id: Date.now() + Math.random(),
            resourcePath,
            resourceType,
            gridX: grid.x,
            gridY: grid.y,
            type: '',
            occupyX: 1,
            occupyY: 1,
            offsetX: 0,
            offsetY: 0,
            params: '',
            walkable: false, // 默认不可行走
            imageSrc: resourceImage
        };

        // 尝试从Excel表中读取占格信息和偏移（show_url字段没有扩展名）
        if (this.excelData && this.excelData.length > 0) {
            // 去掉resourcePath的扩展名进行匹配
            const pathWithoutExt = resourcePath.replace(/\.(png|jpg|jpeg)$/i, '');
            const config = this.excelData.find(d => d.show_url === pathWithoutExt);
            if (config) {
                // 解析area字段（格式：x_y）
                if (config.area && typeof config.area === 'string') {
                    const parts = config.area.split('_');
                    if (parts.length === 2) {
                        obj.occupyX = parseInt(parts[0]) || 1;
                        obj.occupyY = parseInt(parts[1]) || 1;
                    }
                } else if (config.areaX && config.areaY) {
                    obj.occupyX = config.areaX || 1;
                    obj.occupyY = config.areaY || 1;
                }

                // 解析offsetPos字段（格式：x_y）
                if (config.offsetPos && typeof config.offsetPos === 'string') {
                    const parts = config.offsetPos.split('_');
                    if (parts.length === 2) {
                        obj.offsetX = parseInt(parts[0]) || 0;
                        obj.offsetY = parseInt(parts[1]) || 0;
                    }
                }

                obj.type = config.type || '';
                obj.params = config.params || '';
                console.log(`从Excel读取信息: ${pathWithoutExt}, area=${config.area}, offsetPos=${config.offsetPos}, occupyX=${obj.occupyX}, occupyY=${obj.occupyY}, offsetX=${obj.offsetX}, offsetY=${obj.offsetY}`);
            } else {
                console.log(`Excel中未找到匹配: ${pathWithoutExt}`);
            }
        }

        // 加载图片
        if (resourceImage) {
            this.loadImage(resourceImage).then(img => {
                obj.image = img;

                // 如果没有从Excel读取到占格信息，根据图片大小估算
                if ((obj.occupyX === 1 && obj.occupyY === 1) && this.config) {
                    const estimatedX = Math.max(1, Math.ceil(img.width / this.config.gridWidth));
                    const estimatedY = Math.max(1, Math.ceil(img.height / this.config.gridHeight));
                    obj.occupyX = estimatedX;
                    obj.occupyY = estimatedY;
                    console.log(`根据图片大小估算占格: ${resourcePath}, ${img.width}x${img.height} -> ${estimatedX}x${estimatedY}格`);
                }

                this.render();
            }).catch(() => {
                console.warn('无法加载物体图片');
            });
        }

        this.objects.push(obj);
        this.render();
        this.updateInfo(`已添加物体: ${resourcePath}`);
    }

    // 获取指定格子上的物体（不受偏移影响，基于gridX/gridY）
    getObjectAtGrid(gridX, gridY) {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];

            const halfX = Math.floor(obj.occupyX / 2);
            const halfY = Math.floor(obj.occupyY / 2);

            if (gridX >= obj.gridX - halfX && gridX < obj.gridX + obj.occupyX - halfX &&
                gridY >= obj.gridY - halfY && gridY < obj.gridY + obj.occupyY - halfY) {
                return obj;
            }
        }
        return null;
    }

    // 选中物体
    selectObject(obj) {
        this.selectedObject = obj;
        document.getElementById('property-panel').classList.add('active');
        document.getElementById('prop-type').value = obj.type || '';
        document.getElementById('prop-grid-x').value = obj.occupyX;
        document.getElementById('prop-grid-y').value = obj.occupyY;
        document.getElementById('prop-offset-x').value = obj.offsetX || 0;
        document.getElementById('prop-offset-y').value = obj.offsetY || 0;
        document.getElementById('prop-params').value = obj.params || '';
        document.getElementById('prop-walkable').checked = obj.walkable || false;
        this.render();
    }

    // 更新选中物体属性
    updateSelectedObjectProps() {
        if (!this.selectedObject) return;

        this.selectedObject.type = document.getElementById('prop-type').value;
        this.selectedObject.occupyX = parseInt(document.getElementById('prop-grid-x').value) || 1;
        this.selectedObject.occupyY = parseInt(document.getElementById('prop-grid-y').value) || 1;
        this.selectedObject.offsetX = parseInt(document.getElementById('prop-offset-x').value) || 0;
        this.selectedObject.offsetY = parseInt(document.getElementById('prop-offset-y').value) || 0;
        this.selectedObject.params = document.getElementById('prop-params').value;
        this.selectedObject.walkable = document.getElementById('prop-walkable').checked;

        this.render();
    }

    // 删除选中物体
    deleteSelectedObject() {
        if (!this.selectedObject) return;

        const index = this.objects.indexOf(this.selectedObject);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }

        this.selectedObject = null;
        document.getElementById('property-panel').classList.remove('active');
        this.render();
    }

    // 屏幕坐标转格子坐标
    screenToGrid(screenX, screenY) {
        if (!this.config) return null;

        const rect = this.mapCanvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const worldX = (x - this.offsetX) / this.scale;
        const worldY = (y - this.offsetY) / this.scale;

        return {
            x: Math.floor(worldX / this.config.gridWidth),
            y: Math.floor(worldY / this.config.gridHeight)
        };
    }

    // 格子坐标转世界坐标
    gridToWorld(gridX, gridY) {
        if (!this.config) return { x: 0, y: 0 };

        return {
            x: gridX * this.config.gridWidth,
            y: gridY * this.config.gridHeight
        };
    }

    // 世界坐标转屏幕坐标
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.scale + this.offsetX,
            y: worldY * this.scale + this.offsetY
        };
    }

    // 渲染
    render() {
        if (!this.config) return;

        // 清空所有画布
        this.mapCtx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.markerCtx.clearRect(0, 0, this.markerCanvas.width, this.markerCanvas.height);
        this.objectCtx.clearRect(0, 0, this.objectCanvas.width, this.objectCanvas.height);

        // 渲染地图分块
        this.renderMapTiles();

        // 渲染网格
        this.renderGrid();

        // 渲染标记
        this.renderMarkers();

        // 渲染物体
        this.renderObjects();
    }

    // 渲染地图分块
    renderMapTiles() {
        this.mapTiles.forEach(tile => {
            const worldX = tile.x * this.config.tileSize;
            const worldY = tile.y * this.config.tileSize;
            const screen = this.worldToScreen(worldX, worldY);

            this.mapCtx.drawImage(
                tile.image,
                screen.x, screen.y,
                this.config.tileSize * this.scale,
                this.config.tileSize * this.scale
            );
        });
    }

    // 渲染网格
    renderGrid() {
        const rect = this.gridCanvas.getBoundingClientRect();
        const startGrid = this.screenToGrid(0, 0);
        const endGrid = this.screenToGrid(rect.width, rect.height);

        if (!startGrid || !endGrid) return;

        this.gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.gridCtx.lineWidth = 1;

        // 绘制垂直线
        for (let x = startGrid.x; x <= endGrid.x + 1; x++) {
            const worldX = x * this.config.gridWidth;
            const screen = this.worldToScreen(worldX, 0);

            this.gridCtx.beginPath();
            this.gridCtx.moveTo(screen.x, 0);
            this.gridCtx.lineTo(screen.x, rect.height);
            this.gridCtx.stroke();
        }

        // 绘制水平线
        for (let y = startGrid.y; y <= endGrid.y + 1; y++) {
            const worldY = y * this.config.gridHeight;
            const screen = this.worldToScreen(0, worldY);

            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, screen.y);
            this.gridCtx.lineTo(rect.width, screen.y);
            this.gridCtx.stroke();
        }
    }

    // 渲染标记
    renderMarkers() {
        const rect = this.markerCanvas.getBoundingClientRect();
        const startGrid = this.screenToGrid(0, 0);
        const endGrid = this.screenToGrid(rect.width, rect.height);

        if (!startGrid || !endGrid) return;

        for (let y = startGrid.y; y <= endGrid.y; y++) {
            for (let x = startGrid.x; x <= endGrid.x; x++) {
                const key = `${x},${y}`;
                const world = this.gridToWorld(x, y);
                const screen = this.worldToScreen(world.x, world.y);
                const gridW = this.config.gridWidth * this.scale;
                const gridH = this.config.gridHeight * this.scale;

                // 绘制不可移动点
                if (this.markers.blocks.has(key)) {
                    const block = this.markers.blocks.get(key);
                    this.markerCtx.fillStyle = block.movable === 0 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 255, 0, 0.4)';
                    this.markerCtx.fillRect(screen.x, screen.y, gridW, gridH);
                }

                // 绘制资源刷新点（颜色叠加）
                if (this.markers.resources.has(key)) {
                    const resources = this.markers.resources.get(key);
                    resources.forEach(res => {
                        const color = this.resourceColors[(res.id - 1) % this.resourceColors.length];
                        this.markerCtx.fillStyle = color;
                        this.markerCtx.fillRect(screen.x, screen.y, gridW, gridH);
                    });

                    // 显示资源ID（多个ID时显示第一个和总数）
                    const fontSize = Math.max(10, 14 * this.scale);
                    this.markerCtx.font = `bold ${fontSize}px Arial`;
                    this.markerCtx.textAlign = 'center';
                    this.markerCtx.textBaseline = 'middle';

                    // 添加文字描边
                    this.markerCtx.strokeStyle = 'black';
                    this.markerCtx.lineWidth = 3;
                    this.markerCtx.fillStyle = 'white';

                    if (resources.length === 1) {
                        // 单个ID，显示ID号
                        const text = `ID:${resources[0].id}`;
                        this.markerCtx.strokeText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                        this.markerCtx.fillText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                    } else {
                        // 多个ID，显示第一个ID和总数
                        const text = `ID:${resources[0].id}+${resources.length - 1}`;
                        this.markerCtx.strokeText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                        this.markerCtx.fillText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                    }
                }
            }
        }
    }

    // 渲染物体
    renderObjects() {
        this.objects.forEach(obj => {
            // 基础格子位置
            const baseWorld = this.gridToWorld(obj.gridX, obj.gridY);

            // 应用像素偏移（不再乘以格子大小）
            const offsetX = (obj.offsetX || 0);
            const offsetY = (obj.offsetY || 0);

            const world = {
                x: baseWorld.x + offsetX,
                y: baseWorld.y + offsetY
            };
            const screen = this.worldToScreen(world.x, world.y);

            // 绘制占据范围（不受偏移影响，始终基于gridX/gridY）
            const halfX = Math.floor(obj.occupyX / 2);
            const halfY = Math.floor(obj.occupyY / 2);
            const occupyWorld = this.gridToWorld(obj.gridX - halfX, obj.gridY - halfY);
            const occupyScreen = this.worldToScreen(occupyWorld.x, occupyWorld.y);
            const occupyW = obj.occupyX * this.config.gridWidth * this.scale;
            const occupyH = obj.occupyY * this.config.gridHeight * this.scale;

            if (obj === this.selectedObject) {
                this.objectCtx.strokeStyle = 'yellow';
                this.objectCtx.lineWidth = 2;
                this.objectCtx.strokeRect(occupyScreen.x, occupyScreen.y, occupyW, occupyH);
            } else {
                this.objectCtx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                this.objectCtx.lineWidth = 1;
                this.objectCtx.strokeRect(occupyScreen.x, occupyScreen.y, occupyW, occupyH);
            }

            // 绘制图片 - 居中显示在格子中心
            if (obj.image) {
                // 计算格子中心点的屏幕坐标
                const gridCenterWorld = this.gridToWorld(obj.gridX, obj.gridY);
                const gridCenterScreen = this.worldToScreen(
                    gridCenterWorld.x + this.config.gridWidth / 2,
                    gridCenterWorld.y + this.config.gridHeight / 2
                );

                // 应用像素偏移后的中心点
                const finalCenterX = gridCenterScreen.x + offsetX * this.scale;
                const finalCenterY = gridCenterScreen.y + offsetY * this.scale;

                // 图片居中绘制
                this.objectCtx.drawImage(
                    obj.image,
                    finalCenterX - (obj.image.width * this.scale) / 2,
                    finalCenterY - (obj.image.height * this.scale) / 2,
                    obj.image.width * this.scale,
                    obj.image.height * this.scale
                );
            } else {
                // 没有图片时显示占位符
                this.objectCtx.fillStyle = 'rgba(100, 100, 255, 0.5)';
                this.objectCtx.fillRect(
                    occupyScreen.x + occupyW / 4,
                    occupyScreen.y + occupyH / 4,
                    occupyW / 2,
                    occupyH / 2
                );
            }
        });
    }

    // 加载地图配置
    async loadMapConfig() {
        const fileInput = document.getElementById('input-config-file');
        if (fileInput.files.length === 0) {
            alert('请选择配置文件');
            return;
        }

        document.getElementById('modal-load-map').classList.remove('active');
        document.getElementById('loading').classList.add('active');

        try {
            const file = fileInput.files[0];
            const text = await file.text();
            const config = JSON.parse(text);

            this.config = config.mapInfo;
            this.markers.blocks = new Map(config.blocks || []);
            this.markers.resources = new Map(config.resources || []);
            this.objects = config.objects || [];

            // 加载地图分块
            await this.loadMapTiles();

            // 加载物体图片
            for (const obj of this.objects) {
                // 尝试从文件系统加载
                if (ResFS.ready && obj.resourcePath) {
                    try {
                        // 尝试多种扩展名
                        const extensions = ['.png', '.jpg', '.jpeg', ''];
                        let loaded = false;

                        for (const ext of extensions) {
                            try {
                                const path = obj.resourcePath + ext;
                                const file = await ResFS.read(path);
                                const url = URL.createObjectURL(file);
                                obj.imageSrc = url;
                                obj.image = await this.loadImage(url);
                                loaded = true;
                                console.log(`成功加载物体图片: ${path}`);
                                break;
                            } catch (err) {
                                // 尝试下一个扩展名
                            }
                        }

                        if (!loaded) {
                            console.warn(`无法加载物体图片: ${obj.resourcePath}`);
                        }
                    } catch (error) {
                        console.warn(`加载物体图片失败: ${obj.resourcePath}`, error);
                    }
                } else if (obj.imageSrc) {
                    // 尝试使用保存的imageSrc
                    try {
                        obj.image = await this.loadImage(obj.imageSrc);
                    } catch (error) {
                        console.warn(`使用imageSrc加载失败: ${obj.imageSrc}`);
                    }
                }
            }

            this.render();
            this.updateInfo('地图配置加载成功');
        } catch (error) {
            alert('加载配置失败: ' + error.message);
            console.error(error);
        } finally {
            document.getElementById('loading').classList.remove('active');
        }
    }

    // 保存地图配置
    saveMapConfig() {
        if (!this.config) {
            alert('请先创建或加载地图');
            return;
        }

        const config = {
            mapInfo: this.config,
            blocks: Array.from(this.markers.blocks.entries()),
            resources: Array.from(this.markers.resources.entries()),
            objects: this.objects.map(obj => ({
                resourcePath: obj.resourcePath,
                resourceType: obj.resourceType,
                gridX: obj.gridX,
                gridY: obj.gridY,
                type: obj.type,
                occupyX: obj.occupyX,
                occupyY: obj.occupyY,
                offsetX: obj.offsetX || 0,
                offsetY: obj.offsetY || 0,
                params: obj.params,
                walkable: obj.walkable || false,
                imageSrc: obj.imageSrc
            }))
        };

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.config.mapId}_config.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.updateInfo('地图配置已保存');
    }

    // 更新信息栏
    updateInfo(message) {
        document.getElementById('info-status').textContent = message;
        console.log(message);
    }

    // 加载Excel数据
    async loadExcelData(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('loading').classList.add('active');

        try {
            this.excelData = await ExcelParser.parseMapData(file);
            this.updateInfo(`Excel数据加载成功: ${this.excelData.length} 条记录`);
            alert(`Excel数据加载成功: ${this.excelData.length} 条记录`);
        } catch (error) {
            alert('加载Excel失败: ' + error.message);
            console.error(error);
        } finally {
            document.getElementById('loading').classList.remove('active');
        }
    }

    // 随机生成物件
    async randomGenerateObjects() {
        if (!this.excelData || this.excelData.length === 0) {
            alert('请先加载Excel表数据');
            return;
        }

        if (this.markers.resources.size === 0) {
            alert('没有资源刷新点标记');
            return;
        }

        // 删除上一次随机生成的物件
        const oldCount = this.objects.length;
        this.objects = this.objects.filter(obj => obj.resourceType !== 'auto-generated');
        const deletedCount = oldCount - this.objects.length;
        if (deletedCount > 0) {
            console.log(`删除了 ${deletedCount} 个旧的随机生成物件`);
        }

        document.getElementById('loading').classList.add('active');

        try {
            const newObjects = [];

            // 按ID排序
            const sortedData = [...this.excelData].sort((a, b) => (a.id || 0) - (b.id || 0));

            // 收集所有资源标记点，按ID分组
            const resourcesByID = new Map();
            for (const [key, resources] of this.markers.resources.entries()) {
                const [x, y] = key.split(',').map(Number);

                for (const res of resources) {
                    if (!resourcesByID.has(res.id)) {
                        resourcesByID.set(res.id, []);
                    }
                    resourcesByID.get(res.id).push({
                        x, y,
                        weight: res.weight,
                        minCount: res.minCount,
                        maxCount: res.maxCount
                    });
                }
            }

            // 对每个资源ID生成物体
            for (const [resourceId, markers] of resourcesByID.entries()) {
                const config = sortedData.find(d => d.id == resourceId);
                if (!config || !config.show_url) {
                    console.warn(`找不到ID ${resourceId} 的配置或资源路径`);
                    continue;
                }

                // 使用第一个标记点的数量范围（假设同ID的标记点配置相同）
                const minCount = markers[0].minCount;
                const maxCount = markers[0].maxCount;

                // 计算总生成数量（在min-max范围内随机）
                const totalCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
                console.log(`资源ID ${resourceId}: 标记点数=${markers.length}, 目标总生成数量=${totalCount}, 范围=${minCount}-${maxCount}`);

                // 在所有标记点中随机选择位置生成
                let generated = 0;
                const maxAttempts = totalCount * 20;
                let attempts = 0;

                while (generated < totalCount && attempts < maxAttempts) {
                    attempts++;

                    // 随机选择一个标记点
                    const randomMarker = markers[Math.floor(Math.random() * markers.length)];
                    const centerX = randomMarker.x;
                    const centerY = randomMarker.y;

                    // 只在该标记点本身生成（不偏移）
                    // 确保物体生成在标记的格子上
                    const targetX = centerX;
                    const targetY = centerY;

                    // 检查物体占据的格子
                    const occupyX = config.areaX || 1;
                    const occupyY = config.areaY || 1;

                    // 不需要检查范围，因为就在标记点本身

                    // 检查是否可以放置（占据格子内没有不可移动点）
                    if (!this.canPlaceObject(targetX, targetY, occupyX, occupyY)) {
                        continue;
                    }

                    // 检查是否与已有的所有物体重叠
                    const existingObjects = this.objects.filter(o => o.resourceType !== 'auto-generated');
                    if (this.checkObjectOverlap(targetX, targetY, occupyX, occupyY, existingObjects)) {
                        continue;
                    }

                    // 检查是否与本次新生成的物体重叠
                    if (this.checkObjectOverlap(targetX, targetY, occupyX, occupyY, newObjects)) {
                        continue;
                    }

                    // 创建物体
                    const obj = {
                        id: Date.now() + Math.random(),
                        resourcePath: config.show_url,
                        resourceType: 'auto-generated',
                        gridX: targetX,
                        gridY: targetY,
                        type: config.type || '',
                        occupyX: occupyX,
                        occupyY: occupyY,
                        offsetX: 0,
                        offsetY: 0,
                        params: config.params || '',
                        walkable: false,
                        configId: config.id
                    };

                    // 尝试加载图片
                    try {
                        if (ResFS.ready && config.show_url) {
                            let loaded = false;
                            const extensions = ['.png', '.jpg', '.jpeg'];

                            for (const ext of extensions) {
                                try {
                                    const path = config.show_url + ext;
                                    const file = await ResFS.read(path);
                                    const url = URL.createObjectURL(file);
                                    obj.imageSrc = url;
                                    obj.image = await this.loadImage(url);
                                    loaded = true;
                                    break;
                                } catch (e) {
                                    // 尝试下一个扩展名
                                }
                            }

                            if (!loaded) {
                                console.warn('加载物体图片失败:', config.show_url);
                            }
                        }
                    } catch (error) {
                        console.warn('加载物体图片失败:', config.show_url, error);
                    }

                    newObjects.push(obj);
                    generated++;
                }

                if (generated < totalCount) {
                    console.warn(`资源ID ${resourceId}: 只生成了 ${generated}/${totalCount} 个物体（空间不足或尝试次数用尽）`);
                } else {
                    console.log(`资源ID ${resourceId}: 成功生成 ${generated} 个物体`);
                }
            }

            this.objects.push(...newObjects);
            this.render();
            const message = `随机生成完成: 删除${deletedCount}个旧物体，新生成${newObjects.length}个物体`;
            this.updateInfo(message);
            alert(message);
        } catch (error) {
            alert('生成失败: ' + error.message);
            console.error(error);
        } finally {
            document.getElementById('loading').classList.remove('active');
        }
    }

    // 检查物体是否与其他物体重叠
    checkObjectOverlap(gridX, gridY, occupyX, occupyY, objectList) {
        const halfX = Math.floor(occupyX / 2);
        const halfY = Math.floor(occupyY / 2);

        for (const obj of objectList) {
            const objHalfX = Math.floor(obj.occupyX / 2);
            const objHalfY = Math.floor(obj.occupyY / 2);

            // 检查两个矩形是否重叠
            const x1 = gridX - halfX;
            const x2 = gridX + occupyX - halfX - 1;
            const y1 = gridY - halfY;
            const y2 = gridY + occupyY - halfY - 1;

            const ox1 = obj.gridX - objHalfX;
            const ox2 = obj.gridX + obj.occupyX - objHalfX - 1;
            const oy1 = obj.gridY - objHalfY;
            const oy2 = obj.gridY + obj.occupyY - objHalfY - 1;

            if (!(x2 < ox1 || x1 > ox2 || y2 < oy1 || y1 > oy2)) {
                return true; // 重叠
            }
        }

        return false;
    }

    // 检查是否可以放置物体（占据格子内没有不可移动点）
    canPlaceObject(centerX, centerY, occupyX, occupyY) {
        if (occupyX === 0 || occupyY === 0) {
            return true; // 可穿透
        }

        // 以放置点为中心
        const halfX = Math.floor(occupyX / 2);
        const halfY = Math.floor(occupyY / 2);

        for (let dy = 0; dy < occupyY; dy++) {
            for (let dx = 0; dx < occupyX; dx++) {
                const checkX = centerX - halfX + dx;
                const checkY = centerY - halfY + dy;
                const key = `${checkX},${checkY}`;

                // 检查是否有不可移动标记
                if (this.markers.blocks.has(key) && this.markers.blocks.get(key).movable === 0) {
                    return false;
                }
            }
        }

        return true;
    }
}

// 初始化编辑器
const editor = new MapEditor();
