{
"name": "threejs-solar-system",
"displayName": "3D Solar System — Interactive Simulation (Three.js)",
"version": "0.1.0",
"tagline": "Interactive 3D solar-system simulator with switchable physics, free/orbit camera, and realistic eclipse effects.",
"shortDescription": "A modular, interactive 3D solar-system simulator built with Three.js. Switchable physics (sun-only / n-body), free and orbit camera modes, and realistic eclipse visuals (including full lunar darkening).",
"longDescriptionMarkdown": "## Overview\n\nA modular, interactive 3D solar-system simulator built with Three.js. The project combines a compact physics engine (switchable sun-only / full n-body), a flexible rendering layer, two camera modes (Orbit + free/FPS-like), and robust eclipse detection/visuals — including full lunar darkening during total lunar eclipses. Designed for educational demos, research prototypes and interactive visualizations.\n\n---\n\n## Highlights\n\n- Accurate-ish physics with velocity-Verlet / leapfrog integrator and optional N-body pairwise forces.\n- Two physics modes:\n - sun-only — lightweight, Sun as dominant force (fast).\n - n-body — pairwise gravitational interactions (accurate, O(N²)).\n- Visual eclipse system:\n - Full Moon darkening (non-destructive material swap) during total lunar eclipse.\n - Shadow disk projected on Earth for solar eclipse.\n- Two camera modes: OrbitControls and Free (WASD + QE movement), toggled with F.\n- Clean modular code to add bodies, custom renderers, or more accurate integrators.\n",
"badges": [
{
"label": "status",
"value": "alpha",
"color": "blue"
},
{
"label": "license",
"value": "MIT",
"color": "blue"
}
],
"features": [
"Three.js based 3D rendering (Sun, planets, Moon)",
"Physics engine: switchable sun-only / n-body",
"Velocity-Verlet (leapfrog) integrator with sub-stepping",
"Eclipse detection: full lunar darkening + solar shadow disk",
"OrbitControls + Free FPS-like camera (toggle with F)",
"Modular architecture for easy extension"
],
"quickStart": {
"prerequisites": [
"Node.js v14+",
"npm or yarn"
],
"steps": [
"git clone https://github.com/EmanYaghi/SolarSystemSimulation
",
"cd SolarSystemSimulation",
"npm install",
"npm run dev"
],
"notes": "Default scripts assume Vite. Adjust if you use Webpack/Parcel."
},
"scripts": {
"dev": "vite",
"build": "vite build",
"preview": "vite preview"
},
"projectStructure": {
"root": [
"public/",
"src/",
"package.json",
"README.md",
".gitignore"
],
"src": {
"App.js": "Main app loop, orchestrates loader/physics/scene",
"SceneManager.js": "Renderer, camera, Orbit + Free controls",
"PhysicsEngine.js": "Physics: bodies[], computeAllAccelerations, step()",
"Body.js": "Body model (position_m, velocity_m, mass, mesh, flags)",
"AssetLoader.js": "Loads models/textures & attaches meshes to bodies",
"EclipseManager.js": "Eclipse detection + visuals (full moon darkening)",
"index.js": "Bootstraps App"
}
},
"configuration": {
"physics": {
"nBody": {
"type": "boolean",
"default": false,
"description": "Enable full pairwise N-body gravity."
},
"softening": {
"type": "number",
"default": 100000.0,
"description": "Distance softening (meters) to avoid singularities."
},
"maxSubstepSeconds": {
"type": "number",
"default": 60,
"description": "Maximum substep size for stable integration."
}
},
"visual": {
"metersPerUnit": {
"type": "number",
"default": 1e6,
"description": "Conversion factor from physics meters to scene units."
},
"moonMaterialDarken": {
"type": "boolean",
"default": true,
"description": "Use full material swap for lunar eclipse darkening."
},
"indicatorScale": {
"type": "number",
"default": 6,
"description": "Scale for on-screen indicator sprites."
}
}
},
"components": [
{
"name": "PhysicsEngine",
"description": "Manages bodies, computes accelerations (sun-only or n-body), runs integration sub-steps via velocity-Verlet. Key methods: addBody, computeAllAccelerations, removeCenterOfMassVelocity, computeSystemEnergyAndMomentum, step."
},
{
"name": "EclipseManager",
"description": "Detects eclipse geometry using mesh positions and projects visuals. On total lunar eclipse performs non-destructive material swap to fully darken the Moon; on solar eclipse draws a shadow disk on Earth."
},
{
"name": "SceneManager",
"description": "Sets up renderer, camera, OrbitControls and free camera behavior (WASD + QE, rotation keys), handles resize and rendering loop integration."
},
{
"name": "AssetLoader",
"description": "Loads 3D models and textures, attaches meshes to Body objects and prepares scene graph."
}
],
"apiExamples": {
"physicsStep": {
"description": "Advance physics by dt seconds with params.",
"example": "physics.step(3600, { nBody: true, softening: 1e5, maxSubstepSeconds: 60 })"
},
"toggleCameraMode": {
"description": "Toggle free camera vs orbit controls (key 'F' or call method).",
"example": "sceneManager.toggleFreeControls();"
}
},
"controls": {
"mouse": "Orbit: drag to rotate, scroll to zoom, middle-drag to pan",
"keyboard": {
"toggleFreeCamera": "F",
"freeCameraMovement": "W/A/S/D (move), Q/E (down/up)",
"freeCameraRotation": "Z/X/C/V (rotate)"
}
},
"contributing": {
"guidelines": [
"Fork the repository",
"Create a feature branch: git checkout -b feat/your-feature",
"Write focused commits and include tests where appropriate",
"Open a PR with description, screenshots and rationale"
],
"suggestedIssues": [
"Add Barnes–Hut optimization for large N",
"Implement penumbra shader for soft eclipse edges",
"Add GUI for runtime parameter tuning (lil-gui integration)"
]
},
"roadmap": [
{
"title": "Barnes–Hut tree",
"status": "planned",
"details": "Implement Barnes–Hut for O(N log N) gravity for large N."
},
{
"title": "Penumbra shader",
"status": "planned",
"details": "Add soft-shadow shader for realistic eclipse edges."
},
{
"title": "Runtime UI",
"status": "in-progress",
"details": "Expose physics & visual params via controller (lil-gui)."
},
{
"title": "Record/Export",
"status": "planned",
"details": "Add recording/export mode to capture demo clips."
}
],
"license": {
"name": "MIT",
"spdx": "MIT",
"file": "LICENSE",
"textShort": "MIT License — free to use, modify and distribute with attribution."
},
"maintainers": [
{
"name": "Eman Yaghi",
"email": "",
"role": "author/maintainer"
}
],
"repo": {
"url": "https://github.com/EmanYaghi/SolarSystemSimulation
",
"issues": "https://github.com/EmanYaghi/SolarSystemSimulation/issues
",
"demo": ""
},
"packageSuggestion": {
"name": "threejs-solar-system",
"version": "0.1.0",
"private": false,
"scripts": {
"dev": "vite",
"build": "vite build",
"preview": "vite preview"
},
"dependencies": {
"three": "^0.158.0",
"lil-gui": "^0.18.0"
},
"devDependencies": {
"vite": "^5.0.0"
},
"author": "Eman Yaghi"
},
"usageNotes": {
"performance": "Use sun-only mode for demo with many visual-only planets; use n-body for small N accurate results. Reuse Vector3 temps inside PhysicsEngine to reduce GC pressure.",
"accuracy": "Decrease maxSubstepSeconds and softening for higher accuracy (at CPU cost). Check computeSystemEnergyAndMomentum for conservation diagnostics."
},
"examplesAndSnippets": {
"removeCenterOfMassVelocity": "physics.removeCenterOfMassVelocity(); // centers velocity frame",
"darkenMoonDuringLunarEclipse": "// EclipseManager swaps Moon materials to an unlit black material when Earth is between Sun and Moon"
},
"metadata": {
"createdAt": "2025-08-25",
"locale": "en-US",
"keywords": [
"threejs",
"simulation",
"n-body",
"solar-system",
"eclipse",
"physics",
"visualization"
],
"authorDisplayName": "Eman Yaghi"
}
}
