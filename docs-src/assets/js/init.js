(function () {
    'use strict';
    var root = document.documentElement, MODES = ['light', 'dark', 'auto'];
    var state = { mode: 'auto' };
    try {
        state.mode = localStorage.getItem('docs-color-mode') || state.mode;
    } catch (e) { /* storage unavailable: defaults */ }
    if (MODES.indexOf(state.mode) < 0) { state.mode = 'auto'; }

    function resolve(mode) {
        if (mode !== 'auto') { return mode; }
        return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function render() {
        var resolved = resolve(state.mode);
        root.setAttribute('data-bs-theme', resolved);
        root.style.scrollBehavior = 'auto'; // no animated scrolling between sections (Bootstrap's reboot smooths it)
        var hl = document.getElementById('hljs-light'), hd = document.getElementById('hljs-dark');
        if (hl && hd) { hl.disabled = resolved === 'dark'; hd.disabled = resolved !== 'dark'; }
    }
    function set(next) {
        if (next.mode && MODES.indexOf(next.mode) >= 0) { state.mode = next.mode; }
        try { localStorage.setItem('docs-color-mode', state.mode); } catch (e) { /* ignore */ }
        render();
    }
    render();
    window.docsState = { get: function () { return { mode: state.mode }; }, set: set, render: render };

    if (window.matchMedia) {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (state.mode === 'auto') { render(); } });
    }
}());
