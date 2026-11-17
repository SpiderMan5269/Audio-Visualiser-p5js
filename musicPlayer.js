/**
 * MusicPlayer
 * Handles audio playback, track switching, EQ controls, volume, and UI rendering.
 * Integrates with p5.sound and supports color presets for UI theming.
 */
class MusicPlayer {
  constructor() {
    // Player UI dimensions and state
    this.is3D = false;
    this.height = UI.PLAYER_HEIGHT;
    this.width = min(UI.MAX_WIDTH, windowWidth * 0.9);
    this.trackNames = [
      "Stomper Reggae",
      "Lost in dreams",
    ];
    this.isDragging = false;      // Progress bar dragging state
    this.visible = true;          // Player visibility
    this.cornerRadius = UI.CORNER_RADIUS;
    this.buttons = [];            // Control buttons
    this.volume = 0.7;            // Default volume
    this.volumeDragging = false;  // Volume slider dragging state
    sound.setVolume(this.volume);

    // Color preset state (HSB)
    this.baseColorHSB = [200, 80, 90]; // Default player tint

    // Equalizer setup
    this.eqOpen = false;          // EQ panel open state
    this.sliderRects = [];        // EQ slider hitboxes
    this.eqBands = [60, 250, 1000, 4000, 10000]; // EQ band frequencies

    // Create EQ filters for each band
    this.eqFilters = this.eqBands.map((freq, i) => {
      let type =
        i === 0
          ? "lowshelf"
          : i === this.eqBands.length - 1
          ? "highshelf"
          : "peaking";
      let f = new p5.Filter();
      f.setType(type);
      f.freq(freq);
      f.res(1);
      f.amp(1);
      f.gain(0);
      return f;
    });

    // Disconnect sound from master and chain through EQ filters
    sound.disconnect();
    let node = sound;
    this.eqFilters.forEach((f) => {
      f.process(node);
      node = f;
    });
    node.connect();

    // Helper: Convert HSB array to RGB array
    this.hsbToRgb = function(hsb) {
      colorMode(HSB, 360, 100, 100);
      const c = color(hsb[0], hsb[1], hsb[2]);
      colorMode(RGB, 255);
      return [red(c), green(c), blue(c)];
    };

    // Update player color from a preset object
    this.setColorsFromPreset = function(preset) {
      if (!preset) return;
      if (preset.type === "single-hsb") {
        this.baseColorHSB = preset.color.slice();
      } else if (preset.type === "triple") {
        // Convert outer[0] RGB to HSB for player tint
        const rgb = preset.colors.outer && preset.colors.outer[0] ? preset.colors.outer[0] : [200,200,200];
        colorMode(RGB, 255);
        const tmp = color(rgb[0], rgb[1], rgb[2]);
        colorMode(HSB, 360, 100, 100);
        this.baseColorHSB = [hue(tmp), saturation(tmp), brightness(tmp)];
        colorMode(RGB, 255);
      }
    };
  }

