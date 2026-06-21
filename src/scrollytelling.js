/**
 * ScrollStory — lightweight scrollytelling engine.
 * Observes scenes via IntersectionObserver, tracks active scene and scroll progress.
 */
export class ScrollStory {
  constructor() {
    this.scenes = new Map();
    this.callbacks = new Map();
    this.activeSceneId = null;
    this.progress = 0;

    this.progressBar = document.getElementById('progress-bar');
    this.dotNav = document.getElementById('scene-nav');

    this.observer = new IntersectionObserver(
      (entries) => this._onIntersect(entries),
      { threshold: this._buildThresholds() }
    );

    window.addEventListener('scroll', () => this._onScroll(), { passive: true });
  }

  _buildThresholds() {
    const steps = 40;
    const thresholds = [];
    for (let i = 0; i <= steps; i++) {
      thresholds.push(i / steps);
    }
    return thresholds;
  }

  /**
   * Register a scene element with optional lifecycle callbacks.
   * @param {string} id - The scene's element id (without #).
   * @param {object} callbacks - { onEnter?, onProgress?, onExit? }
   */
  addScene(id, callbacks = {}) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`ScrollStory: element #${id} not found`);
      return;
    }
    this.scenes.set(id, el);
    this.callbacks.set(id, callbacks);
    this.observer.observe(el);
  }

  _onIntersect(entries) {
    for (const entry of entries) {
      const el = entry.target;
      const id = el.id;
      const ratio = entry.intersectionRatio;

      // Find the most-visible scene
      if (ratio > 0.1) {
        // Deactivate previous
        if (this.activeSceneId && this.activeSceneId !== id) {
          const prevCb = this.callbacks.get(this.activeSceneId);
          if (prevCb?.onExit) prevCb.onExit();
          const prevEl = this.scenes.get(this.activeSceneId);
          if (prevEl) prevEl.classList.remove('active');
        }

        if (this.activeSceneId !== id) {
          this.activeSceneId = id;
          el.classList.add('active');
          if (this.callbacks.get(id)?.onEnter) {
            this.callbacks.get(id).onEnter();
          }
          this._updateNav();
        }

        // Progress within the scene
        if (this.callbacks.get(id)?.onProgress) {
          this.callbacks.get(id).onProgress(ratio);
        }
      }
    }

    // Check if the active scene has really left
    if (this.activeSceneId) {
      const activeEl = this.scenes.get(this.activeSceneId);
      const activeEntry = entries.find(e => e.target === activeEl);
      if (activeEntry && activeEntry.intersectionRatio < 0.05) {
        const cb = this.callbacks.get(this.activeSceneId);
        if (cb?.onExit) cb.onExit();
        activeEl.classList.remove('active');
        this.activeSceneId = null;
      }
    }
  }

  _onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.progress = docHeight > 0 ? scrollTop / docHeight : 0;
    if (this.progressBar) {
      this.progressBar.style.width = `${this.progress * 100}%`;
    }
  }

  _updateNav() {
    if (!this.dotNav) return;
    const dots = this.dotNav.querySelectorAll('.dot');
    dots.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.scene === this.activeSceneId);
    });
  }

  /**
   * Build navigation dots and attach click handlers.
   * Call after all scenes are registered.
   */
  buildNav() {
    if (!this.dotNav) return;

    this.dotNav.innerHTML = '';
    const ids = Array.from(this.scenes.keys());

    for (const id of ids) {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.dataset.scene = id;
      dot.setAttribute('aria-label', `Navigate to ${id}`);
      dot.addEventListener('click', () => {
        const el = this.scenes.get(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
      this.dotNav.appendChild(dot);
    }
  }

  /** Get the currently active scene id */
  getActiveScene() {
    return this.activeSceneId;
  }
}
