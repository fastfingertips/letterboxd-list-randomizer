export const $ = (id) => document.getElementById(id);

export const elements = {
    formArea: $('form-panel'),
    loadingArea: $('loading-panel'),
    resultArea: $('result-panel'),
    infoModal: $('info-modal'),
    slot: $('slot-text'),
    bar: $('bar-fill'),
    historyList: $('history-list'),
    resMovie: $('result-movie'),
    resMeta: $('result-meta'),
    resStars: $('result-stars'),
    resPoster: $('result-poster'),
    resLink: $('result-link'),
    statPool: $('stat-pool'),
    statProb: $('stat-prob'),
    statsModal: $('stats-modal'),
    statsBtn: $('stats-btn'),
    statsJson: $('stats-json'),
    copyStatsBtn: $('copy-stats-btn'),
    error: $('error-msg'),
    errorText: $('error-text')
};

export const setView = (view) => {
    elements.infoModal.classList.toggle('is-hidden', view !== 'info');
    elements.statsModal.classList.toggle('is-hidden', view !== 'stats');
    elements.formArea.classList.toggle('is-hidden', view !== 'form');
    elements.loadingArea.classList.toggle('is-hidden', view !== 'loading');
    elements.resultArea.classList.toggle('is-hidden', view !== 'result');
};


export const showError = (msg) => {
    elements.errorText.textContent = msg;
    elements.error.classList.add('is-active');
    if (window.errorTimeout) clearTimeout(window.errorTimeout);
    window.errorTimeout = setTimeout(() => {
        elements.error.classList.remove('is-active');
    }, 4000);
};

export const hideError = () => {
    elements.error.classList.remove('is-active');
};
