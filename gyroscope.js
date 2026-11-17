/**
 * Gyroscope Visualiser
 * 3D WEBGL audio-reactive torus rings with interactive camera rotation.
 * Uses color gradients from presets and responds to bass, mid, and treble.
 */
class Gyroscope {
  constructor() {
    this.name = "Gyroscope";
    this.is3D = true;

    // Camera rotation and drag state
    this.rotationX = 0;
    this.rotationY = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.dragging = false;

    // Gradient textures for rings (created lazily)
    this.outerTex = null;
    this.midTex = null;
    this.innerTex = null;

    // Default gradient colors (RGB arrays)
    this.outerColors = [[50,150,170],[30,120,140]];
    this.midColors   = [[14,165,164],[45,212,191]];
    this.innerColors = [[1,42,74],[0,109,119]];

    // Texture size for smooth gradients
    this.texW = 1024;
    this.texH = 64;

    this._texGenerated = false;

    // Helper: Convert p5.Color to RGB array
    this.rgbArray = function(c) {
      colorMode(RGB);
      return [Math.round(red(c)), Math.round(green(c)), Math.round(blue(c))];
    };

    /**
     * Sets colors from a color preset object.
     * Supports triple gradients and single HSB color presets.
     */
    this.setColorsFromPreset = function(preset) {
      if (!preset) return;
      if (preset.type === "triple") {
        this.outerColors = preset.colors.outer.slice();
        this.midColors   = preset.colors.mid.slice();
        this.innerColors = preset.colors.inner.slice();
      } else if (preset.type === "single-hsb") {
        colorMode(HSB, 360, 100, 100);
        const h = preset.color[0], s = preset.color[1], b = preset.color[2];
        const baseHSB = color(h, s, b);
        colorMode(RGB, 255);
        const baseRGB = color(red(baseHSB), green(baseHSB), blue(baseHSB));
        const light = lerpColor(baseRGB, color(255, 255, 255), 0.35);
        const dark  = lerpColor(baseRGB, color(0, 0, 0), 0.35);
        this.outerColors = [this.rgbArray(light), this.rgbArray(dark)];
        this.midColors   = [this.rgbArray(light), this.rgbArray(dark)];
        this.innerColors = [this.rgbArray(light), this.rgbArray(dark)];
      }
      this._texGenerated = false; // Regenerate textures next draw
    };

    // Inertia for smooth camera rotation
    this.velX = 0;
    this.velY = 0;
    this.inertia = 0.92;
  }

  /**
   * Mouse pressed handler for camera drag.
   * Ignores drag if EQ panel is open and clicked.
   */
  mousePressed() {
    if (musicPlayer && musicPlayer.eqOpen) {
      const playerY = height - musicPlayer.height - 20;
      const playerX = (width - musicPlayer.width) / 2;
      const panelX =
        playerX + musicPlayer.width - musicPlayer.eqBands.length * 40 - 20;
      const panelY = playerY - 180;
      const panelW = musicPlayer.eqBands.length * 40 + 20;
      const panelH = 140;
      if (
        mouseX >= panelX &&
        mouseX <= panelX + panelW &&
        mouseY >= panelY &&
        mouseY <= panelY + panelH
      ) {
        return;
      }
    }
    this.dragging = true;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    this.velX = 0;
    this.velY = 0;
  }

  /**
   * Mouse released handler for camera drag.
   * Enables inertia after drag ends.
   */
  mouseReleased() {
    this.dragging = false;
  }

  /**
   * Creates a horizontal gradient texture for torus rings.
   * @param {Array} colors - Array of two RGB arrays for gradient ends.
   * @param {number} w - Width of texture.
   * @param {number} h - Height of texture.
   * @returns {p5.Graphics} Gradient texture.
   */
  _createGradientTexture(colors, w = this.texW, h = this.texH) {
    const g = createGraphics(w, h);
    g.noFill();
    const c1 = g.color(colors[0][0], colors[0][1], colors[0][2]);
    const c2 = g.color(colors[1][0], colors[1][1], colors[1][2]);
    for (let x = 0; x < w; x++) {
      const t = x / (w - 1);
      const col = g.lerpColor(c1, c2, t);
      g.stroke(col);
      g.line(x, 0, x, h);
    }
    return g;
  }

