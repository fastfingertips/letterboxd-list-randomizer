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
    
    // UI Loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    resultBtns.forEach(btn => { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; });
    elements.bar.style.width = '0%';
    setView('loading');
    
    let p = 0;
    bgIntervals.prg = setInterval(() => {
        if (p < 95) elements.bar.style.width = `${p += (100 - p) * 0.05}%`;
        else clearInterval(bgIntervals.prg);
    }, CONFIG.ANIMATION.PROGRESS_INTERVAL_MS);

    try {
        const startTime = Date.now();

        // 1. Fetch Metadata (Honest Progress)
        elements.slot.textContent = CONFIG.LOADING_MESSAGES[1];
        const metaRes = await fetch('/api/metadata', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ urls }) 
        });
        
        if (!metaRes.ok) {
            const text = await metaRes.text();
            let errorMessage = 'Metadata failed';
            try { 
                const errData = JSON.parse(text); 
                errorMessage = errData.error || errorMessage;
            } catch(e) { 
                errorMessage = `Server Error (${metaRes.status})`; 
            }
            throw { userFacing: true, message: errorMessage };
        }
        const metaData = await metaRes.json();
        
        // 2. Selection (Honest Progress)
        elements.slot.textContent = CONFIG.LOADING_MESSAGES[2];
        const selectRes = await fetch('/api/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lists: metaData.lists, total: metaData.total })
        });
        
        if (!selectRes.ok) {
            const text = await selectRes.text();
            let errorMessage = 'Selection failed';
            try { 
                const errData = JSON.parse(text); 
                errorMessage = errData.error || errorMessage;
            } catch(e) { 
                errorMessage = `Server Error (${selectRes.status})`; 
            }
            throw { userFacing: true, message: errorMessage };
        }
        const selectData = await selectRes.json();
        
        // 3. Details (Honest Progress)
        elements.slot.textContent = CONFIG.LOADING_MESSAGES[3];
        const detailRes = await fetch('/api/details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: selectData.meta.slug })
        });
        
        if (!detailRes.ok) {
            const text = await detailRes.text();
            let errorMessage = 'Details failed';
            try { 
                const errData = JSON.parse(text); 
                errorMessage = errData.error || errorMessage;
            } catch(e) { 
                errorMessage = `Server Error (${detailRes.status})`; 
            }
            throw { userFacing: true, message: errorMessage };
        }
        const detailData = await detailRes.json();


        // 4. Finalizing
        elements.slot.textContent = CONFIG.LOADING_MESSAGES[4];
        clearInterval(bgIntervals.prg);
        elements.bar.style.width = '100%';
        await new Promise(r => setTimeout(r, 400));

        // Assemble final data for rendering
        const totalDuration = (Date.now() - startTime) / 1000;
        const probability = (1 / metaData.total) * 100;

        const finalData = {
            movie: detailData.movie,
            list: selectData.list,
            stats: {
                total_pool: metaData.total,
                probability: probability < 0.01 ? probability.toFixed(4) : probability.toFixed(2),
                timing: { total: `${totalDuration.toFixed(2)}s` }
            }
        };

        renderResult(finalData);
        setView('result');
        saveHistory(finalData);
        saveRecentLists(urls);
        updateUI();

    } catch (err) {
        clearInterval(bgIntervals.prg);
        setView('form');
        showError(err.message || 'Processing failed');
        console.error('[FATAL]', err);
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
