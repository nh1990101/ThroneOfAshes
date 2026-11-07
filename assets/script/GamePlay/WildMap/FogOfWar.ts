import { _decorator, Color, Component, director, Enum, gfx, Mat4, Node, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2, Vec3 } from "cc";
import { safeGetComponent } from "../../Common/Tools";


const { ccclass, property } = _decorator;

/** 整数哈希：确定性伪随机，保证每次运行的噪声图案完全一致（不会出现每次进图雾边不一样） */
function fogHash2(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + 18371;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** 双线性平滑插值的值噪声，返回 0~1 */
function fogValueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  // 平滑插值，避免格点之间的线性折角
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const a = fogHash2(xi, yi);
  const b = fogHash2(xi + 1, yi);
  const c = fogHash2(xi, yi + 1);
  const d = fogHash2(xi + 1, yi + 1);

  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

/**
 * 揭示形状类型。
 * 三种形状共用同一套归一化距离场，dist <= 1 即算在揭示范围内：
 *   dist = c + sqrt(max(nx-c,0)^2 + max(ny-c,0)^2) + min(max(nx,ny) - c, 0)   （c = 1 - 圆角比例）
 * - 圆角比例 = 0（c=1）：退化成 max(nx,ny)，即矩形
 * - 圆角比例 = 1（c=0）：退化成 sqrt(nx^2+ny^2)，即椭圆
 * 所以滑块拉到两端时形状精确等同于矩形/椭圆，中途切换不会突跳。
 */
export enum FogShape {
  /** 椭圆 */
  ELLIPSE = 0,
  /** 矩形（切比雪夫距离，最快） */
  RECT = 1,
  /** 圆角矩形 */
  ROUNDED_RECT = 2,
}
Enum(FogShape);

/**
 * 一张地图的迷雾快照，按 mapId 缓存。
 * 迷雾状态不只是纹理：局部上传用的是 CPU 端 _pixels，揭示结果记在 _targetAlpha，
 * 消散进度在 _fadeIdx 队列里。只缓存 Texture2D 会把这些丢光，切回来时要么整张刷黑、
 * 要么把已揭开的区域重挖一遍。所以整套数组跟着纹理一起存。
 */
interface FogSnapshot {
  tex: Texture2D;
  /** 和纹理一起缓存复用：销毁 SpriteFrame 有可能连带释放它引用的纹理，缓存期间一律不销毁 */
  sf: SpriteFrame;
  texW: number;
  texH: number;
  /** 缓存时的地图尺寸（地图像素）；配置改过后快照要作废 */
  mapWidth: number;
  mapHeight: number;
  pixels: Uint8Array;
  targetAlpha: Uint8Array;
  noise: Float32Array;
  fadeIdx: Int32Array;
  fadeMark: Uint8Array;
  fadeCount: number;
}

/** 最多缓存几张地图的迷雾状态（当前地图不占缓存名额）；超出按 LRU 淘汰 */
const MAX_CACHED_MAP_FOG = 3;

@ccclass("FogOfWar")
export class FogOfWar extends Component {
  /**
   * 迷雾总开关：
   * - false：不创建/不更新迷雾贴图
   * - true：创建迷雾并持续更新揭示区域
   */
  @property({ tooltip: "迷雾总开关。关闭后不创建/不更新迷雾。" })
  public fogEnabled = true;

  /**
   * 默认揭示椭圆半径 X（地图像素单位）
   * - addRevealer(node) 未传 radiusX 时会使用该值
   */
  @property({ tooltip: "默认揭示椭圆半径X（地图像素）。addRevealer 未传半径时使用。" })
  public revealRadiusX = 220;

  /**
   * 默认揭示椭圆半径 Y（地图像素单位）
   * - addRevealer(node) 未传 radiusY 时会使用该值
   */
  @property({ tooltip: "默认揭示椭圆半径Y（地图像素）。addRevealer 未传半径时使用。" })
  public revealRadiusY = 180;

  /**
   * 迷雾贴图最大边长（像素）
   * - 迷雾贴图不是按地图 1:1 创建，而是按地图长宽比缩放到 maxDim 以内
   * - 值越大越清晰，但 CPU 写像素 + uploadData 成本越高
   */
  @property({ tooltip: "迷雾贴图最大边长（像素）。256/512 更适合小游戏；越大越清晰但更耗性能。" })
  public textureMaxDim = 512;

  /**
   * 贴图上传节流（毫秒）
   * - 0：每帧只要有变化就上传
   * - >0：多次挖洞合并，按间隔批量 uploadData（减少尖刺）
   */
  @property({ tooltip: "贴图上传节流（毫秒）。建议 50~100；0 表示有变化就立刻上传。" })
  public uploadIntervalMs = 33;

  /**
   * 位置变化阈值（地图像素单位）
   * - 揭示者移动距离小于该值时，本帧不会重新”挖洞”
   * - 值越小越跟手（更平滑），但 CPU 计算与贴图更新更频繁
   */
  @property({ tooltip: "揭示者移动阈值（地图像素）。越小越平滑但更耗性能，建议 1~6。" })
  public minStampMoveMapPx = 1;

  /**
   * 迷雾消散时长（毫秒）——控制"缓慢出现"的快慢
   * - 0：立刻揭开（原来的瞬变行为）
   * - >0：被揭开的像素从全黑线性渐变到目标透明度，alpha 走完 255 需要这么多时间
   * - 只是改变了"到达目标 alpha"的速度，最终结果与 0 完全一致，不影响寻路/探索判定
   */
  @property({ tooltip: "迷雾消散时长（毫秒）。0=立刻揭开；300~800 为缓慢消散。" })
  public revealFadeMs = 600;

  /**
   * 揭示形状类型
   * - ELLIPSE：椭圆
   * - RECT：矩形（纯比较无开方，最快，也是之前的 useSquareShape = true）
   * - ROUNDED_RECT：圆角矩形，圆角大小由 shapeCornerRatio 控制
   */
  @property({ type: FogShape, tooltip: "揭示形状。椭圆 / 矩形 / 圆角矩形。" })
  public shapeType: FogShape = FogShape.RECT;

  /**
   * 圆角比例（仅 ROUNDED_RECT 生效，0~1，相对揭示半径）
   * - 0：精确退化成矩形
   * - 1：精确退化成椭圆
   * - 0.3~0.4：常见的柔和圆角矩形手感
   */
  @property({ tooltip: "圆角比例（仅圆角矩形生效）。0=矩形，1=椭圆，建议 0.3~0.4。", range: [0, 1, 0.01] })
  public shapeCornerRatio = 0.35;

  /**
   * 边缘渐变宽度比例（相对于揭示半径）
   * - 0：无渐变，边缘完全锐利
   * - 0.25：渐变宽度占半径的 25%（默认）
   * - 1.0：整个揭示区域都是渐变
   */
  @property({ tooltip: "边缘渐变宽度比例（0~1）。0=无渐变，0.25=默认柔和边缘，1=全渐变。", range: [0, 1, 0.01] })
  public edgeFadeRatio = 0.25;

  /**
   * 边缘渐变最大占比限制
   * - 防止渐变区域过大导致中心透明区域太小
   * - 0.6：渐变最多占半径的 60%（默认）
   */
  @property({ tooltip: "边缘渐变最大占比（0~1）。防止渐变过大，默认 0.6。", range: [0, 1, 0.01] })
  public edgeFadeMaxRatio = 0.6;

  /**
   * 边缘噪声抖动幅度（地图像素）
   * - 0：关闭，边缘是规则几何形状（原来的行为）
   * - >0：揭示阈值整体随机平移，边缘变得不规则、更自然
   * - 注意是"平移"而非"加宽"，所以渐变带宽度不变，只是边界在抖
   */
  @property({ tooltip: "边缘噪声抖动幅度（地图像素）。0=规则边缘，19 左右较自然。" })
  public edgeJitterMapPx = 19;

  /** 是否开启边缘发光（揭开过程中边缘泛起一圈光） */
  @property({ tooltip: "揭开时边缘泛起一圈光。" })
  public glowEnabled = true;

  /** 发光颜色，默认暖金色 */
  @property({ type: Color, tooltip: "边缘发光颜色。" })
  public glowColor = new Color(255, 214, 150, 255);

  /** 发光强度，0 = 不发光 */
  @property({ tooltip: "边缘发光强度，0=不发光。0.3~0.5 接近演示观感。", range: [0, 2, 0.01] })
  public glowIntensity = 0.35;

  /**
   * 雾面底纹强度
   * - 0：纯黑雾（保持原有观感）
   * - 0.4~0.8：未揭开区域带极淡的噪声纹理，更接近演示质感
   */
  @property({ tooltip: "雾面噪声底纹强度。0=纯黑。", range: [0, 1, 0.01] })
  public fogMottle = 0;

  /**
   * 局部上传开关（性能优先）
   * - true：只把发生变化的矩形区域传给 GPU（copyBuffersToTexture），代价从"整张贴图"降到"脏矩形"
   * - false：退回整张 uploadData，兼容性最好但慢得多
   * - 脏区超过半张贴图、或取不到设备纹理时，会自动退回整张上传
   */
  @property({ tooltip: "只上传变化的矩形区域（性能优化）。异常时自动回退整张上传。" })
  public usePartialUpload = true;

  private _revealers = new Map<Node, { node: Node; radiusX: number; radiusY: number; lastPos: Vec3 | null }>();

  private _mapRoot: Node | null = null;
  private _fogNode: Node | null = null;
  private _fogTex: Texture2D | null = null;
  private _fogSf: SpriteFrame | null = null;
  /** setShow 的显隐状态，重新 init 建出来的迷雾节点沿用它 */
  private _fogVisible = true;

  private _mapWidth = 0;
  private _mapHeight = 0;

  private _texW = 0;
  private _texH = 0;
  private _pixels: Uint8Array | null = null;

  /** 目标 alpha（每像素 1 字节）。挖洞只改这里，_pixels 的 alpha 每帧朝它逼近，实现缓慢消散 */
  private _targetAlpha: Uint8Array | null = null;

  /**
   * 待渐进的像素索引队列。用「数组 + 标记位」代替 Set：
   * - 入队：_fadeMark 查重后追加到 _fadeIdx[0.._fadeCount)
   * - 出队：与队尾交换后收缩（O(1)，不需要 move 整个数组）
   * 比 Set<number> 省掉哈希与节点分配，单次挖洞几千次入队时差距明显
   */
  private _fadeIdx: Int32Array | null = null;
  private _fadeMark: Uint8Array | null = null;
  private _fadeCount = 0;

  /** 每毫秒的 alpha 变化量，由 revealFadeMs 归一化而来 */
  private _fadeSpeed = 0;

  /**
   * 预计算的噪声场（每像素 0~1），用于边缘抖动与雾面底纹。
   * 三个八度叠加成 fbm，构造时算一次，之后只读，不参与每帧开销。
   */
  private _noise: Float32Array | null = null;

  /** 脏矩形（含端点）；_dirtyX1 < _dirtyX0 表示无变化 */

  private _dirtyX0 = 0;
  private _dirtyY0 = 0;
  private _dirtyX1 = -1;
  private _dirtyY1 = -1;

  /** 复用的局部上传区域描述，避免每帧 new */
  private _copyRegion: gfx.BufferTextureCopy | null = null;

  private _pendingUpload = false;
  private _uploadElapsedMs = 0;
  private _worldMat = new Mat4();
  private _invWorldMat = new Mat4();
  private _tmpWorldPos = new Vec3();
  private _tmpLocalPos = new Vec3();

  /** 当前迷雾属于哪张地图（快照缓存的 key） */
  private _mapId: number | null = null;
  /** 按 mapId 缓存的迷雾状态；Map 的插入顺序即 LRU 顺序，队首最久未用 */
  private _mapFog = new Map<number, FogSnapshot>();

  public static instance: FogOfWar;
  protected onLoad(): void {
    FogOfWar.instance = this;
  }

  /**
   * 初始化迷雾，可重复调用（窗口复用 / 切换地图）：
   * - 先把当前地图的迷雾状态存进快照缓存，再拆掉迷雾节点
   * - 同一 mapId 再次 init 会逐像素恢复上次的迷雾状态；没有快照则按新地图尺寸建全黑
   * - 会清空所有揭示者，addRevealer 要在 init 之后调用
   * @returns true 表示命中缓存并恢复了旧状态；false 表示新建了全黑迷雾
   */
  public init(mapId: number, mapRoot: Node, mapWidth: number, mapHeight: number): boolean {
    this._saveSnapshot();
    this._detachFog();
    this._revealers.clear();

    this._mapId = mapId;
    this._mapRoot = mapRoot;
    this._mapWidth = Math.max(1, Math.floor(mapWidth));
    this._mapHeight = Math.max(1, Math.floor(mapHeight));

    const snap = this._takeSnapshot(mapId);
    this._ensureFogNode(snap);

    this._pendingUpload = false;
    this._uploadElapsedMs = 0;
    this._clearDirty();
    return !!snap;
  }

  /**
   * 把当前地图的迷雾状态存入缓存，然后淘汰超额的旧地图。
   * 必须在拆节点之前调用——数组都是被节点引用的同一份内存，拆完就取不到了。
   */
  private _saveSnapshot(): void {
    if (this._mapId == null) return;
    if (!this._fogTex || !this._fogSf || !this._pixels || !this._targetAlpha || !this._noise) return;
    if (!this._fadeIdx || !this._fadeMark) return;

    const prev = this._mapFog.get(this._mapId);
    // 同 id 的旧快照被取代时释放，否则显存泄漏（先 SpriteFrame 后纹理）
    if (prev && prev.tex !== this._fogTex) this._releaseSnapshot(prev);
    this._mapFog.delete(this._mapId);

    this._mapFog.set(this._mapId, {
      tex: this._fogTex,
      sf: this._fogSf,
      texW: this._texW,
      texH: this._texH,
      mapWidth: this._mapWidth,
      mapHeight: this._mapHeight,
      pixels: this._pixels,
      targetAlpha: this._targetAlpha,
      noise: this._noise,
      fadeIdx: this._fadeIdx,
      fadeMark: this._fadeMark,
      fadeCount: this._fadeCount,
    });

    // 队首是最久未用的地图，超出上限就释放它的纹理
    while (this._mapFog.size > MAX_CACHED_MAP_FOG) {
      const oldestId = this._mapFog.keys().next().value as number;
      const oldest = this._mapFog.get(oldestId);
      if (oldest) this._releaseSnapshot(oldest);
      this._mapFog.delete(oldestId);
    }
  }

  /** 释放一份不再使用的快照。先销毁 SpriteFrame 再销毁纹理，避免引用关系残留 */
  private _releaseSnapshot(snap: FogSnapshot): void {
    if (snap.sf && snap.sf.isValid) snap.sf.destroy();
    if (snap.tex && snap.tex.isValid) snap.tex.destroy();
  }

  /** 取出某地图的快照并把它从缓存里摘下（它变成"当前地图"，下次 init 再存回去） */
  private _takeSnapshot(mapId: number): FogSnapshot | null {
    const snap = this._mapFog.get(mapId);
    if (!snap) return null;

    // 地图尺寸被改过（编辑器重新导图），旧快照的像素布局对不上，直接作废
    if (snap.mapWidth !== this._mapWidth || snap.mapHeight !== this._mapHeight) {
      this._releaseSnapshot(snap);
      this._mapFog.delete(mapId);
      return null;
    }

    this._mapFog.delete(mapId);
    return snap;
  }

  public addRevealer(node: Node, radiusX?: number, radiusY?: number): void {
    if (!node || !node.isValid) return;
    const rx = radiusX ?? this.revealRadiusX;
    const ry = radiusY ?? this.revealRadiusY;
    const cur = this._revealers.get(node);
    if (cur) {
      cur.radiusX = rx;
      cur.radiusY = ry;
      return;
    }
    this._revealers.set(node, { node, radiusX: rx, radiusY: ry, lastPos: null });
    this._tryStampRevealerNow(node, rx, ry);
  }

  public removeRevealer(node: Node): void {
    this._revealers.delete(node);
  }

  public clearRevealers(): void {
    this._revealers.clear();
  }

  onDestroy(): void {
    // 当前地图的纹理此刻还没进缓存，先存进去，下面统一释放，否则它没人管
    this._saveSnapshot();
    this._detachFog();
    // 组件销毁时缓存必须全部释放，否则显存泄漏
    this._mapFog.forEach(snap => this._releaseSnapshot(snap));
    this._mapFog.clear();
    this._revealers.clear();
  }

  update(dt: number): void {
    if (!this.fogEnabled) return;
    if (!this._fogTex || !this._pixels) return;
    if (!this._mapRoot || !this._fogNode) return;

    const interval = Math.max(0, this.uploadIntervalMs);
    if (interval > 0) this._uploadElapsedMs += dt * 1000;

    this._mapRoot.getWorldMatrix(this._worldMat);
    Mat4.invert(this._invWorldMat, this._worldMat);

    let dirty = false;
    for (const [k, r] of this._revealers) {
      if (!k || !k.isValid) {
        this._revealers.delete(k);
        continue;
      }

      k.getWorldPosition(this._tmpWorldPos);
      Vec3.transformMat4(this._tmpLocalPos, this._tmpWorldPos, this._invWorldMat);
      const p = this._tmpLocalPos;
      if (!r.lastPos) {
        this._stampRevealAt(p, r.radiusX, r.radiusY, false);
        r.lastPos = p.clone();
        dirty = true;
        continue;
      }

      const dx = p.x - r.lastPos.x;
      const dy = p.y - r.lastPos.y;
      const minMove = Math.max(0, this.minStampMoveMapPx);
      if (dx * dx + dy * dy < minMove * minMove) continue;

      this._stampRevealAt(p, r.radiusX, r.radiusY, false);
      r.lastPos = p.clone();
      dirty = true;
    }

    // 已挖好的洞按时间缓慢消散；这一步与揭示者是否移动无关，所以要独立跑。
    // 它自己会把变化的像素并入脏矩形，所以不需要返回值。
    this._applyFadeStep(dt * 1000);

    // 脏矩形非空（_dirtyX1 >= _dirtyX0）就说明有像素变了
    if (dirty || this._dirtyX1 >= this._dirtyX0) this._pendingUpload = true;

    if (!this._pendingUpload) return;

    // 迷雾不可见时上传纯属浪费。这里不能直接 return 掉整帧：脏矩形会继续累积，
    // 等重新显示时由一次上传补齐（脏区涨到半张贴图以上时 _uploadDirty 会自动整张传），
    // 所以隐藏期间走过的路径依然会被正确揭开。
    if (!this._fogNode.active) return;

    if (interval > 0 && this._uploadElapsedMs < interval) return;
    this._uploadElapsedMs = 0;
    this._pendingUpload = false;
    this._uploadDirty();
  }

  /**
   * 建立迷雾节点。
   * @param snap 命中缓存时传入：复用它的尺寸、数组与纹理，跳过重建全黑像素与噪声；
   *             传 null 则按新地图尺寸新建一张全黑贴图
   */
  private _ensureFogNode(snap: FogSnapshot | null): void {
    if (!this._mapRoot) return;

    let tex: Texture2D;
    let sf: SpriteFrame;
    if (snap) {
      this._texW = snap.texW;
      this._texH = snap.texH;
      this._pixels = snap.pixels;
      this._targetAlpha = snap.targetAlpha;
      this._noise = snap.noise;
      this._fadeIdx = snap.fadeIdx;
      this._fadeMark = snap.fadeMark;
      this._fadeCount = snap.fadeCount;
      tex = snap.tex;
      sf = snap.sf;
      // 纹理没销毁，显存里本来就有；重传一遍是为了保证与 CPU 端数组严格一致（代价很小）
      tex.uploadData(snap.pixels);
    } else {
      const maxDim = Math.max(16, Math.floor(this.textureMaxDim));
      const aspect = this._mapWidth / this._mapHeight;
      if (aspect >= 1) {
        this._texW = maxDim;
        this._texH = Math.max(1, Math.round(maxDim / aspect));
      } else {
        this._texH = maxDim;
        this._texW = Math.max(1, Math.round(maxDim * aspect));
      }

      // 噪声场：构造时算一次，之后只读。三个八度叠加成 fbm，和演示同源。
      const noise = new Float32Array(this._texW * this._texH);
      for (let y = 0; y < this._texH; y++) {
        const rowBase = y * this._texW;
        for (let x = 0; x < this._texW; x++) {
          noise[rowBase + x] =
            0.62 * fogValueNoise(x / 25, y / 25) +
            0.28 * fogValueNoise(x / 9, y / 9) +
            0.1 * fogValueNoise(x / 3.8, y / 3.8);
        }
      }
      this._noise = noise;

      const pixels = new Uint8Array(this._texW * this._texH * 4);
      const mottle = Math.max(0, Math.min(1, this.fogMottle));
      for (let i = 0, pi = 0; i < pixels.length; i += 4, pi++) {
        // 未揭开区域默认纯黑；fogMottle > 0 时带极淡的噪声纹理
        const m = mottle > 0 ? (mottle * noise[pi] * 255) | 0 : 0;
        pixels[i] = m;
        pixels[i + 1] = m;
        pixels[i + 2] = m;
        pixels[i + 3] = 255;
      }
      this._pixels = pixels;

      const targetAlpha = new Uint8Array(this._texW * this._texH);
      targetAlpha.fill(255);
      this._targetAlpha = targetAlpha;

      // 渐变队列按整张贴图容量预分配，之后不再扩容
      this._fadeIdx = new Int32Array(this._texW * this._texH);
      this._fadeMark = new Uint8Array(this._texW * this._texH);
      this._fadeCount = 0;

      tex = new Texture2D();
      tex.reset({
        width: this._texW,
        height: this._texH,
        format: Texture2D.PixelFormat.RGBA8888,
      });
      tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
      tex.uploadData(pixels);

      sf = new SpriteFrame();
      sf.texture = tex;
    }
    this._fogTex = tex;
    this._fogSf = sf;
    this._clearDirty();

    const fogNode = new Node("FogLayer");
    fogNode.parent = this._mapRoot;
    fogNode.layer = this._mapRoot.layer;
    fogNode.setPosition(0, 0, 0);

    const sp = safeGetComponent(fogNode, Sprite);
    sp.spriteFrame = sf;
    sp.sizeMode = Sprite.SizeMode.CUSTOM;

    const tr = safeGetComponent(fogNode, UITransform);
    tr.setContentSize(new Size(this._mapWidth, this._mapHeight));
    tr.setAnchorPoint(new Vec2(0.5, 0.5));

    fogNode.setSiblingIndex(this._mapRoot.children.length - 1);
    fogNode.active = this._fogVisible;
    this._fogNode = fogNode;
  }

  /**
   * 拆掉迷雾节点，但纹理与 SpriteFrame 交给快照缓存管理（都不销毁）。
   * 三者共用同一份显存，缓存期间任何一个被 destroy 都可能把纹理带走。
   */
  private _detachFog(): void {
    if (this._fogNode && this._fogNode.isValid) this._fogNode.destroy();
    this._fogNode = null;
    this._fogSf = null;
    this._fogTex = null;
    this._pixels = null;
    this._targetAlpha = null;
    this._noise = null;
    this._fadeIdx = null;
    this._fadeMark = null;
    this._fadeCount = 0;
    this._clearDirty();
  }

  /** 清空脏矩形（_dirtyX1 < _dirtyX0 视为空） */
  private _clearDirty(): void {
    this._dirtyX0 = 0;
    this._dirtyY0 = 0;
    this._dirtyX1 = -1;
    this._dirtyY1 = -1;
  }

  /** 把矩形并入脏区，自动裁剪到贴图范围 */
  private _markDirtyRect(x1: number, y1: number, x2: number, y2: number): void {
    if (x1 < 0) x1 = 0;
    if (y1 < 0) y1 = 0;
    if (x2 > this._texW - 1) x2 = this._texW - 1;
    if (y2 > this._texH - 1) y2 = this._texH - 1;
    if (x2 < x1 || y2 < y1) return;

    if (this._dirtyX1 < this._dirtyX0) {
      this._dirtyX0 = x1;
      this._dirtyY0 = y1;
      this._dirtyX1 = x2;
      this._dirtyY1 = y2;
      return;
    }
    if (x1 < this._dirtyX0) this._dirtyX0 = x1;
    if (y1 < this._dirtyY0) this._dirtyY0 = y1;
    if (x2 > this._dirtyX1) this._dirtyX1 = x2;
    if (y2 > this._dirtyY1) this._dirtyY1 = y2;
  }

  /** 入队一个待渐变像素，_fadeMark 保证同一像素不重复入队 */
  private _pushFade(pi: number): void {
    const idx = this._fadeIdx;
    const mark = this._fadeMark;
    if (!idx || !mark || mark[pi] !== 0) return;
    mark[pi] = 1;
    idx[this._fadeCount++] = pi;
  }

  /**
   * 把脏矩形上传到 GPU。
   * - 默认只传脏矩形：1MB 的全量上传降到几十 KB，这是整个组件最大的性能项
   * - 脏区过大（超过半张贴图）或取不到设备纹理时，全量上传反而更省
   */
  private _uploadDirty(): void {
    if (!this._fogTex || !this._pixels) return;

    const x0 = this._dirtyX0;
    const y0 = this._dirtyY0;
    if (this._dirtyX1 < x0 || this._dirtyY1 < y0) return; // 无变化

    const w = this._dirtyX1 - x0 + 1;
    const h = this._dirtyY1 - y0 + 1;
    this._clearDirty();

    if (!this.usePartialUpload || w * h * 2 >= this._texW * this._texH) {
      this._fogTex.uploadData(this._pixels);
      return;
    }

    const gfxTex = this._fogTex.getGFXTexture();
    const device = director.root?.device;
    if (!gfxTex || !device) {
      this._fogTex.uploadData(this._pixels);
      return;
    }

    // buffOffset 是字节偏移，buffStride 是像素跨度（源缓冲仍是整行存储，所以 stride 传贴图宽度）
    const region = this._copyRegion ?? (this._copyRegion = new gfx.BufferTextureCopy());
    region.buffOffset = (y0 * this._texW + x0) * 4;
    region.buffStride = this._texW;
    region.buffTexHeight = h;
    region.texOffset.x = x0;
    region.texOffset.y = y0;
    region.texOffset.z = 0;
    region.texExtent.width = w;
    region.texExtent.height = h;
    region.texExtent.depth = 1;
    region.texSubres.mipLevel = 0;
    region.texSubres.baseArrayLayer = 0;
    region.texSubres.layerCount = 1;

    try {
      device.copyBuffersToTexture([this._pixels], gfxTex, [region]);
    } catch (e) {
      // 任何平台差异导致局部上传失败，退回整张，宁可慢也不能不显示
      this._fogTex.uploadData(this._pixels);
    }
  }

  private _stampRevealAt(localPosInMapRoot: Vec3, radiusX: number, radiusY: number, uploadNow: boolean): void {
    if (!this._fogTex || !this._pixels || !this._targetAlpha) return;
    if (this._mapWidth <= 0 || this._mapHeight <= 0) return;

    // 时长为 0 时保持原来的瞬揭行为，避免多一帧延迟
    const fadeOff = this.revealFadeMs <= 0;

    const mapPixelX = localPosInMapRoot.x + this._mapWidth / 2;
    const mapPixelY = this._mapHeight / 2 - localPosInMapRoot.y;

    const cx = (mapPixelX / this._mapWidth) * this._texW;
    const cy = (mapPixelY / this._mapHeight) * this._texH;

    const rx = Math.max(1, (radiusX / this._mapWidth) * this._texW);
    const ry = Math.max(1, (radiusY / this._mapHeight) * this._texH);

    const minR = Math.min(rx, ry);
    const fadePx = Math.max(0, Math.round(minR * Math.max(0, Math.min(1, this.edgeFadeRatio))));
    const fadeNorm = Math.min(Math.max(0, Math.min(1, this.edgeFadeMaxRatio)), fadePx / minR);
    const inner = 1 - fadeNorm;

    const x1 = Math.max(0, Math.floor(cx - rx - 1));
    const x2 = Math.min(this._texW - 1, Math.ceil(cx + rx + 1));
    const y1 = Math.max(0, Math.floor(cy - ry - 1));
    const y2 = Math.min(this._texH - 1, Math.ceil(cy + ry + 1));

    // 三种形状统一成同一个"半宽反解"。
    // 令 c 为圆角内边界（矩形 1、椭圆 0、圆角矩形 1-圆角比例），对固定行 ny：
    //   dist <= t  等价于  |nx| <= _halfSpan(t, ny, c)
    // 于是每行只需解出一个 x 区间：核心透明区整段写 0，边界带才逐像素算渐变。
    const invRx = 1 / rx;
    const invRy = 1 / ry;
    const corner = Math.max(0, Math.min(1, this.shapeCornerRatio));
    const c = this.shapeType === FogShape.RECT
      ? 1
      : (this.shapeType === FogShape.ELLIPSE ? 0 : 1 - corner);
    const useFade = !fadeOff;

    // 边缘抖动：噪声把两个阈值同时平移 O，带宽不变、只挪位置，所以边缘不规则而非变模糊。
    // 行区间反解没法逐像素取噪声，于是用最大幅度 J 各让出一点：
    // 核心区收 J（保证里面 alpha 仍为 0），外边界放 J（保证不裁掉带），中间逐像素取真实噪声。
    const noise = this._noise;
    const jitterAmp = this.edgeJitterMapPx > 0 && noise
      ? this.edgeJitterMapPx / Math.max(1e-3, Math.min(radiusX, radiusY))
      : 0;
    const coreMax = inner - jitterAmp;
    const outerMax = 1 + jitterAmp;

    // 只在真的改到 _pixels 时才需要标脏：走老区域时整段都是"已经是 0、无需再写"，
    // 无条件标脏会让每帧都白传一次贴图
    let wrote = false;

    for (let y = y1; y <= y2; y++) {
      const ny = Math.abs(y - cy) * invRy;

      // 整行都在可见区之外，跳过（不碰任何像素）
      const hwOuter = this._halfSpan(outerMax, ny, c);
      if (hwOuter < 0) continue;

      const hwInner = coreMax > 0 ? this._halfSpan(coreMax, ny, c) : -1;
      const rowBase = y * this._texW;

      // 核心区：完全透明的整段，直接写 0，不做任何距离计算
      let coreL = 1;
      let coreR = 0;
      if (hwInner >= 0) {
        const innerR = hwInner * rx;
        coreL = Math.max(x1, Math.ceil(cx - innerR));
        coreR = Math.min(x2, Math.floor(cx + innerR));
        for (let x = coreL; x <= coreR; x++) {
          const pi = rowBase + x;
          if (this._targetAlpha[pi] === 0) continue;
          this._targetAlpha[pi] = 0;
          if (useFade) this._pushFade(pi);
          else {
            this._pixels[pi * 4 + 3] = 0;
            wrote = true;
          }
        }
      }

      // 边界带：核心区两侧，逐像素算渐变。多留 1 像素余量，由 dist > 1 精确剔除。
      const outerR = hwOuter * rx;
      const ox1 = Math.max(x1, Math.floor(cx - outerR) - 1);
      const ox2 = Math.min(x2, Math.ceil(cx + outerR) + 1);

      for (let x = ox1; x <= ox2; x++) {
        if (x >= coreL && x <= coreR) continue; // 核心区已写过

        const pi = rowBase + x;
        const nx = Math.abs(x - cx) * invRx;

        let dist: number;
        if (c >= 1) {
          // 矩形：纯比较，无开方
          dist = nx > ny ? nx : ny;
        } else {
          const ex = nx - c;
          const ey = ny - c;
          // 平直区域 ex/ey 至多一个为正，平方和退化成单边，只有四个角才开方
          dist = (ex > 0 && ey > 0)
            ? c + Math.sqrt(ex * ex + ey * ey)
            : (nx > ny ? nx : ny);
        }

        // 抖动：两个阈值同时平移 O，带宽 fadeNorm 不变。
        // (noise-0.5) 是 ±0.5，乘 2 才得到 ±jitterAmp 的满幅
        let distEdge = dist;
        if (jitterAmp > 0) distEdge += (noise![pi] - 0.5) * 2 * jitterAmp;

        // 外边界用放开的 outerMax 判定，避免把抖出去的像素裁掉
        if (dist > outerMax) continue;

        let newAlpha = 0;
        if (fadeNorm > 0 && distEdge > inner) {
          const t = (distEdge - inner) / fadeNorm;
          newAlpha = t >= 1 ? 255 : Math.round(t * 255);
        }

        if (newAlpha < this._targetAlpha[pi]) {
          this._targetAlpha[pi] = newAlpha;
          if (useFade) this._pushFade(pi);
          else {
            this._pixels[pi * 4 + 3] = newAlpha;
            wrote = true;
          }
        }
      }
    }

    // 只有直接写了像素（无渐变模式）才需要标脏；渐变模式下由 _applyFadeStep 累积，
    // 这里若也标脏会把整块包围盒传上去，等于白做优化
    if (wrote) this._markDirtyRect(x1, y1, x2, y2);

    if (uploadNow) this._uploadDirty();
  }

  /**
   * 反解一行内的半宽：给定归一化纵向距离 ny 与阈值 t，返回 |nx| 的上界。
   * 返回负数表示该行没有像素落在阈值内，整行可直接跳过。
   * c 是圆角内边界：矩形 1、椭圆 0、圆角矩形 1-圆角比例。
   * 必须与逐像素判定保持一致，否则区间会小于实际应写范围、沿边沿漏像素。
   */
  private _halfSpan(t: number, ny: number, c: number): number {
    // 矩形：max(nx, ny) <= t，直接短路。
    // 不能走下面的圆角公式——c=1 时它描述的是"体育场"，在 ny 逼近 t 处会低于真实边界。
    if (c >= 1) return ny <= t ? t : -1;
    if (ny > t) return -1;
    if (ny <= c) return t; // 平直段，退化成矩形
    // ny 落在圆角段（此时必有 t > c），只有这里需要开方
    const d = (t - c) * (t - c) - (ny - c) * (ny - c);
    return d > 0 ? c + Math.sqrt(d) : c;
  }

  /**
   * 推进一帧消散动画：把所有待消散像素的 alpha 朝目标值移动 dtMs * 速度。
   * 遍历量只和"正在消散的像素数"相关，不做全贴图扫描。
   * 写入像素的同时累积脏矩形，返回后由 update 统一局部上传。
   */
  private _applyFadeStep(dtMs: number): void {
    const idx = this._fadeIdx;
    const mark = this._fadeMark;
    if (!idx || !mark || this._fadeCount === 0) return;
    if (!this._pixels || !this._targetAlpha) {
      this._fadeCount = 0;
      return;
    }

    const texW = this._texW;
    const pixels = this._pixels;
    const targets = this._targetAlpha;

    let minPx = texW;
    let maxPx = -1;
    let minPy = this._texH;
    let maxPy = -1;

    // 不可见 / 不需要渐变时直接对齐目标值，省掉重建贴图后的无意义动画
    const snap = this.revealFadeMs <= 0 || this._fogNode?.active === false || dtMs <= 0;

    let step = 0;
    if (!snap) {
      // alpha 走满 255 需要 revealFadeMs 毫秒；每帧现算，方便运行时直接调属性看效果
      this._fadeSpeed = 255 / Math.max(1, this.revealFadeMs);
      // 单帧步长封顶，避免首帧 dt 很大时一次跳完，看不出渐变
      step = Math.min(255, this._fadeSpeed * dtMs);
    }

    // 发光：d = 4s(1-s) 是钟形，s 为揭开进度（0 未揭 → 1 全揭）。
    // alpha 从 255 递减到 0 正好对应 s 从 0 升到 1，所以进度可直接由 alpha 反推——
    // 不需要记录每像素起始时刻，省掉一张 Float32Array。
    const glow = this.glowEnabled && !snap && this.glowIntensity > 0;
    const glowCol = this.glowColor;
    const glowR = glowCol.r * this.glowIntensity;
    const glowG = glowCol.g * this.glowIntensity;
    const glowB = glowCol.b * this.glowIntensity;
    const noise = this._noise;
    const mottleBase = Math.max(0, Math.min(1, this.fogMottle));

    for (let i = 0; i < this._fadeCount;) {
      const pi = idx[i];
      const a4 = pi * 4 + 3;
      const cur = pixels[a4];
      const tgt = targets[pi];

      let done = false;
      let wrote = false;

      if (cur <= tgt) {
        // 目标被抬高过（同一像素被另一次挖洞覆盖），直接对齐
        if (cur !== tgt) {
          pixels[a4] = tgt;
          wrote = true;
        }
        done = true;
      } else {
        const next = snap ? tgt : cur - step;
        done = next <= tgt;
        pixels[a4] = done ? tgt : next;
        wrote = true;
      }

      // 边缘发光：只作用于"正在揭开"的像素（其余像素 alpha 已是 0/255，钟形自会归零）。
      // 必须幂等——d 由当前 alpha 算出，同一像素被多次写不会累积变亮。
      if (wrote && (glow || mottleBase > 0)) {
        const a = pixels[a4];
        const base = noise && mottleBase > 0
          ? (mottleBase * noise[pi] * 255) | 0
          : 0;

        let d = 0;
        if (glow) {
          const s = 1 - a / 255;
          d = 4 * s * (1 - s); // 两端为 0、中间最亮
        }

        const r = base + glowR * d;
        const g = base + glowG * d;
        const b = base + glowB * d;
        pixels[pi * 4] = r > 255 ? 255 : r | 0;
        pixels[pi * 4 + 1] = g > 255 ? 255 : g | 0;
        pixels[pi * 4 + 2] = b > 255 ? 255 : b | 0;
      }

      // 只要写过就必须计入脏矩形：出队后该像素不会再被处理，
      // 漏记会让它最后一步的 alpha 永远传不到 GPU
      if (wrote) {
        const x = pi % texW;
        const y = (pi - x) / texW;
        if (x < minPx) minPx = x;
        if (x > maxPx) maxPx = x;
        if (y < minPy) minPy = y;
        if (y > maxPy) maxPy = y;
      }

      if (done) {
        // 出队：与队尾交换后收缩，避免 move 整个数组
        mark[pi] = 0;
        idx[i] = idx[--this._fadeCount];
        continue; // 不递增 i，继续处理换过来的元素
      }
      i++;
    }

    if (maxPx >= minPx) this._markDirtyRect(minPx, minPy, maxPx, maxPy);
  }

  /** 在世界坐标处一次性开雾（静态物体用），半径单位是地图像素 */
  public StampRevealAt(worldPos: Vec3, radiusX: number, radiusY: number): void {
    if (!this.fogEnabled) return;
    if (!this._fogTex || !this._pixels) return;
    if (!this._mapRoot) return;

    this._mapRoot.getWorldMatrix(this._worldMat);
    Mat4.invert(this._invWorldMat, this._worldMat);
    Vec3.transformMat4(this._tmpLocalPos, worldPos, this._invWorldMat);
    this._stampRevealAt(this._tmpLocalPos, radiusX, radiusY, false);
    this._pendingUpload = true;
  }

  private _tryStampRevealerNow(node: Node, radiusX: number, radiusY: number): void {
    node.getWorldPosition(this._tmpWorldPos);
    this.StampRevealAt(this._tmpWorldPos, radiusX, radiusY);
  }
  public setShow(bolShow: boolean) {
    this._fogVisible = bolShow;
    if (this._fogNode) this._fogNode.active = bolShow;
  }
}
