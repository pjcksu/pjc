(function () {
  "use strict";
  /* ===== إعدادات قابلة للتعديل ===== */
  var CONFIG = {
    openDate: "2026-11-22T00:00:00+03:00", // 22 نوفمبر 2026 – 00:00 بتوقيت الرياض
    destinationTitle: "تفاصيل الوجهة",
    // ضع الإعلان الرسمي هنا لاحقًا (يظهر عند الضغط على «اكتشف الوجهة» بعد الموعد)
    destinationBody: "سيُضاف الإعلان الرسمي هنا.",
    championship: "أكبر بطولة ترافع جزائي في المملكة."
  };
  var $ = function (s) { return document.querySelector(s); };
  var log = $("#log"), wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var target = new Date(CONFIG.openDate).getTime(), isOpen = function () { return Date.now() >= target; };
  var sound = true, ctx = null, master = null, unlocked = false;
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .45; master.connect(ctx.destination); if (ctx.resume) ctx.resume(); } catch (e) {}
    setTimeout(function () { ambient(sound); }, 60);
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, unlock, { passive: true }); });
  function ready() { return sound && ctx && master; }
  function tone(f, t0, d, type, vol, f2) {
    if (!ready()) return; var n = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, n); if (f2) o.frequency.exponentialRampToValueAtTime(f2, n + d);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(vol || .15, n + .02); g.gain.exponentialRampToValueAtTime(.0001, n + d);
    o.connect(g); g.connect(master); o.start(n); o.stop(n + d + .05);
  }
  function noise(t0, d, vol) {
    if (!ready()) return; var n = ctx.currentTime + t0, len = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, len, ctx.sampleRate), a = buf.getChannelData(0);
    for (var i = 0; i < len; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol || .1; s.connect(g); g.connect(master); s.start(n);
  }
  var SFX = {
    glitch: function () { noise(0, .2, .22); tone(240, 0, .35, "sawtooth", .08, 70); noise(.25, .1, .14); },
    appear: function () { tone(660, 0, .25, "sine", .14); tone(990, .13, .4, "sine", .11); },
    scan: function () { var h = setInterval(function () { tone(1500, 0, .035, "square", .035); }, 170); return function () { clearInterval(h); }; },
    found: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * .09, .35, "triangle", .13); }); },
    gateDeny: function () { tone(330, 0, .35, "sine", .09); tone(262, .14, .5, "sine", .08); },
    gateOpen: function () { noise(0, .05, .1); [392, 587, 784, 1175].forEach(function (f, i) { tone(f, i * .07, .5, "sine", .12); }); },
    tap: function () { tone(820, 0, .06, "sine", .08); },
    finale: function () { tone(196, 0, 1.6, "sine", .12, 392); [392, 494, 587, 784].forEach(function (f, i) { tone(f, .55 + i * .06, 1.3, "triangle", .08); }); noise(.2, .8, .04); }
  };

  /* موسيقى هادئة خلفية (طبقات ناعمة) تبدأ بعد أول تفاعل ويوقفها زر الصوت */
  var amb = null;
  function ambient(on) {
    if (!on) { if (amb) { var a = amb; amb = null; try { a.g.gain.cancelScheduledValues(ctx.currentTime); a.g.gain.setTargetAtTime(0, ctx.currentTime, .25); setTimeout(function () { a.o.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 900); } catch (e) {} } return; }
    if (amb || !ready()) return;
    var g = ctx.createGain(); g.gain.value = 0; g.connect(master); var os = [];
    [[130.81, -4], [196, 3], [261.63, 0], [329.63, 5]].forEach(function (p, i) {
      var o = ctx.createOscillator(), og = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sine"; o.frequency.value = p[0]; o.detune.value = p[1]; og.gain.value = i < 2 ? .05 : .025;
      l.frequency.value = .08 + i * .03; lg.gain.value = og.gain.value * .6; l.connect(lg); lg.connect(og.gain);
      o.connect(og); og.connect(g); o.start(); l.start(); os.push(o, l);
    });
    g.gain.setTargetAtTime(.8, ctx.currentTime, 1.5); amb = { g: g, o: os };
  }
  function sfx(n) { try { return SFX[n](); } catch (e) {} }
  $("#soundBtn").onclick = function () {
    sound = !sound; if (master) master.gain.value = sound ? .45 : 0; unlock(); ambient(sound);
    this.setAttribute("aria-pressed", sound); this.querySelector(".ic").textContent = sound ? "🔊" : "🔇"; this.querySelector(".tx").textContent = sound ? "الصوت" : "مكتوم";
    if (sound) { sfx("appear"); }
  };

  function down() { log.scrollTo({ top: log.scrollHeight, behavior: "smooth" }); }
  function add(node) { log.appendChild(node); down(); return node; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; }
  async function say(text, cls) {
    var t = add(el("div", "msg typing", "<i></i><i></i><i></i>")); await wait(900 + Math.min(text.length * 15, 900));
    t.className = "msg " + (cls || ""); t.textContent = text; down();
  }
  function card(html, cls) { return add(el("div", "tcard " + (cls || ""), html)); }
  function btnWait(label, host) { return new Promise(function (res) {
    var b = el("button", "pill line", label); host.appendChild(b); b.onclick = function () { b.disabled = true; res(); }; }); }

  /* العداد */
  function pad(n) { return String(n).padStart(2, "0"); }
  function startCountdown(box) {
    function tick() {
      var d = Math.max(0, target - Date.now()), s = Math.floor(d / 1000);
      var v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      box.querySelectorAll("[data-v]").forEach(function (n, i) { var t = pad(v[i]); if (n.textContent !== t) { n.textContent = t; n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick"); } });
      var open = isOpen();
      box.querySelector(".status").textContent = open ? "المسار متاح" : "مسار مغلق مؤقتًا";
      box.querySelector(".status").className = "status st" + (open ? " live" : "");
      box.querySelector("[data-go]").textContent = open ? "اكتشف الوجهة" : "فتح المسار — 22 نوفمبر";
      box.classList.toggle("is-open", open);
    }
    tick(); setInterval(tick, 1000);
  }

  async function story() {
    await say("حياك الله! أنا عَدْل، مساعد نادي العدالة.\n\nيبدو أن النظام واجه مسارًا غير مألوف، وأنا أحاول الآن فهم ما حدث.");
    await say("خلني أراجع سجلات النادي وأشوف وين وصلنا…");
    await wait(500);
    /* المشهد الثالث */
    var tr = card('<div class="trk"><span class="no">01</span><span class="badge on"><i></i>الحالة: مسار قائم</span></div><h3>البطولة النيابية</h3><p>أكبر بطولة ترافع جزائي في المملكة.</p><button class="pill line" data-a>استكشاف المشروع</button>', "known");
    var un = card('<div class="trk"><span class="no q">؟</span><span class="badge"><i></i>الحالة: غير مكتشف</span></div><h3>مسار مجهول</h3><p>لا توجد بيانات مسجلة لهذا المسار.</p><button class="pill fill" data-b>اكتشاف المسار</button>', "unknown");
    tr.querySelector("[data-a]").onclick = function () {
      var c = card('<h3>البطولة النيابية</h3><p>' + CONFIG.championship + '</p><button class="pill line">عودة</button>');
      c.querySelector("button").onclick = function () { c.remove(); down(); }; sfx("tap");
    };
    un.querySelector("[data-b]").onclick = function () { un.querySelector("[data-b]").disabled = true; tr.querySelector("[data-a]").disabled = true; discover(); sfx("tap"); };
  }

  async function discover() {
    var stopScan = sfx("scan"); var s = card('<p>جارٍ البحث في سجلات النادي…</p><div class="bar"><i></i></div>'); await wait(2400); if (stopScan) stopScan();
    s.innerHTML = "<p>تعذّر العثور على بيانات لهذا المسار.</p><p class='st'>لم يتم تسجيل هذا المسار ضمن المشاريع السابقة للنادي.</p>";
    await wait(900);
    sfx("found"); await say("لحظة… هذا المسار جديد تمامًا!\n\nما سبق رصدناه ضمن مشاريع النادي، ويبدو أننا أمام وجهة مختلفة.");
    await say("تم اكتشاف مشروع جديد.\n\nلكن تفاصيل هذه الوجهة لم تُفتح بعد.", "sys");
    await wait(500); gate();
  }

  function ripple(b) {
    b.addEventListener("pointerdown", function (e) {
      var r = b.getBoundingClientRect(), s = document.createElement("span"); s.className = "rip";
      s.style.left = (e.clientX - r.left) + "px"; s.style.top = (e.clientY - r.top) + "px"; b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
    });
  }
  function gate() {
    var P = "M14 70C70 70 60 22 120 24S170 66 210 50S262 14 306 20";
    var svg = `<svg class="trail" viewBox="0 0 320 90" role="img" aria-label="خط مسار رفيع ينتهي بنقطة مضيئة" preserveAspectRatio="xMidYMid meet">
<defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#C9A66B" stop-opacity="0"/><stop offset=".25" stop-color="#C9A66B" stop-opacity=".8"/><stop offset="1" stop-color="#F3DFA8"/></linearGradient></defs>
<path d="${P}" fill="none" stroke="rgba(232,211,163,.22)" stroke-width="1" stroke-dasharray="2 6" stroke-linecap="round"/>
<path class="draw" d="${P}" fill="none" stroke="url(#tg)" stroke-width="1.6" stroke-linecap="round" pathLength="1"/>
<circle class="end" cx="306" cy="20" r="9" fill="none" stroke="#E8D3A3" stroke-width="1"/><circle cx="306" cy="20" r="3.6" fill="#F3DFA8"/>
<circle r="2.2" fill="#FFF6D8"><animateMotion dur="4s" repeatCount="indefinite" path="${P}"/></circle>
</svg>`;
    var g = card('<div class="gate"><p class="kick">مسار جديد قيد الاكتشاف</p>' + svg +
      '<span class="status st">مسار مغلق مؤقتًا</span><p class="lbl">موعد فتح المسار</p><div class="date">22 نوفمبر 2026</div>' +
      '<div class="cd"><div><b data-v>00</b><small>يوم</small></div><div><b data-v>00</b><small>ساعة</small></div><div><b data-v>00</b><small>دقيقة</small></div><div><b data-v>00</b><small>ثانية</small></div></div>' +
      '<p class="note">تفاصيل الوجهة ستُكشف عند فتح المسار.</p>' +
      '<button class="pill goBtn" data-go></button></div>', "gatec");
    startCountdown(g); ripple(g.querySelector("[data-go]"));
    g.querySelector("[data-go]").onclick = async function () {
      var b = this; b.disabled = true;
      if (!isOpen()) { sfx("gateDeny"); g.classList.add("deny"); setTimeout(function () { g.classList.remove("deny"); }, 600); await say("على مهلك! باقي على فتح المسار موعد محدد…\n\nنلتقي في 22 نوفمبر، وقتها بتكتشف وش ينتظرك."); }
      else { sfx("gateOpen"); card("<h3>" + CONFIG.destinationTitle + "</h3><p>" + CONFIG.destinationBody + "</p>", "known"); }
      b.disabled = false; next(g);
    };
  }
  var nextShown = false;
  function next(host) {
    if (nextShown) return; nextShown = true;
    var c = card('<button class="pill line">متابعة</button>'); c.querySelector("button").onclick = finale;
  }

  /* النهاية */
  var T = ["تم تغيير وجهتك!", "تعددت الطرق… والوجهة واحدة.", "هل أنت مستعد لما هو قادم؟", "22 نوفمبر", "قريبًا."];
  function finale() {
    ["e1", "e2", "e3", "e4", "e5"].forEach(function (id, i) { document.getElementById(id).textContent = T[i]; });
    $("#chat").hidden = true; $("#end").classList.add("on"); sfx("finale"); drawGrid();
  }
  function drawGrid() {
    var c = $("#grid"), x = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight; var t = 0;
    (function f() { if (!$("#end").classList.contains("on")) return; x.clearRect(0, 0, c.width, c.height); x.strokeStyle = "rgba(139,224,168,.18)"; x.lineWidth = 1;
      for (var i = 0; i < c.width; i += 48) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, c.height); x.stroke(); }
      for (var j = 0; j < c.height; j += 48) { x.beginPath(); x.moveTo(0, j); x.lineTo(c.width, j); x.stroke(); }
      x.strokeStyle = "rgba(139,224,168,.7)"; x.lineWidth = 3; x.setLineDash([14, 14]); x.lineDashOffset = -t; t += .6;
      x.beginPath(); x.moveTo(0, c.height * .85); x.bezierCurveTo(c.width * .3, c.height * .6, c.width * .6, c.height * .95, c.width, c.height * .55); x.stroke(); x.setLineDash([]);
      requestAnimationFrame(f); })();
  }
  $("#again").onclick = function () { location.reload(); };

  /* الخلل التمثيلي */
  var started = false;
  async function glitch() {
    if (started) return; started = true;
    document.body.classList.add("glitch"); sfx("glitch");
    await wait(900); $("#sys").hidden = false;
    await wait(2000); $("#sys").hidden = true;
    document.body.classList.remove("glitch"); document.body.classList.add("dim");
    $("#chat").hidden = false; sfx("appear"); story();
  }
  document.querySelectorAll("[data-fake]").forEach(function (b) { b.onclick = glitch; });
  setTimeout(glitch, 3500 + Math.random() * 1500);
})();
