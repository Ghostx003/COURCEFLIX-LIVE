import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeView from './components/views/HomeView';
import DashboardViewElView from './components/views/DashboardViewElView';
import GoalsView from './components/views/GoalsView';
import PlanView from './components/views/PlanView';
import ProgressView from './components/views/ProgressView';
import SubcourseView from './components/views/SubcourseView';
import UploadView from './components/views/UploadView';
import FilterResultsView from './components/views/FilterResultsView';
import DppUploadView from './components/views/DppUploadView';
import ReviewView from './components/views/ReviewView';
import PracticeView from './components/views/PracticeView';
import DppView from './components/views/DppView';
import IntellView from './components/views/IntellView';
import NotesView from './components/views/NotesView';
import DoubtsView from './components/views/DoubtsView';
import ContinueView from './components/views/ContinueView';
import HistoryView from './components/views/HistoryView';
import SearchResultsView from './components/views/SearchResultsView';
import PlayerView from './components/views/PlayerView';
import FacultyView from './components/views/FacultyView';
import ContactView from './components/views/ContactView';
import CompletionCalculatorModalModal from './components/modals/CompletionCalculatorModalModal';
import CompletionModal from './components/modals/CompletionModal';
import ModalOverlayModal from './components/modals/ModalOverlayModal';
import ImportModalOverlayModal from './components/modals/ImportModalOverlayModal';
import CustomCourseCreatorModal from './components/modals/CustomCourseCreatorModal';
import { initSettingsListeners } from './services/settingsService';
import './index.css';

