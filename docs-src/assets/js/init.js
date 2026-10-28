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
    function broadcast() {
        document.querySelectorAll('iframe.docs-demo').forEach(function (f) {
            try { f.contentWindow.postMessage({ type: 'docs-state', mode: state.mode, theme: state.theme }, '*'); } catch (e) { /* ignore */ }
        });
    }
    function set(next) {
        if (next.mode && MODES.indexOf(next.mode) >= 0) { state.mode = next.mode; }
        if (next.theme && THEMES.indexOf(next.theme) >= 0) { state.theme = next.theme; }
        try { localStorage.setItem('docs-color-mode', state.mode); localStorage.setItem('docs-theme', state.theme); } catch (e) { /* ignore */ }
        render();
        broadcast();
    }
    render();
    window.docsState = { get: function () { return { mode: state.mode, theme: state.theme }; }, set: set, render: render, broadcast: broadcast };

    // A demo frame takes its state from its parent: localStorage may not be shared between file:// pages.
    window.addEventListener('message', function (e) {
        var d = e.data;
        if (e.source !== window.parent || !d || d.type !== 'docs-state') { return; }
        if (MODES.indexOf(d.mode) >= 0) { state.mode = d.mode; }
        if (THEMES.indexOf(d.theme) >= 0) { state.theme = d.theme; }
        render();
    });
    // Tell the parent this frame is ready, so a frame that finished loading before the parent attached listeners
    // still receives the current state.
    if (window.parent !== window) { try { window.parent.postMessage({ type: 'docs-ready' }, '*'); } catch (e) { /* ignore */ } }

    // The parent answers a frame's ready message with the current state.
    window.addEventListener('message', function (e) {
        if (!e.data || e.data.type !== 'docs-ready') { return; }
        var frames = document.querySelectorAll('iframe.docs-demo');
        for (var i = 0; i < frames.length; i++) { if (frames[i].contentWindow === e.source) { broadcast(); return; } }
    });
    if (window.matchMedia) {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (state.mode === 'auto') { render(); } });
    }
}());
