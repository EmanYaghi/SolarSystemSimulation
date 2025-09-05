# Solar System Simulation with Three.js

A sophisticated 3D simulation of our solar system implementing realistic physics with both simplified and n-body gravitational models, built with Three.js.

## 🌟 Features

- **Two Simulation Modes**:
  - **Sun-only Model**: Simplified model where only the sun's gravity affects planets (faster computation)
  - **N-body Model**: Full gravitational interactions between all celestial bodies (more physically accurate)

- **Realistic Physics**:
  - Newton's law of universal gravitation
  - Kepler's laws of planetary motion
  - Symplectic integration for energy conservation
  - Softening parameter to prevent numerical instability

- **Interactive Controls**:
  - Adjustable time scale (seconds to years per real second)
  - Modifiable sun mass with velocity recomputation option
  - Toggle celestial bodies on/off in simulations
  - Control softening parameter and maximum substep size

- **Visual Features**:
  - High-quality textures for all planets and the sun
  - Realistic orbital paths
  - Eclipse simulations (solar and lunar)
  - Planetary rotation and orbital mechanics
  - Dynamic lighting system

- **Monitoring Dashboard**:
  - Real-time orbital parameters (distance, speed, angle)
  - Energy and momentum conservation metrics
  - Kepler's second law verification
  - System statistics display

## 🚀 Special Cases Demonstrated

### 1. Changing Solar Mass and Its Effects
The simulation allows dynamically modifying the sun's mass and observing how it affects:
- Orbital velocities of planets (with optional recomputation)
- System energy conservation
- Solar lighting intensity and visual size
- Overall system stability

### 2. Planetary Removal and Long-term Effects
Users can exclude planets from the simulation to observe:
- Gravitational perturbations on other bodies
- Changes in system center of mass
- Long-term orbital stability implications
- Modifications to the system's angular momentum

### 3. Eclipse Phenomena and Shadows
The simulation accurately models:
- **Solar eclipses**: When the moon passes between Earth and the sun
- **Lunar eclipses**: When Earth casts its shadow on the moon
- **Umbra and penumbra effects** with realistic visual representation
- Dynamic shadow calculations based on celestial positions

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/solar-system-simulation.git
```

2. Install dependencies:
```bash
cd solar-system-simulation
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

## 📁 Project Structure

```
src/
├── App.js                 # Main application controller
├── PhysicsEngine.js       # Core physics simulation logic
├── Body.js               # Celestial body class definition
├── SceneManager.js       # 3D scene management
├── AssetLoader.js        # Texture and resource loading
├── SunManager.js         # Sun-specific visual properties
├── OrbitLine.js          # Orbital path visualization
├── GUIManager.js         # User interface controls
├── DashboardUI.js        # Statistics and monitoring panel
├── EclipseManager.js     # Eclipse detection and visualization
├── constants.js          # Physical constants and planetary data
└── utils.js              # Helper functions
```

## 🎮 Usage

1. **Select Simulation Mode**: Toggle between Sun-only and N-body modes using the GUI
2. **Adjust Parameters**: Modify time scale, softening parameter, and other physical constants
3. **Observe Celestial Events**: Watch for eclipses and other astronomical phenomena
4. **Monitor Physics**: Use the dashboard to track energy conservation and orbital parameters
5. **Experiment**: Remove planets or change the sun's mass to observe system dynamics

## 🔬 Educational Value

This simulation serves as an excellent educational tool for understanding:
- Gravitational physics and orbital mechanics
- Numerical integration methods
- Energy and momentum conservation principles
- Solar system dynamics
- N-body problem complexities

## 📚 References

- Murray, C. D., & Dermott, S. F. (1999). Solar System Dynamics. Cambridge University Press.
- Press, W. H., et al. (2007). Numerical Recipes: The Art of Scientific Computing.
- Barnes, J., & Hut, P. (1986). A Hierarchical O(N log N) Force-Calculation Algorithm. Nature.
- Three.js Documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For questions or contributions, please open an issue or submit a pull request on GitHub.
