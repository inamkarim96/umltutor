import React, { useEffect, useRef } from 'react';
import './AnimatedPageBackground.css';

const PARTICLE_COUNT = 110;
const CONNECTION_DISTANCE = 140;

/**
 * Fixed full-page animated background: gradient, orbs, grid, UML shapes, particle canvas.
 * @param {'default' | 'subtle' | 'workspace'} variant
 */
const AnimatedPageBackground = ({ variant = 'default', className = '' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let W = 0;
    let H = 0;
    const particles = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.r = Math.random() * 2 + 1;
        this.life = 0;
        this.maxLife = 200 + Math.random() * 200;
        this.color = Math.random() > 0.5 ? 'rgba(80,70,229,' : 'rgba(120,110,255,';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life += 1;
        if (this.x < 0 || this.x > W || this.y < 0 || this.y > H || this.life > this.maxLife) {
          this.reset();
        }
      }

      draw() {
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * 0.4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `${this.color}${alpha})`;
        ctx.fill();
      }
    }

    const count = variant === 'workspace' ? 70 : variant === 'subtle' ? 85 : PARTICLE_COUNT;
    for (let i = 0; i < count; i += 1) {
      particles.push(new Particle());
    }

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(80,70,229,${0.08 * (1 - d / CONNECTION_DISTANCE)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    let req = 0;
    const animBg = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      drawConnections();
      req = requestAnimationFrame(animBg);
    };
    animBg();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(req);
    };
  }, [variant]);

  const variantClass =
    variant === 'workspace'
      ? 'animated-page-bg--workspace'
      : variant === 'subtle'
        ? 'animated-page-bg--subtle'
        : '';

  return (
    <div
      className={`animated-page-bg ${variantClass} ${className}`.trim()}
      aria-hidden="true"
    >
      <div className="animated-bg-gradient" />
      <div className="animated-bg-orbs">
        <div className="animated-bg-orb animated-bg-orb-1" />
        <div className="animated-bg-orb animated-bg-orb-2" />
        <div className="animated-bg-orb animated-bg-orb-3" />
      </div>
      <div className="animated-bg-grid" />
      <div className="animated-bg-shapes">
        <div className="animated-uml-shape animated-uml-shape-1" />
        <div className="animated-uml-shape animated-uml-shape-2" />
        <div className="animated-uml-shape animated-uml-shape-3" />
        <div className="animated-uml-shape animated-uml-shape-4" />
        <div className="animated-uml-shape animated-uml-shape-5" />
        <div className="animated-uml-shape animated-uml-shape-6" />
      </div>
      <canvas ref={canvasRef} className="animated-bg-canvas" />
    </div>
  );
};

export default AnimatedPageBackground;
