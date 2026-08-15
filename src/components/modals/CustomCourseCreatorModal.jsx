import React, { useState, useRef, useEffect } from 'react';
import { getStore, STORE_NAME, ensureDB } from '../../services/db.js';
import { showToast } from '../../services/utils.js';

export default function CustomCourseCreatorModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [teacher, setTeacher] = useState('');
    const [thumbnailDataUrl, setThumbnailDataUrl] = useState('');
    const [lectures, setLectures] = useState([]);
    const [htmlFilename, setHtmlFilename] = useState('');
    const [thumbnailFilename, setThumbnailFilename] = useState('');
    
    useEffect(() => {
        const handleOpen = () => {
            // Hide the manage courses modal first!
            const manageModal = document.getElementById('modal-overlay');
            if (manageModal) {
                manageModal.classList.add('hidden');
            }
            setIsOpen(true);
        };
        window.addEventListener('open-custom-course-creator', handleOpen);
        
        const btn = document.getElementById('add-custom-course-btn');
        if (btn) {
            btn.addEventListener('click', handleOpen);
        }

        return () => {
            window.removeEventListener('open-custom-course-creator', handleOpen);
            if (btn) btn.removeEventListener('click', handleOpen);
        };
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setTitle('');
        setTeacher('');
        setThumbnailDataUrl('');
        setLectures([]);
        setHtmlFilename('');
        setThumbnailFilename('');
        
        // Re-open manage courses modal when this one closes
        const manageModal = document.getElementById('modal-overlay');
        if (manageModal) {
            manageModal.classList.remove('hidden');
        }
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setThumbnailFilename(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setThumbnailDataUrl(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleHtmlImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setHtmlFilename(file.name);
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const htmlText = ev.target.result;
            
            const parseDurationString = (str) => {
                let seconds = 0;
                const hrMatch = str.match(/(\d+)\s*hr/i);
                const minMatch = str.match(/(\d+)\s*min/i);
                const secMatch = str.match(/(\d+)\s*sec/i);
                if (hrMatch) seconds += parseInt(hrMatch[1]) * 3600;
                if (minMatch) seconds += parseInt(minMatch[1]) * 60;
                if (secMatch) seconds += parseInt(secMatch[1]);
                return seconds;
            };

            const urlRegex = /https:\/\/unacademy-player\.netlify\.app\/[A-Za-z0-9]+/g;
            const urls = [];
            let match;
            while ((match = urlRegex.exec(htmlText)) !== null) {
                urls.push({ url: match[0], index: match.index });
            }
            
            const newLectures = [];
            const seenUrls = new Set();
            
            for (let i = 0; i < urls.length; i++) {
                const currentUrl = urls[i].url;
                if (seenUrls.has(currentUrl)) continue;
                seenUrls.add(currentUrl);
                
                const startIndex = urls[i].index;
                const endIndex = i + 1 < urls.length ? urls[i+1].index : htmlText.length;
                const chunk = htmlText.substring(startIndex, endIndex);
                
                // First try to match the full duration badge, fallback to just matching the watch emoji pattern
                const durMatch = chunk.match(/<span[^>]*class=["'][^"']*duration-badge[^"']*["'][^>]*>.*?⏱️\s*(.*?)<\/span>/is) || chunk.match(/⏱️\s*([0-9\sA-Za-z]+)/is);
                let durationSeconds = 0;
                if (durMatch) {
                    durationSeconds = parseDurationString(durMatch[1]);
                }
                
                newLectures.push({
                    id: Date.now().toString() + '_' + newLectures.length,
                    displayName: `Lecture ${newLectures.length + 1}`,
                    customUrl: currentUrl,
                    duration: durationSeconds
                });
            }
            
            if (newLectures.length === 0) {
                showToast("No valid Unacademy player URLs found in this file.", true);
                setLectures([]);
                return;
            }
            
            setLectures(newLectures);
            showToast(`Found ${newLectures.length} lectures!`, false);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast('Course name is required', true);
            return;
        }

        await ensureDB();
        
        const subcourseView = document.getElementById('subcourse-view');
        const isSubcourseActive = subcourseView && subcourseView.classList.contains('active');

        if (isSubcourseActive) {
            const targetCourseId = parseInt(subcourseView.dataset.courseId);
            const basePath = subcourseView.dataset.currentPath || '';
            
            try {
                const targetCourse = await new Promise((resolve, reject) => {
                    const req = getStore(STORE_NAME, 'readonly').get(targetCourseId);
                    req.onsuccess = e => resolve(e.target.result);
                    req.onerror = () => reject('Failed to load target course');
                });
                
                if (!targetCourse) {
                    throw new Error('Target course not found');
                }
                
                const folderName = title.trim();
                const chapterName = basePath ? `${basePath}/${folderName}` : folderName;
                
                targetCourse.chapters = targetCourse.chapters || [];
                targetCourse.chapters.push({ name: chapterName, lectures: lectures });
                
                const updatedLectures = lectures.map(l => ({ ...l, chapter: chapterName }));
                targetCourse.lectures = [...(targetCourse.lectures || []), ...updatedLectures];
                targetCourse.videoCount = targetCourse.lectures.length;
                
                targetCourse.subCourseData = targetCourse.subCourseData || {};
                targetCourse.subCourseData[chapterName] = {
                    isCustom: true,
                    facultyName: teacher.trim() || 'Unknown',
                    thumbnail: thumbnailDataUrl || null
                };
                
                await new Promise((resolve, reject) => {
                    const req = getStore(STORE_NAME, 'readwrite').put(targetCourse);
                    req.onsuccess = resolve;
                    req.onerror = reject;
                });
                
                // Update in memory if it's the global array
                if (window.courses) {
                    const idx = window.courses.findIndex(c => String(c.id) === String(targetCourseId));
                    if (idx !== -1) window.courses[idx] = targetCourse;
                }
                
                showToast(`Custom course added inside ${targetCourse.title}!`, false);
                handleClose();
                
                if (window.renderSubcourseView) {
                    window.renderSubcourseView(targetCourseId, basePath, false);
                }
                
            } catch (err) {
                console.error('Failed to add custom subcourse:', err);
                showToast('Failed to add course to current folder', true);
            }
        } else {
            const newCourse = {
                id: Date.now(),
                title: title.trim(),
                facultyName: teacher.trim() || 'Unknown',
                thumbnail: thumbnailDataUrl || null,
                isCustomCourse: true,
                isLinked: true,
                lectures: lectures,
                chapters: lectures.length > 0 ? [{ name: "Custom Lectures", lectures: lectures }] : [],
                videoCount: lectures.length,
                order: (window.courses || []).length
            };

            try {
                await new Promise((resolve, reject) => {
                    const request = getStore(STORE_NAME, 'readwrite').put(newCourse);
                    request.onsuccess = resolve;
                    request.onerror = (err) => reject(err);
                });

                if (window.courses) {
                    window.courses.push(newCourse);
                }
                
                showToast('Custom course created successfully!', false);
                handleClose();
                const manageModal = document.getElementById('modal-overlay');
                if (manageModal) manageModal.classList.add('hidden');
                
                window.dispatchEvent(new Event('courseflix:courses-loaded'));
            } catch (err) {
                console.error('Failed to save custom course:', err);
                showToast('Failed to create course', true);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div id="custom-course-creator-modal" className="modal-overlay" style={{ zIndex: 100000, display: 'flex', backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="modal-content" style={{ maxWidth: '550px', width: '100%', margin: 'auto', padding: '30px', background: 'var(--bg-secondary)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', background: 'var(--brand-gradient, linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Create Custom Course
                    </h2>
                    <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
                        &times;
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Course / Subject Name <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: '10px', border: '1px solid var(--border-secondary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.95rem', transition: 'border-color 0.3s, box-shadow 0.3s', outline: 'none' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border-secondary)'; e.target.style.boxShadow = 'none'; }} placeholder="e.g. System Design Mastery" />
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Teacher Name</label>
                            <input type="text" value={teacher} onChange={(e) => setTeacher(e.target.value)} style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: '10px', border: '1px solid var(--border-secondary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.95rem', transition: 'border-color 0.3s, box-shadow 0.3s', outline: 'none' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border-secondary)'; e.target.style.boxShadow = 'none'; }} placeholder="e.g. John Doe" />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Course Thumbnail</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ cursor: 'pointer', padding: '10px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}>
                                <i className="fas fa-image" style={{ color: 'var(--accent-primary)' }}></i>
                                Choose Image
                                <input type="file" accept="image/*" onChange={handleThumbnailChange} style={{ display: 'none' }} />
                            </label>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{thumbnailFilename || 'No file chosen'}</span>
                        </div>
                        {thumbnailDataUrl && (
                            <img src={thumbnailDataUrl} alt="Thumbnail preview" style={{ marginTop: '15px', width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        )}
                    </div>

                    <div className="input-group" style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-primary)' }}></div>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.05rem' }}>
                            <i className="fas fa-file-code" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}></i> Import Lectures from HTML
                        </label>
                        
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                            Select an HTML file containing Unacademy player links. We'll automatically extract the links and build your course playlist.
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ cursor: 'pointer', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}>
                                <i className="fas fa-upload" style={{ color: 'var(--text-secondary)' }}></i>
                                Browse Files
                                <input type="file" accept=".html,.htm" onChange={handleHtmlImport} style={{ display: 'none' }} />
                            </label>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{htmlFilename || 'No file chosen'}</span>
                        </div>
                        
                        {lectures.length > 0 && (
                            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontSize: '0.95rem', color: 'var(--accent-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fas fa-check-circle" style={{ fontSize: '1.1rem' }}></i> Successfully extracted {lectures.length} lectures!
                            </div>
                        )}
                    </div>

                    <button type="submit" className="primary-btn" style={{ marginTop: '10px', padding: '14px', fontSize: '1.05rem', fontWeight: 'bold', borderRadius: '10px', background: 'var(--brand-gradient, linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%))', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)'; }}>
                        <i className="fas fa-magic" style={{ marginRight: '8px' }}></i> Generate Custom Course
                    </button>
                </form>
            </div>
        </div>
    );
}
