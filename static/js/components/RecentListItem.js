export const createRecentListItem = (url, activeIndex) => {
    const isActive = activeIndex !== -1;
    return `
        <div class="history-item ${isActive ? 'is-active-list' : ''}" style="cursor: pointer;" data-url="${url}">
            <div class="history-item__body">
                <span class="history-item__name" style="font-size: 11px; font-family: monospace; opacity: 0.7;">${url}</span>
            </div>
            <div class="history-item__action" style="color: ${isActive ? 'var(--color-green)' : 'inherit'}; font-weight: 800; font-family: monospace; font-size: 10px;">
                ${isActive ? `<span class="icon-default">#${activeIndex + 1}</span><i data-lucide="minus" class="icon-hover"></i>` : '<i data-lucide="plus"></i>'}
            </div>
        </div>
    `;
};
