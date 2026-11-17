/**
 * WavePattern Visualiser
 * Displays the audio waveform as a smooth line that pulses with amplitude.
 * Uses HSB color mode and creates a glow effect with shadows.
 */
class WavePattern {
  constructor() {
    this.name = "WavePattern";        // Visualiser name for menu selection
    this.is3D = false;                // 2D visualiser
    this.blur = 8;                    // Shadow blur for glow effect
    this.smooth = 0.05;               // Smoothing factor for amplitude pulse animation
    this.prevAmp = 1;                 // Previous amplitude value for smooth interpolation

    // Default wave color in HSB format (Blurple fallback)
    this.waveColor = [230, 48, 85];

    /**
     * Sets colors from a color preset object.
     * Supports triple gradients and single HSB color presets.
     */
    this.setColorsFromPreset = function(preset) {
      if (!preset) return;
      if (preset.type === "single-hsb") {
        // Use HSB color directly for single-hsb presets
        this.waveColor = preset.color.slice();
      } else if (preset.type === "triple") {
        // Convert RGB from outer gradient to HSB for triple presets
        const rgb = preset.colors.outer[0];
        colorMode(RGB, 255);
        const tmp = color(rgb[0], rgb[1], rgb[2]);
        colorMode(HSB, 360, 100, 100);
        this.waveColor = [hue(tmp), saturation(tmp), brightness(tmp)];
        colorMode(RGB, 255);
      }
    };
  }

  /**
   * Main draw method for the WavePattern visualiser.
   * Renders the audio waveform as a smooth line with amplitude-based pulsing.
   */
  draw() {
    push();
    colorMode(HSB, 360, 100, 100);
    // Set shadow properties for glow effect
    drawingContext.shadowBlur = this.blur;
    // Create shadow color from HSB waveColor
    const shadowCol = color(this.waveColor[0], this.waveColor[1], this.waveColor[2], 50);
    drawingContext.shadowColor = shadowCol;

    const wave = fourier.waveform(); // Get current audio waveform
    // Faint background for trailing effect
    background(0, 0, 0, 15);

    // Calculate amplitude pulse based on average waveform amplitude
    const ampAvg = wave.reduce((s, v) => s + abs(v), 0) / wave.length;
    const target = map(ampAvg, 0, 1, 1, 1.05);
    this.prevAmp = lerp(this.prevAmp, target, this.smooth);

    noFill();
    strokeWeight(3);
    // Set stroke color using preset HSB values
    stroke(this.waveColor[0], this.waveColor[1], this.waveColor[2], 80);

    // Draw the waveform as a smooth line across the canvas
    beginShape();
    for (let i = 0; i < wave.length; i++) {
      const x = map(i, 0, wave.length, 0, width); // X position
      const y0 = map(wave[i], -1, 1, height * 0.25, height * 0.75); // Raw Y position
      // Y position modulated by amplitude pulse
      const y = (y0 - height / 2) * this.prevAmp + height / 2;
      vertex(x, y);
    }
    endShape();
    pop();
  }
}

window.WavePattern = WavePattern;