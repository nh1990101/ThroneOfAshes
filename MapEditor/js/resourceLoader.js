'use strict';
/*
 * 资源加载器
 * 扫描MapObject目录，加载动画和图片资源
 */

const ResourceLoader = {
    resources: [],

    /**
     * 扫描MapObject目录
     */
    async scanMapObjects() {
        if (!ResFS.ready) {
            throw new Error('请先选择资源目录');
        }

        this.resources = [];

        try {
            // 扫描Animation目录
            await this.scanAnimations('Res/Map/MapObject/Animation');

            // 扫描Image目录
            await this.scanImages('Res/Map/MapObject/Image');

            console.log('资源扫描完成:', this.resources.length, '个资源');
            return this.resources;
        } catch (error) {
            console.error('扫描资源失败:', error);
            throw error;
        }
    },

    /**
     * 扫描动画目录
     */
    async scanAnimations(basePath) {
        // 如果是项目根目录，需要加上assets/remote前缀
        const fullBasePath = ResFS.isProjectRoot ? `assets/remote/${basePath}` : basePath;
        console.log('scanAnimations: 扫描目录', fullBasePath);
        try {
            const entries = await ResFS.list(fullBasePath);
            console.log('scanAnimations: 找到', entries.length, '个条目');

            // 先收集所有plist文件
            const plistFiles = entries.filter(e =>
                e.kind === 'file' &&
                e.name.endsWith('.plist') &&
                !e.name.endsWith('.meta')
            );

            console.log('找到plist文件:', plistFiles.map(p => p.name));

            // 处理每个plist文件
            for (const plistFile of plistFiles) {
                const baseName = plistFile.name.replace('.plist', '');
                const plistPath = `${fullBasePath}/${plistFile.name}`;

                try {
                    const plistData = await this.getFirstImageFromPlist(plistPath, fullBasePath);
                    if (plistData && plistData.atlasPath && plistData.firstFrameRect) {
                        this.resources.push({
                            type: 'animation',
                            path: plistData.atlasPath,
                            displayPath: `Res/Map/MapObject/Animation/${baseName}`,
                            name: baseName,
                            isPlist: true,
                            frameRect: plistData.firstFrameRect
                        });
                        console.log(`✅ 添加图集资源: ${baseName}, rect:`, plistData.firstFrameRect);
                    } else {
                        console.warn(`❌ plist解析失败或缺少数据:`, plistPath);
                    }
                } catch (error) {
                    console.warn('解析plist失败:', plistPath, error);
                }
            }

            // 处理子目录（如果有）
            for (const entry of entries) {
                if (entry.kind === 'directory') {
                    // 动画目录，查找plist配置文件或第一帧图片
                    const subPath = `${fullBasePath}/${entry.name}`;
                    const frames = await ResFS.list(subPath);

                    // 优先查找plist文件
                    const plistFile = frames.find(f =>
                        f.kind === 'file' &&
                        f.name.endsWith('.plist') &&
                        !f.name.endsWith('.meta')
                    );

                    console.log(`检查目录 ${entry.name}: plistFile =`, plistFile ? plistFile.name : 'null');

                    let previewPath = null;
                    let frameRect = null;

                    if (plistFile) {
                        // 如果有plist，使用图集的第一帧
                        try {
                            const plistPath = `${subPath}/${plistFile.name}`;
                            const plistData = await this.getFirstImageFromPlist(plistPath, subPath);
                            if (plistData && plistData.atlasPath) {
                                previewPath = plistData.atlasPath;
                                frameRect = plistData.firstFrameRect;
                                console.log(`✅ 使用plist图集: ${previewPath}, 第一帧:`, frameRect);
                            } else {
                                console.warn(`❌ plist解析失败:`, plistPath);
                            }
                        } catch (error) {
                            console.warn('解析plist失败:', error);
                        }
                    }

                    // 如果没有plist或解析失败，找第一个图片文件
                    if (!previewPath) {
                        const firstFrame = frames.find(f =>
                            f.kind === 'file' &&
                            /\.(png|jpg|jpeg)$/i.test(f.name) &&
                            !f.name.endsWith('.meta')
                        );

                        if (firstFrame) {
                            previewPath = `${subPath}/${firstFrame.name}`;
                        }
                    }

                    if (previewPath) {
                        this.resources.push({
                            type: 'animation',
                            path: previewPath,
                            displayPath: `Res/Map/MapObject/Animation/${entry.name}`,
                            name: entry.name,
                            isPlist: !!plistFile,
                            frameRect: frameRect  // 添加第一帧的rect信息
                        });
                    }
                } else if (entry.kind === 'file' && /\.(png|jpg|jpeg)$/i.test(entry.name) && !entry.name.endsWith('.meta')) {
                    // 单个动画图片（不是图集的png）
                    const baseName = entry.name.replace(/\.(png|jpg|jpeg)$/i, '');
                    // 检查是否已经作为图集处理过
                    if (!plistFiles.find(p => p.name === baseName + '.plist')) {
                        this.resources.push({
                            type: 'animation',
                            path: `${fullBasePath}/${entry.name}`,
                            displayPath: `Res/Map/MapObject/Animation/${entry.name}`,
                            name: baseName,
                            previewFile: entry.name
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('扫描Animation目录失败:', error);
        }
    },

    /**
     * 从plist文件中获取图集信息和第一帧信息
     */
    async getFirstImageFromPlist(plistPath, subPath) {
        try {
            console.log('尝试读取plist:', plistPath);
            const file = await ResFS.read(plistPath);
            const text = await file.text();
            console.log('plist内容长度:', text.length);

            // 解析plist（XML格式）
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');

            // 检查是否有解析错误
            if (xmlDoc.querySelector('parsererror')) {
                console.warn('plist解析错误');
                return null;
            }

            // 查找metadata中的textureFileName
            const plist = xmlDoc.querySelector('plist');
            if (!plist) {
                console.warn('未找到plist节点');
                return null;
            }

            const mainDict = plist.querySelector('dict');
            if (!mainDict) {
                console.warn('未找到主dict节点');
                return null;
            }

            let atlasPath = null;
            let firstFrameRect = null;

            // 查找所有顶层key
            const keys = Array.from(mainDict.children).filter(el => el.tagName === 'key');

            for (let i = 0; i < keys.length; i++) {
                const keyName = keys[i].textContent.trim();

                if (keyName === 'metadata') {
                    // metadata后面的dict
                    let metadataDict = keys[i].nextElementSibling;
                    while (metadataDict && metadataDict.tagName !== 'dict') {
                        metadataDict = metadataDict.nextElementSibling;
                    }

                    if (metadataDict) {
                        const metaChildren = Array.from(metadataDict.children).filter(el => el.tagName === 'key');
                        for (let j = 0; j < metaChildren.length; j++) {
                            if (metaChildren[j].textContent.trim() === 'textureFileName') {
                                // 找到纹理文件名
                                let textureNode = metaChildren[j].nextElementSibling;
                                while (textureNode && textureNode.tagName !== 'string') {
                                    textureNode = textureNode.nextElementSibling;
                                }

                                if (textureNode) {
                                    const textureName = textureNode.textContent.trim();
                                    atlasPath = `${subPath}/${textureName}`;
                                    console.log('从plist中找到图集:', atlasPath);
                                }
                            }
                        }
                    }
                } else if (keyName === 'frames') {
                    // 查找第一帧的textureRect信息
                    let framesDict = keys[i].nextElementSibling;
                    while (framesDict && framesDict.tagName !== 'dict') {
                        framesDict = framesDict.nextElementSibling;
                    }

                    if (framesDict) {
                        // 获取第一个帧的key（例如 "1.png"）
                        const frameKeys = Array.from(framesDict.children).filter(el => el.tagName === 'key');
                        if (frameKeys.length > 0) {
                            // 找到第一帧的dict
                            let firstFrameDict = frameKeys[0].nextElementSibling;
                            while (firstFrameDict && firstFrameDict.tagName !== 'dict') {
                                firstFrameDict = firstFrameDict.nextElementSibling;
                            }

                            if (firstFrameDict) {
                                // 在第一帧的dict中查找textureRect
                                const frameDataChildren = Array.from(firstFrameDict.children).filter(el => el.tagName === 'key');
                                for (let k = 0; k < frameDataChildren.length; k++) {
                                    if (frameDataChildren[k].textContent.trim() === 'textureRect') {
                                        let rectValue = frameDataChildren[k].nextElementSibling;
                                        while (rectValue && rectValue.tagName !== 'string') {
                                            rectValue = rectValue.nextElementSibling;
                                        }
                                        if (rectValue) {
                                            // 解析textureRect格式 "{{x,y},{w,h}}"
                                            const rectStr = rectValue.textContent.trim();
                                            const match = rectStr.match(/\{\{(\d+),(\d+)\},\{(\d+),(\d+)\}\}/);
                                            if (match) {
                                                firstFrameRect = {
                                                    x: parseInt(match[1]),
                                                    y: parseInt(match[2]),
                                                    width: parseInt(match[3]),
                                                    height: parseInt(match[4])
                                                };
                                                console.log('找到第一帧textureRect:', firstFrameRect);
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

            // 如果没有找到textureFileName，尝试查找同名的png文件
            if (!atlasPath) {
                const plistFileName = plistPath.split('/').pop().replace('.plist', '');
                atlasPath = `${subPath}/${plistFileName}.png`;
                console.log('使用默认图集路径:', atlasPath);
            }

            return { atlasPath, firstFrameRect };
        } catch (error) {
            console.warn('读取plist文件失败:', plistPath, error);
            return null;
        }
    },

    /**
     * 扫描图片目录
     */
    async scanImages(basePath) {
        // 如果是项目根目录，需要加上assets/remote前缀
        const fullBasePath = ResFS.isProjectRoot ? `assets/remote/${basePath}` : basePath;
        try {
            const entries = await ResFS.list(fullBasePath);

            for (const entry of entries) {
                if (entry.kind === 'file' && /\.(png|jpg|jpeg)$/i.test(entry.name) && !entry.name.endsWith('.meta')) {
                    this.resources.push({
                        type: 'image',
                        path: `${fullBasePath}/${entry.name}`,
                        displayPath: `Res/Map/MapObject/Image/${entry.name}`,
                        name: entry.name.replace(/\.(png|jpg|jpeg)$/i, ''),
                        previewFile: entry.name
                    });
                }
            }
        } catch (error) {
            console.warn('扫描Image目录失败:', error);
        }
    },

    /**
     * 加载图片预览（如果是图集，裁剪出第一帧）
     */
    async loadPreview(resource) {
        try {
            const file = await ResFS.read(resource.path);
            const url = URL.createObjectURL(file);

            // 如果是plist图集且有第一帧信息，裁剪出第一帧
            if (resource.isPlist && resource.frameRect) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const rect = resource.frameRect;
                        canvas.width = rect.width;
                        canvas.height = rect.height;
                        const ctx = canvas.getContext('2d');

                        // 从图集中裁剪第一帧
                        ctx.drawImage(
                            img,
                            rect.x, rect.y, rect.width, rect.height,
                            0, 0, rect.width, rect.height
                        );

                        canvas.toBlob((blob) => {
                            const frameUrl = URL.createObjectURL(blob);
                            URL.revokeObjectURL(url); // 释放原图集URL
                            resolve(frameUrl);
                        });
                    };
                    img.onerror = () => {
                        console.warn('加载图集失败，使用原URL:', resource.path);
                        resolve(url);
                    };
                    img.src = url;
                });
            }

            return url;
        } catch (error) {
            console.warn('加载预览失败:', resource.path, error);
            return null;
        }
    },

    /**
     * 获取所有资源
     */
    getAll() {
        return this.resources;
    }
};
