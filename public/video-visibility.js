export function shouldPauseOffscreenVideo(entry, fullscreenElement = null) {
  return !entry.isIntersecting
    && !entry.target.paused
    && entry.target !== fullscreenElement
    && !entry.target.webkitDisplayingFullscreen;
}

export function pauseVideos(videos) {
  for (const video of videos) {
    if (!video.paused) video.pause();
  }
}