  /**
   * Ensures textures are generated before drawing.
   */
  _ensureTextures() {
    if (this._texGenerated) return;
    if (!this.outerColors || !this.midColors || !this.innerColors) {
      this.outerColors = this.outerColors || [[100,150,200],[60,120,160]];
      this.midColors   = this.midColors   || [[120,180,200],[80,140,160]];
      this.innerColors = this.innerColors || [[30,60,120],[10,30,80]];
    }
    this.outerTex = this._createGradientTexture(this.outerColors);
    this.midTex   = this._createGradientTexture(this.midColors);
    this.innerTex = this._createGradientTexture(this.innerColors);
    this._texGenerated = true;
  }

  /**
   * Main draw method for the gyroscope visualiser.
   * Renders three textured torus rings with audio-reactive rotation.
   * @param {p5.Graphics} pg - WEBGL graphics context.
   */
  draw(pg) {
    if (!pg) return;
    this._ensureTextures();

    pg.push();
    pg.background(0);
    pg.noStroke();

    // Lighting setup
    pg.ambientLight(30);
    pg.pointLight(255, 255, 255, 0, -300, 400);
    pg.pointLight(60, 120, 255, 200, 200, 200);
    pg.pointLight(255, 80, 80, -200, 200, 200);

    // Camera rotation and inertia
    if (this.dragging) {
      let deltaX = mouseX - this.lastMouseX;
      let deltaY = mouseY - this.lastMouseY;
      this.rotationY += deltaX * 0.01;
      this.rotationX -= deltaY * 0.01;
      this.velY = deltaX * 0.01;
      this.velX = -deltaY * 0.01;
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
    } else {
      this.rotationY += this.velY;
      this.rotationX += this.velX;
      this.velY *= this.inertia;
      this.velX *= this.inertia;
      if (Math.abs(this.velY) < 0.0001) this.velY = 0;
      if (Math.abs(this.velX) < 0.0001) this.velX = 0;
    }

    // Apply camera rotation
    pg.rotateX(this.rotationX);
    pg.rotateY(this.rotationY);

    // Get frequency data from FFT
    let bass = fourier.getEnergy("bass");
    let mid = fourier.getEnergy("mid");
    let treble = fourier.getEnergy("treble");

    // Rotation speeds based on audio energy
    let bassSpeed = 0.0025 + map(bass, 0, 255, 0, 0.012);
    let midSpeed = 0.005 + map(mid, 0, 255, 0, 0.01);
    let trebleSpeed = 0.01 + map(treble, 0, 255, 0, 0.02);

    // OUTER ring (bass)
    pg.push();
    pg.rotateX(PI * 0.18 + map(bass, 0, 255, 0, PI * 0.5));
    pg.rotateY(map(bass, 0, 255, 0, PI * 0.5));
    pg.rotateZ(frameCount * bassSpeed + map(bass, 0, 255, 0, PI * 2));
    pg.texture(this.outerTex);
    pg.torus(170, 8, 48, 128);
    pg.pop();

    // MIDDLE ring (mid)
    pg.push();
    pg.rotateY(PI * 0.35);
    pg.rotateX(frameCount * midSpeed);
    pg.texture(this.midTex);
    pg.torus(110, 12, 48, 128);
    pg.pop();

    // INNER ring (treble)
    pg.push();
    pg.rotateZ(PI * 0.12);
    pg.rotateY(frameCount * trebleSpeed);
    pg.texture(this.innerTex);
    pg.torus(60, 6, 48, 128);
    pg.pop();

    pg.pop();
  }

  /**
   * Handles resizing of the WEBGL canvas and optionally regenerates textures.
   */
  onResize() {
    if (gfx3D) {
      gfx3D.resizeCanvas(windowWidth, windowHeight);
    }
    // Uncomment to regenerate textures on resize:
    // this._texGenerated = false;
  }
}

// Register Gyroscope class
window.Gyroscope = Gyroscope;