import { $, elements, setView, showError, hideError } from './modules/dom.js';
import { renderHistory } from './modules/ui.js';
import { saveHistory, saveRecentLists, clearHistory, clearRecentLists } from './modules/storage.js';
import { createUrlField } from './components/UrlField.js';

let urlCount = 1;

// --- Loading Animation State ---
const loadingMessages = [
    "CONNECTING TO LETTERBOXD",
    "FETCHING LIST METADATA",
    "SELECTING RANDOM MOVIE FROM LIST",
    "FETCHING FILM DETAILS (POSTER & RATING)",
    "FINALIZING CANDIDATE"
];
let bgIntervals = { slot: null, prg: null };

// --- Field Management ---
export const renumberFields = () => {
    const fields = $('url-fields').querySelectorAll('.field');
    fields.forEach((field, i) => {
        field.querySelector('.field__number').textContent = i + 1;
        const input = field.querySelector('input');
        if (i === 0) {
            field.classList.remove('is-optional');
            input.placeholder = "Paste your list URL here…";
        } else {
            field.classList.add('is-optional');
            input.placeholder = "(Optional) Another list URL…";
        }
    });
    $('add-url-btn').classList.toggle('is-hidden', urlCount >= 5);
};

export const addField = (value = '') => {
    if (urlCount >= 5) return null;
    const div = createUrlField(urlCount + 1, value);
    $('url-fields').appendChild(div);
    urlCount++;
    renumberFields();
    if (window.lucide) window.lucide.createIcons();
    const input = div.querySelector('input');
    input.addEventListener('input', () => updateUI());
    div.querySelector('.field__remove').addEventListener('click', () => { 
        if (urlCount > 1) {
            div.remove(); 
            urlCount--; 
            renumberFields();
        } else {
            input.value = '';
        }
        updateUI();
    });
    return input;
};

// Use List action (called from UI item click)
const handleUseList = (url) => {
    const inputs = Array.from($('randomize-form').querySelectorAll('input'));
    const existingInput = inputs.find(i => i.value.trim() === url);

    if (existingInput) {
        // Toggle off if it exists
        if (inputs.length > 1) {
            existingInput.closest('.field').remove();
            urlCount--;
        } else {
            existingInput.value = '';
        }
    } else {
        // Find empty slot or add new
        const emptyInput = inputs.find(i => i.value === '');
        if (emptyInput) {
            emptyInput.value = url;
        } else if (urlCount < 5) {
            addField(url);
        } else {
            inputs[0].value = url;
        }
    }
    updateUI();
};

const updateUI = () => {
    renderHistory(handleUseList);
};

// --- Initialization ---

// Setup core listeners
$('add-url-btn').addEventListener('click', () => addField());

$('remove-url-1').addEventListener('click', () => {
    if (urlCount > 1) {
        $('remove-url-1').closest('.field').remove();
        urlCount--;
        renumberFields();
    } else {
        $('url-1').value = '';
    }
    updateUI();
});

$('url-1').addEventListener('input', () => updateUI());

$('info-btn').addEventListener('click', () => elements.infoModal.classList.remove('is-hidden'));
$('close-modal-btn').addEventListener('click', () => elements.infoModal.classList.add('is-hidden'));
elements.infoModal.addEventListener('click', (e) => { 
    if(e.target === elements.infoModal) elements.infoModal.classList.add('is-hidden'); 
});

$('clear-history').addEventListener('click', () => { clearHistory(); updateUI(); });
$('clear-lists').addEventListener('click', () => { clearRecentLists(); updateUI(); });

// Technical Stats Modal Listeners
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
    const text = elements.statsJson.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = elements.copyStatsBtn.innerHTML;
        elements.copyStatsBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            elements.copyStatsBtn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    });
});

// Reset state when typing
$('randomize-form').addEventListener('input', () => {
    updateUI();
    hideError();
});


