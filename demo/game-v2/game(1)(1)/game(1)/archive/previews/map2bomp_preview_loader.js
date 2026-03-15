(() => {
  'use strict';

  const mapName = 'map2bomp_merged_colormap';
  const defaultScale = 2;
  let renderer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(text, isError) {
    const loading = byId('loading');
    if (!loading) return;
    loading.textContent = text;
    loading.style.display = 'flex';
    loading.style.color = isError ? '#ff9b9b' : '#ffffff';
  }

  function hideStatus() {
    const loading = byId('loading');
    if (!loading) return;
    loading.style.display = 'none';
  }

  function updateScaleText() {
    const scaleValue = byId('scale-value');
    if (!scaleValue || !renderer) return;
    scaleValue.textContent = `${renderer.scale.toFixed(2)}x`;
  }

  function applyScale(nextScale) {
    if (!renderer) return;
    const clamped = Math.max(0.5, Math.min(8, nextScale));
    renderer.scale = clamped;
    renderer.resizeCanvas();
    renderer.render();
    updateScaleText();
  }

  function renderLegend() {
    const legend = byId('legend');
    if (!legend) return;

    const entries = [
      { value: 0, gid: 10, label: 'Light · neonlight' },
      { value: 1, gid: 48, label: 'Dark · collision' },
      { value: 2, gid: 16, label: 'Light · neonbars_yellow' },
      { value: 3, gid: 49, label: 'Dark · collision' },
      { value: 4, gid: 50, label: 'Dark · collision' },
      { value: 6, gid: 24, label: 'Light · neonbars_multicolor' },
      { value: 8, gid: 40, label: 'Light · neonbars_bluepink' },
      { value: 9, gid: 11, label: 'Light · neonlight tile #2' },
      { value: 10, gid: 51, label: 'Dark · collision' }
    ];

    legend.innerHTML = entries.map((entry) => (
      `<div class="legend-item">` +
      `<span class="legend-number">${entry.value}</span>` +
      `<span class="legend-text">GID ${entry.gid} · ${entry.label}</span>` +
      `</div>`
    )).join('');
  }

  async function init() {
    try {
      setStatus('loading preview…', false);
      renderLegend();
      renderer = new TiledMapRenderer('mapCanvas', mapName);
      await renderer.init();
      applyScale(defaultScale);
      hideStatus();

      const title = byId('map-title');
      if (title) title.textContent = mapName;

      const zoomInBtn = byId('zoomInBtn');
      const zoomOutBtn = byId('zoomOutBtn');
      const resetBtn = byId('resetBtn');
      const gridBtn = byId('gridBtn');

      if (zoomInBtn) zoomInBtn.addEventListener('click', () => applyScale(renderer.scale * 1.2));
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => applyScale(renderer.scale / 1.2));
      if (resetBtn) resetBtn.addEventListener('click', () => applyScale(defaultScale));
      if (gridBtn) {
        gridBtn.addEventListener('click', () => {
          renderer.showGrid = !renderer.showGrid;
          renderer.render();
        });
      }

      const scaleSlider = byId('scaleSlider');
      if (scaleSlider) {
        scaleSlider.value = String(defaultScale);
        scaleSlider.addEventListener('input', (event) => {
          applyScale(parseFloat(event.target.value));
        });
      }
    } catch (error) {
      console.error(error);
      setStatus(`Load failed: ${error.message}`, true);
      const errorEl = byId('map-error');
      if (errorEl) errorEl.textContent = error.message;
    }
  }

  window.addEventListener('load', init);
})();