export default function App() {
  useEffect(() => {
    initSettingsListeners();

    if (window.initCourseFlix) {
      window.initCourseFlix();
    }

    window.scrollTo(0, 0);

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openGlobalSearchShortcut === 'function') {
          window.openGlobalSearchShortcut();
        }
      } else if (e.key === 'Escape' || e.code === 'Escape') {
        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'search-results-view') {
          e.preventDefault();
          if (typeof window.closeSearchAndReturnToOrigin === 'function') {
            window.closeSearchAndReturnToOrigin();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);


  return (
    <>
      <Navbar />
      <HomeView />
      <DashboardViewElView />
      <GoalsView />
      <PlanView />
      <ProgressView />
      <SubcourseView />
      <UploadView />
      <FilterResultsView />
      <DppUploadView />
      <ReviewView />
      <PracticeView />
      <DppView />
      <IntellView />
      <NotesView />
      <DoubtsView />
      <ContinueView />
      <HistoryView />
      <SearchResultsView />
      <PlayerView />
      <FacultyView />
      <ContactView />
      <CompletionCalculatorModalModal />
      <CompletionModal />
      <ModalOverlayModal />
      <ImportModalOverlayModal />
      <CustomCourseCreatorModal />
      {/* Remaining fragments */}
      <div id="legacy-fragments">
        {/* Doubt Full Overlay */}
    <div id="doubt-full-overlay" className="hidden">
        <div className="doubt-full-left">
            <img id="doubt-full-img" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Doubt Screenshot" />
        </div>
        <div className="doubt-full-right">
            <h3 id="doubt-full-title">Doubt Notes</h3>
            <textarea id="doubt-full-text" placeholder="Write any extra details or thoughts about this doubt..."></textarea>
            <button id="doubt-save-btn" className="doubt-save-btn">Save Changes</button>
        </div>
    </div>

    

    

    

    <div id="settings-modal-overlay" className="modal-overlay hidden" style={{"zIndex":"99999"}}>
        <div className="modal-content" style={{"maxWidth":"440px","width":"92%","color":"var(--text-primary)","borderRadius":"16px","padding":"20px"}}>
            <button className="close-modal-btn" onClick={() => { document.getElementById('settings-modal-overlay').classList.add('hidden') }} style={{"position":"absolute","top":"1rem","right":"1rem","background":"none","border":"none","fontSize":"1.5rem","color":"var(--text-secondary)","cursor":"pointer"}} title="Close">&times;</button>
            <h2 style={{"marginBottom":"0.8rem","color":"var(--accent-primary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"0.5rem","display":"flex","alignItems":"center","gap":"8px"}}>
                <i className="fas fa-sliders"></i> Settings
            </h2>
            <div style={{"display":"flex","flexDirection":"column","gap":"1rem","paddingBottom":"0.5rem","maxHeight":"78vh","overflowY":"auto","paddingRight":"4px"}}>
                {/* Theme & Color Palette Section */}
                <div style={{"background":"var(--glass-bg)","padding":"12px","borderRadius":"12px","border":"1px solid var(--border-secondary)"}}>
                    <h3 style={{"fontSize":"0.95rem","color":"var(--accent-primary)","margin":"0 0 4px 0","display":"flex","alignItems":"center","gap":"6px","fontWeight":"700"}}>
                        <i className="fas fa-palette"></i> Color Palette & Theme
                    </h3>
                    <p style={{"fontSize":"0.76rem","color":"var(--text-secondary)","margin":"0 0 10px 0","lineHeight":"1.3"}}>
                        Select a palette to update buttons, glows, badges & background ambient mesh across the app.
                    </p>
                    <div className="palette-grid" style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"8px","marginBottom":"10px"}}>
                        <button type="button" className="palette-btn" data-palette-val="emerald" title="Emerald Wave" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #10b981 0%, #059669 100%)","boxShadow":"0 0 10px rgba(16, 185, 129, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Emerald</span>
                        </button>
                        <button type="button" className="palette-btn" data-palette-val="violet" title="Violet Amethyst" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)","boxShadow":"0 0 10px rgba(139, 92, 246, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Violet</span>
                        </button>
                        <button type="button" className="palette-btn" data-palette-val="blue" title="Ocean Sapphire" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)","boxShadow":"0 0 10px rgba(59, 130, 246, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Blue</span>
                        </button>
                        <button type="button" className="palette-btn" data-palette-val="red" title="Ruby Crimson" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)","boxShadow":"0 0 10px rgba(239, 68, 68, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Ruby Red</span>
                        </button>
                        <button type="button" className="palette-btn" data-palette-val="amber" title="Golden Amber" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)","boxShadow":"0 0 10px rgba(245, 158, 11, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Amber</span>
                        </button>
                        <button type="button" className="palette-btn" data-palette-val="rose" title="Neon Rose" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #ec4899 0%, #be185d 100%)","boxShadow":"0 0 10px rgba(236, 72, 153, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Rose</span>
                        </button>
                        <button type="button" className="palette-btn" data-palette-val="cyan" title="Cyber Cyan" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","padding":"8px 4px","borderRadius":"10px","background":"var(--bg-tertiary)","border":"2px solid transparent","cursor":"pointer","transition":"all 0.2s ease"}}>
                            <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)","boxShadow":"0 0 10px rgba(6, 182, 212, 0.5)","display":"inline-block"}}></span>
                            <span style={{"fontSize":"0.72rem","fontWeight":"700","color":"var(--text-primary)"}}>Cyan</span>
                        </button>
                    </div>

                    <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","background":"var(--bg-tertiary)","padding":"8px 10px","borderRadius":"10px","border":"1px solid var(--border-primary)"}}>
                        <span style={{"fontSize":"0.78rem","fontWeight":"700","color":"var(--text-secondary)","display":"flex","alignItems":"center","gap":"4px"}}>
                            <i className="fas fa-moon"></i> Background:
                        </span>
                        <div style={{"display":"flex","gap":"4px"}}>
                            <button type="button" className="theme-mode-btn" data-mode-val="dark" style={{"fontSize":"0.72rem","padding":"3px 8px","borderRadius":"6px","border":"1px solid var(--border-secondary)","background":"none","color":"var(--text-primary)","cursor":"pointer","fontWeight":"600"}}>Dark</button>
                            <button type="button" className="theme-mode-btn" data-mode-val="pure-black" style={{"fontSize":"0.72rem","padding":"3px 8px","borderRadius":"6px","border":"1px solid var(--border-secondary)","background":"none","color":"var(--text-primary)","cursor":"pointer","fontWeight":"600"}}>Pure Black</button>
                        </div>
                    </div>
                </div>

                <div className="calc-input-group">
                    <label htmlFor="settings-skip-time">Default Skip Time (minutes)</label>
                    <input type="number" id="settings-skip-time" defaultValue="5" min="0" step="1" />
                </div>
                <div className="calc-input-group">
                    <label htmlFor="settings-playback-speed">Default Playback Speed</label>
                    <input type="number" id="settings-playback-speed" defaultValue="1.75" min="0.1" step="0.05" max="5.0" />
                </div>
                <div className="calc-input-group">
                    <label htmlFor="settings-autoplay-prompt">Autoplay Prompt (minutes before end)</label>
                    <input type="number" id="settings-autoplay-prompt" defaultValue="3" min="0" step="1" />
                </div>
                <div style={{"borderTop":"1px solid var(--border-secondary)","margin":"0.3rem 0"}}></div>
                <h3 style={{"fontSize":"0.95rem","color":"var(--accent-primary)","margin":"0"}}>Smart Skip Feature</h3>
                <div className="calc-input-group">
                    <label htmlFor="settings-smart-skip-count">Consecutive Skips to Trigger</label>
                    <input type="number" id="settings-smart-skip-count" defaultValue="7" min="1" step="1" />
                </div>
                <div className="calc-input-group">
                    <label>Amount to Skip</label>
                    <div style={{"display":"flex","gap":"8px"}}>
                        <div style={{"flex":1}}>
                            <input type="number" id="settings-smart-skip-min" defaultValue="5" min="0" step="1" placeholder="Min" />
                        </div>
                        <div style={{"flex":1}}>
                            <input type="number" id="settings-smart-skip-sec" defaultValue="0" min="0" max="59" step="1" placeholder="Sec" />
                        </div>
                    </div>
                </div>
                <div style={{"borderTop":"1px solid var(--border-secondary)","margin":"0.3rem 0"}}></div>
                <h3 style={{"fontSize":"0.95rem","color":"var(--accent-primary)","margin":"0"}}>Custom Button</h3>
                <div className="calc-input-group">
                    <label htmlFor="settings-custom-btn-name">Button Name</label>
                    <input type="text" id="settings-custom-btn-name" placeholder="e.g. Unacademy" />
                </div>
                <div className="calc-input-group">
                    <label htmlFor="settings-custom-btn-url">Button URL</label>
                    <input type="text" id="settings-custom-btn-url" placeholder="https://..." />
                </div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","marginBottom":"0.5rem"}}>
                    <input type="checkbox" id="settings-custom-btn-hide" />
                    <label htmlFor="settings-custom-btn-hide" style={{"fontSize":"0.9rem","color":"var(--text-secondary)"}}>Hide this button</label>
                </div>
                <button id="save-settings-btn" className="primary-btn" style={{"width":"100%","justifyContent":"center","padding":"10px"}}>Save Settings</button>
            </div>
        </div>
    </div>

    

    

        <div id="reset-preferences-modal" style={{"position":"absolute","top":"0","left":"0","right":"0","bottom":"0","background":"rgba(0,0,0,0.6)","zIndex":"300","display":"none","alignItems":"center","justifyContent":"center"}}>
            <div style={{"background":"var(--bg-secondary)","padding":"24px","borderRadius":"12px","width":"300px","boxShadow":"0 10px 25px rgba(0,0,0,0.3)","border":"1px solid var(--border-primary)","display":"flex","flexDirection":"column","gap":"12px"}}>
                <h3 style={{"margin":"0","fontSize":"1.2rem","color":"var(--text-primary)","textAlign":"center"}}>Reset Preferences</h3>
                <p style={{"margin":"0 0 12px 0","fontSize":"0.85rem","color":"var(--text-secondary)","textAlign":"center"}}>What would you like to reset?</p>
                <button id="reset-hidden-option-btn" className="primary-btn" style={{"width":"100%","padding":"10px"}}>Reset Hidden Items</button>
                <button id="reset-merge-option-btn" className="primary-btn" style={{"width":"100%","padding":"10px"}}>Reset Teacher Merges</button>
                <button id="reset-both-option-btn" className="primary-btn" style={{"width":"100%","padding":"10px","background":"var(--accent-danger)"}}>Reset Both</button>
                <button id="reset-cancel-option-btn" style={{"width":"100%","padding":"10px","background":"transparent","border":"1px solid var(--border-secondary)","color":"var(--text-primary)","borderRadius":"8px","cursor":"pointer","marginTop":"8px"}}>Cancel</button>
            </div>
        </div>
    <input type="file" id="thumbnail-uploader" className="hidden" accept="image/*" />
    <input type="file" id="add-pdf-input" className="hidden" accept=".pdf" />
    <input type="file" id="add-assignment-input" className="hidden" accept=".pdf,.doc,.docx,.txt,.zip" />
    <input type="file" id="import-zip-input" className="hidden" accept=".zip" />

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      </div>
    </>
  );
}
