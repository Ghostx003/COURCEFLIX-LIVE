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
import FloatingTimer from './components/views/FloatingTimer';
import './index.css';

export default function App() {
  useEffect(() => {
    if (window.initCourseFlix && !window.courseFlixInitialized) {
      window.courseFlixInitialized = true;
      window.initCourseFlix();
    }

    window.scrollTo(0, 0);
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
      <FloatingTimer />
      {/* Remaining fragments */}
      <div id="legacy-fragments">
        {/* Doubt Full Overlay */}
    <div id="doubt-full-overlay" className="hidden">
        <div className="doubt-full-left">
            <img id="doubt-full-img" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Doubt Screenshot" />
        </div>
        <div className="doubt-full-right">
            <div className="doubt-right-header">
                <h3>Doubt Details</h3>
                <button className="close-doubt-full-btn" title="Minimize / Close"><i className="fas fa-times"></i></button>
            </div>
            <div className="doubt-comments-section">
                <div>
                    <h4 style={{"margin":"0 0 8px 0","fontSize":"0.9rem","color":"var(--text-secondary)"}}>Comment</h4>
                    <textarea id="doubt-comment-input" className="doubt-comment-box" placeholder="Add your query or comment here..."></textarea>
                </div>
                <div>
                    <h4 style={{"margin":"0 0 8px 0","fontSize":"0.9rem","color":"var(--text-secondary)"}}>Tags</h4>
                    <div id="doubt-tags-list" className="doubt-tags-container"></div>
                    <div className="doubt-add-tag-group">
                        <input type="text" id="doubt-tag-input" className="doubt-tag-input" placeholder="Add a tag..." />
                        <button id="add-doubt-tag-btn" className="primary-btn" style={{"padding":"6px 12px"}}><i className="fas fa-plus"></i></button>
                    </div>
                </div>
            </div>
            <button id="doubt-save-btn" className="doubt-save-btn">Save Changes</button>
        </div>
    </div>

    

    

    

    <div id="settings-modal-overlay" className="modal-overlay hidden" style={{"zIndex":"99999"}}>
        <div className="modal-content" style={{"maxWidth":"400px","color":"var(--text-primary)"}}>
            <button className="close-modal-btn" onClick={() => { document.getElementById('settings-modal-overlay').classList.add('hidden') }} style={{"position":"absolute","top":"1rem","right":"1rem","background":"none","border":"none","fontSize":"1.5rem","color":"var(--text-secondary)","cursor":"pointer"}} title="Close">&times;</button>
            <h2 style={{"marginBottom":"1rem","color":"var(--accent-primary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"0.5rem"}}>Settings</h2>
            <div style={{"display":"flex","flexDirection":"column","gap":"1rem","paddingBottom":"1rem"}}>
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
                <div style={{"borderTop":"1px solid var(--border-secondary)","margin":"0.5rem 0"}}></div>
                <h3 style={{"fontSize":"1rem","color":"var(--accent-primary)","margin":"0"}}>Smart Skip Feature</h3>
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
                <div style={{"borderTop":"1px solid var(--border-secondary)","margin":"0.5rem 0"}}></div>
                <h3 style={{"fontSize":"1rem","color":"var(--accent-primary)","margin":"0"}}>Custom Button</h3>
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
                <button id="save-settings-btn" className="primary-btn" style={{"width":"100%","justifyContent":"center"}}>Save Settings</button>
            </div>
        </div>
    </div>
    <div id="shortcuts-modal-overlay" className="modal-overlay hidden" style={{"zIndex":"99999"}}>
        <div className="modal-content" style={{"maxWidth":"850px","width":"92%","maxHeight":"88vh","overflowY":"auto","color":"var(--text-primary)","borderRadius":"16px","padding":"24px","boxShadow":"0 20px 40px rgba(0,0,0,0.5)","border":"1px solid var(--border-primary)"}}>
            <button className="close-modal-btn" onClick={() => { document.getElementById('shortcuts-modal-overlay').classList.add('hidden') }} style={{"position":"absolute","top":"1.2rem","right":"1.2rem","background":"rgba(255,255,255,0.05)","border":"1px solid var(--border-secondary)","borderRadius":"50%","width":"32px","height":"32px","fontSize":"1.2rem","color":"var(--text-secondary)","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} title="Close">&times;</button>
            
            <div style={{"display":"flex","alignItems":"center","justify":"space-between","gap":"12px","marginBottom":"1.2rem","borderBottom":"1px solid var(--border-primary)","paddingBottom":"0.8rem"}}>
                <h2 style={{"margin":"0","color":"var(--accent-primary)","fontSize":"1.4rem","fontWeight":"700","display":"flex","alignItems":"center","gap":"10px"}}>
                    <i className="fas fa-keyboard" style={{"fontSize":"1.3rem"}}></i> Lecture Player Keyboard Shortcuts
                </h2>
                <span style={{"fontSize":"0.75rem","background":"rgba(16,185,129,0.12)","color":"var(--accent-primary)","border":"1px solid rgba(16,185,129,0.3)","padding":"3px 10px","borderRadius":"12px","fontWeight":"600"}}>Press <kbd style={{"background":"var(--bg-tertiary)","padding":"1px 5px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>/</kbd> to toggle</span>
            </div>

            <div className="shortcuts-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(360px, 1fr))","gap":"1.2rem","fontSize":"0.9rem"}}>
                
                {/* Category 1: Playback & Seek Navigation */}
                <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                    <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#38bdf8","display":"flex","alignItems":"center","gap":"8px"}}>
                        <i className="fas fa-play-circle"></i> Playback & Seek Navigation
                    </h3>
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Play / Pause</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Space</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Skip 30 Seconds</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&rarr;</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Rewind 30 Seconds</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&larr;</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Seek 10 Seconds</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&larr;</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&rarr;</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Next / Previous Lecture</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>N</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>P</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Volume Up / Down</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&uarr;</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&darr;</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle Mute</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>M</kbd>
                        </div>
                    </div>
                </div>

                {/* Category 2: Bookmarks & Timeline */}
                <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                    <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#f59e0b","display":"flex","alignItems":"center","gap":"8px"}}>
                        <i className="fas fa-bookmark"></i> Bookmarks & Timeline Navigation
                    </h3>
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Add Bookmark at Timestamp</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Z</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Cycle Between Bookmarks</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Z</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Return to Main Timeline</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>P</kbd></span>
                        </div>
                    </div>
                </div>

                {/* Category 3: Study Tools & Notes */}
                <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                    <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#10b981","display":"flex","alignItems":"center","gap":"8px"}}>
                        <i className="fas fa-graduation-cap"></i> Study Tools & Notes
                    </h3>
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle Lecture Notes Viewer</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Shift</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>N</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle DPP / Assignment Viewer</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Shift</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>D</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle Scratchpad Notes Editor</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Q</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Capture Screenshot & Doubt</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>S</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Switch / Open Side Panel</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Shift</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&larr;</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&rarr;</kbd></span>
                        </div>
                    </div>
                </div>

                {/* Category 4: Speed & Audio Controls */}
                <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                    <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#a855f7","display":"flex","alignItems":"center","gap":"8px"}}>
                        <i className="fas fa-tachometer-alt"></i> Speed & Audio Controls
                    </h3>
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Speed Up / Down (+/- 0.1x)</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>C</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>X</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Cycle Preset Speeds</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>[</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>]</kbd></span>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle Focus Brown Noise</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>B</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Brown Noise Volume</span>
                            <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>PgUp</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>PgDn</kbd></span>
                        </div>
                    </div>
                </div>

                {/* Category 5: General & Interface */}
                <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                    <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#ec4899","display":"flex","alignItems":"center","gap":"8px"}}>
                        <i className="fas fa-desktop"></i> Interface & General
                    </h3>
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle Fullscreen Mode</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>F</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Close Panels / Exit Fullscreen</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Esc</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Open Shortcuts Menu</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>/</kbd>
                        </div>
                        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                            <span style={{"color":"var(--text-secondary)"}}>Toggle Floating Timer (Pomodoro / Stopwatch)</span>
                            <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Enter</kbd>
                        </div>
                    </div>
                </div>

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
