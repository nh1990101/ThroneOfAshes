export class Sprites {
  constructor(onLoad) { this.images = new Map(); this.frames = new Map(); this.onLoad = onLoad; this.errors = new Set(); }
  image(path) {
    if (!path) return null;
    if (!this.images.has(path)) {
      const image = new Image();
      image.onload = () => this.onLoad();
      image.onerror = () => { this.errors.add(path); this.onLoad(); };
      image.src = path;
      this.images.set(path, image);
    }
    const image = this.images.get(path);
    return image.complete && image.naturalWidth ? image : null;
  }
  frame(atlas, frame) {
    if (!atlas || !frame) return null;
    const key = (frame.image || atlas.image) + ':' + frame.name;
    if (this.frames.has(key)) return this.frames.get(key);
    const image = this.image(frame.image || atlas.image);
    if (!image) return null;
    const canvas = document.createElement('canvas');
    canvas.width = frame.width; canvas.height = frame.height;
    const context = canvas.getContext('2d');
    if (frame.rotated) {
      context.translate(0, frame.height); context.rotate(-Math.PI / 2);
      context.drawImage(image, frame.x, frame.y, frame.height, frame.width, 0, 0, frame.height, frame.width);
    } else context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
    this.frames.set(key, canvas);
    // Keep lazily decoded frame memory bounded when browsing large libraries.
    if (this.frames.size > 700) this.frames.delete(this.frames.keys().next().value);
    return canvas;
  }
  draw(context, atlas, frame, x, y, { scale = 1, flip = 'none', alpha = 1, rotation = 0 } = {}) {
    const image = this.frame(atlas, frame);
    if (!image) return false;
    context.save(); context.globalAlpha *= alpha; context.translate(x, y);
    context.rotate(rotation);
    context.scale(scale * (flip === 'x' ? -1 : 1), scale * (flip === 'y' ? -1 : 1));
    context.imageSmoothingEnabled = false;
    context.drawImage(image, frame.offsetX - frame.width / 2, -frame.offsetY - frame.height / 2);
    context.restore(); return true;
  }
  thumbnail(canvas, atlas, frame) {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    const image = this.frame(atlas, frame);
    if (!image) return;
    const scale = Math.min((canvas.width - 8) / image.width, (canvas.height - 6) / image.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, (canvas.width - image.width * scale) / 2, (canvas.height - image.height * scale) / 2, image.width * scale, image.height * scale);
  }
  clear() { this.images.clear(); this.frames.clear(); this.errors.clear(); }
}
