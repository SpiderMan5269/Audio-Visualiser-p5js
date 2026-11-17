/**
 * SingularOrbit Visualiser
 * Displays orbiting particles around a central orb, with color and animation based on audio energy.
 * Particle colors and connecting lines respond to color presets and audio bands.
 */
class SingularOrbit {
  constructor() {
    this.name = "SingularOrbit";      // Visualiser name for menu selection
    this.is3D = false;                // 2D visualiser
    this.max = 60;                    // Number of orbiting particles
    this.orbitR = min(width, height) * 0.25; // Orbit radius
    this.initParticles();             // Initialize particle array

    // Default particle color fallback (RGB)
    this.defaultParticleColor = color(100, 180, 220);

    /**
     * Sets colors from a color preset object.
     * Supports triple gradients and single HSB color presets.
     */
    this.setColorsFromPreset = function(preset) {
      if (!this.particles) return;
      if (!preset) return;

      if (preset.type === "triple") {
        // Assign random color from each band to particles
        const choices = [
          preset.colors.outer[0],
          preset.colors.mid[0],
          preset.colors.inner[0]
        ];
        for (let p of this.particles) {
          const rgb = random(choices);
          p.c = color(rgb[0], rgb[1], rgb[2]);
        }
      } else if (preset.type === "single-hsb") {
        // Convert HSB to RGB and assign to all particles
        colorMode(HSB, 360, 100, 100);
        const h = preset.color[0], s = preset.color[1], b = preset.color[2];
        const colHSB = color(h, s, b);
        colorMode(RGB, 255);
        const rgbCol = color(red(colHSB), green(colHSB), blue(colHSB));
        for (let p of this.particles) {
          p.c = rgbCol;
        }
      }
    };
  }

  /**
   * Initializes all particles with random properties.
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.max; i++) {
      this.particles.push({
        a: random(TWO_PI), // Angle
        s: random(2, 5),   // Size
        c: color(random(100, 200), random(150, 250), random(200, 255)), // Color
        sp: random(0.01, 0.03), // Speed
        t: [],             // Trail positions
        mt: 10 + (i % 5)   // Max trail length
      });
    }
  }

  /**
   * Recalculates orbit radius and re-initializes particles on resize.
   */
  onResize() {
    this.orbitR = min(width, height) * 0.25;
    this.initParticles();
  }

  /**
   * Main draw method for the SingularOrbit visualiser.
   * Renders central orb, orbiting particles, trails, and connecting lines.
   */
  draw() {
    push();
    blendMode(ADD);
    translate(width / 2, height / 2); // Center the orbit

    background(0, 20); // Slightly transparent background for trailing effect

    // Get energy values for color and animation
    const b = fourier.getEnergy("bass"),
      m = fourier.getEnergy("mid"),
      t2 = fourier.getEnergy("treble");
    const orbSize = 40 + b / 10; // Central orb size based on bass

    // Get color preset for center orb and trail
    const preset = getCurrentColorPreset();
    let centerColor, trailColor;
    if (preset.type === "triple") {
      centerColor = color(...preset.colors.inner[0]);
      trailColor = color(...preset.colors.outer[0]);
    } else if (preset.type === "single-hsb") {
      colorMode(HSB, 360, 100, 100);
      centerColor = color(preset.color[0], preset.color[1], preset.color[2]);
      trailColor = centerColor;
      colorMode(RGB, 255);
    } else {
      centerColor = color(100, 180, 220);
      trailColor = color(100, 180, 220);
    }

    // Draw central orb as a ripple effect
    noStroke();
    for (let i = 0; i < 6; i++) {
      let rippleAlpha = map(i, 0, 5, 60, 10);
      let rippleSize = orbSize + i * 30 + sin(frameCount * 0.07 + i) * 8;
      fill(red(centerColor), green(centerColor), blue(centerColor), rippleAlpha);
      ellipse(0, 0, rippleSize);
    }
    // Main orb
    fill(centerColor);
    ellipse(0, 0, orbSize);

    // Draw each orbiting particle and its trail
    for (let p of this.particles) {
      p.a += p.sp + map(t2, 0, 255, 0, 0.03); // Update angle with speed and treble
      const modOrbitR = this.orbitR + map(b, 0, 255, -20, 40);
      const x = modOrbitR * cos(p.a),
        y = modOrbitR * sin(p.a);
      p.t.push({ x, y }); // Add to trail
      if (p.t.length > p.mt) p.t.shift(); // Limit trail length

      // Draw trail (thicker and colored from preset)
      noFill();
      for (let i = 1; i < p.t.length; i++) {
        let alpha = map(i, 0, p.t.length, 120, 30);
        stroke(red(trailColor), green(trailColor), blue(trailColor), alpha);
        strokeWeight(p.s * 1.2); // Increased thickness
        line(p.t[i - 1].x, p.t[i - 1].y, p.t[i].x, p.t[i].y);
      }
      // Draw particle (larger and more visible)
      noStroke();
      fill(trailColor);
      ellipse(x, y, p.s * 2.5 + m / 30 + t2 / 40); // Increased size
    }

    // Draw connecting lines between particles when bass is strong
    if (b > 170) {
      // Use color from colorPresets.js for connecting lines
      let connectColor;
      if (preset.type === "triple") {
        // Use mid color for connecting lines for contrast
        connectColor = color(...preset.colors.mid[0]);
      } else if (preset.type === "single-hsb") {
        colorMode(HSB, 360, 100, 100);
        connectColor = color(preset.color[0], preset.color[1], preset.color[2]);
        colorMode(RGB, 255);
      } else {
        connectColor = color(100, 200, 255);
      }
      stroke(red(connectColor), green(connectColor), blue(connectColor), map(b, 170, 255, 80, 180));
      strokeWeight(4); // Thicker and more visible
      const con = floor(map(b, 170, 255, 5, 20));
      for (let i = 0; i < con; i++) {
        const p1 = this.particles[i],
              p2 = this.particles[(i + 5) % this.particles.length];
        // Use the current position of the particles for the line endpoints
        line(
          p1.t[p1.t.length - 1].x,
          p1.t[p1.t.length - 1].y,
          p2.t[p2.t.length - 1].x,
          p2.t[p2.t.length - 1].y
        );
      }
    }
    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = color(100, 200, 255, 80);
    pop();
  }
}

// Register SingularOrbit class for lazy loading
window.SingularOrbit = SingularOrbit;