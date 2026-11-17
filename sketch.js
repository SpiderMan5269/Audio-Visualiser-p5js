// Main sketch file for the audio visualiser project.
// Handles global setup, drawing loop, lazy loading of visuals, audio tracks, and UI event delegation.

// Global variables for controls, visualisations, music player, FFT, and sounds
let controls;
let vis;
let musicPlayer;
let fourier;
let sounds = [];
let sound;
let currentTrackIndex = 0;
let transitionAlpha = 0;
let gfx3D;
let currentIs3D = false;

// Audio track paths (for lazy loading)
const audioTrackPaths = [
  "assets/stomper_reggae_bit.mp3",
  "assets/lost-in-dreams-abstract-chill-downtempo-cinematic-future-beats-270241.mp3",
];

// Mapping of visualiser names to their script files for lazy loading
const LAZY_VISUALS = {
  Spectrum: "spectrum.js",
  WavePattern: "wavepattern.js",
  Needles: "needles.js",
  RadialSpectrum: "radialSpectrum.js",
  RidgePlot: "ridgePlot.js",
  VerticalSpectrum: "verticalSpectrum.js",
  SingularOrbit: "singularOrbit.js",
  Gyroscope: "gyroscope.js",
};

// Preload only the first audio file for fast startup
function preload() {
  sounds = [loadSound(audioTrackPaths[0])];
}

// Setup runs once at the start of the sketch
function setup() {
  createCanvas(windowWidth, windowHeight);
  gfx3D = createGraphics(windowWidth, windowHeight, WEBGL);

  background(0);

  // Set initial sound to the first track
  sound = sounds[currentTrackIndex];

  // Initialize FFT analyzer, controls, and music player
  fourier = new p5.FFT();
  controls = new ControlsAndInput();
  musicPlayer = new MusicPlayer();

  // Initialize the visualisations manager
  vis = new Visualisations();

  // Load default visual on startup
  selectVisualByName("Spectrum"); // loads spectrum.js then selects it

  // Lazy load remaining audio tracks after setup
  for (let i = 1; i < audioTrackPaths.length; i++) {
    loadSound(audioTrackPaths[i], (snd) => (sounds[i] = snd), (err) =>
      console.error("Audio load failed:", err)
    );
  }

  // Initialize color preset persistence and syncing
  initColorPersistence(vis);
  initColorSync(vis);
}

// Main draw loop: runs every frame
function draw() {
  background(0);
  fourier.analyze();

  // Draw the selected visualisation (2D or 3D)
  if (vis && vis.selectedVisual) {
    if (vis.selectedVisual.is3D && gfx3D) {
      gfx3D.clear();
      gfx3D.push();
      gfx3D.colorMode(RGB, 255);
      vis.selectedVisual.draw(gfx3D);
      gfx3D.pop();
      image(gfx3D, 0, 0, width, height);
    } else {
      push();
      colorMode(RGB, 255);
      vis.selectedVisual.draw();
      pop();
    }
  }

  // Draw UI controls and music player
  controls.draw();
  if (musicPlayer && musicPlayer.visible) musicPlayer.draw();
}

// Returns the list of available visualiser names for menus
function getAvailableVisualNames() {
  return Object.keys(LAZY_VISUALS);
}

// Dynamic script loader for lazy loading visualisers
function loadVisualScript(name, url) {
  return new Promise((resolve, reject) => {
    // Already loaded? Detect by data attribute or global constructor
    if (document.querySelector('script[data-visual="' + name + '"]'))
      return resolve();

    const s = document.createElement("script");
    s.src = url;
    s.defer = true;
    s.async = false; // Preserve order if multiple loads needed
    s.setAttribute("data-visual", name);
    s.onload = () => {
      // Small timeout to allow visual script to register with vis
      setTimeout(() => resolve(), 10);
    };
    s.onerror = (e) =>
      reject(new Error("Failed to load visual script: " + url));
    document.body.appendChild(s);
  });
}

