/**
 * RadialSpectrum Visualiser
 * Displays the audio spectrum as colored radial bars around a circle.
 * Bars are grouped into bass, mid, and treble sections, each with color presets.
 * The circle pulses in size based on bass energy for a dynamic effect.
 */
class RadialSpectrum {
  constructor() {
    this.name = "RadialSpectrum"; // Visualiser name for menu selection
    this.is3D = false;            // 2D visualiser
    this.maxBars = 120;           // Number of bars around the circle
    this.blur = 6;                // Shadow blur for glow effect
    this.bassRange = 20;          // Number of bins to use for bass pulse
    this.smooth = 0.1;            // Smoothing factor for bass pulse
    this.prevPulse = 1;           // Previous pulse value for smooth scaling

    // Default color (HSB) - fallback if no preset is applied
    this.baseColor = [230, 48, 85];

    /**
     * Sets colors from a color preset object.
     * Supports single HSB and triple gradient presets.
     */
    this.setColorsFromPreset = function(preset) {
      if (!preset) return;

      // Helper: Convert RGB array to HSB array using p5 color conversion
      const rgbToHsb = (rgb) => {
        colorMode(RGB, 255);
        const tmp = color(rgb[0], rgb[1], rgb[2]);
        colorMode(HSB, 360, 100, 100);
        const out = [hue(tmp), saturation(tmp), brightness(tmp)];
        colorMode(RGB, 255);
        return out;
      };

      if (preset.type === "single-hsb") {
        // Generate bass, mid, treble colors by shifting hue and tweaking saturation/brightness
        const h = preset.color[0];
        const s = preset.color[1];
        const b = preset.color[2];

        const bass   = [ (h - 10 + 360) % 360, Math.min(100, s + 8), Math.min(100, b + 6) ];
        const mid    = [ h, s, b ];
        const treble = [ (h + 10) % 360, Math.max(0, s - 6), Math.max(0, b - 6) ];

        this._overrideSections = [bass, mid, treble];
        this.baseColor = [h, s, b];

      } else if (preset.type === "triple") {
        // Use first color stop of each ring and convert to HSB
        const outerRGB = preset.colors.outer && preset.colors.outer[0] ? preset.colors.outer[0] : [200,200,200];
        const midRGB   = preset.colors.mid   && preset.colors.mid[0]   ? preset.colors.mid[0]   : outerRGB;
        const innerRGB = preset.colors.inner && preset.colors.inner[0] ? preset.colors.inner[0] : outerRGB;

        const outerHSB = rgbToHsb(outerRGB);
        const midHSB   = rgbToHsb(midRGB);
        const innerHSB = rgbToHsb(innerRGB);

        this._overrideSections = [outerHSB, midHSB, innerHSB];
        this.baseColor = midHSB.slice();
      }
    };
  }

  /**
   * Main draw method for the RadialSpectrum visualiser.
   * Renders spectrum bars in a circle, colored by section and preset.
   */
  draw() {
    push();
    colorMode(HSB, 360, 100, 100);
    const spectrum = fourier.analyze();

    // Use preset-derived color for faint background
    background(this.baseColor[0], this.baseColor[1], this.baseColor[2], 8);

    // Bass pulse: average the bass bins and use to scale the spectrum
    const bassValues = spectrum.slice(0, this.bassRange);
    const bassAvg = bassValues.reduce((s, v) => s + v, 0) / bassValues.length;
    const target = map(bassAvg, 0, 255, 1, 1.12);
    this.prevPulse = lerp(this.prevPulse, target, this.smooth);

    drawingContext.shadowBlur = this.blur;
    drawingContext.shadowColor = color(this.baseColor[0], this.baseColor[1], this.baseColor[2], 40);
    strokeCap(ROUND);

    // Geometry setup
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = min(width, height) * 0.45; // Outer radius
    const innerRadius = maxRadius * 0.25;        // Inner radius (hole size)
    strokeWeight(4);

    // Section definitions for bass, mid, treble
    const sections = [
      { name: "bass",   start: 0, end: 0.33, bins: [0, 20], color: [220, 80, 100] },
      { name: "mid",    start: 0.33, end: 0.66, bins: [21, 60], color: [120, 80, 100] },
      { name: "treble", start: 0.66, end: 1.0, bins: [61, spectrum.length-1], color: [0, 80, 100] }
    ];

    // Apply preset color overrides to sections if available
    if (this._overrideSections && Array.isArray(this._overrideSections)) {
      for (let i = 0; i < sections.length && i < this._overrideSections.length; i++) {
        const o = this._overrideSections[i];
        if (o && o.length === 3) sections[i].color = o.slice();
      }
    }

    // Draw each section's bars
    const bars = max(3, floor(this.maxBars));
    for (let s of sections) {
      const sectionBars = floor(bars * (s.end - s.start));
      for (let i = 0; i < sectionBars; i++) {
        // Calculate angle for each bar (counter-clockwise)
        const angle = -map(i, 0, sectionBars, s.start * TWO_PI, s.end * TWO_PI);
        const binIdx = floor(map(i, 0, sectionBars, s.bins[0], s.bins[1]));
        const amp = spectrum[binIdx];

        // Bar length (radial)
        const len = map(amp, 0, 255, 0, maxRadius - innerRadius) * this.prevPulse;

        // Alpha based on amplitude
        const alphaVal = map(amp, 0, 255, 25, 100);

        stroke(s.color[0], s.color[1], s.color[2], alphaVal);

        push();
        translate(centerX, centerY);
        rotate(angle);
        // Draw the bar from innerRadius outward
        line(innerRadius, 0, innerRadius + len, 0);
        pop();
      }
    }

    pop();
  }
}

// Register RadialSpectrum class for lazy loading
window.RadialSpectrum = RadialSpectrum;