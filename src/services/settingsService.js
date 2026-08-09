// Settings & Preferences Service
// Extracted and modularized from legacy.js

import { showToast } from './utils.js';

export function getCustomButtonsData() {
    try {
        const stored = localStorage.getItem('customButtons');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to parse customButtons', e);
    }
    return [{ name: '', url: '', hidden: false }];
}

export function updateCustomDashboardBtn() {
    const btn = document.getElementById('custom-dashboard-btn');
    const btnText = document.getElementById('custom-dashboard-btn-text');
    if (!btn || !btnText) return;
    const btnData = getCustomButtonsData()[0] || { name: '', url: '', hidden: false };
    
    if (btnData.hidden || !btnData.name || !btnData.name.trim()) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'inline-flex';
        btnText.textContent = btnData.name;
        btn.title = btnData.name;
        btn.onclick = null;
        
        if (btnData.url) {
            try {
                new URL(btnData.url);
                btn.href = btnData.url;
            } catch {
                btn.href = '#';
                btn.onclick = (e) => e.preventDefault();
            }
        } else {
            btn.href = '#';
            btn.onclick = (e) => e.preventDefault();
        }
    }
}

export function openSettingsModal() {
    const skipTimeInput = document.getElementById('settings-skip-time');
    const playbackSpeedInput = document.getElementById('settings-playback-speed');
    const autoplayPromptInput = document.getElementById('settings-autoplay-prompt');
    const smartSkipCountInput = document.getElementById('settings-smart-skip-count');
    const smartSkipMinInput = document.getElementById('settings-smart-skip-min');
    const smartSkipSecInput = document.getElementById('settings-smart-skip-sec');
    const customBtnNameInput = document.getElementById('settings-custom-btn-name');
    const customBtnUrlInput = document.getElementById('settings-custom-btn-url');
    const customBtnHideInput = document.getElementById('settings-custom-btn-hide');
    const settingsModalOverlay = document.getElementById('settings-modal-overlay');

    if (skipTimeInput) skipTimeInput.value = localStorage.getItem('defaultSkipTime') || '5';
    if (playbackSpeedInput) playbackSpeedInput.value = localStorage.getItem('defaultPlaybackSpeed') || '1.75';
    if (autoplayPromptInput) autoplayPromptInput.value = localStorage.getItem('defaultAutoplayPrompt') || '3';
    
    if (smartSkipCountInput) smartSkipCountInput.value = localStorage.getItem('smartSkipCount') || '7';
    if (smartSkipMinInput) smartSkipMinInput.value = localStorage.getItem('smartSkipMin') || '5';
    if (smartSkipSecInput) smartSkipSecInput.value = localStorage.getItem('smartSkipSec') || '0';
    
    const btnData = getCustomButtonsData()[0] || { name: '', url: '', hidden: false };
    if (customBtnNameInput) customBtnNameInput.value = btnData.name;
    if (customBtnUrlInput) customBtnUrlInput.value = btnData.url;
    if (customBtnHideInput) customBtnHideInput.checked = btnData.hidden;
    
    if (settingsModalOverlay) settingsModalOverlay.classList.remove('hidden');
}

export function saveSettings() {
    const currentSkipTimeInput = document.getElementById('settings-skip-time');
    const currentPlaybackSpeedInput = document.getElementById('settings-playback-speed');
    const currentAutoplayPromptInput = document.getElementById('settings-autoplay-prompt');
    const settingsModalOverlay = document.getElementById('settings-modal-overlay');
    
    if (currentSkipTimeInput) localStorage.setItem('defaultSkipTime', currentSkipTimeInput.value);
    const speed = currentPlaybackSpeedInput ? (parseFloat(currentPlaybackSpeedInput.value) || 1.75) : 1.75;
    localStorage.setItem('defaultPlaybackSpeed', speed);
    if (currentAutoplayPromptInput) localStorage.setItem('defaultAutoplayPrompt', currentAutoplayPromptInput.value);
    
    if (typeof window !== 'undefined') {
        window.activePlaybackRate = speed;
        if (window.videoPlayer) window.videoPlayer.playbackRate = speed;
        if (window.speedBtn) window.speedBtn.textContent = `${speed}x`;
    }
    
    const smartSkipCountInput = document.getElementById('settings-smart-skip-count');
    const smartSkipMinInput = document.getElementById('settings-smart-skip-min');
    const smartSkipSecInput = document.getElementById('settings-smart-skip-sec');
    if (smartSkipCountInput) localStorage.setItem('smartSkipCount', smartSkipCountInput.value);
    if (smartSkipMinInput) localStorage.setItem('smartSkipMin', smartSkipMinInput.value);
    if (smartSkipSecInput) localStorage.setItem('smartSkipSec', smartSkipSecInput.value);
    
    // Custom Button logic
    const customBtnNameInput = document.getElementById('settings-custom-btn-name');
    const customBtnUrlInput = document.getElementById('settings-custom-btn-url');
    const customBtnHideInput = document.getElementById('settings-custom-btn-hide');
    
    if (customBtnNameInput && customBtnUrlInput && customBtnHideInput) {
        let name = customBtnNameInput.value.trim();
        let url = customBtnUrlInput.value.trim();
        const hidden = customBtnHideInput.checked;
        
        if (name) {
            if (url && !/^https?:\/\//i.test(url) && !url.toLowerCase().startsWith('javascript:') && !url.toLowerCase().startsWith('data:')) {
                url = 'https://' + url;
            }
            if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
                url = ''; // Prevent unsafe schemes
            }
            
            const newBtnData = [{ name, url, hidden }];
            localStorage.setItem('customButtons', JSON.stringify(newBtnData));
            updateCustomDashboardBtn();
        }
    }
    
    if (settingsModalOverlay) settingsModalOverlay.classList.add('hidden');
    showToast('Settings Saved');
}

export function initSettingsListeners() {
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
    updateCustomDashboardBtn();
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.getCustomButtonsData = getCustomButtonsData;
    window.updateCustomDashboardBtn = updateCustomDashboardBtn;
    window.openSettingsModal = openSettingsModal;
    window.saveSettings = saveSettings;
    window.initSettingsListeners = initSettingsListeners;
}
