import * as THREE from 'three';

export default class DashboardUI {
    constructor(app) {
        this.app = app;
        this.container = null;
        this._built = false;
    }

    build() {
        if (this._built) return;
        this._built = true;

        const style = document.createElement('style');
        style.innerHTML = `
    ::-webkit-scrollbar { width: 12px; height: 12px; }
    ::-webkit-scrollbar-track { background: #003366; }
    ::-webkit-scrollbar-thumb { background: #9baeccff; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #445b63ff; }
    .planet-item { transition: all 0.25s; }
    `;
        document.head.appendChild(style);

        const dashboard = document.createElement('div');
        dashboard.id = 'solar-dashboard';
        dashboard.style.position = 'absolute';
        dashboard.style.top = '20px';
        dashboard.style.left = '20px';
        dashboard.style.background = 'rgba(10, 15, 30, 0.85)';
        dashboard.style.color = 'white';
        dashboard.style.padding = '18px';
        dashboard.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        dashboard.style.width = '360px';
        dashboard.style.maxHeight = '85vh';
        dashboard.style.overflowY = 'auto';
        dashboard.style.borderRadius = '14px';
        dashboard.style.zIndex = '100';
        document.body.appendChild(dashboard);
        this.container = dashboard;

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';
        header.innerHTML = `<h3 style="margin:0;font-size:16px">Solar System Dashboard</h3>`;
        dashboard.appendChild(header);

        const container = document.createElement('div');
        container.id = 'planets-container';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        dashboard.appendChild(container);

        const planetData = this.app.planetDataForUI || [];

        planetData.forEach(d => {
            const item = document.createElement('div');
            item.className = 'planet-item';
            item.dataset.planet = d.name;
            item.style.padding = '10px';
            item.style.borderRadius = '10px';
            item.style.background = 'rgba(20, 30, 50, 0.5)';
            item.style.border = '1px solid rgba(100,150,255,0.06)';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '8px';

            const includeInput = document.createElement('input');
            includeInput.type = 'checkbox';
            includeInput.className = `planet-${d.name}-include`;
            includeInput.checked = true;
            includeInput.title = 'Include in sim (hide/exclude from gravity)';
            includeInput.addEventListener('change', (ev) => {
                const checked = ev.target.checked;
                if (this.app && typeof this.app.setPlanetIncluded === 'function') {
                    this.app.setPlanetIncluded(d.name, checked);
                }
            });

            const name = document.createElement('div');
            name.textContent = d.name.charAt(0).toUpperCase() + d.name.slice(1);
            name.style.fontWeight = '600';

            left.appendChild(includeInput);
            left.appendChild(name);

            const size = document.createElement('div');
            size.textContent = `${d.scale.toFixed(2)} units`;
            size.style.color = '#aae8ff';
            size.style.fontSize = '12px';

            row.appendChild(left);
            row.appendChild(size);

            const infoGrid = document.createElement('div');
            infoGrid.style.display = 'grid';
            infoGrid.style.gridTemplateColumns = '1fr 1fr';
            infoGrid.style.gap = '6px';
            infoGrid.style.marginTop = '8px';

            function makeInfo(label, cls, value) {
                const wrap = document.createElement('div');
                const lab = document.createElement('div'); lab.textContent = label; lab.style.fontSize = '11px'; lab.style.color = '#99d6ff';
                const val = document.createElement('div'); val.className = cls; val.textContent = value; val.style.fontWeight = '500';
                wrap.appendChild(lab); wrap.appendChild(val); return wrap;
            }

            infoGrid.appendChild(makeInfo('Distance', `planet-${d.name}-distance`, `${(d.realdistance / 1e6).toFixed(2)} Mkm`));
            infoGrid.appendChild(makeInfo('Orbital Speed', `planet-${d.name}-orbital-speed`, `0.00 km/s`));
            infoGrid.appendChild(makeInfo('Angle', `planet-${d.name}-angle`, `0.00°`));
            infoGrid.appendChild(makeInfo('Eccentricity', `planet-${d.name}-eccentricity`, d.e.toFixed(4)));
            infoGrid.appendChild(makeInfo('Areal rate', `planet-${d.name}-areal`, `-`));
            infoGrid.appendChild(makeInfo('Kepler dev', `planet-${d.name}-kepler-dev`, `-`));

            item.appendChild(row);
            item.appendChild(infoGrid);
            container.appendChild(item);
        });
    }