  /**
   * Draws the music player UI and all controls.
   */
  draw() {
    if (!this.visible) return;
    push();
    const playerY = height - this.height - 20;
    const playerX = (width - this.width) / 2;

    // Player background with color tint and shadow
    const rgb = this.hsbToRgb(this.baseColorHSB);
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, 0.32)`;

    fill(255, 30);
    stroke(200, 80);
    strokeWeight(1);
    rect(playerX, playerY, this.width, this.height, this.cornerRadius);
    drawingContext.shadowBlur = 0;

    // Draw player components
    this.drawProgressBar(playerX, playerY);
    this.drawTrackInfo(playerX, playerY);
    this.drawControls(playerX, playerY);
    this.drawVolumeControl(playerX, playerY);
    this.drawEQIcon(playerX, playerY);
    if (this.eqOpen) {
      this.drawEQPanel(playerX, playerY);
    }
    pop();
  }

  /**
   * Draws the EQ icon button.
   */
  drawEQIcon(playerX, playerY) {
    const x = playerX + this.width - 130;
    const y = playerY + this.height - 60;
    const r = 14;
    const hovered = dist(mouseX, mouseY, x, y) < r;
    push();
    translate(x, y);
    scale(hovered ? 1.15 : 1);
    const rgb = this.hsbToRgb(this.baseColorHSB);
    const alpha = hovered ? 0.9 : 0.7;
    fill(rgb[0], rgb[1], rgb[2], Math.round(alpha * 255));
    ellipse(0, 0, r * 2);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("🎛", 0, 1);
    pop();
  }

  /**
   * Draws the EQ panel with sliders for each band.
   */
  drawEQPanel(playerX, playerY) {
    const panelX = playerX + this.width - this.eqBands.length * 40 - 20;
    const panelY = playerY - 180;
    const w = this.eqBands.length * 40 + 20, h = 140;
    const rgb = this.hsbToRgb(this.baseColorHSB);
    fill(20, 240);
    stroke(rgb[0], rgb[1], rgb[2], 120);
    rect(panelX, panelY, w, h, 10);
    fill(255);
    textSize(12);
    textAlign(CENTER);
    text("Equalizer", panelX + w / 2, panelY + 16);

    this.sliderRects = [];
    const sliderLen = 80, trackW = 6;
    for (let i = 0; i < this.eqBands.length; i++) {
      const x = panelX + 20 + i * 40, y0 = panelY + 30;
      fill(200);
      textSize(10);
      text(this.eqBands[i] + "Hz", x + trackW / 2, panelY + h - 10);
      noFill();
      stroke(150);
      rect(x, y0, trackW, sliderLen, 3);
      noStroke();
      fill(rgb[0], rgb[1], rgb[2], 200);
      const gain = this.eqFilters[i].gain();
      const norm = constrain((gain + 12) / 24, 0, 1);
      const hy = y0 + sliderLen - norm * sliderLen;
      ellipse(x + trackW / 2, hy, 12);
      const hitX = x - 4, hitW = trackW + 8;
      this.sliderRects.push({ x: hitX, y: y0, w: hitW, h: sliderLen, idx: i });
      noFill();
    }
  }

  /**
   * Draws the progress bar and current position.
   */
  drawProgressBar(playerX, playerY) {
    const barY = playerY + UI.BAR_MARGIN;
    const barHeight = UI.BAR_HEIGHT;
    const barWidth = this.width - 40;
    const barX = playerX + 20;

    fill(120, 120, 160, 80);
    noStroke();
    rect(barX, barY, barWidth, barHeight, 3);

    if (sound && sound.duration) {
      const progress = sound.currentTime() / sound.duration();
      const progressWidth = constrain(progress * barWidth, 0, barWidth);
      const rgb = this.hsbToRgb(this.baseColorHSB);
      fill(rgb[0], rgb[1], rgb[2], 220);
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, 0.55)`;
      rect(barX, barY, progressWidth, barHeight, 3);
      drawingContext.shadowBlur = 0;
      fill(255);
      ellipse(barX + progressWidth, barY + barHeight / 2, 10, 10);
    }
  }

  /**
   * Draws the track name and time info.
   */
  drawTrackInfo(playerX, playerY) {
    const infoY = playerY + 40;
    fill(255);
    textAlign(LEFT);
    textSize(18);
    textStyle(NORMAL);
    text(this.trackNames[currentTrackIndex], playerX + 30, infoY);

    if (sound && sound.duration) {
      const currentTime = this.formatTime(sound.currentTime());
      const duration = this.formatTime(sound.duration());
      fill(200);
      textAlign(RIGHT);
      textSize(14);
      text(`${currentTime} / ${duration}`, playerX + this.width - 30, infoY);
    }
  }

  /**
   * Draws the play/pause/next/prev buttons.
   */
  drawControls(playerX, playerY) {
    const centerY = playerY + this.height / 2 + 5;
    const centerX = playerX + this.width / 2;
    const spacing = 44;

    this.buttons = [
      new IconButton(
        centerX - spacing,
        centerY,
        36,
        "prev",
        this.prevTrack.bind(this)
      ),
      new IconButton(
        centerX,
        centerY,
        36,
        (typeof sound !== "undefined" && sound && sound.isPlaying()) ? "pause" : "play",
        this.togglePlay.bind(this)
      ),
      new IconButton(
        centerX + spacing,
        centerY,
        36,
        "next",
        this.nextTrack.bind(this)
      ),
    ];
    this.buttons.forEach((btn) => btn.draw());
  }

  /**
   * Toggles play/pause state.
   */
  togglePlay() {
    if (typeof sound !== "undefined" && sound) {
      if (sound.isPlaying()) {
        sound.pause();
      } else {
        sound.loop();
      }
    }
  }

  /**
   * Toggles play/pause state (used for keyboard shortcut).
   */
  togglePlayPause() {
    if (typeof sound !== "undefined" && sound) {
      if (sound.isPlaying()) {
        sound.pause();
      } else {
        sound.loop();
      }
    }
  }

  /**
   * Formats seconds as mm:ss.
   */
  formatTime(seconds) {
    const mins = floor(seconds / 60);
    const secs = floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  /**
   * Draws the volume slider and icon.
   */
  drawVolumeControl(playerX, playerY) {
    const x = playerX + this.width - 100;
    const y = playerY + this.height - 30;
    const barWidth = 80;
    const barHeight = 6;
    const handleX = x + this.volume * barWidth;

    // Draw volume icon
    noStroke();
    fill(220);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("🔊", x - 15, y + barHeight / 2);

    // Slider background
    fill(100, 100, 150, 100);
    rect(x, y, barWidth, barHeight, 3);

    // Slider fill uses base color
    const rgb = this.hsbToRgb(this.baseColorHSB);
    fill(rgb[0], rgb[1], rgb[2]);
    rect(x, y, this.volume * barWidth, barHeight, 3);

    // Handle knob
    fill(255);
    ellipse(handleX, y + barHeight / 2, 10, 10);
  }

  /**
   * Updates the volume based on mouse position.
   */
  updateVolume(x, barX) {
    const sliderWidth = 80;
    const percent = constrain((x - barX) / sliderWidth, 0, 1);
    this.volume = percent;
    sound.setVolume(this.volume);
  }

  /**
   * Handles mouse press events for player controls.
   * Returns true if the click was handled.
   */
  mousePressed() {
    if (!this.visible) return false;

    const playerY = height - this.height - 20;
    const playerX = (width - this.width) / 2;
    // Ignore clicks outside player area
    if (
      mouseX < playerX ||
      mouseX > playerX + this.width ||
      mouseY < playerY ||
      mouseY > playerY + this.height
    )
      return false;

    // Progress bar drag
    const barY = playerY + UI.BAR_MARGIN;
    if (mouseY > barY - 10 && mouseY < barY + 14) {
      this.isDragging = true;
      this.updateProgress(playerX);
      return true;
    }

    // Volume slider drag
    const volX = playerX + this.width - 100;
    const volY = playerY + this.height - 30;
    if (
      mouseY > volY - 10 &&
      mouseY < volY + 10 &&
      mouseX > volX &&
      mouseX < volX + 80
    ) {
      this.volumeDragging = true;
      this.updateVolume(mouseX, volX);
      return true;
    }

    // EQ icon click
    const eqX = playerX + this.width - 130;
    const eqY = playerY + this.height - 60;
    if (dist(mouseX, mouseY, eqX, eqY) < 14) {
      this.eqOpen = !this.eqOpen;
      return true;
    }
    // EQ slider press
    if (this.eqOpen && this.sliderRects) {
      for (let s of this.sliderRects) {
        if (
          mouseX > s.x &&
          mouseX < s.x + s.w &&
          mouseY > s.y &&
          mouseY < s.y + s.h
        ) {
          this.draggedEQ = s.idx;
          return true;
        }
      }
    }
    // Button clicks (play, pause, next, prev)
    for (const btn of this.buttons) {
      if (btn.isHovered()) {
        btn.callback();
        return true;
      }
    }
    return false;
  }

  /**
   * Handles mouse drag events for sliders and progress bar.
   * Returns true if a drag was handled.
   */
  mouseDragged() {
    // EQ slider drag
    if (this.eqOpen && this.draggedEQ == null && this.sliderRects) {
      for (let s of this.sliderRects) {
        if (
          mouseX > s.x && mouseX < s.x + s.w &&
          mouseY > s.y && mouseY < s.y + s.h
        ) {
          this.draggedEQ = s.idx;
          break;
        }
      }
    }

    if (!this.visible) return false;
    // Drag EQ slider
    if (this.draggedEQ != null) {
      const i = this.draggedEQ;
      const s = this.sliderRects[i];
      if (!s) return false;
      const rel = constrain((s.y + s.h - mouseY) / s.h, 0, 1);
      const gain = rel * 24 - 12;
      this.eqFilters[i].gain(gain);
      return true;
    }
    // Drag volume slider
    if (this.volumeDragging) {
      const volX = (width - this.width) / 2 + this.width - 100;
      this.updateVolume(mouseX, volX);
      return true;
    }
    // Drag progress bar
    if (this.isDragging) {
      const playerX = (width - this.width) / 2;
      this.updateProgress(playerX);
      return true;
    }
    return false;
  }

  /**
   * Handles mouse release events (stop dragging).
   */
  mouseReleased() {
    this.draggedEQ = null;
    this.isDragging = false;
    this.volumeDragging = false;
  }

  /**
   * Updates the song progress based on mouse position.
   */
  updateProgress(playerX) {
    const barX = playerX + 20;
    const barWidth = this.width - 40;
    const progress = constrain((mouseX - barX) / barWidth, 0, 1);
    const newTime = progress * sound.duration();
    sound.jump(newTime);
  }

  /**
   * Go to next track and start playing.
   */
  nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % sounds.length;
    this.switchTrack();
  }

  /**
   * Go to previous track and start playing.
   */
  prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + sounds.length) % sounds.length;
    this.switchTrack();
  }

  /**
   * Switches to the current track index and starts playing.
   * Ensures EQ filter chain is connected for the new sound.
   */
  switchTrack() {
    if (typeof sound !== "undefined" && sound) {
      sound.stop();
      sound.disconnect();
      let node = sound;
      this.eqFilters.forEach((f) => {
        f.process(node);
        node = f;
      });
      node.connect();
      sound = sounds[currentTrackIndex];
      if (sound) sound.loop();
    } else {
      sound = sounds[currentTrackIndex];
      if (sound) {
        sound.disconnect();
        let node = sound;
        this.eqFilters.forEach((f) => {
          f.process(node);
          node = f;
        });
        node.connect();
        sound.loop();
      }
    }
  }

  /**
   * Updates player size on window resize.
   */
  onResize() {
    this.width = min(UI.MAX_WIDTH, width * 0.9);
    this.height = UI.PLAYER_HEIGHT;
  }
}

