/**
 * VerticalSpectrum Visualiser
 * Displays a frequency spectrum as vertical bars that extend from the center outward.
 * Creates a symmetrical visualization with bars on both left and right sides.
 * Uses HSB color mode and responds to bass frequencies with a pulsing effect.
 */
class VerticalSpectrum {
  constructor() {
    this.name = "VerticalSpectrum";   // Visualiser name for menu selection
    this.is3D = false;                // 2D visualiser
    this.maxBars = 120;               // Maximum number of bars (total, split left/right)
    this.blur = 6;                    // Shadow blur for glow effect
    this.bassRange = 20;              // Number of frequency bins to use for bass pulse
    this.smooth = 0.1;                // Smoothing factor for bass pulse animation
    this.prevPulse = 1;               // Previous pulse value for smooth interpolation

    // Default base color in HSB format (Blurple fallback)
    this.baseColor = [230, 48, 85];

    /**
     * Sets colors from a color preset object.
     * Supports triple gradients and single HSB color presets.
     */
    this.setColorsFromPreset = function(preset) {
      if (!preset) return;
      if (preset.type === "single-hsb") {
        // Use HSB color directly for single-hsb presets
        this.baseColor = preset.color.slice();
      } else if (preset.type === "triple") {
        // Convert RGB from outer gradient to HSB for triple presets
        const rgb = preset.colors.outer[0];
        colorMode(RGB, 255);
        const tmp = color(rgb[0], rgb[1], rgb[2]);
        colorMode(HSB, 360, 100, 100);
        this.baseColor = [hue(tmp), saturation(tmp), brightness(tmp)];
        colorMode(RGB, 255);
      }
    };
  }

  /**
   * Main draw method for the VerticalSpectrum visualiser.
   * Renders symmetrical vertical bars representing frequency amplitudes with bass pulse effect.
   */
  draw() {
    push();
    colorMode(HSB, 360, 100, 100);
    const spectrum = fourier.analyze();
    // Semi-transparent background using preset color for trailing effect
    background(this.baseColor[0], this.baseColor[1], this.baseColor[2], 8);

    // Calculate bass pulse effect based on low frequencies
    const bassValues = spectrum.slice(0, this.bassRange);
    const bassAvg = bassValues.reduce((s, v) => s + v, 0) / bassValues.length;
    const target = map(bassAvg, 0, 255, 1, 1.12);
    this.prevPulse = lerp(this.prevPulse, target, this.smooth);

    const halfBars = floor(this.maxBars / 2); // Number of bars per side
    const step = max(1, floor(spectrum.length / halfBars)); // Step size for sampling spectrum

    // Set shadow and stroke properties for bar glow effect
    drawingContext.shadowBlur = this.blur;
    drawingContext.shadowColor = color(this.baseColor[0], this.baseColor[1], this.baseColor[2], 50);
    strokeCap(ROUND);
    strokeWeight(6);

    const centerX = width / 2;
    const centerY = height / 2;
    // Draw symmetrical vertical bars on both sides of center
    for (let i = 0; i < halfBars; i++) {
      const idx = i * step;
      const amp = spectrum[idx]; // Amplitude for this frequency bin
      // Bar length modulated by bass pulse
      const len = map(amp, 0, 255, 0, height * 0.45) * this.prevPulse;
      // Horizontal offset from center
      const offset = map(i, 0, halfBars - 1, 0, width / 2);
      // Alpha value based on amplitude
      const alphaVal = map(amp, 0, 255, 20, 90);

      // Set stroke color using preset HSB values
      stroke(this.baseColor[0], this.baseColor[1], this.baseColor[2], alphaVal);

      // Draw right-side vertical bar
      line(centerX + offset, centerY - len / 2, centerX + offset, centerY + len / 2);
      // Draw mirrored left-side vertical bar
      line(centerX - offset, centerY - len / 2, centerX - offset, centerY + len / 2);
    }
    pop();
  }
}

window.VerticalSpectrum = VerticalSpectrum;