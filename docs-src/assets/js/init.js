(function () {
    'use strict';
    var root = document.documentElement, MODES = ['light', 'dark', 'auto'], THEMES = ['bootstrap', 'redmaterials'];
    var state = { mode: 'auto', theme: 'redmaterials' };
    try {
        state.mode = localStorage.getItem('docs-color-mode') || state.mode;
        state.theme = localStorage.getItem('docs-theme') || state.theme;
    } catch (e) { /* storage unavailable: defaults */ }
    if (MODES.indexOf(state.mode) < 0) { state.mode = 'auto'; }
    if (THEMES.indexOf(state.theme) < 0) { state.theme = 'redmaterials'; }

    function resolve(mode) {
        if (mode !== 'auto') { return mode; }
        return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function render() {
        root.setAttribute('data-bs-theme', resolve(state.mode));
        root.setAttribute('data-docs-theme', state.theme);
        var link = document.getElementById('redmaterials-css'); // must precede this script in <head>
        if (link) { link.disabled = state.theme === 'bootstrap'; }
    }
    function set(next) {
        if (next.mode && MODES.indexOf(next.mode) >= 0) { state.mode = next.mode; }
        if (next.theme && THEMES.indexOf(next.theme) >= 0) { state.theme = next.theme; }
        try { localStorage.setItem('docs-color-mode', state.mode); localStorage.setItem('docs-theme', state.theme); } catch (e) { /* ignore */ }
        render();
    }
    render();
    window.docsState = { get: function () { return { mode: state.mode, theme: state.theme }; }, set: set, render: render };

    if (window.matchMedia) {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (state.mode === 'auto') { render(); } });
    }
}());
