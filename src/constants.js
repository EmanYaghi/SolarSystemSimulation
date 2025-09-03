export const G = 6.674e-11;       // m^3 kg^-1 s^-2
export const M_SUN = 1.989e30;    // kg (reference)
export const SunState = { mass: M_SUN };

export const SPIN_MULTIPLIER = 45;

export const specialDistances = [150, 200, 260, 340, 410, 540, 670, 800, 1110];

export const planetData = [
    { name: 'mercury', texture: '/public/mercury.jpg', scale: (4879 / 1392000) * 60 * 7, realdistance: 57910000, mass: 3.3011e23, e: 0.2056 },
    { name: 'venus', texture: '/public/venus.jpg', scale: (12104 / 1392000) * 60 * 7, realdistance: 108200000, mass: 4.8675e24, e: 0.0068 },
    { name: 'earth', texture: '/public/earth.jpg', scale: (12742 / 1392000) * 60 * 7, realdistance: 149600000, mass: 5.972e24, e: 0.0167 },
    { name: 'mars', texture: '/public/mars.jpg', scale: (6779 / 1392000) * 60 * 7, realdistance: 227900000, mass: 6.4171e23, e: 0.0934 },
    { name: 'jupiter', texture: '/public/jupiter.jpg', scale: (139820 / 1392000) * 60 * 7 / 2, realdistance: 778500000, mass: 1.898e27, e: 0.0489 },
    { name: 'saturn', texture: '/public/saturn.jpg', scale: (116460 / 1392000) * 60 * 7 / 2, realdistance: 1429400000, mass: 5.683e26, e: 0.0565, hasRings: true, ringTexture: '/public/saturn_ring_alpha.jpg', innerRadius: 1.3, outerRadius: 2 }, { name: 'uranus', texture: '/public/uranus.jpg', scale: (50724 / 1392000) * 60 * 7 / 2, realdistance: 2870990000, mass: 8.681e25, e: 0.0457 },
    { name: 'neptune', texture: '/public/neptune.jpg', scale: (49244 / 1392000) * 60 * 7 / 2, realdistance: 4498250000, mass: 1.024e26, e: 0.0113 }
];
export const moonData = {
    name: 'moon', texture: '/public/moon.jpg', scale: (3474 / 1392000) * 60 * 3.5, realdistance: 384400000, mass: 7.342e22, e: 0.0549,
};