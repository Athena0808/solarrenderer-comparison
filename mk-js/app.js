const videos = [...document.querySelectorAll("video")];
const sync = document.querySelector("#sync");
const seek = document.querySelector("#seek");
const time = document.querySelector("#time");
const status = document.querySelector("#status");
let leader = videos[0];
let internalChange = false;

function formatTime(value) {
  return `${Number(value || 0).toFixed(2)} / 15.00`;
}

function align(value, targets = videos) {
  for (const video of targets) {
    if (video.readyState && Math.abs(video.currentTime - value) > 0.04) {
      video.currentTime = Math.min(value, Number.isFinite(video.duration) ? video.duration : 15);
    }
  }
}

async function playAll() {
  if (sync.checked) align(leader.currentTime);
  const results = await Promise.allSettled(videos.map(video => video.play()));
  status.textContent = results.some(result => result.status === "rejected")
    ? "部分视频尚未就绪，请稍后重试。"
    : "";
}

function pauseAll() {
  internalChange = true;
  videos.forEach(video => video.pause());
  internalChange = false;
}

function resetAll() {
  pauseAll();
  align(0);
  seek.value = "0";
  time.textContent = formatTime(0);
}

document.querySelector("#play").addEventListener("click", playAll);
document.querySelector("#pause").addEventListener("click", pauseAll);
document.querySelector("#reset").addEventListener("click", resetAll);
document.querySelector("#speed").addEventListener("change", event => {
  videos.forEach(video => { video.playbackRate = Number(event.target.value); });
});
seek.addEventListener("input", () => align(Number(seek.value)));
sync.addEventListener("change", () => {
  if (!sync.checked) return;
  align(leader.currentTime);
  if (!leader.paused) playAll();
});

for (const video of videos) {
  video.addEventListener("pointerdown", () => { leader = video; });
  video.addEventListener("play", () => {
    if (internalChange) return;
    leader = video;
    if (!sync.checked) return;
    internalChange = true;
    const others = videos.filter(candidate => candidate !== video);
    align(video.currentTime, others);
    Promise.allSettled(others.map(candidate => candidate.play()))
      .finally(() => { internalChange = false; });
  });
  video.addEventListener("pause", () => {
    if (!sync.checked || internalChange) return;
    internalChange = true;
    videos.filter(candidate => candidate !== video).forEach(candidate => candidate.pause());
    internalChange = false;
  });
  video.addEventListener("seeking", () => {
    if (sync.checked && video === leader) {
      align(video.currentTime, videos.filter(candidate => candidate !== video));
    }
  });
  video.addEventListener("error", () => {
    status.textContent = "视频加载失败，请检查本地服务。";
  });
}

window.setInterval(() => {
  const current = leader.currentTime || 0;
  seek.value = String(current);
  time.textContent = formatTime(current);
  if (!sync.checked || leader.paused || leader.seeking) return;
  for (const video of videos) {
    if (video === leader || video.readyState < 3 || video.seeking) continue;
    if (Math.abs(video.currentTime - current) > 0.16) video.currentTime = current;
  }
}, 180);

document.addEventListener("keydown", event => {
  if (event.code !== "Space" || ["INPUT", "SELECT", "BUTTON"].includes(document.activeElement?.tagName)) return;
  event.preventDefault();
  if (videos.some(video => !video.paused)) pauseAll(); else playAll();
});
