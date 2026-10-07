// 地图编辑器主类
class MapEditor {
    constructor() {
        this.config = null;
        this.mapTiles = []; // 地图分块数据 {x, y, image}
        this.markers = {
            blocks: new Map(), // 不可移动点 key: "x,y" value: true
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
        this.isRightPainting = false; // 是否正在右键长按取消标记

        this.initCanvas();
        this.initEvents();
        this.initUI();
        this.initKeyboard();

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
                // 自动加载资源和Excel
                await this.loadMapObjects();
                await this.tryLoadDefaultExcel();
            } else if (result === 'prompt') {
                this.updateInfo(`需要重新授权目录: ${savedName}`);
            }
        } else {
            // 首次打开，提示用户选择资源目录
            this.updateInfo('请点击"选择资源目录"按钮，选择项目根目录 D:\\Project\\cocos\\RPGCore');
        }
    }

    // 选择资源目录
    async selectResourceDirectory() {
        try {
            // 默认选择项目根目录
            const defaultPath = 'D:\\Project\\cocos\\RPGCore\\assets';

            await ResFS.pick();
            this.updateInfo(`已选择目录: ${ResFS.label}`);
            document.getElementById('current-dir').textContent = `当前: ${ResFS.label}`;

            // 自动加载资源
            console.log('开始自动加载资源...');
            await this.loadMapObjects();
            console.log('资源加载完成');

            // 自动加载默认Excel
            console.log('开始自动加载Excel...');
            await this.tryLoadDefaultExcel();
            console.log('Excel加载流程完成，excelData =', this.excelData ? `${this.excelData.length}条` : 'null');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('选择目录失败:', error);
                alert('选择目录失败: ' + error.message);
            }
        }
    }

    // 尝试加载默认Excel
    async tryLoadDefaultExcel() {
        // 根据授权目录类型选择路径
        const defaultExcelPath = ResFS.isProjectRoot
            ? 'sharedata/excel/D-地图表(MapData).xlsx'  // 项目根目录
            : null;  // 其他情况暂不支持自动加载

        console.log('tryLoadDefaultExcel: ResFS.ready =', ResFS.ready);
        console.log('tryLoadDefaultExcel: ResFS.isProjectRoot =', ResFS.isProjectRoot);
        console.log('tryLoadDefaultExcel: defaultExcelPath =', defaultExcelPath);

        if (!defaultExcelPath) {
            console.warn('未授权项目根目录，无法自动加载Excel');
            this.updateInfo('请点击"加载Excel表"手动选择文件');
            return;
        }

        try {
            console.log('1. 开始读取Excel:', defaultExcelPath);
            console.log('2. ResFS.ready =', ResFS.ready);

            this.updateInfo('尝试加载默认Excel: ' + defaultExcelPath);

            const file = await ResFS.read(defaultExcelPath);
            console.log('3. Excel文件读取成功，类型:', file.constructor.name, '大小:', file.size);

            this.excelData = await ExcelParser.parseMapData(file);
            console.log('4. Excel解析完成，结果:', this.excelData);
            console.log('5. excelData.length =', this.excelData ? this.excelData.length : 'null');

            if (this.excelData && this.excelData.length > 0) {
                this.updateInfo(`Excel数据自动加载成功: ${this.excelData.length} 条记录`);
                console.log('✅ Excel加载成功！数据预览:', this.excelData.slice(0, 3));
                // 更新资源ID下拉菜单
                this.updateResourceIdSelect();
            } else {
                console.warn('⚠️ Excel解析返回空数据');
                this.updateInfo('Excel解析返回空数据');
            }
        } catch (error) {
            console.error('❌ Excel加载失败:', error);
            console.error('错误详情:', error.message);
            console.error('错误栈:', error.stack);
            this.updateInfo('自动加载Excel失败: ' + error.message);
        }
    }

    // 更新资源ID下拉菜单
    updateResourceIdSelect() {
        const select = document.getElementById('resource-id-select');
        if (!this.excelData || this.excelData.length === 0) {
            select.innerHTML = '<option value="">请先加载Excel表</option>';
            return;
        }

        // 保存当前选择的值
        const currentValue = select.value;

        // 构建下拉菜单（不显示统计信息）
        select.innerHTML = '';
        this.excelData.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = `${config.id}: ${config.name}`;
            select.appendChild(option);
        });

        // 恢复之前选择的值
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        }

        console.log('资源ID下拉菜单已更新，当前选择:', select.value);
    }

    // 加载该资源ID的刷新数量范围
    loadResourceCountRange() {
        const select = document.getElementById('resource-id-select');
        const resourceId = parseInt(select.value);

        if (!resourceId) {
            return;
        }

        // 查找该资源ID的第一个标记点，获取其刷新数量范围
        let minCount = 1;
        let maxCount = 1;
        let found = false;

        for (const [key, resources] of this.markers.resources.entries()) {
            for (const res of resources) {
                if (res.id === resourceId) {
                    minCount = res.minCount || 1;
                    maxCount = res.maxCount || 1;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        // 更新输入框的值
        document.getElementById('resource-min-count').value = minCount;
        document.getElementById('resource-max-count').value = maxCount;

        console.log(`加载资源ID${resourceId}的刷新数量范围: ${minCount}-${maxCount}`);
    }

    // 更新所有该资源ID的标记点刷新数量
    updateAllResourceMarkers() {
        const select = document.getElementById('resource-id-select');
        const resourceId = parseInt(select.value);

        if (!resourceId) {
            return;
        }

        const minCount = parseInt(document.getElementById('resource-min-count').value) || 1;
        const maxCount = parseInt(document.getElementById('resource-max-count').value) || 1;

        let updatedCount = 0;

        // 遍历所有资源标记点，更新匹配的资源ID
        for (const [key, resources] of this.markers.resources.entries()) {
            for (const res of resources) {
                if (res.id === resourceId) {
                    res.minCount = minCount;
                    res.maxCount = maxCount;
                    updatedCount++;
                }
            }
        }

        if (updatedCount > 0) {
            console.log(`批量更新资源ID${resourceId}的刷新数量: ${updatedCount}个标记点, 数量=${minCount}-${maxCount}`);
            this.updateResourceStats();
            this.updateResourceIdSelect();
        }
    }

    // 更新资源统计信息
    updateResourceStats() {
        const select = document.getElementById('resource-id-select');
        const statsLabel = document.getElementById('resource-stats');
        const resourceId = parseInt(select.value);

        if (!resourceId || !this.excelData) {
            statsLabel.textContent = '格子:0, 数量:0';
            return;
        }

        // 统计该资源ID在地图上的信息
        let gridCount = 0;
        let generatedCount = 0; // 实际生成的物体数量

        // 统计标记格子数量
        for (const [key, resources] of this.markers.resources.entries()) {
            for (const res of resources) {
                if (res.id === resourceId) {
                    gridCount++;
                }
            }
        }

        // 统计地图上已生成的该资源ID物体数量
        for (const obj of this.objects) {
            if (obj.configId == resourceId) {
                generatedCount++;
            }
        }

        // 更新显示标签
        statsLabel.textContent = `格子:${gridCount}, 数量:${generatedCount}`;
        console.log(`资源ID${resourceId}统计: 标记格子=${gridCount}, 地图上已生成数量=${generatedCount}`);
    }

    // 打开编辑器时自动加载Excel
    async autoLoadExcel() {
        console.log('autoLoadExcel调用，ResFS.ready =', ResFS.ready);

        if (!ResFS.ready) {
            console.log('ResFS未就绪，等待选择资源目录...');
            this.updateInfo('请先选择资源目录以加载Excel');
            return;
        }

        await this.tryLoadDefaultExcel();

        console.log('autoLoadExcel完成，this.excelData =', this.excelData ? `${this.excelData.length}条记录` : 'null');
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
                const file = e.target.files[0];
                document.getElementById('selected-image-name').textContent = file.name;

                // 自动获取图片尺寸
                const img = new Image();
                img.onload = () => {
                    document.getElementById('new-map-width').value = img.width;
                    document.getElementById('new-map-height').value = img.height;
                    console.log(`自动获取图片尺寸: ${img.width} x ${img.height}`);
                };
                img.src = URL.createObjectURL(file);
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

            // 如果切换到资源标记模式，更新统计信息
            if (mode === 'resource') {
                this.updateResourceStats();
            }
        });

        // 资源ID下拉菜单切换
        document.getElementById('resource-id-select').addEventListener('change', () => {
            this.updateResourceStats();
            this.loadResourceCountRange(); // 加载该资源ID的刷新数量范围
        });

        // 刷新数量输入框变化时，自动更新该资源ID的所有标记点
        document.getElementById('resource-min-count').addEventListener('change', () => {
            this.updateAllResourceMarkers();
        });
        document.getElementById('resource-max-count').addEventListener('change', () => {
            this.updateAllResourceMarkers();
        });

        // 隐藏/显示标记
        document.getElementById('hide-markers').addEventListener('change', (e) => {
            this.markerCanvas.style.display = e.target.checked ? 'none' : 'block';
        });

        // 键盘事件 - Delete键删除选中物体
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedObject) {
                this.deleteSelectedObject();
            }
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
            const possiblePaths = [
                'sharedata/excel/D-地图表(MapData).xlsx',
            ];

            if (ResFS.ready) {
                let loaded = false;
                for (const defaultExcelPath of possiblePaths) {
                    try {
                        this.updateInfo('尝试加载默认Excel: ' + defaultExcelPath);
                        document.getElementById('loading').classList.add('active');

                        const file = await ResFS.read(defaultExcelPath);
                        this.excelData = await ExcelParser.parseMapData(file);
                        this.updateInfo(`Excel数据加载成功: ${this.excelData.length} 条记录`);
                        alert(`Excel数据加载成功: ${this.excelData.length} 条记录`);
                        document.getElementById('loading').classList.remove('active');
                        loaded = true;
                        return;
                    } catch (error) {
                        document.getElementById('loading').classList.remove('active');
                        console.warn('加载默认Excel失败，尝试下一个路径:', error);
                    }
                }

                if (!loaded) {
                    console.warn('所有默认路径都失败，请手动选择');
                }
            }

            // 如果默认加载失败，打开文件选择器
            document.getElementById('input-excel-file').click();
        });

        document.getElementById('input-excel-file').addEventListener('change', (e) => this.loadExcelData(e));

        // 选择资源目录
        document.getElementById('btn-select-dir').addEventListener('click', () => this.selectResourceDirectory());

        // 加载资源
        document.getElementById('btn-load-resources').addEventListener('click', () => this.loadMapObjects());

        // 随机生成物件
        document.getElementById('btn-random-generate').addEventListener('click', () => this.randomGenerateObjects());
    }

    // 初始化键盘快捷键
    initKeyboard() {
        document.addEventListener('keydown', (e) => {
            // 如果焦点在输入框中，不处理快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 箭头键移动镜头
            const moveSpeed = 50;
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.offsetY += moveSpeed;
                    this.render();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.offsetY -= moveSpeed;
                    this.render();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.offsetX += moveSpeed;
                    this.render();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.offsetX -= moveSpeed;
                    this.render();
                    break;
            }

            // 数字键切换标记模式
            const markModeSelect = document.getElementById('mark-mode');
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    markModeSelect.value = 'block';
                    markModeSelect.dispatchEvent(new Event('change'));
                    this.updateInfo('标记模式: 不可移动点');
                    break;
                case '2':
                    e.preventDefault();
                    markModeSelect.value = 'resource';
                    markModeSelect.dispatchEvent(new Event('change'));
                    this.updateInfo('标记模式: 资源刷新点');
                    break;
                case '3':
                    e.preventDefault();
                    markModeSelect.value = 'spawn';
                    markModeSelect.dispatchEvent(new Event('change'));
                    this.updateInfo('标记模式: 出生点');
                    break;
                case ' ':
                    e.preventDefault();
                    markModeSelect.value = 'none';
                    markModeSelect.dispatchEvent(new Event('change'));
                    this.updateInfo('标记模式: 无');
                    break;
            }
        });
    }

    // 创建新地图
    async createNewMap() {
        const mapId = document.getElementById('new-map-id').value.trim();
        const mapName = document.getElementById('new-map-name').value.trim();
        const gridWidth = parseInt(document.getElementById('new-grid-width').value);
        const gridHeight = parseInt(document.getElementById('new-grid-height').value);
        const mapWidth = parseInt(document.getElementById('new-map-width').value);
        const mapHeight = parseInt(document.getElementById('new-map-height').value);
        const sourceType = document.getElementById('new-map-source-type').value;

        if (!mapId || !mapName) {
            alert('请填写地图ID和名称');
            return;
        }

        if (!mapWidth || !mapHeight || mapWidth <= 0 || mapHeight <= 0) {
            alert('请填写有效的地图像素宽高');
            return;
        }

        this.config = {
            mapId,
            mapName,
            gridWidth,
            gridHeight,
            mapPixelWidth: mapWidth,
            mapPixelHeight: mapHeight,
            tileSize: 512,
            tilesPath: `Res/Map/MapGrid/${mapId}`
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

                // 计算切块数
                const tileSize = this.config.tileSize;
                this.config.totalCols = Math.ceil(mapWidth / tileSize);
                this.config.totalRows = Math.ceil(mapHeight / tileSize);

                await this.loadMapTiles();
            }

            await this.loadMapObjects();
            this.render();
            this.updateMapSizeInfo();
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
                        // 验证图片尺寸是否与用户输入匹配
                        if (img.width !== this.config.mapPixelWidth || img.height !== this.config.mapPixelHeight) {
                            console.warn(`警告: 图片实际尺寸(${img.width}x${img.height})与输入尺寸(${this.config.mapPixelWidth}x${this.config.mapPixelHeight})不匹配，将使用实际尺寸`);
                            this.config.mapPixelWidth = img.width;
                            this.config.mapPixelHeight = img.height;
                        }

                        const tileSize = 512;
                        const cols = Math.ceil(img.width / tileSize);
                        const rows = Math.ceil(img.height / tileSize);

                        this.mapTiles = [];

                        // 保存地图总格子数和像素尺寸到config
                        this.config.totalCols = cols;
                        this.config.totalRows = rows;

                        console.log(`地图尺寸: ${img.width}x${img.height}像素, 切分为${cols}x${rows}块`);

                        // 目标目录
                        const targetDir = ResFS.isProjectRoot
                            ? `assets/remote/Res/Map/MapGrid/${mapId}`
                            : `Res/Map/MapGrid/${mapId}`;

                        console.log('保存地图块到目录:', targetDir);

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
                        // 从左下角开始切图：row=0对应图片底部，row=rows-1对应图片顶部
                        for (let row = 0; row < rows; row++) {
                            for (let col = 0; col < cols; col++) {
                                tempCtx.clearRect(0, 0, tileSize, tileSize);
                                tempCtx.fillStyle = '#000';
                                tempCtx.fillRect(0, 0, tileSize, tileSize);

                                // 从底部开始切：row=0时切图片底部，row=rows-1时切图片顶部
                                const sourceY = img.height - (row + 1) * tileSize;
                                const sourceX = col * tileSize;

                                const sw = Math.min(tileSize, img.width - sourceX);
                                // 最后一行（顶部）可能不足tileSize，需要特殊处理
                                const sh = row === rows - 1
                                    ? Math.min(tileSize, img.height - row * tileSize)
                                    : tileSize;

                                // 如果是最后一行（顶部）且不足tileSize，需要偏移到canvas底部
                                const destY = (row === rows - 1 && sh < tileSize)
                                    ? tileSize - sh
                                    : 0;

                                tempCtx.drawImage(
                                    img,
                                    sourceX, Math.max(0, sourceY), sw, sh,
                                    0, destY, sw, sh
                                );

                                // 转换为Blob并保存
                                // Y轴从左下角开始计数：左下角为0_0，右上角为(cols-1)_(rows-1)
                                const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/jpeg', 0.9));
                                const fileName = `${col}_${row}.jpg`; // row就是gridY，从下到上0到rows-1
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
                                    y: row,  // 直接使用row作为gridY坐标
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
            // 适配项目根目录
            let tilesPath = this.config.tilesPath;

            // 如果是项目根目录且路径不包含 assets/remote/ 前缀，则添加
            if (ResFS.isProjectRoot && !tilesPath.startsWith('assets/remote/')) {
                tilesPath = `assets/remote/${tilesPath}`;
            }

            console.log('loadMapTiles: 尝试读取路径', tilesPath);

            const entries = await ResFS.list(tilesPath);
            const imageFiles = entries.filter(e =>
                e.kind === 'file' &&
                /^\d+_\d+\.(jpg|jpeg|png)$/i.test(e.name) &&
                !e.name.endsWith('.meta')
            );

            this.mapTiles = [];
            let maxCol = 0;
            let maxRow = 0;
            let tileWidth = 0;
            let tileHeight = 0;

            for (const entry of imageFiles) {
                const match = /^(\d+)_(\d+)\.(jpg|jpeg|png)$/i.exec(entry.name);
                if (!match) continue;

                const x = parseInt(match[1]);
                const y = parseInt(match[2]);

                try {
                    const file = await ResFS.read(`${tilesPath}/${entry.name}`);
                    const url = URL.createObjectURL(file);
                    const img = await this.loadImage(url);

                    this.mapTiles.push({ x, y, image: img, name: entry.name });

                    // 记录最大的行列号和图片尺寸
                    maxCol = Math.max(maxCol, x);
                    maxRow = Math.max(maxRow, y);
                    if (tileWidth === 0) {
                        tileWidth = img.width;
                        tileHeight = img.height;
                    }
                } catch (error) {
                    console.warn(`加载地图块失败: ${entry.name}`, error);
                }
            }

            // 自动设置地图尺寸信息（仅在尺寸未设置时）
            if (this.mapTiles.length > 0) {
                // 如果配置中已经有正确的地图尺寸，不要覆盖
                // 只在第一次切图（新建地图）时自动设置
                if (!this.config.mapPixelWidth || !this.config.mapPixelHeight) {
                    this.config.totalCols = maxCol + 1;
                    this.config.totalRows = maxRow + 1;
                    this.config.tileSize = tileWidth; // 假设所有分块大小一致
                    this.config.mapPixelWidth = this.config.totalCols * tileWidth;
                    this.config.mapPixelHeight = this.config.totalRows * tileHeight;

                    console.log(`首次设置地图尺寸: ${this.config.mapPixelWidth}x${this.config.mapPixelHeight}像素, ${this.config.totalCols}x${this.config.totalRows}格 (块大小: ${tileWidth}x${tileHeight})`);
                } else {
                    console.log(`保持配置中的地图尺寸: ${this.config.mapPixelWidth}x${this.config.mapPixelHeight}像素`);
                }
            }

            this.updateInfo(`加载了 ${this.mapTiles.length} 个地图分块`);
        } catch (error) {
            // 目录不存在或为空时不报错，可能是新建地图
            console.warn('加载地图分块失败（可能是新建地图，目录尚未创建）:', error.message);
            this.mapTiles = [];
            this.updateInfo('地图分块目录为空，请上传地图切割图片');
        }
    }

    // 解析plist文件获取图集和第一帧信息（简化版，用于随机生成）
    async parsePlistForAtlas(plistText, basePath) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(plistText, 'text/xml');

            if (xmlDoc.querySelector('parsererror')) {
                return null;
            }

            const plist = xmlDoc.querySelector('plist');
            if (!plist) return null;

            const mainDict = plist.querySelector('dict');
            if (!mainDict) return null;

            let atlasPath = null;
            let firstFrameRect = null;

            const keys = Array.from(mainDict.children).filter(el => el.tagName === 'key');

            for (let i = 0; i < keys.length; i++) {
                const keyName = keys[i].textContent.trim();

                if (keyName === 'metadata') {
                    let metadataDict = keys[i].nextElementSibling;
                    while (metadataDict && metadataDict.tagName !== 'dict') {
                        metadataDict = metadataDict.nextElementSibling;
                    }

                    if (metadataDict) {
                        const metaChildren = Array.from(metadataDict.children).filter(el => el.tagName === 'key');
                        for (let j = 0; j < metaChildren.length; j++) {
                            if (metaChildren[j].textContent.trim() === 'textureFileName') {
                                let textureNode = metaChildren[j].nextElementSibling;
                                while (textureNode && textureNode.tagName !== 'string') {
                                    textureNode = textureNode.nextElementSibling;
                                }

                                if (textureNode) {
                                    const textureName = textureNode.textContent.trim();
                                    const pathParts = basePath.split('/');
                                    pathParts.pop();
                                    atlasPath = pathParts.join('/') + '/' + textureName;
                                }
                            }
                        }
                    }
                } else if (keyName === 'frames') {
                    let framesDict = keys[i].nextElementSibling;
                    while (framesDict && framesDict.tagName !== 'dict') {
                        framesDict = framesDict.nextElementSibling;
                    }

                    if (framesDict) {
                        const frameKeys = Array.from(framesDict.children).filter(el => el.tagName === 'key');
                        if (frameKeys.length > 0) {
                            let firstFrameDict = frameKeys[0].nextElementSibling;
                            while (firstFrameDict && firstFrameDict.tagName !== 'dict') {
                                firstFrameDict = firstFrameDict.nextElementSibling;
                            }

                            if (firstFrameDict) {
                                const frameDataChildren = Array.from(firstFrameDict.children).filter(el => el.tagName === 'key');
                                for (let k = 0; k < frameDataChildren.length; k++) {
                                    if (frameDataChildren[k].textContent.trim() === 'textureRect') {
                                        let rectValue = frameDataChildren[k].nextElementSibling;
                                        while (rectValue && rectValue.tagName !== 'string') {
                                            rectValue = rectValue.nextElementSibling;
                                        }
                                        if (rectValue) {
                                            const rectStr = rectValue.textContent.trim();
                                            const match = rectStr.match(/\{\{(\d+),(\d+)\},\{(\d+),(\d+)\}\}/);
                                            if (match) {
                                                firstFrameRect = {
                                                    x: parseInt(match[1]),
                                                    y: parseInt(match[2]),
                                                    width: parseInt(match[3]),
                                                    height: parseInt(match[4])
                                                };
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!atlasPath) {
                atlasPath = basePath + '.png';
            }

            return { atlasPath, firstFrameRect };
        } catch (error) {
            console.warn('解析plist失败:', error);
            return null;
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
        console.log('onMouseDown triggered, button:', e.button);

        if (e.button === 1) { // 中键
            e.preventDefault();
            this.isDragging = true;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;
        } else if (e.button === 0) { // 左键
            const grid = this.screenToGrid(e.clientX, e.clientY);
            console.log('screenToGrid result:', grid);
            if (!grid) return;

            const markMode = document.getElementById('mark-mode').value;
            console.log('markMode:', markMode);

            if (markMode !== 'none') {
                // 统一为长按操作模式
                this.isPainting = true;
                console.log('调用 paintMark:', grid.x, grid.y);
                this.paintMark(grid.x, grid.y);
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
        if (grid && this.config && this.config.mapPixelHeight) {
            // 使用Cocos坐标显示（左下角为原点，Y向上）
            const cocosPos = this.gridToCocos(grid.x, grid.y);
            document.getElementById('info-position').textContent = `像素: (${Math.round(cocosPos.x)}, ${Math.round(cocosPos.y)})`;
            document.getElementById('info-grid').textContent = `格子: (${grid.x}, ${grid.y})`;
        } else if (grid) {
            // 地图尺寸信息未加载时，只显示格子坐标
            document.getElementById('info-position').textContent = `像素: -`;
            document.getElementById('info-grid').textContent = `格子: (${grid.x}, ${grid.y})`;
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
        } else if (this.isRightPainting) {
            // 右键长按拖动取消标记
            if (grid && (this.lastPaintGrid?.x !== grid.x || this.lastPaintGrid?.y !== grid.y)) {
                this.eraseMark(grid.x, grid.y);
            }
        }
    }

    // 鼠标抬起
    onMouseUp(e) {
        this.isDragging = false;
        this.isPainting = false;
        this.isRightPainting = false;
        this.isDraggingObject = false;
        this.draggedObject = null;
        this.lastPaintGrid = null;
    }

    // 右键取消标记（单击或长按开始）
    onRightClick(e) {
        const grid = this.screenToGrid(e.clientX, e.clientY);
        if (!grid) return;

        // 开始右键长按拖动取消标记
        this.isRightPainting = true;
        this.eraseMark(grid.x, grid.y);
    }

    // 擦除标记
    eraseMark(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        const markMode = document.getElementById('mark-mode').value;

        if (markMode === 'block') {
            this.markers.blocks.delete(key);
        } else if (markMode === 'resource') {
            this.markers.resources.delete(key);
            // 更新下拉菜单显示统计信息
            this.updateResourceIdSelect();
        } else if (markMode === 'spawn') {
            // 删除出生点
            const spawnIndex = this.markers.spawnPoints.findIndex(p => p.x === gridX && p.y === gridY);
            if (spawnIndex !== -1) {
                this.markers.spawnPoints.splice(spawnIndex, 1);
                console.log(`删除出生点: (${gridX}, ${gridY})`);
            }
        }

        this.lastPaintGrid = { x: gridX, y: gridY };
        this.render();

        // 如果是资源标记模式，更新统计信息
        if (markMode === 'resource') {
            this.updateResourceStats();
        }
    }

    // 绘制标记
    paintMark(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        const markMode = document.getElementById('mark-mode').value;
        console.log('paintMark 被调用:', gridX, gridY, 'markMode:', markMode);

        if (markMode === 'block') {
            // 简化：标记的就是不可移动点，不需要额外存储movable值
            console.log('标记不可移动点');
            this.markers.blocks.set(key, true);
            console.log('markers.blocks 大小:', this.markers.blocks.size);
        } else if (markMode === 'resource') {
            // 检查是否是不可移动格子
            if (this.markers.blocks.has(key)) {
                this.updateInfo('不可移动的格子上不能刷资源点');
                return;
            }

            // 从下拉菜单获取资源ID
            const resourceIdSelect = document.getElementById('resource-id-select');
            const resourceId = parseInt(resourceIdSelect.value);

            if (!resourceId) {
                this.updateInfo('请先选择资源ID');
                return;
            }

            const minCount = parseInt(document.getElementById('resource-min-count').value) || 1;
            const maxCount = parseInt(document.getElementById('resource-max-count').value) || 1;

            if (!this.markers.resources.has(key)) {
                this.markers.resources.set(key, []);
            }

            const resources = this.markers.resources.get(key);
            const existing = resources.find(r => r.id === resourceId);

            if (existing) {
                existing.minCount = minCount;
                existing.maxCount = maxCount;
            } else {
                resources.push({ id: resourceId, weight: 1, minCount, maxCount });
            }

            // 更新下拉菜单显示统计信息
            this.updateResourceIdSelect();
        } else if (markMode === 'spawn') {
            // 出生点
            const existing = this.markers.spawnPoints.find(p => p.x === gridX && p.y === gridY);
            if (!existing) {
                this.markers.spawnPoints.push({ x: gridX, y: gridY });
                console.log(`添加出生点: (${gridX}, ${gridY})`);
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
        let foundInExcel = false;
        if (this.excelData && this.excelData.length > 0) {
            // 去掉resourcePath的扩展名进行匹配
            const pathWithoutExt = resourcePath.replace(/\.(png|jpg|jpeg)$/i, '');
            console.log(`尝试匹配Excel: resourcePath="${resourcePath}", pathWithoutExt="${pathWithoutExt}"`);

            // 尝试多种匹配方式
            let config = this.excelData.find(d => d.show_url === pathWithoutExt);

            // 如果直接匹配失败，尝试添加 assets/remote/ 前缀
            if (!config) {
                const pathWithPrefix = `assets/remote/${pathWithoutExt}`;
                config = this.excelData.find(d => d.show_url === pathWithPrefix);
                console.log(`尝试带前缀匹配: ${pathWithPrefix}`);
            }

            // 如果还是失败，尝试去掉Excel中路径的 assets/remote/ 前缀
            if (!config) {
                config = this.excelData.find(d => {
                    const excelPath = (d.show_url || '').replace('assets/remote/', '');
                    return excelPath === pathWithoutExt;
                });
                console.log(`尝试去掉Excel前缀匹配`);
            }

            if (config) {
                console.log('✅ 找到配置:', config);
                foundInExcel = true;

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
                } else if (config.offsetX !== undefined && config.offsetY !== undefined) {
                    obj.offsetX = config.offsetX || 0;
                    obj.offsetY = config.offsetY || 0;
                }

                obj.type = config.type || '';
                obj.params = config.params || '';
                console.log(`从Excel读取信息: area=${config.area}, offsetPos=${config.offsetPos}, occupyX=${obj.occupyX}, occupyY=${obj.occupyY}, offsetX=${obj.offsetX}, offsetY=${obj.offsetY}`);
            } else {
                console.warn(`❌ Excel中未找到匹配: ${pathWithoutExt}`);
            }
        } else {
            console.warn('Excel数据未加载');
        }

        // 加载图片
        if (resourceImage) {
            this.loadImage(resourceImage).then(img => {
                obj.image = img;

                // 只有在没有从Excel读取到配置时才根据图片大小估算
                if (!foundInExcel && this.config) {
                    const estimatedX = Math.max(1, Math.ceil(img.width / this.config.gridWidth));
                    const estimatedY = Math.max(1, Math.ceil(img.height / this.config.gridHeight));
                    obj.occupyX = estimatedX;
                    obj.occupyY = estimatedY;
                    console.log(`根据图片大小估算占格: ${resourcePath}, ${img.width}x${img.height} -> ${estimatedX}x${estimatedY}格`);
                } else if (foundInExcel) {
                    console.log(`✅ 使用Excel配置的占格: ${obj.occupyX}x${obj.occupyY}`);
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
        // 显示物体实际位置（只读）
        document.getElementById('prop-pos-x').value = obj.gridX;
        document.getElementById('prop-pos-y').value = obj.gridY;
        // 显示占据格子数（可编辑）
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

        // 使用左下角为原点的坐标系
        const gridX = Math.floor(worldX / this.config.gridWidth);
        const gridY = Math.floor((this.config.mapPixelHeight - worldY) / this.config.gridHeight);

        return { x: gridX, y: gridY };
    }

    // 格子坐标转Canvas坐标（内部渲染用）
    gridToWorld(gridX, gridY) {
        if (!this.config) return { x: 0, y: 0 };

        // 注意：这里的"世界坐标"实际上是Canvas坐标（左上角为原点，Y向下）
        // 格子坐标系：左下角为(0,0)，Y向上
        // Canvas坐标系：左上角为(0,0)，Y向下
        // 需要Y轴反转
        return {
            x: gridX * this.config.gridWidth,
            y: this.config.mapPixelHeight - (gridY + 1) * this.config.gridHeight
        };
    }

    // 格子坐标转Cocos世界坐标（显示和导出用）
    gridToCocos(gridX, gridY) {
        if (!this.config) return { x: 0, y: 0 };

        // Cocos Creator坐标系：左下角为原点，Y轴向上
        // 这是用户期望看到的坐标系统
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
        console.log('renderMapTiles: 地图块数量=', this.mapTiles.length);
        this.mapTiles.forEach(tile => {
            // tile.x 和 tile.y 是文件名中的坐标（左下角为原点）
            // 需要转换为Canvas的世界坐标（左上角为原点）
            const worldX = tile.x * this.config.tileSize;
            // Y轴反转：左下角的Y=0对应Canvas最下方
            const worldY = this.config.mapPixelHeight - (tile.y + 1) * this.config.tileSize;
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

        // 修复X轴范围
        const minX = Math.min(startGrid.x, endGrid.x);
        const maxX = Math.max(startGrid.x, endGrid.x);

        // 绘制垂直线
        for (let x = Math.max(0, minX); x <= Math.min(this.config.totalCols, maxX + 1); x++) {
            const world = this.gridToWorld(x, 0);
            const screen = this.worldToScreen(world.x, 0);

            this.gridCtx.beginPath();
            this.gridCtx.moveTo(screen.x, 0);
            this.gridCtx.lineTo(screen.x, rect.height);
            this.gridCtx.stroke();
        }

        // 修复Y轴范围
        const minY = Math.min(startGrid.y, endGrid.y);
        const maxY = Math.max(startGrid.y, endGrid.y);

        // 绘制水平线
        for (let y = Math.max(0, minY); y <= Math.min(this.config.totalRows, maxY + 1); y++) {
            const world = this.gridToWorld(0, y);
            const screen = this.worldToScreen(world.x, world.y);

            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, screen.y);
            this.gridCtx.lineTo(rect.width, screen.y);
            this.gridCtx.stroke();
        }
    }

    // 渲染标记
    renderMarkers() {
        console.log('renderMarkers 被调用, markers.blocks 大小:', this.markers.blocks.size);

        const rect = this.markerCanvas.getBoundingClientRect();
        const startGrid = this.screenToGrid(0, 0);
        const endGrid = this.screenToGrid(rect.width, rect.height);

        console.log('startGrid:', startGrid, 'endGrid:', endGrid);
        if (!startGrid || !endGrid) return;

        // 修复Y轴范围：确保从小到大遍历
        const minY = Math.min(startGrid.y, endGrid.y);
        const maxY = Math.max(startGrid.y, endGrid.y);
        const minX = Math.min(startGrid.x, endGrid.x);
        const maxX = Math.max(startGrid.x, endGrid.x);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const key = `${x},${y}`;
                const world = this.gridToWorld(x, y);
                const screen = this.worldToScreen(world.x, world.y);
                const gridW = this.config.gridWidth * this.scale;
                const gridH = this.config.gridHeight * this.scale;

                // 绘制不可移动点
                if (this.markers.blocks.has(key)) {
                    this.markerCtx.fillStyle = 'rgba(255, 0, 0, 0.4)';
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
                        // 单个ID，只显示数字
                        const text = `${resources[0].id}`;
                        this.markerCtx.strokeText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                        this.markerCtx.fillText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                    } else {
                        // 多个ID，显示第一个ID和总数
                        const text = `${resources[0].id}+${resources.length - 1}`;
                        this.markerCtx.strokeText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                        this.markerCtx.fillText(text, screen.x + gridW / 2, screen.y + gridH / 2);
                    }
                }
            }
        }

        // 绘制出生点（黄色星标）
        this.markers.spawnPoints.forEach(spawn => {
            const world = this.gridToWorld(spawn.x, spawn.y);
            const screen = this.worldToScreen(world.x, world.y);
            const gridW = this.config.gridWidth * this.scale;
            const gridH = this.config.gridHeight * this.scale;

            // 绘制黄色背景
            this.markerCtx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            this.markerCtx.fillRect(screen.x, screen.y, gridW, gridH);

            // 绘制星标
            const centerX = screen.x + gridW / 2;
            const centerY = screen.y + gridH / 2;
            const size = Math.min(gridW, gridH) * 0.4;

            this.markerCtx.fillStyle = 'rgba(255, 200, 0, 0.9)';
            this.markerCtx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const radius = i % 2 === 0 ? size : size / 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) {
                    this.markerCtx.moveTo(x, y);
                } else {
                    this.markerCtx.lineTo(x, y);
                }
            }
            this.markerCtx.closePath();
            this.markerCtx.fill();
        });
    }

    // 渲染物体
    renderObjects() {
        // 按照 gridY 排序，左下角坐标系中：Y值小的在下方（先绘制），Y值大的在上方（后绘制遮挡）
        const sortedObjects = [...this.objects].sort((a, b) => a.gridY - b.gridY);

        sortedObjects.forEach(obj => {
            // 基础格子位置
            const baseWorld = this.gridToWorld(obj.gridX, obj.gridY);

            // 应用像素偏移（不再乘以格子大小）
            // 注意：offsetY正值表示"往上偏移"，但Canvas的Y轴向下
            // 所以需要用减法
            const offsetX = (obj.offsetX || 0);
            const offsetY = (obj.offsetY || 0);

            const world = {
                x: baseWorld.x + offsetX,
                y: baseWorld.y - offsetY  // Canvas坐标系：Y向下，所以用减法
            };
            const screen = this.worldToScreen(world.x, world.y);

            // 绘制占据范围（不受偏移影响，始终基于gridX/gridY）
            const halfX = Math.floor(obj.occupyX / 2);
            const halfY = Math.floor(obj.occupyY / 2);

            // 计算占格框的中心点（与图片中心对齐）
            const gridCenterWorld = this.gridToWorld(obj.gridX, obj.gridY);
            const occupyW = obj.occupyX * this.config.gridWidth * this.scale;
            const occupyH = obj.occupyY * this.config.gridHeight * this.scale;

            // 从中心点往左上角偏移半个占格框大小
            const occupyScreen = this.worldToScreen(
                gridCenterWorld.x + this.config.gridWidth / 2 - (obj.occupyX * this.config.gridWidth) / 2,
                gridCenterWorld.y + this.config.gridHeight / 2 - (obj.occupyY * this.config.gridHeight) / 2
            );

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
                // 注意：offsetY正值表示"往上"，Canvas Y向下，所以用减法
                const finalCenterX = gridCenterScreen.x + offsetX * this.scale;
                const finalCenterY = gridCenterScreen.y - offsetY * this.scale;

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

            // 兼容新旧两种blocks格式
            if (Array.isArray(config.blocks)) {
                if (config.blocks.length > 0) {
                    // 检查第一个元素的格式
                    if (typeof config.blocks[0] === 'string') {
                        // 新格式：["x,y", "x,y", ...]
                        this.markers.blocks = new Map(config.blocks.map(key => [key, true]));
                    } else if (Array.isArray(config.blocks[0])) {
                        // 旧格式：[["x,y", {movable: 0}], ...]
                        // 只保留不可移动的点（movable === 0）
                        this.markers.blocks = new Map(
                            config.blocks
                                .filter(([key, value]) => value.movable === 0)
                                .map(([key, value]) => [key, true])
                        );
                    }
                } else {
                    this.markers.blocks = new Map();
                }
            } else {
                this.markers.blocks = new Map();
            }

            this.markers.resources = new Map(config.resources || []);
            this.markers.spawnPoints = config.spawnPoints || [];
            this.objects = config.objects || [];

            // 加载地图分块
            await this.loadMapTiles();

            // 加载物体图片
            for (const obj of this.objects) {
                // 尝试从文件系统加载
                if (ResFS.ready && obj.resourcePath) {
                    try {
                        let loaded = false;
                        let isPlist = false;

                        // 适配项目根目录
                        // 如果是项目根目录，加上 assets/remote/ 前缀
                        // 如果不是项目根目录但路径不包含 assets/remote/，也尝试加上前缀
                        let basePath;
                        if (ResFS.isProjectRoot) {
                            basePath = `assets/remote/${obj.resourcePath}`;
                        } else {
                            // 不是项目根目录，尝试多种路径
                            basePath = obj.resourcePath;
                        }

                        // 先尝试加载plist文件（图集）
                        // 如果不是项目根目录，尝试多种路径组合
                        const plistPathsToTry = ResFS.isProjectRoot
                            ? [basePath]
                            : [
                                basePath,
                                `assets/remote/${obj.resourcePath}`,
                                obj.resourcePath.replace(/^Res\//, '')
                            ];

                        for (const tryPath of plistPathsToTry) {
                            if (loaded) break;

                            try {
                                const plistPath = tryPath + '.plist';
                                const plistFile = await ResFS.read(plistPath);
                                const plistText = await plistFile.text();

                                // 解析plist获取图集信息
                                const plistData = await this.parsePlistForAtlas(plistText, tryPath);
                                if (plistData && plistData.atlasPath) {
                                    // 加载图集图片
                                    const atlasFile = await ResFS.read(plistData.atlasPath);
                                    const atlasUrl = URL.createObjectURL(atlasFile);
                                    const atlasImg = await this.loadImage(atlasUrl);

                                    // 如果有第一帧信息，裁剪出第一帧
                                    if (plistData.firstFrameRect) {
                                        const canvas = document.createElement('canvas');
                                        const rect = plistData.firstFrameRect;
                                        canvas.width = rect.width;
                                        canvas.height = rect.height;
                                        const ctx = canvas.getContext('2d');

                                        ctx.drawImage(
                                            atlasImg,
                                            rect.x, rect.y, rect.width, rect.height,
                                            0, 0, rect.width, rect.height
                                        );

                                        const frameBlob = await new Promise(resolve => canvas.toBlob(resolve));
                                        const frameUrl = URL.createObjectURL(frameBlob);
                                        obj.imageSrc = frameUrl;
                                        obj.image = await this.loadImage(frameUrl);
                                        loaded = true;
                                        isPlist = true;
                                        console.log(`成功加载图集第一帧: ${plistPath}`);
                                    } else {
                                        // 没有帧信息，使用整个图集
                                        obj.imageSrc = atlasUrl;
                                        obj.image = atlasImg;
                                        loaded = true;
                                        console.log(`成功加载图集: ${plistPath}`);
                                    }
                                }
                            } catch (plistError) {
                                // plist不存在或解析失败，继续尝试下一个路径
                            }
                        }

                        if (!loaded) {
                            console.log(`未找到plist或解析失败: ${obj.resourcePath}.plist`);
                        }

                        // 如果plist加载失败，尝试普通图片
                        if (!loaded) {
                            // 如果不是项目根目录，尝试多种路径组合
                            const pathsToTry = ResFS.isProjectRoot
                                ? [basePath]
                                : [
                                    basePath,  // 原始路径
                                    `assets/remote/${obj.resourcePath}`,  // 尝试加前缀
                                    obj.resourcePath.replace(/^Res\//, '')  // 尝试去掉 Res/ 前缀
                                ];

                            console.log(`尝试加载物体图片: ${obj.resourcePath}`);
                            console.log(`ResFS.isProjectRoot = ${ResFS.isProjectRoot}`);
                            console.log(`尝试的路径:`, pathsToTry);

                            for (const tryPath of pathsToTry) {
                                if (loaded) break;

                                // 检查路径是否已经包含扩展名
                                const hasExtension = /\.(png|jpg|jpeg)$/i.test(tryPath);
                                const extensions = hasExtension ? [''] : ['.png', '.jpg', '.jpeg'];

                                for (const ext of extensions) {
                                    try {
                                        const path = tryPath + ext;
                                        console.log(`  尝试: ${path}`);
                                        const file = await ResFS.read(path);
                                        const url = URL.createObjectURL(file);
                                        obj.imageSrc = url;
                                        obj.image = await this.loadImage(url);
                                        loaded = true;
                                        console.log(`✅ 成功加载物体图片: ${path}`);
                                        break;
                                    } catch (err) {
                                        console.log(`  ✗ 失败: ${err.message}`);
                                        // 尝试下一个扩展名或路径
                                    }
                                }
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
            this.updateMapSizeInfo();
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

        // 优化blocks数据：只保存坐标key的数组，不保存value（因为都是true）
        const blocksArray = Array.from(this.markers.blocks.keys());

        const config = {
            mapInfo: this.config,
            blocks: blocksArray,  // 简化为字符串数组：["x,y", "x,y", ...]
            resources: Array.from(this.markers.resources.entries()),
            spawnPoints: this.markers.spawnPoints,
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
                imageSrc: obj.imageSrc,
                configId: obj.configId // 保存资源ID
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

    updateMapSizeInfo() {
        if (!this.config) {
            document.getElementById('info-map-size').textContent = '地图: -';
            return;
        }

        if (this.config.totalCols && this.config.totalRows && this.config.mapPixelWidth && this.config.mapPixelHeight) {
            const info = `地图: ${this.config.totalCols}x${this.config.totalRows}格 (${this.config.mapPixelWidth}x${this.config.mapPixelHeight}px)`;
            document.getElementById('info-map-size').textContent = info;
        } else {
            document.getElementById('info-map-size').textContent = '地图: 尺寸信息未加载';
        }
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
            // 更新资源ID下拉菜单
            this.updateResourceIdSelect();
        } catch (error) {
            alert('加载Excel失败: ' + error.message);
            console.error(error);
        } finally {
            document.getElementById('loading').classList.remove('active');
        }
    }

    // 检查是否存在连续的占位区域，并返回所有有效的左上角位置
    findContinuousAreas(markers, occupyX, occupyY) {
        // 如果只占1格，所有标记点都是有效的
        if (occupyX === 1 && occupyY === 1) {
            return markers.map(m => ({ x: m.x, y: m.y }));
        }

        const validPositions = [];

        // 检查每个标记点，看是否能作为左上角形成连续区域
        for (const marker of markers) {
            let isContinuous = true;

            // 检查以该点为左上角的 occupyX * occupyY 区域是否都被标记
            for (let dy = 0; dy < occupyY; dy++) {
                for (let dx = 0; dx < occupyX; dx++) {
                    const checkX = marker.x + dx;
                    const checkY = marker.y + dy;

                    // 检查该格子是否在标记列表中
                    const found = markers.some(m => m.x === checkX && m.y === checkY);
                    if (!found) {
                        isContinuous = false;
                        break;
                    }
                }
                if (!isContinuous) break;
            }

            // 找到一个连续区域，记录左上角
            if (isContinuous) {
                validPositions.push({ x: marker.x, y: marker.y });
            }
        }

        return validPositions;
    }

    // 随机生成物件
    async randomGenerateObjects() {
        console.log('随机生成物件开始，excelData =', this.excelData ? `${this.excelData.length}条` : 'null');

        if (!this.excelData || this.excelData.length === 0) {
            alert('请先加载Excel表数据！当前excelData为: ' + (this.excelData ? '空数组' : 'null'));
            return;
        }

        if (this.markers.resources.size === 0) {
            alert('没有资源刷新点标记');
            return;
        }

        // 检查当前标记模式和选中的资源ID
        const markMode = document.getElementById('mark-mode').value;
        const selectedResourceId = markMode === 'resource' ? parseInt(document.getElementById('resource-id-select').value) : null;

        // 收集地图上所有的资源ID
        const allResourceIds = new Set();
        for (const [key, resources] of this.markers.resources.entries()) {
            for (const res of resources) {
                allResourceIds.add(res.id);
            }
        }

        console.log('地图上的所有资源ID:', Array.from(allResourceIds).sort((a, b) => a - b));

        // 统一声明 deletedCount
        let deletedCount = 0;

        // 如果在资源刷新点模式且选中了资源ID，只删除和生成该ID的物体
        if (selectedResourceId) {
            console.log(`当前模式: 资源刷新点，选中ID: ${selectedResourceId}，只刷新该ID的物体`);

            // 只删除该资源ID的随机生成物件
            const oldCount = this.objects.length;
            this.objects = this.objects.filter(obj =>
                obj.resourceType !== 'auto-generated' || obj.configId !== selectedResourceId
            );
            deletedCount = oldCount - this.objects.length;
            if (deletedCount > 0) {
                console.log(`删除了 ${deletedCount} 个资源ID${selectedResourceId}的旧物件`);
            }
        } else {
            console.log('当前模式: 非资源刷新点或未选中ID，刷新所有资源ID的物体');

            // 删除所有随机生成的物件
            const oldCount = this.objects.length;
            this.objects = this.objects.filter(obj => obj.resourceType !== 'auto-generated');
            deletedCount = oldCount - this.objects.length;
            if (deletedCount > 0) {
                console.log(`删除了 ${deletedCount} 个旧的随机生成物件`);
            }
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

            // 对每个资源ID生成物体（只生成地图上有标记的资源ID）
            for (const [resourceId, markers] of resourcesByID.entries()) {
                // 如果选中了特定资源ID，只生成该ID
                if (selectedResourceId && resourceId !== selectedResourceId) {
                    console.log(`跳过资源ID ${resourceId}，当前只生成ID ${selectedResourceId}`);
                    continue;
                }

                // 检查该资源ID是否在地图上有标记
                if (!allResourceIds.has(resourceId)) {
                    console.log(`跳过资源ID ${resourceId}，地图上没有此资源的标记点`);
                    continue;
                }

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

                // 检查物体占据的格子
                const occupyX = config.areaX || 1;
                const occupyY = config.areaY || 1;

                // 查找所有有效的连续区域位置
                const validPositions = this.findContinuousAreas(markers, occupyX, occupyY);

                if (validPositions.length === 0) {
                    const requiredGrids = occupyX * occupyY;
                    console.warn(`资源ID ${resourceId} 需要${occupyX}x${occupyY}(${requiredGrids}格)的连续区域，但标记的${markers.length}个格子无法形成连续区域，跳过生成`);
                    break; // 跳过该资源ID
                }

                console.log(`资源ID ${resourceId}: 找到${validPositions.length}个有效连续区域位置`);

                // 在所有有效位置中随机选择位置生成
                let generated = 0;
                const maxAttempts = totalCount * 20;
                let attempts = 0;

                while (generated < totalCount && attempts < maxAttempts) {
                    attempts++;

                    // 从有效位置中随机选择一个（这些都是可以作为左上角的位置）
                    const randomPosition = validPositions[Math.floor(Math.random() * validPositions.length)];
                    const markerX = randomPosition.x;
                    const markerY = randomPosition.y;

                    // 计算中心点偏移，确保占位区域从左上角开始
                    const halfX = Math.floor(occupyX / 2);
                    const halfY = Math.floor(occupyY / 2);

                    // 中心点 = 左上角 + half，使占位区域的左上角对齐
                    const targetX = markerX + halfX;
                    const targetY = markerY + halfY;

                    // 调试：打印占位区域
                    const occupyLeft = targetX - halfX;
                    const occupyRight = targetX + occupyX - halfX - 1;
                    const occupyTop = targetY - halfY;
                    const occupyBottom = targetY + occupyY - halfY - 1;
                    console.log(`生成位置: 左上角(${markerX},${markerY}), 中心(${targetX},${targetY}), 占位区域: (${occupyLeft},${occupyTop})-(${occupyRight},${occupyBottom})`);

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
                        offsetX: config.offsetX || 0,
                        offsetY: config.offsetY || 0,
                        params: config.params || '',
                        walkable: false,
                        configId: config.id
                    };

                    // 尝试加载图片
                    try {
                        if (ResFS.ready && config.show_url) {
                            let loaded = false;
                            let isPlist = false;
                            let frameRect = null;

                            // 适配项目根目录
                            let basePath;
                            if (ResFS.isProjectRoot) {
                                basePath = `assets/remote/${config.show_url}`;
                            } else {
                                basePath = config.show_url;
                            }

                            // 先尝试加载plist文件（图集）
                            const plistPathsToTry = ResFS.isProjectRoot
                                ? [basePath]
                                : [
                                    basePath,
                                    `assets/remote/${config.show_url}`,
                                    config.show_url.replace(/^Res\//, '')
                                ];

                            for (const tryPath of plistPathsToTry) {
                                if (loaded) break;

                                try {
                                    const plistPath = tryPath + '.plist';
                                    const plistFile = await ResFS.read(plistPath);
                                    const plistText = await plistFile.text();

                                    // 解析plist获取图集信息
                                    const plistData = await this.parsePlistForAtlas(plistText, tryPath);
                                    if (plistData && plistData.atlasPath) {
                                        // 加载图集图片
                                        const atlasFile = await ResFS.read(plistData.atlasPath);
                                        const atlasUrl = URL.createObjectURL(atlasFile);
                                        const atlasImg = await this.loadImage(atlasUrl);

                                        // 如果有第一帧信息，裁剪出第一帧
                                        if (plistData.firstFrameRect) {
                                            const canvas = document.createElement('canvas');
                                            const rect = plistData.firstFrameRect;
                                            canvas.width = rect.width;
                                            canvas.height = rect.height;
                                            const ctx = canvas.getContext('2d');

                                            ctx.drawImage(
                                                atlasImg,
                                                rect.x, rect.y, rect.width, rect.height,
                                                0, 0, rect.width, rect.height
                                            );

                                            const frameBlob = await new Promise(resolve => canvas.toBlob(resolve));
                                            const frameUrl = URL.createObjectURL(frameBlob);
                                            obj.imageSrc = frameUrl;
                                            obj.image = await this.loadImage(frameUrl);
                                            loaded = true;
                                            isPlist = true;
                                            console.log(`加载图集第一帧: ${plistPath}`);
                                        } else {
                                            // 没有帧信息，使用整个图集
                                            obj.imageSrc = atlasUrl;
                                            obj.image = atlasImg;
                                            loaded = true;
                                            console.log(`加载图集: ${plistPath}`);
                                        }
                                    }
                                } catch (plistError) {
                                    // plist不存在或解析失败，继续尝试下一个路径
                                }
                            }

                            if (!loaded) {
                                console.log(`未找到plist或解析失败: ${config.show_url}.plist`);
                            }

                            // 如果plist加载失败，尝试普通图片
                            if (!loaded) {
                                const pathsToTry = ResFS.isProjectRoot
                                    ? [basePath]
                                    : [
                                        basePath,
                                        `assets/remote/${config.show_url}`,
                                        config.show_url.replace(/^Res\//, '')
                                    ];

                                for (const tryPath of pathsToTry) {
                                    if (loaded) break;

                                    // 检查路径是否已经包含扩展名
                                    const hasExtension = /\.(png|jpg|jpeg)$/i.test(tryPath);
                                    const extensions = hasExtension ? [''] : ['.png', '.jpg', '.jpeg'];

                                    for (const ext of extensions) {
                                        try {
                                            const path = tryPath + ext;
                                            const file = await ResFS.read(path);
                                            const url = URL.createObjectURL(file);
                                            obj.imageSrc = url;
                                            obj.image = await this.loadImage(url);
                                            loaded = true;
                                            console.log(`成功加载物体图片: ${path}`);
                                            break;
                                        } catch (e) {
                                            // 尝试下一个扩展名或路径
                                        }
                                    }
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

            // 更新资源统计信息
            this.updateResourceStats();
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
