import { $, elements } from './dom.js';
import { getHistory, getLists } from './storage.js';
import { createHistoryItem } from '../components/HistoryItem.js';
import { createRecentListItem } from '../components/RecentListItem.js';

const formatTime = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const renderHistory = (useListCallback) => {
    const hist = getHistory();
    const lists = getLists();
    
    // Toggle grid visibility if anything exists
    $('history-grid').classList.toggle('is-hidden', hist.length === 0 && lists.length === 0);
    
    $('history-section').classList.toggle('is-hidden', hist.length === 0);
    elements.historyList.innerHTML = hist.map(item => createHistoryItem(item, formatTime)).join('');

    const currentInputs = Array.from($('randomize-form').querySelectorAll('input')).map(i => i.value.trim());
    const listSection = $('recent-lists-section');
    const listTarget = $('recent-lists-list');
    listSection.classList.toggle('is-hidden', lists.length === 0);
    
    // Build lists HTML first
    listTarget.innerHTML = lists.map(url => {
        const activeIndex = currentInputs.indexOf(url);
        return createRecentListItem(url, activeIndex);
    }).join('');

    // Attach event listeners instead of inline onclick handlers
    const listItems = listTarget.querySelectorAll('.history-item');
    listItems.forEach(item => {
        item.addEventListener('click', () => {
            useListCallback(item.getAttribute('data-url'));
        });
    });

    if (window.lucide) window.lucide.createIcons();
};
