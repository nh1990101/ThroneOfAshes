import { _decorator, Component, Mat4, Node, Size, Sprite, SpriteFrame, Texture2D, UITransform, Vec2, Vec3 } from "cc";
import { safeGetComponent } from "../../Common/Tools";


const { ccclass, property } = _decorator;

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
   * - 揭示者移动距离小于该值时，本帧不会重新“挖洞”
   * - 值越小越跟手（更平滑），但 CPU 计算与贴图更新更频繁
   */
  @property({ tooltip: "揭示者移动阈值（地图像素）。越小越平滑但更耗性能，建议 1~6。" })
  public minStampMoveMapPx = 4;

  private _revealers = new Map<Node, { node: Node; radiusX: number; radiusY: number; lastPos: Vec3 | null }>();

  private _mapRoot: Node | null = null;
  private _fogNode: Node | null = null;
  private _fogTex: Texture2D | null = null;
  private _fogSf: SpriteFrame | null = null;

  private _mapWidth = 0;
  private _mapHeight = 0;

  private _texW = 0;
  private _texH = 0;
  private _pixels: Uint8Array | null = null;

  private _pendingUpload = false;
  private _uploadElapsedMs = 0;
  private _worldMat = new Mat4();
  private _invWorldMat = new Mat4();
  private _tmpWorldPos = new Vec3();
  private _tmpLocalPos = new Vec3();

  public init(mapRoot: Node, mapWidth: number, mapHeight: number): void {
    this._mapRoot = mapRoot;
    this._mapWidth = Math.max(1, Math.floor(mapWidth));
    this._mapHeight = Math.max(1, Math.floor(mapHeight));

    this._ensureFogNode();

    this._pendingUpload = false;
    this._uploadElapsedMs = 0;
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
    if (this._fogNode && this._fogNode.isValid) this._fogNode.destroy();
    this._fogNode = null;
    this._fogSf = null;
    this._fogTex = null;
    this._pixels = null;
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

    if (dirty) this._pendingUpload = true;

    if (!this._pendingUpload) return;
    if (interval > 0 && this._uploadElapsedMs < interval) return;
    this._uploadElapsedMs = 0;
    this._pendingUpload = false;
    this._fogTex.uploadData(this._pixels);
  }

  private _ensureFogNode(): void {
    if (!this._mapRoot) return;

    const maxDim = Math.max(16, Math.floor(this.textureMaxDim));
    const aspect = this._mapWidth / this._mapHeight;
    if (aspect >= 1) {
      this._texW = maxDim;
      this._texH = Math.max(1, Math.round(maxDim / aspect));
    } else {
      this._texH = maxDim;
      this._texW = Math.max(1, Math.round(maxDim * aspect));
    }

    const pixels = new Uint8Array(this._texW * this._texH * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
    this._pixels = pixels;

    const tex = new Texture2D();
    tex.reset({
      width: this._texW,
      height: this._texH,
      format: Texture2D.PixelFormat.RGBA8888,
    });
    tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
    tex.uploadData(pixels);
    this._fogTex = tex;

    const sf = new SpriteFrame();
    sf.texture = tex;
    this._fogSf = sf;

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
    this._fogNode = fogNode;
  }

  private _stampRevealAt(localPosInMapRoot: Vec3, radiusX: number, radiusY: number, uploadNow: boolean): void {
    if (!this._fogTex || !this._pixels) return;
    if (this._mapWidth <= 0 || this._mapHeight <= 0) return;

    const mapPixelX = localPosInMapRoot.x + this._mapWidth / 2;
    const mapPixelY = this._mapHeight / 2 - localPosInMapRoot.y;

    const cx = (mapPixelX / this._mapWidth) * this._texW;
    const cy = (mapPixelY / this._mapHeight) * this._texH;

    const rx = Math.max(1, (radiusX / this._mapWidth) * this._texW);
    const ry = Math.max(1, (radiusY / this._mapHeight) * this._texH);

    const minR = Math.min(rx, ry);
    const fadePx = Math.max(1, Math.round(minR * 0.25));
    const fadeNorm = Math.min(0.6, fadePx / minR);
    const inner = 1 - fadeNorm;

    const x1 = Math.max(0, Math.floor(cx - rx - 1));
    const x2 = Math.min(this._texW - 1, Math.ceil(cx + rx + 1));
    const y1 = Math.max(0, Math.floor(cy - ry - 1));
    const y2 = Math.min(this._texH - 1, Math.ceil(cy + ry + 1));

    const invRx = 1 / rx;
    const invRy = 1 / ry;
    const inner2 = inner * inner;

    for (let y = y1; y <= y2; y++) {
      const dy = (y - cy) * invRy;
      const dy2 = dy * dy;
      const rowBase = y * this._texW;

      for (let x = x1; x <= x2; x++) {
        const dx = (x - cx) * invRx;
        const r2 = dx * dx + dy2;
        if (r2 > 1) continue;

        let newAlpha = 0;
        if (fadeNorm > 0 && r2 > inner2) {
          const r = Math.sqrt(r2);
          const t = (r - inner) / fadeNorm;
          newAlpha = Math.max(0, Math.min(255, Math.round(t * 255)));
        }

        const aIndex = (rowBase + x) * 4 + 3;
        const oldAlpha = this._pixels[aIndex];
        if (newAlpha < oldAlpha) this._pixels[aIndex] = newAlpha;
      }
    }

    if (uploadNow) this._fogTex.uploadData(this._pixels);
  }

  private _tryStampRevealerNow(node: Node, radiusX: number, radiusY: number): void {
    if (!this.fogEnabled) return;
    if (!this._fogTex || !this._pixels) return;
    if (!this._mapRoot) return;

    this._mapRoot.getWorldMatrix(this._worldMat);
    Mat4.invert(this._invWorldMat, this._worldMat);
    node.getWorldPosition(this._tmpWorldPos);
    Vec3.transformMat4(this._tmpLocalPos, this._tmpWorldPos, this._invWorldMat);
    this._stampRevealAt(this._tmpLocalPos, radiusX, radiusY, false);
    this._pendingUpload = true;
  }
}
