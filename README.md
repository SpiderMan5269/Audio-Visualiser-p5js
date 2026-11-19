# Audio Visualiser (p5.js)

**Live demo:** https://spiderman5269.github.io/Audio-Visualiser-p5js/

An interactive, real-time audio visualiser built with **p5.js** and **p5.sound**, with ten audio-reactive visual modes, a three-band EQ, colour presets and a 3D gyroscope extension. Built for CM1010 Introduction to Programming II (BSc Computer Science, University of London, academic direction by Goldsmiths).

## Features

- **Ten audio-reactive modes:** horizontal spectrum, wave pattern, needles, circular waveform, quantum orbits, radial spectrum, ridge plot, vertical spectrum, singular orbit, and a 3D gyroscope (WEBGL)
- **Real-time EQ:** bass, mid and treble controlled with draggable sliders
- **Colour presets** shared across every visual and the music player, with persistence
- **On-screen menus** for switching visuals and tracks, plus keyboard shortcuts
- **Lazy loading** of visualisers and tracks for a fast start
- Responsive canvas that adapts to the window size

## Controls

| Key | Action |
|---|---|
| `M` | Open / close the main menu |
| `T` | Track selection |
| `C` | Colour presets |
| `Space` | Play / pause |

## Running it

Serve the folder with any static web server (for example VS Code Live Server) and open `index.html` in a modern browser. Opening the file directly from disk may block audio loading.

## Audio

Two royalty-free tracks are included in `assets/`. To use your own music, add MP3 files to `assets/` and list them in `audioTrackPaths` at the top of `sketch.js`.

## Code structure

- `sketch.js`: setup, draw loop and lazy loading
- `visualisations.js`: visualisation manager
- one file per visual mode (`spectrum.js`, `needles.js`, `ridgePlot.js`, `gyroscope.js` and so on)
- `controlsAndInput.js`: menus and input handling
- `musicPlayer.js`: playback, EQ, volume and track switching
- `colorPresets.js`, `colorPersistence.js`: colour presets and syncing

## About

Built by Akshit Sankhala. Inspired by creative-coding demos from OpenProcessing and the p5.js community. Shared here as a portfolio piece; please do not submit it as your own coursework.