    update(bodies = [], metersPerUnit = 1, params = {}) {
        // update system stats
        this._updateSystemStats(params);

        for (let i = 1; i < bodies.length; i++) {
            const b = bodies[i];
            const el = document.querySelector(`.planet-item[data-planet="${b.name}"]`);
            if (!el) continue;
            const speedEl = el.querySelector(`.planet-${b.name}-orbital-speed`);
            const angleEl = el.querySelector(`.planet-${b.name}-angle`);
            const distEl = el.querySelector(`.planet-${b.name}-distance`);
            const arealEl = el.querySelector(`.planet-${b.name}-areal`);
            const devEl = el.querySelector(`.planet-${b.name}-kepler-dev`);
            const includeChk = el.querySelector(`.planet-${b.name}-include`);

            if (includeChk) includeChk.checked = !!b.included;

            const v_m_s = b.velocity_m.length();
            const v_km_s = v_m_s / 1000;
            const r_m = b.position_m.length();
            const r_Mkm = r_m / 1e9;

            const angle = Math.atan2(b.position_m.z, b.position_m.x) * 180 / Math.PI;
            const angleDeg = angle < 0 ? angle + 360 : angle;

            if (speedEl) speedEl.textContent = `${v_km_s.toFixed(2)} km/s`;
            if (angleEl) angleEl.textContent = `${angleDeg.toFixed(2)}°`;
            if (distEl) distEl.textContent = `${r_Mkm.toFixed(2)} Mkm`;

            if (params.checkKepler) {
                const cross = new THREE.Vector3().crossVectors(b.position_m, b.velocity_m);
                const areal = 0.5 * cross.length();

                if (!b.areal_count) {
                    b.areal_count = 0;
                    b.areal_mean = 0;
                    b.areal_M2 = 0;
                }
                b.areal_count += 1;
                const delta = areal - b.areal_mean;
                b.areal_mean += delta / b.areal_count;
                b.areal_M2 += delta * (areal - b.areal_mean);
                const areal_std = (b.areal_count > 1) ? Math.sqrt(b.areal_M2 / (b.areal_count - 1)) : 0;

                const devPercent = b.areal0 ? ((areal - b.areal0) / b.areal0) * 100 : 0;
                const relStdPercent = b.areal_mean ? (areal_std / Math.abs(b.areal_mean)) * 100 : 0;

                if (arealEl) arealEl.textContent = `${(areal / 1e6).toFixed(4)} km²/s`;
                if (devEl) devEl.textContent = `${devPercent.toFixed(4)}% (σ_rel ${relStdPercent.toFixed(4)}%)`;

                if (Math.abs(devPercent) > 1) devEl.style.color = '#ff8080'; else devEl.style.color = '#aaffc3';
            } else {
                if (arealEl) arealEl.textContent = `-`;
                if (devEl) devEl.textContent = `-`;
            }
        }
    }

    _updateSystemStats(params = {}) {
        const stats = (this.app && typeof this.app.computeSystemEnergyAndMomentum === 'function')
            ? this.app.computeSystemEnergyAndMomentum(params.softening, true)
            : null;

        let statsEl = document.getElementById('system-stats');
        if (!statsEl) {
            statsEl = document.createElement('div');
            statsEl.id = 'system-stats';
            statsEl.style.marginTop = '10px';
            statsEl.style.padding = '8px';
            statsEl.style.borderRadius = '8px';
            statsEl.style.background = 'rgba(255,255,255,0.03)';
            statsEl.style.fontSize = '12px';
            statsEl.style.color = '#cfefff';
            const panel = document.getElementById('solar-dashboard');
            if (panel) panel.appendChild(statsEl);
        }

        if (stats) {
            statsEl.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px">System stats (included bodies)</div>
        <div>Kinetic (K): ${(stats.K).toExponential(3)} J</div>
        <div>Potential (U): ${(stats.U).toExponential(3)} J</div>
        <div>Total E: ${(stats.E).toExponential(3)} J</div>
        <div>|P|: ${(stats.Pmag).toExponential(3)} kg·m/s</div>
        <div>Sun mass: ${this.app ? this.app.SunMassDisplay : 'n/a'}</div>
                <div>v_COM: ${stats.v_com.toExponential(3)} m/s</div>
      `;
        } else {
            statsEl.innerHTML = `<div>System stats unavailable</div>`;
        }
    }
}
