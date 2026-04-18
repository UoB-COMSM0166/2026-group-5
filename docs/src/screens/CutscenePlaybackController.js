// Shared ES6 controller for cutscene reveal/advance playback state.
const DEFAULT_FINISH_HOLD_MS = 1000;

export class CutscenePlaybackController {
  #timeOffsetMs;
  #revealedScenes;

  constructor() {
    this.#timeOffsetMs = 0;
    this.#revealedScenes = new Set();
  }

  get revealedScenes() {
    return this.#revealedScenes;
  }

  reset() {
    this.#timeOffsetMs = 0;
    this.#revealedScenes.clear();
  }

  resetForFreshStart(rawElapsedMs) {
    if ((rawElapsedMs || 0) >= 50) return false;
    this.reset();
    return true;
  }

  getElapsed(rawElapsedMs) {
    return (rawElapsedMs ?? 0) + this.#timeOffsetMs;
  }

  handleEnter(key, state, api, sceneList, options = {}) {
    if (key !== 'Enter') return false;

    const elapsed = this.getElapsed(state.screenTimeMs);
    const currentSceneIndex = this.#getActiveSceneIndex(sceneList, elapsed);

    if (this.#isSequenceFinished(sceneList, elapsed) || currentSceneIndex < 0) {
      return this.#finish(state, api, options);
    }

    const scene = sceneList[currentSceneIndex];
    const progress = options.getProgress?.(scene, elapsed) ?? 0;

    if (this.#shouldRevealText(scene, elapsed, progress, options)) {
      this.#revealedScenes.add(scene);
      return true;
    }

    if (this.#shouldRevealVisual(scene, elapsed, progress, options)) {
      this.#revealedScenes.add(scene);
      return true;
    }

    if (currentSceneIndex === sceneList.length - 1) {
      this.#timeOffsetMs += scene.end - elapsed;
      return true;
    }

    this.#advanceToNextScene(sceneList[currentSceneIndex + 1], elapsed, api);
    return true;
  }

  continueIfComplete(state, api, sceneList, options = {}) {
    const rawElapsedMs = state.screenTimeMs ?? 0;
    const elapsed = this.getElapsed(rawElapsedMs);
    if (!this.#isSequenceFinished(sceneList, elapsed)) return false;
    if (!this.#hasFinishHoldElapsed(sceneList, rawElapsedMs, options)) return false;
    return this.#finish(state, api, options);
  }

  getPrompt(sceneList, scene, elapsed, progress, options = {}) {
    if (this.#isSequenceFinished(sceneList, elapsed)) return '';
    return 'Press Enter to advance';
  }

  getHudPrompt(sceneList, scene, elapsed, progress, options = {}) {
    if (this.#isSequenceFinished(sceneList, elapsed)) return '';
    return 'Press ENTER to advance';
  }

  isSceneFullyRevealed(scene, elapsed, progress, options = {}) {
    return this.#isTextRevealed(scene, elapsed, progress, options)
      && this.#isVisualRevealed(scene, elapsed, progress, options);
  }

  #advanceToNextScene(nextScene, elapsed, api) {
    const nextSceneDuration = nextScene.end - nextScene.start;
    const jumpOffsetInsideScene = Math.min(650, Math.floor(nextSceneDuration * 0.18));
    const targetElapsed = nextScene.start + jumpOffsetInsideScene;
    this.#timeOffsetMs += targetElapsed - elapsed;
  }

  #finish(state, api, options) {
    this.reset();
    options.onFinished?.(state, api);
    return true;
  }

  #getActiveSceneIndex(sceneList, elapsed) {
    return sceneList.findIndex((scene) => elapsed >= scene.start && elapsed < scene.end);
  }

  #isSequenceFinished(sceneList, elapsed) {
    return elapsed >= this.#getSequenceEnd(sceneList);
  }

  #getSequenceEnd(sceneList) {
    return sceneList[sceneList.length - 1].end;
  }

  #hasFinishHoldElapsed(sceneList, rawElapsedMs, options) {
    const holdMs = options.finishHoldMs ?? DEFAULT_FINISH_HOLD_MS;
    const finishedAtRawMs = this.#getSequenceEnd(sceneList) - this.#timeOffsetMs;
    return rawElapsedMs >= finishedAtRawMs + holdMs;
  }

  #shouldRevealText(scene, elapsed, progress, options) {
    return !!options.hasText?.(scene)
      && !this.#isTextRevealed(scene, elapsed, progress, options);
  }

  #shouldRevealVisual(scene, elapsed, progress, options) {
    return !options.isSingleImageOnly?.(scene)
      && !!options.hasVisual?.(scene)
      && !this.#isVisualRevealed(scene, elapsed, progress, options);
  }

  #isTextRevealed(scene, elapsed, progress, options) {
    if (!options.hasText?.(scene)) return true;
    return !!options.isTextRevealed?.(scene, elapsed, progress, this.#revealedScenes);
  }

  #isVisualRevealed(scene, elapsed, progress, options) {
    if (!options.hasVisual?.(scene)) return true;
    if (options.isSingleImageOnly?.(scene)) return true;
    return !!options.isVisualRevealed?.(scene, elapsed, progress, this.#revealedScenes);
  }

}
