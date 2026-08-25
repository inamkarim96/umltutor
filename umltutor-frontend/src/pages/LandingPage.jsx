import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';


const LandingPage = () => {

  // Navbar scroll effect
  useEffect(() => {
    const nav = document.getElementById('navbar');
    const handleScroll = () => {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll Reveal
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') });
    }, { threshold: .08 });
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => observer.observe(el));
    return () => {
      reveals.forEach(el => observer.unobserve(el));
    };
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
          <a href="#nlp" className="nav-link">AI Engine</a>
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
          AI-powered semantic analysis, NLP requirement parsing, cross-diagram consistency checks, and a structured 5-phase workflow all in one platform.
        </p>

        <div className="hero-actions">
          <Link to="/signup" className="btn-secondary">
            Start Learning Free
          </Link>
          <Link to="/login" className="btn-secondary">
            Teacher Access
          </Link>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">5</div>
            <div className="hero-stat-label">Diagram Types</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="hero-stat-num">NLP</div>
            <div className="hero-stat-label">AI Requirement Parsing</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="hero-stat-num">12+</div>
            <div className="hero-stat-label">Validation Phases</div>
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
              <span className="preview-title">Use Case Diagram  Library System</span>
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
            <p className="section-sub">A guided, structured workflow from assignment to submission  every step clearly defined and AI-validated.</p>
          </div>
          <div className="steps-grid reveal reveal-delay-1">
            <div className="step-card">
              <div className="step-num">01</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>
              </div>
              <div className="step-title">Receive Assignment</div>
              <div className="step-desc">Teacher creates a structured assignment with a case study. The NLP engine automatically parses requirements to suggest actors and use cases.</div>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              </div>
              <div className="step-title">Build Diagrams</div>
              <div className="step-desc">Use the visual editor to create Use Case, SSD, Class, and Sequence diagrams. AI suggestions appear as you model.</div>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
              </div>
              <div className="step-title">Semantic Validation</div>
              <div className="step-desc">12+ validation phases check cross-diagram consistency — descriptions match diagrams, SSDs align with class operations, and sequence diagrams trace use cases.</div>
            </div>
            <div className="step-card">
              <div className="step-num">04</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div className="step-title">Submit &amp; Review</div>
              <div className="step-desc">Submit your work for teacher review. Receive detailed feedback, inline grading, and improvement suggestions per diagram section.</div>
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
            <p className="section-sub">Powerful tools built specifically for teaching and mastering UML modeling — now with an integrated AI engine.</p>
          </div>
          <div className="features-grid">

            {/* Large card: NLP Engine */}
            <div className="feature-card large reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              <div className="feature-title">NLP-Powered AI Engine</div>
              <div className="feature-desc">Paste any case study text and the built-in NLP engine automatically classifies requirements (functional, actor, domain entity, business rule, constraint), suggests actors and use cases with confidence scores, generates system names, and detects ambiguous requirements all without external AI APIs.</div>
              <div className="feature-tags">
                <span className="feature-tag">Requirement Classification</span>
                <span className="feature-tag">Actor Extraction</span>
                <span className="feature-tag">Use Case Suggestions</span>
                <span className="feature-tag">Fuzzy Matching</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
              </div>
              <div className="feature-title">12-Phase Checking Engine</div>
              <div className="feature-desc">Deep semantic validation across all diagram types cross-checking use cases, SSDs, class diagrams, and sequence diagrams for consistency, completeness, and correctness.</div>
              <div className="feature-tags">
                <span className="feature-tag">Cross-diagram checks</span>
                <span className="feature-tag">Semantic alignment</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-3">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
              </div>
              <div className="feature-title">Visual Diagram Editor</div>
              <div className="feature-desc">Intuitive drag-and-drop canvas for all 5 UML diagram types. Drag to move, resize, double-click to rename with all standard UML elements and relationship types.</div>
              <div className="feature-tags">
                <span className="feature-tag">Drag &amp; drop</span>
                <span className="feature-tag">UML standard</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <div className="feature-title">Teacher &amp; Student Roles</div>
              <div className="feature-desc">Separate dashboards, permissions, and workflows. Teachers create classes, manage assignments, review submissions, and handle tutorial requests from students.</div>
              <div className="feature-tags">
                <span className="feature-tag">Role-based access</span>
                <span className="feature-tag">Class management</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <div className="feature-title">Practice Mode</div>
              <div className="feature-desc">Free-form practice canvas for all five diagram types Use Case, Description, SSD, Class, and Sequence outside of assignment constraints to sharpen skills.</div>
              <div className="feature-tags">
                <span className="feature-tag">All 5 diagram types</span>
                <span className="feature-tag">Free practice</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-3">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
              </div>
              <div className="feature-title">Tutorial Request System</div>
              <div className="feature-desc">Students can request one-on-one tutorial sessions with their teacher directly from the platform. Teachers view and manage all pending requests in a dedicated panel.</div>
              <div className="feature-tags">
                <span className="feature-tag">Tutorial requests</span>
                <span className="feature-tag">Teacher dashboard</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
              </div>
              <div className="feature-title">Structured Assignment Workflow</div>
              <div className="feature-desc">Every assignment guides students through a carefully designed 5-step process: Use Case Diagram → Descriptions → SSD → Class Diagram → Sequence Diagrams. Progress is tracked at every phase.</div>
              <div className="feature-tags">
                <span className="feature-tag">Step-by-step</span>
                <span className="feature-tag">Progress tracking</span>
                <span className="feature-tag">Guided</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              </div>
              <div className="feature-title">Use Case Descriptions</div>
              <div className="feature-desc">Structured templates for documenting behavior, pre/post conditions, main flow, alternative flows, and system responses for every use case in your diagram.</div>
              <div className="feature-tags">
                <span className="feature-tag">Structured templates</span>
                <span className="feature-tag">Flow documentation</span>
              </div>
            </div>

            <div className="feature-card reveal reveal-delay-3">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div className="feature-title">Real-time Notifications</div>
              <div className="feature-desc">Stay informed with instant notifications for assignment deadlines, submission status updates, teacher feedback, and tutorial request confirmations.</div>
              <div className="feature-tags">
                <span className="feature-tag">Live updates</span>
                <span className="feature-tag">Feedback alerts</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* NLP / AI Engine Highlight */}
      <section className="section-pad" id="nlp" style={{ background: 'linear-gradient(135deg, rgba(80,70,229,0.06) 0%, rgba(124,58,237,0.04) 100%)' }}>
        <div className="container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="section-label">AI Intelligence</span>
            <h2 className="section-title">Built-in NLP &amp; Semantic Engine</h2>
            <p className="section-sub" style={{ maxWidth: '640px', margin: '0 auto' }}>
              UMLTutor ships a custom Natural Language Processing engine that understands your case study no external AI subscriptions required.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }} className="reveal reveal-delay-1">

            <div className="feature-card" style={{ borderTop: '3px solid #5046E5' }}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              <div className="feature-title">Requirement Classification</div>
              <div className="feature-desc">Automatically labels each sentence as Functional, System Step, Actor, Domain Entity, Business Rule, Precondition, Postcondition, Constraint, Non-Functional, or Ambiguous.</div>
            </div>

            <div className="feature-card" style={{ borderTop: '3px solid #7C3AED' }}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /><line x1="20" y1="8" x2="20" y2="14" /></svg>
              </div>
              <div className="feature-title">Actor &amp; Use Case Extraction</div>
              <div className="feature-desc">Identifies role-nouns (Student, Librarian, Admin) as actors and functional verbs (borrow, reserve, approve) as use case candidates with confidence scoring.</div>
            </div>

            <div className="feature-card" style={{ borderTop: '3px solid #0EA5E9' }}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              </div>
              <div className="feature-title">Fuzzy Semantic Matching</div>
              <div className="feature-desc">Lemmatization, synonym detection, and fuzzy string matching ensure diagram elements are validated against requirements even when phrased differently.</div>
            </div>

            <div className="feature-card" style={{ borderTop: '3px solid #10B981' }}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
              </div>
              <div className="feature-title">Cross-Diagram Consistency</div>
              <div className="feature-desc">The engine validates: Description ↔ Diagram alignment, SSD ↔ Description flows, Class ↔ SSD operations, and Sequence ↔ Class ownership — 12 distinct validation phases in one run.</div>
            </div>

            <div className="feature-card" style={{ borderTop: '3px solid #F59E0B' }}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              </div>
              <div className="feature-title">SSD Semantic Validation</div>
              <div className="feature-desc">System Sequence Diagrams are checked for message naming consistency, actor-system boundary adherence, and traceability back to use case flow steps.</div>
            </div>

            <div className="feature-card" style={{ borderTop: '3px solid #EF4444' }}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              </div>
              <div className="feature-title">Intelligent Issue Reporting</div>
              <div className="feature-desc">Validation errors are categorized by severity (error / warning / info), linked to the exact diagram element, and accompanied by a fix suggestion — not just a generic error message.</div>
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
            <p className="section-sub">Five sequential modeling phases — each builds on the last, and the AI engine validates alignment between all of them.</p>
          </div>
          <div className="modules-grid">
            <div className="module-card reveal reveal-delay-1">
              <div className="module-num">MODULE 01</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><circle cx="20" cy="15" r="3" /></svg>
              </div>
              <div className="module-title">Use Case Diagrams</div>
              <div className="module-desc">Create comprehensive UML Use Case diagrams with actors, system boundaries, and relationship types (association, include, extend, generalization). NLP-suggested actors and use cases populate automatically from your case study.</div>
              <span className="module-badge">NLP Suggestions</span>
            </div>
            <div className="module-card reveal reveal-delay-2">
              <div className="module-num">MODULE 02</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </div>
              <div className="module-title">Use Case Descriptions</div>
              <div className="module-desc">Document detailed structured specifications for each use case: actors, preconditions, postconditions, main success scenario, and alternative flows. Semantic checks ensure descriptions align with your diagram.</div>
              <span className="module-badge">Semantic Validation</span>
            </div>
            <div className="module-card reveal reveal-delay-3">
              <div className="module-num">MODULE 03</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M3 3h18v4H3z" /><path d="M3 9h18v4H3z" /><path d="M3 15h10v6H3z" /><path d="M17 15v6M14 18h6" /></svg>
              </div>
              <div className="module-title">System Sequence Diagrams</div>
              <div className="module-desc">Build SSDs derived directly from use case flows. Each message is semantically validated against the description's main flow steps. Actor–system message boundaries and return values are all checked.</div>
              <span className="module-badge">Flow Traceability</span>
            </div>
            <div className="module-card reveal reveal-delay-4">
              <div className="module-num">MODULE 04</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              </div>
              <div className="module-title">Class Diagrams</div>
              <div className="module-desc">Full structural modeling with classes, interfaces, attributes, and methods. Supports all relationship types. Operations are automatically cross-checked against SSD messages for signature consistency.</div>
              <span className="module-badge">Structural Model</span>
            </div>
            <div className="module-card reveal reveal-delay-1">
              <div className="module-num">MODULE 05</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <div className="module-title">Sequence Diagrams</div>
              <div className="module-desc">Behavioral design diagrams with lifelines, activation bars, and typed message flows. Messages are validated for receiver ownership against your class diagram, and use case traceability is enforced.</div>
              <span className="module-badge">Behavioral Design</span>
            </div>
            <div className="module-card reveal reveal-delay-2">
              <div className="module-num">MODULE 06</div>
              <div className="module-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
              </div>
              <div className="module-title">Checking &amp; Grading</div>
              <div className="module-desc">Run the 12-phase checking engine anytime during your work. Teachers use the checking panel to review flagged issues, leave inline comments, and assign grades to individual diagram sections.</div>
              <span className="module-badge">12-Phase Engine</span>
            </div>
          </div>

          {/* Support modules row */}
          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }} className="reveal reveal-delay-3">
            <div className="module-card" style={{ padding: '24px 28px' }}>
              <div className="module-num">SUPPORT</div>
              <div className="module-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Practice Mode</div>
              <div className="module-desc" style={{ fontSize: '13px' }}>Unrestricted sandbox to practice any of the 5 diagram types without assignment constraints.</div>
              <span className="module-badge">Free Canvas</span>
            </div>
            <div className="module-card" style={{ padding: '24px 28px' }}>
              <div className="module-num">SUPPORT</div>
              <div className="module-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Tutorial Requests</div>
              <div className="module-desc" style={{ fontSize: '13px' }}>Students request help sessions; teachers manage and respond through a dedicated requests dashboard.</div>
              <span className="module-badge">Teacher Panel</span>
            </div>
            <div className="module-card" style={{ padding: '24px 28px' }}>
              <div className="module-num">SUPPORT</div>
              <div className="module-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Notifications</div>
              <div className="module-desc" style={{ fontSize: '13px' }}>Real-time alerts for deadlines, feedback, and submission status changes across both student and teacher dashboards.</div>
              <span className="module-badge">Live Alerts</span>
            </div>
            <div className="module-card" style={{ padding: '24px 28px' }}>
              <div className="module-num">SUPPORT</div>
              <div className="module-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Submission Review</div>
              <div className="module-desc" style={{ fontSize: '13px' }}>Teachers view full submission reports with per-section check results, issue breakdowns, and a grading panel.</div>
              <span className="module-badge">Full Reports</span>
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
              <p className="section-sub">From opening an assignment to submitting a complete, AI-validated UML model — the whole journey in one platform.</p>
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
                  <div className="workflow-desc">Access your assignment from the student dashboard. The NLP engine parses the case study and pre-suggests actors and use cases.</div>
                </div>
              </div>
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M3 12h3M18 12h3M12 3v3M12 18v3" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 02</div>
                  <div className="workflow-title">Model Your System</div>
                  <div className="workflow-desc">Work through all five diagram phases sequentially. The sidebar tracks your progress and highlights which section needs attention.</div>
                </div>
              </div>
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 03</div>
                  <div className="workflow-title">Validate with AI</div>
                  <div className="workflow-desc">Run the 12-phase checking engine to find consistency errors, incomplete descriptions, mismatched class operations, and more — before submitting.</div>
                </div>
              </div>
              <div className="workflow-step">
                <div className="workflow-dot">
                  <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                </div>
                <div className="workflow-content">
                  <div className="workflow-step-num">Step 04</div>
                  <div className="workflow-title">Submit for Review</div>
                  <div className="workflow-desc">Submit your complete model. Your teacher receives a full check report and can leave inline feedback on every diagram section.</div>
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
            <p className="section-sub">UMLTutor bridges the gap between theoretical UML knowledge and practical application, giving students a hands-on AI-assisted environment to create, manage, and validate complete UML models within a structured assignment workflow — no external tools required.</p>
          </div>
          <div className="team-grid reveal reveal-delay-1">
            <div className="team-card">
              <div className="team-avatar">IK</div>
              <div className="team-name">Inam Karim</div>
              <div className="team-role">Developer &amp; Creator of UMLTutor</div>
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
          <p className="cta-sub">Join students already learning with AI-powered guidance. Free to start, no setup required.</p>
          <Link to="/signup" className="btn-primary">
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
            <p className="footer-brand-sub">An AI-powered web-based learning environment for UML modeling. Built with a custom NLP engine for semantic requirement parsing and cross-diagram validation.</p>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <Link to="/login" className="footer-link">Log In</Link>
            <Link to="/signup" className="footer-link">Sign Up</Link>
            <a href="#modules" className="footer-link">Modules</a>
            <a href="#nlp" className="footer-link">AI Engine</a>
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
          <span className="footer-copy">© 2026 UMLTutor. All rights reserved.</span>
          <span className="footer-copy">Developer: Inam Karim · Supervisor: Dr. Onaiza Maqbool</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