// --- The Core API Logic ---
let currentUrlsForRetry = [];

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
    
    let p = 0; let msgIdx = 0;
    elements.slot.textContent = loadingMessages[0];
    
    bgIntervals.slot = setInterval(() => {
        if (msgIdx < loadingMessages.length - 1) {
            msgIdx++;
            elements.slot.textContent = loadingMessages[msgIdx];
        }
    }, 800);

    bgIntervals.prg = setInterval(() => {
        if (p < 90) elements.bar.style.width = `${p += (100 - p) * 0.05}%`;
        else clearInterval(bgIntervals.prg);
    }, 100);

    const maxRetries = 2;
    let attempts = 0;

    try {
        while (attempts <= maxRetries) {
            try {
                const res = await fetch('/api', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ urls }) 
                });

                let data;
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    data = await res.json();
                    if (!res.ok) {
                        // 4xx = user error (no retry), 5xx = server/connection issue (retry)
                        throw { userFacing: res.status < 500, message: data.error || 'Request failed' };
                    }
                } else {
                    // Connection/server errors (504, etc.) → retry
                    const reason = res.status === 504 ? 'Gateway Timeout' : `HTTP ${res.status}`;
                    throw { userFacing: false, message: `Server error: ${reason}` };
                }
                
                clearInterval(bgIntervals.slot);
                clearInterval(bgIntervals.prg);

                elements.bar.style.width = '100%';
                await new Promise(r => setTimeout(r, 400));

                // Show result
                elements.resMovie.textContent = data.movie.name;
                elements.resMeta.innerHTML = `<strong>${data.movie.year || ''}</strong> from ${data.list.title}`;
                elements.resLink.href = data.movie.url;
                
                // Show stars/rating if available
                if (data.movie.rating) {
                    const rating = parseFloat(data.movie.rating);
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        if (rating >= i) {
                            starsHtml += '<i data-lucide="star" class="star-full"></i>';
                        } else if (rating >= i - 0.5) {
                            starsHtml += '<i data-lucide="star-half" class="star-half"></i>';
                        } else {
                            starsHtml += '<i data-lucide="star" style="opacity: 0.2;"></i>';
                        }
                    }
                    elements.resStars.innerHTML = `${starsHtml} <span class="result-rating-num">${rating.toFixed(2)}</span>`;
                    if (window.lucide) window.lucide.createIcons();
                    elements.resStars.classList.remove('is-hidden');
                } else {
                    elements.resStars.classList.add('is-hidden');
                }

                // Show poster if available
                if (data.movie.poster) {
                    elements.resPoster.src = data.movie.poster;
                    elements.resPoster.classList.remove('is-hidden');
                } else {
                    elements.resPoster.src = '';
                    elements.resPoster.classList.add('is-hidden');
                }
                
                // Show statistics
                elements.statPool.textContent = data.stats.total_pool.toLocaleString();
                elements.statProb.textContent = data.stats.probability;

                // Technical Logs Cache
                window.lastResultData = {
                    movie: data.movie.name,
                    slug: data.movie.slug,
                    rating: data.movie.rating,
                    stats: data.stats
                };

                setView('result');
                
                // Save Context
                saveHistory(data);
                saveRecentLists(urls);
                updateUI();
                return; // Success!

            } catch (err) {
                // Only retry if it's a server/connection error and we have attempts left
                if (err.userFacing || attempts >= maxRetries) {
                    clearInterval(bgIntervals.slot);
                    clearInterval(bgIntervals.prg);
                    setView('form');

                    if (err.userFacing) {
                        showError(err.message);
                    } else {
                        console.error('[MovieRoulette] Final attempt failed:', err.message || err);
                        showError('Connection unstable. Please try once more in a few seconds.');
                    }
                    break;
                }

                attempts++;
                console.warn(`[MovieRoulette] Attempt ${attempts} failed. Retrying...`, err.message);
                
                // Visual feedback for retry
                const originalText = elements.slot.textContent;
                elements.slot.textContent = 'RETRYING...';
                elements.slot.style.color = '#ff9500'; // Amber alert color
                
                await new Promise(r => setTimeout(r, 1200));
                
                elements.slot.style.color = ''; // Reset color
                elements.slot.textContent = originalText;
            }
        }
    } finally {
        // Reset buttons regardless of outcome
        submitBtn.disabled = false;
        submitBtn.textContent = 'Spin the wheel';
        resultBtns.forEach(btn => { btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; });
    }
};

// --- Form Submissions ---
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

// Boot
updateUI();

// --- URL Parameter Initialization ---
const checkUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const providedUrls = new Set();
    
    ['url', 'urls', 'list', 'lists'].forEach(key => {
        params.getAll(key).forEach(val => {
            val.split(',').forEach(v => {
                if (v.trim()) providedUrls.add(v.trim());
            });
        });
    });

    const urlsToRun = Array.from(providedUrls).slice(0, 5);
    
    if (urlsToRun.length > 0) {
        const inputs = Array.from($('randomize-form').querySelectorAll('input'));
        
        urlsToRun.forEach((url, index) => {
            if (index === 0) {
                inputs[0].value = url;
            } else {
                addField(url);
            }
        });
        
        updateUI();
        
        // Clean up URL to prevent accidental re-runs on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Auto trigger the wheel logic
        performRandomize(urlsToRun);
    }
};

checkUrlParams();

// Initial icon render
if (window.lucide) window.lucide.createIcons();

