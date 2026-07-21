import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';


const LandingPage = () => {

  // 1. Cursor Animation removed per user request

  // 2. Navbar scroll effect
  useEffect(() => {
    const nav = document.getElementById('navbar');
    const handleScroll = () => {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 4. Scroll Reveal
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') });
    }, { threshold: .1 });
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => observer.observe(el));
    return () => {
      reveals.forEach(el => observer.unobserve(el));
    };
  }, []);

  // 5. Counter Animation
  useEffect(() => {
    function animCounter(el, target, suffix = '') {
      let current = 0, step = target / 60;
      const tick = () => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current) + (suffix || '');
        if (current < target) requestAnimationFrame(tick);
      };
      tick();
    }
    const nums = document.querySelectorAll('.hero-stat-num');
    const timer = setTimeout(() => {
      if (nums[0] && nums[0].textContent === "0") animCounter(nums[0], 5); // Just target first one to match original behavior
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-page-container">


      {/* Navigation */}
      <nav id="navbar">
        <a href="#" className="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h12M3 18h8" /><circle cx="19" cy="18" r="3" /></svg>
          </div>
          UMLTutor
        </a>
        <div className="nav-links">
          <a href="#how" className="nav-link">How it works</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#modules" className="nav-link">Modules</a>
          <a href="#about" className="nav-link">About</a>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/login" className="nav-link">Log in</Link>
          <Link to="/signup" className="nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">


        <h1 className="hero-title">
          The Smart Way to<br />
          Master <em>UML</em>
        </h1>

        <p className="hero-sub">
          Build professional diagrams with deep semantic analysis, consistency checks, and guided modeling all in one structured workflow.
        </p>

        <div className="hero-actions">
          <Link to="/signup" className="btn-primary">
            Start Learning Free
            <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <Link to="/login" className="btn-secondary">
            Teacher Access
          </Link>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">0</div>
            <div className="hero-stat-label">Diagram Types</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="hero-stat-num">SA</div>
            <div className="hero-stat-label">Semantic Analysis</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="hero-stat-num">100%</div>
            <div className="hero-stat-label">Web-Based</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="hero-stat-num">Free</div>
            <div className="hero-stat-label">To Get Started</div>
          </div>
        </div>

        {/* Mini diagram preview */}
        <div className="hero-diagram-preview">
          <div className="preview-window">
            <div className="preview-topbar">
              <span className="preview-dot r"></span>
              <span className="preview-dot y"></span>
              <span className="preview-dot g"></span>
              <span className="preview-title">Use Case Diagram Library System</span>
            </div>
            <div className="preview-body">
              <svg className="preview-svg" viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg">
                {/* Actor 1 */}
                <g transform="translate(40,60)">
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#5046E5" strokeWidth="2" />
                  <line x1="0" y1="14" x2="0" y2="50" stroke="#5046E5" strokeWidth="2" />
                  <line x1="-18" y1="28" x2="18" y2="28" stroke="#5046E5" strokeWidth="2" />
                  <line x1="0" y1="50" x2="-14" y2="72" stroke="#5046E5" strokeWidth="2" />
                  <line x1="0" y1="50" x2="14" y2="72" stroke="#5046E5" strokeWidth="2" />
                  <text y="88" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif">Student</text>
                </g>
                {/* System boundary */}
                <rect x="100" y="10" width="380" height="160" rx="10" fill="none" stroke="#9898AD" strokeWidth="1.5" strokeDasharray="6,4" />
                <text x="290" y="28" textAnchor="middle" fontSize="11" fill="#9898AD" fontFamily="DM Sans,sans-serif" fontWeight="500">Library System</text>
                {/* Use Cases */}
                <ellipse cx="210" cy="80" rx="62" ry="24" fill="#EFEFF9" stroke="#5046E5" strokeWidth="1.5" />
                <text x="210" y="85" textAnchor="middle" fontSize="11" fill="#5046E5" fontFamily="DM Sans,sans-serif" fontWeight="500">Borrow Book</text>
                <ellipse cx="210" cy="140" rx="62" ry="24" fill="#EFEFF9" stroke="#5046E5" strokeWidth="1.5" />
                <text x="210" y="145" textAnchor="middle" fontSize="11" fill="#5046E5" fontFamily="DM Sans,sans-serif" fontWeight="500">Search Catalog</text>
                <ellipse cx="370" cy="80" rx="62" ry="24" fill="#F7F7FC" stroke="#9898AD" strokeWidth="1.5" />
                <text x="370" y="85" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif" fontWeight="500">Return Book</text>
                <ellipse cx="370" cy="140" rx="62" ry="24" fill="#F7F7FC" stroke="#9898AD" strokeWidth="1.5" />
                <text x="370" y="145" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif" fontWeight="500">Reserve Book</text>
                {/* Connections */}
                <line x1="58" y1="80" x2="148" y2="80" stroke="#5046E5" strokeWidth="1.5" />
                <line x1="58" y1="100" x2="148" y2="130" stroke="#5046E5" strokeWidth="1.5" />
                {/* Actor 2 */}
                <g transform="translate(560,60)">
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#9898AD" strokeWidth="2" />
                  <line x1="0" y1="14" x2="0" y2="50" stroke="#9898AD" strokeWidth="2" />
                  <line x1="-18" y1="28" x2="18" y2="28" stroke="#9898AD" strokeWidth="2" />
                  <line x1="0" y1="50" x2="-14" y2="72" stroke="#9898AD" strokeWidth="2" />
                  <line x1="0" y1="50" x2="14" y2="72" stroke="#9898AD" strokeWidth="2" />
                  <text y="88" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif">Librarian</text>
                </g>
                <line x1="542" y1="80" x2="432" y2="80" stroke="#9898AD" strokeWidth="1.5" />
                <line x1="542" y1="95" x2="432" y2="130" stroke="#9898AD" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint">
          <span>Scroll to explore</span>
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section section-pad" id="how">
        <div className="container">
          <div className="reveal">
            <span className="section-label">Process</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-sub">A guided, structured workflow from assignment to submission, every step clearly defined.</p>
          </div>
          <div className="steps-grid reveal reveal-delay-1">
            <div className="step-card">
              <div className="step-num">01</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>
              </div>
              <div className="step-title">Receive Assignment</div>
              <div className="step-desc">Teacher creates a structured assignment with clear instructions, deadlines, and reference materials.</div>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              </div>
              <div className="step-title">Build Diagrams</div>
              <div className="step-desc">Use the visual editor to create Use Case, Class, Sequence, and other UML diagrams step by step.</div>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
              </div>
              <div className="step-title">Validation</div>
              <div className="step-desc">Semantic analysis checks consistency, completeness, and correctness across your entire UML model.</div>
            </div>
            <div className="step-card">
              <div className="step-num">04</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div className="step-title">Submit & Review</div>
              <div className="step-desc">Submit your work for teacher review. Receive detailed feedback and grades with inline comments.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-pad" id="features">
        <div className="container">
          <div className="reveal">
            <span className="section-label">Capabilities</span>
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-sub">Powerful tools built specifically for teaching and mastering UML modeling.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card large reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
              </div>
              <div className="feature-title">Structured Assignment Workflow</div>
              <div className="feature-desc">Every assignment guides students through a carefully designed multi-step process: from Use Case Diagrams to detailed Sequence Diagrams. No guessing what to do next, the platform tells you exactly where you are and what's needed.</div>
              <div className="feature-tags">
                <span className="feature-tag">Step-by-step</span>
                <span className="feature-tag">Progress tracking</span>
                <span className="feature-tag">Guided</span>
              </div>
            </div>
            <div className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
              </div>
              <div className="feature-title">Visual Diagram Editor</div>
              <div className="feature-desc">Intuitive drag-and-drop canvas with all standard UML elements. Drag to move, resize, double-click to rename.</div>
              <div className="feature-tags">
                <span className="feature-tag">Drag & drop</span>
                <span className="feature-tag">UML standard</span>
              </div>
            </div>
            <div className="feature-card reveal reveal-delay-3">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <div className="feature-title">Class & Sequence Diagrams</div>
              <div className="feature-desc">Full support for structural and behavioral modeling with relationship types, lifelines, and message flows.</div>
              <div className="feature-tags">
                <span className="feature-tag">Class diagrams</span>
                <span className="feature-tag">Sequence diagrams</span>
              </div>
            </div>
            <div className="feature-card reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <div className="feature-title">Teacher & Student Roles</div>
              <div className="feature-desc">Separate dashboards, permissions, and workflows for teachers to create classes, manage assignments, and review work.</div>
              <div className="feature-tags">
                <span className="feature-tag">Role-based</span>
                <span className="feature-tag">Class management</span>
              </div>
            </div>
            <div className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              </div>
              <div className="feature-title">Use Case Descriptions</div>
              <div className="feature-desc">Structured templates for documenting behavior, pre/post conditions, and requirements for every use case.</div>
              <div className="feature-tags">
                <span className="feature-tag">Templates</span>
                <span className="feature-tag">Documentation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules (dark section) */}
      <section className="modules-section section-pad" id="modules">
        <div className="container">
          <div className="reveal">
            <span className="section-label">Key Modules</span>
            <h2 className="section-title">Core UML Modeling Tools</h2>
            <p className="section-sub">Focused tools designed for the complete UML modeling workflow each module builds on the last.</p>
          </div>
          <div className="modules-grid">
            <div className="module-card reveal reveal-delay-1">
              <div className="module-num">MODULE 01</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><circle cx="20" cy="15" r="3" /></svg>
              </div>
              <div className="module-title">Use Case Diagrams</div>
              <div className="module-desc">Create comprehensive UML Use Case diagrams with actors, system boundaries, and relationship management.</div>
              <span className="module-badge">Visual Editor</span>
            </div>
            <div className="module-card reveal reveal-delay-2">
              <div className="module-num">MODULE 02</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </div>
              <div className="module-title">Use Case Descriptions</div>
              <div className="module-desc">Document detailed specifications for each use case using structured, standardized templates.</div>
              <span className="module-badge">Structured Forms</span>
            </div>
            <div className="module-card reveal reveal-delay-3">
              <div className="module-num">MODULE 03</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M3 3h18v4H3z" /><path d="M3 9h18v4H3z" /><path d="M3 15h10v6H3z" /><path d="M17 15v6M14 18h6" /></svg>
              </div>
              <div className="module-title">System Sequence Diagrams</div>
              <div className="module-desc">Build SSDs derived from use case flows with semantic message validation between system and actors.</div>
              <span className="module-badge">Semantic Check</span>
            </div>
            <div className="module-card reveal reveal-delay-4">
              <div className="module-num">MODULE 04</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              </div>
              <div className="module-title">Class Diagrams</div>
              <div className="module-desc">Full structural modeling with classes, interfaces, and all relationship types: association, inheritance, composition, and more.</div>
              <span className="module-badge">Structural Model</span>
            </div>
            <div className="module-card reveal reveal-delay-1">
              <div className="module-num">MODULE 05</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <div className="module-title">Sequence Diagrams</div>
              <div className="module-desc">Behavioral design diagrams with lifelines, activation bars, and connected message flows from use cases.</div>
              <span className="module-badge">Behavioral Design</span>
            </div>
            <div className="module-card reveal reveal-delay-2">
              <div className="module-num">MODULE 06</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <div className="module-title">Export & Submit</div>
              <div className="module-desc">Export your complete UML model as a structured package and submit directly to your teacher for graded review.</div>
              <span className="module-badge">One-click Export</span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow timeline */}
      <section className="workflow-section section-pad">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
            <div className="reveal">
              <span className="section-label">Student Journey</span>
              <h2 className="section-title">Your Path to UML Mastery</h2>
              <p className="section-sub">From opening an assignment to submitting a complete, validated UML model, the whole journey in one platform.</p>
              <div style={{ marginTop: '32px' }}>
                <Link to="/signup" className="btn-primary" style={{ display: 'inline-flex' }}>
                  Start Your Journey
                  <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
            <div className="workflow-timeline reveal reveal-delay-2">
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 01</div>
                  <div className="workflow-title">Open Assignment</div>
                  <div className="workflow-desc">Access your assignment from the student dashboard. Read instructions, check the deadline, and review reference materials.</div>
                </div>
              </div>
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M3 12h3M18 12h3M12 3v3M12 18v3" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 02</div>
                  <div className="workflow-title">Model Your System</div>
                  <div className="workflow-desc">Work through each diagram section sequentially. The sidebar tracks your progress across all five modeling phases.</div>
                </div>
              </div>
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 03</div>
                  <div className="workflow-title">Validate Your Work</div>
                  <div className="workflow-desc">Run semantic checks to ensure your diagrams are consistent, complete, and follow UML standards.</div>
                </div>
              </div>
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 04</div>
                  <div className="workflow-title">Submit for Review</div>
                  <div className="workflow-desc">Export your complete model and submit. Your teacher receives it instantly and can leave inline feedback on each diagram.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about-section section-pad" id="about">
        <div className="container">
          <div className="reveal" style={{ maxWidth: '600px', marginBottom: '16px' }}>
            <span className="section-label">About UMLTutor</span>
            <h2 className="section-title">Built for the Classroom</h2>
            <p className="section-sub">UMLTutor bridges the gap between theoretical UML knowledge and practical application, giving students a hands-on environment to create, manage, and refine UML models within a structured assignment workflow.</p>
          </div>
          <div className="team-grid reveal reveal-delay-1">
            <div className="team-card">
              <div className="team-avatar">IK</div>
              <div className="team-name">Inam Karim</div>
              <div className="team-role">Developer & Creator of UMLTutor</div>
              <a href="mailto:inamkarim96@gmail.com" className="team-email">
                <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                inamkarim96@gmail.com
              </a>
            </div>
            <div className="team-card">
              <div className="team-avatar">OM</div>
              <div className="team-name">Dr. Onaiza Maqbool</div>
              <div className="team-role">Project Supervisor</div>
              <span style={{ display: 'inline-block', fontSize: '13px', color: 'var(--ink-muted)', background: 'var(--surface-2)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>Project Supervisor</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to Master UML?</h2>
          <p className="cta-sub">Join students already learning the smart way. Free to start, no setup required.</p>
          <Link to="/signup" className="btn-white">
            Start Learning Free
            <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-inner">
          <div>
            <div className="footer-brand">UMLTutor</div>
            <p className="footer-brand-sub">A smart web-based learning environment designed to help students practice and master UML modeling through a structured workflow.</p>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <Link to="/login" className="footer-link">Log In</Link>
            <Link to="/signup" className="footer-link">Sign Up</Link>
            <a href="#modules" className="footer-link">Modules</a>
          </div>
          <div>
            <div className="footer-col-title">Resources</div>
            <a href="#how" className="footer-link">How it Works</a>
            <a href="#features" className="footer-link">Features</a>
            <a href="#about" className="footer-link">About</a>
          </div>
          <div>
            <div className="footer-col-title">Contact</div>
            <a href="mailto:inamkarim96@gmail.com" className="footer-link">inamkarim96@gmail.com</a>
            <a href="#" className="footer-link">Dr. Onaiza Maqbool</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">Â© 2026 UMLTutor. All rights reserved.</span>
          <span className="footer-copy">Developer: Inam Karim Â· Supervisor: Dr. Onaiza Maqbool</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
