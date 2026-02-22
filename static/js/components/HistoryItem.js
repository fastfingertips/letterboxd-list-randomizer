export const createHistoryItem = (item, formatTimeFn) => {
    return `
        <a href="${item.movie.url}" target="_blank" class="history-item">
            <div class="history-item__body">
                <span class="history-item__name">${item.movie.name}</span>
                <div class="history-item__sub">
                    <span>${item.movie.year || ''}</span>
                    <span>${item.list.title}</span>
                    <span>${formatTimeFn(item.timestamp)}</span>
                </div>
            </div>
            <div style="opacity: 0.3; font-size: 10px;">→</div>
        </a>
    `;
};
