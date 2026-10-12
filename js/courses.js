// Courses screen (courses.html). main.js runs first: header, mobile menu, reveal, a11y menu, motionOff(), T (strings per language).

// Tracks — the payment links aren't set yet; don't jump to the top of the page meanwhile.
document.querySelectorAll('[data-pay]').forEach(a => a.addEventListener('click', e => {
  if (a.getAttribute('href') === '#') e.preventDefault();
}));

// Opener film — muted loop; a pause button (WCAG 2.2.2) and a sound toggle.
// Stops for reduced motion / the accessibility menu's "stop animations", and while off-screen.
const film = document.getElementById('heroFilm');
const pauseBtn = document.querySelector('.hero-pause');
const soundBtn = document.getElementById('filmSound');
let userPaused = false;
let filmOnScreen = true;
const canPlay = () => !motionOff() && !userPaused;

const syncFilm = () => {
  if (canPlay() && filmOnScreen) film.play().catch(() => {});
  else film.pause();
  const paused = !canPlay();
  pauseBtn.setAttribute('aria-pressed', String(paused));
  pauseBtn.querySelector('.hero-pause-label').textContent = paused ? T.playVideo : T.pauseVideo;
  pauseBtn.classList.toggle('is-paused', paused);
};
pauseBtn.addEventListener('click', () => { userPaused = !userPaused; syncFilm(); });
reduceMotion.addEventListener('change', syncFilm);
document.addEventListener('a11y-change', syncFilm);
new IntersectionObserver(([entry]) => { filmOnScreen = entry.isIntersecting; syncFilm(); })
  .observe(document.getElementById('hero'));
syncFilm();

soundBtn.addEventListener('click', () => {
  film.muted = !film.muted;
  soundBtn.textContent = film.muted ? 'SOUND OFF' : 'SOUND ON';
  soundBtn.setAttribute('aria-pressed', String(!film.muted));
  soundBtn.setAttribute('aria-label', film.muted ? T.soundOn : T.soundOff);
});
