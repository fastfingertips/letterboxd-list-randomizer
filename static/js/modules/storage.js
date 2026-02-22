export const getHistory = () => JSON.parse(localStorage.getItem('lb_history') || '[]');
export const getLists = () => JSON.parse(localStorage.getItem('lb_recent_lists') || '[]');

export const saveHistory = (data) => {
    const h = getHistory();
    const newHistory = [{...data, timestamp: Date.now()}, ...h].slice(0, 4);
    localStorage.setItem('lb_history', JSON.stringify(newHistory));
};

export const saveRecentLists = (urls) => {
    const l = getLists();
    urls.forEach(url => {
        if (!l.includes(url)) l.unshift(url);
    });
    localStorage.setItem('lb_recent_lists', JSON.stringify(l.slice(0, 5)));
};

export const clearHistory = () => localStorage.removeItem('lb_history');
export const clearRecentLists = () => localStorage.removeItem('lb_recent_lists');
