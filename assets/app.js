(() => {
  'use strict';
  const story = window.STORY;
  const $ = selector => document.querySelector(selector);
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const resource = path => `${path}${path.includes('?') ? '&' : '?'}v=memorial-20260914`;
  document.querySelectorAll('[data-film-duration]').forEach(node => { node.textContent = time(Math.round(story.duration)); });
  document.querySelectorAll('[data-photo-count]').forEach(node => { node.textContent = story.photos.length; });
  document.querySelectorAll('[data-video-count]').forEach(node => { node.textContent = story.highlights.length; });
  document.querySelectorAll('[data-live-count]').forEach(node => { node.textContent = story.photos.filter(photo => photo.live).length; });
  const movie = $('#movie');
  const screenPlay = $('#screen-play');
  let toastTimer;
  const toast = message => {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
  };

  async function playAt(seconds = 0) {
    $('#film').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    try {
      if (movie.readyState === 0) {
        const seek = () => { movie.currentTime = seconds; };
        movie.addEventListener('loadedmetadata', seek, { once: true });
      } else movie.currentTime = seconds;
      await movie.play();
    } catch {
      screenPlay.hidden = false;
      toast('請按影片上的播放按鈕開始觀看。');
    }
  }
  document.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', () => playAt(Number(button.dataset.play))));
  screenPlay.addEventListener('click', () => playAt(movie.currentTime || 0));
  $('#restart').addEventListener('click', () => playAt(0));
  movie.addEventListener('play', () => { screenPlay.hidden = true; });
  movie.addEventListener('ended', () => { $('#now-playing').textContent = '爸爸，謝謝您。我們永遠想念您。'; });
  movie.addEventListener('error', () => toast('影片暫時無法載入，請重新整理，或使用「下載追思影片」。'));
  $('#fullscreen').addEventListener('click', async () => {
    try {
      if (movie.requestFullscreen) await movie.requestFullscreen();
      else if (movie.webkitEnterFullscreen) movie.webkitEnterFullscreen();
      else toast('請使用影片控制列的全螢幕按鈕。');
    } catch { toast('請使用影片控制列的全螢幕按鈕。'); }
  });

  const chapterButtons = story.chapters.map(chapter => {
    const button = document.createElement('button');
    button.className = 'chapter';
    button.innerHTML = `<span class="chapter-meta"><span>${chapter.number}</span><span>${time(chapter.start)}</span></span><h3>${chapter.title}</h3>`;
    button.setAttribute('aria-label', `${chapter.title}，從 ${time(chapter.start)} 開始播放`);
    button.addEventListener('click', () => playAt(chapter.start));
    $('#chapters').append(button);
    return button;
  });
  let activeChapter = -1;
  movie.addEventListener('timeupdate', () => {
    const chapterIndex = story.chapters.findLastIndex(chapter => movie.currentTime >= chapter.start);
    if (chapterIndex !== activeChapter) {
      activeChapter = chapterIndex;
      chapterButtons.forEach((button, i) => {
        button.classList.toggle('active', i === chapterIndex);
        if (i === chapterIndex) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    }
    if (!movie.ended) $('#now-playing').textContent = chapterIndex >= 0 ? `${story.chapters[chapterIndex].number} / ${story.chapters[chapterIndex].title}` : '序幕 / 永遠懷念 郭莒光先生';
  });

  const highlights = [...story.highlights];
  const previewHighlightCount = 3;
  let expandedHighlights = false;
  function renderHighlights() {
    $('#highlights').replaceChildren();
    highlights.slice(0, expandedHighlights ? highlights.length : previewHighlightCount).forEach(highlight => {
      const button = document.createElement('button');
      button.className = 'highlight-card';
      button.setAttribute('aria-label', `播放精華：${highlight.title}`);
      button.innerHTML = `<span class="highlight-image"><img src="${resource(highlight.poster)}" alt="${highlight.title}" loading="lazy" width="600" height="400"><span class="mini-play">${icon('play')}</span><span class="clip-duration">${Math.round(highlight.duration)} 秒影像</span></span><h3>${highlight.title}</h3><p>從 ${time(highlight.start)} 開始觀看 ${icon('arrow')}</p>`;
      button.addEventListener('click', () => playAt(highlight.start));
      $('#highlights').append(button);
    });
    $('#more-highlights').innerHTML = expandedHighlights ? `收起其餘影像 ${icon('arrow')}` : `展開其餘 ${Math.max(0, highlights.length - previewHighlightCount)} 段影像 ${icon('arrow')}`;
    $('#more-highlights').hidden = highlights.length <= previewHighlightCount;
    $('#more-highlights').setAttribute('aria-expanded', String(expandedHighlights));
  }
  $('#more-highlights').addEventListener('click', () => { expandedHighlights = !expandedHighlights; renderHighlights(); });
  renderHighlights();

  const filterNames = ['全部相片', ...story.chapters.map(chapter => chapter.title), '動態相片'];
  const liveFilterIndex = filterNames.length - 1;
  let selectedFilter = 0;
  let filteredPhotos = [...story.photos];
  let visiblePhotos = 20;
  const filterButtons = filterNames.map((name, i) => {
    const button = document.createElement('button');
    button.className = 'filter';
    button.innerHTML = (i === liveFilterIndex ? icon('live') : '') + name;
    button.setAttribute('aria-pressed', String(i === 0));
    button.addEventListener('click', () => {
      selectedFilter = i;
      filteredPhotos = story.photos.filter(photo => !i || (i === liveFilterIndex ? Boolean(photo.live) : photo.chapter === i));
      visiblePhotos = 20;
      renderGallery();
    });
    $('#filters').append(button);
    return button;
  });
  function renderGallery() {
    filterButtons.forEach((button, i) => {
      button.classList.toggle('active', i === selectedFilter);
      button.setAttribute('aria-pressed', String(i === selectedFilter));
    });
    const fragment = document.createDocumentFragment();
    filteredPhotos.slice(0, visiblePhotos).forEach((photo, index) => {
      const button = document.createElement('button');
      button.className = 'photo-card';
      button.setAttribute('aria-label', `放大相片：${photo.caption}${photo.live ? '，含動態相片' : ''}`);
      button.innerHTML = `<img src="${resource(photo.thumb)}" alt="${photo.caption}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async">${photo.live ? `<span class="live-badge">${icon('live')} 動態</span>` : ''}<span class="photo-caption">${photo.caption}</span>`;
      button.addEventListener('click', () => openLightbox(index));
      fragment.append(button);
    });
    $('#gallery').replaceChildren(fragment);
    $('#photo-count').textContent = `${filteredPhotos.length} 張相片`;
    $('#gallery-progress').textContent = `已翻閱 ${Math.min(visiblePhotos, filteredPhotos.length)} / ${filteredPhotos.length} 張回憶`;
    $('#load-more').hidden = visiblePhotos >= filteredPhotos.length;
  }
  $('#load-more').addEventListener('click', () => {
    const oldVisible = visiblePhotos;
    visiblePhotos += 24;
    renderGallery();
    // Preserve keyboard continuity when the final load-more button disappears.
    const firstNew = $('#gallery').children[oldVisible];
    if (firstNew) firstNew.focus({ preventScroll: true });
  });
  renderGallery();

  const lightbox = $('#lightbox');
  const liveVideo = $('#lightbox-video');
  let currentPhoto = 0;
  let lightboxOpener;
  function stopLive() {
    liveVideo.pause();
    liveVideo.removeAttribute('src');
    liveVideo.load();
    liveVideo.hidden = true;
    $('#lightbox-image').hidden = false;
    $('#live-toggle').innerHTML = `${icon('live')}<span>播放動態</span>`;
  }
  function showPhoto(index) {
    currentPhoto = (index + filteredPhotos.length) % filteredPhotos.length;
    const photo = filteredPhotos[currentPhoto];
    stopLive();
    $('#lightbox-image').src = resource(photo.src);
    $('#lightbox-image').alt = photo.caption;
    $('#lightbox-caption').textContent = photo.caption;
    $('#lightbox-chapter').textContent = story.chapters[photo.chapter - 1].title;
    $('#lightbox-count').textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${filteredPhotos.length}`;
    $('#live-toggle').hidden = !photo.live;
    const following = filteredPhotos[(currentPhoto + 1) % filteredPhotos.length];
    const preload = new Image(); preload.src = resource(following.src);
  }
  function openLightbox(index) {
    lightboxOpener = document.activeElement;
    movie.pause();
    showPhoto(index);
    lightbox.showModal();
    document.body.style.overflow = 'hidden';
    $('#close-lightbox').focus();
  }
  $('#close-lightbox').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('close', () => {
    stopLive();
    document.body.style.overflow = '';
    lightboxOpener?.focus({ preventScroll: true });
  });
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  $('#previous-photo').addEventListener('click', () => showPhoto(currentPhoto - 1));
  $('#next-photo').addEventListener('click', () => showPhoto(currentPhoto + 1));
  lightbox.addEventListener('keydown', event => {
    if (event.target === liveVideo) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(currentPhoto + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(currentPhoto - 1); }
  });
  let swipeStart = null;
  $('#lightbox-image').addEventListener('touchstart', event => { swipeStart = event.changedTouches[0].clientX; }, { passive: true });
  $('#lightbox-image').addEventListener('touchend', event => {
    const delta = event.changedTouches[0].clientX - swipeStart;
    if (swipeStart !== null && Math.abs(delta) > 60) showPhoto(currentPhoto + (delta < 0 ? 1 : -1));
    swipeStart = null;
  }, { passive: true });
  $('#live-toggle').addEventListener('click', async () => {
    if (!liveVideo.hidden) { stopLive(); return; }
    const photo = filteredPhotos[currentPhoto];
    if (!photo.live) return;
    $('#lightbox-image').hidden = true;
    liveVideo.hidden = false;
    liveVideo.src = resource(photo.live);
    liveVideo.poster = resource(photo.src);
    $('#live-toggle').innerHTML = `${icon('live')}<span>回到照片</span>`;
    try { await liveVideo.play(); } catch { toast('請按動態相片的播放按鈕。'); }
  });
  liveVideo.addEventListener('error', () => { if (liveVideo.getAttribute('src')) toast('動態相片無法載入，請稍後再試。'); });
  $('#watch-photo').addEventListener('click', () => {
    const start = filteredPhotos[currentPhoto].movieTime;
    lightbox.close();
    playAt(start);
  });

  const shareURL = () => { const url = new URL(location.href); url.hash = ''; url.search = ''; return url.href; };
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: '永遠懷念 郭莒光先生', text: '1960.06.02 — 2026.09.11。以影像珍藏爸爸的笑容，與親友一同追思。', url: shareURL() }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(shareURL()); toast('網址已複製，可分享給親友一同追思。'); }
    catch { $('#share-url').value = shareURL(); $('#share-dialog').showModal(); $('#share-url').select(); }
  }
  document.querySelectorAll('[data-share]').forEach(button => button.addEventListener('click', share));
  $('#close-share').addEventListener('click', () => $('#share-dialog').close());
  $('#copy-url').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareURL()); $('#share-dialog').close(); toast('網址已複製。'); }
    catch { $('#share-url').select(); toast('請長按網址或按 Ctrl/Cmd+C 複製。'); }
  });
})();
