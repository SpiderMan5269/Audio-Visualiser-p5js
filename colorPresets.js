// Color preset definitions for the audio visualiser UI and visuals

// List of available color presets (triple gradients and single HSB colors)
const COLOR_PRESETS = [
  // Triple gradient presets
  {
    name: "Deep Ocean",
    type: "triple",
    colors: {
      outer: [[50,150,170],[30,120,140]],
      mid:   [[14,165,164],[45,212,191]],
      inner: [[1,42,74],[0,109,119]]
    }
  },
  {
    name: "Solar Flare",
    type: "triple",
    colors: {
      outer: [[220,140,40],[200,110,20]],
      mid:   [[255,126,107],[255,184,107]],
      inner: [[255,207,51],[255,92,51]]
    }
  },
  {
    name: "Electric Orchid",
    type: "triple",
    colors: {
      outer: [[170,120,200],[150,90,180]],
      mid:   [[207,160,255],[164,92,255]],
      inner: [[122,30,255],[61,0,102]]
    }
  },
  {
    name: "Mint Twilight",
    type: "triple",
    colors: {
      outer: [[100,200,160],[70,170,130]],
      mid:   [[157,243,216],[83,201,166]],
      inner: [[15,122,102],[4,78,58]]
    }
  },
  {
    name: "Aurora Glow",
    type: "triple",
    colors: {
      outer: [[80,210,200],[50,190,190]],
      mid:   [[127,255,224],[51,230,255]],
      inner: [[0,119,204],[0,63,102]]
    }
  },
  {
    name: "Molten Chrome",
    type: "triple",
    colors: {
      outer: [[220,150,80],[200,120,60]],
      mid:   [[255,181,122],[255,138,59]],
      inner: [[122,59,0],[61,30,0]]
    }
  },
  {
    name: "Midnight Candy",
    type: "triple",
    colors: {
      outer: [[220,130,170],[190,90,140]],
      mid:   [[255,154,205],[255,111,168]],
      inner: [[138,31,87],[60,15,42]]
    }
  },
  {
    name: "Cosmic Blue",
    type: "triple",
    colors: {
      outer: [[90,140,220],[60,110,200]],
      mid:   [[127,179,255],[46,144,255]],
      inner: [[11,61,145],[4,24,54]]
    }
  },

  // Single color presets (HSB)
  {
    name: "Neon Green",
    type: "single-hsb",
    color: [120, 100, 85]
  },
  {
    name: "Hot Pink",
    type: "single-hsb",
    color: [330, 80, 100]
  },
  {
    name: "Golden Yellow",
    type: "single-hsb",
    color: [50, 90, 100]
  },
  {
    name: "Aqua Blue",
    type: "single-hsb",
    color: [180, 70, 95]
  },
  {
    name: "Fiery Red",
    type: "single-hsb",
    color: [0, 90, 95]
  },
  {
    name: "Soft Purple",
    type: "single-hsb",
    color: [270, 60, 90]
  }
];

// Currently selected color preset (null by default)
let currentColorPreset = null;

// Returns the currently selected color preset
function getCurrentColorPreset() {
  return currentColorPreset;
}

// Sets the color preset by name and returns it
function setColorPresetByName(name) {
  if (!name) return null;
  const found = COLOR_PRESETS.find(p => p && p.name === name);
  if (found) {
    currentColorPreset = found;
    return found;
  } else {
    console.warn("Color preset not found:", name);
    return null;
  }
}

// Expose presets and functions to window for UI and other modules
if (typeof window !== "undefined") {
  window.COLOR_PRESETS = COLOR_PRESETS;

  // Keep window.currentColorPreset in sync with internal variable
  Object.defineProperty(window, "currentColorPreset", {
    get() { return currentColorPreset; },
    set(v) { currentColorPreset = v; }
  });

  window.getCurrentColorPreset = getCurrentColorPreset;
  window.setColorPresetByName = setColorPresetByName;
}

// CommonJS export for Node.js environments
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { COLOR_PRESETS, getCurrentColorPreset, setColorPresetByName };
}