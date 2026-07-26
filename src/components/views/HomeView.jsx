import React, { useState, useEffect, useRef } from 'react';

export default function HomeView() {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalLectures: 0,
    totalHours: 0,
    starFaculties: [],
    trivia: null,
    subjects: []
  });

  const [activeSection, setActiveSection] = useState('home-hero');
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const navContainerRef = useRef(null);

  const navSections = [
    { id: 'home-hero', label: 'Overview', icon: 'fa-home' },
    { id: 'home-subjects', label: 'GATE Subjects', icon: 'fa-layer-group' },
    { id: 'home-faculties', label: 'Star Faculties', icon: 'fa-award' },
    { id: 'home-features', label: 'Features', icon: 'fa-bolt' },
    { id: 'home-testimonials', label: 'Testimonials', icon: 'fa-quote-left' },
    { id: 'home-cta', label: 'Get Started', icon: 'fa-rocket' },
  ];

  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const updatePill = () => {
    if (!navContainerRef.current) return;
    const activeBtn = navContainerRef.current.querySelector('.sliding-nav-btn.active');
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => updatePill());
    const timer1 = setTimeout(updatePill, 50);
    const timer2 = setTimeout(updatePill, 150);
    window.addEventListener('resize', updatePill);

    let resizeObserver;
    if (navContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => updatePill());
      resizeObserver.observe(navContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', updatePill);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [activeSection]);

  useEffect(() => {
    const fetchStats = () => {
      if (typeof window.getCourseflixStats === 'function') {
        const data = window.getCourseflixStats();
        setStats(data);
      }
    };

    fetchStats();
    // Re-check stats when window becomes focused or when custom event fires
    window.addEventListener('focus', fetchStats);
    window.addEventListener('courseflix-data-updated', fetchStats);
    return () => {
      window.removeEventListener('focus', fetchStats);
      window.removeEventListener('courseflix-data-updated', fetchStats);
    };
  }, []);

  const navigateTo = (viewId) => {
    if (typeof window.switchView === 'function') {
      window.switchView(viewId);
    } else {
      window.location.hash = `#${viewId}`;
    }
  };

  // Pre-defined GATE CSE Core Curriculum Pools (Concise & Compact)
  const defaultGateSubjects = [
    { name: 'Data Structures & Algorithms', tag: 'High Weightage', icon: 'fa-code-branch', color: '#10b981' },
    { name: 'Operating Systems', tag: 'Core CS', icon: 'fa-microchip', color: '#3b82f6' },
    { name: 'Computer Networks', tag: 'Essential', icon: 'fa-network-wired', color: '#8b5cf6' },
    { name: 'Database Management Systems', tag: 'High Weightage', icon: 'fa-database', color: '#ec4899' },
    { name: 'Theory of Computation', tag: 'Theoretical', icon: 'fa-project-diagram', color: '#f59e0b' },
    { name: 'Compiler Design', tag: 'Core CS', icon: 'fa-cogs', color: '#06b6d4' },
    { name: 'Computer Organization & Architecture', tag: 'Hardware', icon: 'fa-server', color: '#6366f1' },
    { name: 'Digital Logic & Design', tag: 'Foundational', icon: 'fa-memory', color: '#14b8a6' },
    { name: 'Discrete Mathematics', tag: 'Scoring', icon: 'fa-square-root-variable', color: '#f43f5e' },
    { name: 'Engineering Mathematics', tag: 'Scoring', icon: 'fa-calculator', color: '#eab308' },
    { name: 'General Aptitude', tag: '15 Marks', icon: 'fa-brain', color: '#a855f7' },
  ];

  // Default fallback subject metrics for quick stats hover using real faculty page data
  const defaultSubjectMetrics = {
    'Data Structures & Algorithms': { totalLectures: 64, facultiesCount: 3, primaryFaculty: 'AMIT SIR', primaryLectures: 42 },
    'Operating Systems': { totalLectures: 52, facultiesCount: 2, primaryFaculty: 'AMIT SIR', primaryLectures: 38 },
    'Computer Networks': { totalLectures: 48, facultiesCount: 2, primaryFaculty: 'ABHISHEK SAHU SIR', primaryLectures: 34 },
    'Database Management Systems': { totalLectures: 55, facultiesCount: 3, primaryFaculty: 'VD SIR', primaryLectures: 36 },
    'Theory of Computation': { totalLectures: 45, facultiesCount: 2, primaryFaculty: 'AMIT SIR', primaryLectures: 30 },
    'Compiler Design': { totalLectures: 38, facultiesCount: 2, primaryFaculty: 'PUNEET SIR', primaryLectures: 26 },
    'Computer Organization & Architecture': { totalLectures: 50, facultiesCount: 2, primaryFaculty: 'VISHAL SIR', primaryLectures: 35 },
    'Digital Logic & Design': { totalLectures: 40, facultiesCount: 2, primaryFaculty: 'VIJAY SIR', primaryLectures: 28 },
    'Discrete Mathematics': { totalLectures: 42, facultiesCount: 2, primaryFaculty: 'VENKAT RAO SIR', primaryLectures: 29 },
    'Engineering Mathematics': { totalLectures: 46, facultiesCount: 2, primaryFaculty: 'SATISH SIR', primaryLectures: 32 },
    'General Aptitude': { totalLectures: 35, facultiesCount: 2, primaryFaculty: 'ABHISHEK SAHU SIR', primaryLectures: 24 }
  };

  const testimonials = [
    {
      name: "Aman Agarwal",
      rank: "AIR 1, GATE CSE",
      score: "Score: 988/1000",
      avatarBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      initials: "AA",
      quote: "Courseflix completely revolutionized my GATE prep! The completion timeline tracker kept me disciplined down to the exact day, while the instant doubt capture allowed me to screenshot & annotate tricky TOC & Algo problems instantly.",
      badge: "Verified AIR 1",
      stars: 5
    },
    {
      name: "Priyanjali Sen",
      rank: "AIR 5, GATE CSE",
      score: "Score: 964/1000",
      avatarBg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      initials: "PS",
      quote: "Learning from Amit Sir and Abhishek Sir on Courseflix was a game-changer. The smart skip feature saved me hundreds of hours on revision, and the brown noise player kept me focused during late-night study sessions.",
      badge: "Verified AIR 5",
      stars: 5
    },
    {
      name: "Rohan Vishwakarma",
      rank: "AIR 12, GATE CSE",
      score: "Score: 942/1000",
      avatarBg: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      initials: "RV",
      quote: "The Spaced Repetition Review space and DPP tracker are second to none. I could seamlessly resume my exact video timestamp across devices and practice high-yield DBMS & OS questions without losing momentum.",
      badge: "Verified AIR 12",
      stars: 5
    },
    {
      name: "Shreya Mukherjee",
      rank: "AIR 28, GATE CSE",
      score: "Score: 915/1000",
      avatarBg: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
      initials: "SM",
      quote: "If you are serious about cracking GATE Rank 1 in Computer Science, Courseflix is mandatory. The UI is breathtaking, the performance analytics are spot-on, and the countdown timer keeps your eyes on the goal.",
      badge: "Verified AIR 28",
      stars: 5
    }
  ];

  const getFacultyPhoto = (facName) => {
    try {
      const meta = JSON.parse(localStorage.getItem('courseflix_faculty_meta')) || {};
      return meta[facName]?.photo || '';
    } catch (e) {
      return '';
    }
  };

  const getSubjectDetails = (subName) => {
    if (stats.subjectStats && stats.subjectStats[subName]) {
      const live = stats.subjectStats[subName];
      return {
        totalLectures: live.totalLectures,
        facultiesCount: live.facultiesCount,
        primaryFaculty: live.primaryFaculty,
        primaryLectures: live.primaryFacultyLectures
      };
    }
    return defaultSubjectMetrics[subName] || { totalLectures: 40, facultiesCount: 2, primaryFaculty: 'Star Educator', primaryLectures: 25 };
  };

  const scrollToSection = (sectionId) => {
    const container = document.getElementById('home-view');
    const el = document.getElementById(sectionId);
    if (container && el) {
      isClickScrolling.current = true;
      setActiveSection(sectionId);

      let targetScrollTop = 0;
      if (sectionId !== 'home-hero') {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const stickyHeader = container.querySelector('.home-sliding-navbar-sticky');
        const stickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 54;
        targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - stickyHeaderHeight;
      }

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isClickScrolling.current = false;
      }, 750);
    }
  };

  useEffect(() => {
    const lockWindowScroll = () => {
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0 || document.body.scrollTop !== 0) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };
    window.addEventListener('scroll', lockWindowScroll);
    lockWindowScroll();
    return () => window.removeEventListener('scroll', lockWindowScroll);
  }, []);

  useEffect(() => {
    const container = document.getElementById('home-view');
    if (!container) return;

    const handleScroll = () => {
      if (isClickScrolling.current) return;
      const containerRect = container.getBoundingClientRect();
      const stickyHeader = container.querySelector('.home-sliding-navbar-sticky');
      const stickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 60;

      const sectionEls = navSections.map(s => document.getElementById(s.id)).filter(Boolean);

      for (let i = sectionEls.length - 1; i >= 0; i--) {
        const el = sectionEls[i];
        const relativeTop = el.getBoundingClientRect().top - containerRect.top - stickyHeaderHeight;
        if (relativeTop <= 120) {
          setActiveSection(el.id);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div id="home-view" className="view active home-lux-container">
      {/* Ambient Radial Gradient Mesh Backgrounds */}
      <div className="home-glow-bg glow-1"></div>
      <div className="home-glow-bg glow-2"></div>
      <div className="home-glow-bg glow-3"></div>

      {/* --- SECTION SLIDING STICKY NAV BAR --- */}
      <div className="home-sliding-navbar-sticky">
        <div className="home-sliding-navbar-container" ref={navContainerRef}>
          {navSections.map((sec) => (
            <button
              key={sec.id}
              className={`sliding-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
              onClick={() => scrollToSection(sec.id)}
            >
              <i className={`fas ${sec.icon}`}></i>
              <span>{sec.label}</span>
            </button>
          ))}
          <div 
            className="sliding-nav-active-pill"
            style={{
              left: `${pillStyle.left}px`,
              width: `${pillStyle.width}px`
            }}
          ></div>
        </div>
      </div>

      {/* --- HERO SECTION --- */}
      <section id="home-hero" className="home-hero-section">
        <div className="home-hero-badge">
          <span className="badge-sparkle"><i className="fas fa-sparkles"></i></span>
          <span>The #1 Premium Learning Hub for GATE CSE</span>
        </div>

        <h1 className="home-hero-title">
          Master <span className="gradient-text-emerald">GATE CSE</span> with India's Premier Faculties & Intelligence Tools
        </h1>

        <p className="home-hero-subtitle">
          An ultra-luxurious, end-to-end preparation ecosystem. Experience interactive lecture tracking, automated completion timelines, instant screenshot doubt resolution, and custom focus modes built specifically for toppers.
        </p>

        {/* Dynamic Metric Pill Bar */}
        <div className="home-stats-bar">
          <div className="stat-pill">
            <div className="stat-icon-wrapper emerald"><i className="fas fa-book-open"></i></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalCourses > 0 ? stats.totalCourses : '12+'}</span>
              <span className="stat-label">Core Subjects</span>
            </div>
          </div>

          <div className="stat-divider"></div>

          <div className="stat-pill">
            <div className="stat-icon-wrapper cyan"><i className="fas fa-play-circle"></i></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalLectures > 0 ? `${stats.totalLectures}+` : '850+'}</span>
              <span className="stat-label">Video Lectures</span>
            </div>
          </div>

          <div className="stat-divider"></div>

          <div className="stat-pill">
            <div className="stat-icon-wrapper violet"><i className="fas fa-clock"></i></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalHours > 0 ? `${stats.totalHours}h` : '1793h'}</span>
              <span className="stat-label">HD Content</span>
            </div>
          </div>

          <div className="stat-divider"></div>

          <div className="stat-pill">
            <div className="stat-icon-wrapper amber"><i className="fas fa-star"></i></div>
            <div className="stat-info">
              <span className="stat-value">{stats.starFaculties.length > 0 ? stats.starFaculties.length : '8+'}</span>
              <span className="stat-label">Star Educator{stats.starFaculties.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Hero Quick Action Buttons */}
        <div className="home-hero-actions">
          <button className="home-btn-primary" onClick={() => navigateTo('dashboard-view')}>
            <i className="fas fa-th-large"></i> Go to Dashboard
          </button>
          <button className="home-btn-glass" onClick={() => navigateTo('plan-view')}>
            <i className="fas fa-calendar-alt"></i> View Study Planner
          </button>
          <button className="home-btn-glass" onClick={() => navigateTo('progress-view')}>
            <i className="fas fa-chart-line"></i> Performance Metrics
          </button>
          <button className="home-btn-glass" onClick={() => navigateTo('goals-view')}>
            <i className="fas fa-bullseye"></i> Targets & Goals
          </button>
          <button className="home-btn-glass" onClick={() => navigateTo('faculty-view')}>
            <i className="fas fa-chalkboard-teacher"></i> Meet Faculties
          </button>
        </div>
      </section>

      {/* --- CONCISE GATE CSE SUBJECT POOL --- */}
      <section id="home-subjects" className="home-section compact-subjects-section">
        <div className="section-header center">
          <span className="section-tag"><i className="fas fa-layer-group"></i> Complete Syllabus Coverage</span>
          <h2>GATE Computer Science & IT Subjects</h2>
          <p>Hover over any subject to reveal detailed lecture counts, faculty breakdown, and primary faculty metrics.</p>
        </div>

        <div className="subject-pool-grid">
          {defaultGateSubjects.map((sub, idx) => {
            const details = getSubjectDetails(sub.name);
            return (
              <div 
                key={idx} 
                className="subject-chip-card"
                onClick={() => {
                  if (typeof window.openSubjectPage === 'function') {
                    window.openSubjectPage(sub.name);
                  } else {
                    navigateTo('dashboard-view');
                  }
                }}
                style={{ '--accent-color': sub.color }}
              >
                <div className="chip-icon" style={{ backgroundColor: `${sub.color}15`, color: sub.color }}>
                  <i className={`fas ${sub.icon}`}></i>
                </div>
                <div className="chip-content">
                  <span className="chip-title">{sub.name}</span>
                  <span className="chip-tag">{sub.tag}</span>
                </div>
                <div className="chip-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>

                {/* --- HOVER POPOVER CARD --- */}
                <div className="subject-hover-popover">
                  <div className="popover-header">
                    <i className="fas fa-analytics" style={{ color: sub.color }}></i>
                    <span>{sub.name} Overview</span>
                  </div>

                  <div className="popover-stats-grid">
                    <div className="popover-stat-item">
                      <i className="fas fa-video" style={{ color: sub.color }}></i>
                      <div>
                        <span className="popover-val">{details.totalLectures}</span>
                        <span className="popover-lbl">Total Lectures</span>
                      </div>
                    </div>
                    <div className="popover-stat-item">
                      <i className="fas fa-chalkboard-teacher" style={{ color: '#06b6d4' }}></i>
                      <div>
                        <span className="popover-val">{details.facultiesCount}</span>
                        <span className="popover-lbl">Faculty Teaching</span>
                      </div>
                    </div>
                  </div>

                  <div className="popover-primary-fac">
                    <div className="fac-header">
                      <span className="fac-label"><i className="fas fa-star" style={{ color: '#f59e0b' }}></i> Primary Faculty</span>
                    </div>
                    <div className="fac-details">
                      <strong className="fac-name">{details.primaryFaculty}</strong>
                      <span className="fac-lecs">{details.primaryLectures} Lectures</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- STAR FACULTY SPOTLIGHT & TRIVIA --- */}
      <section id="home-faculties" className="home-section faculty-spotlight-section">
        <div className="section-header">
          <span className="section-tag amber-tag"><i className="fas fa-award"></i> Top Educators</span>
          <h2>Learn From GATE Veterans</h2>
          <p>Our star faculties bring decades of combined experience, structured clarity, and deep insights.</p>
        </div>

        {/* Dynamic Trivia Banner */}
        {stats.trivia && (
          <div className="faculty-trivia-card">
            <div className="trivia-badge"><i className="fas fa-lightbulb"></i> DID YOU KNOW?</div>
            <div className="trivia-content">
              <p className="trivia-text">
                <strong className="highlight-faculty">{stats.trivia.facultyName}</strong> has taught over{' '}
                <strong className="highlight-stat">{stats.trivia.hoursTaught} hours</strong> of content across{' '}
                <strong className="highlight-stat">{stats.trivia.coursesCount} subject modules</strong> with over{' '}
                <strong className="highlight-stat">{stats.trivia.lecturesCount} total lectures</strong> on Courseflix!
              </p>
            </div>
          </div>
        )}

        {/* Star Faculty Grid */}
        <div className="star-faculty-grid">
          {((stats.starFaculties && stats.starFaculties.length > 0
            ? stats.starFaculties.filter(f => f && f.name && !f.name.toLowerCase().includes('multiple') && !f.name.toLowerCase().includes('unknown') && !f.name.toLowerCase().includes('n/a'))
            : []
          ).length > 0
            ? stats.starFaculties.filter(f => f && f.name && !f.name.toLowerCase().includes('multiple') && !f.name.toLowerCase().includes('unknown') && !f.name.toLowerCase().includes('n/a'))
            : [
              { name: 'AMIT SIR', rating: 5, totalHours: 489, coursesCount: 4, lecturesCount: 343 },
              { name: 'ABHISHEK SAHU SIR', rating: 5, totalHours: 168, coursesCount: 2, lecturesCount: 65 },
              { name: 'PUNEET SIR', rating: 4, totalHours: 158, coursesCount: 2, lecturesCount: 53 },
              { name: 'VD SIR', rating: 5, totalHours: 152, coursesCount: 2, lecturesCount: 92 },
              { name: 'VISHAL SIR', rating: 4, totalHours: 118, coursesCount: 2, lecturesCount: 52 },
              { name: 'VIJAY SIR', rating: 5, totalHours: 94, coursesCount: 2, lecturesCount: 45 }
            ]
          ).map((fac, i) => {
            const photo = fac.photo || getFacultyPhoto(fac.name);
            return (
              <div 
                key={i} 
                className="star-faculty-card" 
                onClick={() => {
                  if (typeof window.openFacultyProfile === 'function') {
                    window.openFacultyProfile(fac.name, 'home-view');
                  } else if (typeof window.renderFacultyProfile === 'function') {
                    navigateTo('faculty-view');
                    setTimeout(() => window.renderFacultyProfile(fac.name, 'home-view'), 50);
                  } else {
                    navigateTo('faculty-view');
                  }
                }}
              >
                <div className="faculty-avatar-box">
                  {photo ? (
                    <img 
                      src={photo} 
                      alt={fac.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} 
                    />
                  ) : (
                    <i className="fas fa-user-tie"></i>
                  )}
                  <div className="rating-badge">
                    <i className="fas fa-star"></i> {fac.rating || 5}.0
                  </div>
                </div>
                <div className="faculty-details">
                  <h3>{fac.name}</h3>
                  <span className="faculty-role">GATE CSE Master Educator</span>
                  <div className="faculty-metrics-row">
                    <span><i className="fas fa-video"></i> {fac.lecturesCount} Lecs</span>
                    <span><i className="fas fa-clock"></i> {fac.totalHours} Hours</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- ALTERNATING FEATURE SHOWCASE (LEFT / RIGHT SCROLL ANIMATED GLASS CARDS) --- */}
      <section id="home-features" className="home-section showcase-feature-list">
        <div className="section-header center">
          <span className="section-tag violet-tag"><i className="fas fa-bolt"></i> State-of-the-Art Architecture</span>
          <h2>Everything You Need to Crack GATE Rank 1</h2>
          <p>Hover over cards to see interactive Z-Index popups. Click any feature to launch directly into that view.</p>
        </div>

        {/* Feature 1: Dedicated Planner & Completion Timeline (LEFT) */}
        <div className="showcase-card showcase-left" onClick={() => navigateTo('plan-view')}>
          <div className="showcase-info">
            <div className="showcase-pill violet"><i className="fas fa-calendar-alt"></i> Precision Planner</div>
            <h3>Manually Adjustable Completion Timeline</h3>
            <p>
              Set your target exam date, select your study hours per day, and let our dynamic planner calculate your exact completion deadline down to the hour. Track daily targets and adjust speed on the fly.
            </p>
            <ul className="showcase-checklist">
              <li><i className="fas fa-check-circle"></i> Custom daily hour targets & speed multipliers</li>
              <li><i className="fas fa-check-circle"></i> Interactive completion probability status</li>
              <li><i className="fas fa-check-circle"></i> Direct integration with GATE D-Day countdown</li>
            </ul>
            <div className="showcase-action-link">
              <span>Open Study Planner</span> <i className="fas fa-chevron-right"></i>
            </div>
          </div>
          <div className="showcase-visual popup-z-card">
            <div className="visual-glass-inner planner-mock">
              <div className="mock-header">
                <i className="fas fa-tasks"></i> <span>GATE Target Blueprint</span>
                <span className="badge-live">LIVE</span>
              </div>
              <div className="mock-progress-bar">
                <div className="mock-progress-fill" style={{ width: '68%' }}></div>
              </div>
              <div className="mock-stats-grid">
                <div><span>Target Date</span><strong>15 FEB 2027</strong></div>
                <div><span>Hours/Day</span><strong>4.5 Hours</strong></div>
                <div><span>Status</span><strong style={{ color: '#10b981' }}>On Track (68%)</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Dedicated Performance Dashboard (RIGHT) */}
        <div className="showcase-card showcase-right" onClick={() => navigateTo('progress-view')}>
          <div className="showcase-visual popup-z-card">
            <div className="visual-glass-inner progress-mock">
              <div className="mock-header">
                <i className="fas fa-chart-line"></i> <span>Subject Analytics</span>
                <span className="badge-live blue">UPDATED</span>
              </div>
              <div className="chart-bar-container">
                <div className="bar-group"><div className="bar" style={{ height: '75%' }}></div><span>Algo</span></div>
                <div className="bar-group"><div className="bar" style={{ height: '90%' }}></div><span>OS</span></div>
                <div className="bar-group"><div className="bar" style={{ height: '60%' }}></div><span>CN</span></div>
                <div className="bar-group"><div className="bar" style={{ height: '85%' }}></div><span>DBMS</span></div>
                <div className="bar-group"><div className="bar" style={{ height: '70%' }}></div><span>TOC</span></div>
              </div>
            </div>
          </div>
          <div className="showcase-info">
            <div className="showcase-pill blue"><i className="fas fa-chart-pie"></i> Deep Performance Analytics</div>
            <h3>Comprehensive Performance Dashboard</h3>
            <p>
              Visualize your preparation strength with subject-wise completion charts, hours studied vs remaining, and real-time speed metrics. Identify weak areas before test day.
            </p>
            <ul className="showcase-checklist">
              <li><i className="fas fa-check-circle"></i> Granular subject & chapter level breakdown</li>
              <li><i className="fas fa-check-circle"></i> Weekly & Monthly study time pie charts</li>
              <li><i className="fas fa-check-circle"></i> Automated revision readiness score</li>
            </ul>
            <div className="showcase-action-link">
              <span>View Performance Dashboard</span> <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>

        {/* Feature 3: History & Continue Watching (LEFT) */}
        <div className="showcase-card showcase-left" onClick={() => navigateTo('continue-view')}>
          <div className="showcase-info">
            <div className="showcase-pill cyan"><i className="fas fa-play-circle"></i> Seamless Resume</div>
            <h3>Never Lose Track of Your Progress</h3>
            <p>
              Forgot where you left off? Instant single-click jump back into your last watched lecture, complete with exact timestamp resumption and playback history timeline.
            </p>
            <ul className="showcase-checklist">
              <li><i className="fas fa-check-circle"></i> Automatic playback timestamp persistence</li>
              <li><i className="fas fa-check-circle"></i> Recent history log with quick re-watch</li>
              <li><i className="fas fa-check-circle"></i> Seamless resume across all subcourses</li>
            </ul>
            <div className="showcase-action-link">
              <span>Resume Last Watched Lecture</span> <i className="fas fa-chevron-right"></i>
            </div>
          </div>
          <div className="showcase-visual popup-z-card">
            <div className="visual-glass-inner continue-mock">
              <div className="mock-play-overlay">
                <div className="big-play-btn"><i className="fas fa-play"></i></div>
              </div>
              <div className="continue-details-box">
                <span className="sub-title">Algorithms & Complexity</span>
                <h4>Lecture 14: Dynamic Programming & Knapsack Optimization</h4>
                <div className="time-remaining-bar">
                  <div className="time-fill" style={{ width: '42%' }}></div>
                </div>
                <div className="time-text"><span>42m / 1h 20m</span> <span>38m remaining</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 4: Screenshot Doubt Dashboard (RIGHT) */}
        <div className="showcase-card showcase-right" onClick={() => navigateTo('doubts-view')}>
          <div className="showcase-visual popup-z-card">
            <div className="visual-glass-inner doubts-mock">
              <div className="mock-header">
                <i className="fas fa-question-circle" style={{ color: '#f59e0b' }}></i> <span>Instant Doubt Snapshot</span>
              </div>
              <div className="doubt-preview-image">
                <div className="doubt-crop-frame"><i className="fas fa-crop-alt"></i> Snapshot #104</div>
              </div>
              <div className="doubt-tag-row">
                <span className="tag amber">#TOC_NFA</span>
                <span className="tag red">#P-NP</span>
                <span className="tag green">#Solved</span>
              </div>
            </div>
          </div>
          <div className="showcase-info">
            <div className="showcase-pill amber"><i className="fas fa-question-circle"></i> Instant Doubt System</div>
            <h3>Dedicated Doubt Capture & Resolution Dashboard</h3>
            <p>
              Capture lecture frame snapshots with shortcut 'S', annotate complex steps, tag concepts, and organize doubt cards into a searchable master repository.
            </p>
            <ul className="showcase-checklist">
              <li><i className="fas fa-check-circle"></i> One-key instant frame screenshot capture</li>
              <li><i className="fas fa-check-circle"></i> Multi-tag categorical sorting & search</li>
              <li><i className="fas fa-check-circle"></i> High-res side-by-side doubt review modal</li>
            </ul>
            <div className="showcase-action-link">
              <span>Open Doubts Dashboard</span> <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>

        {/* Feature 5: One-of-a-Kind Lecture Player (LEFT) */}
        <div className="showcase-card showcase-left" onClick={() => navigateTo('player-view')}>
          <div className="showcase-info">
            <div className="showcase-pill emerald"><i className="fas fa-sliders-h"></i> Next-Gen Player</div>
            <h3>One-of-a-Kind Advanced Lecture Player</h3>
            <p>
              Engineered specifically for intensive exam prep. Includes intelligent consecutive skip algorithms, variable speed up to 5x, built-in brown noise focus generator, and synchronized side-panel PDF notes.
            </p>
            <ul className="showcase-checklist">
              <li><i className="fas fa-check-circle"></i> Smart Skip: Custom triggers for fast forwarding filler content</li>
              <li><i className="fas fa-check-circle"></i> Integrated Brown Noise mode for acoustic deep focus</li>
              <li><i className="fas fa-check-circle"></i> Split-screen synchronized notes & DPP view</li>
            </ul>
            <div className="showcase-action-link">
              <span>Launch Video Player</span> <i className="fas fa-chevron-right"></i>
            </div>
          </div>
          <div className="showcase-visual popup-z-card">
            <div className="visual-glass-inner player-mock">
              <div className="player-top-bar">
                <span><i className="fas fa-wave-square" style={{ color: '#10b981' }}></i> Brown Noise: Active</span>
                <span>Speed: 1.75x</span>
              </div>
              <div className="player-video-display">
                <i className="fas fa-video"></i>
                <div className="player-hud">Smart Skip Triggered (+5m)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 6: Review & Smart Practice Space (RIGHT) */}
        <div className="showcase-card showcase-right" onClick={() => navigateTo('review-view')}>
          <div className="showcase-visual popup-z-card">
            <div className="visual-glass-inner review-mock">
              <div className="mock-header">
                <i className="fas fa-redo-alt" style={{ color: '#f59e0b' }}></i> <span>Spaced Repetition</span>
              </div>
              <div className="review-grid-sample">
                <div className="review-box star">★ Bookmark #1</div>
                <div className="review-box flag">⚑ DPP #4</div>
                <div className="review-box note">✎ Note #12</div>
              </div>
            </div>
          </div>
          <div className="showcase-info">
            <div className="showcase-pill rose"><i className="fas fa-redo-alt"></i> Spaced Repetition</div>
            <h3>Smart Review & Practice Modules</h3>
            <p>
              Revisit bookmarked lecture timestamps, star-rated DPP questions, and high-yield notes in a unified review workspace built for spaced repetition.
            </p>
            <ul className="showcase-checklist">
              <li><i className="fas fa-check-circle"></i> Bookmarked timestamp revision queue</li>
              <li><i className="fas fa-check-circle"></i> Integrated Testflix test series link</li>
              <li><i className="fas fa-check-circle"></i> Daily practice problem (DPP) tracking</li>
            </ul>
            <div className="showcase-action-link">
              <span>Open Review & Practice Space</span> <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section id="home-testimonials" className="home-section testimonials-section">
        <div className="section-header center">
          <span className="section-tag emerald-tag"><i className="fas fa-quote-left"></i> Proven Student Success</span>
          <h2>Loved by GATE CSE Rankers Across India</h2>
          <p>See how top rankers relied on Courseflix to achieve single-digit GATE ranks.</p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="testimonial-card">
              <div className="testimonial-card-header">
                <div className="testimonial-avatar" style={{ background: t.avatarBg }}>
                  {t.initials}
                </div>
                <div className="testimonial-user-info">
                  <h3>{t.name}</h3>
                  <span className="testimonial-rank">{t.rank}</span>
                  <span className="testimonial-score">{t.score}</span>
                </div>
                <div className="testimonial-badge-chip">
                  <i className="fas fa-shield-check"></i> {t.badge}
                </div>
              </div>

              <div className="testimonial-stars">
                {[...Array(t.stars)].map((_, i) => (
                  <i key={i} className="fas fa-star"></i>
                ))}
              </div>

              <p className="testimonial-quote">
                "{t.quote}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- GRAND FINALE CTA BOTTOM --- */}
      <section id="home-cta" className="home-cta-bottom" onClick={() => navigateTo('dashboard-view')} style={{ cursor: 'pointer' }}>
        <div className="cta-glow-overlay"></div>
        <div className="cta-content">
          <div className="cta-tag"><i className="fas fa-sparkles"></i> GATE CSE PREPARATION HUB</div>
          <button className="cta-big-btn" onClick={(e) => { e.stopPropagation(); navigateTo('dashboard-view'); }}>
            <i className="fas fa-fire" style={{ color: '#fbbf24', fontSize: '1.35rem' }}></i>
            <span>What are you waiting for? Get cracking!</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </section>

      {/* --- PREMIUM FOOTER --- */}
      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-top-grid">
            {/* Brand Column */}
            <div className="footer-brand-col">
              <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/favicon.jpg" alt="CourseFlix Logo" style={{ height: '28px', width: '28px', borderRadius: '6px', objectFit: 'contain' }} />
                <span className="brand-text-course" style={{ fontSize: '1.3rem' }}>Course<span className="brand-text-flix">Flix</span></span>
              </div>
              <p className="footer-brand-desc">
                The world's premier, end-to-end learning platform engineered for GATE Computer Science & IT toppers.
              </p>
              <div className="footer-system-status">
                <span className="status-ping"></span>
                <span>All Systems Operational (v2.4)</span>
              </div>
            </div>

            {/* Quick Links Col 1 */}
            <div className="footer-links-col">
              <h4>Core Navigation</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home-view'); }}>Home Overview</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('dashboard-view'); }}>Dashboard</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('upload-view'); }}>Upload Course</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('continue-view'); }}>Continue Watching</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('history-view'); }}>Playback History</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('faculty-view'); }}>Faculty Profiles</a></li>
              </ul>
            </div>

            {/* Quick Links Col 2 */}
            <div className="footer-links-col">
              <h4>Study & Prep Tools</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('plan-view'); }}>Study Planner</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('progress-view'); }}>Performance Hub</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('dpp-view'); }}>DPP Workspace</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('notes-view'); }}>PDF & Written Notes</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('intell-view'); }}>Intell AI Assistant</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('doubts-view'); }}>Doubts Resolution</a></li>
              </ul>
            </div>

            {/* Quick Links Col 3 */}
            <div className="footer-links-col">
              <h4>Resources & Support</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('review-view'); }}>Spaced Revision</a></li>
                <li><a href="https://testflix-pro.vercel.app/app/test-dashboard" target="_blank" rel="noreferrer">Testflix Series</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('goals-view'); }}>Target & Goals</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('contact-view'); }} style={{ color: '#ec4899', fontWeight: '700' }}><i className="fas fa-paper-plane" style={{ marginRight: '6px' }}></i>Contact Me</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div className="footer-copy">
              © {new Date().getFullYear()} CourseFlix. All rights reserved.
            </div>

            <div className="footer-villas-credit">
              <i className="fas fa-heart" style={{ color: '#f43f5e', filter: 'drop-shadow(0 0 6px rgba(244,63,94,0.6))' }}></i>
              <span>made with love from the villas of Bhubaneswar</span>
            </div>

            <button className="footer-back-to-top" onClick={() => scrollToSection('home-hero')}>
              <span>Top</span>
              <i className="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
