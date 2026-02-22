import { $, elements, setView, showError, hideError } from './modules/dom.js';
import { renderHistory, renderResult } from './modules/ui.js';

import { saveHistory, saveRecentLists, clearHistory, clearRecentLists } from './modules/storage.js';
import { addField, renumberFields, getUrlCount, setUrlCount } from './modules/fields.js';
import { checkUrlParams } from './modules/utils.js';
import { CONFIG } from './constants.js';

let bgIntervals = { slot: null, prg: null };
let currentUrlsForRetry = [];

// --- Global UI Logic ---

const updateUI = () => {
    renderHistory(handleUseList);
};

const handleUseList = (url) => {
    const inputs = Array.from($('randomize-form').querySelectorAll('input'));
    const existingInput = inputs.find(i => i.value.trim() === url);

    if (existingInput) {
        if (inputs.length > 1) {
            existingInput.closest('.field').remove();
            setUrlCount(getUrlCount() - 1);
            renumberFields();
        } else {
            existingInput.value = '';
        }
    } else {
        const emptyInput = inputs.find(i => i.value === '');
        if (emptyInput) {
            emptyInput.value = url;
        } else if (getUrlCount() < CONFIG.MAX_URLS) {
            addField(updateUI, url);
        } else {
            inputs[0].value = url;
        }
    }
    updateUI();
};

// --- API Execution ---

export const performRandomize = async (urls) => {
    currentUrlsForRetry = urls;
    const submitBtn = elements.formArea.querySelector('button[type="submit"]');
    const resultBtns = elements.resultArea.querySelectorAll('.action-btn');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    resultBtns.forEach(btn => { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; });
    elements.bar.style.width = '0%';
    setView('loading');
    
    let p = 0; let msgIdx = 0;
    elements.slot.textContent = CONFIG.LOADING_MESSAGES[0];
    
    bgIntervals.slot = setInterval(() => {
        if (msgIdx < CONFIG.LOADING_MESSAGES.length - 1) {
            msgIdx++;
            elements.slot.textContent = CONFIG.LOADING_MESSAGES[msgIdx];
        }
    }, CONFIG.ANIMATION.SLOT_INTERVAL_MS);

    bgIntervals.prg = setInterval(() => {
        if (p < 90) elements.bar.style.width = `${p += (100 - p) * 0.05}%`;
        else clearInterval(bgIntervals.prg);
    }, CONFIG.ANIMATION.PROGRESS_INTERVAL_MS);

    let attempts = 0;

    try {
        while (attempts <= CONFIG.MAX_RETRIES) {
            try {
                const res = await fetch(CONFIG.API_ENDPOINT, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ urls }) 
                });


                let data;
                if (res.headers.get("content-type")?.includes("application/json")) {
                    data = await res.json();
                    if (!res.ok) throw { userFacing: res.status < 500, message: data.error || 'Request failed' };
                } else {
                    throw { userFacing: false, message: `Server error: ${res.status === 504 ? 'Timeout' : res.status}` };
                }
                
                clearInterval(bgIntervals.slot);
                clearInterval(bgIntervals.prg);

                elements.bar.style.width = '100%';
                await new Promise(r => setTimeout(r, 400));

                renderResult(data);
                setView('result');
                
                saveHistory(data);

                saveRecentLists(urls);
                updateUI();
                return;

            } catch (err) {
                if (err.userFacing || attempts >= CONFIG.MAX_RETRIES) {
                    clearInterval(bgIntervals.slot);
                    clearInterval(bgIntervals.prg);
                    setView('form');
                    showError(err.message || 'Connection unstable');
                    break;
                }
                attempts++;
                const originalText = elements.slot.textContent;
                elements.slot.textContent = 'RETRYING...';
                elements.slot.style.color = '#ff9500';
                await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS));
                elements.slot.style.color = '';
                elements.slot.textContent = originalText;
            }
        }
    } catch (err) {
        console.error('[FATAL]', err);
        showError('A fatal error occurred.');
    } finally {

        submitBtn.disabled = false;

        submitBtn.textContent = 'Spin the wheel';
        resultBtns.forEach(btn => { btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; });
    }
};

// --- Listeners & Boots ---

$('add-url-btn').addEventListener('click', () => addField(updateUI));

$('remove-url-1').addEventListener('click', () => {
    if (getUrlCount() > 1) {
        $('remove-url-1').closest('.field').remove();
        setUrlCount(getUrlCount() - 1);
        renumberFields();
    } else {
        $('url-1').value = '';
    }
    updateUI();
});

$('url-1').addEventListener('input', () => updateUI());

$('info-btn').addEventListener('click', () => setView('info'));
$('close-modal-btn').addEventListener('click', () => setView('form'));
elements.infoModal.addEventListener('click', (e) => { 
    if(e.target === elements.infoModal) setView('form'); 
});

$('clear-history').addEventListener('click', () => { clearHistory(); updateUI(); });
$('clear-lists').addEventListener('click', () => { clearRecentLists(); updateUI(); });

elements.statsBtn.addEventListener('click', () => {
    if (window.lastResultData) {
        elements.statsJson.textContent = JSON.stringify(window.lastResultData, null, 2);
        setView('stats');
    }
});

$('close-stats-btn').addEventListener('click', () => setView('result'));
elements.statsModal.addEventListener('click', (e) => { 
    if(e.target === elements.statsModal) setView('result'); 
});

elements.copyStatsBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.statsJson.textContent).then(() => {
        const originalText = elements.copyStatsBtn.innerHTML;
        elements.copyStatsBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            elements.copyStatsBtn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    });
});

$('randomize-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const urls = Array.from($('randomize-form').querySelectorAll('input'))
        .map(i => i.value.trim())
        .filter(v => v !== '');
    
    if (urls.length === 0) {
        showError("Please paste at least one list URL to continue.");
        return;
    }
    await performRandomize(urls);
});

$('try-again-btn').addEventListener('click', () => performRandomize(currentUrlsForRetry));
$('back-btn').addEventListener('click', () => setView('form'));

// Init
updateUI();
checkUrlParams((urls) => performRandomize(urls));
if (window.lucide) window.lucide.createIcons();
