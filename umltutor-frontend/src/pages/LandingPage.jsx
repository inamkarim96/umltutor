import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {

  // 1. Cursor Animation removed per user request

  // 2. Canvas Background
  useEffect(() => {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * W; this.y = Math.random() * H;
        this.vx = (Math.random() - .5) * .3; this.vy = (Math.random() - .5) * .3;
        this.r = Math.random() * 2 + 1; this.life = 0; this.maxLife = 200 + Math.random() * 200;
        this.color = Math.random() > .5 ? 'rgba(80,70,229,' : 'rgba(120,110,255,';
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.life++;
        if (this.x < 0 || this.x > W || this.y < 0 || this.y > H || this.life > this.maxLife) this.reset();
      }
      draw() {
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * .4;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color + alpha + ')'; ctx.fill();
      }
    }
    for (let i = 0; i < 80; i++) particles.push(new Particle());

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(80,70,229,' + (0.05 * (1 - d / 120)) + ')'; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
    }
    let req;
    function animBg() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw() });
      drawConnections();
      req = requestAnimationFrame(animBg);
    }
    animBg();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(req);
    };
  }, []);

  // 3. Navbar scroll effect
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
      <style>{`
        .landing-page-container {
          --ink:#0D0D14;
          --ink-muted:#5A5A72;
          --ink-faint:#9898AD;
          --accent:#5046E5;
          --accent-light:#7B6FFF;
          --accent-glow:rgba(80,70,229,0.18);
          --surface:#FFFFFF;
          --surface-2:#F7F7FC;
          --surface-3:#EFEFF9;
          --border:rgba(13,13,20,0.08);
          --border-strong:rgba(13,13,20,0.15);
          --radius-sm:8px;
          --radius-md:14px;
          --radius-lg:22px;
          --radius-xl:32px;
          --font-display:'Syne',sans-serif;
          --font-body:'DM Sans',sans-serif;
          font-family:var(--font-body);
          color:var(--ink);
          background:var(--surface);
          overflow-x:hidden;
        }
        /* ── Custom cursor removed ── */

        /* ── Canvas background ── */
        #bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.45}

        /* ── Nav ── */
        nav{
          position:fixed;top:0;left:0;right:0;z-index:100;
          display:flex;align-items:center;justify-content:space-between;
          padding:20px 48px;
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
          background:rgba(255,255,255,0.7);
          border-bottom:1px solid transparent;
          transition:border-color .3s, box-shadow .3s, background .3s;
        }
        nav.scrolled{
          border-color:var(--border);
          box-shadow:0 2px 32px rgba(13,13,20,0.06);
          background:rgba(255,255,255,0.92);
        }
        .nav-logo{
          display:flex;align-items:center;gap:10px;
          font-family:var(--font-display);
          font-weight:800;font-size:22px;
          color:var(--ink);text-decoration:none;
          letter-spacing:-0.5px;
        }
        .nav-logo-icon{
          width:36px;height:36px;
          background:var(--accent);
          border-radius:10px;
          display:grid;place-items:center;
        }
        .nav-logo-icon svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round}
        .nav-links{display:flex;align-items:center;gap:8px}
        .nav-link{
          font-size:14px;font-weight:500;
          color:var(--ink-muted);
          text-decoration:none;
          padding:8px 16px;
          border-radius:var(--radius-sm);
          transition:color .2s,background .2s;
        }
        .nav-link:hover{color:var(--ink);background:var(--surface-2)}
        .nav-cta{
          background:var(--accent);
          color:#fff;
          font-size:14px;font-weight:600;
          padding:10px 22px;
          border-radius:var(--radius-sm);
          text-decoration:none;
          transition:transform .2s,box-shadow .2s,background .2s;
          box-shadow:0 2px 12px rgba(80,70,229,0.3);
        }
        .nav-cta:hover{
          transform:translateY(-1px);
          box-shadow:0 6px 24px rgba(80,70,229,0.4);
          background:var(--accent-light);
        }
        .nav-cta:active{transform:translateY(0)}

        /* ── Hero ── */
        .hero{
          position:relative;z-index:1;
          min-height:100vh;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          text-align:center;
          padding:120px 24px 80px;
          overflow:hidden;
        }
        .hero-eyebrow{
          display:inline-flex;align-items:center;gap:8px;
          background:var(--surface-3);
          border:1px solid var(--border-strong);
          border-radius:100px;
          padding:6px 16px;
          font-size:12px;font-weight:600;
          letter-spacing:.08em;text-transform:uppercase;
          color:var(--accent);
          margin-bottom:32px;
          opacity:0;animation:fadeUp .8s .2s ease forwards;
        }
        .hero-eyebrow-dot{
          width:6px;height:6px;
          background:var(--accent);
          border-radius:50%;
          animation:pulse 2s infinite;
        }
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}

        .hero-title{
          font-family:var(--font-display);
          font-size:clamp(52px,8vw,96px);
          font-weight:800;
          line-height:1.0;
          letter-spacing:-3px;
          color:var(--ink);
          max-width:900px;
          margin-bottom:24px;
          opacity:0;animation:fadeUp .9s .35s ease forwards;
        }
        .hero-title em{
          font-style:normal;
          color:var(--accent);
          position:relative;
          display:inline-block;
        }
        .hero-title em::after{
          content:'';
          position:absolute;
          bottom:-4px;left:0;right:0;
          height:4px;
          background:var(--accent);
          border-radius:2px;
          transform:scaleX(0);transform-origin:left;
          animation:lineIn .6s 1.2s ease forwards;
        }
        @keyframes lineIn{to{transform:scaleX(1)}}

        .hero-sub{
          font-size:18px;font-weight:300;
          color:var(--ink-muted);
          max-width:520px;
          line-height:1.7;
          margin-bottom:48px;
          opacity:0;animation:fadeUp .9s .5s ease forwards;
        }
        .hero-actions{
          display:flex;align-items:center;gap:16px;
          flex-wrap:wrap;justify-content:center;
          opacity:0;animation:fadeUp .9s .65s ease forwards;
        }
        .btn-primary{
          display:inline-flex;align-items:center;gap:8px;
          background:var(--accent);color:#fff;
          font-family:var(--font-body);font-size:16px;font-weight:600;
          padding:16px 32px;
          border-radius:var(--radius-md);
          text-decoration:none;
          transition:transform .25s,box-shadow .25s,background .25s;
          box-shadow:0 4px 20px rgba(80,70,229,0.35);
          border:none;
          position:relative;overflow:hidden;
        }
        .btn-primary::before{
          content:'';position:absolute;inset:0;
          background:rgba(255,255,255,0.12);
          transform:translateX(-100%);
          transition:transform .4s ease;
        }
        .btn-primary:hover::before{transform:translateX(0)}
        .btn-primary:hover{
          transform:translateY(-2px);
          box-shadow:0 8px 32px rgba(80,70,229,0.45);
          background:var(--accent-light);
        }
        .btn-primary svg{width:18px;height:18px;stroke:#fff;stroke-width:2;fill:none;transition:transform .2s}
        .btn-primary:hover svg{transform:translateX(3px)}
        .btn-secondary{
          display:inline-flex;align-items:center;gap:8px;
          background:transparent;
          color:var(--ink);
          font-family:var(--font-body);font-size:16px;font-weight:500;
          padding:15px 28px;
          border-radius:var(--radius-md);
          text-decoration:none;
          border:1.5px solid var(--border-strong);
          transition:background .2s,border-color .2s,transform .2s;
        }
        .btn-secondary:hover{background:var(--surface-2);border-color:var(--accent);transform:translateY(-1px)}

        .hero-scroll-hint{
          position:absolute;bottom:36px;left:50%;transform:translateX(-50%);
          display:flex;flex-direction:column;align-items:center;gap:8px;
          opacity:0;animation:fadeIn 1s 1.4s ease forwards;
        }
        .hero-scroll-hint span{font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
        .scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,var(--accent),transparent);animation:scrollLine 2s 1.6s ease infinite}
        @keyframes scrollLine{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}

        .hero-stats{
          display:flex;align-items:center;gap:40px;
          margin-top:64px;
          padding-top:40px;
          border-top:1px solid var(--border);
          opacity:0;animation:fadeUp .9s .8s ease forwards;
        }
        .hero-stat{text-align:center}
        .hero-stat-num{
          font-family:var(--font-display);
          font-size:32px;font-weight:800;
          color:var(--ink);letter-spacing:-1px;
        }
        .hero-stat-label{font-size:13px;color:var(--ink-muted);font-weight:400;margin-top:2px}
        .hero-stat-divider{width:1px;height:40px;background:var(--border)}

        /* ── Floating diagram preview ── */
        .hero-diagram-preview{
          position:relative;
          margin-top:64px;
          width:100%;max-width:800px;
          opacity:0;animation:fadeUp 1s .9s ease forwards;
        }
        .preview-window{
          background:var(--surface);
          border:1px solid var(--border-strong);
          border-radius:var(--radius-lg);
          overflow:hidden;
          box-shadow:0 32px 80px rgba(13,13,20,0.12), 0 0 0 1px var(--border);
        }
        .preview-topbar{
          background:var(--surface-2);
          border-bottom:1px solid var(--border);
          padding:12px 20px;
          display:flex;align-items:center;gap:8px;
        }
        .preview-dot{width:10px;height:10px;border-radius:50%}
        .preview-dot.r{background:#FF5F57}
        .preview-dot.y{background:#FFBD2E}
        .preview-dot.g{background:#28C840}
        .preview-title{font-size:12px;color:var(--ink-faint);margin-left:auto;margin-right:auto;font-weight:500}
        .preview-body{
          padding:32px;
          background:var(--surface);
          min-height:200px;
          display:flex;align-items:center;justify-content:center;
        }
        .preview-svg{width:100%;max-width:600px}

        /* ── Sections ── */
        section{position:relative;z-index:1}
        .section-pad{padding:100px 24px}
        .container{max-width:1120px;margin:0 auto}

        /* ── Section header ── */
        .section-label{
          display:inline-block;
          font-size:11px;font-weight:700;
          letter-spacing:.12em;text-transform:uppercase;
          color:var(--accent);
          margin-bottom:16px;
        }
        .section-title{
          font-family:var(--font-display);
          font-size:clamp(36px,4vw,56px);
          font-weight:800;
          line-height:1.1;
          letter-spacing:-1.5px;
          color:var(--ink);
          margin-bottom:16px;
        }
        .section-sub{
          font-size:17px;font-weight:300;
          color:var(--ink-muted);
          line-height:1.7;
          max-width:540px;
        }

        /* ── How it Works ── */
        .how-section{background:var(--surface-2)}
        .steps-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:2px;
          margin-top:64px;
          background:var(--border);
          border-radius:var(--radius-lg);
          overflow:hidden;
        }
        .step-card{
          background:var(--surface);
          padding:40px 32px;
          position:relative;
          transition:background .25s;
          cursor:default;
        }
        .step-card:hover{background:var(--surface-3)}
        .step-num{
          font-family:var(--font-display);
          font-size:64px;font-weight:800;
          color:var(--border-strong);
          line-height:1;
          margin-bottom:20px;
          transition:color .25s;
        }
        .step-card:hover .step-num{color:var(--accent-glow)}
        .step-icon{
          width:48px;height:48px;
          background:var(--surface-3);
          border-radius:var(--radius-sm);
          display:grid;place-items:center;
          margin-bottom:20px;
          transition:background .25s,transform .25s;
        }
        .step-card:hover .step-icon{background:var(--accent);transform:rotate(-4deg) scale(1.05)}
        .step-icon svg{width:22px;height:22px;stroke:var(--accent);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:stroke .25s}
        .step-card:hover .step-icon svg{stroke:#fff}
        .step-title{font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--ink);margin-bottom:10px}
        .step-desc{font-size:14px;color:var(--ink-muted);line-height:1.6;font-weight:300}

        /* ── Features ── */
        .features-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:24px;
          margin-top:64px;
        }
        .feature-card{
          background:var(--surface-2);
          border:1px solid var(--border);
          border-radius:var(--radius-lg);
          padding:40px;
          transition:transform .3s,box-shadow .3s,border-color .3s;
          position:relative;overflow:hidden;
        }
        .feature-card::before{
          content:'';position:absolute;
          top:0;left:0;right:0;height:3px;
          background:var(--accent);
          transform:scaleX(0);transform-origin:left;
          transition:transform .3s ease;
        }
        .feature-card:hover::before{transform:scaleX(1)}
        .feature-card:hover{
          transform:translateY(-4px);
          box-shadow:0 16px 48px rgba(13,13,20,0.1);
          border-color:var(--accent);
          background:var(--surface);
        }
        .feature-card.large{grid-column:span 2}
        .feature-icon{
          width:56px;height:56px;
          background:var(--surface-3);
          border-radius:var(--radius-md);
          display:grid;place-items:center;
          margin-bottom:24px;
          transition:background .25s,transform .25s;
        }
        .feature-card:hover .feature-icon{background:var(--accent);transform:scale(1.05)}
        .feature-icon svg{width:26px;height:26px;stroke:var(--accent);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:stroke .25s}
        .feature-card:hover .feature-icon svg{stroke:#fff}
        .feature-title{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--ink);margin-bottom:10px;letter-spacing:-.3px}
        .feature-desc{font-size:14px;color:var(--ink-muted);line-height:1.7;font-weight:300}
        .feature-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
        .feature-tag{
          font-size:11px;font-weight:600;
          letter-spacing:.06em;text-transform:uppercase;
          padding:4px 10px;
          border-radius:100px;
          background:var(--surface-3);
          color:var(--accent);
          border:1px solid var(--border-strong);
        }

        /* ── Modules ── */
        .modules-section{background:var(--ink)}
        .modules-section .section-label{color:#7B6FFF}
        .modules-section .section-title{color:#fff}
        .modules-section .section-sub{color:rgba(255,255,255,0.5)}
        .modules-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:20px;
          margin-top:64px;
        }
        .module-card{
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:var(--radius-lg);
          padding:36px;
          transition:background .3s,border-color .3s,transform .3s;
          cursor:default;
        }
        .module-card:hover{
          background:rgba(255,255,255,0.08);
          border-color:rgba(123,111,255,0.5);
          transform:translateY(-4px);
        }
        .module-num{
          font-family:var(--font-display);
          font-size:12px;font-weight:700;
          letter-spacing:.1em;
          color:var(--accent-light);
          margin-bottom:20px;
        }
        .module-icon-wrap{
          width:52px;height:52px;
          border-radius:var(--radius-sm);
          background:rgba(123,111,255,0.15);
          display:grid;place-items:center;
          margin-bottom:20px;
          transition:background .25s,transform .25s;
        }
        .module-card:hover .module-icon-wrap{background:var(--accent);transform:rotate(4deg)}
        .module-icon-wrap svg{width:24px;height:24px;stroke:var(--accent-light);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:stroke .25s}
        .module-card:hover .module-icon-wrap svg{stroke:#fff}
        .module-title{font-family:var(--font-display);font-size:18px;font-weight:700;color:#fff;margin-bottom:10px}
        .module-desc{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.6;font-weight:300}
        .module-badge{
          display:inline-block;
          margin-top:16px;
          font-size:11px;font-weight:600;
          letter-spacing:.08em;text-transform:uppercase;
          padding:4px 10px;
          border-radius:100px;
          background:rgba(123,111,255,0.2);
          color:var(--accent-light);
          border:1px solid rgba(123,111,255,0.3);
        }

        /* ── Workflow ── */
        .workflow-section{background:var(--surface)}
        .workflow-timeline{
          margin-top:64px;
          position:relative;
        }
        .workflow-timeline::before{
          content:'';
          position:absolute;
          left:32px;top:0;bottom:0;
          width:2px;
          background:linear-gradient(to bottom,var(--accent),rgba(80,70,229,0.1));
        }
        .workflow-step{
          display:flex;gap:32px;
          margin-bottom:48px;
          position:relative;
        }
        .workflow-step:last-child{margin-bottom:0}
        .workflow-dot{
          width:64px;height:64px;flex-shrink:0;
          border-radius:50%;
          background:var(--surface);
          border:2px solid var(--border-strong);
          display:grid;place-items:center;
          position:relative;z-index:1;
          transition:border-color .3s,background .3s,transform .3s;
        }
        .workflow-step:hover .workflow-dot{
          border-color:var(--accent);
          background:var(--accent);
          transform:scale(1.1);
        }
        .workflow-dot svg{width:22px;height:22px;stroke:var(--ink-muted);fill:none;stroke-width:1.8;stroke-linecap:round;transition:stroke .3s}
        .workflow-step:hover .workflow-dot svg{stroke:#fff}
        .workflow-content{padding-top:16px;flex:1}
        .workflow-step-num{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
        .workflow-title{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px;letter-spacing:-.3px}
        .workflow-desc{font-size:15px;color:var(--ink-muted);line-height:1.7;font-weight:300;max-width:560px}

        /* ── About / Team ── */
        .about-section{background:var(--surface-2)}
        .team-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
          gap:24px;
          margin-top:48px;
        }
        .team-card{
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:var(--radius-lg);
          padding:40px;
          text-align:center;
          transition:transform .3s,box-shadow .3s;
        }
        .team-card:hover{
          transform:translateY(-6px);
          box-shadow:0 20px 60px rgba(13,13,20,0.1);
        }
        .team-avatar{
          width:80px;height:80px;
          background:var(--surface-3);
          border-radius:50%;
          display:grid;place-items:center;
          margin:0 auto 20px;
          font-family:var(--font-display);
          font-size:28px;font-weight:800;
          color:var(--accent);
          border:3px solid var(--border-strong);
          position:relative;overflow:hidden;
        }
        .team-avatar::after{
          content:'';
          position:absolute;inset:0;
          background:radial-gradient(circle at 30% 30%,rgba(255,255,255,0.3),transparent);
        }
        .team-name{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--ink);margin-bottom:4px}
        .team-role{font-size:13px;color:var(--ink-muted);font-weight:400;margin-bottom:16px}
        .team-email{
          display:inline-flex;align-items:center;gap:6px;
          font-size:13px;color:var(--accent);
          text-decoration:none;font-weight:500;
          padding:6px 12px;
          border-radius:var(--radius-sm);
          background:var(--surface-3);
          border:1px solid var(--border);
          transition:background .2s,border-color .2s;
        }
        .team-email:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
        .team-email svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}

        /* ── CTA ── */
        .cta-section{
          background:var(--accent);
          overflow:hidden;
          position:relative;
        }
        .cta-section::before{
          content:'';
          position:absolute;
          top:-50%;left:-20%;
          width:600px;height:600px;
          background:rgba(255,255,255,0.05);
          border-radius:50%;
        }
        .cta-section::after{
          content:'';
          position:absolute;
          bottom:-30%;right:-10%;
          width:400px;height:400px;
          background:rgba(0,0,0,0.08);
          border-radius:50%;
        }
        .cta-inner{
          position:relative;z-index:1;
          text-align:center;
          padding:100px 24px;
        }
        .cta-title{
          font-family:var(--font-display);
          font-size:clamp(40px,5vw,72px);
          font-weight:800;
          color:#fff;
          letter-spacing:-2px;
          line-height:1.05;
          margin-bottom:20px;
        }
        .cta-sub{font-size:18px;color:rgba(255,255,255,0.7);font-weight:300;margin-bottom:40px}
        .btn-white{
          display:inline-flex;align-items:center;gap:8px;
          background:#fff;color:var(--accent);
          font-family:var(--font-body);font-size:16px;font-weight:700;
          padding:16px 36px;
          border-radius:var(--radius-md);
          text-decoration:none;
          transition:transform .25s,box-shadow .25s;
          box-shadow:0 4px 24px rgba(0,0,0,0.15);
        }
        .btn-white:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(0,0,0,0.2)}
        .btn-white svg{width:18px;height:18px;stroke:var(--accent);stroke-width:2.5;fill:none;transition:transform .2s}
        .btn-white:hover svg{transform:translateX(3px)}

        /* ── Footer ── */
        footer{
          background:var(--ink);
          padding:64px 24px 40px;
        }
        .footer-inner{
          max-width:1120px;margin:0 auto;
          display:grid;
          grid-template-columns:2fr 1fr 1fr 1fr;
          gap:48px;
          padding-bottom:48px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }
        .footer-brand{font-family:var(--font-display);font-size:20px;font-weight:800;color:#fff;margin-bottom:12px}
        .footer-brand-sub{font-size:13px;color:rgba(255,255,255,0.35);font-weight:300;line-height:1.6;max-width:240px}
        .footer-col-title{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:16px}
        .footer-link{display:block;font-size:14px;color:rgba(255,255,255,0.5);text-decoration:none;margin-bottom:10px;transition:color .2s;font-weight:300}
        .footer-link:hover{color:#fff}
        .footer-bottom{
          max-width:1120px;margin:0 auto;
          display:flex;align-items:center;justify-content:space-between;
          padding-top:24px;
        }
        .footer-copy{font-size:12px;color:rgba(255,255,255,0.2);font-weight:300}

        /* ── Animations ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}

        .reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease}
        .reveal.visible{opacity:1;transform:translateY(0)}
        .reveal-delay-1{transition-delay:.1s}
        .reveal-delay-2{transition-delay:.2s}
        .reveal-delay-3{transition-delay:.3s}
        .reveal-delay-4{transition-delay:.4s}

        /* ── Responsive ── */
        @media(max-width:900px){
          nav{padding:16px 24px}
          .nav-links .nav-link{display:none}
          .features-grid{grid-template-columns:1fr}
          .feature-card.large{grid-column:span 1}
          .footer-inner{grid-template-columns:1fr 1fr}
          .hero-stats{gap:24px}
        }
        @media(max-width:600px){
          .hero-stats{flex-direction:column;gap:16px}
          .hero-stat-divider{display:none}
          .workflow-timeline::before{display:none}
          .footer-inner{grid-template-columns:1fr}
        }
      `}</style>

      {/* Animated background canvas */}
      <canvas id="bg-canvas"></canvas>

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
          <Link to="/signup" className="nav-cta">Get Started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot"></span>
          Intelligent UML Learning Platform
        </div>

        <h1 className="hero-title">
          The Smart Way to<br />
          Master <em>UML</em>
        </h1>

        <p className="hero-sub">
          Build professional diagrams with deep semantic analysis, consistency checks, and guided modeling — all in one structured workflow.
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
            <div className="hero-stat-num">AI</div>
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
              <span className="preview-title">Use Case Diagram — Library System</span>
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
            <p className="section-sub">A guided, structured workflow from assignment to submission — every step clearly defined.</p>
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
              <div className="step-title">AI Validation</div>
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
              <div className="feature-desc">Every assignment guides students through a carefully designed multi-step process: from Use Case Diagrams to detailed Sequence Diagrams. No guessing what to do next — the platform tells you exactly where you are and what's needed.</div>
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
            <p className="section-sub">Focused tools designed for the complete UML modeling workflow — each module builds on the last.</p>
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
              <p className="section-sub">From opening an assignment to submitting a complete, validated UML model — the whole journey in one platform.</p>
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
            <p className="section-sub">UMLTutor bridges the gap between theoretical UML knowledge and practical application — giving students a hands-on environment to create, manage, and refine UML models within a structured assignment workflow.</p>
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
          <span className="footer-copy">© 2026 UMLTutor. All rights reserved.</span>
          <span className="footer-copy">Developer: Inam Karim · Supervisor: Dr. Onaiza Maqbool</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
