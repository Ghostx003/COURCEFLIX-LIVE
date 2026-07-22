import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
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
import CompletionCalculatorModalModal from './components/modals/CompletionCalculatorModalModal';
import ModalOverlayModal from './components/modals/ModalOverlayModal';
import ImportModalOverlayModal from './components/modals/ImportModalOverlayModal';
import './index.css';

export default function App() {
  useEffect(() => {
    if (window.initCourseFlix && !window.courseFlixInitialized) {
      window.courseFlixInitialized = true;
      window.initCourseFlix();
    }
  }, []);


  return (
    <>
      <Navbar />
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
      <CompletionCalculatorModalModal />
      <ModalOverlayModal />
      <ImportModalOverlayModal />
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
            <div style={{"display":"flex","flexDirection":"column","gap":"1rem"}}>
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
        <div className="modal-content" style={{"maxWidth":"700px","color":"var(--text-primary)"}}>
            <button className="close-modal-btn" onClick={() => { document.getElementById('shortcuts-modal-overlay').classList.add('hidden') }} style={{"position":"absolute","top":"1rem","right":"1rem","background":"none","border":"none","fontSize":"1.5rem","color":"var(--text-secondary)","cursor":"pointer"}} title="Close">&times;</button>
            <h2 style={{"marginBottom":"1rem","color":"var(--accent-primary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"0.5rem"}}>Keyboard Shortcuts</h2>
            <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"1rem","fontSize":"0.95rem"}}>
                <div>
                    <h3 style={{"marginBottom":"0.5rem","color":"var(--text-secondary)"}}>Playback</h3>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Space</kbd> Play / Pause</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Left/Right</kbd> Skip 10s</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Up/Down</kbd> Volume up/down</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>m</kbd> Toggle Mute (Video & Brown Noise)</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>c</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>x</kbd> Speed up / down by 0.1</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>[</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>]</kbd> Cycle speeds</p>
                </div>
                <div>
                    <h3 style={{"marginBottom":"0.5rem","color":"var(--text-secondary)"}}>General & Features</h3>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>f</kbd> Fullscreen</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Esc</kbd> Exit Fullscreen / Close Menus / Default View</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>n</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Shift+P</kbd> Next / Previous Lecture</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>s</kbd> Capture Doubt</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>z</kbd> Add Bookmark</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>q</kbd> Toggle Notes</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>b</kbd> Toggle Brown Noise Mode</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Page Up/Down</kbd> Brown Noise Volume Up/Down</p>
                    <p><kbd style={{"background":"var(--bg-tertiary)","padding":"2px 6px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>/</kbd> Show this shortcuts menu</p>
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