/**
 * IconButton
 * UI button for player controls (play, pause, next, prev).
 */
class IconButton {
  constructor(x, y, size, type, callback) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.callback = callback;
  }

  /**
   * Draws the button with icon.
   */
  draw() {
    const hover = this.isHovered();
    push();
    translate(this.x, this.y);
    scale(hover ? 1.1 : 1);
    fill(100, 150, 255, hover ? 220 : 180);
    noStroke();
    ellipse(0, 0, this.size, this.size);

    fill(255);
    noStroke();
    switch (this.type) {
      case "play":
        triangle(-6, -8, -6, 8, 8, 0);
        break;
      case "pause":
        rect(-6, -8, 4, 16, 2);
        rect(2, -8, 4, 16, 2);
        break;
      case "prev":
        triangle(-3, 0, 7, -8, 7, 8);
        rect(-7, -8, 3, 16, 2);
        break;
      case "next":
        triangle(3, 0, -7, -8, -7, 8);
        rect(4, -8, 3, 16, 2);
        break;
    }
    pop();
  }

  /**
   * Checks if mouse is over the button.
   */
  isHovered() {
    return dist(mouseX, mouseY, this.x, this.y) < this.size / 2;
  }
}

// UI constants for player layout
const UI = {
  PLAYER_HEIGHT: 100,
  MAX_WIDTH: 700,
  CORNER_RADIUS: 20,
  BAR_MARGIN: 15,
  BAR_HEIGHT: 6,
};
