import { $, elements } from './dom.js';
import { createUrlField } from '../components/UrlField.js';
import { CONFIG } from '../constants.js';

let urlCount = 1;


export const setUrlCount = (val) => { urlCount = val; };
export const getUrlCount = () => urlCount;

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
    $('add-url-btn').classList.toggle('is-hidden', urlCount >= CONFIG.MAX_URLS);
};

export const addField = (callback, value = '') => {
    if (urlCount >= CONFIG.MAX_URLS) return null;

    const div = createUrlField(urlCount + 1, value);
    $('url-fields').appendChild(div);
    urlCount++;
    renumberFields();
    if (window.lucide) window.lucide.createIcons();

    const input = div.querySelector('input');
    input.addEventListener('input', callback);
    
    div.querySelector('.field__remove').addEventListener('click', () => { 
        if (urlCount > 1) {
            div.remove(); 
            urlCount--; 
            renumberFields();
        } else {
            input.value = '';
        }
        callback();
    });
    return input;
};