// Selects a visualiser by name, loading its script if needed
async function selectVisualByName(name) {
  if (!name) return null;
  // If the visual is already present in vis.visuals, just select it
  if (vis && Array.isArray(vis.visuals)) {
    const existing = vis.visuals.find((v) => v && v.name === name);
    if (existing) {
      if (typeof vis.selectVisual === "function") vis.selectVisual(name);
      return existing;
    }
  }

  // If this visual is in LAZY_VISUALS, load its script
  if (LAZY_VISUALS[name]) {
    try {
      await loadVisualScript(name, LAZY_VISUALS[name]);
    } catch (e) {
      console.error(e);
      // Fallback: try selecting anyway if something registered itself
      if (vis && typeof vis.selectVisual === "function") vis.selectVisual(name);
      return null;
    }

    // After load, check again if visual registered itself with vis
    if (vis && Array.isArray(vis.visuals)) {
      const registered = vis.visuals.find((v) => v && v.name === name);
      if (registered) {
        if (typeof vis.selectVisual === "function") vis.selectVisual(name);
        return registered;
      }
    }

    // If the visual script only defines a constructor on window, try to instantiate it
    // Common constructor name patterns: window[name], window[name + 'Visualizer'], window[name + 'Visual']
    const ctorCandidates = [
      window[name],
      window[name + "Visualizer"],
      window[name + "Visual"],
      window[name.toLowerCase()],
      window[name.replace(/\s+/g, "")],
    ].filter(Boolean);

    if (ctorCandidates.length > 0) {
      try {
        const ctor = ctorCandidates[0];
        const instance = new ctor();
        if (!instance.name) instance.name = name;
        if (vis && typeof vis.add === "function") vis.add(instance);
        else if (vis && Array.isArray(vis.visuals)) vis.visuals.push(instance);
        if (typeof vis.selectVisual === "function") vis.selectVisual(name);
        return instance;
      } catch (e) {
        console.warn("Could not instantiate visual constructor for", name, e);
      }
    }

    // Nothing registered, but script loaded. Try select anyway
    if (vis && typeof vis.selectVisual === "function") vis.selectVisual(name);
    return null;
  } else {
    // Not in lazy list, assume it was bundled and call select directly
    if (vis && typeof vis.selectVisual === "function") vis.selectVisual(name);
    return null;
  }
}

// Draws the selected visualisation, with clipping if player is open
function drawVisualisation() {
  if (!vis || !vis.selectedVisual) return;
  push();
  const safeHeight =
    height - (musicPlayer && musicPlayer.visible ? musicPlayer.height + 30 : 0);
  if (musicPlayer && musicPlayer.visible) {
    drawingContext.beginPath();
    drawingContext.rect(0, 0, width, safeHeight);
    drawingContext.clip();
  }
  vis.selectedVisual.draw();
  pop();
}

// Mouse and keyboard event handlers for UI and visuals
function mousePressed() {
  // Delegate to controls or music player
  const uiHandled = controls?.mousePressed() || musicPlayer?.mousePressed();
  if (
    !uiHandled &&
    vis.selectedVisual?.is3D &&
    vis.selectedVisual.mousePressed
  ) {
    vis.selectedVisual.mousePressed();
  }
  return uiHandled;
}

function mouseDragged() {
  if (musicPlayer) musicPlayer.mouseDragged();
}

function mouseReleased() {
  if (musicPlayer) musicPlayer.mouseReleased();
  if (vis && vis.selectedVisual && vis.selectedVisual.is3D) {
    vis.selectedVisual.mouseReleased();
  }
}

function keyPressed() {
  if (controls && !controls.keyPressed(keyCode) && vis && vis.visuals) {
    const visIndex = keyCode - 49;
    if (visIndex >= 0 && visIndex < vis.visuals.length) {
      const nextVisual = vis.visuals[visIndex];

      // Switch between WEBGL and 2D if needed
      if (nextVisual.is3D !== currentIs3D) {
        currentIs3D = nextVisual.is3D;
        const renderer = currentIs3D ? WEBGL : P2D;
        resizeCanvas(windowWidth, windowHeight, renderer);
      }

      transitionAlpha = 255;
      vis.selectVisual(nextVisual.name);
    }
  }
}

// Handles window resizing and updates canvas and visuals
function windowResized() {
  const renderer = currentIs3D ? WEBGL : P2D;
  resizeCanvas(windowWidth, windowHeight, renderer);
  if (vis && vis.selectedVisual && vis.selectedVisual.onResize) {
    vis.selectedVisual.onResize();
  }
}

// Responsive resizing for visualisation (called on load)
if (
  typeof vis !== "undefined" &&
  vis.selectedVisual &&
  typeof vis.selectedVisual.onResize === "function"
) {
  vis.selectedVisual.onResize();
}
