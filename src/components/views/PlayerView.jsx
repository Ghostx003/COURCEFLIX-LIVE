import React from 'react';
export default function PlayerView() {
  return (
    <div id="player-view" className="view">
        <div id="pdf-drop-overlay" style={{"position":"absolute","top":"0","left":"0","right":"0","bottom":"0","background":"rgba(0, 0, 0, 0.85)","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","zIndex":"9999","border":"4px dashed var(--accent-primary)","color":"white","opacity":"0","pointerEvents":"none","transition":"opacity 0.2s ease"}}>
            <i className="fas fa-file-pdf" style={{"fontSize":"5rem","color":"var(--accent-primary)","marginBottom":"20px"}}></i>
            <h2 style={{"fontSize":"2.5rem","marginBottom":"10px"}}>Drop PDF Here</h2>
            <p style={{"fontSize":"1.2rem","color":"var(--text-secondary)"}}>Add as Lecture Notes or DPP</p>
        </div>
        <div id="lecture-menu">
            <div className="menu-header">
                <div className="menu-header-top">
                    <a className="back-link">&larr; Back to Courses</a>
                    <div style={{"display":"flex","gap":"8px","alignItems":"center"}}>
                        <button className="clear-bookmarks-btn hidden">Clear Bookmarks</button>
                        <button id="toggle-completed-btn" className="hidden" style={{"background":"none","border":"none","color":"var(--text-secondary)","cursor":"pointer","fontSize":"1.1rem","transition":"color 0.2s"}} title="Hide Completed Lectures"><i className="fas fa-eye-slash"></i></button>
                    </div>
                </div>
                <h2 id="course-title-menu"></h2>
                <div className="course-stats"></div>
                <div className="menu-progress-container">
                    <div className="menu-progress-bar">
                        <div className="menu-progress-fill"></div>
                    </div>
                    <div className="menu-progress-text"></div>
                </div>
            </div>
            <div id="chapter-list"></div>
        </div>
        <div className="player-content-wrapper">
            <div id="video-wrapper-container">
                <div id="video-wrapper">
                    <video id="video-player"></video>
                    <audio id="brown-noise-audio" src="brown.mp3" style={{"display":"none"}}></audio>
                    <button id="unmute-btn" className="hidden"><i className="fas fa-volume-mute"></i> Click to Unmute</button>
                    <div className="seek-overlay" id="left-seek-overlay"><i className="fas fa-backward"></i></div>
                    <div className="seek-overlay" id="right-seek-overlay"><i className="fas fa-forward"></i></div>
                    <div id="autoplay-overlay">
                        <div className="autoplay-header">Up Next</div>
                        <div className="autoplay-title" id="autoplay-next-title"></div>
                        <div className="autoplay-actions">
                            <button id="autoplay-play-btn"><i className="fas fa-play"></i> Play Now</button>
                            <div className="autoplay-countdown">
                                <svg viewBox="0 0 36 36"><circle className="bg-circle" cx="18" cy="18" r="15.5"></circle><circle className="fg-circle" id="autoplay-countdown-circle" cx="18" cy="18" r="15.5"></circle></svg>
                                <span className="autoplay-countdown-number" id="autoplay-countdown-text">5</span>
                            </div>
                            <button id="autoplay-cancel-btn">Cancel</button>
                        </div>
                    </div>
                    <div id="skip-intro-btn" style={{"position":"absolute","right":"24px","bottom":"85px","background":"rgba(0, 0, 0, 0.8)","color":"white","border":"1px solid var(--border-primary)","padding":"12px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer","zIndex":"35","display":"none","transition":"opacity 0.3s","opacity":"0","boxShadow":"0 4px 12px rgba(0,0,0,0.5)"}}>
                        Skip Intro <i className="fas fa-forward" style={{"marginLeft":"8px"}}></i>
                    </div>
                    <div id="smart-skip-btn" style={{"position":"absolute","right":"24px","bottom":"145px","background":"rgba(0, 0, 0, 0.8)","color":"white","border":"1px solid var(--border-primary)","padding":"12px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer","zIndex":"35","display":"none","alignItems":"center","transition":"opacity 0.3s","opacity":"0","boxShadow":"0 4px 12px rgba(0,0,0,0.5)"}}>
                        Skip 5 mins ahead <i className="fas fa-forward" style={{"marginLeft":"8px"}}></i>
                    </div>
                    <div id="smart-rewind-btn" style={{"position":"absolute","right":"24px","bottom":"145px","background":"rgba(0, 0, 0, 0.8)","color":"white","border":"1px solid var(--border-primary)","padding":"12px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer","zIndex":"35","display":"none","alignItems":"center","transition":"opacity 0.3s","opacity":"0","boxShadow":"0 4px 12px rgba(0,0,0,0.5)"}}>
                        Rewind Back? <i className="fas fa-undo" style={{"marginLeft":"8px"}}></i>
                    </div>
                    <div className="video-controls-container">
                        <div className="timeline-container">
                            <input type="range" className="timeline" defaultValue="0" step="0.1" />
                            <div id="bookmarks-container"></div>
                        </div>
                        <div className="controls" style={{"position":"relative"}}>
                            <div className="left-controls">
                                <button className="control-btn" id="play-pause-btn"><i className="fas fa-play"></i></button>
                                <div className="time-display"><span id="current-time">0:00</span> / <span id="video-duration">0:00</span></div>
                            </div>
                            <div id="estimated-end-time-container" style={{"position":"absolute","left":"50%","transform":"translateX(-50%)","height":"100%","top":"0","padding":"0 50px","cursor":"default","display":"flex","alignItems":"center","zIndex":"10"}}>
                                <div id="estimated-end-time" style={{"fontSize":"0.9rem","fontWeight":"600","color":"#e8f5e9","textShadow":"0px 2px 5px rgba(0,0,0,0.9)","letterSpacing":"0.5px","opacity":"0","transition":"opacity 0.3s","pointerEvents":"none"}}></div>
                            </div>
                            <div className="right-controls" style={{"position":"relative","display":"flex","alignItems":"center"}}>
                                <div id="custom-speed-popover" className="hidden" style={{"position":"absolute","bottom":"100%","right":"0","marginBottom":"10px","padding":"8px","borderRadius":"8px","boxShadow":"var(--shadow)","zIndex":"100","background":"var(--bg-secondary)","border":"1px solid var(--border-primary)","display":"flex","alignItems":"center","gap":"8px"}}>
                                    <input type="number" id="custom-speed-input" step="0.1" min="0.1" max="5.0" style={{"width":"60px","padding":"4px","textAlign":"center","borderRadius":"4px","background":"var(--bg-primary)","color":"var(--text-primary)","border":"1px solid var(--border-secondary)","outline":"none"}} />
                                    <span style={{"color":"var(--text-secondary)","fontSize":"0.85rem","marginLeft":"-4px"}}>x</span>
                                    <button id="apply-custom-speed" style={{"padding":"4px 10px","borderRadius":"4px","fontSize":"0.85rem","background":"var(--accent-primary)","color":"var(--text-on-accent)","border":"none","cursor":"pointer","fontWeight":"600"}}>Set</button>
                                </div>
                                <button className="control-btn" id="player-notes-btn" title="Notes (Shift+N)" style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-sticky-note"></i></button>
                                <button className="control-btn" id="player-dpp-btn" title="DPP (Shift+D)" style={{"marginRight":"10px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-book-open"></i></button>
                                <button className="control-btn" id="speed-btn" style={{"marginRight":"0"}}>1x</button>
                                <button className="control-btn" id="custom-speed-btn" title="Custom Speed" style={{"marginRight":"8px"}}><i className="fas fa-sliders-h" style={{"fontSize":"0.9rem"}}></i></button>
                                <button className="control-btn" id="fullscreen-btn"><i className="fas fa-expand"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="media-viewer" className="hidden">
                <div id="media-resize-handle"></div>
                <div id="media-viewer-header">
                    <h3 id="viewer-title"></h3>
                    <div className="viewer-actions">
                        <div id="file-switcher-container"></div>
                        <button id="delete-viewer-file" title="Delete File"><i className="fas fa-trash"></i> Delete</button>
                        <button id="close-viewer-btn" title="Close Viewer"><i className="fas fa-times"></i></button>
                    </div>
                </div>
                <iframe id="media-viewer-frame" src="about:blank"></iframe>
                <div id="media-viewer-upload-placeholder" className="hidden" style={{"flexGrow":"1","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":"2.5rem 1.5rem","cursor":"pointer","textAlign":"center","border":"2px dashed var(--border-secondary)","margin":"1.5rem","borderRadius":"16px","background":"var(--bg-tertiary)","transition":"all 0.25s ease","boxSizing":"border-box"}}>
                    <i id="placeholder-icon" className="fas fa-file-pdf" style={{"fontSize":"3.8rem","color":"var(--accent-primary)","marginBottom":"18px","filter":"drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3))"}}></i>
                    <h4 id="placeholder-title" style={{"margin":"0 0 8px 0","fontSize":"1.25rem","fontWeight":"700","color":"var(--text-primary)"}}>Lecture Notes (PDF)</h4>
                    <p id="placeholder-subtitle" style={{"margin":"0","fontSize":"0.92rem","color":"var(--text-secondary)"}}>Click or Drag & Drop a PDF Here</p>
                </div>
            </div>
            <button id="media-viewer-toggle-btn" className="hidden"><i className="fas fa-chevron-left"></i></button>
            <div id="player-notes-sidebar" className="hidden" style={{"width":"var(--notes-width)","minWidth":"0px","backgroundColor":"var(--bg-secondary)","borderLeft":"1px solid var(--border-primary)","position":"relative","zIndex":"50","display":"flex","flexDirection":"column","transition":"width 0.3s ease-in-out, opacity 0.3s"}}>
                <div id="player-notes-resize-handle" style={{"position":"absolute","top":"0","left":"0","height":"100%","width":"8px","cursor":"ew-resize","zIndex":"60","backgroundColor":"transparent","transition":"background-color 0.2s"}}></div>
                <div id="player-notes-sidebar-header" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"1rem","borderBottom":"1px solid var(--border-primary)","backgroundColor":"var(--bg-secondary)","flexShrink":"0","gap":"1rem"}}>
                    <h3 style={{"margin":"0","fontSize":"1.1rem","fontWeight":"600"}}>Notes</h3>
                    <div className="notes-actions" style={{"display":"flex","gap":"8px"}}>
                        <button id="player-notes-add-timestamp-btn" title="Add Timestamp" style={{"backgroundColor":"var(--bg-tertiary)","color":"var(--text-primary)","border":"1px solid var(--border-secondary)","padding":"4px 8px","borderRadius":"4px","cursor":"pointer","fontSize":"0.8rem","fontWeight":"500"}}><i className="fas fa-clock"></i> Timestamp</button>
                        <button id="close-player-notes-btn" title="Close Notes" style={{"backgroundColor":"var(--accent-primary)","color":"white","border":"none","borderRadius":"6px","width":"28px","height":"28px","cursor":"pointer","fontSize":"1rem","display":"flex","alignItems":"center","justifyContent":"center","transition":"background-color 0.2s"}}><i className="fas fa-times"></i></button>
                    </div>
                </div>
                <div id="player-notes-formatting-toolbar" style={{"display":"flex","gap":"2px","padding":"6px 12px","borderBottom":"1px solid var(--border-primary)","background":"#111116","overflowX":"auto","alignItems":"center"}}>
                    <button className="notes-format-btn" data-command="formatBlock" data-value="H1" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'H1') }} title="Heading 1" style={{"fontWeight":"500"}}>H1</button>
                    <button className="notes-format-btn" data-command="formatBlock" data-value="H2" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'H2') }} title="Heading 2" style={{"fontWeight":"500"}}>H2</button>
                    <button className="notes-format-btn" data-command="formatBlock" data-value="P" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'P') }} title="Paragraph" style={{"fontWeight":"500"}}>P</button>
                    
                    <div style={{"width":"1px","height":"16px","background":"rgba(255,255,255,0.1)","margin":"0 6px"}}></div>
                    
                    <button className="notes-format-btn" data-command="insertUnorderedList" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('insertUnorderedList', false, null) }} title="Bullet List"><i className="fas fa-list-ul"></i></button>
                    <button className="notes-format-btn" data-command="insertOrderedList" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('insertOrderedList', false, null) }} title="Numbered List"><i className="fas fa-list-ol"></i></button>
                    
                    <div style={{"width":"1px","height":"16px","background":"rgba(255,255,255,0.1)","margin":"0 6px"}}></div>
                    
                    <button className="notes-format-btn" data-command="bold" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('bold', false, null) }} title="Bold" style={{"fontWeight":"800","fontFamily":"serif"}}>B</button>
                    <button className="notes-format-btn" data-command="italic" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('italic', false, null) }} title="Italic" style={{"fontStyle":"italic","fontFamily":"serif"}}>I</button>
                    <button className="notes-format-btn" data-command="underline" onMouseDown={() => { event.preventDefault() }} onClick={() => { document.execCommand('underline', false, null) }} title="Underline" style={{"textDecoration":"underline","fontFamily":"serif"}}>U</button>
                </div>
                <div id="player-notes-editor-container" style={{"flexGrow":"1","padding":"1rem","overflowY":"auto","display":"flex","flexDirection":"column"}}>
                    <div id="player-notes-editor" contentEditable="true" placeholder="Type your notes here... (Markdown supported)" style={{"flexGrow":"1","outline":"none","whiteSpace":"pre-wrap","fontFamily":"inherit","fontSize":"0.95rem","lineHeight":"1.5","color":"var(--text-primary)"}}></div>
                </div>
            </div>
        </div>
        <button id="sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
    </div>
  );
}
