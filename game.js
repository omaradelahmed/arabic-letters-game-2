/*!
 * وين الحرف؟ — حروفي ٢
 * لعبة تعليمية للأطفال من 3 إلى 6 سنوات: الصورة + أول حرف بشكلـه في أول الكلمة.
 * لا موسيقى: كل الأصوات مولّدة بـ WebAudio، والكلام عبر speechSynthesis.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* البيانات                                                            */
  /* ------------------------------------------------------------------ */

  // شكل الحرف في أول الكلمة (الحروف اللي مبتوصلش زي الراء بتفضل زي ما هي)
  const LETTERS = [
    { letter: 'ر', initial: 'ر' },
    { letter: 'س', initial: 'سـ' },
    { letter: 'خ', initial: 'خـ' },
    { letter: 'ن', initial: 'نـ' },
    { letter: 'ت', initial: 'تـ' },
    { letter: 'ل', initial: 'لـ' },
  ];

  const WORDS = [
    { letter: 'ر', word: 'رُز', emoji: '🍚' },
    { letter: 'ر', word: 'رَاديو', emoji: '📻' },
    { letter: 'ر', word: 'رِجل', emoji: '🦵' },

    { letter: 'س', word: 'سُكّر', emoji: '🍬' },
    { letter: 'س', word: 'سَيّارة', emoji: '🚗' },
    { letter: 'س', word: 'سِنجاب', emoji: '🐿️' },

    { letter: 'خ', word: 'خُبز', emoji: '🍞' },
    { letter: 'خ', word: 'خَروف', emoji: '🐑' },
    { letter: 'خ', word: 'خِيار', emoji: '🥒' },

    { letter: 'ن', word: 'نُجوم', emoji: '⭐' },
    { letter: 'ن', word: 'نَملة', emoji: '🐜' },
    { letter: 'ن', word: 'نِمر', emoji: '🐆' },

    { letter: 'ت', word: 'تُفاح', emoji: '🍎' },
    { letter: 'ت', word: 'تَاج', emoji: '👑' },
    { letter: 'ت', word: 'تِمساح', emoji: '🐊' },

    { letter: 'ل', word: 'لُعبة', emoji: '🧸' },
    { letter: 'ل', word: 'لَيمون', emoji: '🍋' },
    { letter: 'ل', word: 'لِسان', emoji: '👅' },
  ];

  const ROUND_MS = 60 * 1000; // دقيقة لكل صورة
  const STORAGE_KEY = 'hurouf2.v1';
  const NEXT_ROUND_MS = 1350;

  /* ------------------------------------------------------------------ */
  /* عناصر الصفحة                                                        */
  /* ------------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  const el = {
    score: $('score'),
    best: $('best'),
    soundBtn: $('soundBtn'),
    timerFill: $('timerFill'),
    timerText: $('timerText'),
    pictureCard: $('pictureCard'),
    pictureEmoji: $('pictureEmoji'),
    speakBtn: $('speakBtn'),
    letters: $('letters'),
    startOverlay: $('startOverlay'),
    timeOverlay: $('timeOverlay'),
    playBtn: $('playBtn'),
    againBtn: $('againBtn'),
    finalScore: $('finalScore'),
    confetti: $('confetti'),
  };

  const state = {
    playing: false,
    locked: true,
    score: 0,
    best: 0,
    sound: true,
    lastLetter: '',
    round: null,
  };

  /* ------------------------------------------------------------------ */
  /* الحفظ المحلي                                                        */
  /* ------------------------------------------------------------------ */

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.best === 'number' && saved.best >= 0) state.best = saved.best;
      if (typeof saved.sound === 'boolean') state.sound = saved.sound;
    } catch {
      /* تجاهل */
    }
  }

  function saveSaved() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: state.best, sound: state.sound }));
    } catch {
      /* التخزين ممكن يكون معطّل */
    }
  }

  /* ------------------------------------------------------------------ */
  /* الأصوات (WebAudio — بدون ملفات ولا موسيقى)                          */
  /* ------------------------------------------------------------------ */

  let actx = null;

  function audioCtx() {
    if (!state.sound) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!actx) {
      try {
        actx = new AC();
      } catch {
        return null;
      }
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }

  function tone({ freq, at = 0, dur = 0.2, type = 'sine', vol = 0.14 }) {
    const ctx = audioCtx();
    if (!ctx) return;
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  const sfx = {
    tap() {
      tone({ freq: 640, dur: 0.07, type: 'triangle', vol: 0.07 });
    },
    correct() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone({ freq, at: i * 0.085, dur: 0.24, type: 'triangle', vol: 0.12 });
      });
    },
    wrong() {
      tone({ freq: 233, dur: 0.16, type: 'sawtooth', vol: 0.09 });
      tone({ freq: 175, at: 0.13, dur: 0.24, type: 'sawtooth', vol: 0.09 });
    },
    timeUp() {
      [659.25, 523.25, 392, 261.63].forEach((freq, i) => {
        tone({ freq, at: i * 0.16, dur: 0.3, type: 'triangle', vol: 0.13 });
      });
    },
  };

  /* ------------------------------------------------------------------ */
  /* الكلام                                                             */
  /* ------------------------------------------------------------------ */

  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let arVoice = null;
  let speakToken = 0;

  function findArabicVoice() {
    if (!synth) {
      document.body.classList.add('no-tts');
      return;
    }
    let voices = [];
    try {
      voices = synth.getVoices() || [];
    } catch {
      voices = [];
    }
    arVoice =
      voices.find((v) => /^ar[-_]EG/i.test(v.lang)) ||
      voices.find((v) => /^ar/i.test(v.lang)) ||
      null;
    document.body.classList.toggle('no-tts', !arVoice);
  }

  function speak(lines) {
    if (!synth || !arVoice || !state.sound || !lines.length) return;
    const token = ++speakToken;
    try {
      synth.cancel();
    } catch {
      /* تجاهل */
    }
    setTimeout(() => {
      if (token !== speakToken) return;
      for (const text of lines) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.voice = arVoice;
        utter.lang = arVoice.lang || 'ar-EG';
        utter.rate = 0.85;
        utter.pitch = 1.05;
        utter.volume = 1;
        try {
          synth.speak(utter);
        } catch {
          /* تجاهل */
        }
      }
    }, 80);
  }

  /* ------------------------------------------------------------------ */
  /* المؤقت                                                             */
  /* ------------------------------------------------------------------ */

  const timer = { active: false, deadline: 0, remaining: ROUND_MS, raf: 0, timeoutId: 0 };

  function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function paintTimer(left) {
    const ratio = Math.max(0, Math.min(1, left / ROUND_MS));
    el.timerFill.style.width = `${(ratio * 100).toFixed(2)}%`;
    el.timerFill.dataset.state = ratio > 0.5 ? 'ok' : ratio > 0.17 ? 'warn' : 'danger';
    el.timerText.textContent = formatTime(left);
  }

  function tick() {
    if (!timer.active) return;
    const left = timer.deadline - performance.now();
    if (left <= 0) {
      paintTimer(0);
      stopTimer();
      timeUp();
      return;
    }
    paintTimer(left);
    timer.raf = requestAnimationFrame(tick);
  }

  function startTimer(ms = ROUND_MS) {
    stopTimer();
    timer.active = true;
    timer.remaining = ms;
    timer.deadline = performance.now() + ms;
    paintTimer(ms);
    timer.raf = requestAnimationFrame(tick);
    // شبكة أمان: لو المتصفح بطّأ الـ rAF، الـ timeout بيقفل المرحلة برضه
    timer.timeoutId = setTimeout(() => {
      if (!timer.active) return;
      paintTimer(0);
      stopTimer();
      timeUp();
    }, ms + 60);
  }

  function stopTimer() {
    timer.active = false;
    cancelAnimationFrame(timer.raf);
    clearTimeout(timer.timeoutId);
    timer.raf = 0;
    timer.timeoutId = 0;
  }

  function pauseTimer() {
    if (!timer.active) return;
    timer.remaining = Math.max(0, timer.deadline - performance.now());
    stopTimer();
  }

  function resumeTimer() {
    if (state.playing && !state.locked && timer.remaining > 0) startTimer(timer.remaining);
  }

  /* ------------------------------------------------------------------ */
  /* منطق الجولات                                                        */
  /* ------------------------------------------------------------------ */

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderScore() {
    el.score.textContent = String(state.score);
    el.best.textContent = String(state.best);
  }

  function renderLetters() {
    el.letters.textContent = '';
    shuffle(LETTERS.slice()).forEach((entry) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letter-btn';
      btn.textContent = entry.initial;
      btn.dataset.letter = entry.letter;
      btn.style.setProperty('--rot', `${(Math.random() * 10 - 5).toFixed(1)}deg`);
      btn.style.setProperty('--dy', `${(Math.random() * 10 - 5).toFixed(1)}px`);
      btn.setAttribute('aria-label', `حرف ${entry.letter}`);
      btn.addEventListener('click', () => chooseLetter(entry.letter, btn));
      el.letters.appendChild(btn);
    });
  }

  function nextRound() {
    const pool = WORDS.filter((item) => item.letter !== state.lastLetter);
    const item = pick(pool.length ? pool : WORDS);
    state.round = item;
    state.lastLetter = item.letter;
    state.locked = false;

    el.pictureEmoji.textContent = item.emoji;
    el.pictureCard.classList.remove('correct', 'pop');
    void el.pictureCard.offsetWidth;
    el.pictureCard.classList.add('pop');

    renderLetters();
    startTimer();
    speak([item.word]);
  }

  function celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#ffd166', '#2fc3a6', '#2fbf71', '#ff7b9c', '#b388ff'];
    for (let i = 0; i < 26; i += 1) {
      const piece = document.createElement('i');
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.25}s`;
      piece.style.animationDuration = `${0.9 + Math.random() * 0.6}s`;
      el.confetti.appendChild(piece);
      setTimeout(() => piece.remove(), 2300);
    }
  }

  function onCorrect(btn) {
    state.locked = true;
    stopTimer();

    btn.classList.add('correct');
    el.letters.querySelectorAll('.letter-btn').forEach((other) => {
      if (other !== btn) other.classList.add('faded');
    });
    el.pictureCard.classList.add('correct');

    sfx.correct();
    celebrate();

    state.score += 1;
    if (state.score > state.best) {
      state.best = state.score;
      saveSaved();
    }
    renderScore();
    speak(['أحسنت!']);

    setTimeout(() => {
      if (state.playing) nextRound();
    }, NEXT_ROUND_MS);
  }

  function onWrong(btn) {
    btn.classList.remove('wrong');
    void btn.offsetWidth;
    btn.classList.add('wrong');
    sfx.wrong();
    if (state.round) speak([state.round.word]);
    setTimeout(() => btn.classList.remove('wrong'), 520);
  }

  function chooseLetter(letter, btn) {
    if (!state.playing || state.locked || !state.round) return;
    if (letter === state.round.letter) onCorrect(btn);
    else onWrong(btn);
  }

  function timeUp() {
    state.playing = false;
    state.locked = true;
    el.finalScore.textContent = String(state.score);
    el.timeOverlay.classList.remove('hidden');
    sfx.timeUp();
    speak(['الوقت خلص', 'حاول تاني']);
  }

  function startGame() {
    audioCtx();
    state.playing = true;
    state.score = 0;
    state.lastLetter = '';
    state.round = null;
    renderScore();
    el.startOverlay.classList.add('hidden');
    el.timeOverlay.classList.add('hidden');
    nextRound();
  }

  /* ------------------------------------------------------------------ */
  /* الصوت: تشغيل/إيقاف                                                  */
  /* ------------------------------------------------------------------ */

  function applySoundUI() {
    el.soundBtn.textContent = state.sound ? '🔊' : '🔇';
    el.soundBtn.setAttribute('aria-pressed', String(state.sound));
    el.soundBtn.setAttribute('aria-label', state.sound ? 'إيقاف الصوت' : 'تشغيل الصوت');
  }

  function toggleSound() {
    state.sound = !state.sound;
    applySoundUI();
    saveSaved();
    if (!state.sound) {
      if (synth) {
        try {
          synth.cancel();
        } catch {
          /* تجاهل */
        }
      }
    } else {
      audioCtx();
      sfx.tap();
    }
  }

  /* ------------------------------------------------------------------ */
  /* التشغيل                                                            */
  /* ------------------------------------------------------------------ */

  loadSaved();
  renderScore();
  applySoundUI();
  findArabicVoice();
  if (synth) synth.onvoiceschanged = findArabicVoice;

  el.playBtn.addEventListener('click', () => {
    sfx.tap();
    startGame();
  });

  el.againBtn.addEventListener('click', () => {
    sfx.tap();
    startGame();
  });

  el.soundBtn.addEventListener('click', toggleSound);

  el.speakBtn.addEventListener('click', () => {
    sfx.tap();
    if (state.round) speak([state.round.word]);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseTimer();
      if (synth) {
        try {
          synth.cancel();
        } catch {
          /* تجاهل */
        }
      }
      return;
    }
    resumeTimer();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    });
  }
})();
